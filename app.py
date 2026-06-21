import os
import re
import sqlite3
import unicodedata
import json
import requests
from typing import Any
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI()

# Database setup
DB_FILE = "history.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prompt TEXT NOT NULL,
            preprocessed_prompt TEXT NOT NULL,
            preprocess_option TEXT NOT NULL,
            think INTEGER DEFAULT 1,
            response TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # Safe migrations: Check if column 'think' exists, if not, add it
    try:
        cursor.execute("ALTER TABLE history ADD COLUMN think INTEGER DEFAULT 1")
    except sqlite3.OperationalError:
        pass  # Column already exists
        
    # Safe migrations: Check if column 'model' exists, if not, add it
    try:
        cursor.execute("ALTER TABLE history ADD COLUMN model TEXT DEFAULT 'gemma-4-26b'")
    except sqlite3.OperationalError:
        pass  # Column already exists
    conn.commit()
    conn.close()

init_db()

# Request model
class QueryRequest(BaseModel):
    prompt: str
    preprocess_option: str  # "none", "basic", "advanced"
    think: bool = True
    model: str = "gemma-4-26b"
    file_data: str | None = None
    file_name: str | None = None
    file_type: str | None = None

# Preprocessing logic
def preprocess_text(text: str, option: str, model: str = "gemma-4-26b") -> str:
    if option == "none":
        return text

    # Basic Preprocessing: Normalize Unicode, trim whitespace, replace multiple spaces
    # Convert to NFKC (Normalization Form Compatibility Composition)
    text = unicodedata.normalize("NFKC", text)
    text = text.strip()
    text = re.sub(r"\s+", " ", text)

    if option == "basic":
        return text

    # Advanced Preprocessing:
    # 1. Clean up noisy speech-to-text words (e.g., filler words like "uh", "um", "ah")
    filler_words = r"\b(uh|um|ah|like|you\sknow|basically|actually|err|eh)\b"
    text = re.sub(filler_words, "", text, flags=re.IGNORECASE)
    
    # Clean up double spacing left by filler word removal
    text = re.sub(r"\s+", " ", text).strip()
    
    # 2. Model-specific structural optimization for short inputs
    if len(text.split()) < 5:
        if model == "gemma-4-12b":
            text = f"[Instruction: Respond concisely and directly to the following input] {text}"
        else:
            text = f"Provide a brief, direct answer for: {text}"
        
    return text

@app.post("/api/query")
async def query_llm(req: QueryRequest):
    original_prompt = req.prompt
    preprocessed_prompt = preprocess_text(original_prompt, req.preprocess_option, req.model)
    
    # Route to appropriate vLLM container based on the selected model
    if req.model == "gemma-4-12b":
        vllm_url = "http://localhost:8081/v1/chat/completions"
        backend_model = "google/gemma-4-12B-it"
    else:
        vllm_url = "http://localhost:8080/v1/chat/completions"
        backend_model = "unsloth/gemma-4-26B-A4B-it"
        
    headers = {
        "Authorization": "Bearer tulkah-local",
        "Content-Type": "application/json"
    }
    
    if req.file_data and req.file_type and req.model == "gemma-4-12b":
        content_list: list[dict[str, Any]] = [{"type": "text", "text": preprocessed_prompt}]
        if req.file_type == "image":
            content_list.append({
                "type": "image_url",
                "image_url": {"url": req.file_data}
            })
        elif req.file_type == "audio":
            if ";" in req.file_data and "," in req.file_data:
                header, base64_str = req.file_data.split(",", 1)
                fmt = "wav"
                if "audio/" in header:
                    mime = header.split(";")[0].split(":")[1]
                    if "/" in mime:
                        fmt = mime.split("/")[1]
                content_list.append({
                    "type": "input_audio",
                    "input_audio": {
                        "data": base64_str,
                        "format": fmt
                    }
                })
            else:
                content_list.append({
                    "type": "input_audio",
                    "input_audio": {
                        "data": req.file_data,
                        "format": "wav"
                    }
                })
        elif req.file_type == "video":
            content_list.append({
                "type": "video_url",
                "video_url": {"url": req.file_data}
            })
        messages = [{"role": "user", "content": content_list}]
    else:
        messages = [{"role": "user", "content": preprocessed_prompt}]
        
    payload = {
        "model": backend_model,
        "messages": messages,
        "stream": True
    }
    
    def generate_stream():
        full_response = []
        try:
            # Connect to vLLM service with streaming response
            response = requests.post(vllm_url, json=payload, headers=headers, stream=True)
            response.raise_for_status()
            
            for line in response.iter_lines():
                if line:
                    decoded_line = line.decode("utf-8")
                    if decoded_line.startswith("data: "):
                        data_str = decoded_line[6:].strip()
                        if data_str == "[DONE]":
                            # Save completed generation to database
                            final_response = "".join(full_response)
                            db_prompt = original_prompt
                            if req.file_name and req.file_type:
                                db_prompt = f"[{req.file_type.capitalize()}: {req.file_name}] {original_prompt}"
                            save_to_history(db_prompt, preprocessed_prompt, req.preprocess_option, int(req.think), final_response, req.model)
                            yield "data: [DONE]\n\n"
                            break
                        
                        data = json.loads(data_str)
                        choices = data.get("choices", [])
                        if choices:
                            delta = choices[0].get("delta", {})
                            token = delta.get("content", "")
                            if token:
                                full_response.append(token)
                                yield f"data: {json.dumps({'token': token})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generate_stream(), media_type="text/event-stream")

def save_to_history(prompt: str, preprocessed: str, option: str, think: int, response: str, model: str):
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO history (prompt, preprocessed_prompt, preprocess_option, think, response, model)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (prompt, preprocessed, option, think, response, model))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error saving to history: {e}")

@app.get("/api/history")
async def get_history():
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        # Fetch the most recent 30 prompts including model name
        cursor.execute("""
            SELECT id, prompt, preprocessed_prompt, preprocess_option, think, response, timestamp, model 
            FROM history 
            ORDER BY timestamp DESC 
            LIMIT 30
        """)
        rows = cursor.fetchall()
        conn.close()
        
        history_list = []
        for row in rows:
            history_list.append({
                "id": row[0],
                "prompt": row[1],
                "preprocessed_prompt": row[2],
                "preprocess_option": row[3],
                "think": bool(row[4]),
                "response": row[5],
                "timestamp": row[6],
                "model": row[7] if len(row) > 7 and row[7] else "gemma-4-26b"
            })
        return JSONResponse(content=history_list)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

from fastapi import UploadFile, File
import speech_recognition as sr
import io

@app.post("/api/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    try:
        audio_content = await audio.read()
        wav_file = io.BytesIO(audio_content)
        r = sr.Recognizer()
        
        with sr.AudioFile(wav_file) as source:
            audio_data = r.record(source)
            
        recognizer: Any = r
        text = recognizer.recognize_google(audio_data)
        return {"text": text}
    except sr.UnknownValueError:
        return {"error": "Speech was unintelligible or silent."}
    except sr.RequestError as e:
        return {"error": f"Speech API error: {e}"}
    except Exception as e:
        return {"error": f"Transcription error: {str(e)}"}

# Mount static folder
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
