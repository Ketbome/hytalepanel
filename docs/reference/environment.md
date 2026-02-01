# Environment Variables

Complete reference of all environment variables.

## Server Variables

| Variable            | Default | Description                         |
| ------------------- | ------- | ----------------------------------- |
| `JAVA_XMS`          | `4G`    | Minimum Java heap size              |
| `JAVA_XMX`          | `8G`    | Maximum Java heap size              |
| `BIND_PORT`         | `5520`  | Game server UDP port                |
| `AUTO_DOWNLOAD`     | `true`  | Auto-download game files on startup |
| `SERVER_EXTRA_ARGS` | -       | Additional arguments for the server |
| `TZ`                | `UTC`   | Container timezone                  |

## Panel Variables

| Variable             | Default       | Description                        |
| -------------------- | ------------- | ---------------------------------- |
| `PANEL_USER`         | `admin`       | Login username                     |
| `PANEL_PASS`         | `admin`       | Login password                     |
| `PANEL_PORT`         | `3000`        | HTTP server port                   |
| `JWT_SECRET`         | (random)      | Secret key for JWT signing         |
| `MODTALE_API_KEY`    | -             | API key for Modtale integration    |
| `CURSEFORGE_API_KEY` | -             | API key for CurseForge integration |
| `HOST_DATA_PATH`     | `${PWD}/data` | **Absolute path** for data storage |
| `DISABLE_AUTH`       | `false`       | Disable panel authentication       |
| `BASE_PATH`          | -             | URL path prefix (e.g., `/panel`)   |

## Docker Variables

| Variable         | Default         | Description                       |
| ---------------- | --------------- | --------------------------------- |
| `CONTAINER_NAME` | `hytale-server` | Name of the game server container |

## Detailed Descriptions

### JAVA_XMS / JAVA_XMX

Controls Java Virtual Machine memory allocation.

```env
# Minimum 4GB, maximum 8GB
JAVA_XMS=4G
JAVA_XMX=8G
```

::: tip RAM Guidelines
| Players | Recommended |
|---------|-------------|
| 1-10 | 4G |
| 10-20 | 6G |
| 20-50 | 8G |
| 50+ | 12G+ |
:::

### AUTO_DOWNLOAD

When `true`, the server will automatically download `HytaleServer.jar` and `Assets.zip` from the official source on first startup.

```env
# Disable for ARM64 or manual setup
AUTO_DOWNLOAD=false
```

::: warning ARM64
Auto-download is **not available on ARM64** systems. Set to `false` and provide files manually.
:::

### SERVER_EXTRA_ARGS

Pass additional arguments to the Hytale server executable.

```env
# Enable mods
SERVER_EXTRA_ARGS=--mods mods

# Multiple arguments
SERVER_EXTRA_ARGS=--mods mods --debug
```

### TZ (Timezone)

Sets the container timezone for log timestamps.

```env
TZ=America/New_York
TZ=Europe/London
TZ=Asia/Tokyo
```

[Full timezone list](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

### JWT_SECRET

Secret key used to sign JWT tokens. If not provided, a random key is generated on startup.

```env
# Optional but recommended for persistent sessions
JWT_SECRET=your-very-long-random-string-here
```

::: info
If not set, a new random secret is generated each time the panel restarts, invalidating all existing sessions.
:::

### MODTALE_API_KEY

API key for [Modtale](https://modtale.com) mod repository integration.

```env
MODTALE_API_KEY=your-modtale-api-key
```

When configured, enables:

- Mod browsing in the panel
- One-click mod installation
- Update checking

### CURSEFORGE_API_KEY

API key for [CurseForge](https://www.curseforge.com) mod repository integration.

::: warning Important
CurseForge API keys contain `$` characters which are interpreted as variables in shell/Docker. **Wrap the key in single quotes** to prevent issues:
:::

```env
CURSEFORGE_API_KEY='$2a$10$your-key-here'
```

Get your API key at [console.curseforge.com](https://console.curseforge.com).

When configured, enables:

- Browse CurseForge mods in the panel
- One-click mod installation from CurseForge
- Access to 2,600+ Hytale mods

::: warning Distribution Restrictions
Some CurseForge mods don't allow API distribution. These mods will show a warning and must be downloaded manually from the CurseForge website.
:::

### HOST_DATA_PATH

**Absolute path** on the host filesystem where all data is stored. This is used for panel data and server container volumes.

::: danger Important
`HOST_DATA_PATH` **must be an absolute path** for Docker volume mounts to work correctly. Relative paths will cause issues with server containers.
:::

::: warning Windows Users
`${PWD}` does **not work on Windows**! You must set this variable manually in your `.env` file using forward slashes:

```env
HOST_DATA_PATH=C:/Users/YourName/hytale/data
```

:::

```env
# Linux/Mac (default uses ${PWD}/data)
HOST_DATA_PATH=/home/user/hytale/data

# Windows (REQUIRED)
HOST_DATA_PATH=C:/Users/YourName/hytale/data
```

When configured:

- Panel data stored at this path
- Server containers mount their data from this location
- File browser works even when server is stopped
- Files accessible directly from host

Structure:

```
HOST_DATA_PATH/
├── servers.json            # Server registry
└── servers/
    └── {server-id}/
        ├── server/         # Server files
        ├── backups/        # Backup ZIPs (v1.4.0+)
        └── docker-compose.yml
```

### DISABLE_AUTH

Completely disables panel authentication. Use this when authentication is handled by a reverse proxy with SSO (Authentik, Authelia, etc.).

```env
DISABLE_AUTH=true
```

::: warning Security
Only enable this behind a properly configured reverse proxy with authentication. The panel will be fully accessible without login.
:::

The panel also supports **HTTP Basic Auth** headers. If your SSO/reverse proxy injects `Authorization: Basic ...` headers with valid credentials, the panel will accept them without requiring a separate login.

### BASE_PATH

URL path prefix to mount the panel at a custom location. Useful when running multiple services on the same domain.

```env
BASE_PATH=/panel
```

When configured:

- Panel accessible at `https://domain.com/panel/` instead of root
- All API routes prefixed: `/panel/api/`, `/panel/auth/`
- Socket.IO path: `/panel/socket.io`

::: tip Reverse Proxy
Configure your reverse proxy (Nginx, Caddy, Traefik) to forward requests from `/panel/` to the panel container.
:::

## Example .env File

```env
# ===================
# Server Configuration
# ===================
JAVA_XMS=4G
JAVA_XMX=8G
BIND_PORT=5520
AUTO_DOWNLOAD=true
SERVER_EXTRA_ARGS=--mods mods
TZ=America/New_York

# ===================
# Panel Configuration
# ===================
PANEL_USER=myadmin
PANEL_PASS=supersecurepassword123
PANEL_PORT=3000
JWT_SECRET=change-this-to-a-random-string

# ===================
# Optional Integrations
# ===================
MODTALE_API_KEY=your-modtale-api-key
CURSEFORGE_API_KEY='$2a$10$your-curseforge-key'

# ===================
# Data Storage (must be absolute path)
# ===================
# Linux/Mac: Default ${PWD}/data works
# HOST_DATA_PATH=/home/user/hytale/data
#
# Windows: REQUIRED! ${PWD} doesn't work
# HOST_DATA_PATH=C:/Users/YourName/hytale/data
```
