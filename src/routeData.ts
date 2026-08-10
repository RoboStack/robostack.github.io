/* Starlight highlights a sidebar link only on an exact URL match, so the
 * "Packages" entry (which points at one distro page) would lose its active
 * state on every other distro page. Mark it current on all of them. */

import { defineRouteMiddleware } from "@astrojs/starlight/route-data";
import { DISTROS } from "./data/distros";

const DISTRO_PATHS = new Set(DISTROS.map((distro) => `/${distro.name}.html`));

export const onRequest = defineRouteMiddleware((context) => {
  if (!DISTRO_PATHS.has(context.url.pathname)) return;
  for (const entry of context.locals.starlightRoute.sidebar) {
    if (entry.type === "link" && DISTRO_PATHS.has(entry.href)) {
      entry.isCurrent = true;
    }
  }
});
