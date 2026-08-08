import asyncio
import json
import logging
import time
import requests
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("s2s_server")

app = FastAPI(title="Real-Time Speech-to-Speech Voice Daemon", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAIN_APP_API = "http://127.0.0.1:8000/api/query"

@app.get("/health")
async def health_check():
    return {"status": "online", "daemon": "s2s_voice_server", "port": 8090}

def clean_markdown_for_speech(text: str) -> str:
    if not text:
        return ""
    # Strip thinking tags if present
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
    # Strip markdown headers (#, ##, ###, etc.)
    text = re.sub(r'#+\s*', '', text)
    # Strip bold, italics, strikethrough (**, *, __, _, ~~)
    text = re.sub(r'[*_~]{1,3}', '', text)
    # Strip bullet points and list numbers at start of lines
    text = re.sub(r'^\s*[-*+]\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\s*\d+\.\s+', '', text, flags=re.MULTILINE)
    # Strip code blocks and backticks
    text = re.sub(r'`{1,3}.*?`{1,3}', '', text, flags=re.DOTALL)
    text = re.sub(r'`', '', text)
    # Strip table syntax (| item | value |)
    text = re.sub(r'\|', ' ', text)
    # Strip markdown link syntax [text](url) -> text
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    # Strip leftover asterisks or dashes
    text = text.replace('*', '').replace('#', '')
    # Normalize line breaks to clean spoken paragraphs
    paragraphs = [p.strip() for p in text.split('\n') if p.strip()]
    return "\n\n".join(paragraphs)

@app.websocket("/ws/s2s")
async def s2s_websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("Client connected to Real-Time Voice WebSocket (/ws/s2s)")
    
    current_model = "gemma-4-e4b"
    think_mode = False
    preprocess_option = "none"
    target_language = "en-US"
    is_active = True
    last_query_text = ""
    last_query_time = 0.0
    is_generating = False
    
    try:
        while is_active:
            message = await websocket.receive()
            
            if "text" in message and message["text"]:
                try:
                    payload = json.loads(message["text"])
                    msg_type = payload.get("type")
                    
                    if msg_type == "config":
                        current_model = payload.get("model", current_model)
                        think_mode = payload.get("think", think_mode)
                        preprocess_option = payload.get("preprocess", preprocess_option)
                        target_language = payload.get("language", target_language)
                        logger.info(f"S2S Session configured: model={current_model}, think={think_mode}, preprocess={preprocess_option}, language={target_language}")
                        await websocket.send_json({"type": "config_ack", "status": "ok"})
                        
                    elif msg_type == "transcription_query":
                        # Direct speech query received from client VAD/STT
                        user_text = payload.get("text", "").strip()
                        target_language = payload.get("language", target_language)
                        if payload.get("model"):
                            current_model = payload["model"]
                        if "think" in payload:
                            think_mode = bool(payload["think"])
                        answer_length = payload.get("length", "normal")
                        output_format = payload.get("format", "plain")

                        if not user_text:
                            continue

                        # Filter out single incomplete filler words (e.g., "how", "what", "um")
                        words = user_text.split()
                        if len(words) == 1 and len(user_text) < 4:
                            logger.info(f"Ignoring incomplete single-word voice fragment: '{user_text}'")
                            continue
                        
                        if is_generating:
                            logger.info(f"Ignoring voice query while response generation in progress: '{user_text}'")
                            continue

                        now = time.time()
                        if user_text.lower() == last_query_text.lower() and (now - last_query_time) < 3.0:
                            logger.info(f"Ignoring duplicate Voice Query within 3.0s: '{user_text}'")
                            continue
                        
                        last_query_text = user_text
                        last_query_time = now
                        is_generating = True
                        
                        try:
                            logger.info(f"Processing Voice Query against active model '{current_model}' (think={think_mode}, length={answer_length}, format={output_format}): '{user_text}' (lang={target_language})")
                            await websocket.send_json({"type": "status", "state": "thinking", "text": "Processing response..."})
                            
                            if answer_length == "concise":
                                length_inst = "Keep your answer very short, concise, and direct (1 to 2 sentences max)."
                            elif answer_length == "detailed":
                                length_inst = "Provide a comprehensive, detailed response."
                            else:
                                length_inst = "Provide a standard response in 1 or 2 paragraphs."

                            if output_format == "markdown":
                                fmt_inst = "You may use rich markdown formatting (bold, headers, bullet points) in your response."
                            else:
                                fmt_inst = "Do NOT use any markdown formatting, bolding (**), headers (#), bullet points (- or *), or tables. Respond strictly in plain text conversational paragraphs."

                            voice_instruction = f"[Voice Mode Instruction: {length_inst} {fmt_inst}]"
                            
                            if target_language and target_language != "en-US":
                                prompt_with_lang = f"{voice_instruction}\n[Language Instruction: Please respond fluently in the language specified by code '{target_language}']\n\n{user_text}"
                            else:
                                prompt_with_lang = f"{voice_instruction}\n\n{user_text}"

                            # Query main LLM backend
                            req_payload = {
                                "prompt": prompt_with_lang,
                                "model": current_model,
                                "think": think_mode,
                                "preprocess_option": preprocess_option,
                                "use_notebook": False
                            }
                            
                            loop = asyncio.get_event_loop()
                            
                            def query_backend():
                                accumulated = []
                                try:
                                    with requests.post(MAIN_APP_API, json=req_payload, stream=True, timeout=180) as resp:
                                        if resp.status_code == 200:
                                            for line in resp.iter_lines():
                                                if line:
                                                    line_str = line.decode('utf-8')
                                                    if line_str.startswith("data: "):
                                                        data_content = line_str[6:].strip()
                                                        if data_content == "[DONE]":
                                                            break
                                                        try:
                                                            parsed = json.loads(data_content)
                                                            if parsed.get("token") and not parsed.get("is_thinking"):
                                                                accumulated.append(parsed["token"])
                                                        except Exception:
                                                            pass
                                        else:
                                            logger.error(f"Error querying backend API HTTP {resp.status_code}: {resp.text[:200]}")
                                except Exception as e:
                                    logger.error(f"Error querying backend: {e}")
                                return "".join(accumulated)
                            
                            raw_response = await loop.run_in_executor(None, query_backend)
                            
                            if output_format == "markdown":
                                response_text = re.sub(r'<think>.*?</think>', '', raw_response, flags=re.DOTALL).strip()
                            else:
                                response_text = clean_markdown_for_speech(raw_response)
                            
                            if response_text and response_text.strip():
                                logger.info(f"Voice Response Generated ({len(response_text)} chars): '{response_text[:60]}...'")
                                
                                await websocket.send_json({
                                    "type": "response",
                                    "prompt": user_text,
                                    "text": response_text
                                })
                        finally:
                            is_generating = False
                        
                    elif msg_type == "ping":
                        await websocket.send_json({"type": "pong", "timestamp": time.time()})
                        
                except json.JSONDecodeError:
                    logger.warning("Received invalid JSON payload on S2S WebSocket")
                    
            elif "bytes" in message and message["bytes"]:
                # Binary PCM Audio frame received from client microphone
                pass
                
    except WebSocketDisconnect:
        logger.info("Client disconnected from S2S WebSocket")
    except Exception as e:
        logger.error(f"S2S WebSocket Exception: {e}")

if __name__ == "__main__":
    logger.info("Starting Real-Time S2S Voice Server on http://0.0.0.0:8090...")
    uvicorn.run("s2s_server:app", host="0.0.0.0", port=8090, log_level="info")
