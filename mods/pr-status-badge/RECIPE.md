# PR status badge setup

Original MIT-licensed documentation; see LICENSE.

1. Read `herdr-app --skill` and the target client's installed `AGENTS.md`.
2. Inspect the current layout. Clone a shipped layout before editing it.
3. Install this complete package as `$HERDR_APP_HOME/mods/pr-status-badge`, including LICENSE, LICENSE-octicons, and PROVENANCE.md. Git and authenticated `gh` must be available on the repository machine.
4. Keep the stock `workspace-status` mod. Put its block and a `pr-status-badge` block in a row, with the badge on the right (about 130 pixels wide, 28 pixels high). Preserve the rest of the layout. The badge renders only a PR number and state icon, and opens GitHub on the viewing client. Without a matching PR it draws no badge.
5. Validate both the mod and the running client with `herdr-app check`, `herdr-app status`, and a screenshot.

The badge is independent of `pr-panel`. It follows the focused checkout, routes
Git and gh to its machine, and caches PR lookups for one minute. State colors are
gray for draft, green for open, red for closed, and purple for merged.

## Migrate the earlier replacement status bar

The former `pr-badge` package included a copy of Herdr's whole status bar.
Replace that layout reference with the stock `workspace-status`, then add the
new standalone badge beside it. After verifying the new layout, remove the old
installed `pr-badge` folder. Chezmoi does not automatically remove obsolete files.
Do not delete user configuration or unrelated customizations. The reference
arrangement is in `examples/layouts/main-pr.json`; adapt it to the existing layout.
