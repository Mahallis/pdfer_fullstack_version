FROM python:3.12-alpine

WORKDIR /app

RUN apk update && \
    apk upgrade --no-cache && \
    apk add ghostscript

COPY requirements.txt .

RUN pip install -r requirements.txt --no-cache-dir

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--root-path", "/api"]
