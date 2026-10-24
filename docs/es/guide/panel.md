# Panel Web

El panel web proporciona una interfaz completa para administrar múltiples servidores de Hytale desde un único dashboard.

![Dashboard de HytalePanel mostrando lista de servidores con estado en tiempo real, uso de recursos y botones de control](/images/panel.png)

## URLs y Navegación

Cada servidor tiene su propia URL para acceso directo:

```
/                     → Dashboard (lista todos los servidores)
/server/{server-id}   → Gestión de servidor específico
```

Características:

- **URLs guardables** - Guarda enlaces a servidores específicos
- **Navegación del navegador** - Los botones Atrás/Adelante funcionan correctamente
- **Acceso directo** - Comparte URLs de servidores con miembros del equipo

### Crear un Servidor

1. Haz clic en el botón **"Crear Servidor"**
2. Completa la configuración:
   - **Nombre del Servidor** - Un nombre amigable
   - **Puerto** - Puerto UDP (asignado automáticamente si no se especifica)
   - **RAM Mín / RAM Máx** - Tamaño del heap de Java (ej: 4G, 8G)
   - **Linux Nativo** - Habilitar para hosts Linux, deshabilitar para CasaOS/Windows
3. Haz clic en **"Crear"**

El servidor se crea con su propio:

- Contenedor Docker
- Directorio de datos
- Archivos de configuración

## Gestión del Servidor

Después de entrar a un servidor, tienes acceso a varias pestañas:

### Consola

- Logs del servidor en tiempo real via WebSocket
- Salida con colores para diferentes niveles de log
- Auto-scroll con opción de pausa
- Entrada de comandos para enviar al servidor

::: tip
Los comandos están deshabilitados cuando el servidor está offline.
:::

### Pestaña Setup

Gestiona la descarga de archivos del juego, actualizaciones y autenticación:

