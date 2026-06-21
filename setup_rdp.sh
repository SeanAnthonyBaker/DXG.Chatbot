#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "=== Starting xrdp Setup for ARM64 Ubuntu 24.04 ==="

# 1. Install xrdp and xorgxrdp
echo "[1/4] Installing xrdp and xorgxrdp packages..."
sudo apt update
sudo apt install -y xrdp xorgxrdp

# 2. Enable and start xrdp service
echo "[2/4] Starting and enabling xrdp service..."
sudo systemctl enable --now xrdp

# 3. Create Polkit rules to prevent the "color managed device" password prompt
echo "[3/4] Creating Polkit rules for color management..."
sudo mkdir -p /etc/polkit-1/rules.d
cat << 'EOF' | sudo tee /etc/polkit-1/rules.d/45-allow-colord.rules > /dev/null
polkit.addRule(function(action, subject) {
 if ((action.id == "org.freedesktop.color-manager.create-device" ||
      action.id == "org.freedesktop.color-manager.create-profile" ||
      action.id == "org.freedesktop.color-manager.delete-device" ||
      action.id == "org.freedesktop.color-manager.delete-profile" ||
      action.id == "org.freedesktop.color-manager.modify-device" ||
      action.id == "org.freedesktop.color-manager.modify-profile") &&
     subject.isInGroup("users")) {
  return polkit.Result.YES;
 }
});
EOF

# 4. Restart xrdp to apply settings
echo "[4/4] Restarting xrdp service..."
sudo systemctl restart xrdp

echo "=== Setup Completed Successfully! ==="
echo ""
echo "To connect to this device:"
echo "1. IMPORTANT: Make sure you log out of the physical Ubuntu desktop before connecting via RDP. (Linux does not support logging into the same account concurrently on the physical screen and remotely)."
echo "2. Use standard Windows Remote Desktop (mstsc) or Remmina."
echo "3. Connect to one of these IP addresses:"
ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' || echo "No external IP found"
echo ""
