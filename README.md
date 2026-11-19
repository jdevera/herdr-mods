# Herdr mods

Native UI mods for Herdr Desktop, supporting local and remote repositories.

## License

MIT for original repository code, with explicit third-party exceptions in
[LICENSING.md](LICENSING.md). Each mod carries its own LICENSE and PROVENANCE.md.

## Included

`mods/workspace-status-pr/` is a personal copy of Herdr's status bar with a PR badge
for the focused terminal's branch. It uses `gh` on the repository's machine and
opens links on the viewing computer. Draft is gray, open green, closed red, and
merged purple, with GitHub Octicons. PR data refreshes once a minute.

The mod is installed on each viewing client under
`~/.config/herdr-app/mods/workspace-status-pr/`. The client's personal
`main-pr` layout references it in its status block. UI files do not automatically
sync between computers.

## Development

1. Read `herdr-app --skill` and the target client's
   `~/.config/herdr-app/AGENTS.md` and generated API declarations.
2. Edit source here, then copy the changed mod files into the target client's
   `~/.config/herdr-app/mods/workspace-status-pr/` directory. Do not replace
   unrelated mods or the client's whole layout.
3. Run `herdr-app check ~/.config/herdr-app/mods/workspace-status-pr` on that
   client. Check `herdr-app status` for errors and inspect `herdr-app shot`.
4. For remote clients, identify the target with `hc machine ls`, then use
   `hc file` / `hc exec --on <machine>` to deploy and verify there.

No build step is required for this JavaScript mod. The app reloads installed
files when they change. Source edits in this repository are not deployed automatically.

## Pull request panel

**PRs**, beside Files and Changes, opens Branch PR 2.4.0 on each installed client.
It follows the current branch and provides Overview (scrollable Markdown),
Comments (including review threads), Checks (workflows, jobs, steps and failed
logs), and Files. Failed checks appear red and sort before healthy workflows.
The existing status-bar badge is preserved. Refresh is automatic while visible.
Branch/Repo navigation reuses cached lists and details for two minutes; stale
content stays visible during refresh. Running checks use a shorter cache, and
the refresh button always reloads. Failed-job logs remain available in Checks.

The attributed upstream source is in `mods/branch-pr/`;
`mods/tabs-pr/` adds the button to a clone of Herdr's tab bar.
`layouts/main-pr.json` is a reference; installation patches each client's own
layout and saves backups under `~/.config/herdr-app/backups/pr-panel-*`.

Git and GitHub calls run on the repository's machine. That machine needs the
helper installed and a working `gh` login; links open on the viewing client.
The remote launcher supports Unix/macOS homes and `HERDR_APP_HOME`.
The optional `tools.github` setting names a binary on the repository machine.

Build and install locally (Go 1.23+, Node for tests):

```sh
mkdir -p .build
go -C mods/branch-pr/helper build -o "$PWD/.build/herdr-pr" .
node --test mods/branch-pr/tests/*.test.cjs
go -C mods/branch-pr/helper test ./...
python3 scripts/install.py
herdr-app check ~/.config/herdr-app/mods/branch-pr
herdr-app check ~/.config/herdr-app/mods/tabs-pr
herdr-app status
```

For another client, stage `scripts/install.py`, `mods/tabs-pr`, `mods/workspace-status-pr`, the Branch PR
runtime directory, `mods/branch-pr/LICENSE`, `mods/branch-pr/NOTICE`,
`mods/branch-pr/PROVENANCE.md`, and
`.build/herdr-pr`, preserving their relative paths, then run the installer there.
Build the helper for that client's OS/architecture; do not assume it matches the build machine.
The installer expects the existing personal `main-pr` layout.

Section commands are `herdr-app do branch-pr.overview`, `.conversation`,
`.checks`, or `.files` (each with the `branch-pr` prefix). The panel must be shown
and have a PR loaded. `branch-pr.refresh` refreshes it.

The panel includes explicit GitHub write and agent-handoff controls. Installation
and validation did not exercise them. File diffs open GitHub unless the optional
Better Changes mod is installed.

See [the PR panel brief](docs/pr-panel.md) for research and validation.
See [LICENSING.md](LICENSING.md) for license scope and per-mod provenance.
