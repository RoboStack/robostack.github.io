# robostack.github.io

Source files for the [robostack.github.io](https://robostack.github.io/) website.

The site is built with [Zensical](https://zensical.org/) and has three
sections, linked from the common header:

- the frontpage - plain HTML in `overrides/home.html`, registered by `docs/index.md`
- the package page - plain HTML in `overrides/packages.html`, registered by `docs/packages/index.md`
- the documentation - the Markdown files in `docs/`

The header itself is the customized partial in `overrides/partials/header.html`:
the logo links to the frontpage, and the Packages and Documentation links sit
next to it.

# Run it locally

```
pixi run serve
```

Open server on http://127.0.0.1:8000/
