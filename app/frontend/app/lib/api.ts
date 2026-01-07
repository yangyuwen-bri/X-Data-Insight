import { getSessionId } from "./session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface SearchResponse {
    event_name: string;
    keywords: string[];
    hashtags: string[];
    time_range_start: string | null;
    time_range_end: string | null;
    summary: string;
    citations?: string[];
}

export interface ScrapeRequest {
    run_name: string;
    search_terms: string[];
    max_items: number;
    tweet_language: string;
    sort: string;
    start_date?: string;
    end_date?: string;
}

export interface ScrapeResponse {
    task_id: string;
    status: string;
}

export const searchEvent = async (eventName: string): Promise<SearchResponse> => {
    const response = await fetch(`${API_BASE_URL}/search`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-session-id": getSessionId(),
        },
        body: JSON.stringify({ event_name: eventName }),
    });

    if (!response.ok) {
        throw new Error("Search failed");
    }

    return response.json();
};

export const triggerScrape = async (data: ScrapeRequest): Promise<ScrapeResponse> => {
    const response = await fetch(`${API_BASE_URL}/scrape`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-session-id": getSessionId(),
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error("Scrape trigger failed");
    }
    return response.json();
}

export interface AnalysisResponse {
    answer: string;
    chart_path?: string;
}

export const analyzeData = async (query: string, runId?: string, datasetId?: string): Promise<AnalysisResponse> => {
    const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-session-id": getSessionId(),
        },
        body: JSON.stringify({ query, run_id: runId, dataset_id: datasetId }),
    });

    if (!response.ok) {
        throw new Error("Analysis failed");
    }
    return response.json();
}

export const uploadDataset = async (file: File): Promise<{ filename: string; status: string; dataset_id?: string }> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        headers: {
            "x-session-id": getSessionId(),
        },
        body: formData,
    });

    if (!response.ok) {
        throw new Error("Upload failed");
    }
    return response.json();
}
