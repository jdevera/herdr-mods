# Keep mods in sync with chezmoi

## Install the collection

Follow [Install in the README](../README.md#install) to install the command,
configure the profile, apply all mods, and have an agent integrate them into Herdr.

Chezmoi copies complete packages from `mods/` into your Herdr app home. Code,
tests, fixtures, helper source, documentation, and licenses travel together.
The `herdr-mods` executable supplies a separate profile for this collection.

## Apply updates from the checkout

After editing or updating the source:

```sh
herdr-mods diff
herdr-mods apply
```

Once the checkout has a Git remote, you can pull changes for review with:

```sh
herdr-mods update --apply=false
herdr-mods diff
herdr-mods apply
```

Without a remote there is nothing to pull. Each computer needs its own checkout
and profile; a remote Herdr connection does not synchronize mod files.

## Bring installed edits back

Edit the installed mod and run its tests, following its documentation. Then bring
existing managed files back into the checkout:

```sh
herdr-mods re-add /path/to/installed/mod
```

For a new file:

```sh
herdr-mods add /path/to/installed/mod/tests/new-feature.test.cjs
```

Review `git diff` in the checkout and run `prek run --all-files` before committing.
Do not add the whole Herdr app home. Avoid chezmoi's reserved source-name prefixes,
such as `private_`, `executable_`, and `run_`, for ordinary new package files.

For conflicting edits, inspect `diff` and use `merge`, or explicitly choose the
source or installed version. Removing a source file does not automatically remove
its installed copy: inspect and remove obsolete installed files explicitly.

## Choose a different destination or profile

On first setup, select the Herdr app home explicitly:

```sh
herdr-mods setup --source "$PWD" --destination /path/to/herdr-app
herdr-mods info
```

Setup creates the destination directory if needed, but does not apply files.
The default is `HERDR_APP_HOME`, or `~/.config/herdr-app`.

Profile configuration is stored in `~/.config/herdr-mods/chezmoi.json`, honoring
`XDG_CONFIG_HOME`. Set `HERDR_MODS_HOME` to use another profile directory. Config,
cache, and persistent state are isolated from your other chezmoi profiles.
Setup refuses to replace an existing profile; edit its JSON to change paths.

Before applying over an existing installation, inspect the diff and back up
packages with matching names. Other profiles may manage your settings and layouts,
but should not manage the same mod source files. Settings, dependencies, generated
API declarations, errors, binaries, caches, and editor junk stay local.

## Command build and installation details

Rebuild and reinstall the executable after changing its code:

```sh
npm ci
npm run build:command
npm run install:command
```

This requires Node.js 24.12+. The build uses Node's single-executable support and
produces `.build/command/herdr-mods` for the current OS and architecture. On macOS
it is ad-hoc signed with `codesign`, not notarized. Other platforms remain unverified.
The binary embeds its runtime and licenses (`herdr-mods --licenses`). Set
`NODE_LICENSE_FILE` at build time if your Node distribution keeps LICENSE outside
its installation root.

Installation replaces `~/.local/bin/herdr-mods` only when that directory is on
PATH. Otherwise it leaves the built binary in place with installation instructions.
It never edits shell startup files. Ordinary mod updates don't require rebuilding
this command.

The executable needs chezmoi on PATH, or a path in `HERDR_MODS_CHEZMOI`.
Compatibility is tested with chezmoi 2.73.3 and 2.74.1. It needs no separate Node
runtime, but individual mod build commands may need Node or other tools; consult
each package's documentation.

## How build approvals work

`herdr-mods approve` reads each package’s `mod.meta.json` and displays its declared command and its installed working
directory, then asks whether it may run on apply. `approve --yes` accepts the
commands noninteractively; `revoke` disables them. Changed command arrays require
approval again. Approval trusts the package code, so review source updates too.

The after-script runs approved commands after copying, from the installed package,
without an implicit shell. It sets `HERDR_MOD_DIR` and `HERDR_APP_HOME`. Dry-run
never builds; repeat apply can rebuild missing helpers. Unapproved builds are
reported and skipped. Failed builds fail the command while leaving copied files
in place. Apply complete packages before building them.

## Verification and references

The integration test uses disposable source, destination, and profile directories.
It checks complete-package copying, runnable installed tests, re-add/add, ignored
files, preserved layouts and unrelated mods, conflicts, removals, command approval,
dry-run, repeat apply, and failed builds. Set `HERDR_MODS_CHEZMOI` to test a
particular version. The test is explicitly skipped when chezmoi is unavailable.
Set `HERDR_MODS_TEST_COMMAND` to the compiled executable's absolute path to test
that instead of the TypeScript entry point.

References: [ignore rules](https://www.chezmoi.io/reference/special-files/chezmoiignore/),
[re-add](https://www.chezmoi.io/reference/commands/re-add/),
[update](https://www.chezmoi.io/reference/commands/update/),
[scripts](https://www.chezmoi.io/user-guide/use-scripts-to-perform-actions/),
[Node single executables](https://nodejs.org/api/single-executable-applications.html).
