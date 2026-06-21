document.addEventListener("DOMContentLoaded", () => {
    const chatContainer = document.getElementById("chatContainer");
    const promptInput = document.getElementById("promptInput");
    const micBtn = document.getElementById("micBtn");
    const readAloudBtn = document.getElementById("readAloudBtn");
    const sendBtn = document.getElementById("sendBtn");
    const voiceStatus = document.getElementById("voiceStatus");
    const historyList = document.getElementById("historyList");
    const thinkToggle = document.getElementById("thinkToggle");
    const insecureWarning = document.getElementById("insecureWarning");
    
    // Multimodal Elements & State
    const addFileBtn = document.getElementById("addFileBtn");
    const mediaFileInput = document.getElementById("mediaFileInput");
    const filePreviewContainer = document.getElementById("filePreviewContainer");
    const inputContainer = document.getElementById("inputContainer");
    let stagedFile = null;
    
    // Modal Elements
    const detailModal = document.getElementById("detailModal");
    const closeModal = document.getElementById("closeModal");
    const modalPrompt = document.getElementById("modalPrompt");
    const modalModel = document.getElementById("modalModel");
    const modalOption = document.getElementById("modalOption");
    const modalThink = document.getElementById("modalThink");
    const modalPreprocessed = document.getElementById("modalPreprocessed");
    const modalResponse = document.getElementById("modalResponse");

    // Audio recording state variables
    let audioContext = null;
    let scriptProcessor = null;
    let audioStream = null;
    let leftChannel = [];
    let recordingLength = 0;
    let sampleRate = 0;
    let isRecording = false;

    // Arrow history navigation state variables
    let historyQuestions = [];
    let historyIndex = -1;
    let draftPrompt = "";

    // Curated list of questions related to Google Agents, ADK, and Gemini AI
    const randomQuestions = [
        "How can I build multi-agent workflows using Google's Agent Development Kit (ADK)?",
        "What are the key architectural components of a Google Agent built with ADK?",
        "How do Gemini AI models use thinking mode (reasoning) to solve complex coding tasks?",
        "Can you explain the main differences between Gemma 4 and Gemini 1.5 Pro?",
        "How do we handle state, memory, and context persistence in Google Agents?",
        "What is the recommended prompt format for optimizing Gemini 1.5 Flash performance?",
        "How does the Agent Development Kit (ADK) integrate with external tools and API schemas?",
        "What strategies can be used with Gemini models to minimize token usage in agent loops?",
        "How do you implement a fallback strategy in ADK when an agent's tool call fails?",
        "What role does multimodal input play in voice-to-voice agents built on Gemini?",
        "Can you write a step-by-step guide to deploying a Gemini-powered agent on GCP?",
        "How does ADK handle parallel execution of tasks using cooperative subagents?"
    ];

    // Load history on load
    loadHistory();

    // Model Select change listener to update welcome message header & show/hide attach button
    const modelSelect = document.getElementById("modelSelect");
    if (modelSelect) {
        modelSelect.addEventListener("change", function() {
            const welcomeHeader = document.querySelector(".welcome-message h2");
            if (welcomeHeader) {
                const modelName = this.options[this.selectedIndex].text;
                welcomeHeader.textContent = `Welcome to ${modelName}`;
            }
            if (this.value === "gemma-4-12b") {
                addFileBtn.style.display = "flex";
            } else {
                addFileBtn.style.display = "none";
                clearStagedFile();
            }
        });

        // Initial check on load
        if (modelSelect.value === "gemma-4-12b") {
            addFileBtn.style.display = "flex";
        } else {
            addFileBtn.style.display = "none";
        }
    }

    // Attach File Button & Input triggers
    if (addFileBtn && mediaFileInput) {
        addFileBtn.addEventListener("click", () => {
            mediaFileInput.click();
        });

        mediaFileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                handleFileStaging(file);
            }
        });
    }

    // Drag and Drop implementation
    if (inputContainer) {
        ['dragenter', 'dragover'].forEach(eventName => {
            inputContainer.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (modelSelect && modelSelect.value === "gemma-4-12b") {
                    inputContainer.classList.add('drag-over');
                }
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            inputContainer.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                inputContainer.classList.remove('drag-over');
            }, false);
        });

        inputContainer.addEventListener('drop', (e) => {
            if (modelSelect && modelSelect.value !== "gemma-4-12b") {
                return;
            }
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files && files.length > 0) {
                handleFileStaging(files[0]);
            }
        }, false);
    }

    function handleFileStaging(file) {
        let fileType = "";
        if (file.type.startsWith("image/")) {
            fileType = "image";
        } else if (file.type === "audio/wav" || file.name.endsWith(".wav")) {
            fileType = "audio";
        } else if (file.type === "video/webm" || file.name.endsWith(".webm")) {
            fileType = "video";
        } else {
            alert("Unsupported file type. Please upload an image, wav audio, or webm video.");
            mediaFileInput.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            stagedFile = {
                name: file.name,
                size: formatBytes(file.size),
                type: fileType,
                dataUrl: e.target.result
            };
            renderFilePreview();
        };
        reader.onerror = (err) => {
            console.error("Error reading file:", err);
            alert("Error reading file.");
        };
        reader.readAsDataURL(file);
    }

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function renderFilePreview() {
        if (!stagedFile) {
            filePreviewContainer.style.display = "none";
            filePreviewContainer.innerHTML = "";
            return;
        }

        let previewMediaHtml = "";
        if (stagedFile.type === "image") {
            previewMediaHtml = `<img class="file-preview-thumbnail" src="${stagedFile.dataUrl}" alt="Preview">`;
        } else if (stagedFile.type === "audio") {
            previewMediaHtml = `<div class="file-preview-icon"><i class="fa-solid fa-file-audio"></i></div>`;
        } else if (stagedFile.type === "video") {
            previewMediaHtml = `<div class="file-preview-icon"><i class="fa-solid fa-file-video"></i></div>`;
        }

        filePreviewContainer.innerHTML = `
            <div class="file-preview-card">
                ${previewMediaHtml}
                <div class="file-preview-info">
                    <span class="file-preview-name" title="${stagedFile.name}">${stagedFile.name}</span>
                    <span class="file-preview-size">${stagedFile.size}</span>
                </div>
                <button type="button" class="file-preview-remove" id="removeFileBtn" title="Remove file">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        `;

        filePreviewContainer.style.display = "inline-flex";

        const removeBtn = document.getElementById("removeFileBtn");
        if (removeBtn) {
            removeBtn.addEventListener("click", () => {
                clearStagedFile();
            });
        }
    }

    function clearStagedFile() {
        stagedFile = null;
        if (mediaFileInput) mediaFileInput.value = "";
        renderFilePreview();
    }

    // Textarea auto-resize
    promptInput.addEventListener("input", function() {
        this.style.height = "auto";
        this.style.height = (this.scrollHeight) + "px";
    });

    // Check secure context warning
    const isSecure = window.isSecureContext;
    if (!isSecure) {
        insecureWarning.style.display = "flex";
    }

    // Microphone click handler
    micBtn.addEventListener("click", (e) => {
        e.preventDefault();
        
        if (!isSecure) {
            alert("Microphone entry requires a secure context (localhost or HTTPS).\n\nSince you are accessing the page over an insecure HTTP IP address, browser security prevents microphone access. Please use http://localhost:8000 directly on the device.");
            return;
        }

        if (isRecording) {
            stopRecordingAndSend();
        } else {
            startRecording();
        }
    });

    async function startRecording() {
        try {
            audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Set up Web Audio API recording
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            sampleRate = audioContext.sampleRate;
            
            const source = audioContext.createMediaStreamSource(audioStream);
            
            // 2048 buffer size, 1 input channel, 1 output channel
            scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
            leftChannel = [];
            recordingLength = 0;

            scriptProcessor.onaudioprocess = (e) => {
                const left = e.inputBuffer.getChannelData(0);
                leftChannel.push(new Float32Array(left));
                recordingLength += left.length;
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContext.destination);

            isRecording = true;
            micBtn.classList.add("active");
            voiceStatus.style.display = "block";
            voiceStatus.textContent = "Recording... Click microphone again to transcribe.";
        } catch (err) {
            console.error("Failed to start recording:", err);
            alert("Could not access microphone: " + err.message);
            stopSpeechRecording();
        }
    }

    function stopRecordingAndSend() {
        if (scriptProcessor) {
            scriptProcessor.disconnect();
        }
        if (audioContext) {
            audioContext.close();
        }
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
        }

        isRecording = false;
        micBtn.classList.remove("active");
        voiceStatus.textContent = "Transcribing voice...";

        // Flatten the accumulated floating point audio chunks
        const result = new Float32Array(recordingLength);
        let offset = 0;
        for (let i = 0; i < leftChannel.length; i++) {
            result.set(leftChannel[i], offset);
            offset += leftChannel[i].length;
        }

        // Convert the Float32Array to 16-bit PCM WAV format
        const buffer = new ArrayBuffer(44 + recordingLength * 2);
        const view = new DataView(buffer);

        /* RIFF identifier */
        writeString(view, 0, 'RIFF');
        /* file length */
        view.setUint32(4, 36 + recordingLength * 2, true);
        /* RIFF type */
        writeString(view, 8, 'WAVE');
        /* format chunk identifier */
        writeString(view, 12, 'fmt ');
        /* format chunk length */
        view.setUint32(16, 16, true);
        /* sample format (raw PCM) */
        view.setUint16(20, 1, true);
        /* channel count (mono) */
        view.setUint16(22, 1, true);
        /* sample rate */
        view.setUint32(24, sampleRate, true);
        /* byte rate (sample rate * block align) */
        view.setUint32(28, sampleRate * 2, true);
        /* block align (channel count * bytes per sample) */
        view.setUint16(32, 2, true);
        /* bits per sample (16) */
        view.setUint16(34, 16, true);
        /* data chunk identifier */
        writeString(view, 36, 'data');
        /* data chunk length */
        view.setUint32(40, recordingLength * 2, true);

        // Write sample data
        floatTo16BitPCM(view, 44, result);

        // Send the compiled WAV blob to backend for transcription
        const blob = new Blob([view], { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('audio', blob, 'query.wav');

        fetch('/api/transcribe', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.text) {
                promptInput.value = data.text;
                promptInput.dispatchEvent(new Event("input"));
            } else if (data.error) {
                console.error("Transcription error response:", data.error);
                alert("Transcription failed: " + data.error);
            }
        })
        .catch(err => {
            console.error("Transcription request failed:", err);
            alert("Error connecting to transcription API: " + err.message);
        })
        .finally(() => {
            stopSpeechRecording();
        });
    }

    function stopSpeechRecording() {
        isRecording = false;
        micBtn.classList.remove("active");
        voiceStatus.style.display = "none";
    }

    function writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    function floatTo16BitPCM(output, offset, input) {
        for (let i = 0; i < input.length; i++, offset += 2) {
            let s = Math.max(-1, Math.min(1, input[i]));
            output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
    }

    // Send Message & History Navigation & Random Question
    const randomQuestionBtn = document.getElementById("randomQuestionBtn");
    const welcomeRandomBtn = document.getElementById("welcomeRandomBtn");

    function generateRandomQuestion() {
        let currentVal = promptInput.value.trim();
        let availableQuestions = randomQuestions.filter(q => q !== currentVal);
        if (availableQuestions.length === 0) {
            availableQuestions = randomQuestions;
        }
        const randomIdx = Math.floor(Math.random() * availableQuestions.length);
        const question = availableQuestions[randomIdx];
        
        promptInput.value = question;
        promptInput.dispatchEvent(new Event("input"));
        promptInput.focus();
    }

    if (randomQuestionBtn) {
        randomQuestionBtn.addEventListener("click", generateRandomQuestion);
    }
    if (welcomeRandomBtn) {
        welcomeRandomBtn.addEventListener("click", generateRandomQuestion);
    }
    if (readAloudBtn) {
        readAloudBtn.addEventListener("click", () => {
            if (!('speechSynthesis' in window)) {
                alert("Text-to-speech is not supported in this browser.");
                return;
            }

            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
                updateReadAloudState(false);
                return;
            }

            // Get selected text or fallback to the latest assistant message
            let textToRead = window.getSelection().toString().trim();
            if (!textToRead) {
                const bubbles = document.querySelectorAll(".chat-message.assistant .message-bubble");
                if (bubbles.length > 0) {
                    textToRead = bubbles[bubbles.length - 1].innerText.trim();
                }
            }

            if (!textToRead) {
                alert("Please select some text or send a query first to read aloud.");
                return;
            }

            const utterance = new SpeechSynthesisUtterance(textToRead);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;

            utterance.onstart = () => {
                updateReadAloudState(true);
            };
            utterance.onend = () => {
                updateReadAloudState(false);
            };
            utterance.onerror = (e) => {
                console.error("SpeechSynthesis error:", e);
                updateReadAloudState(false);
            };

            window.speechSynthesis.speak(utterance);
        });
    }

    function updateReadAloudState(isPlaying) {
        if (!readAloudBtn) return;
        const icon = readAloudBtn.querySelector("i");
        if (isPlaying) {
            readAloudBtn.classList.add("active");
            readAloudBtn.title = "Stop Reading";
            if (icon) {
                icon.className = "fa-solid fa-circle-stop";
            }
        } else {
            readAloudBtn.classList.remove("active");
            readAloudBtn.title = "Read Aloud Highlighted Text";
            if (icon) {
                icon.className = "fa-solid fa-volume-high";
            }
        }
    }

    // Cancel speech when page is unloaded
    window.addEventListener("beforeunload", () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    });

    sendBtn.addEventListener("click", sendMessage);
    promptInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        } else if (e.key === "ArrowUp") {
            if (promptInput.selectionStart === 0 && historyQuestions.length > 0) {
                e.preventDefault();
                if (historyIndex === -1) {
                    draftPrompt = promptInput.value;
                }
                if (historyIndex < historyQuestions.length - 1) {
                    historyIndex++;
                    promptInput.value = historyQuestions[historyIndex];
                    promptInput.dispatchEvent(new Event("input"));
                    setTimeout(() => {
                        promptInput.selectionStart = promptInput.selectionEnd = promptInput.value.length;
                    }, 0);
                }
            }
        } else if (e.key === "ArrowDown") {
            if (promptInput.selectionEnd === promptInput.value.length && historyQuestions.length > 0) {
                if (historyIndex > -1) {
                    e.preventDefault();
                    historyIndex--;
                    if (historyIndex === -1) {
                        promptInput.value = draftPrompt;
                    } else {
                        promptInput.value = historyQuestions[historyIndex];
                    }
                    promptInput.dispatchEvent(new Event("input"));
                    setTimeout(() => {
                        promptInput.selectionStart = promptInput.selectionEnd = promptInput.value.length;
                    }, 0);
                }
            }
        }
    });

    async function sendMessage() {
        // Reset history scroll state
        historyIndex = -1;
        draftPrompt = "";

        const text = promptInput.value.trim();
        if (!text && !stagedFile) return;

        const preprocessOption = document.querySelector('input[name="preprocess"]:checked').value;
        const thinkEnabled = thinkToggle.checked;
        const modelSelect = document.getElementById("modelSelect");
        const selectedModel = modelSelect ? modelSelect.value : "gemma-4-26b";

        // Capture and clear staged file
        const fileSent = stagedFile;
        const requestBody = { 
            prompt: text, 
            preprocess_option: preprocessOption,
            think: thinkEnabled,
            model: selectedModel
        };

        if (fileSent && selectedModel === "gemma-4-12b") {
            requestBody.file_data = fileSent.dataUrl;
            requestBody.file_name = fileSent.name;
            requestBody.file_type = fileSent.type;
        }

        clearStagedFile();

        // Clear input
        promptInput.value = "";
        promptInput.style.height = "auto";

        // Remove welcome screen if present
        const welcome = document.querySelector(".welcome-message");
        if (welcome) welcome.remove();

        // Render User Message with attachment preview if applicable
        let displayPrompt = text;
        if (fileSent) {
            if (fileSent.type === "image") {
                displayPrompt = `<div class="msg-image-attachment" style="margin-bottom: 8px;"><img src="${fileSent.dataUrl}" style="max-width: 240px; max-height: 240px; object-fit: contain; border-radius: 8px; display: block;"></div>` + text;
            } else if (fileSent.type === "audio") {
                displayPrompt = `<div class="msg-audio-attachment" style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.1); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);"><i class="fa-solid fa-file-audio" style="color: var(--accent-secondary); font-size: 1.2rem;"></i><span style="font-weight:500; font-size:0.95rem;">${fileSent.name}</span></div>` + text;
            } else if (fileSent.type === "video") {
                displayPrompt = `<div class="msg-video-attachment" style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.1); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);"><i class="fa-solid fa-file-video" style="color: var(--accent-secondary); font-size: 1.2rem;"></i><span style="font-weight:500; font-size:0.95rem;">${fileSent.name}</span></div>` + text;
            }
        }
        appendMessage("user", displayPrompt);

        // Render Assistant Message (Placeholder with Spinner)
        const assistantMsgEl = appendMessage("assistant", `<div class="spinner"></div>`);
        const bubble = assistantMsgEl.querySelector(".message-bubble");

        try {
            const response = await fetch("/api/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`Server returned status ${response.status}`);
            }

            // Read streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let accumulatedResponse = "";
            let buffer = "";

            bubble.innerHTML = ""; // Clear spinner

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");

                // Keep the last incomplete line in buffer
                buffer = lines.pop();

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const dataContent = line.slice(6).trim();
                        if (dataContent === "[DONE]") {
                            break;
                        }
                        try {
                            const parsed = JSON.parse(dataContent);
                            if (parsed.token) {
                                accumulatedResponse += parsed.token;
                                
                                // Check if user is scrolled to the bottom (within 100px threshold) before rendering
                                const isAtBottom = (chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight) < 100;
                                
                                // Render markdown using marked.js
                                bubble.innerHTML = marked.parse(accumulatedResponse);
                                
                                // Scroll to bottom only if user was already at the bottom
                                if (isAtBottom) {
                                    chatContainer.scrollTop = chatContainer.scrollHeight;
                                }
                            } else if (parsed.error) {
                                throw new Error(parsed.error);
                            }
                        } catch (err) {
                            console.error("Failed to parse SSE line:", line, err);
                        }
                    }
                }
            }
            
            // Reload history to show new prompt
            loadHistory();

        } catch (error) {
            bubble.innerHTML = `<span style="color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Error: ${error.message}</span>`;
            console.error(error);
        }
    }

    function appendMessage(sender, text) {
        const msgEl = document.createElement("div");
        msgEl.className = `chat-message ${sender}`;
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        msgEl.innerHTML = `
            <div class="message-bubble">${text}</div>
            <div class="message-meta">
                <span>${sender === "user" ? "You" : "Gemma"}</span>
                <span>${timestamp}</span>
            </div>
        `;
        
        chatContainer.appendChild(msgEl);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        return msgEl;
    }

    // Load History
    async function loadHistory() {
        try {
            const response = await fetch("/api/history");
            const history = await response.json();

            if (history.error) {
                console.error("Error loading history:", history.error);
                return;
            }

            // Populate unique prompts for arrow navigation
            const uniquePrompts = [];
            history.forEach(item => {
                let pText = item.prompt.trim();
                const attachmentMatch = pText.match(/^\[(?:Image|Audio|Video):\s*[^\]]+\]\s*(.*)/i);
                if (attachmentMatch) {
                    pText = attachmentMatch[1].trim();
                }
                if (pText && !uniquePrompts.includes(pText)) {
                    uniquePrompts.push(pText);
                }
            });
            historyQuestions = uniquePrompts.slice(0, 10);

            if (history.length === 0) {
                historyList.innerHTML = `<div class="history-empty">No previous queries yet</div>`;
                return;
            }

            historyList.innerHTML = "";
            history.forEach(item => {
                const itemEl = document.createElement("div");
                itemEl.className = "history-item";
                
                // Format timestamp
                const date = new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                const modelName = item.model || 'gemma-4-26b';
                const modelLabel = modelName === 'gemma-4-12b' ? '12B' : '26B';
                
                itemEl.innerHTML = `
                    <div class="prompt">${escapeHtml(item.prompt)}</div>
                    <div class="meta">
                        <div style="display: flex; gap: 6px; align-items: center;">
                            <span class="meta-badge model-${modelName}">${modelLabel}</span>
                            <span class="meta-badge">${item.preprocess_option}</span>
                        </div>
                        <span>${date}</span>
                    </div>
                `;
                
                // Open details modal on click
                itemEl.addEventListener("click", () => showDetailModal(item));
                historyList.appendChild(itemEl);
            });
        } catch (err) {
            console.error("Error loading history:", err);
        }
    }
 
    // Modal Details Populate
    function showDetailModal(item) {
        modalPrompt.textContent = item.prompt;
        
        // Model Badge
        const modelName = item.model || 'gemma-4-26b';
        if (modelName === 'gemma-4-12b') {
            modalModel.textContent = 'Gemma 4 12B';
        } else {
            modalModel.textContent = 'Gemma 4 26B';
        }
        modalModel.className = `badge model-badge-meta model-${modelName}`;
        
        // Option Badge
        modalOption.textContent = `Preprocess: ${item.preprocess_option}`;
        
        // Think Badge
        modalThink.textContent = item.think ? "Thinking: ON" : "Thinking: OFF";
        modalThink.style.backgroundColor = item.think ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)";
        modalThink.style.borderColor = item.think ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)";
        modalThink.style.color = item.think ? "#34d399" : "#f87171";

        modalPreprocessed.textContent = item.preprocessed_prompt;
        
        // Render markdown in detail response
        modalResponse.innerHTML = marked.parse(item.response);
        
        detailModal.classList.add("active");
    }

    closeModal.addEventListener("click", () => {
        detailModal.classList.remove("active");
    });

    window.addEventListener("click", (e) => {
        if (e.target === detailModal) {
            detailModal.classList.remove("active");
        }
    });

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});
