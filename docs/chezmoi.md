# Set up and update the collection

## Install everything

From a checkout:

```sh
sh setup.sh
```

Setup checks prerequisites, lets you choose the mod build commands, installs the
`herdr-mods` executable, and applies the mods through an isolated chezmoi profile.
It explains what it is doing and leaves conflict decisions to chezmoi. Follow the
README's agent prompt to integrate the installed mods into your Herdr layout.

To reuse a particular checkout:

```sh
sh setup.sh --source /path/to/herdr-mods
```

To let chezmoi clone first, use a standalone copy of `setup.sh`:

```sh
sh /path/to/setup.sh --repo https://github.com/jdevera/herdr-mods.git
```

The clone goes into `$XDG_DATA_HOME/herdr-mods`, defaulting to
`~/.local/share/herdr-mods`. `--branch NAME` selects its initial branch. The
[README](../README.md#install) provides a download-and-run command without an
existing checkout. It explicitly sets chezmoi's source, destination, config, generated-config,
cache, and state paths instead of using another profile's defaults.

Requirements are checked before deployment. Missing chezmoi on macOS gets a
`brew install chezmoi` suggestion; other systems get the official install URL.
Node.js must be 24.12+; the suggested installation is `mise use --global node@24`.
The bootstrap also checks npm and Git. Approved builds declare extra tools in
metadata. Nothing installs those tools or edits your shell configuration for you.

Setup can be rerun. It reuses existing profile paths and choices; `--source` can
point the profile at another checkout without moving or deleting either checkout.
Use `--destination PATH` to change the Herdr app home and `--bin-dir PATH` to
select another executable directory already on PATH. The defaults are
`HERDR_APP_HOME` (otherwise `~/.config/herdr-app`) and `~/.local/bin`.

## Apply changes and update executables

After editing the checkout:

```sh
herdr-mods diff
herdr-mods apply
```

To pull and apply remote updates:

```sh
herdr-mods update
```

Update lets chezmoi pull first, offers any new build commands, then applies. For
review before applying, use `herdr-mods update --apply=false`, then diff and apply.
The wrapper does not reset or clean your checkout. Chezmoi's ordinary Git update
and file-conflict behavior remains in effect. Each computer has its own profile.

Separate `run_onchange_after_` hooks update the command and mod helpers. Their
rendered contents include checksums of build inputs, the target platform, and
output presence. Missing outputs include a fresh token, so deletion immediately
after a first build also triggers recovery. The following present-state run is
cheap: source fingerprints and existing outputs let build scripts skip work.
Changes to helper inputs do not rebuild the main executable.

Builds write temporary executables and replace existing files only after success.
A failed build leaves the previous executable available, and the next apply
retries. The command's embedded Node runtime is built locally and ad-hoc signed
on macOS; it is not notarized. Its licenses are embedded (`herdr-mods --licenses`).
Other platforms remain unverified. Set `NODE_LICENSE_FILE` when building if your
Node distribution keeps LICENSE outside its installation root.

If `herdr-mods` itself was deleted, rerun `sh setup.sh` (or invoke chezmoi with the
profile's explicit flags). You do not need to clear chezmoi's state database.

## Choose build commands

Setup and apply show new or changed command arrays, their descriptions, and working
directories together. Choose **all**, **individually**, **none**, or **cancel**.
`--yes` accepts the displayed commands; it never adds chezmoi's `--force` flag.
Declined commands are remembered until their argv changes. A skipped build may
leave that mod's features unavailable. Noninteractive runs with undecided commands
fail with instructions to rerun interactively or use `--yes`.

Use `herdr-mods approve` to revisit choices or `herdr-mods revoke` to disable the
current commands. Approval trusts package code, not just argv; review source
updates as well. Dry-run and diff do not ask questions, change approvals, or build.

After copying, approved commands run from their installed package directories
with `HERDR_MOD_DIR` and `HERDR_APP_HOME`, without an implicit shell. Optional
`build` metadata contains a description, package-relative input globs, output
paths, and required executables. These declarations control builds, not which
files get copied. Approved custom commands without build metadata run after every
apply, so they must be safe to repeat. Complete packages still include tests, helper source, and legal
files. User settings, dependencies, binaries, and generated files remain local.

## Bring installed edits back

Edit an installed mod and run its tests, then:

```sh
herdr-mods re-add /path/to/installed/mod
# For a new file:
herdr-mods add /path/to/installed/mod/tests/new-feature.test.cjs
```

Review `git diff` in the checkout and run `prek run --all-files` before committing.
Do not add the whole Herdr app home. Avoid chezmoi's reserved filename prefixes
such as `private_`, `executable_`, and `run_` for ordinary source files.
For conflicts, inspect diff and use merge or choose which copy to keep.
Removing a source file does not automatically delete its installed copy; remove
obsolete files explicitly after reviewing them.

## Profile locations and testing

`~/.config/herdr-mods/chezmoi.json` stores paths and build choices; it honors
`XDG_CONFIG_HOME`. `HERDR_MODS_HOME` selects another profile directory, including
its separate cache and persistent state. `HERDR_MODS_CHEZMOI` selects a chezmoi
executable. Other profiles may manage layouts and settings, but must not manage
the same mod source files.

Tests use temporary profiles, destinations, and local Git repositories. They cover
first setup, reuse, cloning, dependency failures, source updates, restoration,
unchanged builds, failures preserving executables, and normal mod round-trips.
The fast setup tests substitute compilation commands; the actual standalone
binary and Go helper are also checked separately during release validation.

References: [init](https://www.chezmoi.io/reference/commands/init/),
[scripts and onchange checksums](https://www.chezmoi.io/user-guide/use-scripts-to-perform-actions/),
[apply conflicts](https://www.chezmoi.io/reference/commands/apply/).
