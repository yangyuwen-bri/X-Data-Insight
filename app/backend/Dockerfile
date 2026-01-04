
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (needed for wordcloud/matplotlib)
# Install system dependencies (needed for wordcloud/matplotlib)
# SWITCH TO ALIYUN MIRROR (CRITICAL FOR CHINA DEPLOYMENT)
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources
RUN pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/

RUN apt-get update && apt-get install -y \
    build-essential \
    libfreetype6-dev \
    libpng-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install dependencies (including the ones added manually)
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir wordcloud matplotlib pandasai apify-client python-dotenv openai httpx uvicorn fastapi python-multipart

COPY . .

# Create directories for persistence
RUN mkdir -p data static/charts

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
