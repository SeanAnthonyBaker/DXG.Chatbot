#!/usr/bin/env bash

set -e

echo "=== Starting Ollama & Gemma 4 (26B) Setup ==="

# 1. Install Ollama if not present
if ! command -v ollama &> /dev/null; then
    echo "[1/3] Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
else
    echo "[1/3] Ollama is already installed."
fi

# 2. Ensure Ollama service is active
echo "[2/3] Verifying Ollama service status..."
sudo systemctl daemon-reload
sudo systemctl enable --now ollama

# 3. Pull Gemma 4 26B model
echo "[3/3] Pulling Gemma 4 (26B MoE) model. This may take several minutes depending on your internet connection..."
ollama pull gemma4:26b

echo "=== Ollama & Gemma 4 Setup Completed! ==="
