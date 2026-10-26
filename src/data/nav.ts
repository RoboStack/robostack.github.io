import { DISTROS, newestRelease } from "./distros";

/**
 * The site's top-level sections, one header tab each (Header.astro). `match`
 * decides which tab is active for a page. Every docs page in the sidebar in
 * `astro.config.mjs` has to match the Docs pattern.
 */
export interface NavTab {
  label: string;
  href: string;
  match: RegExp;
}

export const NAV_TABS: NavTab[] = [
  { label: "Home", href: "/index.html", match: /^\/(index(\.html)?)?$/ },
  {
    label: "Docs",
    href: "/GettingStarted.html",
    match:
      /^\/(GettingStarted|micromamba|conda|JupyterRos|FAQ|support|CommunityMeeting|Contributing|Monorepo)/,
  },
  {
    label: "Packages",
    href: `/${newestRelease().name}.html`,
    // Active on every distro table page (/noetic.html, /lyrical.html, ...).
    match: new RegExp(`^/(${DISTROS.map((d) => d.name).join("|")})(\\.html)?$`),
  },
];
