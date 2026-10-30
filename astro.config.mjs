// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import svelte from "@astrojs/svelte";

const site = "https://robostack.github.io";
const ogImage = new URL("/og.png", site).href;

export default defineConfig({
  site,
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
        { tag: "meta", attrs: { property: "og:image", content: ogImage } },
        { tag: "meta", attrs: { property: "og:image:width", content: "1200" } },
        { tag: "meta", attrs: { property: "og:image:height", content: "630" } },
        {
          tag: "meta",
          attrs: {
            property: "og:image:alt",
            content:
              "RoboStack - Manage ROS with ease. Any ROS distro, in an isolated per-project environment, on Linux, macOS and Windows.",
          },
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
        baseUrl: "https://github.com/RoboStack/robostack.github.io/edit/main/",
      },
      customCss: ["./src/styles/custom.css"],
      components: {
        Header: "./src/components/Header.astro",
        SiteTitle: "./src/components/SiteTitle.astro",
        PageTitle: "./src/components/PageTitle.astro",
      },
      sidebar: [
        // The sidebar is the Docs section: the frontpage and the distro table
        // pages have none. Every page listed here also has to match the Docs
        // tab's pattern in src/data/nav.ts, so the header highlights it.
        // Slugs are set explicitly in each page's frontmatter to keep the
        // published mixed-case URLs (`GettingStarted.html`, `FAQ.html`, ...).
        {
          label: "Use RoboStack",
          items: [
            { label: "Getting Started", slug: "GettingStarted" },
            {
              label: "Alternatives to Pixi",
              items: [
                { label: "Micromamba", slug: "micromamba" },
                { label: "Conda", slug: "conda" },
              ],
            },
            { label: "JupyterRos", slug: "JupyterRos" },
          ],
        },
        {
          label: "Get help",
          items: [
            { label: "Support", slug: "support" },
            { label: "Community Meeting", slug: "CommunityMeeting" },
            { label: "FAQ", slug: "FAQ" },
          ],
        },
        {
          label: "Contribute",
          items: [
            { label: "Contributing", slug: "Contributing" },
            { label: "RoboStack monorepo", slug: "Monorepo" },
          ],
        },
      ],
    }),
    svelte(),
  ],
});
