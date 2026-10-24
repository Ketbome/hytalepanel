---
layout: home

head:
  - - meta
    - name: description
      content: Docker image for Hytale dedicated server with web admin panel, JWT authentication, real-time console, file manager, and mod support via Modtale and CurseForge.
  - - meta
    - name: keywords
      content: hytale server, docker, dedicated server, game server, web panel, mods, jwt authentication, file manager, real-time console

hero:
  name: HytalePanel
  text: A web panel for your Hytale server
  tagline: One Docker image with a live console, files, mods and backups.
  image:
    src: /images/panel.png
    alt: HytalePanel server view with the live console next to the Mods tab
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: GitHub
      link: https://github.com/ketbome/hytalepanel
---

## Quick start

You need Docker with Compose and about 4 GB of free RAM per server.

```bash
# 1. Create folder
mkdir hytale && cd hytale

# 2. Download files
curl -O https://raw.githubusercontent.com/ketbome/hytalepanel/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/ketbome/hytalepanel/main/.env.example

# 3. Configure
cp .env.example .env
nano .env  # Change PANEL_USER and PANEL_PASS!

# 4. Start
docker compose up -d

# 5. Open panel at http://localhost:3000
```

## What's included

<div class="hp-features">
<dl>
  <div>
    <dt>Live console</dt>
    <dd>Follow the server log as it happens, filter it by level and send commands.</dd>
  </div>
  <div>
    <dt>File manager</dt>
    <dd>Browse, upload, edit and download server files, even while the server is stopped.</dd>
  </div>
  <div>
    <dt>Mods (Modtale, CurseForge)</dt>
    <dd>Search both catalogues, install with one click and check installed mods for updates.</dd>
  </div>
  <div>
    <dt>Backups</dt>
    <dd>Create and restore backups by hand or on a schedule, with limits on how many to keep.</dd>
  </div>
  <div>
    <dt>Multi-server</dt>
    <dd>Run several Hytale servers from one panel, each in its own container and port.</dd>
  </div>
  <div>
    <dt>Four languages</dt>
    <dd>The panel speaks English, Spanish, Ukrainian and Brazilian Portuguese.</dd>
  </div>
</dl>
</div>

## Documentation

The [guide](/guide/getting-started) covers installation, configuration, the panel and mods. The [reference](/reference/environment) lists every environment variable, REST endpoint and socket event.
