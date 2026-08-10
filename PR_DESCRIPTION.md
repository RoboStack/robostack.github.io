<!-- title: ci: modernize tooling with pnpm, prettier and TypeScript -->

This modernizes the website tooling: pnpm replaces npm, the pixi manifest is grouped into features, and CI got a lot stricter.

### pnpm and pixi manifest

- Start using `pnpm`
- Group the manifest into `site`, `lint` and `scripts` features, all composed into the default environment

### Linting

- Add `typos` and fix what it found in the docs
- Add `zizmor` and fix all findings
- Add `prettier` with `prettier-plugin-astro` and format the repo
- An aggregate `lint` task runs all checks
- Add CI

### Automation

- dependabot for GitHub Actions and npm, with auto-merge for non-major updates once checks pass
- A monthly `pixi upgrade` workflow that opens a PR with the dependency diff

### TypeScript

- Convert `package-table.js` and `copy-buttons.js` to typed TypeScript
- Add `astro check`
- `typescript` is pinned to 6.x because `astro check` does not support the TS 7 native compiler yet

### Python scripts

- Move both scripts under `scripts/`; `copy-to-distro-specific-channel.py` was not linted before, so it also got type hints and formatting

### Considerations before merging

- [ ] Repo settings: "Allow auto-merge" and "Allow GitHub Actions to create and approve pull requests" need to be enabled for the automation to work
- [ ] If branch protection requires the old `build` job, it has to be repointed to `checks`
- [ ] Workflow triggers now only cover `main`, `master` is gone everywhere
