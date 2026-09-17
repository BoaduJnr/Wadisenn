import { useEffect, useState } from "react";

/**
 * Three entry points, switched on `location.pathname` rather than with a
 * router dependency:
 *
 *   /app     always the tracker   (the manifest's start_url)
 *   /about   always the marketing page
 *   /        the marketing page in a browser, the tracker in the installed app
 *
 * The manifest does the real work: an installed app launches at /app, so it
 * never sees the marketing page. The display-mode check on "/" is the backstop
 * for when a standalone window ends up at the root anyway — a shared link, a
 * platform that ignores start_url, or an older install.
 */
export type Route = "app" | "about";

/**
 * Whether we are running as an installed app rather than in a browser tab.
 *
 * `display-mode` covers Android, desktop and current iOS; `navigator.standalone`
 * is the non-standard flag older iOS Safari uses and is checked as a fallback.
 */
export function isInstalledApp(): boolean {
  for (const mode of ["standalone", "fullscreen", "minimal-ui", "window-controls-overlay"]) {
    if (globalThis.matchMedia?.(`(display-mode: ${mode})`).matches) return true;
  }
  return (globalThis.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * Matches a whole path segment, so "/about" and "/about/faq" both count but
 * "/aboutus" does not — a bare startsWith would claim that too.
 */
function isUnder(pathname: string, segment: string): boolean {
  return pathname === segment || pathname.startsWith(segment + "/");
}

function routeFor(pathname: string): Route {
  // Trailing slashes are equivalent, so "/about/" is still the about page.
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  if (isUnder(path, "/app")) return "app";
  if (isUnder(path, "/about")) return "about";

  // The root, and anything unrecognised, depends on how we were opened.
  return isInstalledApp() ? "app" : "about";
}

export function navigate(path: string) {
  globalThis.history.pushState({}, "", path);
  globalThis.dispatchEvent(new PopStateEvent("popstate"));
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => routeFor(globalThis.location.pathname));

  useEffect(() => {
    const onPopState = () => setRoute(routeFor(globalThis.location.pathname));
    globalThis.addEventListener("popstate", onPopState);
    return () => globalThis.removeEventListener("popstate", onPopState);
  }, []);

  return route;
}
