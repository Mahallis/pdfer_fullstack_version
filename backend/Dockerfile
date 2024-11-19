FROM python:3.12-alpine

WORKDIR /app

RUN apk update && \
    apk upgrade --no-cache && \
    apk add poppler-utils

COPY requirements.txt .

RUN pip install -r requirements.txt --no-cache-dir

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
