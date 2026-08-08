#!/usr/bin/env bash

# Activate virtual environment
source venv/bin/activate

# Run S2S Real-Time Voice Daemon on port 8090
echo "Starting Real-Time S2S Voice Daemon on ws://localhost:8090..."
python s2s_server.py &

# Run Main FastAPI Web Server on port 8000
echo "Starting FastAPI Web Server on http://localhost:8000..."
python -m uvicorn app:app --host 0.0.0.0 --port 8000
