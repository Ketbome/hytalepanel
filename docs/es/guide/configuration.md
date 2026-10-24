# Configuración

Toda la configuración se realiza mediante variables de entorno en tu archivo `.env`.

## Configuración del Servidor

| Variable            | Por defecto | Descripción                       |
| ------------------- | ----------- | --------------------------------- |
| `JAVA_XMS`          | `4G`        | Asignación mínima de RAM          |
| `JAVA_XMX`          | `8G`        | Asignación máxima de RAM          |
| `BIND_PORT`         | `5520`      | Puerto UDP del servidor           |
| `AUTO_DOWNLOAD`     | `true`      | Descarga automática (solo x64)    |
| `SERVER_EXTRA_ARGS` | -           | Argumentos extra para el servidor |
| `TZ`                | `UTC`       | Zona horaria para logs            |

### Argumentos del Servidor {#server-arguments}

`SERVER_EXTRA_ARGS` (o el campo **Argumentos Extra** de cada servidor en la pestaña **Config** del panel) se añade a la línea de comandos del servidor. Así también se pasa la opción `--transport` añadida en Update 8, que selecciona el transporte de red del servidor:

```env
SERVER_EXTRA_ARGS=--transport <transporte>
```

Desde Update 8 el servidor usa el transporte quiche por defecto (consulta [Soporte ARM64](./arm64#network-transport) para el fallback a netty). Revisa el manual oficial del servidor de Hytale para ver los valores aceptados.

## Canales de Release

Cada servidor puede seguir una de las patchlines oficiales de `hytale-downloader`, seleccionable en la pestaña **Config** del panel:

| Canal         | Descripción                                          |
| ------------- | ---------------------------------------------------- |
| `stable`      | Builds de producción (por defecto, recomendado)      |
| `pre-release` | Últimas novedades, puede contener bugs               |

La verificación de actualizaciones de la pestaña **Setup** compara la versión instalada con la última disponible en el canal del servidor (vía `hytale-downloader -print-version`), por lo que "Actualización disponible" refleja la versión remota real y no la antigüedad de los archivos.

### Seguridad de las Actualizaciones {#update-safety}

Las actualizaciones del servidor pueden actualizar tus mundos en el sitio, y esas actualizaciones son **de un solo sentido**:

- Update 7 actualizó los datos de block-sections del mundo a v7. Un mundo cargado en esa versión no se puede abrir en una anterior.
- Update 8 (pre-release) migra `universe/events.json` a `universe/resources/GlobalWorldEvents.json`. Los servidores anteriores no lo leen.

Por eso el panel crea un backup (con el mismo contenido que la pestaña **Backups**) antes de aplicar una actualización desde la pestaña **Setup**. Si el backup falla, la actualización se cancela y no se descarga nada. Se controla por servidor con **Hacer backup de los mundos antes de aplicar actualizaciones** en la pestaña **Config**. Está activado por defecto, y los servidores creados antes de que existiera la opción se comportan como activados.

Cambiar un servidor de `pre-release` a `stable` pide confirmación: los mundos abiertos en una build pre-release más reciente podrían no cargar en la build estable anterior, así que haz un backup antes. Cambiar de `stable` a `pre-release` muestra un aviso más corto, porque tus mundos se migrarán de forma irreversible en cuanto la nueva build los abra.

::: warning
Restaurar un backup es la única forma de volver a llevar un mundo actualizado a una build anterior. Conserva al menos un backup hecho con la versión anterior hasta que estés conforme con la actualización.
:::

### Comando `/update` Integrado {#built-in-update}

Los servidores de Hytale incluyen un actualizador integrado (`UpdateModule`, los comandos `/update`). No está soportado en esta imagen, por diseño: espera el lanzador oficial `start.sh` y la estructura de carpetas `Server/`, y depende de que el lanzador gestione el código de salida 8 para instalar la nueva build y reiniciar. Esta imagen arranca `HytaleServer.jar` directamente, así que las actualizaciones las gestiona el panel (pestaña **Setup**), que descarga la build del canal del servidor con `hytale-downloader` y hace un backup antes.

## Configuración del Panel

| Variable             | Por defecto | Descripción             |
| -------------------- | ----------- | ----------------------- |
| `PANEL_USER`         | `admin`     | Usuario de login        |
| `PANEL_PASS`         | `admin`     | Contraseña de login     |
| `PANEL_PORT`         | `3000`      | Puerto HTTP del panel   |
| `JWT_SECRET`         | (aleatorio) | Clave de firma JWT      |
| `MODTALE_API_KEY`    | -           | API key para Modtale    |
| `CURSEFORGE_API_KEY` | -           | API key para CurseForge |

## `config.json` del Servidor {#server-config-json}

El servidor de Hytale guarda su propia configuración en `config.json`, en la carpeta raíz del servidor (`/opt/hytale/config.json` dentro del contenedor, `data/servers/{server-id}/server/config.json` en el host). Edítalo desde la pestaña **Files** del panel y reinicia el servidor para aplicar los cambios. Se incluye en los backups.

### SentryDsn

Desde el hotfix 0.7.3 de Update 7 el servidor lee una clave opcional `SentryDsn`. Asígnale un DSN de tu propio proyecto de [Sentry](https://sentry.io) para recibir ahí los errores del servidor y de los plugins:

```json
{
  "SentryDsn": "https://<public-key>@<tu-host-sentry>/<project-id>"
}
```

| Valor             | Comportamiento                                                      |
| ----------------- | ------------------------------------------------------------------- |
| Clave no presente | Sin cambios (comportamiento por defecto del servidor)               |
| `""` (vacío)      | Reporte de errores desactivado                                      |
| Un DSN            | Errores del servidor y de los plugins enviados a tu proyecto Sentry |

Añade la clave junto a las existentes; no reemplaces el archivo completo.

## Server Discovery {#server-discovery}

La lista oficial de servidores de Hytale (Server Discovery) se gestiona fuera del panel:

1. Crea un perfil de servidor en **Hytale Account Manager → Server Profiles**.
2. Verifica tu dominio añadiendo el registro DNS **TXT** que te indica.
3. El listado pasa por la moderación de Hytale antes de mostrarse.
4. Dentro del juego, un operador (OP) genera un token de discovery para el servidor.

A partir de ahí el servidor envía los heartbeats de discovery por su cuenta usando ese token. No hay nada que configurar en el panel. Solo asegúrate de que el puerto del juego (`BIND_PORT`, UDP) sea accesible desde internet.

## Guía de RAM

| Jugadores | `JAVA_XMX` Recomendado |
| --------- | ---------------------- |
| 1-10      | 4G                     |
| 10-20     | 6G                     |
| 20-50     | 8G                     |
| 50+       | 12G+                   |

## Ejemplo de Configuración

```bash
# Recursos del Servidor
JAVA_XMS=4G
JAVA_XMX=8G
BIND_PORT=5520

# Descarga automática
AUTO_DOWNLOAD=true

# Argumentos extra (ej. para mods)
SERVER_EXTRA_ARGS=--mods mods

# Autenticación del Panel
PANEL_USER=miadmin
PANEL_PASS=contraseñasupersegura123
JWT_SECRET=mi-clave-secreta-aleatoria

# Zona horaria
TZ=Europe/Madrid

# Integración Modtale (opcional)
MODTALE_API_KEY=tu-api-key

# Integración CurseForge (opcional - nota las comillas simples!)
CURSEFORGE_API_KEY='$2a$10$tu-key-aqui'
```

## Personalización de Docker Compose

Puedes personalizar volúmenes y puertos en `docker-compose.yml`:

```yaml
services:
  hytale-server:
    volumes:
      - ./server:/opt/hytale
      - ./mis-mods:/opt/hytale/mods
    ports:
      - "5520:5520/udp"
    environment:
      - JAVA_XMX=16G

  hytale-panel:
    ports:
      - "8080:3000" # Cambiar puerto del panel a 8080
```

## Zonas Horarias Comunes

| Región    | Zona Horaria           |
| --------- | ---------------------- |
| España    | `Europe/Madrid`        |
| México    | `America/Mexico_City`  |
| Argentina | `America/Buenos_Aires` |
| Colombia  | `America/Bogota`       |
| Chile     | `America/Santiago`     |

[Lista completa de zonas horarias](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
