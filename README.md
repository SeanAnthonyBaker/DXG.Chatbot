# DXG.Chatbot

DXG.Chatbot is a modern, voice-enabled AI assistant interface featuring real-time speech transcription, structured prompt history, customizable token preprocessing, and a premium web user interface.

## Features

- **Voice & Text Input**: Seamlessly switch between text queries and real-time audio entry with automatic transcription.
- **Token Preprocessing**: Built-in support for cleaning speech-to-text filler words and applying structure optimizations.
- **Thinking Mode Toggle**: Control model response patterns dynamically.
- **Interactive History**: View and retrieve past queries, metadata, thinking steps, and model selections.
- **Aesthetic Dark Mode UI**: Built using rich modern typography, HSL tailored color schemes, micro-animations, and glassmorphism styling.

## Architecture

- **Backend**: FastAPI (Python 3) serving static assets and API routes, with SQLite for conversation logging.
- **Frontend**: Vanilla HTML5, CSS3, and modern JavaScript utilizing standard browser APIs for voice processing.
- **Inference Integration**: Connects dynamically to local/remote vLLM servers supporting Gemma 4 models.

## Quick Start

### 1. Prerequisites
- Python 3.10+
- SQLite3

### 2. Setup Virtual Environment & Dependencies
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Run the Server
Start the FastAPI server:
```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```
Then, open `http://localhost:8000` in your web browser.
