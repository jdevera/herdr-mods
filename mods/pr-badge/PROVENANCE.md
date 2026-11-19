# pr-badge provenance

License: Apache-2.0, including local modifications. See LICENSE.
Derived from Herdr Desktop 0.1.16's `workspace-status` mod, cloned with `mod.clone`.
Upstream: https://github.com/herdrdev/herdr-app
Local modifications: Copyright 2026 Jacobo de Vera.

Adds focused-branch PR discovery, remote execution, caching, state colors, and GitHub Octicons.
`main.js` and `mod.json` were modified. Original clone metadata is retained.
The four git-*.svg icons are GitHub Octicons, MIT-licensed; see LICENSE-octicons.

The package and runtime references use the descriptive repository name. Code and metadata were formatted with Prettier.

RECIPE.md is original MIT-licensed setup documentation; see LICENSE-recipe.

The PR badge is omitted entirely when no pull request is available, including lookup failures; no unavailable placeholder or empty status-bar slot is rendered.

The repository-relative `$schema` metadata link was removed for unchanged copying
and chezmoi re-add. Repository checks still validate metadata against the central schema.
