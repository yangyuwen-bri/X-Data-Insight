import os
import glob
import pandas as pd
import re
import json
from typing import Any, Optional, Tuple, Dict
from pandasai import SmartDataframe
from pandasai.llm.base import LLM
from pandasai.core.prompts.base import BasePrompt
from openai import OpenAI as OpenAIClient
from dotenv import load_dotenv

load_dotenv()

class OpenAI(LLM):
    """OpenAI adapter for PandasAI v3.0 compatibility."""
    
    def __init__(self, api_token: str, api_base: str = None, model: str = "gpt-3.5-turbo", **kwargs):
        super().__init__(api_key=api_token, **kwargs)
        self.client = OpenAIClient(api_key=api_token, base_url=api_base)
        self.model = model

    @property
    def type(self) -> str:
        return "openai"

    def call(self, instruction: BasePrompt, context: Any = None) -> str:
        prompt = instruction.to_string()
        messages = [{"role": "user", "content": prompt}]
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0,
        )
        return response.choices[0].message.content

# Use GPT-4o-mini via Custom Proxy
llm = OpenAI(
    api_token=os.getenv("OPENAI_API_KEY"),
    api_base="https://apidekey.xyz/v1",
    model="gpt-4o-mini"
)

# Global Session Store for Multi-turn Conversation
# Key: run_id, Value: SmartDataframe instance
SESSION_STORE = {}

def get_latest_dataset_path():
    search_paths = [
        os.path.join(os.path.dirname(__file__), "../../data/*.csv"),
        os.path.join(os.path.dirname(__file__), "../../*.csv"), # Root dir
        os.path.join(os.getcwd(), "data/*.csv"),
    ]
    files = []
    for p in search_paths:
        files.extend(glob.glob(p))
    if not files:
        return None
    return max(files, key=os.path.getctime)

def get_font_path():
    """Detects available Chinese font path."""
    common_paths = [
        "/System/Library/Fonts/PingFang.ttc",            # macOS
        "/System/Library/Fonts/STHeiti Light.ttc",       # macOS Legacy
        "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf", # Linux
        "C:\\Windows\\Fonts\\simhei.ttf",                # Windows
    ]
    for path in common_paths:
        if os.path.exists(path):
            return path
    return None

def sanitize_dataframe(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, str]]:
    """
    1. Renames columns to 'col_0', 'col_1' (ASCII only protection).
    2. Tries to convert time columns to friendly format.
    Returns (cleaned_df, mapping_dict).
    """
    mapping = {}
    new_columns = []
    
    # Pre-process dates
    for col in df.columns:
        if "created" in str(col).lower() or "date" in str(col).lower() or "time" in str(col).lower():
            try:
                df[col] = pd.to_datetime(df[col]).dt.strftime('%Y-%m-%d %H:%M:%S')
            except:
                pass

    for i, col in enumerate(df.columns):
        col_str = str(col)
        # Strict ASCII check: only allow letters, numbers, underscore
        if re.match(r'^[a-zA-Z0-9_]+$', col_str):
            new_columns.append(col_str)
        else:
            # Use safe alias
            safe_name = f"col_{i}"
            new_columns.append(safe_name)
            mapping[safe_name] = col_str
            
    df.columns = new_columns
    return df, mapping

