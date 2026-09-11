#!/bin/bash
# Updates config.json in cc-economic-publication local dir when tunnel URL changes
LOCAL_DIR="/home/azureuser/council-work/cc-economic-publication"

# Wait up to 30s for tunnel URL (metrics port 20242 for this tunnel)
for i in $(seq 1 30); do
    TUNNEL_URL=$(curl -s http://127.0.0.1:20242/metrics 2>/dev/null | grep -o "https://[a-z-]*\.trycloudflare\.com" | head -1)
    if [ -n "$TUNNEL_URL" ]; then break; fi
    sleep 1
done
if [ -z "$TUNNEL_URL" ]; then echo "ERROR: Could not get tunnel URL after 30s"; exit 1; fi
echo "Tunnel URL: $TUNNEL_URL"

CONFIG="{\"publicUrl\": \"${TUNNEL_URL}\"}"
echo "$CONFIG" > "${LOCAL_DIR}/config.json"
echo "config.json updated: $CONFIG"
