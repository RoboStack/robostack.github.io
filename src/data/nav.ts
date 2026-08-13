import { DISTROS, newestRelease } from "./distros";

/**
 * The site's top-level sections: one header tab each (Header.astro), and -
 * for tabs whose label matches a top-level sidebar group in astro.config.mjs
 * - the sidebar shows that group's pages (Sidebar.astro). `match` decides
 * both the active tab and which section a page belongs to, so cross-listed
 * pages (Contributing sits in Docs and Community) resolve consistently.
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
    match: /^\/(GettingStarted|micromamba|conda|JupyterRos|FAQ)/,
  },
  {
    label: "Packages",
    href: `/${newestRelease().name}.html`,
    // Active on every distro table page (/noetic.html, /lyrical.html, ...).
    match: new RegExp(`^/(${DISTROS.map((d) => d.name).join("|")})(\\.html)?$`),
  },
  {
    label: "Community",
    href: "/CommunityMeeting.html",
    match: /^\/(CommunityMeeting|support|Contributing)/,
  },
];
