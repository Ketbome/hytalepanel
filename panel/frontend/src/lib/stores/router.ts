import { writable, derived } from "svelte/store";
import { activeServerId } from "./servers";

export interface Route {
  path: string;
  serverId: string | null;
}

function getBasePath(): string {
  const config = (
    window as unknown as { __PANEL_CONFIG__?: { basePath?: string } }
  ).__PANEL_CONFIG__;
  return config?.basePath || "/";
}

function parseRoute(pathname: string): Route {
  const basePath = getBasePath();
  let path = pathname;
  if (basePath !== "/" && path.startsWith(basePath)) {
    path = path.slice(basePath.length) || "/";
  }

  const serverMatch = path.match(/^\/server\/([^/]+)/);
  if (serverMatch) {
    return { path, serverId: serverMatch[1] };
  }

  return { path, serverId: null };
}

function buildUrl(serverId: string | null): string {
  const basePath = getBasePath();
  const base = basePath === "/" ? "" : basePath;

  if (serverId) {
    return `${base}/server/${serverId}`;
  }
  return base || "/";
}

export const currentRoute = writable<Route>(
  parseRoute(window.location.pathname),
);

currentRoute.subscribe((route) => {
  activeServerId.set(route.serverId);
});

export function navigateToServer(serverId: string): void {
  const url = buildUrl(serverId);
  window.history.pushState({}, "", url);
  currentRoute.set(parseRoute(url));
}

export function navigateToDashboard(): void {
  const url = buildUrl(null);
  window.history.pushState({}, "", url);
  currentRoute.set({ path: "/", serverId: null });
}

export function initRouter(): void {
  window.addEventListener("popstate", () => {
    currentRoute.set(parseRoute(window.location.pathname));
  });

  const initial = parseRoute(window.location.pathname);
  currentRoute.set(initial);
}

export const isOnDashboard = derived(
  currentRoute,
  ($route) => !$route.serverId,
);
