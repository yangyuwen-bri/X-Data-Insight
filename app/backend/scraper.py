import os
import asyncio
from apify_client import ApifyClient
from models import ScrapeRequest, ScrapeResponse

# Apify Actor ID for Tweet Scraper V2
# Based on your plan: 61RPP7dywgiy0JPD0
ACTOR_ID = "61RPP7dywgiy0JPD0"

def get_apify_client():
    token = os.getenv("APIFY_API_TOKEN")
    if not token:
        raise ValueError("APIFY_API_TOKEN not found in environment variables")
    return ApifyClient(token)

async def trigger_scrape_job(request: ScrapeRequest) -> ScrapeResponse:
    """
    Triggers the Apify Actor asynchronously.
    Returns the run ID immediately so the frontend can poll for status.
    """
    client = get_apify_client()
    
    # Map our input model to the specific Actor's expected input
    # Confirmed inputs: searchTerms, maxItems, sort, tweetLanguage
    
    final_search_terms = request.search_terms
    # If dates are provided, we append them to the search query for Twitter/X
    # Syntax: "keyword since:2023-01-01 until:2023-01-31"
    if request.start_date or request.end_date:
        date_suffix = ""
        if request.start_date:
            date_suffix += f" since:{request.start_date}"
        if request.end_date:
            date_suffix += f" until:{request.end_date}"
            
        final_search_terms = [term + date_suffix for term in request.search_terms]

    run_input = {
        "searchTerms": final_search_terms,
        "maxItems": request.max_items,
        "sort": request.sort,
        # Default settings to ensure we get good data
        "proxyConfiguration": {"useApifyProxy": True},
    }
    
    # Only add tweetLanguage if it's not "all"
    if request.tweet_language and request.tweet_language.lower() != "all":
        run_input["tweetLanguage"] = request.tweet_language
    
    # Start the actor and don't wait for finish (async start)
    # We use start() to get the run object back
    run = client.actor(ACTOR_ID).start(run_input=run_input)
    
    return ScrapeResponse(
        task_id=run["id"],
        status=run["status"]
    )

async def check_scrape_status(run_id: str):
    """
    Checks the status of an Apify run.
    """
    client = get_apify_client()
    run = client.run(run_id).get()
    return run

async def fetch_scrape_results(run_id: str):
    """
    Fetches the dataset items from a finished run.
    """
    client = get_apify_client()
    # Get the dataset items associated with the run
    dataset_items = client.run(run_id).dataset().list_items().items
    return dataset_items
