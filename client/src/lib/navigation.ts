import { useEffect, useState } from "react";

/** The landing page lives at "/", the tracker itself at "/app". */
export type Route = "landing" | "app";

function routeFor(pathname: string): Route {
  return pathname.startsWith("/app") ? "app" : "landing";
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
