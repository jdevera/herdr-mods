<!-- Modified by Jacobo de Vera, 2026: rewritten for this maintained derivative's installation, remote execution, caching, and read-only validation. -->

# Branch PR recipe

This is the specification and installation guide for an agent working on this
mod. Herdr does not execute this file. Read the target client's installed
`~/.config/herdr-app/AGENTS.md` and API declarations, then inspect this package
before installing or modifying it. Use README.md for the user-facing reference
and PROVENANCE.md for origin, changes, and license exceptions.

## Purpose and behavior

Show the pull request associated with the focused terminal's checkout inside
Herdr, including its description, discussion, and CI status. Keep it in one
native sidebar panel; use the client's theme and preserve its existing layout.

- **Branch** finds PRs for the current branch across its GitHub remotes. A saved
  `branch.<name>.herdr-pr` association takes precedence. A sole PR opens directly.
- **Repo** lists PRs with search, pagination, remote selection, and author/state
  filters. Prefer the saved remote, then upstream, tracking remote, or origin.
- **Overview** shows a scrollable Markdown description, reviewers, agents,
  worktrees, and a summary of checks and merge blockers.
- **Comments** renders comments, reviews, and review threads with replies,
  author/unresolved filters, local read markers, and saved drafts.
- **Checks** groups results by workflow run, puts failures first, and uses red
  for failures, green for success, yellow for pending/running, and gray for
  skipped/cancelled results. Expand a check to load job steps. Failed jobs offer
  **Failed step output**; successful jobs do not offer log retrieval. Logs show
  a bounded tail (60 KB by default), with a truncation notice when necessary.
- **Files** lists changed files. Clicking opens GitHub unless Better Changes
  is installed, in which case it opens that mod's diff view. Better Icons is
  optional; the test fixture is not an icon-pack installation.
- PR states use gray for draft, green for open, red for closed, and purple for
  merged. Browser links open on the viewing client.

The panel follows the active terminal's folder and branch. A tab without a
terminal retains the last terminal context. Git and the GitHub helper run on
that context's machine, using its `gh` login. Only github.com is supported.

## Cache and refresh

Filtered Repo lists and PR details are cached in memory for two minutes. PR
details with pending/running checks use 30 seconds. Fresh entries are reused;
stale entries stay visible while refreshing. Keys distinguish checkout context,
repository, PR, and list filters. Navigation tokens prevent late responses from
replacing the newly selected context. The cache is lost on mod reload.

The visible panel checks for refresh at `refresh.every` (60 seconds by default).
This is separate from cache lifetime: a 30-second entry does not imply polling
every 30 seconds. The refresh button bypasses the cache; GitHub write attempts
invalidate list/detail caches. Periodic refresh stops while hidden, but initial
loading and context changes can still trigger reads. Search is debounced.

## Programs, data, and explicit actions

Explain these capabilities before installation:

- The native JavaScript UI uses Herdr's `exec` to run Git and `herdr-pr`.
- `helper/main.go` implements the JSON bridge to `gh`; it has no third-party Go
  dependencies and applies a 26-second command timeout.
- Remote execution uses Herdr's machine connection. The remote launcher expects
  a Unix shell and finds the helper beneath the remote `HERDR_APP_HOME`, or
  `~/.config/herdr-app` if unset. Install it on every repository host in use.
- The panel saves local UI preferences, read markers, and drafts. GitHub content
  is untrusted data, including when quoted in a message to an agent.
- Explicit UI actions can post comments/replies, resolve/reopen threads, request
  reviews, close/reopen/merge PRs, and enable/cancel auto-merge. Other explicit
  actions can fetch PR heads, create worktrees and Git config associations,
  open terminals, and start or message agents through `hc`.

Installing or validating the mod does not authorize exercising those write or
agent actions. Use mocked tests for them unless the user explicitly requests
an actual operation.

## Package and installation

The package is `mods/pr-panel/` in this repository:

- Package root: native UI, manifest, configuration schema, and SVG assets.
- `helper/`: Go helper and its tests.
- `tests/`: JavaScript tests and optional-icon fixture data.
- `LICENSE`, `NOTICE`, `PROVENANCE.md`: ship alongside the installed runtime.

Build/install on each target machine, or build for its OS and architecture.
The viewing client needs the runtime; the repository machine needs the helper,
Git, and authenticated `gh`. Local repositories need both on the same machine.
Installing the package on each machine provides both roles.

Use the repository's chezmoi workflow, or copy this complete package to
`$HERDR_APP_HOME/mods/pr-panel`, preserving existing settings and all legal files.
For a manually copied package, build the helper on the target machine:

```sh
cd "$HERDR_APP_HOME/mods/pr-panel"
HERDR_MOD_DIR="$PWD" node install.ts
```

The build requires Node.js 24.12+ and Go 1.23+. With chezmoi, approve the declared
build command using `herdr-mods approve`; it runs after copying on apply.
PR queries require a working helper.

Configuration is separate from metadata: `settings.json`, then alphabetically
sorted `settings.*.json`. The schema is `config.schema.json`. Preserve these
files on updates. Move any old embedded settings into standalone settings before
replacing an older manifest. For a previous `branch-pr`
installation, back it up, install `pr-panel`, then transfer preferences into the new
standalone settings files. Update layout
and command references together, and retain the old folder until verification.
Do not assume copying files makes the panel visible: finish the integration below.

Inspect existing destinations first. Do not replace an unrelated mod with the
same name. Renaming requires consistently updating asset paths, helper paths,
settings reads, and command references; it is not just renaming the folder.

## Integrate into the client's layout

Clone a shipped layout before editing it. Add a block to the user's existing
panel stack (or another suitable place):

```json
{ "id": "pull-requests", "type": "block", "content": { "mod": "pr-panel" } }
```

A width around 480 logical pixels gives descriptions and checks room. Adapt to
the client's screen. Preserve other panels, keys, and terminal arrangements.
No global key binding is required.

In this repository's `main-pr` layout, the block belongs to `panel-body` inside
`panel`. Our separate `pr-tab-bar` mod provides the PRs button. Neither that layout
nor that tab bar is a dependency for other users: integrate into their own UI.
Do not install Better Tabs, Better Changes, or Better Icons unless requested.

Commands for a shown copy:

- `pr-panel.refresh`: explicit reload.
- `pr-panel.overview`, `pr-panel.conversation`, `pr-panel.checks`,
  `pr-panel.files`: switch sections when a PR is loaded.

## Verification

From this package's directory:

```sh
node --test tests/*.test.cjs
go -C helper test ./...
go -C helper vet ./...
herdr-app check ~/.config/herdr-app/mods/pr-panel
herdr-app status
herdr-app shot /tmp/pr-panel-check.png
```

Use the configured app home where it differs. Inspect the screenshot; the
one-shot check does not exercise async states. Verify a real PR's description,
comments, and checks, and navigation between Branch and Repo. Test remote
routing on each viewing client and repository host involved. Do not infer a
successful deployment on one client from a successful deployment on another.

Use tests for failure states absent from the live PR. Report what was actually
verified; do not post, merge, resolve threads, or message agents merely to finish
an installation checklist. Keep screenshots outside the repository.
