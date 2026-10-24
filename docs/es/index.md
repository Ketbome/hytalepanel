---
layout: home

head:
  - - meta
    - name: description
      content: Imagen Docker para servidor dedicado de Hytale con panel web de administración, autenticación JWT, consola en tiempo real, gestor de archivos y soporte completo de mods.
  - - meta
    - name: keywords
      content: hytale servidor, docker, servidor dedicado, panel web, mods, autenticación jwt, gestor archivos, consola tiempo real

hero:
  name: HytalePanel
  text: Un panel web para tu servidor de Hytale
  tagline: Una imagen Docker con consola en vivo, archivos, mods y backups.
  image:
    src: /images/panel.png
    alt: Vista de servidor de HytalePanel con la consola en vivo junto a la pestaña Mods
  actions:
    - theme: brand
      text: Comenzar
      link: /es/guide/getting-started
    - theme: alt
      text: GitHub
      link: https://github.com/ketbome/hytalepanel
---

## Inicio rápido

Necesitas Docker con Compose y unos 4 GB de RAM libre por servidor.

```bash
# 1. Crear carpeta
mkdir hytale && cd hytale

# 2. Descargar archivos
curl -O https://raw.githubusercontent.com/ketbome/hytalepanel/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/ketbome/hytalepanel/main/.env.example

# 3. Configurar
cp .env.example .env
nano .env  # ¡Cambia PANEL_USER y PANEL_PASS!

# 4. Iniciar
docker compose up -d

# 5. Abrir panel en http://localhost:3000
```

## Qué incluye

<div class="hp-features">
<dl>
  <div>
    <dt>Consola en vivo</dt>
    <dd>Sigue el log del servidor en tiempo real, fíltralo por nivel y envía comandos.</dd>
  </div>
  <div>
    <dt>Gestor de archivos</dt>
    <dd>Explora, sube, edita y descarga archivos del servidor, incluso con el servidor detenido.</dd>
  </div>
  <div>
    <dt>Mods (Modtale, CurseForge)</dt>
    <dd>Busca en ambos catálogos, instala con un clic y revisa si tus mods tienen actualizaciones.</dd>
  </div>
  <div>
    <dt>Backups</dt>
    <dd>Crea y restaura backups a mano o de forma programada, con límites de cuántos conservar.</dd>
  </div>
  <div>
    <dt>Varios servidores</dt>
    <dd>Gestiona varios servidores de Hytale desde un solo panel, cada uno con su contenedor y su puerto.</dd>
  </div>
  <div>
    <dt>Cuatro idiomas</dt>
    <dd>El panel está en inglés, español, ucraniano y portugués de Brasil.</dd>
  </div>
</dl>
</div>

## Documentación

La [guía](/es/guide/getting-started) cubre la instalación, la configuración, el panel y los mods. La [referencia](/es/reference/environment) lista cada variable de entorno, endpoint REST y evento de socket.
