---
head:
  - - meta
    - name: description
      content: Guía completa de instalación para HytalePanel. Aprende a configurar servidores dedicados de Hytale con Docker y panel web en minutos.
  - - meta
    - name: keywords
      content: instalación hytale, configurar docker, tutorial servidor juego, instalar panel hytale, configuración servidor
  - - script
    - type: application/ld+json
    - |
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "Cómo instalar HytalePanel",
        "description": "Guía paso a paso para instalar y configurar el contenedor Docker de HytalePanel con interfaz web de administración",
        "inLanguage": "es-ES",
        "totalTime": "PT10M",
        "step": [
          {
            "@type": "HowToStep",
            "name": "Crear carpeta del proyecto",
            "text": "Crea un directorio para tu servidor Hytale",
            "itemListElement": {
              "@type": "HowToDirection",
              "text": "mkdir hytale && cd hytale"
            }
          },
          {
            "@type": "HowToStep",
            "name": "Descargar archivos de configuración",
            "text": "Descarga docker-compose.yml y .env.example del repositorio",
            "itemListElement": {
              "@type": "HowToDirection",
              "text": "curl -O https://raw.githubusercontent.com/ketbome/hytalepanel/main/docker-compose.yml && curl -O https://raw.githubusercontent.com/ketbome/hytalepanel/main/.env.example"
            }
          },
          {
            "@type": "HowToStep",
            "name": "Configurar entorno",
            "text": "Copia .env.example a .env y establece tus credenciales",
            "itemListElement": {
              "@type": "HowToDirection",
              "text": "cp .env.example .env && edita .env para cambiar PANEL_USER y PANEL_PASS"
            }
          },
          {
            "@type": "HowToStep",
            "name": "Iniciar el panel",
            "text": "Lanza los contenedores Docker",
            "itemListElement": {
              "@type": "HowToDirection",
              "text": "docker compose up -d"
            }
          },
          {
            "@type": "HowToStep",
            "name": "Acceder al panel",
            "text": "Abre http://localhost:3000 en tu navegador e inicia sesión",
            "itemListElement": {
              "@type": "HowToDirection",
              "text": "Navega a http://localhost:3000 y usa tus credenciales configuradas"
            }
          }
        ],
        "tool": [
          {
            "@type": "HowToTool",
            "name": "Docker"
          },
          {
            "@type": "HowToTool",
            "name": "Docker Compose"
          }
        ],
        "supply": [
          {
            "@type": "HowToSupply",
            "name": "4GB+ RAM"
          },
          {
            "@type": "HowToSupply",
            "name": "Puerto 3000/TCP abierto"
          }
        ]
      }
---

# Comenzar

## Requisitos

- Docker y Docker Compose instalados
- 4GB+ de RAM disponible por servidor
- Puerto 3000/TCP abierto (panel)
- Puerto 5520+/UDP abierto (servidores de juego)

## Instalación

### 1. Crear carpeta del proyecto

```bash
mkdir hytale && cd hytale
```

### 2. Descargar archivos de configuración

```bash
curl -O https://raw.githubusercontent.com/ketbome/hytalepanel/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/ketbome/hytalepanel/main/.env.example
```

### 3. Configurar entorno

```bash
cp .env.example .env
```

Edita `.env` con tu editor preferido:

```env
# Autenticación del Panel (¡CÁMBIALOS!)
PANEL_USER=admin
PANEL_PASS=tu_contraseña_segura
JWT_SECRET=cadena-aleatoria-opcional

# Zona horaria
TZ=America/Santiago
```

::: warning
¡Siempre cambia `PANEL_USER` y `PANEL_PASS` antes de desplegar!
:::

### 4. Iniciar el panel

```bash
docker compose up -d
```

### 5. Acceder al panel

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

Credenciales por defecto:

- **Usuario**: `admin`
- **Contraseña**: `admin`

## Crear Tu Primer Servidor

1. Inicia sesión en el panel
2. Haz clic en **"Crear Servidor"**
3. Ingresa un nombre (ej: "Mi Servidor Hytale")
4. Configura la RAM (recomendado: 4G mín, 8G máx)
5. Haz clic en **"Crear"**
6. Haz clic en **"Entrar"** para acceder al servidor
7. Ve a la pestaña **Setup** y haz clic en **"Descargar Archivos"**
8. Espera la descarga (~2GB)
9. Ve a la pestaña **Control** y haz clic en **"INICIAR"**

¡Tu servidor ya está funcionando!

::: info Cuenta de Hytale requerida
Los archivos del servidor se descargan con el `hytale-downloader` oficial, que requiere iniciar sesión con una **cuenta de Hytale** (Early Access). En la primera descarga, la pestaña Setup muestra un enlace y un código de dispositivo: abre el enlace en cualquier navegador, ingresa el código y la descarga continúa automáticamente. Las credenciales se guardan en el volumen del servidor, así que solo inicias sesión una vez.
:::

## Configuración Multi-Servidor

Puedes crear múltiples servidores, cada uno con:

- Diferentes puertos (5520, 5521, 5522, ...)
- Diferentes asignaciones de RAM
- Configuraciones de mods separadas
- Datos de mundo independientes

### Asignación de Puertos

Cada servidor necesita un puerto UDP único. El panel asigna automáticamente puertos comenzando desde 5520.

| Servidor   | Puerto   |
| ---------- | -------- |
| Servidor 1 | 5520/UDP |
| Servidor 2 | 5521/UDP |
| Servidor 3 | 5522/UDP |

Asegúrate de abrir estos puertos en tu firewall.

## Comandos Comunes

```bash
# Ver logs del panel
docker compose logs -f

# Detener panel
docker compose down

# Actualizar a última versión
docker compose pull && docker compose up -d

# Respaldar todos los servidores
tar -czvf backup-$(date +%Y%m%d).tar.gz data/
```

## Configuración de Firewall

### Linux (UFW)

```bash
# Panel
ufw allow 3000/tcp

# Servidores de juego (ajusta el rango según necesites)
ufw allow 5520:5530/udp
```

### Windows

```powershell
# Panel
New-NetFirewallRule -DisplayName "Hytale Panel" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow

# Servidores de juego
New-NetFirewallRule -DisplayName "Hytale Game" -Direction Inbound -Protocol UDP -LocalPort 5520-5530 -Action Allow
```

## Resumen de Puertos

| Servicio   | Puerto | Protocolo |
| ---------- | ------ | --------- |
| Panel Web  | 3000   | TCP       |
| Servidor 1 | 5520   | UDP       |
| Servidor 2 | 5521   | UDP       |
| ...        | ...    | UDP       |

## Siguientes Pasos

- [Configurar tus servidores](/es/guide/configuration)
- [Conocer el panel web](/es/guide/panel)
- [Instalar mods](/es/guide/mods)
- [Solución de problemas](/es/guide/troubleshooting)
