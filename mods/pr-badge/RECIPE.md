# PR status badge setup

This recipe is original repository documentation by Jacobo de Vera, MIT-licensed;
see LICENSE-recipe.

1. Read `herdr-app --skill` and the target client's installed `AGENTS.md`.
2. Inspect its current layout and installed mods. Clone a shipped layout before editing it.
3. Use the repository's chezmoi workflow, or copy this complete package to `$HERDR_APP_HOME/mods/pr-badge`, preserving existing settings and all license/provenance files.
4. Replace the status-bar mod reference with `pr-badge`, preserving its block placement and the rest of the layout. The badge includes the normal status bar. It uses `gh` on the repository machine. No panel or tab-bar mod is required.
5. Run `herdr-app check` on the installed mod, inspect `herdr-app status`, and visually verify the feature in the running client.

Copying the package does not change layouts. The reference arrangement
in `examples/layouts/main-pr.json` is an example, not a replacement for a user's layout.
For a previous installation under an older package name, preserve its settings,
update layout references to the new name, and retain the old folder until verified.
