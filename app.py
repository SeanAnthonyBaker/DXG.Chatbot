import os
import re
import sqlite3
import unicodedata
import json
import requests
import asyncio
import subprocess
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from datetime import datetime
from typing import Any
from fastapi import FastAPI, Request, Response
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from gtts import gTTS

# Thread pool for running blocking I/O off the event loop
_blocking_executor = ThreadPoolExecutor(max_workers=4)

app = FastAPI()

@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    response = await call_next(request)
    if request.url.path in ("/", "/index.html", "/script.js", "/style.css"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

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
        cursor.execute("ALTER TABLE history ADD COLUMN model TEXT DEFAULT 'gemma-4-12b'")
    except sqlite3.OperationalError:
        pass  # Column already exists
    conn.commit()
    conn.close()

init_db()

# Request model
class QueryRequest(BaseModel):
    prompt: str
    preprocess_option: str = "none"  # "none", "basic", "advanced"
    think: bool = False
    temperature: float = 1.0
    model: str = "gemma-4-26b"
    file_data: str | None = None
    file_name: str | None = None
    file_type: str | None = None
    use_notebook: bool = False
    notebook_id: str | None = None
    output_format: str = "paragraph"  # "paragraph", "code", "bullets", "tutorial", "table", "json"
    language: str = "en"
    persona: str = "natural"

LANGUAGE_NAMES = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "nl": "Dutch",
    "pl": "Polish",
    "tr": "Turkish",
    "ru": "Russian",
    "ja": "Japanese",
    "ko": "Korean",
    "zh-cn": "Chinese",
    "ar": "Arabic",
    "hi": "Hindi"
}

# Preprocessing logic: Active (Speech Cleaner) vs Off (Raw)
def preprocess_text(text: str, option: str, model: str = "gemma-4-12b") -> str:
    if option in ("none", "off", "raw") or not option:
        return text

    # Active Speech Preprocessing:
    # 1. Convert to NFKC Unicode normalization
    text = unicodedata.normalize("NFKC", text).strip()

    # 2. Clean noisy speech-to-text filler words ("uh", "um", "ah", "er", "err", "eh", "hm", "hmm", "like", "you know", "basically", "actually", "I mean")
    filler_words = r"\b(uh+|um+|ah+|err?|eh+|hm+|hmm+|like|you\s+know|basically|actually|I\s+mean|so\s+basically)\b"
    text = re.sub(filler_words, "", text, flags=re.IGNORECASE)

    # 3. Normalize speech pauses, stutters, and repeated hesitation punctuation (..., --, ,,)
    text = re.sub(r"[\.,\-]{2,}", " ", text)

    # 4. Clean double spacing and return cleaned input
    text = re.sub(r"\s+", " ", text).strip()

    return text


def get_backend_model_name(req_model: str) -> str:
    if req_model in ("gemma-4-12b", "gemma-4-12b-python"):
        return "gemma-4-12b-python:latest"
    elif req_model in ("gemma-4-e4b", "gemma-4-4b"):
        return "gemma4:e4b"
    elif req_model in ("glm-4-voice", "glm4-voice"):
        try:
            r = requests.get("http://localhost:8081/api/tags", timeout=2)
            if r.status_code == 200:
                tags = [m.get("name") for m in r.json().get("models", [])]
                if "glm4-voice:latest" in tags: return "glm4-voice:latest"
                if "glm4:latest" in tags: return "glm4:latest"
                if "glm4" in tags: return "glm4"
        except Exception:
            pass
        return "glm4-voice:latest"
    elif req_model in ("qwen-3.6-35b-a3b", "qwen3.6-35b-a3b"):
        try:
            r = requests.get("http://localhost:8081/api/tags", timeout=2)
            if r.status_code == 200:
                tags = [m.get("name") for m in r.json().get("models", [])]
                if "qwen3.6:35b-a3b" in tags: return "qwen3.6:35b-a3b"
                if "qwen2.5:32b" in tags: return "qwen2.5:32b"
        except Exception:
            pass
        return "qwen3.6:35b-a3b"
    else:
        return "gemma4:26b"

