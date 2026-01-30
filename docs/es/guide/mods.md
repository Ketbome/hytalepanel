# Mods

Gestiona mods de Hytale a través del panel con soporte para Modtale y CurseForge.

## Proveedores de Mods

El panel soporta dos repositorios de mods:

| Proveedor      | Sitio Web                                              | Características                        |
| -------------- | ------------------------------------------------------ | -------------------------------------- |
| **Modtale**    | [modtale.net](https://modtale.net)                     | Repositorio dedicado de mods de Hytale |
| **CurseForge** | [curseforge.com/hytale](https://curseforge.com/hytale) | Plataforma grande multi-juego          |

Puedes usar uno o ambos proveedores. El panel detecta automáticamente de qué proveedor viene cada mod.

## Configuración

### API Key de Modtale

1. Crea una cuenta en [modtale.net](https://modtale.net)
2. Obtén tu API key desde tu perfil
3. Agrégala al `.env`:

```env
MODTALE_API_KEY=tu-api-key-aqui
```

### API Key de CurseForge

1. Ve a [console.curseforge.com](https://console.curseforge.com)
2. Crea un proyecto y obtén una API key
3. Agrégala al `.env`:

::: warning Importante
Las API keys de CurseForge contienen caracteres `$`. **Envuélvela en comillas simples** para evitar problemas:
:::

```env
CURSEFORGE_API_KEY='$2a$10$tu-key-aqui'
```

### Aplicar Cambios

Reinicia el panel después de agregar las API keys:

```bash
docker compose restart hytale-panel
```

## Usando la Pestaña de Mods

### Explorar e Instalar

1. Abre el panel y ve a la pestaña **Mods**
2. Haz clic en **Explorar** para ver los mods disponibles
3. Selecciona el proveedor (Modtale o CurseForge) usando los botones
4. Busca o explora mods
5. Haz clic en **Instalar** en el mod que quieras

El panel muestra indicadores visuales para cada proveedor:

- 🟢 Punto verde = API configurada y funcionando
- 🔴 Punto rojo = API key inválida
- ⚫ Punto gris = No configurado

### Mods Instalados

Cambia a la vista **Instalados** para ver tus mods:

- Activa/desactiva mods
- Elimina mods
- Ver detalles del mod
- Ver de qué proveedor viene cada mod (badge de Modtale o CurseForge)

### Verificar Actualizaciones

Haz clic en **Actualizaciones** para buscar versiones más nuevas de los mods instalados:

- Funciona con mods de Modtale y CurseForge
- Solo verifica mods de los proveedores que tengas configurados
- Actualización a la última versión con un clic

## Instalación Manual

Para mods que no están disponibles en los repositorios:

1. Descarga los archivos del mod (`.jar` o `.zip`)
2. Usa la pestaña **Archivos** para subir a la carpeta `mods/`
3. O coloca los archivos directamente en `./data/panel/servers/{server-id}/server/mods/`

Los mods manuales aparecen como "Local" en la lista de Instalados.

## Habilitar Mods

El servidor necesita saber dónde están los mods. Configura mediante:

### Por Servidor (Pestaña Config)

1. Ve a la pestaña **Config**
2. Establece **Args Extra** a: `--mods mods`
3. Guarda y reinicia el servidor

### Global (.env)

```env
SERVER_EXTRA_ARGS=--mods mods
```

## Carpeta de Mods Personalizada

Monta una carpeta de mods personalizada en `docker-compose.yml`:

```yaml
services:
  hytale-server:
    volumes:
      - ./server:/opt/hytale
      - ./mis-mods:/opt/hytale/mods
```

## Comandos de Mods

Comandos de consola del servidor:

```
/mods list          # Listar mods instalados
/mods reload        # Recargar todos los mods
/mods enable <mod>  # Habilitar un mod
/mods disable <mod> # Deshabilitar un mod
```

## Solución de Problemas

### "API key no configurada"

- Verifica que tu archivo `.env` tenga la key correcta
- Para CurseForge, asegúrate de que la key esté envuelta en comillas simples
- Reinicia el panel después de agregar las keys

### "API key inválida"

- Verifica que la key sea correcta (cópiala de nuevo del proveedor)
- Las keys de CurseForge empiezan con `$2a$` - esto es normal
- Verifica que la key no haya expirado

### Mods no cargan

1. Verifica que `--mods mods` esté en Args Extra o SERVER_EXTRA_ARGS
2. Verifica que los mods estén en la carpeta correcta
3. Revisa los logs del servidor por errores

### Mod de CurseForge muestra "Descarga manual requerida"

Algunos mods de CurseForge no permiten distribución por API. Visita la página del mod para descargar manualmente.

### Problemas de rendimiento

- Monitorea el uso de RAM del servidor
- Aumenta `JAVA_XMX` si es necesario
- Algunos mods requieren más recursos
