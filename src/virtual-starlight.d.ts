/* The component overrides import `virtual:starlight/*` modules that only
 * exist inside Astro's runtime. The type checkers cannot resolve the
 * specifiers, so declare them. */
declare module "virtual:starlight/*";
