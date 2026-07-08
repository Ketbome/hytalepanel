import { defineConfig } from "vitepress";

const siteUrl = "https://hytalepanel.ketbome.com";
const title = "HytalePanel";
const description = {
  en: "Docker image for Hytale dedicated server with web admin panel, auto-download, JWT authentication, file manager, and mod support.",
  es: "Imagen Docker para servidor dedicado de Hytale con panel web, descarga automática, autenticación JWT, gestor de archivos y soporte de mods.",
  uk: "Docker образ для виділеного сервера Hytale з веб-панеллю, автозавантаженням, JWT автентифікацією, файловим менеджером та підтримкою модів.",
};

// Shared sidebar structure
const guideSidebar = (lang: string) => [
  {
    text:
      lang === "es" ? "Introducción" : lang === "uk" ? "Вступ" : "Introduction",
    items: [
      {
        text:
          lang === "es"
            ? "Comenzar"
            : lang === "uk"
              ? "Початок роботи"
              : "Getting Started",
        link: `${lang === "en" ? "" : "/" + lang}/guide/getting-started`,
      },
      {
        text:
          lang === "es"
            ? "Configuración"
            : lang === "uk"
              ? "Налаштування"
              : "Configuration",
        link: `${lang === "en" ? "" : "/" + lang}/guide/configuration`,
      },
    ],
  },
  {
    text:
      lang === "es"
        ? "Características"
        : lang === "uk"
          ? "Функції"
          : "Features",
    items: [
      {
        text:
          lang === "es"
            ? "Panel Web"
            : lang === "uk"
              ? "Веб-панель"
              : "Web Panel",
        link: `${lang === "en" ? "" : "/" + lang}/guide/panel`,
      },
      { text: "Mods", link: `${lang === "en" ? "" : "/" + lang}/guide/mods` },
    ],
  },
  {
    text: lang === "es" ? "Avanzado" : lang === "uk" ? "Розширене" : "Advanced",
    items: [
      {
        text:
          lang === "es"
            ? "Desarrollo"
            : lang === "uk"
              ? "Розробка"
              : "Development",
        link: `${lang === "en" ? "" : "/" + lang}/guide/development`,
      },
      {
        text:
          lang === "es"
            ? "Soporte ARM64"
            : lang === "uk"
              ? "Підтримка ARM64"
              : "ARM64 Support",
        link: `${lang === "en" ? "" : "/" + lang}/guide/arm64`,
      },
      {
        text:
          lang === "es"
            ? "Solución de Problemas"
            : lang === "uk"
              ? "Усунення несправностей"
              : "Troubleshooting",
        link: `${lang === "en" ? "" : "/" + lang}/guide/troubleshooting`,
      },
    ],
  },
];

const referenceSidebar = (lang: string) => [
  {
    text:
      lang === "es" ? "Referencia" : lang === "uk" ? "Довідник" : "Reference",
    items: [
      {
        text:
          lang === "es"
            ? "Variables de Entorno"
            : lang === "uk"
              ? "Змінні середовища"
              : "Environment Variables",
        link: `${lang === "en" ? "" : "/" + lang}/reference/environment`,
      },
      {
        text:
          lang === "es"
            ? "Endpoints API"
            : lang === "uk"
              ? "API Ендпоінти"
              : "API Endpoints",
        link: `${lang === "en" ? "" : "/" + lang}/reference/api`,
      },
      {
        text:
          lang === "es"
            ? "Eventos Socket"
            : lang === "uk"
              ? "Socket події"
              : "Socket Events",
        link: `${lang === "en" ? "" : "/" + lang}/reference/socket`,
      },
    ],
  },
];

