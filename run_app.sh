#!/usr/bin/env bash

# Activate virtual environment
source venv/bin/activate

# Run Uvicorn server
echo "Starting FastAPI Web Server on http://localhost:8000..."
python -m uvicorn app:app --host 0.0.0.0 --port 8000
