# Optional chezmoi deployment for Herdr mods

Status: proposal, not implemented. Baseline: `7356ec2` on `main`.
Researched on 2026-11-19 against chezmoi 2.74.1, the latest official release
reported by GitHub on that date. This branch does not change existing chezmoi
profiles, install a new profile, or deploy any mods.

## Recommendation

Use chezmoi as a third, isolated personal deployment profile. Keep ordinary mod
files in `mods/`, with no chezmoi syntax in their JavaScript or manifests.
Chezmoi should manage those files directly, and its scripts should call existing
mod-specific build commands. Do not wrap the whole installer in an apply script:
that would copy files outside chezmoi's management and lose useful diff/re-add
behavior.

The intended mapping is simply:

```text
repository/mods/pr-badge/main.js
    → HERDR_APP_HOME/mods/pr-badge/main.js
```

Set the chezmoi source to this repository and its destination to the chosen Herdr
app home. This avoids converting the repository into a home-directory tree full
of `dot_config` paths. The only chezmoi-specific pieces would be a small ignore
adapter, scripts under `.chezmoiscripts/`, and profile/setup documentation.
Other users can ignore those pieces and continue to copy/install mods normally.

## Why direct files matter

Chezmoi's `re-add` deliberately skips template-backed and external entries.
A template containing `include "mods/.../main.js"` would deploy the right bytes,
but editing the installed file and running `re-add` would not update our canonical
JavaScript. Externals have the same problem. This corrects the earlier suggestion
that any thin chezmoi wrapper would automatically provide bidirectional editing.

| Approach                              | Deployment                             | Bring installed edits back    | Recommendation                |
| ------------------------------------- | -------------------------------------- | ----------------------------- | ----------------------------- |
| Ordinary source files mapped directly | Native diff/apply                      | Native re-add                 | Use this                      |
| Include templates or externals        | Works                                  | Skipped by re-add             | Avoid for editable mod source |
| Script calls the entire installer     | Files copied outside native management | Requires another import tool  | Avoid                         |
| Generated duplicate source tree       | Works                                  | Changes land in the duplicate | Avoid                         |

