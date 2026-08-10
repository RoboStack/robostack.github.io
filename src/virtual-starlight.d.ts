/* Starlight's internals import `virtual:starlight/*` modules that only exist
 * inside Astro's runtime. svelte-check follows the import chain from
 * routeData.ts into them and cannot resolve the specifiers, so declare them. */
declare module "virtual:starlight/*";