async def analyze_data(query: str, run_id: str = None, dataset_id: str = None):
    """
    Analyzes the dataset using PandasAI with Session Memory.
    run_id: Conversation/Session ID
    dataset_id: Specific dataset ID (Task ID or Upload ID)
    """
    global SESSION_STORE
    
    # 1. Check Session Memory & Context Switch
    sdf = None
    col_mapping = {}
    last_context = ""
    
    # Ensure static charts directory exists
    charts_dir = os.path.join(os.getcwd(), "static/charts")
    os.makedirs(charts_dir, exist_ok=True)

    # Determine if we need to reload logic
    need_reload = True
    
    if run_id and run_id in SESSION_STORE:
        # Check if the existing session is using the same dataset
        stored_dataset_id = SESSION_STORE[run_id].get("dataset_id")
        
        # If dataset_id is provided and matches stored (or dataset_id didn't change), reuse
        if dataset_id and stored_dataset_id == dataset_id:
            need_reload = False
        elif not dataset_id: 
            # If no dataset_id provided, blindly trust session (legacy)
            need_reload = False
            
    if not need_reload:
        print(f"Loading existing session: {run_id}")
        sdf = SESSION_STORE[run_id]["sdf"]
        col_mapping = SESSION_STORE[run_id]["mapping"]
        last_context = SESSION_STORE[run_id].get("last_context", "")
    else:
        # Load new dataset
        csv_path = None
        
        # Priority 1: Specific Dataset ID
        if dataset_id:
            specific_path = os.path.join(os.getcwd(), f"data/{dataset_id}.csv")
            if os.path.exists(specific_path):
                csv_path = specific_path
        
        # Priority 2: Latest (Fallback)
        if not csv_path:
             csv_path = get_latest_dataset_path()
             
        if not csv_path or not os.path.exists(csv_path):
            return "No dataset found. Please scrape or upload some data first."
        
        print(f"Loading Dataset: {csv_path}")
        
        try:
            df = pd.read_csv(csv_path)
            # Sanitize columns & Format Dates
            df, col_mapping = sanitize_dataframe(df)
            
            # Initialize SmartDataframe
            sdf = SmartDataframe(df, config={
                "llm": llm, 
                "enable_cache": True,
                "save_charts": True,
                "save_charts_path": charts_dir,
                "open_charts": False,
            })
            
            # Save to session
            if run_id:
                SESSION_STORE[run_id] = {
                    "sdf": sdf,
                    "mapping": col_mapping,
                    "last_context": "",
                    "dataset_id": dataset_id # Remember which dataset this session is for
                }
        except Exception as e:
             return f"Initialization failed: {str(e)}"

    try:
        # 2. Prepare Query with Context
        # Start with the raw query
        full_query = query
        
        context_parts = []
        
        # Add Column Mapping Context
        if col_mapping:
            mapping_str = json.dumps(col_mapping, ensure_ascii=False)
            context_parts.append(f"[System] Column names mapping (encoded -> original):\n{mapping_str}")
            
        # Add Previous Conversation Context (Critical for "it", "he", "they")
        if last_context:
            context_parts.append(f"[Previous AI Answer] {last_context}")
            # Explicit instruction to resolve references
            context_parts.append(f"[Instruction] Resolve any ambiguous references in the user's current question (like 'it', 'he', 'privacy', 'attention') based on the [Previous AI Answer] above.")

        # Explicit instruction to fetch content
        context_parts.append(f"[Instruction] When the user asks for details, specific tweets, or content, you MUST SELECT the 'full_text' (or 'text') column in your code so that the actual tweet content is returned. Do not just return counts or authors.")

        # Add Font Logic
        font_path = get_font_path()
        if font_path:
             context_parts.append(f"[System] IMPORTANT: For any charts (especially WordCloud or Matplotlib), you MUST use the font_path='{font_path}' to ensure Chinese characters are displayed correctly. Example: WordCloud(font_path='{font_path}', ...)")

        if context_parts:
             full_query = "\n\n".join(context_parts) + f"\n\n[User Question] {query}"

        # 3. Chat with the dataframe
        answer = sdf.chat(full_query)
        
        # 4. Handle Result Types
        final_output = str(answer)
        is_dataframe = isinstance(answer, (pd.DataFrame, pd.Series))
        is_chart = False
        chart_url = ""

        if is_dataframe:
            if isinstance(answer, pd.DataFrame):
                if col_mapping:
                    answer = answer.rename(columns=col_mapping)
                final_output = answer.to_markdown(index=False)
            elif isinstance(answer, pd.Series):
                 final_output = answer.to_markdown()
        
        # Check if result is an image path (PandasAI returns absolute path str for charts)
        if isinstance(answer, str) and (answer.endswith(".png") or answer.endswith(".jpg")):
            is_chart = True
            # Convert absolute path to URL path
            filename = os.path.basename(answer)
            chart_url = f"/api/static/charts/{filename}"
            final_output = f"![Chart]({chart_url})"

        # Phase 2: Interpretation Layer
        system_prompt = "你是一个专业的数据分析师助手。你的任务是根据提供的数据结果，用通俗易懂的语言回答用户的问题。严禁使用外部知识。时间格式请转换为 YYYY-MM-DD HH:MM。请始终使用中文回答，除非用户强制要求英文。"
        
        interpretation_prompt = f"""
        用户问题: {query}
        
        ### 数据结果 (Data Result)
        {final_output}
        
        任务: 严格仅基于以上“数据结果”回答用户问题。
        - 将数据结果解释为自然语言。
        - 如果结果是图表（图片路径），请根据问题描述图表可能展示的内容。
        - 如果是表格，请总结关键发现。
        - 保持简洁。
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": interpretation_prompt}
        ]
        
        interpretation = llm.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.1, 
        ).choices[0].message.content
        
        # Update Session with new context
        if run_id and run_id in SESSION_STORE:
            SESSION_STORE[run_id]["last_context"] = interpretation

        # Combine Output
        response_text = interpretation
        if is_dataframe:
             response_text += f"\n\n### Data Table\n\n{final_output}"
        
        if is_chart:
            response_text += f"\n\n{final_output}"

        return response_text
        
    except Exception as e:
        print(f"PandasAI Error: {e}")
        return f"Analysis failed: {str(e)}"
