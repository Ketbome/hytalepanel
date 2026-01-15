#!/bin/bash

cd "$SERVER_HOME"

# Generate machine-id if not exists (needed for encrypted credential storage)
if [ ! -f /etc/machine-id ]; then
    cat /proc/sys/kernel/random/uuid | tr -d '-' > /etc/machine-id
fi

# Also create a persistent machine-id in server folder
if [ ! -f "$SERVER_HOME/.machine-id" ]; then
    cat /etc/machine-id > "$SERVER_HOME/.machine-id"
else
    cat "$SERVER_HOME/.machine-id" > /etc/machine-id
fi

# Fix permissions on mounted volumes (runs as root)
chown -R hytale:hytale "$SERVER_HOME"

DOWNLOAD_FLAG="$SERVER_HOME/.download_attempted"

# Check if files exist
if [ ! -f "HytaleServer.jar" ] || [ ! -f "Assets.zip" ]; then
    
    # Only attempt download once
    if [ ! -f "$DOWNLOAD_FLAG" ] && [ "$AUTO_DOWNLOAD" = "true" ]; then
        touch "$DOWNLOAD_FLAG"
        echo "[HYTALE] Server files not found. Attempting download..."
        
        if command -v hytale-downloader &> /dev/null; then
            hytale-downloader --download-path /tmp/hytale-game.zip 2>&1 || true
            
            if [ -f "/tmp/hytale-game.zip" ]; then
                echo "[HYTALE] Extracting..."
                unzip -o /tmp/hytale-game.zip -d /tmp/hytale-extract 2>/dev/null || true
                find /tmp/hytale-extract -name "HytaleServer.jar" -exec cp {} "$SERVER_HOME/" \; 2>/dev/null || true
                find /tmp/hytale-extract -name "Assets.zip" -exec cp {} "$SERVER_HOME/" \; 2>/dev/null || true
                rm -rf /tmp/hytale-game.zip /tmp/hytale-extract
                rm -f "$DOWNLOAD_FLAG"
                echo "[HYTALE] Download complete!"
            else
                echo "[HYTALE] Download failed (authentication required)."
            fi
        fi
    fi
fi

# If still missing, wait silently
if [ ! -f "HytaleServer.jar" ] || [ ! -f "Assets.zip" ]; then
    echo "[HYTALE] Waiting for files..."
    
    while true; do
        sleep 10
        if [ -f "HytaleServer.jar" ] && [ -f "Assets.zip" ]; then
            echo "[HYTALE] Files detected!"
            rm -f "$DOWNLOAD_FLAG"
            break
        fi
    done
fi

echo "[HYTALE] Starting server (RAM: ${JAVA_XMS}-${JAVA_XMX}, Port: ${BIND_PORT}/udp)"

# JVM flags
JAVA_FLAGS="-Xms${JAVA_XMS} -Xmx${JAVA_XMX}"

if [ "$USE_G1GC" = "true" ]; then
    JAVA_FLAGS="$JAVA_FLAGS \
        -XX:+UseG1GC \
        -XX:+ParallelRefProcEnabled \
        -XX:MaxGCPauseMillis=${MAX_GC_PAUSE_MILLIS:-200} \
        -XX:+UnlockExperimentalVMOptions \
        -XX:+DisableExplicitGC \
        -XX:G1NewSizePercent=${G1_NEW_SIZE_PERCENT:-30} \
        -XX:G1MaxNewSizePercent=${G1_MAX_NEW_SIZE_PERCENT:-40} \
        -XX:G1HeapRegionSize=${G1_HEAP_REGION_SIZE:-8M} \
        -XX:G1ReservePercent=20 \
        -XX:G1HeapWastePercent=5 \
        -XX:G1MixedGCCountTarget=4 \
        -XX:InitiatingHeapOccupancyPercent=15 \
        -XX:G1MixedGCLiveThresholdPercent=90 \
        -XX:G1RSetUpdatingPauseTimePercent=5 \
        -XX:SurvivorRatio=32 \
        -XX:+PerfDisableSharedMem \
        -XX:MaxTenuringThreshold=1"
fi

[ -f "HytaleServer.aot" ] && JAVA_FLAGS="$JAVA_FLAGS -XX:AOTCache=HytaleServer.aot"
[ -n "$JAVA_EXTRA_FLAGS" ] && JAVA_FLAGS="$JAVA_FLAGS $JAVA_EXTRA_FLAGS"

# Server args
SERVER_ARGS="--assets Assets.zip --bind ${BIND_ADDR}:${BIND_PORT}"
[ -n "$VIEW_DISTANCE" ] && SERVER_ARGS="$SERVER_ARGS --view-distance $VIEW_DISTANCE"
[ -n "$MAX_PLAYERS" ] && SERVER_ARGS="$SERVER_ARGS --max-players $MAX_PLAYERS"
[ -n "$SERVER_NAME" ] && SERVER_ARGS="$SERVER_ARGS --name $SERVER_NAME"
[ -n "$SERVER_EXTRA_ARGS" ] && SERVER_ARGS="$SERVER_ARGS $SERVER_EXTRA_ARGS"

# Command pipe for web panel
PIPE="/tmp/hytale-console"
rm -f "$PIPE"
mkfifo "$PIPE"
chmod 666 "$PIPE"

cleanup() {
    rm -f "$PIPE"
}
trap cleanup EXIT

# tail -f keeps pipe open, feeds stdin to java
tail -f "$PIPE" | gosu hytale java $JAVA_FLAGS -jar HytaleServer.jar $SERVER_ARGS
