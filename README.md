# Hytale Dedicated Server - Docker

Docker image for Hytale dedicated server with web panel.

## Quick Start

```bash
# 1. Create folder
mkdir hytale && cd hytale

# 2. Download compose file
curl -O https://raw.githubusercontent.com/ketbom/hytale-server/main/docker-compose.yml

# 3. Create server folder
mkdir server

# 4. Start
docker compose up -d

# 5. Open panel
# http://localhost:3000
```

The server will try to auto-download game files. If it fails (auth required), download manually.

## Manual Download

Download from https://hytale.com and place in `./server/`:

- `HytaleServer.jar`
- `Assets.zip`

## Structure

```
server/
├── HytaleServer.jar   # server binary
├── Assets.zip         # game assets
├── universe/          # worlds
├── mods/              # mods
├── logs/              # logs
└── config/            # configuration
```

## Web Panel

Access at **http://localhost:3000**

- Real-time logs
- Send commands
- Server status

## Configuration

Edit `docker-compose.yml`:

| Variable        | Default | Description     |
| --------------- | ------- | --------------- |
| `JAVA_XMS`      | `4G`    | Minimum RAM     |
| `JAVA_XMX`      | `8G`    | Maximum RAM     |
| `AUTO_DOWNLOAD` | `true`  | Auto-download   |
| `BIND_PORT`     | `5520`  | UDP port        |
| `VIEW_DISTANCE` | -       | Render distance |
| `MAX_PLAYERS`   | -       | Max players     |
| `SERVER_NAME`   | -       | Server name     |

### RAM Guide

| Players | JAVA_XMX |
| ------- | -------- |
| 1-10    | 4G       |
| 10-20   | 6G       |
| 20-50   | 8G       |
| 50+     | 12G+     |

## Commands

```bash
# View logs
docker compose logs -f

# Stop
docker compose down

# Update
docker compose pull && docker compose up -d

# Backup
tar -czvf backup.tar.gz server/
```

## Firewall

```bash
# Linux
ufw allow 5520/udp

# Windows PowerShell
New-NetFirewallRule -DisplayName "Hytale" -Direction Inbound -Protocol UDP -LocalPort 5520 -Action Allow
```

## Ports

| Service | Port     |
| ------- | -------- |
| Server  | 5520/UDP |
| Panel   | 3000/TCP |

## License

MIT
