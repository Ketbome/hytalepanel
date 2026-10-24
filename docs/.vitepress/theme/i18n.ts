// Theme-level strings that live outside page frontmatter (404 page, code copy states).
// Home page copy lives in each locale's index.md frontmatter under `hp`.

type Strings = {
  notFound: {
    title: string;
    lead: string;
    home: string;
    guide: string;
    search: string;
    log: string;
  };
  copy: string;
  copied: string;
};

const strings: Record<string, Strings> = {
  root: {
    notFound: {
      title: "This page isn't here",
      lead: "The link may be old, or the page moved when the docs were reorganised. Try one of these instead.",
      home: "Home",
      guide: "Getting started",
      search: "Search the docs",
      log: "No page at this path",
    },
    copy: "Copy",
    copied: "Copied",
  },
  es: {
    notFound: {
      title: "Esta página no existe",
      lead: "Puede que el enlace sea antiguo o que la página se haya movido al reorganizar la documentación. Prueba una de estas.",
      home: "Inicio",
      guide: "Comenzar",
      search: "Buscar en la documentación",
      log: "No hay ninguna página en esta ruta",
    },
    copy: "Copiar",
    copied: "Copiado",
  },
  uk: {
    notFound: {
      title: "Цієї сторінки немає",
      lead: "Можливо, посилання застаріло або сторінку перенесли під час реорганізації документації. Спробуйте одне з цих.",
      home: "Головна",
      guide: "Початок роботи",
      search: "Пошук у документації",
      log: "За цим шляхом сторінки немає",
    },
    copy: "Копіювати",
    copied: "Скопійовано",
  },
};

export function localeFromPath(path: string): "root" | "es" | "uk" {
  if (/^\/es(\/|$)/.test(path)) return "es";
  if (/^\/uk(\/|$)/.test(path)) return "uk";
  return "root";
}

export function t(locale: string): Strings {
  return strings[locale] ?? strings.root;
}
