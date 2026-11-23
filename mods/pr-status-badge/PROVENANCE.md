# PR status badge provenance

License: MIT; see LICENSE.
Source: Original PR discovery and badge implementation developed in this repository.
Local modifications: Copyright 2026 Jacobo de Vera.

The earlier `pr-badge` package wrapped this functionality in a copy of Herdr
Desktop 0.1.16's Apache-2.0 `workspace-status` mod. This standalone package removes
that inherited status-bar implementation, including its command-palette hint,
machine and branch labels, agent counts, and surrounding render method. It draws
only the locally developed PR badge, usable alongside Herdr's unmodified status
bar or inside the configurable status bar.
The earlier derivative remains recorded in Git history under its original license.

The four `icons/git-*.svg` assets are GitHub Octicons under MIT. Their contents
are unchanged; preserve LICENSE-octicons with the package. RECIPE.md and tests
are original MIT-licensed work covered by LICENSE.

Local modifications: Added optional Status Bar API v1 integration and a shared
standalone/bar presentation. client.js is original MIT code from mods/status-bar
in this repository. Git and GitHub lookup routing and the Octicons are preserved.
