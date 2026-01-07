# X-Data-Insight 🚀

**Intelligent platform to Scrape, Analyze, and Visualize social media trends using Perplexity, Apify, and PandasAI.**

X-Data-Insight is a full-stack application designed to streamline the workflow of event tracking and public opinion analysis. It combines real-time AI research, automated data collection, and an intelligent data analyst agent into a single, cohesive dashboard.

## ✨ Key Features

- **🔍 AI-Powered Research**: Leverages **Perplexity API** to intelligently analyze event names, infer time ranges, and generate optimized search keywords/hashtags.
- **🕷️ Automated Scraping**: seamlessly integrates with **Apify** to collect social media data (Tweets, Posts) based on AI-generated keywords.
- **🧹 Smart Data Processing**: Built-in deduplication, auto-cleaning, and date normalization algorithms.
- **📊 Interactive Dashboard**: A modern, violet-themed UI built with **Next.js** and **ECharts** for visualizing trends, volume, and word clouds.
- **🤖 AI Data Copilot**: An embedded "Data Analyst" agent (powered by **PandasAI** & **GPT-4o-mini**) that allows you to chat with your dataset naturally (e.g., "Show me the top 5 influencers").

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, Tailwind CSS, TypeScript, Zustand, ECharts
- **Backend**: Python 3.11, FastAPI, Pandas, PandasAI
- **Infrastructure**: Docker, Docker Compose
- **Services**: Apify (Scraping), Perplexity (Search), OpenAI (Analysis)

## 🚀 Getting Started

### Prerequisites

- Docker & Docker Compose
- API Keys:
    - `OPENAI_API_KEY` (for PandasAI Analysis)
    - `PERPLEXITY_API_KEY` (for Event Research)
    - `APIFY_API_TOKEN` (for Scraping)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Start-0/Xdata.git
    cd Xdata
    ```

2.  **Configure Environment Variables**
    Create a `.env` file in the `app/backend/` directory:
    ```bash
    mkdir -p app/backend
    # Edit the file and add your keys
    nano app/backend/.env
    ```
    Add the following content:
    ```env
    OPENAI_API_KEY=sk-...
    PERPLEXITY_API_KEY=pplx-...
    APIFY_API_TOKEN=...
    ```

3.  **Deploy with Docker Compose**
    ```bash
    # Replace 'localhost' with your server IP in docker-compose.yml if deploying to VPS
    docker-compose up -d --build
    ```

4.  **Access the Application**
    - **Dashboard**: http://localhost:3000
    - **API Docs**: http://localhost:8000/docs

### Alternative: Local Development (Manual Startup)

If you want to develop locally without Docker:

**1. Start Backend (Hot Reload)**
```bash
cd app/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**2. Start Frontend**
```bash
cd app/frontend
npm install
npm run dev
# Access at http://localhost:3000
```

## 📂 Project Structure

```
X-Data-Insight/
├── app/
│   ├── backend/          # FastAPI Server & Agents
│   │   ├── analysis_agent.py
│   │   ├── search_agent.py
│   │   └── ...
│   └── frontend/         # Next.js Dashboard
│       ├── app/
│       ├── components/
│       └── ...
├── docker-compose.yml    # Orchestration
├── Dockerfile            # (Backend & Frontend definitions)
└── README.md
```

## 📜 License

This project is licensed under the MIT License.
