---
layout: home
markdownStyles: false
footer: false
pageClass: hp-home-page

head:
  - - meta
    - name: description
      content: Imagen Docker para servidor dedicado de Hytale con panel web de administración, autenticación JWT, consola en tiempo real, gestor de archivos y soporte completo de mods.
  - - meta
    - name: keywords
      content: hytale servidor, docker, servidor dedicado, panel web, mods, autenticación jwt, gestor archivos, consola tiempo real

hp:
  hero:
    title: [Servidores de Hytale, desde el navegador]
    lead: HytalePanel es una imagen Docker y un panel web gratuitos para alojar Hytale. Consola en vivo, archivos, mods y copias de seguridad para cada servidor que tengas.
    primary: { text: Comenzar, link: /es/guide/getting-started }
    secondary: { text: GitHub, link: https://github.com/ketbome/hytalepanel }
    hint: "La consola reproduce el arranque real de un servidor. También acepta comandos: prueba /help."
  console:
    online: En línea
    offline: Desconectado
    starting: Iniciando…
    stopping: Deteniendo…
    up: activo {time}
    placeholder: Escribe un comando — Tab autocompleta
    offlinePlaceholder: Servidor desconectado
    send: Enviar
    start: Iniciar
    stop: Detener
    log: Salida de la consola
    command: Comando del servidor
  steps:
    title: Cómo funciona
    running: En ejecución
    downloading: Descargando…
    players: "{n} jugadores"
    items:
      - Un archivo compose arranca el panel.
      - El panel crea cada servidor en su propio contenedor.
      - Descarga los archivos del juego con tu cuenta de Hytale.
      - Tus amigos se conectan al puerto 5520.
  showcase:
    title: Una pantalla por servidor
    text: La consola sigue abierta junto a las pestañas en las que trabajas. Control, instalación, archivos, mods, copias y ajustes, sin perder de vista el log.
    alt: Vista de servidor de HytalePanel, con la consola en vivo a la izquierda y la pestaña Mods a la derecha
    list: Todos tus servidores en una lista, con su puerto, memoria y contenedor.
    listAlt: La lista de servidores con tres servidores, su estado, puerto, memoria y contenedor
  compare:
    title: Lo que reemplaza
    text: Todo lo que harías por SSH, en una terminal, con un script que tienes que recordar.
    label: Tarea
    ours: HytalePanel
    theirs: A mano
    rows:
      - { name: "Consola", ours: "En vivo en el navegador, filtrada por nivel", theirs: "Una sesión SSH dentro de screen" }
      - { name: "Archivos", ours: "Explorar, editar, subir y descargar", theirs: "scp y un editor de terminal" }
      - { name: "Mods", ours: "Busca en Modtale y CurseForge, instala con un clic", theirs: "Descargar cada jar y copiarlo" }
      - { name: "Copias de seguridad", ours: "Programadas, guardando las que elijas", theirs: "Un cron que escribes tú" }
      - { name: "Actualizaciones", ours: "Comprueba y actualiza desde la pestaña Instalación", theirs: "Volver a ejecutar el descargador" }
      - { name: "Más servidores", ours: "Un panel, con contenedor y puerto propios para cada uno", theirs: "Una carpeta, un puerto y un script para cada uno" }
      - { name: "Acceso", ours: "Una contraseña, o tu proxy SSO delante", theirs: "Quien tenga la clave SSH" }
  faq:
    title: Preguntas
    items:
      - q: ¿Necesito una cuenta de Hytale?
        a: Sí. Los archivos del juego vienen del <code>hytale-downloader</code> oficial, que te pide iniciar sesión una vez con un código de dispositivo. La sesión se guarda en el volumen del servidor.
      - q: ¿Cuánta memoria necesita un servidor?
        a: Unos 4 GB para hasta diez jugadores. Dale 6 GB para veinte y 8 GB para cincuenta.
      - q: ¿Funciona en ARM64 o en una Raspberry Pi?
        a: El servidor funciona de forma nativa en ARM64. La descarga automática solo existe para x64, así que copia <code>HytaleServer.jar</code> y <code>Assets.zip</code> a mano.
      - q: ¿Puedo usarlo en Windows?
        a: Sí, con Docker Desktop. Define <code>HOST_DATA_PATH</code> en <code>.env</code> con una ruta absoluta y barras normales (/).
      - q: ¿Puede ir detrás de mi propio inicio de sesión?
        a: Usa <code>DISABLE_AUTH=true</code> cuando un proxy como Authentik gestiona el acceso, y <code>BASE_PATH=/panel</code> para servirlo bajo una ruta.
      - q: ¿Dónde se guardan mis mundos?
        a: En <code>./data</code>, junto a tu archivo compose. Cada servidor monta su propia carpeta desde ahí, así que moverlo o copiarlo es copiar archivos.
      - q: ¿En qué idiomas está el panel?
        a: Inglés, español, ucraniano y portugués de Brasil. Esta documentación está en inglés, español y ucraniano.
      - q: ¿Es gratis?
        a: Gratis para uso personal, educativo y sin ánimo de lucro, y para pequeñas empresas. Alojar servidores de pago con él requiere permiso por escrito.
  close:
    title: [Empieza en, cinco líneas]
    text: Después abre localhost:3000, inicia sesión y crea tu primer servidor. La guía cubre cada paso.
    action: { text: Leer la guía, link: /es/guide/getting-started }
    copy: Copiar
    copied: Copiado
    comment: cambia PANEL_USER y PANEL_PASS
  footer:
    statement: Una herramienta de la comunidad para alojar servidores dedicados de Hytale.
    legal: Sin afiliación con Hypixel Studios ni Hytale. Gratis para uso personal y no comercial.
    navTitle: Documentación
    nav:
      - { text: Guía, link: /es/guide/getting-started }
      - { text: Referencia, link: /es/reference/environment }
      - { text: GitHub, link: https://github.com/ketbome/hytalepanel }
      - { text: Minepanel, link: https://minepanel.ketbome.com/ }
    langTitle: Idioma
    imageTitle: Imágenes Docker
    issue: { text: ¿Encontraste un error? Abre un issue, link: https://github.com/ketbome/hytalepanel/issues }
---

<HomePage />