Sources: [re-add semantics](https://www.chezmoi.io/reference/commands/re-add/),
[include](https://www.chezmoi.io/reference/templates/functions/include/),
[external files](https://www.chezmoi.io/user-guide/include-files-from-elsewhere/).

## Make the packages consistent

The badge and tab bar already have `main.js` at the package root. The panel has
`runtime/` beside `helper/` and `tests/`. Upstream used `mods/branch-pr/` for the UI
beside `helper/`; our earlier reorganization renamed that UI directory to
`runtime/`.

Propose moving the panel's runtime files up one level, without changing the Go
helper's organization:

```text
mods/pr-panel/
    main.js
    mod.json
    config.schema.json
    settings.js
    actions/ github/ icons/ state/ views/
    helper/                 # Go source and tests; not deployed as UI
    tests/                  # development only
    install.ts              # optional helper build; invoked from checkout
    LICENSE, NOTICE, PROVENANCE.md, LICENSE-install
    README.md, RECIPE.md
```

This is a packaging change, not an application rewrite. Adjust relative test
paths, scripts, documentation, and provenance together. Keep the central
`schemas/mod.schema.json` validator. Remove repository-relative `$schema` links
from deployed metadata rather than rewriting manifests during deployment;
workspace editor associations can reference the central schema. The per-mod
`config.schema.json` stays beside the user's settings.

A manually copied mod must work without a chezmoi profile. Recipes will list the
runtime directories, required legal files, and any helper build. The existing
Node installer remains an optional convenience for other users during this
transition; personal chezmoi deployment will not invoke its file-copying logic.

## A narrow deployment adapter

Reuse manifest discovery and extract one explicit deployable-file inventory for
both the optional installer and the chezmoi adapter. Do not create another mod
catalog or duplicate source contents.

Use a deny-by-default `.chezmoiignore` whose allowed paths come from that
inventory. Include parent directories and reviewed `.chezmoiscripts` entries.
Chezmoi patterns match destination paths, and negated patterns take priority, so
a broad `!mods/**` would accidentally include development files. Test the actual
managed-file list rather than assuming gitignore-style ordering.

The inventory includes UI JavaScript, assets, manifests, config schemas, and all
applicable package licenses/notices/provenance. It excludes tests, helper source,
Node dependencies, Go build output, generated declarations, errors, and user
`settings.json` / `settings.*.json`. Recipes can remain source documentation.
Do not use `exact_` directories: unmanaged user settings and Herdr-generated files
must survive apply. New or removed runtime files must be reflected in the
inventory; removals need explicit, reviewed cleanup, not blanket deletion of
unmanaged entries.

Chezmoi's ignore template may call a small, read-only Node inventory command. That
command must not copy, build, fetch, or write files. This keeps native chezmoi
ownership of each target file and reuses our packaging rules.

Source: [ignore semantics](https://www.chezmoi.io/reference/special-files/chezmoiignore/).

## Profile isolation and daily use

Use a dedicated config, source checkout, persistent-state database, and cache for
this profile. Specify the destination explicitly. Keep those paths in personal
configuration, not checked-in hostnames or personal filesystem paths. A local
`herdr-mods` shell function can supply the profile flags to the real chezmoi
binary; it should forward commands rather than implement synchronization.

Never let the personal or work profiles manage the same mod source files. Local
settings and the user's layout may remain in one existing profile, provided this
profile leaves them unmanaged.

With that profile function configured, the workflow would be:

```sh
herdr-mods status
herdr-mods diff
herdr-mods apply

# After editing a managed file in the installed mod:
herdr-mods re-add "$HERDR_APP_HOME/mods/pr-badge/main.js"
git diff
prek run --all-files
# Commit in this repository using the chosen identity.
```

Alternatively, edit the ordinary file in `mods/` and apply it. Adding new runtime
files should normally happen in the checkout, then pass inventory validation.
Do not recursively add Herdr's entire config directory.

Once a remote and ownership have been chosen, `herdr-mods update --apply=false`
can pull updates for inspection, followed by diff and apply. `update` alone pulls
and applies. There is currently no remote: this proposal does not create one or
claim that cross-machine updates are configured. Each viewing/repository machine
needs its own checkout/profile; chezmoi does not synchronize across a remote Herdr
connection. Git remains responsible for sharing reviewed commits.

Sources: [multiple-profile options](https://www.chezmoi.io/user-guide/frequently-asked-questions/design/#can-chezmoi-support-multiple-sources-or-multiple-source-states),
[update behavior](https://www.chezmoi.io/reference/commands/update/).

## Build additions and layout setup

Use an after-script to call the panel's existing `install.ts` build step, supplying
`HERDR_MOD_DIR` and `HERDR_APP_HOME`. It must not call `scripts/install.ts` to
recopy managed files. Preserve the strict argv-array convention and avoid
implicitly treating command arrays as shell text.

Build steps require explicit opt-in in the niche profile. A changed command is
reviewed in the rendered script diff; do not silently approve every future
manifest command with `--yes`. Scripts should be idempotent. Start with a simple
after-script using Go's build cache; do not add a second update engine. If moving
to `run_onchange_after`, include all build inputs in its content hash and account
for a deleted helper binary even when the inputs have not changed.

Chezmoi scripts do not inherit a convenient source working directory: pass the
package directory explicitly. Failures must be visible. Use dry-run before the
first apply. An after-script can also call `herdr-app check` when that client is
available; a headless repository host must not require a GUI.

Layouts stay outside this profile's automatic ownership. An agent follows each
recipe to integrate the panel/launcher/badge into the existing layout and verify
it. A personal layout can be managed separately by the user's existing dotfiles
profile. Copying a mod is not the same as placing it in the UI.

Source: [script ordering and execution](https://www.chezmoi.io/user-guide/use-scripts-to-perform-actions/).

## Research evidence

Downloaded the official 2.74.1 macOS ARM64 release into a temporary directory and
verified its SHA-256 against the release checksum file. The system installation
was not upgraded. The isolated experiment used separate source, destination,
config, cache, and persistent-state paths; it touched no real Herdr or chezmoi
configuration.

Observed with 2.74.1:

- `mods/pr-badge/main.js` maps directly under a custom destination.
- Applying a source edit updates the installed file.
- Editing the installed ordinary file and running re-add updates the original
  source file at the same relative path.
- The allowlist excludes development files and unrelated repository documents.
- Unmanaged settings and generated declarations survive apply.
- An allowed after-script runs after apply, and does not run during dry-run.
- Re-add leaves an include template and its included canonical file unchanged.

The experiment establishes the core file mapping and round trip. It does not
establish the future dynamic inventory, all existing mod migrations, remote Git
updates, command approval, or build recovery; those remain implementation tests.

Release: [chezmoi 2.74.1, published 2026-11-10](https://github.com/twpayne/chezmoi/releases/tag/v2.74.1).

## Implementation and acceptance plan

1. Approve this design, particularly flattening the panel and using direct
   ordinary files instead of template/external deployment.
2. Normalize the panel package; update existing checks and copying recipes.
3. Extract and test the shared deployable-file inventory, including path
   collision/attribute checks for chezmoi's reserved filename conventions.
4. Add the small optional adapter and document a third isolated profile.
5. Test source-to-install updates, installed-to-source edits, conflicts,
   removed-file cleanup, local configuration preservation, script opt-in, failed
   builds, and idempotence in disposable destinations.
6. Demonstrate that manual copying and the optional Node installer still work
   without chezmoi.
7. Migrate one real client only after reviewing its diff and backing up its current
   installation. Preserve layout and local settings; validate visibly. Repeat
   explicitly for each additional machine.

No implementation or real-profile migration is included in this proposal commit.
