# Keep mods in sync with chezmoi

The repository is an ordinary collection of complete mod packages. The optional
chezmoi layer copies `mods/` into a Herdr app home. Code, tests, fixtures, helper
source, documentation, and licenses travel together; no file inventory or
intermediate generated source tree is needed.

`herdr-mods` is a standalone executable that supplies a dedicated chezmoi profile.
It does not install a shell function or modify your personal/work profiles.

## Install the command

Build with Node.js 24.12+ and the repository's development dependencies:

```sh
npm ci
npm run build:command
npm run install:command
herdr-mods --help
```

The build produces `.build/command/herdr-mods` for the current OS and architecture,
using Node's single-executable support. On macOS it is ad-hoc signed with
`codesign`; it is not notarized. The binary includes its Node runtime and licenses
(`herdr-mods --licenses`). If your Node distribution keeps LICENSE somewhere
other than its installation root, set `NODE_LICENSE_FILE` when building.

Installation atomically replaces `~/.local/bin/herdr-mods` only if that directory
is already on PATH. Otherwise it leaves the built binary in place and tells you
to install it in a directory on PATH. It never edits shell startup files.
Rebuild and reinstall after changing command code; ordinary mod updates need
neither step. Platform builds other than the development Mac remain unverified.

Install chezmoi separately. The command uses `chezmoi` from PATH, or the executable
specified by `HERDR_MODS_CHEZMOI`. Compatibility is tested with 2.73.3 and 2.74.1.
The command itself needs no separate Node installation. Custom mod build scripts
still require Node.js 24.12+; the panel helper also requires Go 1.23+.

## Configure this third profile

From the checkout:

```sh
herdr-mods setup --source "$PWD"
# Or select a different Herdr app home:
# herdr-mods setup --source "$PWD" --destination /path/to/herdr-app
herdr-mods info
herdr-mods approve
herdr-mods diff
herdr-mods apply --dry-run
herdr-mods apply
```

Setup creates `~/.config/herdr-mods/chezmoi.json`, honoring `XDG_CONFIG_HOME`.
`HERDR_MODS_HOME` can select another isolated profile directory. The config holds
source/destination paths and approved command arrays. Cache and persistent state
live alongside it. Setup refuses to overwrite an existing profile. To change
paths later, edit this JSON file; machine-specific paths never go in the repo.
The default destination is `HERDR_APP_HOME`, or `~/.config/herdr-app`.

Setup creates the destination directory if needed, but does not apply files.
Before the first apply, back up any existing packages
with matching names and inspect the diff. Do not have another chezmoi profile
manage these same source files. Your other profiles can still manage layouts and
settings, which this profile excludes.

`approve` shows each manifest's custom install argv and installed working directory
and asks whether it may run on each apply. `approve --yes` accepts the displayed
commands noninteractively; `revoke` disables them. Changed command arrays require
approval again. Approval trusts the package code, not just the words in argv:
review source updates before applying them.

The after-script runs approved commands **after** copying, from the installed
package, without an implicit shell. It sets `HERDR_MOD_DIR` and `HERDR_APP_HOME`.
It calls the existing build step, not the whole installer. Dry-run never builds;
repeat apply can rebuild a missing helper. Unapproved builds are reported and
skipped. Failed builds fail the command while leaving copied source files in place.
Apply complete packages before building them; partial applies are for advanced use.

## Work in either copy

Edit in the checkout, then:

```sh
herdr-mods diff
herdr-mods apply
```

Or edit the installed panel's source and tests, then:

```sh
cd "$HERDR_APP_HOME/mods/pr-panel"
node --test tests/*.test.cjs
go -C helper test ./...
herdr-mods re-add "$PWD"
# A newly created file:
herdr-mods add "$PWD/tests/new-feature.test.cjs"
```

Set `HERDR_APP_HOME` in that example, or use your configured destination path.
Review `git diff` in the checkout and run `prek run --all-files` before committing.
Re-add brings existing managed files back; add records a new file. Do not add the
whole Herdr app home. Chezmoi reserves source-name prefixes such as `private_`,
`executable_`, and `run_`; avoid those for ordinary new package files.

Local settings (`settings.json`, `settings.*.json`), dependencies, generated API
declarations, error files, compiled binaries, caches, and editor junk stay local.
They are excluded from Git and deployment. Unrelated mods and layouts stay outside
this profile. Source files use ordinary paths, so manifests remain unchanged on
apply/re-add; repository checks still validate them against the central schema.

For conflicting edits, inspect `diff` and use `merge`, or explicitly choose the
source/installed version. The wrapper does not force overwrite decisions.
Removing a source file does not automatically delete an unmanaged target: inspect
and remove the obsolete installed file explicitly. There are no `exact_` directories.

Once you choose an account and create a Git remote:

```sh
herdr-mods update --apply=false
herdr-mods diff
herdr-mods apply
```

Without a remote there is nothing to pull. Each computer needs its own checkout
and profile; a remote Herdr connection does not synchronize mod files.

## Show the mods in Herdr

File synchronization does not edit layouts. Follow the per-mod `RECIPE.md` files,
or ask an agent to integrate them into the current layout and validate the UI.
The Node installer remains available for people who do not use chezmoi. Manual
copying also works: copy a complete mod package, preserve local settings, then run
its declared custom build command with the destination environment variables.

## Verification and references

The integration test uses a disposable source, destination, and profile. It checks
copying and re-add/add, ignored files, preserved layouts/unrelated mods, script
approval and revocation, changed commands, dry-run, repeat apply, and failed builds.
Set `HERDR_MODS_CHEZMOI` to test a specific version. The test is explicitly skipped
when chezmoi is unavailable. To exercise the compiled command instead of source,
set `HERDR_MODS_TEST_COMMAND` to its absolute path.

References: [ignore rules](https://www.chezmoi.io/reference/special-files/chezmoiignore/),
[re-add](https://www.chezmoi.io/reference/commands/re-add/),
[update](https://www.chezmoi.io/reference/commands/update/),
[scripts](https://www.chezmoi.io/user-guide/use-scripts-to-perform-actions/),
[Node single executables](https://nodejs.org/api/single-executable-applications.html).
