# Configuration

All configuration is done through environment variables in your `.env` file.

## Server Configuration

| Variable            | Default | Description                         |
| ------------------- | ------- | ----------------------------------- |
| `JAVA_XMS`          | `4G`    | Minimum RAM allocation              |
| `JAVA_XMX`          | `8G`    | Maximum RAM allocation              |
| `BIND_PORT`         | `5520`  | Game server UDP port                |
| `AUTO_DOWNLOAD`     | `true`  | Auto-download game files (x64 only) |
| `SERVER_EXTRA_ARGS` | -       | Extra arguments for the server      |
| `TZ`                | `UTC`   | Timezone for logs                   |

### Server Arguments {#server-arguments}

`SERVER_EXTRA_ARGS` (or the per-server **Extra Arguments** field in the panel's **Config** tab) is appended to the server command line. This is also how you pass the `--transport` option added in Update 8, which selects the server's network transport:

```env
SERVER_EXTRA_ARGS=--transport <transport>
```

Since Update 8 the server uses the quiche transport by default (see [ARM64 Support](./arm64#network-transport) for the netty fallback). Check the official Hytale server manual for the accepted values.

## Release Channels

Each server can follow one of the official `hytale-downloader` patchlines, selectable in the panel's **Config** tab:

| Channel       | Description                                        |
| ------------- | -------------------------------------------------- |
| `stable`      | Production-ready builds (default, recommended)     |
| `pre-release` | Latest features and updates, may contain bugs      |

The **Setup** tab's update check compares the installed server version against the latest version available on the server's channel (via `hytale-downloader -print-version`), so "Update available" reflects the real remote version instead of file age.

### Update Safety {#update-safety}

Server updates can upgrade your worlds in place, and these upgrades are **one-way**:

- Update 7 upgraded world block-section data to v7. A world loaded on that version can't be opened on an older one.
- Update 8 (pre-release) migrates `universe/events.json` to `universe/resources/GlobalWorldEvents.json`. Older servers won't read it.

Because of this, the panel creates a backup (same contents as the **Backups** tab) before applying an update from the **Setup** tab. If the backup fails, the update is aborted and nothing is downloaded. This is controlled per server by **Back up worlds before applying updates** in the **Config** tab. It's enabled by default, and servers created before the option existed behave as enabled.

Switching a server from `pre-release` back to `stable` asks for confirmation: worlds opened on a newer pre-release build may not load on the older stable build, so take a backup first. Switching from `stable` to `pre-release` shows a shorter note, because your worlds will be migrated irreversibly once the new build opens them.

::: warning
Restoring a backup is the only way to get an upgraded world back onto an older build. Keep at least one backup taken on the old version until you're happy with the update.
:::

### Built-in `/update` Command {#built-in-update}

Hytale servers include a built-in updater (`UpdateModule`, the `/update` commands). It's not supported in this image, by design: it expects the official `start.sh` launcher and `Server/` folder layout, and relies on the launcher handling exit code 8 to swap in the new build and restart. This image starts `HytaleServer.jar` directly, so updates are handled by the panel instead (**Setup** tab), which downloads the build for the server's release channel with `hytale-downloader` and takes a backup first.

## Panel Configuration

| Variable             | Default  | Description                            |
| -------------------- | -------- | -------------------------------------- |
| `PANEL_USER`         | `admin`  | Panel login username                   |
| `PANEL_PASS`         | `admin`  | Panel login password                   |
| `PANEL_PORT`         | `3000`   | Panel HTTP port                        |
| `JWT_SECRET`         | (random) | JWT signing key                        |
| `MODTALE_API_KEY`    | -        | Modtale API key for mod integration    |
| `CURSEFORGE_API_KEY` | -        | CurseForge API key for mod integration |

## Server `config.json` {#server-config-json}

The Hytale server keeps its own settings in `config.json` in the server's root folder (`/opt/hytale/config.json` inside the container, `data/servers/{server-id}/server/config.json` on the host). Edit it from the panel's **Files** tab and restart the server to apply changes. It's included in backups.

### SentryDsn

Since Update 7 hotfix 0.7.3 the server reads an optional `SentryDsn` key. Set it to a DSN from your own [Sentry](https://sentry.io) project to receive server and plugin errors there:

```json
{
  "SentryDsn": "https://<public-key>@<your-sentry-host>/<project-id>"
}
```

| Value           | Behavior                                             |
| --------------- | ---------------------------------------------------- |
| Key not present | Unchanged (server default)                           |
| `""` (empty)    | Error reporting disabled                             |
| A DSN           | Server and plugin errors sent to your Sentry project |

Add the key next to the existing ones; don't replace the whole file.

## Server Discovery {#server-discovery}

Hytale's official server list (Server Discovery) is managed outside the panel:

1. Create a server profile in the **Hytale Account Manager → Server Profiles**.
2. Verify your domain by adding the DNS **TXT** record it gives you.
3. The listing goes through Hytale's moderation before it's shown.
4. In game, an operator (OP) generates a discovery token for the server.

The server then sends discovery heartbeats on its own using that token. There's nothing to configure in the panel. Just make sure the game port (`BIND_PORT`, UDP) is reachable from the internet.

## RAM Guidelines

| Players | Recommended `JAVA_XMX` |
| ------- | ---------------------- |
| 1-10    | 4G                     |
| 10-20   | 6G                     |
| 20-50   | 8G                     |
| 50+     | 12G+                   |

## Example Configuration

```env
# Server Resources
JAVA_XMS=4G
JAVA_XMX=8G
BIND_PORT=5520

# Auto-download (set to false if you want to provide files manually)
AUTO_DOWNLOAD=true

# Extra server arguments (e.g., for mods)
SERVER_EXTRA_ARGS=--mods mods

# Panel Authentication
PANEL_USER=myadmin
PANEL_PASS=supersecretpassword123
JWT_SECRET=my-random-secret-key

# Timezone (see: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
TZ=Europe/Madrid

# Modtale integration (optional)
MODTALE_API_KEY=your-api-key-here

# CurseForge integration (optional - note the single quotes!)
CURSEFORGE_API_KEY='$2a$10$your-key-here'
```

## Docker Compose Customization

You can customize volumes and ports in `docker-compose.yml`:

```yaml
services:
  hytale-server:
    volumes:
      - ./server:/opt/hytale # Server files
      - ./my-custom-mods:/opt/hytale/mods # Custom mods folder
    ports:
      - "5520:5520/udp" # Game port
    environment:
      - JAVA_XMX=16G # Override RAM

  hytale-panel:
    ports:
      - "8080:3000" # Change panel port to 8080
```

## Timezone List

Common timezones:

| Region         | Timezone              |
| -------------- | --------------------- |
| US East        | `America/New_York`    |
| US West        | `America/Los_Angeles` |
| UK             | `Europe/London`       |
| Central Europe | `Europe/Berlin`       |
| Spain          | `Europe/Madrid`       |
| Japan          | `Asia/Tokyo`          |
| Australia      | `Australia/Sydney`    |

[Full list of timezones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

## Data Storage

By default, all data is stored in `./data/` relative to the docker-compose file.

### HOST_DATA_PATH

This environment variable defines where server data is stored on the host machine.

**Important:** `HOST_DATA_PATH` must be an **absolute path** for server volumes to work correctly.

- Default: `${PWD}/data` (Linux/Mac only)
- Example: `HOST_DATA_PATH=/home/user/hytale-data`

The path is used for:

- Panel data storage
- Server container volumes (each server mounts its data from this location)

::: warning Windows Users
`${PWD}` does **not work on Windows**! You must set `HOST_DATA_PATH` manually in your `.env` file.

Use forward slashes (`/`) not backslashes (`\`):

```env
HOST_DATA_PATH=C:/Users/YourName/hytale/data
```

:::

```env
# Linux/Mac
HOST_DATA_PATH=/home/user/hytale/data

# Windows (REQUIRED - ${PWD} doesn't work)
HOST_DATA_PATH=C:/Users/YourName/hytale/data
```
