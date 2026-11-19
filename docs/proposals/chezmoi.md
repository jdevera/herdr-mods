# Optional chezmoi deployment for Herdr mods

Status: proposal, not implemented. Baseline: `7356ec2` on `main`.
Researched against chezmoi 2.74.1 on 2026-11-19.

## Copy complete mod packages

Use chezmoi as a third, isolated personal profile. Copy the ordinary files under
`mods/` into the Herdr app home, keeping the same relative paths:

```text
repository/mods/pr-panel/tests/pr.test.cjs
    → HERDR_APP_HOME/mods/pr-panel/tests/pr.test.cjs
```

Include code, assets, tests, fixtures, helper source, build scripts, documentation,
and all licenses/notices/provenance. An installed mod should also be a usable
place to develop that mod: edit code, run tests, edit tests, and bring the changes
back into the repository.

Exclude local-only files we would not want in the repository: user settings,
installed dependencies, compiled binaries, caches, generated Herdr declarations,
and error files. There is no separate deployable-file inventory. Git ignores and
chezmoi ignores should express the same intent for those files, with tests for
their behavior because their pattern syntax differs.

The chezmoi-specific layer stays small: profile configuration, ignore rules, and
after-scripts that call existing build commands. The mods remain ordinary,
independently copyable packages. Keep the current Node installer as an optional
convenience for non-chezmoi users during the transition; personal deployment uses
chezmoi directly for copying and updates.

## Consistent package layout

The badge and tab bar already have `main.js` at the package root. Propose moving
`pr-panel/runtime/*` up into `pr-panel/` so its source path matches the installed
path as well. Keep the helper and tests alongside the UI:

```text
mods/pr-panel/
    main.js
    mod.json
    config.schema.json
    settings.js
    actions/ github/ icons/ state/ views/
    helper/                 # Go source, go.mod, and tests
    tests/                  # JavaScript tests and fixtures
    install.ts              # helper build step, usable from either copy
    LICENSE, NOTICE, PROVENANCE.md, LICENSE-install
    README.md, RECIPE.md
```

Update relative paths in tests, scripts, documentation, and provenance together.
Tests must resolve files relative to their own package, not require the original
checkout path. The current panel tests use Node's built-in runner; its Go tests
use the standard Go toolchain. Neither needs the repository's development npm
dependencies.

Keep metadata validation in the central `schemas/mod.schema.json`. Remove
repository-relative `$schema` links from mod metadata instead of rewriting the
files on deployment; optional workspace editor associations can reference that
central schema. Keep `config.schema.json` inside each package for local settings.
Repository-wide lint, formatting, schema/license checks, and commit hooks still
run in the source checkout after bringing changes back.

Recipes should describe copying the complete package and building its helper,
without requiring chezmoi. The optional Node installer should follow the same
complete-package convention, preserving local settings and excluding artifacts.

## What the profile manages

Set the source to this repository and the destination to the chosen Herdr app
home. Manage `mods/` and the relevant build scripts under `.chezmoiscripts/`.
Leave unrelated repository-root files and the user's layouts outside this mapping.
Within each mod, copy normal source files by default, including newly added tests.

Exclude:

- `settings.json` and `settings.*.json`: personal configuration.
- `node_modules/` and other dependency/cache directories.
- `bin/` and other build outputs: compiled locally as needed.
- Herdr-generated `*.d.ts`, `jsconfig.json`, and `*.error` files.
- Editor swap files, OS junk, and temporary files.

Do not use `exact_` directories: unmanaged settings and generated files must
survive apply. Source-file removals need explicit cleanup of the corresponding
managed targets; never delete all unmanaged files to make a directory match.
Validate ignore behavior with representative fixtures, including nested tests
and their licenses. Keep new files whose names collide with chezmoi's reserved
source attributes out of the package naming convention.

