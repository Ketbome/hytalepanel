#!/bin/bash

cd "$SERVER_HOME"

# Machine-id handling (needed for encrypted credential storage)
# Some systems (ZimaOS, CasaOS) can't mount /etc/machine-id:ro
# We persist it in server folder to survive container restarts
setup_machine_id() {
    local PERSISTENT_ID="$SERVER_HOME/.machine-id"
    local PERSISTENT_HASH="$SERVER_HOME/.machine-id.hash"
    
    # Validate machine-id format (must be 32 hex characters)
    validate_machine_id() {
        local id="$1"
        # Remove any whitespace/newlines and check format
        id=$(echo "$id" | tr -d '\n\r\t ')
        if echo "$id" | grep -Eq '^[a-f0-9]{32}$'; then
            return 0
        fi
        return 1
    }
    
    # Read and clean machine-id (remove newlines/spaces, take first 32 chars)
    read_and_clean() {
        tr -d '\n\r\t ' < "$1" 2>/dev/null | head -c 32 | tr '[:upper:]' '[:lower:]'
    }
    
    # 1. Try to restore from persistent copy first
    if [ -f "$PERSISTENT_ID" ]; then
        RESTORED_ID=$(read_and_clean "$PERSISTENT_ID")
        if validate_machine_id "$RESTORED_ID"; then
            echo "[HYTALE] ✓ Restored machine-id from persistent storage"
            echo -n "$RESTORED_ID" > /etc/machine-id
            chmod 444 /etc/machine-id
            echo -n "$RESTORED_ID" | md5sum | cut -d' ' -f1 > "$PERSISTENT_HASH"
            return 0
        fi
        echo "[HYTALE] ⚠ Persistent machine-id invalid (format error), regenerating..."
    fi
    
    # 2. Check if host machine-id is valid (mounted)
    if [ -s /etc/machine-id ]; then
        HOST_ID=$(read_and_clean /etc/machine-id)
        if validate_machine_id "$HOST_ID"; then
            echo "[HYTALE] ✓ Using host machine-id"
            echo -n "$HOST_ID" > "$PERSISTENT_ID"
            echo -n "$HOST_ID" > /etc/machine-id
            chmod 444 /etc/machine-id "$PERSISTENT_ID"
            echo -n "$HOST_ID" | md5sum | cut -d' ' -f1 > "$PERSISTENT_HASH"
            return 0
        fi
    fi
    
    # 3. Generate new machine-id (consistent format)
    echo "[HYTALE] ⚠ Generating NEW machine-id (auth data will be fresh)"
    NEW_ID=$(cat /proc/sys/kernel/random/uuid | tr -d '-\n\r\t ' | head -c 32 | tr '[:upper:]' '[:lower:]')
    
    if validate_machine_id "$NEW_ID"; then
        echo "[HYTALE] ✓ Generated machine-id: $NEW_ID"
        echo -n "$NEW_ID" > /etc/machine-id
        echo -n "$NEW_ID" > "$PERSISTENT_ID"
        chmod 444 /etc/machine-id "$PERSISTENT_ID"
        echo -n "$NEW_ID" | md5sum | cut -d' ' -f1 > "$PERSISTENT_HASH"
        return 0
    fi
    
    echo "[HYTALE] ✗ CRITICAL: Failed to setup machine-id!"
    echo "[HYTALE] ✗ Encrypted auth persistence will NOT work"
    return 1
}

if ! setup_machine_id; then
    echo "[HYTALE] WARNING: Continuing without valid machine-id"
    echo "[HYTALE] Auth tokens will not persist across container restarts"
fi

# Fix permissions on mounted volumes (runs as root)
chown -R hytale:hytale "$SERVER_HOME"

DOWNLOAD_FLAG="$SERVER_HOME/.download_attempted"
ARCH=$(uname -m)

# Check if files exist
if [ ! -f "HytaleServer.jar" ] || [ ! -f "Assets.zip" ]; then
    
    # Only attempt download once
    if [ ! -f "$DOWNLOAD_FLAG" ] && [ "$AUTO_DOWNLOAD" = "true" ]; then
        if command -v hytale-downloader &> /dev/null; then
            touch "$DOWNLOAD_FLAG"
            echo "[HYTALE] Server files not found. Attempting download..."
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
