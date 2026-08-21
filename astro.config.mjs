// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import svelte from "@astrojs/svelte";

export default defineConfig({
  site: "https://robostack.github.io",
  // Published URLs are `GettingStarted.html`, not `GettingStarted/`. Don't change this.
  build: { format: "file" },
  integrations: [
    starlight({
      title: "RoboStack",
      description:
        "Run any ROS distro in an isolated, per-project environment. On Linux, macOS and Windows.",
      favicon: "/icon.svg",
      head: [
        {
          tag: "link",
          attrs: { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
        },
        {
          tag: "link",
          attrs: { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
        },
      ],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/RoboStack/robostack.github.io",
        },
        {
          icon: "discord",
          label: "Discord",
          href: "https://discord.gg/kKV8ZxyzY4",
        },
      ],
      editLink: {
        baseUrl:
          "https://github.com/RoboStack/robostack.github.io/edit/master/",
      },
      customCss: ["./src/styles/custom.css"],
      routeMiddleware: "./src/routeData.ts",
      components: {
        Header: "./src/components/Header.astro",
        Sidebar: "./src/components/Sidebar.astro",
        SiteTitle: "./src/components/SiteTitle.astro",
        PageTitle: "./src/components/PageTitle.astro",
      },
      sidebar: [
        // One top-level group per header tab (src/components/Header.astro);
        // the Sidebar override shows only the current page's group, so these
        // group labels never render. Slugs are set explicitly in each page's
        // frontmatter to keep the published mixed-case URLs
        // (`GettingStarted.html`, `FAQ.html`, ...).
        {
          label: "Docs",
          items: [
            { label: "Getting Started", slug: "GettingStarted" },
            {
              label: "Alternative to Pixi",
              items: [
                { label: "Micromamba", slug: "micromamba" },
                { label: "Conda", slug: "conda" },
              ],
            },
            { label: "JupyterRos", slug: "JupyterRos" },
            { label: "FAQ", slug: "FAQ" },
            // Cross-listed; its primary section is Community (the last
            // group containing a page wins in the Sidebar override).
            { label: "Contributing", slug: "Contributing" },
          ],
        },
        {
          label: "Community",
          items: [
            { label: "Community Meeting", slug: "CommunityMeeting" },
            { label: "Support", slug: "support" },
            { label: "Contributing", slug: "Contributing" },
          ],
        },
      ],
    }),
    svelte(),
  ],
});
