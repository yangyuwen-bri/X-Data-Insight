from pydantic import BaseModel
from typing import List, Optional

class SearchRequest(BaseModel):
    event_name: str

class SearchResponse(BaseModel):
    event_name: str
    keywords: List[str]
    hashtags: List[str]
    time_range_start: Optional[str]
    time_range_end: Optional[str]
    summary: str
    citations: List[str] = []

class ScrapeRequest(BaseModel):
    run_name: str
    search_terms: List[str]
    max_items: int = 100
    tweet_language: str = "all"
    sort: str = "Latest"
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class ScrapeResponse(BaseModel):
    task_id: str
    status: str

class AnalysisRequest(BaseModel):
    query: str
    run_id: Optional[str] = None
    dataset_id: Optional[str] = None

class AnalysisResponse(BaseModel):
    answer: str
    chart_path: Optional[str] = None