export default defineConfig({
  title,
  description: description.en,
  cleanUrls: true,
  lastUpdated: true,

  sitemap: {
    hostname: siteUrl,
  },

  ignoreDeadLinks: [/^https?:\/\/localhost/],

  head: [
    // Analytics: Umami
    [
      "script",
      {
        defer: "",
        src: "https://umami.ketbome.com/script.js",
        "data-website-id": "6da06ae5-55af-4782-a1dd-9f1d909cfa91",
      },
    ],

    // Performance: Preload critical fonts (adjust if using custom fonts)
    // ['link', { rel: 'preload', href: '/fonts/font.woff2', as: 'font', type: 'font/woff2', crossorigin: '' }],

    // Performance: DNS prefetch for external resources
    ["link", { rel: "dns-prefetch", href: "https://fonts.googleapis.com" }],

    // Performance: Preload LCP image (hero logo)
    [
      "link",
      {
        rel: "preload",
        href: "/images/hytale.png",
        as: "image",
        fetchpriority: "high",
      },
    ],

    // Icons and favicons
    [
      "link",
      { rel: "icon", type: "image/x-icon", href: "/images/favicon.ico" },
    ],
    ["link", { rel: "shortcut icon", href: "/images/favicon.ico" }],
    [
      "link",
      { rel: "apple-touch-icon", sizes: "180x180", href: "/images/hytale.png" },
    ],

    // SEO: Basic meta tags
    ["meta", { name: "title", content: title }],
    ["meta", { name: "author", content: "Ketbome" }],
    [
      "meta",
      {
        name: "keywords",
        content:
          "hytale, server, docker, dedicated server, game server, web panel, admin panel, mods, modtale, jwt, authentication, hytale hosting, game server management",
      },
    ],
    [
      "meta",
      {
        name: "robots",
        content:
          "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
    ],
    ["meta", { name: "theme-color", content: "#3eaf7c" }],
    [
      "meta",
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
    ],

    // SEO: Canonical URL
    ["link", { rel: "canonical", href: siteUrl }],

    // SEO: Alternate language versions (hreflang)
    ["link", { rel: "alternate", hreflang: "en", href: siteUrl }],
    ["link", { rel: "alternate", hreflang: "es", href: `${siteUrl}/es/` }],
    ["link", { rel: "alternate", hreflang: "uk", href: `${siteUrl}/uk/` }],
    ["link", { rel: "alternate", hreflang: "x-default", href: siteUrl }],

    // Open Graph: English (default)
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:url", content: siteUrl }],
    [
      "meta",
      {
        property: "og:title",
        content: `${title} - Docker + Web Panel for Hytale Server`,
      },
    ],
    ["meta", { property: "og:description", content: description.en }],
    ["meta", { property: "og:image", content: `${siteUrl}/images/panel.png` }],
    ["meta", { property: "og:image:width", content: "1200" }],
    ["meta", { property: "og:image:height", content: "630" }],
    [
      "meta",
      { property: "og:image:alt", content: "HytalePanel Admin Interface" },
    ],
    ["meta", { property: "og:site_name", content: title }],
    ["meta", { property: "og:locale", content: "en_US" }],
    ["meta", { property: "og:locale:alternate", content: "es_ES" }],
    ["meta", { property: "og:locale:alternate", content: "uk_UA" }],

    // Twitter Cards
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
    [
      "meta",
      {
        name: "twitter:title",
        content: `${title} - Docker + Web Panel for Hytale Server`,
      },
    ],
    ["meta", { name: "twitter:description", content: description.en }],
    ["meta", { name: "twitter:image", content: `${siteUrl}/images/panel.png` }],
    [
      "meta",
      { name: "twitter:image:alt", content: "HytalePanel Admin Interface" },
    ],

    // Structured Data: Software Application
    [
      "script",
      { type: "application/ld+json" },
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: title,
        description: description.en,
        url: siteUrl,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Linux, Windows, macOS",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        author: {
          "@type": "Person",
          name: "Ketbome",
          url: "https://github.com/ketbome",
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "5",
          ratingCount: "1",
        },
        screenshot: `${siteUrl}/images/panel.png`,
        softwareVersion: "1.0",
        releaseNotes: "Docker-based Hytale server with web admin panel",
        keywords: "hytale, server, docker, game hosting, admin panel",
      }),
    ],

    // Structured Data: Organization
    [
      "script",
      { type: "application/ld+json" },
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: title,
        url: siteUrl,
        logo: `${siteUrl}/images/hytale.png`,
        sameAs: [
          "https://github.com/ketbome/hytalepanel",
          "https://minepanel.ketbome.com/",
        ],
      }),
    ],

    // Structured Data: WebSite with SearchAction
    [
      "script",
      { type: "application/ld+json" },
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: title,
        url: siteUrl,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl}/?s={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
        inLanguage: ["en", "es", "uk"],
      }),
    ],

    // Structured Data: BreadcrumbList for navigation
    [
      "script",
      { type: "application/ld+json" },
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: siteUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Guide",
            item: `${siteUrl}/guide/getting-started`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Reference",
            item: `${siteUrl}/reference/environment`,
          },
        ],
      }),
    ],
  ],

  locales: {
    root: {
      label: "English",
      lang: "en-US",
      themeConfig: {
        nav: [
          { text: "Guide", link: "/guide/getting-started" },
          { text: "Reference", link: "/reference/environment" },
          { text: "Minepanel", link: "https://minepanel.ketbome.com/" },
        ],
        sidebar: {
          "/guide/": guideSidebar("en"),
          "/reference/": referenceSidebar("en"),
        },
        editLink: {
          pattern:
            "https://github.com/ketbome/hytalepanel/edit/main/docs/:path",
          text: "Edit this page on GitHub",
        },
        lastUpdated: { text: "Last updated" },
        docFooter: { prev: "Previous", next: "Next" },
        outline: { level: [2, 3], label: "On this page" },
        returnToTopLabel: "Back to top",
        sidebarMenuLabel: "Menu",
        darkModeSwitchLabel: "Theme",
      },
    },
    es: {
      label: "Español",
      lang: "es-ES",
      link: "/es/",
      themeConfig: {
        nav: [
          { text: "Guía", link: "/es/guide/getting-started" },
          { text: "Referencia", link: "/es/reference/environment" },
          { text: "Minepanel", link: "https://minepanel.ketbome.com/" },
        ],
        sidebar: {
          "/es/guide/": guideSidebar("es"),
          "/es/reference/": referenceSidebar("es"),
        },
        editLink: {
          pattern:
            "https://github.com/ketbome/hytalepanel/edit/main/docs/:path",
          text: "Editar esta página en GitHub",
        },
        lastUpdated: { text: "Última actualización" },
        docFooter: { prev: "Anterior", next: "Siguiente" },
        outline: { level: [2, 3], label: "En esta página" },
        returnToTopLabel: "Volver arriba",
        sidebarMenuLabel: "Menú",
        darkModeSwitchLabel: "Tema",
      },
    },
    uk: {
      label: "Українська",
      lang: "uk-UA",
      link: "/uk/",
      themeConfig: {
        nav: [
          { text: "Посібник", link: "/uk/guide/getting-started" },
          { text: "Довідник", link: "/uk/reference/environment" },
          { text: "Minepanel", link: "https://minepanel.ketbome.com/" },
        ],
        sidebar: {
          "/uk/guide/": guideSidebar("uk"),
          "/uk/reference/": referenceSidebar("uk"),
        },
        editLink: {
          pattern:
            "https://github.com/ketbome/hytalepanel/edit/main/docs/:path",
          text: "Редагувати цю сторінку на GitHub",
        },
        lastUpdated: { text: "Останнє оновлення" },
        docFooter: { prev: "Попередня", next: "Наступна" },
        outline: { level: [2, 3], label: "На цій сторінці" },
        returnToTopLabel: "Повернутися нагору",
        sidebarMenuLabel: "Меню",
        darkModeSwitchLabel: "Тема",
      },
    },
  },

  themeConfig: {
    logo: "/images/hytale.png",
    siteTitle: "HytalePanel",

    socialLinks: [
      { icon: "github", link: "https://github.com/ketbome/hytalepanel" },
    ],

    search: {
      provider: "local",
      options: {
        locales: {
          es: {
            translations: {
              button: { buttonText: "Buscar", buttonAriaLabel: "Buscar" },
              modal: {
                noResultsText: "Sin resultados para",
                resetButtonTitle: "Limpiar búsqueda",
                footer: {
                  selectText: "seleccionar",
                  navigateText: "navegar",
                  closeText: "cerrar",
                },
              },
            },
          },
          uk: {
            translations: {
              button: { buttonText: "Пошук", buttonAriaLabel: "Пошук" },
              modal: {
                noResultsText: "Немає результатів для",
                resetButtonTitle: "Очистити пошук",
                footer: {
                  selectText: "вибрати",
                  navigateText: "навігація",
                  closeText: "закрити",
                },
              },
            },
          },
        },
      },
    },

    footer: {
      message: "Not affiliated with Hypixel Studios or Hytale.",
      copyright: "Free for personal and non-commercial use",
    },
  },

  // Dynamic meta tags per page and language
  transformHead({ pageData }) {
    const head: any[] = [];
    const canonicalUrl = `${siteUrl}/${pageData.relativePath.replace(/index\.md$/, "").replace(/\.md$/, "")}`;

    // Determine current language
    const lang = pageData.relativePath.startsWith("es/")
      ? "es"
      : pageData.relativePath.startsWith("uk/")
        ? "uk"
        : "en";

    // Canonical URL per page
    head.push(["link", { rel: "canonical", href: canonicalUrl }]);

    // Localized Open Graph tags
    const ogTitle =
      lang === "es"
        ? `${title} - Docker + Panel Web para Servidor Hytale`
        : lang === "uk"
          ? `${title} - Docker + Веб-панель для Сервера Hytale`
          : `${title} - Docker + Web Panel for Hytale Server`;

    head.push(["meta", { property: "og:title", content: ogTitle }]);
    head.push([
      "meta",
      { property: "og:description", content: description[lang] },
    ]);
    head.push(["meta", { property: "og:url", content: canonicalUrl }]);
    head.push([
      "meta",
      {
        property: "og:locale",
        content: lang === "es" ? "es_ES" : lang === "uk" ? "uk_UA" : "en_US",
      },
    ]);

    // Twitter Card localized
    head.push(["meta", { name: "twitter:title", content: ogTitle }]);
    head.push([
      "meta",
      { name: "twitter:description", content: description[lang] },
    ]);

    // Page-specific description for SEO
    if (pageData.description) {
      head.push([
        "meta",
        { name: "description", content: pageData.description },
      ]);
    }

    return head;
  },
});
