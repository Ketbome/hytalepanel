# Mods

Manage Hytale mods through the panel with support for Modtale and CurseForge.

## Mod Providers

The panel supports two mod repositories:

| Provider | Website | Features |
|----------|---------|----------|
| **Modtale** | [modtale.net](https://modtale.net) | Dedicated Hytale mod repository |
| **CurseForge** | [curseforge.com/hytale](https://curseforge.com/hytale) | Large multi-game platform |

You can use one or both providers. The panel automatically detects which mods come from each provider.

## Setup

### Modtale API Key

1. Create an account at [modtale.net](https://modtale.net)
2. Get your API key from your profile
3. Add to `.env`:

```env
MODTALE_API_KEY=your-api-key-here
```

### CurseForge API Key

1. Go to [console.curseforge.com](https://console.curseforge.com)
2. Create a project and get an API key
3. Add to `.env`:

::: warning Important
CurseForge API keys contain `$` characters. **Wrap in single quotes** to prevent issues:
:::

```env
CURSEFORGE_API_KEY='$2a$10$your-key-here'
```

### Apply Changes

Restart the panel after adding API keys:

```bash
docker compose restart hytale-panel
```

## Using the Mods Tab

### Browse & Install

1. Open the panel and go to **Mods** tab
2. Click **Browse** to see available mods
3. Select provider (Modtale or CurseForge) using the toggle buttons
4. Search or browse mods
5. Click **Install** on the mod you want

The panel shows visual indicators for each provider:
- 🟢 Green dot = API configured and working
- 🔴 Red dot = API key invalid
- ⚫ Gray dot = Not configured

### Installed Mods

Switch to **Installed** view to see your mods:

- Toggle mods on/off
- Remove mods
- View mod details
- See which provider each mod came from (Modtale or CurseForge badge)

### Update Checking

Click **Updates** to check for newer versions of installed mods:

- Works with both Modtale and CurseForge mods
- Only checks mods from providers you have configured
- One-click update to latest version

## Manual Installation

For mods not available in the repositories:

1. Download mod files (`.jar` or `.zip`)
2. Use the **Files** tab to upload to `mods/` folder
3. Or place files directly in `./data/panel/servers/{server-id}/server/mods/`

Manual mods appear as "Local" in the Installed list.

## Enabling Mods

The server needs to know where mods are located. Configure via:

### Per-Server (Config Tab)

1. Go to **Config** tab
2. Set **Extra Args** to: `--mods mods`
3. Save and restart server

### Global (.env)

```env
SERVER_EXTRA_ARGS=--mods mods
```

## Custom Mods Folder

Mount a custom mods folder in `docker-compose.yml`:

```yaml
services:
  hytale-server:
    volumes:
      - ./server:/opt/hytale
      - ./my-mods:/opt/hytale/mods
```

## Mod Commands

Server console commands:

```
/mods list          # List installed mods
/mods reload        # Reload all mods
/mods enable <mod>  # Enable a mod
/mods disable <mod> # Disable a mod
```

## Troubleshooting

### "API key not configured"

- Check your `.env` file has the correct key
- For CurseForge, ensure the key is wrapped in single quotes
- Restart the panel after adding keys

### "API key invalid"

- Verify the key is correct (copy again from the provider)
- CurseForge keys start with `$2a$` - this is normal
- Check the key hasn't expired

### Mods not loading

1. Verify `--mods mods` is in Extra Args or SERVER_EXTRA_ARGS
2. Check mods are in the correct folder
3. Check server logs for errors

### CurseForge mod shows "Manual download required"

Some CurseForge mods don't allow API distribution. Visit the mod page to download manually.

### Performance issues

- Monitor server RAM usage
- Increase `JAVA_XMX` if needed
- Some mods require more resources
