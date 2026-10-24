---
layout: home
markdownStyles: false
footer: false
pageClass: hp-home-page

head:
  - - meta
    - name: description
      content: Docker image for Hytale dedicated server with web admin panel, JWT authentication, real-time console, file manager, and mod support via Modtale and CurseForge.
  - - meta
    - name: keywords
      content: hytale server, docker, dedicated server, game server, web panel, mods, jwt authentication, file manager, real-time console

hp:
  hero:
    title: [Run Hytale servers, from a browser]
    lead: HytalePanel is a free Docker image and web panel for hosting Hytale. A live console, files, mods and backups for every server you run.
    primary: { text: Get started, link: /guide/getting-started }
    secondary: { text: GitHub, link: https://github.com/ketbome/hytalepanel }
    hint: The console replays a real server boot. It takes commands too, so try /help.
  console:
    online: Online
    offline: Offline
    starting: Starting…
    stopping: Stopping…
    up: up {time}
    placeholder: Type a command — Tab completes
    offlinePlaceholder: Server offline
    send: Send
    start: Start
    stop: Stop
    log: Console output
    command: Server command
  steps:
    title: How it works
    running: Running
    downloading: Downloading…
    players: "{n} players"
    items:
      - One compose file starts the panel.
      - The panel creates each server as its own container.
      - It downloads the game files with your Hytale account.
      - Your friends join on port 5520.
  showcase:
    title: One screen per server
    text: The console stays open next to the tabs you work in. Control, setup, files, mods, backups and config, without leaving the log.
    alt: The server view in HytalePanel, with the live console on the left and the Mods tab on the right
    list: Every server you run sits in one list, with its port, memory and container.
    listAlt: The server list with three servers, their status, port, memory and container
  compare:
    title: What it replaces
    text: Everything you would otherwise do over SSH, in a terminal, with a script you have to remember.
    label: Task
    ours: HytalePanel
    theirs: By hand
    rows:
      - { name: "Console", ours: "Live in the browser, filtered by level", theirs: "An SSH session inside screen" }
      - { name: "Files", ours: "Browse, edit, upload and download", theirs: "scp and a terminal editor" }
      - { name: "Mods", ours: "Search Modtale and CurseForge, install in one click", theirs: "Download each jar and copy it over" }
      - { name: "Backups", ours: "On a schedule, keeping as many as you choose", theirs: "A cron job you write yourself" }
      - { name: "Game updates", ours: "Check and update from the Setup tab", theirs: "Run the downloader again" }
      - { name: "More servers", ours: "One panel, one container and port each", theirs: "A folder, a port and a script each" }
      - { name: "Access", ours: "A password, or your SSO proxy in front", theirs: "Whoever holds the SSH key" }
  faq:
    title: Questions
    items:
      - q: Do I need a Hytale account?
        a: Yes. The game files come from the official <code>hytale-downloader</code>, which asks you to sign in once with a device code. The login is kept in the server's volume.
      - q: How much memory does a server need?
        a: About 4 GB for up to ten players. Give it 6 GB for twenty and 8 GB for fifty.
      - q: Does it run on ARM64 or a Raspberry Pi?
        a: The server runs natively on ARM64. The automatic download is x64 only, so copy <code>HytaleServer.jar</code> and <code>Assets.zip</code> over by hand.
      - q: Can I run it on Windows?
        a: Yes, with Docker Desktop. Set <code>HOST_DATA_PATH</code> in <code>.env</code> to an absolute path with forward slashes.
      - q: Can it sit behind my own login?
        a: Set <code>DISABLE_AUTH=true</code> when a proxy such as Authentik handles sign-in, and <code>BASE_PATH=/panel</code> to serve it under a path.
      - q: Where are my worlds stored?
        a: In <code>./data</code> next to your compose file. Each server mounts its own folder from there, so moving or copying one is a plain file copy.
      - q: Which languages does the panel speak?
        a: English, Spanish, Ukrainian and Brazilian Portuguese. These docs are in English, Spanish and Ukrainian.
      - q: Is it free?
        a: Free for personal, educational and non-profit use, and for small businesses. Hosting paid servers with it needs written permission.
  close:
    title: [Start in, five lines]
    text: Then open localhost:3000, sign in and create your first server. The guide covers every step.
    action: { text: Read the guide, link: /guide/getting-started }
    copy: Copy
    copied: Copied
    comment: set PANEL_USER and PANEL_PASS
  footer:
    statement: A community tool for hosting Hytale dedicated servers.
    legal: Not affiliated with Hypixel Studios or Hytale. Free for personal and non-commercial use.
    navTitle: Docs
    nav:
      - { text: Guide, link: /guide/getting-started }
      - { text: Reference, link: /reference/environment }
      - { text: GitHub, link: https://github.com/ketbome/hytalepanel }
      - { text: Minepanel, link: https://minepanel.ketbome.com/ }
    langTitle: Language
    imageTitle: Docker images
    issue: { text: Found a bug? Open an issue, link: https://github.com/ketbome/hytalepanel/issues }
---

<HomePage />
