from fastapi import FastAPI, HTTPException, UploadFile, File, Header
from typing import Optional
from fastapi.staticfiles import StaticFiles
import shutil
import os
from fastapi.middleware.cors import CORSMiddleware
from models import SearchRequest, SearchResponse, ScrapeRequest, ScrapeResponse, AnalysisRequest, AnalysisResponse
from search_agent import search_event
from scraper import trigger_scrape_job, check_scrape_status, fetch_scrape_results
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Mount static files for charts
os.makedirs("static", exist_ok=True)
app.mount("/api/static", StaticFiles(directory="static"), name="static")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有人访问
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Event Data Scraper API is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/search", response_model=SearchResponse)
async def search_event_endpoint(request: SearchRequest):
    try:
        return await search_event(request.event_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scrape", response_model=ScrapeResponse)
async def trigger_scrape_endpoint(request: ScrapeRequest):
    try:
        return await trigger_scrape_job(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/scrape/{run_id}")
async def get_scrape_status_endpoint(run_id: str):
    try:
        run = await check_scrape_status(run_id)
        return {"id": run["id"], "status": run["status"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/scrape/{run_id}/dataset")
async def get_scrape_dataset_endpoint(run_id: str, x_session_id: Optional[str] = Header(None)):
    try:
        items = await fetch_scrape_results(run_id)
        
        # Deduplication Logic
        # Filter by unique URL
        seen_urls = set()
        unique_items = []
        for item in items:
            url = item.get("url")
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_items.append(item)
            elif not url:
                # If no URL, keep it (unlikely for tweets)
                unique_items.append(item)
        
        # Auto-Save to CSV for Agent Context
        import pandas as pd
        if unique_items:
            df = pd.DataFrame(unique_items)
            # Flatten potential nested structures if necessary (Simple flatten for author)
            # For now, just dumping as is might work if PandasAI handles it, 
            # but better to ensure basic flat structure for CSV
            
            # Basic cleaning for CSV
            df_csv = df.copy()
            if 'author' in df_csv.columns:
                 df_csv['author_name'] = df_csv['author'].apply(lambda x: x.get('userName') if isinstance(x, dict) else str(x))
            
            # Use Session Directory if available
            if x_session_id:
                save_dir = f"data/{x_session_id}"
            else:
                save_dir = "data"
                
            os.makedirs(save_dir, exist_ok=True)
            csv_path = f"{save_dir}/{run_id}.csv"
            df_csv.to_csv(csv_path, index=False)
            print(f"Auto-saved cleaned dataset to {csv_path}")

        return unique_items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), x_session_id: Optional[str] = Header(None)):
    try:
        # Ensure data directory exists
        if x_session_id:
             save_dir = f"data/{x_session_id}"
        else:
             save_dir = "data"
        os.makedirs(save_dir, exist_ok=True)
        
        # Generate Unified Dataset ID
        import time
        timestamp = int(time.time())
        # Clean filename
        safe_name = "".join([c for c in file.filename if c.isalnum() or c in ('-', '_')]).rstrip()
        dataset_id = f"upload_{timestamp}_{safe_name}"
        
        file_path = f"{save_dir}/{dataset_id}.csv"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {"filename": file.filename, "status": "uploaded", "dataset_id": dataset_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_endpoint(request: AnalysisRequest, x_session_id: Optional[str] = Header(None)):
    from analysis_agent import analyze_data
    try:
        # Pass dataset_id to agent
        answer = await analyze_data(request.query, request.run_id, request.dataset_id, session_id=x_session_id)
        return AnalysisResponse(answer=str(answer))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
