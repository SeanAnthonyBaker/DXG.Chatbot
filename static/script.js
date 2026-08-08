document.addEventListener("DOMContentLoaded", () => {
    const chatContainer = document.getElementById("chatContainer");
    const promptInput = document.getElementById("promptInput");
    const micBtn = document.getElementById("micBtn");
    const readAloudBtn = document.getElementById("readAloudBtn");
    const sendBtn = document.getElementById("sendBtn");
    const voiceStatus = document.getElementById("voiceStatus");
    const historyList = document.getElementById("historyList");
    const thinkToggle = document.getElementById("thinkToggle");
    const codingModeToggle = document.getElementById("codingModeToggle");
    const bigRedMicBtn = document.getElementById("bigRedMicBtn");
    const autoReadToggle = document.getElementById("autoReadToggle");
    const preferredMediaBadge = document.getElementById("preferredMediaBadge");
    const voiceLangSelect = document.getElementById("voiceLangSelect");
    const promptLangSelect = document.getElementById("promptLangSelect");
    const insecureWarning = document.getElementById("insecureWarning");
    const notebookToggle = document.getElementById("notebookToggle");
    const notebookSelectWrapper = document.getElementById("notebookSelectWrapper");
    const notebookSearchInput = document.getElementById("notebookSearchInput");
    const notebookDropdownList = document.getElementById("notebookDropdownList");
    const voiceModeToggle = document.getElementById("voiceModeToggle");
    const voiceChatToggle = document.getElementById("voiceChatToggle");
    const voiceChatLabel = document.getElementById("voiceChatLabel");
    
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
    let isStreaming = false;
    let isVoiceChatMode = false;

    // Arrow history navigation state variables
    let historyQuestions = [];
    let historyIndex = -1;
    let draftPrompt = "";
    let lastRandomQuestion = "";

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

    // Map each random question to a list of deeper, related follow-up questions
    const relatedQuestionsMap = {
        "How can I build multi-agent workflows using Google's Agent Development Kit (ADK)?": [
            "Can you provide a code example of a supervisor agent routing tasks to worker agents in ADK?",
            "What are the best patterns for avoiding infinite loops in multi-agent collaboration in ADK?",
            "How does message passing work between subagents when executing sequential tasks in ADK?"
        ],
        "What are the key architectural components of a Google Agent built with ADK?": [
            "How does the lifecycle of a tool call run through the ADK run loop?",
            "How does the state manager in ADK coordinate memory between different agent execution steps?",
            "What is the role of context and system instructions in shaping an ADK agent's persona?"
        ],
        "How do Gemini AI models use thinking mode (reasoning) to solve complex coding tasks?": [
            "How can we configure the maximum thinking budget and output tokens for Gemini models?",
            "Does enabling thinking mode change the format of the output tokens or tool call JSON?",
            "What types of complex coding problems benefit the most from enabling reasoning/thinking mode?"
        ],
        "Can you explain the main differences between Gemma 4 and Gemini 1.5 Pro?": [
            "How do Gemma 4's lightweight models compare to Gemini 1.5 Flash in latency-sensitive tasks?",
            "Can Gemma 4 run locally on consumer hardware while matching Gemini's capability for tool use?",
            "What are the context window limit differences between the Gemma and Gemini model families?"
        ],
        "How do we handle state, memory, and context persistence in Google Agents?": [
            "What databases or caching layers are recommended for production-grade agent memory?",
            "How do you compress long chat histories to fit within an agent's context window?",
            "Can you show how to implement semantic search based memory retrieval for an active session?"
        ],
        "What is the recommended prompt format for optimizing Gemini 1.5 Flash performance?": [
            "How does system instructions configuration differ from in-context prompt templates for Gemini?",
            "What are the best strategies for few-shot learning within a Gemini 1.5 Flash prompt?",
            "How should multimodal content (like images or audio) be formatted alongside text in Gemini prompts?"
        ],
        "How does the Agent Development Kit (ADK) integrate with external tools and API schemas?": [
            "Can you show how to map an OpenAPI / Swagger spec into an ADK tool definition?",
            "How does ADK parse and validate the arguments returned by a model's tool call?",
            "What is the recommended security architecture when allowing agents to run arbitrary API tools?"
        ],
        "What strategies can be used with Gemini models to minimize token usage in agent loops?": [
            "How can prompt caching be utilized to reduce cost in multi-turn agent conversations?",
            "What is the impact of context truncation on agent decision accuracy over long tasks?",
            "Are there token-saving advantages to utilizing JSON schema constraints on outputs?"
        ],
        "How do you implement a fallback strategy in ADK when an agent's tool call fails?": [
            "How does an agent self-correct using error messages from failed tool executions?",
            "Can we configure ADK to automatically retry with a different model if a tool call crashes?",
            "What design patterns help ensure that tool failures are handled gracefully without stopping the loop?"
        ],
        "What role does multimodal input play in voice-to-voice agents built on Gemini?": [
            "How does Gemini's native audio output stream compare to traditional text-to-speech?",
            "What are the design challenges in synchronizing real-time voice and video streams in Gemini?",
            "Can a multimodal agent perform visual object recognition and speech generation in a single inference turn?"
        ],
        "Can you write a step-by-step guide to deploying a Gemini-powered agent on GCP?": [
            "How do you secure API keys and service account permissions for Gemini deployed on Cloud Run?",
            "What monitoring and logging tools on GCP are best for tracking agent execution traces?",
            "How do you autoscale agent service containers to handle spike traffic without warm startup lag?"
        ],
        "How does ADK handle parallel execution of tasks using cooperative subagents?": [
            "How does ADK resolve resource conflicts when multiple subagents try to access the same tool?",
            "Can you explain the message passing protocol between parallel subagents in ADK?",
            "What are the latency tradeoffs when running subagents in parallel vs. running them sequentially?"
        ]
    };

    // Load history on load
    loadHistory();

    // NotebookLM loading state & handlers
    let notebooksLoaded = false;
    let notebooksList = [];

    function renderNotebookOptions(list) {
        if (!notebookDropdownList) return;
        notebookDropdownList.innerHTML = "";
        
        if (list.length === 0) {
            const emptyOption = document.createElement("div");
            emptyOption.className = "search-dropdown-option disabled";
            emptyOption.textContent = "No matching notebooks";
            notebookDropdownList.appendChild(emptyOption);
            return;
        }

        list.forEach(notebook => {
            const opt = document.createElement("div");
            opt.className = "search-dropdown-option";
            const nbId = notebook.id || notebook.uuid;
            const nbTitle = notebook.title || notebook.name || nbId;
            opt.textContent = nbTitle;
            
            // Highlight selected notebook
            if (notebookSearchInput && notebookSearchInput.dataset.notebookId === nbId) {
                opt.classList.add("selected");
            }
            
            opt.addEventListener("click", (e) => {
                e.stopPropagation();
                if (notebookSearchInput) {
                    notebookSearchInput.value = nbTitle;
                    notebookSearchInput.dataset.notebookId = nbId;
                }
                notebookDropdownList.style.display = "none";
            });
            notebookDropdownList.appendChild(opt);
        });
    }

    async function loadNotebooks() {
        if (!notebookSearchInput || !notebookDropdownList) return;
        notebookSearchInput.value = "";
        notebookSearchInput.placeholder = "Loading notebooks...";
        notebookSearchInput.disabled = true;
        notebookSearchInput.dataset.notebookId = "";
        
        try {
            const response = await fetch("/api/notebooks");
            if (response.status === 401) {
                notebookSearchInput.placeholder = "Run 'nlm login' in terminal";
                alert("Please authenticate with NotebookLM by running './venv/bin/nlm login' in your project terminal, then reload this page.");
                return;
            }
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Failed to load notebooks");
            }
            
            notebooksList = await response.json();
            notebookSearchInput.placeholder = "Search or select a notebook...";
            notebookSearchInput.disabled = false;
            
            if (!Array.isArray(notebooksList) || notebooksList.length === 0) {
                notebookSearchInput.placeholder = "No notebooks found";
                notebooksList = [];
                return;
            }
            
            notebooksLoaded = true;
            renderNotebookOptions(notebooksList);
        } catch (err) {
            console.error("Error loading notebooks:", err);
            notebookSearchInput.placeholder = "Error loading notebooks";
        }
    }

    if (notebookSearchInput) {
        // Toggle list on focus/click
        notebookSearchInput.addEventListener("focus", () => {
            if (notebooksLoaded) {
                notebookDropdownList.style.display = "block";
                const query = notebookSearchInput.value.trim().toLowerCase();
                const filtered = notebooksList.filter(nb => {
                    const title = (nb.title || nb.name || "").toLowerCase();
                    return title.includes(query);
                });
                renderNotebookOptions(filtered);
            }
        });
        
        notebookSearchInput.addEventListener("input", () => {
            if (notebooksLoaded) {
                notebookDropdownList.style.display = "block";
                const query = notebookSearchInput.value.trim().toLowerCase();
                
                if (query === "") {
                    notebookSearchInput.dataset.notebookId = "";
                }
                
                const filtered = notebooksList.filter(nb => {
                    const title = (nb.title || nb.name || "").toLowerCase();
                    return title.includes(query);
                });
                renderNotebookOptions(filtered);
            }
        });
    }

    // Close list on clicking outside
    document.addEventListener("click", (e) => {
        if (notebookSelectWrapper && !notebookSelectWrapper.contains(e.target)) {
            if (notebookDropdownList) {
                notebookDropdownList.style.display = "none";
            }
            if (notebookSearchInput) {
                const selectedId = notebookSearchInput.dataset.notebookId;
                if (selectedId) {
                    const selected = notebooksList.find(nb => (nb.id || nb.uuid) === selectedId);
                    if (selected) {
                        notebookSearchInput.value = selected.title || selected.name;
                    }
                } else {
                    notebookSearchInput.value = "";
                }
            }
        }
    });

    if (notebookToggle) {
        notebookToggle.addEventListener("change", function() {
            if (this.checked) {
                notebookSelectWrapper.style.display = "flex";
                if (!notebooksLoaded) {
                    loadNotebooks();
                }
            } else {
                notebookSelectWrapper.style.display = "none";
                if (notebookSearchInput) {
                    notebookSearchInput.value = "";
                    notebookSearchInput.dataset.notebookId = "";
                }
            }
        });
    }

    // Status Indicator & Reasoning UI Helper Functions
    const statusIndicator = document.getElementById("statusIndicator");
    const statusText = document.getElementById("statusText");
    const statusWrapper = document.querySelector(".status-wrapper");
    const reasoningToggleContainer = document.getElementById("reasoningToggleContainer");
    const reasoningStatusBadge = document.getElementById("reasoningStatusBadge");

    function updateModelStatus(state, customMessage) {
        if (!statusIndicator || !statusText) return;
        if (state === "loading") {
            statusIndicator.className = "status-indicator loading";
            if (statusWrapper) statusWrapper.classList.add("loading-mode");
            statusText.textContent = customMessage || "Loading Model...";
        } else if (state === "ready") {
            statusIndicator.className = "status-indicator online";
            if (statusWrapper) statusWrapper.classList.remove("loading-mode");
            statusText.textContent = customMessage || "Ready";
        } else if (state === "error") {
            statusIndicator.className = "status-indicator offline";
            if (statusWrapper) statusWrapper.classList.remove("loading-mode");
            statusText.textContent = customMessage || "Error";
        }
    }

    function updateReasoningUI() {
        if (!thinkToggle) return;
        const isON = thinkToggle.checked;
        if (reasoningStatusBadge) {
            reasoningStatusBadge.textContent = isON ? "ON" : "OFF";
            reasoningStatusBadge.className = `reasoning-badge ${isON ? 'on' : 'off'}`;
        }
        if (reasoningToggleContainer) {
            if (isON) {
                reasoningToggleContainer.classList.add("active");
            } else {
                reasoningToggleContainer.classList.remove("active");
            }
        }
    }

    if (thinkToggle) {
        thinkToggle.addEventListener("change", updateReasoningUI);
        updateReasoningUI(); // Initial status check
    }

    if (reasoningToggleContainer) {
        reasoningToggleContainer.addEventListener("click", (e) => {
            if (e.target !== thinkToggle && !e.target.closest(".header-switch")) {
                thinkToggle.checked = !thinkToggle.checked;
                updateReasoningUI();
            }
        });
    }

    async function prepareSelectedModel(modelValue) {
        const spokenVoiceEngineSelect = document.getElementById("spokenVoiceEngineSelect");
        const activeVoiceEngine = spokenVoiceEngineSelect ? spokenVoiceEngineSelect.value : "e4b";

        updateModelStatus("loading", `Loading ${modelValue}...`);
        if (bigRedMicBtn) bigRedMicBtn.style.display = "none";
        if (voiceChatLabel) voiceChatLabel.style.display = "none";

        // Show prominent status message in chat container if empty or welcome screen active
        const welcomeMessage = document.querySelector(".welcome-message p");
        const originalWelcomeText = welcomeMessage ? welcomeMessage.textContent : "";
        if (welcomeMessage) {
            welcomeMessage.innerHTML = `<span style="color: #f59e0b; font-weight: 600;"><i class="fa-solid fa-spinner fa-spin"></i> Preparing & loading ${modelValue} into memory...</span>`;
        }

        try {
            const res = await fetch("/api/prepare-model", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: modelValue, voice_engine: activeVoiceEngine })
            });
            const data = await res.json();
            if (data.status === "ready") {
                updateModelStatus("ready", "Ready");
                if (welcomeMessage) {
                    welcomeMessage.textContent = originalWelcomeText || "Start a conversation by typing a prompt below.";
                }
                if (modelSelect && (modelSelect.value === "gemma-4-e4b" || modelSelect.value === "glm-4-voice" || modelSelect.value === "gemma-4-12b")) {
                    if (bigRedMicBtn) bigRedMicBtn.style.display = "inline-flex";
                    if (voiceChatLabel) voiceChatLabel.style.display = "inline-flex";
                }
            } else {
                updateModelStatus("error", "Load Error");
                if (welcomeMessage) {
                    welcomeMessage.innerHTML = `<span style="color: #ef4444;"><i class="fa-solid fa-circle-exclamation"></i> Error loading ${modelValue}</span>`;
                }
                if (bigRedMicBtn) bigRedMicBtn.style.display = "none";
                if (voiceChatLabel) voiceChatLabel.style.display = "none";
            }
        } catch (err) {
            console.error("Error preparing model:", err);
            updateModelStatus("error", "Load Error");
            if (welcomeMessage) {
                welcomeMessage.innerHTML = `<span style="color: #ef4444;"><i class="fa-solid fa-circle-exclamation"></i> Error preparing ${modelValue}</span>`;
            }
            if (bigRedMicBtn) bigRedMicBtn.style.display = "none";
            if (voiceChatLabel) voiceChatLabel.style.display = "none";
        }
    }

    // Model Select change listener to update welcome message header, prepare model & show/hide attach button
    const modelSelect = document.getElementById("modelSelect");
    if (modelSelect) {
        modelSelect.addEventListener("change", function() {
            const welcomeHeader = document.querySelector(".welcome-message h2");
            if (welcomeHeader) {
                const modelName = this.options[this.selectedIndex].text;
                welcomeHeader.textContent = `Welcome to ${modelName}`;
            }
            if (this.value === "gemma-4-12b" || this.value === "gemma-4-e4b" || this.value === "glm-4-voice" || this.value === "qwen-3.6-35b-a3b") {
                addFileBtn.style.display = "flex";
            } else {
                addFileBtn.style.display = "none";
                clearStagedFile();
            }

            // Hide red mic button until prepareSelectedModel confirms voice model is ready
            if (bigRedMicBtn) bigRedMicBtn.style.display = "none";
            if (voiceChatLabel) voiceChatLabel.style.display = "none";

            if (this.value === "gemma-4-e4b" || this.value === "glm-4-voice") {
                const preprocessSelect = document.getElementById("preprocessSelect");
                if (preprocessSelect) preprocessSelect.value = "clean";
                if (preferredMediaBadge) preferredMediaBadge.style.display = "inline-flex";
            } else {
                if (preferredMediaBadge) preferredMediaBadge.style.display = "none";
            }
            prepareSelectedModel(this.value);
        });

        // Initial check on load
        if (modelSelect.value === "gemma-4-12b" || modelSelect.value === "gemma-4-e4b" || modelSelect.value === "glm-4-voice" || modelSelect.value === "qwen-3.6-35b-a3b") {
            addFileBtn.style.display = "flex";
        } else {
            addFileBtn.style.display = "none";
        }
        if (bigRedMicBtn) bigRedMicBtn.style.display = "none";
        if (voiceChatLabel) voiceChatLabel.style.display = "none";
        if (modelSelect.value === "gemma-4-e4b" || modelSelect.value === "glm-4-voice") {
            if (autoReadToggle) autoReadToggle.checked = true;
            const cleanRadio = document.querySelector('input[name="preprocess"][value="clean"]');
            if (cleanRadio) cleanRadio.checked = true;
            if (preferredMediaBadge) preferredMediaBadge.style.display = "inline-flex";
        } else {
            if (preferredMediaBadge) preferredMediaBadge.style.display = "none";
        }
        prepareSelectedModel(modelSelect.value);
    }

    if (voiceModeToggle) {
        voiceModeToggle.addEventListener("change", function() {
            if (this.checked) {
                const cleanRadio = document.querySelector('input[name="preprocess"][value="clean"]');
                if (cleanRadio) cleanRadio.checked = true;
            }
        });
    }

    // Voice Chat Toggle: switch between STT mode and direct E4B audio query mode
    if (voiceChatToggle) {
        voiceChatToggle.addEventListener("change", function() {
            isVoiceChatMode = this.checked;
            // Update button text to reflect current mode
            if (bigRedMicBtn) {
                const span = bigRedMicBtn.querySelector("span");
                if (span && !isRecording) span.textContent = "Press to speak";
            }
        });
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

    // Textarea auto-resize & Explore Related state checks
    promptInput.addEventListener("input", function() {
        this.style.height = "auto";
        this.style.height = (this.scrollHeight) + "px";
        
        const currentVal = this.value.trim();
        if (currentVal === "") {
            if (exploreRelatedBtn) exploreRelatedBtn.setAttribute("disabled", "true");
        } else if (relatedQuestionsMap[currentVal]) {
            lastRandomQuestion = currentVal;
            enableExploreButtons();
        }
    });

    // Check secure context warning
    const isSecure = window.isSecureContext;
    if (!isSecure) {
        insecureWarning.style.display = "flex";
    }

    // ========== VOICE RECORDING SYSTEM ==========
    // Always uses AudioContext for reliable recording.
    // SpeechRecognition is optional overlay for real-time interim transcripts.
    
    let speechRecognition = null;
    let isSpeechRecActive = false;
    let basePromptText = "";
    let cursorInsertPos = 0;
    let voiceWaveAnimId = null;
    let analyserNode = null;
    const voiceWaveContainer = document.getElementById("voiceWaveContainer");
    const voiceWaveCanvas = document.getElementById("voiceWaveCanvas");
    let voiceWaveCtx = voiceWaveCanvas ? voiceWaveCanvas.getContext("2d") : null;

    // --- UI State Helper ---
    function updateVoiceUI(recording) {
        isRecording = recording;
        if (micBtn) {
            micBtn.classList.toggle("active", recording);
        }
        if (bigRedMicBtn) {
            const span = bigRedMicBtn.querySelector("span");
            bigRedMicBtn.classList.toggle("recording", recording);
            if (span) span.textContent = recording ? (isVoiceChatMode ? "Release to send" : "Release to encode") : "Press to speak";
        }
        if (voiceWaveContainer) {
            voiceWaveContainer.style.display = recording ? "inline-flex" : "none";
        }
        if (voiceStatus) {
            if (recording) {
                voiceStatus.style.display = "block";
                voiceStatus.textContent = "Listening… Release red button when finished speaking.";
            } else {
                voiceStatus.style.display = "none";
            }
        }
        if (recording) {
            startWaveformVis();
        } else {
            stopWaveformVis();
        }
    }

    // --- Waveform Visualizer ---
    function startWaveformVis() {
        if (!voiceWaveCtx || !voiceWaveCanvas) return;
        const W = voiceWaveCanvas.width;
        const H = voiceWaveCanvas.height;

        function draw() {
            voiceWaveCtx.clearRect(0, 0, W, H);
            
            let dataArray;
            if (analyserNode) {
                dataArray = new Uint8Array(analyserNode.frequencyBinCount);
                analyserNode.getByteTimeDomainData(dataArray);
            }

            voiceWaveCtx.lineWidth = 2;
            voiceWaveCtx.strokeStyle = "#f43f5e";
            voiceWaveCtx.beginPath();

            if (dataArray && dataArray.length > 0) {
                const sliceWidth = W / dataArray.length;
                let x = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    const v = dataArray[i] / 128.0;
                    const y = (v * H) / 2;
                    if (i === 0) voiceWaveCtx.moveTo(x, y);
                    else voiceWaveCtx.lineTo(x, y);
                    x += sliceWidth;
                }
            } else {
                // Animated sine wave fallback
                const t = Date.now() / 200;
                for (let x = 0; x < W; x++) {
                    const y = H / 2 + Math.sin(x * 0.15 + t) * (H * 0.3) * (0.5 + 0.5 * Math.sin(t * 0.7));
                    if (x === 0) voiceWaveCtx.moveTo(x, y);
                    else voiceWaveCtx.lineTo(x, y);
                }
            }
            voiceWaveCtx.stroke();
            voiceWaveAnimId = requestAnimationFrame(draw);
        }
        draw();
    }

    function stopWaveformVis() {
        if (voiceWaveAnimId) {
            cancelAnimationFrame(voiceWaveAnimId);
            voiceWaveAnimId = null;
        }
        if (voiceWaveCtx && voiceWaveCanvas) {
            voiceWaveCtx.clearRect(0, 0, voiceWaveCanvas.width, voiceWaveCanvas.height);
        }
        analyserNode = null;
    }

    // --- SpeechRecognition (optional real-time overlay) ---
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        speechRecognition = new SpeechRec();
        speechRecognition.continuous = true;
        speechRecognition.interimResults = true;
        speechRecognition.lang = 'en-US';

        speechRecognition.onstart = () => { isSpeechRecActive = true; };

        speechRecognition.onresult = (event) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; ++i) {
                transcript += event.results[i][0].transcript;
            }
            transcript = transcript.trim();
            if (transcript && promptInput) {
                // Build new value by inserting at the saved cursor position
                const before = basePromptText.substring(0, cursorInsertPos);
                const after = basePromptText.substring(cursorInsertPos);
                const sep1 = before.length > 0 && !/\s$/.test(before) ? " " : "";
                const sep2 = after.length > 0 && !/^\s/.test(after) ? " " : "";
                promptInput.value = before + sep1 + transcript + sep2 + after;
                promptInput.dispatchEvent(new Event("input"));
            }
        };

        // CRITICAL: Never let these async callbacks reset the recording state.
        // The user controls start/stop via press-and-hold. Only log errors.
        speechRecognition.onerror = (event) => {
            console.warn("SpeechRecognition error (non-fatal):", event.error);
            isSpeechRecActive = false;
        };
        speechRecognition.onend = () => {
            isSpeechRecActive = false;
        };
    }

    // --- Core Voice Input: Start / Stop ---
    function startVoiceInput() {
        if (isRecording) return;
        const isLocalOrSecure = window.isSecureContext || location.hostname === "localhost" || location.hostname === "127.0.0.1";
        if (!isLocalOrSecure) {
            alert("Microphone entry requires a secure context (localhost or HTTPS).\n\nPlease access http://localhost:8000 directly.");
            return;
        }

        // Cancel any speech synthesis
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            updateReadAloudState(false);
        }

        // Snapshot cursor position & existing text BEFORE changing UI
        if (promptInput) {
            basePromptText = promptInput.value;
            cursorInsertPos = promptInput.selectionStart != null ? promptInput.selectionStart : basePromptText.length;
        } else {
            basePromptText = "";
            cursorInsertPos = 0;
        }

        // 1. Synchronously update UI FIRST (never wait for async)
        updateVoiceUI(true);

        // 2. Always start AudioContext recording (reliable primary path)
        startAudioRecording();

        // 3. Optionally start SpeechRecognition overlay for real-time text (STT mode only)
        if (!isVoiceChatMode && speechRecognition) {
            try {
                speechRecognition.start();
            } catch (err) {
                console.warn("SpeechRecognition start failed (using audio recording):", err);
            }
        }
    }

    function stopVoiceInput() {
        if (!isRecording) return;

        // 1. Stop SpeechRecognition if active
        if (isSpeechRecActive && speechRecognition) {
            try { speechRecognition.stop(); } catch (e) { /* ignore */ }
            isSpeechRecActive = false;
        }

        // 2. Reset recording UI
        isRecording = false;
        if (micBtn) micBtn.classList.remove("active");
        if (bigRedMicBtn) {
            bigRedMicBtn.classList.remove("recording");
            const span = bigRedMicBtn.querySelector("span");
            if (span) span.textContent = "Press to speak";
        }
        stopWaveformVis();
        if (voiceWaveContainer) voiceWaveContainer.style.display = "none";

        // 3. Branch on mode
        if (isVoiceChatMode) {
            // VOICE CHAT MODE: Build WAV, convert to base64, send directly to E4B
            if (voiceStatus) {
                voiceStatus.style.display = "block";
                voiceStatus.textContent = "Sending voice to E4B…";
            }
            stopAudioAndSendDirect();
        } else {
            // STT MODE: Send audio to /api/transcribe, insert text at cursor
            if (voiceStatus) {
                voiceStatus.style.display = "block";
                voiceStatus.textContent = "Encoding & transcribing voice…";
            }
            stopAudioAndTranscribe();
        }
    }

    // --- Mic Button Event Binding ---
    if (micBtn) {
        micBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (isRecording) stopVoiceInput();
            else startVoiceInput();
        });
    }

    if (bigRedMicBtn) {
        let isPressing = false;

        const onPressStart = (e) => {
            if (e) e.preventDefault();
            if (isPressing) return;
            isPressing = true;
            startVoiceInput();
        };

        const onPressEnd = (e) => {
            if (e) e.preventDefault();
            if (!isPressing) return;
            isPressing = false;
            stopVoiceInput();
        };

        bigRedMicBtn.addEventListener("mousedown", onPressStart);
        bigRedMicBtn.addEventListener("touchstart", onPressStart, { passive: false });

        // Listen on window so release works even if cursor drifts off the button
        window.addEventListener("mouseup", () => { if (isPressing) onPressEnd(); });
        bigRedMicBtn.addEventListener("touchend", onPressEnd);
        bigRedMicBtn.addEventListener("touchcancel", onPressEnd);

        // Block click to prevent ghost click after press-and-hold
        bigRedMicBtn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); });
    }

    // --- AudioContext Recording (always-reliable path) ---
    async function startAudioRecording() {
        try {
            audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext.state === "suspended") await audioContext.resume();
            sampleRate = audioContext.sampleRate;

            const source = audioContext.createMediaStreamSource(audioStream);

            // Create analyser for waveform visualisation
            analyserNode = audioContext.createAnalyser();
            analyserNode.fftSize = 256;
            source.connect(analyserNode);

            // Create script processor for raw PCM capture
            scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
            leftChannel = [];
            recordingLength = 0;

            scriptProcessor.onaudioprocess = (e) => {
                const left = e.inputBuffer.getChannelData(0);
                leftChannel.push(new Float32Array(left));
                recordingLength += left.length;
            };

            analyserNode.connect(scriptProcessor);
            scriptProcessor.connect(audioContext.destination);
        } catch (err) {
            console.error("Failed to start recording:", err);
            alert("Could not access microphone: " + err.message);
            updateVoiceUI(false);
        }
    }

    // --- Shared WAV Builder ---
    function disconnectAudioNodes() {
        if (scriptProcessor) { try { scriptProcessor.disconnect(); } catch(e){} }
        if (analyserNode) { try { analyserNode.disconnect(); } catch(e){} }
        if (audioContext) { try { audioContext.close(); } catch(e){} }
        if (audioStream) { audioStream.getTracks().forEach(t => t.stop()); }
    }

    function buildWavBlob() {
        if (recordingLength === 0) return null;

        // Flatten audio chunks
        const result = new Float32Array(recordingLength);
        let offset = 0;
        for (let i = 0; i < leftChannel.length; i++) {
            result.set(leftChannel[i], offset);
            offset += leftChannel[i].length;
        }

        // Build WAV header + PCM data
        const buffer = new ArrayBuffer(44 + recordingLength * 2);
        const view = new DataView(buffer);
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + recordingLength * 2, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(view, 36, 'data');
        view.setUint32(40, recordingLength * 2, true);
        floatTo16BitPCM(view, 44, result);

        return new Blob([view], { type: 'audio/wav' });
    }

    // --- STT Mode: Transcribe via /api/transcribe ---
    function stopAudioAndTranscribe() {
        disconnectAudioNodes();

        const wavBlob = buildWavBlob();
        if (!wavBlob) {
            if (voiceStatus) voiceStatus.style.display = "none";
            return;
        }

        const formData = new FormData();
        formData.append('audio', wavBlob, 'query.wav');

        fetch('/api/transcribe', { method: 'POST', body: formData })
        .then(res => res.json())
        .then(data => {
            if (data.text) {
                const newText = data.text.trim();
                if (newText && promptInput) {
                    // Insert at cursor position (saved before recording)
                    const current = promptInput.value;
                    const before = current.substring(0, cursorInsertPos);
                    const after = current.substring(cursorInsertPos);
                    const sep1 = before.length > 0 && !/\s$/.test(before) ? " " : "";
                    const sep2 = after.length > 0 && !/^\s/.test(after) ? " " : "";
                    promptInput.value = before + sep1 + newText + sep2 + after;
                    // Move cursor to end of inserted text
                    const newCursorPos = (before + sep1 + newText).length;
                    promptInput.setSelectionRange(newCursorPos, newCursorPos);
                    cursorInsertPos = newCursorPos;
                    promptInput.dispatchEvent(new Event("input"));
                    promptInput.focus();
                }
            } else if (data.error) {
                console.error("Transcription error:", data.error);
            }
        })
        .catch(err => {
            console.error("Transcription request failed:", err);
        })
        .finally(() => {
            if (voiceStatus) voiceStatus.style.display = "none";
        });
    }

    // --- Voice Chat Mode: Send audio directly to E4B via /api/query ---
    function stopAudioAndSendDirect() {
        disconnectAudioNodes();

        const wavBlob = buildWavBlob();
        if (!wavBlob) {
            if (voiceStatus) voiceStatus.style.display = "none";
            return;
        }

        // Convert WAV blob to base64 data URL
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result; // "data:audio/wav;base64,..."

            // Stage the audio file as if the user attached it
            stagedFile = {
                dataUrl: dataUrl,
                name: "voice_query.wav",
                type: "audio"
            };

            // Use existing prompt text as context, or default
            const currentPrompt = promptInput ? promptInput.value.trim() : "";
            if (!currentPrompt) {
                promptInput.value = "Respond to my voice query";
            }

            if (voiceStatus) voiceStatus.style.display = "none";

            // Trigger sendMessage which will include the staged audio file
            sendMessage();
        };
        reader.onerror = () => {
            console.error("Failed to convert audio to base64");
            if (voiceStatus) voiceStatus.style.display = "none";
        };
        reader.readAsDataURL(wavBlob);
    }

    // Legacy alias used elsewhere in the codebase
    function stopSpeechRecording() {
        updateVoiceUI(false);
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
    const exploreRelatedBtn = document.getElementById("exploreRelatedBtn");
    const welcomeExploreBtn = document.getElementById("welcomeExploreBtn");

    function generateRandomQuestion(autoSubmit = false) {
        if (!promptInput || isStreaming) return;
        let currentVal = promptInput.value.trim();
        let availableQuestions = randomQuestions.filter(q => q !== currentVal);
        if (availableQuestions.length === 0) {
            availableQuestions = randomQuestions;
        }
        const randomIdx = Math.floor(Math.random() * availableQuestions.length);
        const question = availableQuestions[randomIdx];
        
        promptInput.value = question;
        promptInput.style.height = "auto";
        promptInput.style.height = Math.min(promptInput.scrollHeight, 200) + "px";
        promptInput.dispatchEvent(new Event("input"));
        promptInput.focus();

        // Flash visual glowing border on promptInput container so user clearly sees the generated question!
        promptInput.classList.add("input-generated-flash");
        setTimeout(() => promptInput.classList.remove("input-generated-flash"), 1200);

        // Save last random question
        lastRandomQuestion = question;
        enableExploreButtons();

        if (autoSubmit) {
            setTimeout(() => {
                sendMessage();
            }, 600);
        }
    }

    function enableExploreButtons() {
        const expBtn = document.getElementById("exploreRelatedBtn");
        const welcExpBtn = document.getElementById("welcomeExploreBtn");
        if (expBtn) {
            expBtn.removeAttribute("disabled");
        }
        if (welcExpBtn) {
            welcExpBtn.style.display = "flex";
        }
    }

    function exploreRelatedQuestion(autoSubmit = false) {
        if (!promptInput || isStreaming) return;
        if (!lastRandomQuestion) {
            // Fallback: Pick a random base question first
            const randomIdx = Math.floor(Math.random() * randomQuestions.length);
            lastRandomQuestion = randomQuestions[randomIdx];
        }

        const relatedList = relatedQuestionsMap[lastRandomQuestion];
        if (relatedList && relatedList.length > 0) {
            let currentVal = promptInput.value.trim();
            let availableRelated = relatedList.filter(q => q !== currentVal);
            if (availableRelated.length === 0) {
                availableRelated = relatedList;
            }
            const randomIdx = Math.floor(Math.random() * availableRelated.length);
            const followUp = availableRelated[randomIdx];

            promptInput.value = followUp;
            promptInput.style.height = "auto";
            promptInput.style.height = Math.min(promptInput.scrollHeight, 200) + "px";
            promptInput.dispatchEvent(new Event("input"));
            promptInput.focus();

            // Flash visual glowing border
            promptInput.classList.add("input-generated-flash");
            setTimeout(() => promptInput.classList.remove("input-generated-flash"), 1200);

            if (autoSubmit) {
                setTimeout(() => {
                    sendMessage();
                }, 600);
            }
        }
    }

    // Single unified event delegation listener for random & explore buttons
    document.addEventListener("click", (e) => {
        const targetBtn = e.target.closest("#welcomeRandomBtn, #randomQuestionBtn, #welcomeExploreBtn, #exploreRelatedBtn");
        if (targetBtn) {
            e.preventDefault();
            e.stopPropagation();
            if (targetBtn.id === "welcomeRandomBtn") {
                // Welcome pill: Populate prompt box & auto-submit after 600ms
                generateRandomQuestion(true);
            } else if (targetBtn.id === "randomQuestionBtn") {
                // Query bar button: Populate prompt box for user inspection!
                generateRandomQuestion(false);
            } else if (targetBtn.id === "welcomeExploreBtn") {
                exploreRelatedQuestion(true);
            } else if (targetBtn.id === "exploreRelatedBtn") {
                exploreRelatedQuestion(false);
            }
        }
    });
    // Voice pre-fetching
    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = () => {
                window.speechSynthesis.getVoices();
            };
        }
    }

    function saveSelection(containerEl) {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return null;
        const range = selection.getRangeAt(0);
        
        // Ensure selection is inside the container
        if (!containerEl.contains(range.commonAncestorContainer)) {
            return null;
        }
        
        const preSelectionRange = range.cloneRange();
        preSelectionRange.selectNodeContents(containerEl);
        preSelectionRange.setEnd(range.startContainer, range.startOffset);
        const start = preSelectionRange.toString().length;
        
        return {
            start: start,
            end: start + range.toString().length
        };
    }

    function restoreSelection(containerEl, savedSel) {
        if (!savedSel) return;
        const selection = window.getSelection();
        if (!selection) return;
        selection.removeAllRanges();
        
        const range = document.createRange();
        let charIndex = 0;
        let startNode = null, startOffset = 0;
        let endNode = null, endOffset = 0;
        
        function traverse(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                const nextIndex = charIndex + node.length;
                if (!startNode && savedSel.start >= charIndex && savedSel.start <= nextIndex) {
                    startNode = node;
                    startOffset = savedSel.start - charIndex;
                }
                if (!endNode && savedSel.end >= charIndex && savedSel.end <= nextIndex) {
                    endNode = node;
                    endOffset = savedSel.end - charIndex;
                }
                charIndex = nextIndex;
            } else {
                for (let i = 0; i < node.childNodes.length; i++) {
                    traverse(node.childNodes[i]);
                    if (startNode && endNode) break;
                }
            }
        }
        
        traverse(containerEl);
        
        if (startNode && !endNode) {
            endNode = startNode;
            endOffset = startNode.length;
        }
        
        if (startNode && endNode) {
            try {
                range.setStart(startNode, startOffset);
                range.setEnd(endNode, endOffset);
                selection.addRange(range);
            } catch (e) {
                console.error("Error restoring selection range:", e);
            }
        }
    }

    function updateHTMLPreservingSelection(element, newHTML) {
        const savedSel = saveSelection(element);
        element.innerHTML = newHTML;
        if (savedSel) {
            restoreSelection(element, savedSel);
        }
    }

    function formatStreamingMarkdown(text) {
        if (!text) return "";
        let completed = text;
        
        // 1. Check unclosed fenced code blocks (```)
        const codeBlockMatches = text.match(/```/g);
        if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
            completed += "\n```";
            return completed; // Inside code block, no need to auto-close inline formatting
        }

        // 2. Remove closed code blocks for inline checking
        const strippedCode = text.replace(/```[\s\S]*?```/g, "");

        // 3. Check unclosed inline code (`)
        const inlineCodeMatches = strippedCode.match(/`/g);
        if (inlineCodeMatches && inlineCodeMatches.length % 2 !== 0) {
            completed += "`";
        }

        // 4. Check unclosed bold (**)
        const boldMatches = strippedCode.match(/\*\*/g);
        if (boldMatches && boldMatches.length % 2 !== 0) {
            completed += "**";
        }

        // 5. Check unclosed strikethrough (~~)
        const strikeMatches = strippedCode.match(/~~/g);
        if (strikeMatches && strikeMatches.length % 2 !== 0) {
            completed += "~~";
        }

        return completed;
    }

    function populateVoiceList() {
        if (!voiceLangSelect || !('speechSynthesis' in window)) return;
        const voices = window.speechSynthesis.getVoices();
        
        const currentVal = voiceLangSelect.value;
        voiceLangSelect.innerHTML = "";

        // 1. E4B Standard Voices Group
        const e4bGroup = document.createElement("optgroup");
        e4bGroup.label = "🌟 E4B Standard Voices";

        const e4bPresets = [
            { value: "e4b-uk-female", label: "🌟 E4B Natural (UK Female)" },
            { value: "e4b-us-female", label: "🌟 E4B Conversational (US Female)" },
            { value: "e4b-us-male", label: "🌟 E4B Executive (US Male)" },
            { value: "e4b-nz-female", label: "🌟 E4B Kiwi (NZ Female)" },
            { value: "e4b-ie-female", label: "🌟 E4B Irish (IE Female)" },
            { value: "e4b-multi", label: "🌟 E4B Multilingual Assistant" }
        ];

        e4bPresets.forEach(preset => {
            const opt = document.createElement("option");
            opt.value = preset.value;
            opt.textContent = preset.label;
            if (currentVal === preset.value) opt.selected = true;
            e4bGroup.appendChild(opt);
        });
        voiceLangSelect.appendChild(e4bGroup);

        // 2. Installed Languages Group
        if (voices.length > 0) {
            const langGroup = document.createElement("optgroup");
            langGroup.label = "🌐 Installed Languages & Accents";

            const sortedVoices = voices.slice().sort((a, b) => {
                const langA = (a.lang || "").toLowerCase();
                const langB = (b.lang || "").toLowerCase();
                if (langA < langB) return -1;
                if (langA > langB) return 1;
                return a.name.localeCompare(b.name);
            });

            sortedVoices.forEach((v) => {
                const opt = document.createElement("option");
                opt.value = v.voiceURI || v.name;
                const langLabel = v.lang ? `[${v.lang}] ` : "";
                opt.textContent = `${langLabel}${v.name}`;
                if (currentVal === opt.value) opt.selected = true;
                langGroup.appendChild(opt);
            });
            voiceLangSelect.appendChild(langGroup);
        }
    }

    if ('speechSynthesis' in window) {
        populateVoiceList();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = populateVoiceList;
        }
    }

    function getUKFemaleVoice() {
        const voices = window.speechSynthesis.getVoices();
        const gbVoices = voices.filter(v => v.lang.toLowerCase() === 'en-gb' || v.lang.toLowerCase().startsWith('en-gb'));
        if (gbVoices.length > 0) {
            const female = gbVoices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('hazel') || v.name.toLowerCase().includes('susan') || v.name.toLowerCase().includes('google'));
            return female || gbVoices[0];
        }
        const enVoices = voices.filter(v => v.lang.toLowerCase().startsWith('en'));
        if (enVoices.length > 0) {
            const female = enVoices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('susan') || v.name.toLowerCase().includes('hazel'));
            return female || enVoices[0];
        }
        return null;
    }

    function getSelectedVoice() {
        if (!('speechSynthesis' in window)) return null;
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) return null;

        const val = voiceLangSelect ? voiceLangSelect.value : "e4b-uk-female";

        // E4B Standard Preset Mappings
        if (val === "e4b-uk-female") {
            const ukFemale = voices.find(v => v.lang.toLowerCase().startsWith('en-gb') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('hazel') || v.name.toLowerCase().includes('google')));
            return ukFemale || voices.find(v => v.lang.toLowerCase().startsWith('en-gb')) || getUKFemaleVoice();
        } else if (val === "e4b-us-female") {
            const usFemale = voices.find(v => v.lang.toLowerCase().startsWith('en-us') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('google')));
            return usFemale || voices.find(v => v.lang.toLowerCase().startsWith('en-us')) || getUKFemaleVoice();
        } else if (val === "e4b-us-male") {
            const usMale = voices.find(v => v.lang.toLowerCase().startsWith('en-us') && (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('george')));
            return usMale || voices.find(v => v.lang.toLowerCase().startsWith('en-us')) || getUKFemaleVoice();
        } else if (val === "e4b-nz-female") {
            const kiwiVoice = voices.find(v => (v.lang.toLowerCase().includes('nz') || v.name.toLowerCase().includes('new zealand') || v.name.toLowerCase().includes('kiwi')) && (v.name.toLowerCase().includes('female') || !v.name.toLowerCase().includes('male')));
            return kiwiVoice || voices.find(v => v.lang.toLowerCase().includes('nz')) || voices.find(v => v.lang.toLowerCase().startsWith('en-au')) || getUKFemaleVoice();
        } else if (val === "e4b-ie-female") {
            const irishVoice = voices.find(v => (v.lang.toLowerCase().includes('ie') || v.name.toLowerCase().includes('irish') || v.name.toLowerCase().includes('ireland') || v.name.toLowerCase().includes('moira') || v.name.toLowerCase().includes('orla')) && (v.name.toLowerCase().includes('female') || !v.name.toLowerCase().includes('male')));
            return irishVoice || voices.find(v => v.lang.toLowerCase().includes('ie')) || getUKFemaleVoice();
        } else if (val === "e4b-multi") {
            return voices[0];
        }

        // Direct voiceURI / Name lookup
        const matched = voices.find(v => (v.voiceURI === val || v.name === val));
        if (matched) return matched;

        return getUKFemaleVoice();
    }

    if (readAloudBtn) {
        readAloudBtn.addEventListener("click", () => {
            if (currentAudioPlayback || (window.speechSynthesis && window.speechSynthesis.speaking)) {
                cancelVoiceAndSpeech();
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

            updateReadAloudState(true);
            const targetLang = spokenLangSelect ? spokenLangSelect.value : "en-US";
            const targetSpeed = spokenSpeedSelect ? parseFloat(spokenSpeedSelect.value) : 1.25;
            const targetEngine = spokenVoiceEngineSelect ? spokenVoiceEngineSelect.value : "e4b";
            playTTS(textToRead, targetLang, targetSpeed, targetEngine);
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
            readAloudBtn.title = "Listen to Selection / Response";
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

    let lastQueryTimestamp = 0;

    async function sendMessage() {
        // Safety guard: Auto-unlock if isStreaming got stuck for > 10 seconds
        if (isStreaming && (Date.now() - lastQueryTimestamp > 10000)) {
            console.warn("Auto-unlocking stuck isStreaming state...");
            isStreaming = false;
        }

        if (isStreaming) return;
        lastQueryTimestamp = Date.now();

        // Stop any active text-to-speech playback and reset stream queue
        resetAudioStreamQueue();
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            updateReadAloudState(false);
        }

        // Reset history scroll state
        historyIndex = -1;
        draftPrompt = "";

        const text = promptInput ? promptInput.value.trim() : "";
        if (!text && !stagedFile) return;

        const preprocessSelect = document.getElementById("preprocessSelect") || document.querySelector('select[name="preprocess"]');
        const preprocessOption = preprocessSelect ? preprocessSelect.value : "clean";
        const thinkEnabled = thinkToggle ? thinkToggle.checked : false;
        const codingModeEnabled = codingModeToggle ? codingModeToggle.checked : false;
        // modelSelect already declared above — reuse it
        const _modelSelect = document.getElementById("modelSelect");
        const selectedModel = _modelSelect ? _modelSelect.value : "gemma-4-12b";

        const outputFormatSelect = document.getElementById("outputFormatSelect");
        const spokenLangSelect = document.getElementById("spokenLangSelect");
        const spokenPersonaSelect = document.getElementById("spokenPersonaSelect");
        const fileSent = stagedFile;
        const requestBody = { 
            prompt: text, 
            preprocess_option: preprocessOption,
            think: thinkEnabled,
            temperature: codingModeEnabled ? 0.0 : 1.0,
            model: selectedModel,
            use_notebook: notebookToggle ? notebookToggle.checked : false,
            notebook_id: (notebookSearchInput && notebookSearchInput.dataset.notebookId) ? notebookSearchInput.dataset.notebookId : null,
            output_format: outputFormatSelect ? outputFormatSelect.value : "paragraph",
            language: spokenLangSelect ? spokenLangSelect.value : "en",
            persona: spokenPersonaSelect ? spokenPersonaSelect.value : "natural"
        };

        if (fileSent && (selectedModel === "gemma-4-12b" || selectedModel === "gemma-4-e4b" || selectedModel === "glm-4-voice" || selectedModel === "qwen-3.6-35b-a3b")) {
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
        let placeholderHtml = `<div class="spinner-3d"><div class="ring ring-1"></div><div class="ring ring-2"></div><div class="ring ring-3"></div><div class="core"></div></div>`;
        if (requestBody.use_notebook) {
            placeholderHtml += `
                <div class="notebook-status" style="margin-top: 12px; font-size: 0.85rem; color: var(--text-secondary); text-align: center; font-weight: 500; display: flex; flex-direction: column; gap: 4px; align-items: center;">
                    <span><i class="fa-solid fa-book-open"></i> Querying NotebookLM...</span>
                    <span style="font-size: 0.75rem; opacity: 0.7; font-weight: normal;">(Grounding prompt against your sources)</span>
                </div>
            `;
        }
        const assistantMsgEl = appendMessage("assistant", placeholderHtml);
        const bubble = assistantMsgEl.querySelector(".message-bubble");

        const startTime = performance.now();
        let firstTokenTime = null;
        let generatedTokenCount = 0;
        const metaTimeEl = assistantMsgEl.querySelector(".meta-time");
        const msgTimestamp = metaTimeEl ? (metaTimeEl.getAttribute("data-time") || metaTimeEl.textContent) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const headerTpsBadge = document.getElementById("headerTpsBadge");
        const headerTpsVal = document.getElementById("headerTpsVal");

        isStreaming = true;
        activeQueryController = new AbortController();
        const cancelQueryBtn = document.getElementById("cancelQueryBtn");
        if (cancelQueryBtn) cancelQueryBtn.style.display = "inline-flex";

        updateModelStatus("loading", "Loading Model...");

        try {
            const response = await fetch("/api/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
                signal: activeQueryController.signal
            });

            if (!response.ok) {
                throw new Error(`Server returned status ${response.status}`);
            }

            // Read streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let accumulatedResponse = "";
            let accumulatedThinking = "";
            let buffer = "";

            let thinkingBlockEl = null;
            let thinkingContentEl = null;
            let responseContentEl = null;
            let renderScheduled = false;

            function scheduleRender() {
                if (renderScheduled) return;
                renderScheduled = true;
                requestAnimationFrame(() => {
                    renderScheduled = false;
                    if (requestBody.use_notebook) return;

                    const isAtBottom = (chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight) < 100;

                    if (accumulatedThinking) {
                        if (!thinkingBlockEl) {
                            thinkingBlockEl = document.createElement("details");
                            thinkingBlockEl.className = "thinking-block";
                            thinkingBlockEl.open = true;
                            thinkingBlockEl.innerHTML = `<summary><i class="fa-solid fa-brain"></i> Thinking Process</summary><div class="thinking-content"></div>`;
                            bubble.appendChild(thinkingBlockEl);
                            thinkingContentEl = thinkingBlockEl.querySelector(".thinking-content");
                        }
                        if (thinkingContentEl) {
                            thinkingContentEl.innerHTML = marked.parse(formatStreamingMarkdown(accumulatedThinking));
                        }
                    }

                    if (accumulatedResponse) {
                        if (!responseContentEl) {
                            responseContentEl = document.createElement("div");
                            responseContentEl.className = "response-content";
                            bubble.appendChild(responseContentEl);
                        }
                        if (responseContentEl) {
                            responseContentEl.innerHTML = marked.parse(formatStreamingMarkdown(accumulatedResponse));
                        }
                    }

                    if (isAtBottom) {
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                    }
                });
            }

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
                            if (parsed.status === "reasoning") {
                                updateModelStatus("ready", "Reasoning...");
                                const pingEl = bubble.querySelector(".reasoning-ping-status");
                                if (!pingEl && bubble.querySelector(".spinner-3d")) {
                                    bubble.insertAdjacentHTML("beforeend", `<div class="reasoning-ping-status" style="margin-top: 8px; font-size: 0.85rem; color: #818cf8; text-align: center; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 6px;"><i class="fa-solid fa-brain fa-pulse"></i> Model is thinking in background...</div>`);
                                }
                            } else if (parsed.token) {
                                updateModelStatus("ready", "Ready");
                                if (generatedTokenCount === 0 && !requestBody.use_notebook) {
                                    bubble.innerHTML = "";
                                }
                                generatedTokenCount++;

                                if (parsed.is_thinking) {
                                    accumulatedThinking += parsed.token;
                                } else {
                                    accumulatedResponse += parsed.token;

                                    // Real-Time Audio Streaming: Stream audio chunks as tokens generate
                                    const spokenStreamSelect = document.getElementById("spokenStreamSelect");
                                    if (spokenStreamSelect && spokenStreamSelect.value === "stream") {
                                        processIncomingTokenForAudioStream(parsed.token);
                                    }
                                }

                                if (!firstTokenTime) {
                                    firstTokenTime = performance.now();
                                } else {
                                    const pureGenSec = (performance.now() - firstTokenTime) / 1000;
                                    if (pureGenSec > 0.02 && generatedTokenCount > 1) {
                                        const currentTps = ((generatedTokenCount - 1) / pureGenSec).toFixed(1);
                                        if (metaTimeEl) {
                                            metaTimeEl.innerHTML = `${msgTimestamp} <span class="tps-badge" style="margin-left: 6px; display: inline-flex; align-items: center; gap: 3px; background: rgba(99, 102, 241, 0.18); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.35); padding: 1px 7px; border-radius: 10px; font-size: 0.72rem; font-weight: 600;"><i class="fa-solid fa-bolt" style="font-size: 0.65rem; color: #818cf8;"></i> ${currentTps} tok/s</span>`;
                                        }
                                        if (headerTpsBadge && headerTpsVal) {
                                            headerTpsBadge.style.display = "inline-flex";
                                            headerTpsVal.textContent = currentTps;
                                        }
                                    }
                                }
                                
                                if (!requestBody.use_notebook) {
                                    scheduleRender();
                                } else {
                                    // Update status text once tokens begin streaming
                                    const statusTextEl = bubble.querySelector(".notebook-status span");
                                    if (statusTextEl && !statusTextEl.innerHTML.includes("Synthesizing")) {
                                        statusTextEl.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Synthesizing response...`;
                                    }
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

            // Final render pass to ensure accurate completed markdown output
            if (!requestBody.use_notebook) {
                const isAtBottom = (chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight) < 100;
                if (thinkingContentEl && accumulatedThinking) {
                    thinkingContentEl.innerHTML = marked.parse(accumulatedThinking);
                }
                if (responseContentEl && accumulatedResponse) {
                    responseContentEl.innerHTML = marked.parse(accumulatedResponse);
                } else if (!accumulatedResponse && !accumulatedThinking) {
                    bubble.innerHTML = "<span style='color: var(--text-secondary); font-style: italic;'>No response generated.</span>";
                }
                if (isAtBottom) {
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
            }

            const pureGenSec = firstTokenTime ? (performance.now() - firstTokenTime) / 1000 : 0;
            const finalTps = (pureGenSec > 0.01 && generatedTokenCount > 1) 
                ? ((generatedTokenCount - 1) / pureGenSec).toFixed(1) 
                : (generatedTokenCount > 0 ? (generatedTokenCount / Math.max((performance.now() - startTime) / 1000, 0.1)).toFixed(1) : "0.0");
            
            if (metaTimeEl && generatedTokenCount > 0) {
                metaTimeEl.innerHTML = `${msgTimestamp} <span class="tps-badge" style="margin-left: 6px; display: inline-flex; align-items: center; gap: 3px; background: rgba(99, 102, 241, 0.18); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.35); padding: 1px 7px; border-radius: 10px; font-size: 0.72rem; font-weight: 600;"><i class="fa-solid fa-bolt" style="font-size: 0.65rem; color: #818cf8;"></i> ${finalTps} tok/s</span>`;
            }
            if (headerTpsBadge && headerTpsVal && generatedTokenCount > 0) {
                headerTpsBadge.style.display = "inline-flex";
                headerTpsVal.textContent = finalTps;
            }

            if (requestBody.use_notebook) {
                // Clear the spinner and display the completed status card with the option to show response
                bubble.innerHTML = `
                    <div class="notebook-completed-card" style="display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 12px; text-align: center; animation: fadeIn 0.4s ease-out;">
                        <div class="success-icon" style="font-size: 1.8rem; color: var(--accent-secondary);">
                            <i class="fa-solid fa-circle-check"></i>
                        </div>
                        <div style="font-weight: 500; font-size: 0.95rem; color: var(--text-primary);">Grounded response retrieved from NotebookLM!</div>
                        <button class="suggestion-pill explore-btn display-output-btn" style="margin-top: 8px; display: flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-eye"></i> Display Output
                        </button>
                    </div>
                `;

                const displayBtn = bubble.querySelector(".display-output-btn");
                if (displayBtn) {
                    displayBtn.addEventListener("click", () => {
                        const isAtBottom = (chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight) < 100;
                        bubble.innerHTML = accumulatedResponse ? marked.parse(accumulatedResponse) : "<span style='color: var(--text-secondary); font-style: italic;'>No response generated.</span>";
                        if (isAtBottom) {
                            chatContainer.scrollTop = chatContainer.scrollHeight;
                        }
                    });
                }
            }
            
            // Reload history to show new prompt
            loadHistory();

            // Real-Time Streaming Audio Finalize vs Sentence Fallback
            const spokenStreamSelect = document.getElementById("spokenStreamSelect");
            if (spokenStreamSelect && spokenStreamSelect.value === "stream") {
                finalizeIncomingTokenAudioStream();
            } else if (accumulatedResponse) {
                const textToSpeak = accumulatedResponse
                    .replace(/```[\s\S]*?```/g, " [code block] ")
                    .replace(/`([^`]+)`/g, "$1")
                    .replace(/\*\*([^*]+)\*\*/g, "$1")
                    .replace(/\*([^*]+)\*/g, "$1")
                    .replace(/#+\s*/g, "")
                    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
                    .replace(/[\n\r]+/g, " ")
                    .trim();
                if (textToSpeak) {
                    setTimeout(() => {
                        const targetLang = spokenLangSelect ? spokenLangSelect.value : "en-US";
                        const targetSpeed = spokenSpeedSelect ? parseFloat(spokenSpeedSelect.value) : 1.25;
                        speakResponseText(textToSpeak, targetLang, targetSpeed);
                    }, 400);
                }
            }

        } catch (error) {
            bubble.innerHTML = `<span style="color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Error: ${error.message}</span>`;
            console.error(error);
        } finally {
            isStreaming = false;
            updateModelStatus("ready", "Ready");
        }
    }

    function speakResponseText(text, lang, speed) {
        const targetLang = lang || (spokenLangSelect ? spokenLangSelect.value : "en-US");
        const targetSpeed = speed || (spokenSpeedSelect ? parseFloat(spokenSpeedSelect.value) : 1.25);
        playTTS(text, targetLang, targetSpeed);
    }

    function appendMessage(sender, text) {
        const msgEl = document.createElement("div");
        msgEl.className = `chat-message ${sender}`;
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        msgEl.innerHTML = `
            <div class="message-bubble">${text}</div>
            <div class="message-meta">
                <span>${sender === "user" ? "You" : "Gemma"}</span>
                <span class="meta-time" data-time="${timestamp}">${timestamp}</span>
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
                const date = new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const modelName = item.model || 'gemma-4-12b';
                let modelLabel = '26B';
                if (modelName === 'gemma-4-e4b') {
                    modelLabel = 'e4b';
                } else if (modelName === 'glm-4-voice') {
                    modelLabel = 'GLM Voice';
                } else if (modelName === 'qwen-3.6-35b-a3b') {
                    modelLabel = 'Qwen 35B';
                } else if (modelName === 'gemma-4-12b') {
                    modelLabel = '12B';
                } else if (modelName === 'gemma-4-12b-python') {
                    modelLabel = '12B (Py)';
                }
                
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
        const modelName = item.model || 'gemma-4-12b';
        if (modelName === 'gemma-4-e4b') {
            modalModel.textContent = 'Gemma 4 e4b';
        } else if (modelName === 'glm-4-voice') {
            modalModel.textContent = 'GLM-4-Voice';
        } else if (modelName === 'qwen-3.6-35b-a3b') {
            modalModel.textContent = 'Qwen 3.6 35B-A3B';
        } else if (modelName === 'gemma-4-12b') {
            modalModel.textContent = 'Gemma 4 12B';
        } else if (modelName === 'gemma-4-12b-python') {
            modalModel.textContent = 'Gemma 4 12b - Python trained';
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

    // ==========================================
    // Real-Time S2S Voice Client Integration
    // ==========================================
    const liveVoiceBtn = document.getElementById("liveVoiceBtn");
    const liveVoiceOverlay = document.getElementById("liveVoiceOverlay");
    const closeLiveVoiceBtn = document.getElementById("closeLiveVoiceBtn");
    const endLiveVoiceBtn = document.getElementById("endLiveVoiceBtn");
    const liveVoiceStatus = document.getElementById("liveVoiceStatus");
    const liveTranscriptBox = document.getElementById("liveTranscriptBox");

    let s2sSocket = null;
    let s2sRecognition = null;
    let s2sIsActive = false;

    if (liveVoiceBtn) {
        liveVoiceBtn.addEventListener("click", () => {
            startS2SSession();
        });
    }

    if (closeLiveVoiceBtn) {
        closeLiveVoiceBtn.addEventListener("click", () => stopS2SSession());
    }

    if (endLiveVoiceBtn) {
        endLiveVoiceBtn.addEventListener("click", () => stopS2SSession());
    }

    // (autoReadToggle already declared at top of DOMContentLoaded)
    const spokenParamsWrapper = document.getElementById("spokenParamsWrapper");
    const spokenLangSelect = document.getElementById("spokenLangSelect");
    const spokenSpeedSelect = document.getElementById("spokenSpeedSelect");
    const spokenStreamSelect = document.getElementById("spokenStreamSelect");
    const s2sModeSelect = document.getElementById("s2sModeSelect");
    const s2sLangSelect = document.getElementById("s2sLangSelect");

    const spokenVoiceEngineSelect = document.getElementById("spokenVoiceEngineSelect");
    if (spokenVoiceEngineSelect && modelSelect) {
        spokenVoiceEngineSelect.addEventListener("change", () => {
            prepareSelectedModel(modelSelect.value);
        });
    }

    if (spokenParamsWrapper) {
        spokenParamsWrapper.style.display = "flex";
        spokenParamsWrapper.style.opacity = "1";
        spokenParamsWrapper.style.pointerEvents = "auto";
    }

    async function populateAudioOutputDevices() {
        const select = document.getElementById("audioOutputSelect");
        if (!select || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;

        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioOutputs = devices.filter(d => d.kind === "audiooutput");

            if (audioOutputs.length > 0) {
                const currentVal = select.value;
                select.innerHTML = "";
                audioOutputs.forEach(device => {
                    const option = document.createElement("option");
                    option.value = device.deviceId;
                    let label = device.label || (device.deviceId === "default" ? "Default / Bluetooth Earphones" : `Audio Device (${device.deviceId.slice(0, 8)})`);
                    option.textContent = label;
                    select.appendChild(option);
                });
                if (currentVal && Array.from(select.options).some(o => o.value === currentVal)) {
                    select.value = currentVal;
                }
            }
        } catch (err) {
            console.warn("Could not enumerate audio output devices:", err);
        }
    }

    if (navigator.mediaDevices) {
        if (navigator.mediaDevices.ondevicechange !== undefined) {
            navigator.mediaDevices.ondevicechange = populateAudioOutputDevices;
        }
        populateAudioOutputDevices();
    }

    if (s2sModeSelect) {
        s2sModeSelect.addEventListener("change", () => {
            if (s2sModeSelect.value === "continuous") {
                if (s2sIsActive) startS2SMicListener();
            } else {
                if (s2sRecognition) { try { s2sRecognition.stop(); } catch(e){} s2sRecognition = null; }
                stopS2SVadListener();
            }
        });
    }

    if (s2sLangSelect) {
        s2sLangSelect.addEventListener("change", () => {
            if (s2sSocket && s2sSocket.readyState === WebSocket.OPEN) {
                s2sSocket.send(JSON.stringify({
                    type: "config",
                    model: modelSelect ? modelSelect.value : "gemma-4-26b",
                    think: thinkToggle ? thinkToggle.checked : false,
                    preprocess: document.querySelector('input[name="preprocess"]:checked')?.value || "none",
                    language: s2sLangSelect.value
                }));
            }
        });
    }

    function startS2SSession() {
        if (s2sIsActive) return;
        s2sIsActive = true;
        
        liveVoiceOverlay.classList.add("active");
        liveVoiceStatus.className = "live-status-badge connecting";
        liveVoiceStatus.textContent = "Connecting to S2S Daemon (Port 8090)...";
        liveTranscriptBox.innerHTML = `<p class="transcript-placeholder">Press and hold button below to speak...</p>`;

        const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsHost = window.location.hostname || "localhost";
        const wsUrl = `${wsProtocol}//${wsHost}:8090/ws/s2s`;

        try {
            s2sSocket = new WebSocket(wsUrl);

            s2sSocket.onopen = () => {
                liveVoiceStatus.className = "live-status-badge connected";
                liveVoiceStatus.textContent = "● Live S2S Voice Active (0.0s latency)";
                
                // Send session configuration
                s2sSocket.send(JSON.stringify({
                    type: "config",
                    model: modelSelect ? modelSelect.value : "gemma-4-26b",
                    think: thinkToggle ? thinkToggle.checked : false,
                    preprocess: document.querySelector('input[name="preprocess"]:checked')?.value || "none",
                    language: s2sLangSelect ? s2sLangSelect.value : "en-US"
                }));

                // Only start continuous listener if mode is 'continuous'
                if (s2sModeSelect && s2sModeSelect.value === "continuous") {
                    startS2SMicListener();
                }
            };

            s2sSocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === "status") {
                        liveVoiceOverlay.classList.add("speaking");
                    } else if (data.type === "response") {
                        liveVoiceOverlay.classList.remove("speaking");
                        
                        // Append to live transcript box
                        const responseEl = document.createElement("div");
                        responseEl.style.marginTop = "8px";
                        responseEl.style.color = "#a78bfa";
                        responseEl.style.fontWeight = "500";
                        responseEl.innerHTML = `<strong>Gemma:</strong> ${escapeHtml(data.text)}`;
                        liveTranscriptBox.appendChild(responseEl);
                        liveTranscriptBox.scrollTop = liveTranscriptBox.scrollHeight;

                        // Speak response audio using playTTS (gTTS server fallback + SpeechSynthesis)
                        const targetLang = s2sLangSelect ? s2sLangSelect.value : "en-US";
                        playTTS(data.text, targetLang);
                    }
                } catch (e) {
                    console.error("Error parsing S2S message:", e);
                }
            };

            s2sSocket.onerror = (err) => {
                console.error("S2S WebSocket Error:", err);
                liveVoiceStatus.className = "live-status-badge connecting";
                liveVoiceStatus.textContent = "S2S Daemon offline on port 8090";
            };

            s2sSocket.onclose = () => {
                if (s2sIsActive) {
                    liveVoiceStatus.className = "live-status-badge connecting";
                    liveVoiceStatus.textContent = "Session closed";
                }
            };
        } catch (e) {
            console.error("Failed to launch S2S WebSocket:", e);
        }
    }

    // --- Automated VAD (Voice Activity Detection) Fallback for Live Voice ---
    let s2sVadStream = null;
    let s2sVadAudioCtx = null;
    let s2sVadProcessor = null;
    let s2sVadAnalyser = null;
    let s2sVadSilenceTimer = null;
    let s2sVadIsSpeaking = false;
    let s2sVadChunks = [];
    let s2sVadLength = 0;

    function stopS2SVadListener() {
        if (s2sVadSilenceTimer) clearTimeout(s2sVadSilenceTimer);
        s2sVadSilenceTimer = null;
        s2sVadIsSpeaking = false;
        s2sVadChunks = [];
        s2sVadLength = 0;
        if (s2sVadProcessor) { try { s2sVadProcessor.disconnect(); } catch(e){} s2sVadProcessor = null; }
        if (s2sVadAnalyser) { try { s2sVadAnalyser.disconnect(); } catch(e){} s2sVadAnalyser = null; }
        if (s2sVadAudioCtx) { try { s2sVadAudioCtx.close(); } catch(e){} s2sVadAudioCtx = null; }
        if (s2sVadStream) { try { s2sVadStream.getTracks().forEach(t => t.stop()); } catch(e){} s2sVadStream = null; }
    }

    function buildWavFromChunks(chunks, totalSamples, rate) {
        if (!chunks || totalSamples === 0) return null;
        const result = new Float32Array(totalSamples);
        let offset = 0;
        for (let i = 0; i < chunks.length; i++) {
            result.set(chunks[i], offset);
            offset += chunks[i].length;
        }

        const buffer = new ArrayBuffer(44 + totalSamples * 2);
        const view = new DataView(buffer);
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + totalSamples * 2, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, rate, true);
        view.setUint32(28, rate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(view, 36, 'data');
        view.setUint32(40, totalSamples * 2, true);
        floatTo16BitPCM(view, 44, result);

        return new Blob([view], { type: 'audio/wav' });
    }

    async function startS2SVadListener() {
        stopS2SVadListener();
        try {
            s2sVadStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            s2sVadAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (s2sVadAudioCtx.state === "suspended") await s2sVadAudioCtx.resume();
            const rate = s2sVadAudioCtx.sampleRate;
            const source = s2sVadAudioCtx.createMediaStreamSource(s2sVadStream);

            s2sVadAnalyser = s2sVadAudioCtx.createAnalyser();
            s2sVadAnalyser.fftSize = 512;
            source.connect(s2sVadAnalyser);

            s2sVadProcessor = s2sVadAudioCtx.createScriptProcessor(2048, 1, 1);
            const dataArray = new Uint8Array(s2sVadAnalyser.frequencyBinCount);

            s2sVadProcessor.onaudioprocess = (e) => {
                if (!s2sIsActive) return;

                const input = e.inputBuffer.getChannelData(0);
                s2sVadAnalyser.getByteFrequencyData(dataArray);

                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                const avgVolume = sum / dataArray.length;

                if (avgVolume > 12) {
                    if (!s2sVadIsSpeaking) {
                        s2sVadIsSpeaking = true;
                        s2sVadChunks = [];
                        s2sVadLength = 0;
                        liveVoiceOverlay.classList.add("speaking");
                        if ('speechSynthesis' in window) {
                            window.speechSynthesis.cancel();
                        }
                    }
                    if (s2sVadSilenceTimer) {
                        clearTimeout(s2sVadSilenceTimer);
                        s2sVadSilenceTimer = null;
                    }
                }

                if (s2sVadIsSpeaking) {
                    s2sVadChunks.push(new Float32Array(input));
                    s2sVadLength += input.length;

                    if (avgVolume <= 12 && !s2sVadSilenceTimer) {
                        s2sVadSilenceTimer = setTimeout(async () => {
                            s2sVadIsSpeaking = false;
                            liveVoiceOverlay.classList.remove("speaking");

                            if (s2sVadLength > rate * 0.9) {
                                const currentChunks = s2sVadChunks;
                                const currentLength = s2sVadLength;
                                s2sVadChunks = [];
                                s2sVadLength = 0;

                                const wavBlob = buildWavFromChunks(currentChunks, currentLength, rate);
                                if (wavBlob && wavBlob.size > 1000) {
                                    const formData = new FormData();
                                    formData.append("audio", wavBlob, "vad_voice.wav");

                                    try {
                                        const res = await fetch("/api/transcribe", { method: "POST", body: formData });
                                        if (res.ok) {
                                            const data = await res.json();
                                            if (data.text && data.text.trim()) {
                                                sendVoiceQuery(data.text.trim());
                                            }
                                        }
                                    } catch (err) {
                                        console.error("VAD transcription error:", err);
                                    }
                                }
                            } else {
                                s2sVadChunks = [];
                                s2sVadLength = 0;
                            }
                        }, 1300);
                    }
                }
            };

            s2sVadAnalyser.connect(s2sVadProcessor);
            s2sVadProcessor.connect(s2sVadAudioCtx.destination);

        } catch (err) {
            console.error("Failed to start VAD listener:", err);
        }
    }

    let lastClientQueryText = "";
    let lastClientQueryTime = 0;

    function sendVoiceQuery(text) {
        const cleaned = text.trim();
        if (!cleaned) return;

        // Ignore single incomplete words under 4 characters (e.g. "how", "what", "um")
        const words = cleaned.split(/\s+/);
        if (words.length === 1 && cleaned.length < 4) {
            console.log("Suppressing short voice fragment:", cleaned);
            return;
        }

        const now = Date.now();
        if (cleaned.toLowerCase() === lastClientQueryText.toLowerCase() && (now - lastClientQueryTime) < 3000) {
            console.log("Suppressing duplicate client voice query:", cleaned);
            return;
        }

        lastClientQueryText = cleaned;
        lastClientQueryTime = now;

        // Remove placeholder text when user speaks
        const placeholders = liveTranscriptBox.querySelectorAll(".transcript-placeholder");
        placeholders.forEach(p => p.remove());

        const userEl = document.createElement("div");
        userEl.style.marginTop = "8px";
        userEl.style.color = "#38bdf8";
        userEl.innerHTML = `<strong>You:</strong> ${escapeHtml(cleaned)}`;
        liveTranscriptBox.appendChild(userEl);
        liveTranscriptBox.scrollTop = liveTranscriptBox.scrollHeight;

        if (s2sSocket && s2sSocket.readyState === WebSocket.OPEN) {
            const s2sThinkSelect = document.getElementById("s2sThinkSelect");
            const s2sLengthSelect = document.getElementById("s2sLengthSelect");
            const s2sStreamSelect = document.getElementById("s2sStreamSelect");
            const s2sFormatSelect = document.getElementById("s2sFormatSelect");
            const s2sSpeedSelect = document.getElementById("s2sSpeedSelect");
            const s2sPersonaSelect = document.getElementById("s2sPersonaSelect");

            const isThinkingOn = s2sThinkSelect ? (s2sThinkSelect.value === "on") : false;
            const answerLength = s2sLengthSelect ? s2sLengthSelect.value : "concise";
            const s2sIsStreaming = s2sStreamSelect ? (s2sStreamSelect.value === "on") : true;
            const outputFormat = s2sFormatSelect ? s2sFormatSelect.value : "plain";
            const voiceSpeed = s2sSpeedSelect ? parseFloat(s2sSpeedSelect.value) : 1.0;
            const voicePersona = s2sPersonaSelect ? s2sPersonaSelect.value : "natural";

            s2sSocket.send(JSON.stringify({
                type: "transcription_query",
                text: cleaned,
                model: modelSelect ? modelSelect.value : "gemma-4-26b",
                think: isThinkingOn,
                length: answerLength,
                stream: s2sIsStreaming,
                format: outputFormat,
                speed: voiceSpeed,
                persona: voicePersona,
                language: s2sLangSelect ? s2sLangSelect.value : "en-US"
            }));
        }
    }

    // Real-Time Audio Streaming Queue Engine
    let audioStreamQueue = [];
    let isAudioStreamPlaying = false;
    let sentenceBuffer = "";

    function resetAudioStreamQueue() {
        audioStreamQueue = [];
        isAudioStreamPlaying = false;
        sentenceBuffer = "";
    }

    function processIncomingTokenForAudioStream(token) {
        sentenceBuffer += token;
        const match = sentenceBuffer.match(/^([\s\S]+?[\.\!\?\;\n]+)([\s\S]*)$/);
        if (match) {
            const completedClause = match[1].trim();
            sentenceBuffer = match[2];
            if (completedClause.length > 3) {
                enqueueAudioStreamChunk(completedClause);
            }
        }
    }

    function finalizeIncomingTokenAudioStream() {
        if (sentenceBuffer.trim().length > 0) {
            enqueueAudioStreamChunk(sentenceBuffer.trim());
            sentenceBuffer = "";
        }
    }

    function enqueueAudioStreamChunk(textChunk) {
        audioStreamQueue.push(textChunk);
        if (!isAudioStreamPlaying) {
            playNextAudioStreamChunk();
        }
    }

    async function playNextAudioStreamChunk() {
        if (audioStreamQueue.length === 0) {
            isAudioStreamPlaying = false;
            return;
        }

        isAudioStreamPlaying = true;
        const textToSpeak = audioStreamQueue.shift();

        const cleanText = textToSpeak
            .replace(/```[\s\S]*?```/g, " [code block] ")
            .replace(/`([^`]+)`/g, "$1")
            .replace(/\*\*([^*]+)\*\*/g, "$1")
            .replace(/\*([^*]+)\*/g, "$1")
            .replace(/#+\s*/g, "")
            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
            .replace(/[\n\r]+/g, " ")
            .trim();

        if (!cleanText) {
            playNextAudioStreamChunk();
            return;
        }

        const spokenPersonaSelect = document.getElementById("spokenPersonaSelect");
        const _spokenSpeedSelectLocal = document.getElementById("spokenSpeedSelect");
        const spokenVoiceEngineSelect = document.getElementById("spokenVoiceEngineSelect");
        const spokenAccentSelect = document.getElementById("spokenAccentSelect");

        const targetLang = spokenLangSelect ? spokenLangSelect.value : "en";
        const targetAccent = spokenAccentSelect ? spokenAccentSelect.value : "us";
        const targetSpeed = _spokenSpeedSelectLocal ? parseFloat(_spokenSpeedSelectLocal.value) : 1.25;
        const targetEngine = spokenVoiceEngineSelect ? spokenVoiceEngineSelect.value : "e4b";
        const targetPersona = spokenPersonaSelect ? spokenPersonaSelect.value : "natural";

        try {
            const res = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: cleanText, lang: targetLang, accent: targetAccent, engine: targetEngine, persona: targetPersona })
            });

            if (res.ok) {
                const blob = await res.blob();
                const audioUrl = URL.createObjectURL(blob);
                currentAudioPlayback = new Audio(audioUrl);
                currentAudioPlayback.playbackRate = targetSpeed;

                const audioOutputSelect = document.getElementById("audioOutputSelect");
                if (audioOutputSelect && audioOutputSelect.value && audioOutputSelect.value !== "default" && typeof currentAudioPlayback.setSinkId === "function") {
                    try { await currentAudioPlayback.setSinkId(audioOutputSelect.value); } catch(e){}
                }

                currentAudioPlayback.onended = () => {
                    playNextAudioStreamChunk();
                };
                currentAudioPlayback.onerror = () => {
                    playNextAudioStreamChunk();
                };
                await currentAudioPlayback.play();
                return;
            }
        } catch (err) {
            console.warn("Chunk playback error, continuing stream:", err);
        }

        playNextAudioStreamChunk();
    }

    let currentAudioPlayback = null;

    async function playTTS(text, lang, speed, engine, persona, accent) {
        if (!text || !text.trim()) return;

        const spokenPersonaSelect = document.getElementById("spokenPersonaSelect");
        const _spokenSpeedSelectLocal = document.getElementById("spokenSpeedSelect");
        const spokenVoiceEngineSelect = document.getElementById("spokenVoiceEngineSelect");
        const spokenAccentSelect = document.getElementById("spokenAccentSelect");

        const targetLang = lang || (spokenLangSelect ? spokenLangSelect.value : "en");
        const targetAccent = accent || (spokenAccentSelect ? spokenAccentSelect.value : "us");
        const playbackRateVal = speed || (_spokenSpeedSelectLocal ? parseFloat(_spokenSpeedSelectLocal.value) : 1.25);
        const targetEngine = engine || (spokenVoiceEngineSelect ? spokenVoiceEngineSelect.value : "e4b");
        const targetPersona = persona || (spokenPersonaSelect ? spokenPersonaSelect.value : "natural");

        // Cancel existing audio
        if (currentAudioPlayback) {
            try { currentAudioPlayback.pause(); } catch(e){}
            currentAudioPlayback = null;
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        // Show cancel button while audio is reading aloud
        const cancelQueryBtn = document.getElementById("cancelQueryBtn");
        if (cancelQueryBtn) cancelQueryBtn.style.display = "inline-flex";

        // 1. Fetch high-quality server-side gTTS audio (reliable on all systems/OS)
        try {
            const res = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: text, lang: targetLang, accent: targetAccent, engine: targetEngine, persona: targetPersona })
            });

            if (res.ok) {
                const blob = await res.blob();
                const audioUrl = URL.createObjectURL(blob);
                currentAudioPlayback = new Audio(audioUrl);
                currentAudioPlayback.playbackRate = playbackRateVal;

                // Route audio output to selected device (e.g. Bluetooth Earphones / Headphones)
                const audioOutputSelect = document.getElementById("audioOutputSelect");
                if (audioOutputSelect && audioOutputSelect.value && audioOutputSelect.value !== "default" && typeof currentAudioPlayback.setSinkId === "function") {
                    try {
                        await currentAudioPlayback.setSinkId(audioOutputSelect.value);
                    } catch (e) {
                        console.warn("Could not route audio to Bluetooth device sink ID:", e);
                    }
                }

                currentAudioPlayback.onended = () => {
                    if (cancelQueryBtn) cancelQueryBtn.style.display = "none";
                    updateReadAloudState(false);
                };
                await currentAudioPlayback.play();
                return;
            }
        } catch (err) {
            console.warn("Server-side gTTS playback error, falling back to browser synthesis:", err);
        }

        // 2. Fallback to Browser Speech Synthesis
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = targetLang;
            utterance.rate = playbackRateVal;

            const voices = window.speechSynthesis.getVoices();
            const matchingVoice = voices.find(v => 
                v.lang === targetLang || 
                v.lang.replace('_', '-') === targetLang || 
                v.lang.startsWith((targetLang || "en").split('-')[0])
            );
            if (matchingVoice) utterance.voice = matchingVoice;

            utterance.onend = () => {
                if (cancelQueryBtn) cancelQueryBtn.style.display = "none";
                updateReadAloudState(false);
            };

            window.speechSynthesis.speak(utterance);
        }
    }

    // --- Right-Click Context Menu for Highlighted Text ---
    const textContextMenu = document.getElementById("textContextMenu");
    const contextReadSelectedBtn = document.getElementById("contextReadSelectedBtn");
    const contextCopyBtn = document.getElementById("contextCopyBtn");
    let highlightedTextForContext = "";

    document.addEventListener("contextmenu", (e) => {
        const selectedText = window.getSelection().toString().trim();
        if (selectedText && textContextMenu) {
            highlightedTextForContext = selectedText;
            e.preventDefault();
            textContextMenu.style.display = "block";
            textContextMenu.style.left = `${Math.min(e.clientX, window.innerWidth - 220)}px`;
            textContextMenu.style.top = `${Math.min(e.clientY, window.innerHeight - 100)}px`;
        } else if (textContextMenu) {
            textContextMenu.style.display = "none";
        }
    });

    if (textContextMenu) {
        textContextMenu.addEventListener("mousedown", (e) => {
            // Prevent mouse click from collapsing or changing the text selection
            e.preventDefault();
        });
    }

    document.addEventListener("click", (e) => {
        if (textContextMenu && !textContextMenu.contains(e.target)) {
            textContextMenu.style.display = "none";
        }
    });

    if (contextReadSelectedBtn) {
        contextReadSelectedBtn.addEventListener("click", () => {
            const selectedText = highlightedTextForContext || window.getSelection().toString().trim();
            if (selectedText) {
                const targetLang = spokenLangSelect ? spokenLangSelect.value : "en-US";
                const targetSpeed = spokenSpeedSelect ? parseFloat(spokenSpeedSelect.value) : 1.25;
                const targetEngine = spokenVoiceEngineSelect ? spokenVoiceEngineSelect.value : "e4b";
                playTTS(selectedText, targetLang, targetSpeed, targetEngine);
            }
            if (textContextMenu) textContextMenu.style.display = "none";
        });
    }

    if (contextCopyBtn) {
        contextCopyBtn.addEventListener("click", () => {
            const selectedText = highlightedTextForContext || window.getSelection().toString().trim();
            if (selectedText) {
                navigator.clipboard.writeText(selectedText);
            }
            if (textContextMenu) textContextMenu.style.display = "none";
        });
    }

    let lastProcessedResultIndex = -1;

    function startS2SMicListener() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            startS2SVadListener();
            return;
        }

        try {
            s2sRecognition = new SpeechRecognition();
            s2sRecognition.continuous = true;
            s2sRecognition.interimResults = true;
            lastProcessedResultIndex = -1;

            s2sRecognition.onresult = (event) => {
                let interimTranscript = "";
                let newFinalTranscript = "";

                const startIdx = Math.max(event.resultIndex, lastProcessedResultIndex + 1);
                for (let i = startIdx; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        newFinalTranscript += event.results[i][0].transcript;
                        lastProcessedResultIndex = i;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                if (interimTranscript) {
                    liveVoiceOverlay.classList.add("speaking");
                    if (currentAudioPlayback) { try { currentAudioPlayback.pause(); } catch(e){} }
                    if ('speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                    }
                }

                if (newFinalTranscript.trim()) {
                    liveVoiceOverlay.classList.remove("speaking");
                    sendVoiceQuery(newFinalTranscript.trim());
                }
            };

            s2sRecognition.onerror = (event) => {
                console.warn("S2S SpeechRecognition error:", event.error);
                if (event.error === "not-allowed" || event.error === "service-not-allowed" || event.error === "network") {
                    // Automatically fallback to VAD listener if native Speech API fails
                    if (s2sIsActive) {
                        if (s2sRecognition) {
                            try { s2sRecognition.stop(); } catch(e){}
                            s2sRecognition = null;
                        }
                        startS2SVadListener();
                    }
                }
            };

            s2sRecognition.onend = () => {
                if (s2sIsActive && s2sRecognition) {
                    try { s2sRecognition.start(); } catch (e) {}
                }
            };

            s2sRecognition.start();
        } catch (e) {
            console.error("Failed to start speech recognition, starting VAD listener fallback:", e);
            startS2SVadListener();
        }
    }

    // --- S2S Manual Press-To-Speak Handler ---
    const s2sMicTalkBtn = document.getElementById("s2sMicTalkBtn");
    let s2sIsTalkRecording = false;

    if (s2sMicTalkBtn) {
        const startS2STalk = async () => {
            if (s2sIsTalkRecording) return;
            s2sIsTalkRecording = true;
            s2sMicTalkBtn.classList.add("recording");
            s2sMicTalkBtn.innerHTML = `<i class="fa-solid fa-square"></i> Release to Send`;
            liveVoiceOverlay.classList.add("speaking");
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            if (s2sRecognition) {
                try { s2sRecognition.stop(); } catch(e){}
            }
            await startAudioRecording();
        };

        const stopS2STalk = async () => {
            if (!s2sIsTalkRecording) return;
            s2sIsTalkRecording = false;
            s2sMicTalkBtn.classList.remove("recording");
            s2sMicTalkBtn.innerHTML = `<i class="fa-solid fa-microphone"></i> Press to Speak`;
            liveVoiceOverlay.classList.remove("speaking");

            const blob = buildWavBlob();
            disconnectAudioNodes();
            
            if (s2sIsActive && s2sRecognition && s2sModeSelect && s2sModeSelect.value === "continuous") {
                try { s2sRecognition.start(); } catch(e){}
            }

            if (!blob || blob.size < 1000) {
                return;
            }

            const formData = new FormData();
            formData.append("audio", blob, "voice.wav");

            try {
                const pendingId = "pending_" + Date.now();
                const pendingEl = document.createElement("p");
                pendingEl.id = pendingId;
                pendingEl.className = "transcript-placeholder";
                pendingEl.textContent = "Transcribing voice...";
                liveTranscriptBox.appendChild(pendingEl);
                liveTranscriptBox.scrollTop = liveTranscriptBox.scrollHeight;

                const res = await fetch("/api/transcribe", { method: "POST", body: formData });
                const elToRem = document.getElementById(pendingId);
                if (elToRem) elToRem.remove();

                if (res.ok) {
                    const data = await res.json();
                    if (data.text && data.text.trim()) {
                        sendVoiceQuery(data.text.trim());
                    } else {
                        const errEl = document.createElement("div");
                        errEl.style.marginTop = "4px";
                        errEl.style.color = "#f87171";
                        errEl.style.fontSize = "0.85rem";
                        errEl.textContent = data.error || "Speech unintelligible. Please try speaking again.";
                        liveTranscriptBox.appendChild(errEl);
                    }
                }
            } catch (err) {
                console.error("Error transcribing S2S talk:", err);
            }
        };

        let isPressingTalk = false;
        s2sMicTalkBtn.addEventListener("mousedown", (e) => {
            e.preventDefault();
            isPressingTalk = true;
            startS2STalk();
        });
        s2sMicTalkBtn.addEventListener("touchstart", (e) => {
            e.preventDefault();
            isPressingTalk = true;
            startS2STalk();
        });
        window.addEventListener("mouseup", () => {
            if (isPressingTalk) {
                isPressingTalk = false;
                stopS2STalk();
            }
        });
        s2sMicTalkBtn.addEventListener("touchend", (e) => {
            e.preventDefault();
            if (isPressingTalk) {
                isPressingTalk = false;
                stopS2STalk();
            }
        });
    }

    function stopS2SSession() {
        s2sIsActive = false;
        liveVoiceOverlay.classList.remove("active", "speaking");

        stopS2SVadListener();

        if (s2sRecognition) {
            try { s2sRecognition.stop(); } catch (e) {}
            s2sRecognition = null;
        }

        if (s2sSocket) {
            try { s2sSocket.close(); } catch (e) {}
            s2sSocket = null;
        }

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }

    let activeQueryController = null;

    function cancelVoiceAndSpeech() {
        console.log("Cancelling voice input, generation, and speech playback...");

        // 1. Abort active LLM query stream
        if (activeQueryController) {
            try { activeQueryController.abort(); } catch(e){}
            activeQueryController = null;
        }

        // 2. CRITICAL: Always reset isStreaming so send button is never permanently locked
        isStreaming = false;

        // 3. Pause and reset any HTML5 Audio player (gTTS server audio)
        if (currentAudioPlayback) {
            try {
                currentAudioPlayback.pause();
                currentAudioPlayback.currentTime = 0;
            } catch(e){}
            currentAudioPlayback = null;
        }

        // 4. Stop Browser SpeechSynthesis
        if ('speechSynthesis' in window) {
            try { window.speechSynthesis.cancel(); } catch(e){}
        }

        // 5. Stop microphone voice input & STT
        stopVoiceInput();

        // 6. Stop S2S voice session
        stopS2SSession();

        // 7. Reset UI states
        const cancelBtn = document.getElementById("cancelQueryBtn");
        if (cancelBtn) cancelBtn.style.display = "none";
        
        updateModelStatus("ready", "Ready");
        updateReadAloudState(false);
    }

    const headerCancelBtn = document.getElementById("headerCancelBtn");
    if (headerCancelBtn) {
        headerCancelBtn.addEventListener("click", cancelVoiceAndSpeech);
    }

    const cancelQueryBtn = document.getElementById("cancelQueryBtn");
    if (cancelQueryBtn) {
        cancelQueryBtn.addEventListener("click", cancelVoiceAndSpeech);
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});