def ensure_only_model_loaded(target_backend: str):
    try:
        loaded_res = requests.get("http://localhost:8081/api/ps", timeout=3)
        if loaded_res.status_code == 200:
            models_data = loaded_res.json().get("models", [])
            for m in models_data:
                m_name = m.get("name") or m.get("model")
                if not m_name:
                    continue
                target_base = target_backend.split(":")[0]
                m_base = m_name.split(":")[0]
                if m_name != target_backend and m_base != target_base:
                    # Unload idle model immediately to keep only 1 in RAM
                    try:
                        requests.post("http://localhost:8081/api/generate", json={"model": m_name, "keep_alive": 0}, timeout=5)
                    except Exception:
                        pass
    except Exception as e:
        print(f"Warning unloading idle models: {e}")

class PrepareModelRequest(BaseModel):
    model: str
    voice_engine: str | None = "e4b"

def get_voice_backend_name(engine_code: str | None) -> str | None:
    if not engine_code or engine_code == "tts":
        return None
    if engine_code == "12b":
        return "gemma-4-12b-python:latest"
    if engine_code == "glm4":
        return "glm4-voice:latest"
    return "gemma4:e4b"

def ensure_models_loaded_in_ram(target_backend: str, voice_backend: str | None):
    """Keep both the main model and active voice model loaded in RAM simultaneously."""
    allowed = {target_backend}
    if voice_backend:
        allowed.add(voice_backend)
        
    try:
        loaded_res = requests.get("http://localhost:8081/api/ps", timeout=3)
        if loaded_res.status_code == 200:
            models_data = loaded_res.json().get("models", [])
            for m in models_data:
                m_name = m.get("name") or m.get("model")
                if not m_name:
                    continue
                if m_name not in allowed:
                    # Unload unrelated model to keep RAM focused on active main + voice models
                    try:
                        requests.post("http://localhost:8081/api/generate", json={"model": m_name, "keep_alive": 0}, timeout=5)
                    except Exception:
                        pass
    except Exception as e:
        print(f"Warning updating RAM allocation: {e}")

    # 1. Warm main LLM model in RAM with long keep_alive
    try:
        requests.post(
            "http://localhost:8081/api/generate",
            json={"model": target_backend, "prompt": "", "keep_alive": "24h"},
            timeout=300
        )
    except Exception as e:
        print(f"Error warming main backend {target_backend}: {e}")

    # 2. Warm voice model in RAM if distinct from main backend
    if voice_backend and voice_backend != target_backend:
        try:
            requests.post(
                "http://localhost:8081/api/generate",
                json={"model": voice_backend, "prompt": "", "keep_alive": "24h"},
                timeout=300
            )
        except Exception as e:
            print(f"Error warming voice backend {voice_backend}: {e}")

@app.post("/api/prepare-model")
async def prepare_model_endpoint(req: PrepareModelRequest):
    target_backend = get_backend_model_name(req.model)
    voice_backend = get_voice_backend_name(req.voice_engine)
    loop = asyncio.get_event_loop()
    
    def _do_prepare():
        """Blocking model-load work — runs in thread pool to keep event loop responsive."""
        try:
            ensure_models_loaded_in_ram(target_backend, voice_backend)
            return {"status": "ready"}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    try:
        result = await loop.run_in_executor(_blocking_executor, _do_prepare)
        if result["status"] == "ready":
            return {"status": "ready", "model": req.model, "backend_model": target_backend, "voice_backend": voice_backend, "loaded": True}
        else:
            return JSONResponse(status_code=500, content={"status": "error", "error": result.get("error", "Unknown error")})
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "error": str(e)})


@app.get("/api/model-status")
async def get_model_status():
    try:
        loaded_res = requests.get("http://localhost:8081/api/ps", timeout=3)
        if loaded_res.status_code == 200:
            models = loaded_res.json().get("models", [])
            loaded_names = [m.get("name") or m.get("model") for m in models]
            return {"status": "ok", "loaded_models": loaded_names}
        return {"status": "ok", "loaded_models": []}
    except Exception as e:
        return {"status": "error", "error": str(e), "loaded_models": []}

