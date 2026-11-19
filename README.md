# Herdr mods

Native UI mods for Herdr Desktop, supporting local and remote repositories.

## Included

<!-- mods:start -->

| Mod                                      | Description                                                                                              | License    |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------- |
| [Pull request badge](mods/pr-badge/)     | Current-branch PR badge with GitHub state colors and icons, including remote repositories.               | Apache-2.0 |
| [Pull request panel](mods/pr-panel/)     | Pull request details, comments, checks, failed-job logs, and files for the current branch or repository. | Apache-2.0 |
| [Pull request tab bar](mods/pr-tab-bar/) | Herdr tab bar with a PR panel toggle and per-space panel selection.                                      | Apache-2.0 |

<!-- mods:end -->

The **badge** is a small link to the current branch's PR. The **panel** shows its
description, comments, checks, failed-job logs, and files. The **tab bar** provides
the PRs button that opens the panel. The badge can be used independently.

A layout tells Herdr where to put these pieces. [examples/layouts/main-pr.json](examples/layouts/main-pr.json)
is a reference arrangement, not an installable mod or a replacement for your own layout.

## Install

Requires Node.js 24.12+; the installer uses built-in modules only. No npm install,
TypeScript compilation, or Python is needed to install mods.

```sh
node scripts/install.ts
# One mod, optionally with a custom Herdr config directory:
node scripts/install.ts /path/to/herdr-home --mod pr-panel
# Approve all declared post-install commands:
node scripts/install.ts --yes
```

The installer discovers each mod's `mod.json`, copies its runtime, licenses,
provenance, and schema, and backs up existing installations. It preserves user
settings files. Updates use the same command.

After all files are installed, it shows each optional `install` command and asks
whether to run it. These commands are strict argument arrays, executed without
an implicit shell from the mod's source package directory. `HERDR_MOD_DIR` is the
installed mod directory and `HERDR_APP_HOME` is the target app home. In a
noninteractive session, commands are skipped unless `--yes` is given.

The panel's extra step builds its Go helper. It needs Go 1.23+; declining leaves
the UI files installed but PR queries require an existing helper. A failed extra
step reports failure while leaving the installed files and backups available.

### Make it visible in Herdr

Installation does **not** change your layout. Each mod's `RECIPE.md` tells an
agent how to inspect and integrate it, then validate the running UI:

- [Panel setup](mods/pr-panel/RECIPE.md): add the panel and a way to open it.
- [Tab bar setup](mods/pr-tab-bar/RECIPE.md): use the PRs launcher with that panel.
- [Badge setup](mods/pr-badge/RECIPE.md): place the badge in the status bar.

You can ask an agent: “Install these mods, follow their recipes, and integrate
them into my current Herdr layout while preserving my customizations.”
The agent should read `herdr-app --skill` and the target client's installed
`AGENTS.md`, inspect the layout, run `herdr-app check`, inspect status, and visually
verify it. Copying files alone is not a completed UI setup.

For existing installs under the old names (`branch-pr`, `tabs-pr`, and
`workspace-status-pr`), have the agent back up their configuration, install the new mods, transfer the
preferences into their standalone settings files, and update layout and command
references together. Keep the old installation until the new setup is verified.

For remote setups, identify the repository host and viewing clients at deployment
time. Install on each required machine: UI code runs on the viewing client;
Git, authenticated `gh`, and the helper run on the repository machine. Links open
on the viewing client. Source files do not automatically sync across computers.

## Configuration

Metadata lives in `mod.json`. User preferences live in the installed mod folder:

1. Code defaults.
2. `settings.json`, if present.
3. `settings.*.json`, sorted alphabetically by filename.

Objects merge recursively; later files override only the values they specify.
For example, `settings.local.json` can contain:

```json
{
  "$schema": "./config.schema.json",
  "refresh": { "every": "90s" }
}
```

The panel's `config.schema.json` describes its settings. Invalid files or values
are reported in the panel. The installer migrates embedded settings from older
manifests, with existing standalone configuration taking precedence.

## Development

Tooling is TypeScript executed directly by Node, with no build step. Herdr's
native runtime files remain JavaScript. Install the development dependencies and
activate the hooks once per clone:

```sh
npm ci
prek install
prek run --all-files
```

Checks cover TypeScript types and lint, JavaScript syntax, Go formatting and vet,
manifest/configuration schemas, required files, license text and provenance, and
Node/Go tests. `npm run format` runs Prettier; the commit hook also formats files
automatically. TypeScript uses four-space indentation and ESLint-enforced blank
lines between logical steps; `npm run lint:fix` applies those spacing rules.
If formatting changes anything, stage the changes and retry.
License texts, retained notices, and generated API declarations are excluded.

Each mod's manifest is the source for its title, description, license, and optional
post-install command. The shared schema is [schemas/mod.schema.json](schemas/mod.schema.json).
The README hook regenerates the Included table. If it changes, the commit fails:
review and stage README.md, then retry. `npm run readme` does the same manually
(exit 1 means it wrote changes). There is no separate mod catalog.

## License

MIT for original repository tooling and documentation, with third-party
exceptions in [LICENSING.md](LICENSING.md). Each mod carries its own LICENSE and
PROVENANCE.md. The maintained PR panel derives from Munza's Branch PR;
the badge and tab bar derive from Herdr's shipped UI.

See [the PR panel brief](docs/pr-panel.md) for research and background.
