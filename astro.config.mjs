// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://robostack.github.io',
  // Published URLs are `GettingStarted.html`, not `GettingStarted/`. Don't change this.
  build: { format: 'file' },
  integrations: [
    starlight({
      title: 'RoboStack',
      description:
        'Run any ROS distro in an isolated, per-project environment. On Linux, macOS and Windows.',
      favicon: '/favicon.svg',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/RoboStack/robostack.github.io',
        },
        { icon: 'discord', label: 'Discord', href: 'https://discord.gg/kKV8ZxyzY4' },
      ],
      editLink: {
        baseUrl: 'https://github.com/RoboStack/robostack.github.io/edit/master/',
      },
      customCss: ['./src/styles/custom.css'],
      components: {
        SiteTitle: './src/components/SiteTitle.astro',
        PageTitle: './src/components/PageTitle.astro',
      },
      sidebar: [
        // Slugs are set explicitly in each page's frontmatter to keep the
        // published mixed-case URLs (`GettingStarted.html`, `FAQ.html`, ...).
        { label: 'Getting Started', slug: 'GettingStarted' },
        {
          label: 'Alternative to Pixi',
          items: [
            { label: 'Micromamba', slug: 'micromamba' },
            { label: 'Conda', slug: 'conda' },
          ],
        },
        { label: 'Packages', link: '/lyrical.html' },
        { label: 'JupyterRos', slug: 'JupyterRos' },
        { label: 'Support', slug: 'support' },
        { label: 'Contributing', slug: 'Contributing' },
        { label: 'FAQ', slug: 'FAQ' },
      ],
    }),
  ],
});
