FROM python:3.12-alpine

WORKDIR /app

RUN pip install uv

COPY pyproject.toml .

RUN uv pip install  --system .

COPY . . 

CMD ["uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "8501"]