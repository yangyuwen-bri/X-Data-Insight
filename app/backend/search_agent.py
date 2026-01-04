import os
import httpx
from dotenv import load_dotenv
from models import SearchResponse

load_dotenv()

PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")

import datetime

async def search_event(event_name: str) -> SearchResponse:
    if not PERPLEXITY_API_KEY:
        raise ValueError("PERPLEXITY_API_KEY not found in environment variables")
    
    url = "https://api.perplexity.ai/chat/completions"
    
    # Dynamic Time Anchor
    today_str = datetime.date.today().strftime("%Y-%m-%d")

    system_prompt = (
        f"Current Date: {today_str}. "
        "You are an expert research assistant. Your task is to analyze an event and return structured data "
        "to help with social media scraping. "
        "User will provide an Event Name. You must search for it and return valid JSON with: "
        "1. 'event_name': The confirmed official name. "
        "2. 'keywords': A list of non-hashtag search phrases (mix of Chinese/English if relevant). "
        "3. 'hashtags': A list of relevant hashtags (including #). "
        "4. 'time_range_start': Start date (YYYY-MM-DD). If unknown, estimate a reasonable start date. "
        "5. 'time_range_end': End date (YYYY-MM-DD). If ongoing/recent, use today's date. "
        "6. 'summary': A brief summary of the event (max 200 chars). MUST include citation markers like [1] or [2] referring to the sources used. "
        "IMPORTANT: Use 'Current Date' to ground your time reasoning. "
        "If an event has a future year in its name (e.g., '2026 Summit') but 'Current Date' is 2025, "
        "it is likely occurring in 2025. Do not blindy trust the title's year for the event date. "
        "Respond ONLY with valid JSON. Do not add markdown backticks."
    )
    
    payload = {
        "model": "sonar", # Switched to standard sonar for better availability
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Event: {event_name}"}
        ],
        "temperature": 0.1
    }
    
    headers = {
        "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient() as client:
        # Perplexity API might take a few seconds
        response = await client.post(url, json=payload, headers=headers, timeout=60.0)
        response.raise_for_status()
        
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        citations = data.get("citations", [])
        
        # Clean potential markdown
        content = content.replace("```json", "").replace("```", "").strip()
        
        # Parse into Pydantic model
        response_model = SearchResponse.model_validate_json(content)
        response_model.citations = citations
        return response_model