def load_persona_skill_context(persona: str) -> str:
    """Pre-load related skill instructions from disk prior to query execution based on selected persona."""
    skill_map = {
        "sap": os.path.join(os.path.dirname(__file__), ".agents", "skills", "sap-skill", "SKILL.md"),
        "engineer": os.path.join(os.path.dirname(__file__), ".agents", "skills", "google-engineer-skill", "SKILL.md"),
        "child": os.path.join(os.path.dirname(__file__), ".agents", "skills", "child-skill", "SKILL.md")
    }
    
    skill_path = skill_map.get(persona)
    if skill_path and os.path.exists(skill_path):
        try:
            with open(skill_path, "r", encoding="utf-8") as f:
                content = f.read()
                # Strip YAML frontmatter if present
                if content.startswith("---"):
                    parts = content.split("---", 2)
                    if len(parts) >= 3:
                        content = parts[2].strip()
                return f"\n\n[Pre-Loaded Persona Skill Context ({persona.upper()})]:\n{content}"
        except Exception as e:
            print(f"Error loading skill file {skill_path}: {e}")
            
    return ""

@app.post("/api/query")
async def query_llm(req: QueryRequest):
    original_prompt = req.prompt
    preprocessed_prompt = preprocess_text(original_prompt, req.preprocess_option, req.model)
    
    # Optional NotebookLM RAG Context Fetching
    notebook_context = ""
    if req.use_notebook and req.notebook_id:
        try:
            nlm_path = os.path.join(os.path.dirname(__file__), "venv", "bin", "nlm")
            if not os.path.exists(nlm_path):
                nlm_path = "nlm"
            
            # Query the specific NotebookLM notebook
            result = subprocess.run(
                [nlm_path, "notebook", "query", req.notebook_id, original_prompt],
                capture_output=True,
                text=True,
                check=True
            )
            notebook_context = result.stdout.strip()
        except subprocess.CalledProcessError as e:
            err_msg = e.stderr.strip() or e.stdout.strip() or str(e)
            notebook_context = f"[Error querying NotebookLM: {err_msg}]"
            
    format_directives = {
        "code": "\n\n[Output Format Directive: Format your response strictly as clean, well-commented code blocks and technical implementation.]",
        "bullets": "\n\n[Output Format Directive: Format your response strictly as a concise executive summary with bullet points.]",
        "tutorial": "\n\n[Output Format Directive: Format your response as a clear step-by-step tutorial guide with numbered steps.]",
        "table": "\n\n[Output Format Directive: Format your response using markdown tables wherever applicable.]",
        "json": "\n\n[Output Format Directive: Format your response as a valid, raw JSON object without conversational preamble.]"
    }
    if req.output_format in format_directives:
        preprocessed_prompt += format_directives[req.output_format]

    target_lang_key = req.language.lower().strip() if req.language else "en"
    if target_lang_key in LANGUAGE_NAMES and target_lang_key != "en":
        lang_name = LANGUAGE_NAMES[target_lang_key]
        preprocessed_prompt += f"\n\n[Language Directive: You MUST generate your ENTIRE response in {lang_name}. Respond ONLY in {lang_name}.]"

    persona_directives = {
        "child": "\n\n[Persona Directive: Adopt the persona of a Curious Child. Use simple, friendly language, imaginative analogies, and an enthusiastic tone.]",
        "sap": "\n\n[Persona Directive: Adopt the persona of an expert SAP Functional Consultant. Provide enterprise business process insight, SAP terminology (e.g. S/4HANA, T-codes, BAPIs, Fiori), and structured functional recommendations.]",
        "engineer": "\n\n[Persona Directive: Adopt the persona of a Senior Google Systems Engineer. Provide deep technical precision, architectural rigor, high reliability, scalability principles, and production-grade engineering insights.]"
    }
    if req.persona in persona_directives:
        preprocessed_prompt += persona_directives[req.persona]
        # Pre-load skill file context prior to query execution
        skill_context = load_persona_skill_context(req.persona)
        if skill_context:
            preprocessed_prompt += skill_context

    if notebook_context:
        preprocessed_prompt = (
            f"Use the following grounded context from the user's NotebookLM notebook "
            f"to answer the prompt:\n---\n{notebook_context}\n---\n"
            f"User Prompt: {preprocessed_prompt}"
        )
    
    # Route to appropriate model on the Ollama Docker service (port 8081)
    vllm_url = "http://localhost:8081/v1/chat/completions"
    backend_model = get_backend_model_name(req.model)
    
    # Enforce only ONE model in RAM
    ensure_only_model_loaded(backend_model)
        
    headers = {
        "Authorization": "Bearer tulkah-local",
        "Content-Type": "application/json"
    }
    
    now_str = datetime.now().strftime("%A, %B %d, %Y")
    full_user_prompt = f"[System Note: Today's date is {now_str}. You MUST use this date to answer questions about today, the current date, time, or day.]\n\nUser Question: {preprocessed_prompt}"
    
    if req.file_data and req.file_type and req.model in ("gemma-4-12b", "gemma-4-e4b", "glm-4-voice", "qwen-3.6-35b-a3b"):
        content_list: list[dict[str, Any]] = [{"type": "text", "text": full_user_prompt}]
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
        messages = [{"role": "user", "content": full_user_prompt}]
        
    payload: dict[str, Any] = {
        "model": backend_model,
        "messages": messages,
        "stream": True
    }
    
    if req.model == "gemma-4-12b-python":
        payload["temperature"] = req.temperature
        payload["top_p"] = 0.95
    
    def generate_stream():
        full_response = []
        suppressed_reasoning = []
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
                            # If no content tokens arrived, fallback to suppressed reasoning so an answer is always delivered
                            if not full_response and suppressed_reasoning:
                                fallback_text = "".join(suppressed_reasoning)
                                full_response.append(fallback_text)
                                yield f"data: {json.dumps({'token': fallback_text, 'is_thinking': False})}\n\n"
                            
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
                            reasoning = delta.get("reasoning", "") or delta.get("reasoning_content", "")
                            
                            if req.think and reasoning:
                                full_response.append(reasoning)
                                yield f"data: {json.dumps({'token': reasoning, 'is_thinking': True})}\n\n"
                            elif not req.think and reasoning:
                                suppressed_reasoning.append(reasoning)
                                # Yield status heartbeat so frontend remains interactive while reasoning in background
                                yield f"data: {json.dumps({'token': '', 'is_thinking': False, 'status': 'reasoning'})}\n\n"
                            elif token:
                                full_response.append(token)
                                yield f"data: {json.dumps({'token': token, 'is_thinking': False})}\n\n"
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
                "model": row[7] if len(row) > 7 and row[7] else "gemma-4-12b"
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

