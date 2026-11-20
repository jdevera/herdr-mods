# pr-badge provenance

License: Apache-2.0, including local modifications. See LICENSE.
Derived from Herdr Desktop 0.1.16's `workspace-status` mod, cloned with `mod.clone`.
Upstream: https://github.com/herdrdev/herdr-app
Local modifications: Copyright 2026 Jacobo de Vera.

The PR feature was developed locally: focused-branch PR discovery, remote
execution, caching, state colors, and the clickable badge are local additions.
Herdr did not supply this PR feature.

The package also retains Herdr's surrounding status bar. In `main.js`, the
`hint()` method (including its explanatory comment) and substantial parts of
`render()` come from `workspace-status`: machine/branch labels, agent counts,
the command-palette shortcut, and status-bar styling. This retained implementation
is why the package records Herdr as an upstream, rather than claiming the entire
file was written here. Original clone metadata is retained in `mod.json`.
The four git-*.svg icons are GitHub Octicons, MIT-licensed; see LICENSE-octicons.

The package and runtime references use the descriptive repository name. Code and metadata were formatted with Prettier.

RECIPE.md is original MIT-licensed setup documentation; see LICENSE-recipe.

The PR badge is omitted entirely when no pull request is available, including lookup failures; no unavailable placeholder or empty status-bar slot is rendered.

The repository-relative `$schema` metadata link was removed for unchanged copying
and chezmoi re-add. Repository checks still validate metadata against the central schema.

Repository description, license identifier, and any build command are now in
`mod.meta.json`. The Herdr manifest retains its title and runtime fields; tooling
reads both without duplicating the title.