- **Estado de Descarga** - Muestra si los archivos del juego están presentes
- **Botón de Descarga** - Descarga HytaleServer.jar y Assets.zip (~2GB)
- **Seguimiento de Actualizaciones** - Muestra días desde la última actualización
- **Verificar Actualizaciones** - Re-descarga archivos del servidor para obtener la última versión
- **Aplicar Actualización** - Hace un backup del servidor primero (ver [Seguridad de las Actualizaciones](./configuration#update-safety)), descarga la última build del canal y reinicia el servidor si estaba en marcha
- **Autenticación** - Flujo OAuth de dispositivo para autenticación de Hytale

### Pestaña Files

Gestor de archivos completo para el directorio de datos del servidor:

- **Navegar** - Navegar carpetas
- **Subir** - Arrastrar y soltar o clic para subir archivos (máx 500MB)
- **Editar** - Editor de texto integrado para configs
- **Eliminar** - Eliminar archivos y carpetas
- **Descargar** - Descargar archivos como .tar

::: warning
Las operaciones de archivos requieren que el servidor esté corriendo.
:::

### Pestaña Mods

Gestiona mods del servidor con integración de Modtale y CurseForge:

- **Explorar** - Buscar en catálogos de mods (alternar entre Modtale/CurseForge)
- **Instalar** - Instalación de mods con un clic
- **Instalados** - Ver y gestionar mods instalados
- **Habilitar/Deshabilitar** - Alternar mods sin eliminarlos
- **Actualizaciones** - Verificar actualizaciones de ambos proveedores

Indicadores de estado del proveedor:

- 🟢 Verde = API funcionando
- 🔴 Rojo = Key inválida
- ⚫ Gris = No configurado

Ver [Guía de Mods](/es/guide/mods) para instrucciones de configuración.

### Pestaña Commands

Referencia rápida y botones para comandos comunes:

```
/help              - Mostrar todos los comandos
/list              - Listar jugadores conectados
/auth login device - Iniciar autenticación OAuth
/auth status       - Verificar estado de auth
/stop              - Detener el servidor
```

### Pestaña Control

Gestión del ciclo de vida del servidor:

| Botón            | Acción                                                        |
| ---------------- | ------------------------------------------------------------- |
| **INICIAR**      | Iniciar el contenedor del servidor                            |
| **REINICIAR**    | Reiniciar el servidor                                         |
| **DETENER**      | Detener el servidor graciosamente                             |
| **BORRAR DATOS** | Eliminar todos los datos del servidor (requiere confirmación) |

### Pestaña Config

Edita la configuración del servidor sin tocar archivos YAML:

| Configuración                  | Descripción                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| **Puerto**                     | Puerto UDP del juego (1024-65535)                                                   |
| **RAM Mín**                    | Heap mínimo de Java (ej: 2G, 4G)                                                    |
| **RAM Máx**                    | Heap máximo de Java (ej: 4G, 8G)                                                    |
| **Dirección de Enlace**        | Interfaz de red (por defecto: 0.0.0.0)                                              |
| **Argumentos Extra**           | Args adicionales (ej: --world-seed 123)                                             |
| **Auto-descarga**              | Habilitar descarga automática de archivos                                           |
| **Canal de Release**           | Patchline `stable` o `pre-release`                                                  |
| **Backup antes de actualizar** | Hacer backup de los mundos antes de aplicar actualizaciones (por defecto: activado) |
| **G1GC**                       | Usar recolector de basura G1 (recomendado)                                          |
| **Linux Nativo**               | Montar volúmenes machine-id (solo Linux)                                            |

::: warning
La configuración solo puede editarse cuando el servidor está detenido. Reinicia el servidor para aplicar cambios.
:::

## Autenticación

El panel usa JWT (JSON Web Tokens) para autenticación.

- Los tokens expiran después de 24 horas
- Se almacenan en localStorage del navegador

### Cambiar Credenciales

Edita tu archivo `.env`:

```env
PANEL_USER=tu_usuario
PANEL_PASS=tu_contraseña_segura
```

Luego reinicia el panel:

```bash
docker compose restart
```

## Soporte Multi-idioma

El panel soporta múltiples idiomas:

- 🇺🇸 Inglés
- 🇪🇸 Español
- 🇺🇦 Ucraniano

El idioma se detecta automáticamente desde la configuración de tu navegador.

## Estructura de Datos

Los datos de cada servidor se almacenan independientemente:

```
data/panel/
├── servers.json          # Registro y configs de servidores
└── servers/
    └── {server-id}/
        ├── docker-compose.yml  # Auto-generado
        └── server/
            ├── HytaleServer.jar
            ├── Assets.zip
            ├── universe/       # Datos del mundo
            ├── mods/           # Mods del servidor
            └── logs/           # Logs del servidor
```

## Atajos de Teclado

| Atajo     | Acción                        |
| --------- | ----------------------------- |
| `Enter`   | Enviar comando                |
| `↑` / `↓` | Navegar historial de comandos |

## Consideraciones de Seguridad

::: danger
Nunca expongas el panel a internet sin medidas de seguridad:

1. Usa un **proxy reverso** (nginx, Traefik) con HTTPS
2. Configura reglas de **firewall**
3. Usa **contraseñas fuertes**
4. Considera **VPN** para acceso remoto
   :::

### Ejemplo: Proxy Reverso con Nginx

```nginx
server {
    listen 443 ssl;
    server_name hytale.tudominio.com;

    ssl_certificate /ruta/a/cert.pem;
    ssl_certificate_key /ruta/a/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## Solución de Problemas

### "No space left on device" en Windows/Docker Desktop

Este es un bug conocido de Docker Desktop. Solución:

1. Ejecuta `wsl --shutdown` en PowerShell
2. Reinicia Docker Desktop
3. Intenta de nuevo

### El servidor no inicia

Revisa los logs del servidor para errores. Problemas comunes:

- Puerto en uso - cambia el puerto en la pestaña Config
- Archivos del juego faltantes - usa la pestaña Setup para descargar
- RAM insuficiente - aumenta RAM Máx en la pestaña Config

### La pestaña Files muestra vacío

La pestaña Files requiere que el servidor esté corriendo. Inicia el servidor primero.