@app.get("/api/notebooks")
async def get_notebooks():
    try:
        nlm_path = os.path.join(os.path.dirname(__file__), "venv", "bin", "nlm")
        if not os.path.exists(nlm_path):
            nlm_path = "nlm"
            
        result = subprocess.run(
            [nlm_path, "notebook", "list", "--json"],
            capture_output=True,
            text=True,
            check=True
        )
        notebooks = json.loads(result.stdout)
        return JSONResponse(content=notebooks)
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr.strip() or e.stdout.strip() or str(e)
        if "nlm login" in error_msg or "Profile" in error_msg:
            return JSONResponse(status_code=401, content={"error": "Not authenticated with NotebookLM. Run 'nlm login' in your local terminal."})
        return JSONResponse(status_code=500, content={"error": f"NotebookLM CLI error: {error_msg}"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/api/tts")
async def tts_endpoint(req: Request):
    try:
        body = await req.json()
        text = body.get("text", "").strip()
        lang_param = body.get("lang", "en").strip().lower()
        accent_param = body.get("accent", "us").strip().lower()
        
        if not text:
            return JSONResponse(status_code=400, content={"error": "Text is required"})
            
        short_lang = lang_param.split("-")[0].lower()
        if lang_param in ("zh-cn", "zh-tw"):
            short_lang = lang_param
            
        tld_map = {
            "us": "com",       # US Accent
            "gb": "co.uk",     # British / UK Accent
            "ie": "ie",        # Irish Accent
            "nz": "co.nz",     # Kiwi Accent
            "au": "com.au",    # Australian Accent
            "ca": "ca",        # Canadian Accent
            "in": "co.in"      # Indian Accent
        }
        tld_val = tld_map.get(accent_param, "com")
            
        fp = BytesIO()
        tts = gTTS(text=text, lang=short_lang, tld=tld_val)
        tts.write_to_fp(fp)
        fp.seek(0)
        
        return Response(content=fp.read(), media_type="audio/mpeg")
    except Exception as e:
        print(f"TTS Endpoint Error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

# Mount static folder
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