Reference: [chezmoi ignore rules](https://www.chezmoi.io/reference/special-files/chezmoiignore/).

## Develop in either location

Use a dedicated config, checkout, persistent-state database, and cache for this
third profile. Keep machine-specific paths in personal configuration. A local
`herdr-mods` shell function can supply the profile flags and forward commands to
chezmoi. Personal/work profiles must not manage the same package source files;
they may manage the local settings or layouts this profile leaves alone.

With that profile configured, development in an installed panel would look like:

```sh
cd "$HERDR_APP_HOME/mods/pr-panel"
# Edit code and tests here.
node --test tests/*.test.cjs
go -C helper test ./...

# Existing managed files, including edited tests:
herdr-mods re-add "$HERDR_APP_HOME/mods/pr-panel"

# A newly created test not yet managed by chezmoi:
herdr-mods add "$HERDR_APP_HOME/mods/pr-panel/tests/new-feature.test.cjs"
```

Then review `git diff` in the source checkout, run `prek run --all-files`, and
commit. Do not recursively add the whole Herdr config directory. Re-add updates
existing managed files; add records new files. Apply respects files kept outside
this profile, such as personal settings.

The other direction is equally ordinary: edit files in `mods/`, then run
`herdr-mods diff` and `herdr-mods apply`. Herdr reloads its installed copy. Tests
run from either location; repository-wide checks and commits happen in the checkout.

Once a remote and ownership have been chosen, `herdr-mods update --apply=false`
pulls changes for inspection, followed by diff and apply. `update` alone pulls
and applies. No remote exists yet; this proposal creates none. Each machine needs
its own checkout/profile. Git shares commits; the remote Herdr connection does
not synchronize files.

References: [re-add](https://www.chezmoi.io/reference/commands/re-add/),
[add](https://www.chezmoi.io/reference/commands/add/),
[update](https://www.chezmoi.io/reference/commands/update/),
[multiple profiles](https://www.chezmoi.io/user-guide/frequently-asked-questions/design/#can-chezmoi-support-multiple-sources-or-multiple-source-states).

## Build additions and UI setup

An after-script calls the panel's existing `install.ts` helper build with
`HERDR_MOD_DIR` and `HERDR_APP_HOME`. It does not call the whole Node installer to
recopy files. The build step resolves its helper source relative to itself, so
it can also run from the installed package during local development.

Keep command arrays and explicit build opt-in. Show changed commands in the
script diff and preserve visible failures. Start with an idempotent after-script
using Go's build cache. Avoid complicated build caching until needed. Dry-run
must not build or change files; applying again must remain safe.

An agent follows each mod's recipe for initial layout integration and visual
verification. Layouts remain outside this profile's ownership, and can be managed
by the user's existing dotfile profile. A headless repository machine can build
and test the helper without requiring the Herdr GUI.

Reference: [chezmoi scripts](https://www.chezmoi.io/user-guide/use-scripts-to-perform-actions/).

## Research and acceptance criteria

The official [chezmoi 2.74.1 release](https://github.com/twpayne/chezmoi/releases/tag/v2.74.1)
was downloaded into a temporary directory and its SHA-256 checked against the
published checksum. The system installation was not upgraded. Isolated tests
verified direct file mapping, apply, installed edits returning through re-add,
preservation of unmanaged settings/generated files, after-script execution, and
no script execution during dry-run. No real profiles were changed.

Implementation should:

1. Flatten the panel's runtime directory and fix its package-relative paths.
2. Add the small profile adapter with complete-package copying and local-only
   exclusions. Align the optional installer with that packaging convention.
3. Run the actual JavaScript and Go tests from a disposable installed copy.
4. Edit both code and tests in that copy, re-add them, and verify the source
   changes; also add a new test and verify it lands in the correct source folder.
5. Verify updates, conflicts, removals, preserved local settings, build opt-in,
   failed builds, and repeat application.
6. Verify manual copying still works without chezmoi.
7. Review a real client's diff, back up its current installation, apply, and
   validate visually. Repeat explicitly for each additional machine.

This branch contains the proposal only. Package restructuring and real profile
setup have not started.
