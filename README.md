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

See [examples/](examples/) for example configurations and layouts. Follow each
mod’s documentation when adapting them to your setup.

## Install

### I want all the mods

From this checkout:

```sh
sh setup.sh
```

Setup checks requirements, explains its steps, and offers the mod build commands
as a group or individually. It installs `herdr-mods` in `~/.local/bin` and creates
a separate chezmoi profile
for this collection. It copies the mods into your Herdr app home and keeps your
personal settings and existing layouts. Your other chezmoi profiles are unaffected.
If `~/.local/bin` is not on PATH, the command installation tells you where to
find the binary and how to install it on PATH.

You'll need chezmoi and Node.js 24.12+ to follow these steps. Individual mods
document any additional build requirements in their own folders. Missing tools
are reported before deployment, with Brew/mise commands or installation links.

Already have a checkout elsewhere? Run `sh setup.sh --source /path/to/checkout`.
A standalone copy of `setup.sh` also accepts `--repo <repository-url>`: chezmoi
clones into its own source directory, leaving your other profiles alone. This
repository has no published remote yet; see [setup options](docs/chezmoi.md).

#### Make them visible in Herdr

Give your agent this instruction:

> Integrate the mods from this checkout into my Herdr layout. First run
> `herdr-app --skill` and read `~/.config/herdr-app/AGENTS.md` (or
> `$HERDR_APP_HOME/AGENTS.md` if set). Read each mod's `RECIPE.md`, preserve my
> existing customizations, and follow the recipes to finish setup. Run
> `herdr-app check`, inspect status, and visually verify the result.

#### Keep them up to date

After updating or editing this checkout:

```sh
herdr-mods diff
herdr-mods apply
```

You can also edit an installed mod and bring the changes back with
`herdr-mods re-add`. See [the chezmoi guide](docs/chezmoi.md) for that workflow,
custom paths, and profile settings. Executables rebuild when their source changes
and are restored if missing. Each computer needs its own setup.

### I only want one mod

Give your agent the repository address and the mod you want. Replace the
placeholders in this prompt with a URL (or local checkout) and a mod name from
the catalogue above:

> Get `<mod-name>` from `<repository-url-or-path>` and integrate it into my Herdr.
> First run `herdr-app --skill` and read `~/.config/herdr-app/AGENTS.md` (or
> `$HERDR_APP_HOME/AGENTS.md` if set). Inspect the mod's source and `RECIPE.md`,
> copy its complete package with licenses and provenance, and follow its setup
> instructions. Preserve my settings and existing layout. Run `herdr-app check`,
> inspect status, and visually verify the result.

Each mod keeps its code, tests, helper source, and documentation together. Your
agent can take the package directly; it doesn't need this repository's chezmoi
profile or a separate installer.

## Configuration

User preferences live in the installed mod folder:

1. Code defaults.
2. `settings.json`, if present.
3. `settings.*.json`, sorted alphabetically by filename.

Objects merge recursively; later files override only the values they specify.
Consult the mod’s documentation and `config.schema.json`, when provided, for
supported settings.

## How installation hooks work

A mod can declare an `install` command in `mod.meta.json` as an argument array.
Setup and apply show new commands together and offer to run all, choose
individually, skip all, or cancel. `--yes` accepts them noninteractively.
Chezmoi copies the files first, then runs approved commands from their installed
package directories, with `HERDR_MOD_DIR` and `HERDR_APP_HOME` set. Commands run
without an implicit shell. Changed command arrays need approval again.

Build metadata describes source inputs, output files, and required tools.
Chezmoi onchange hooks use source checksums and missing outputs to trigger builds.
These hooks build helpers or perform other additions; chezmoi handles copying
and synchronization. Failed hooks report failure while leaving the copied files
in place. The details are in [the chezmoi guide](docs/chezmoi.md).

## Development

Tooling is TypeScript executed directly by Node. The standalone
`herdr-mods` executable has its own build step. Herdr's
native runtime files remain JavaScript. Install the development dependencies and
activate the hooks once per clone:

```sh
npm ci
prek install
prek run --all-files
```

Checks cover TypeScript types and lint, JavaScript syntax, Go formatting and vet,
repository-metadata/configuration schemas, required files, license text and provenance, and
Node/Go tests. `npm run format` runs Prettier; the commit hook also formats files
automatically. TypeScript uses four-space indentation and ESLint-enforced blank
lines between logical steps; `npm run lint:fix` applies those spacing rules.
If formatting changes anything, stage the changes and retry.
License texts, retained notices, and generated API declarations are excluded.

Herdr owns `mod.json`, including the mod's title and runtime options. Our
`mod.meta.json` holds the catalogue description, license identifier, and optional
build command. This is a repository convention, not a Herdr standard. Tooling
reads both files and uses the title from `mod.json` without duplicating it.
Our metadata schema is [schemas/mod.meta.schema.json](schemas/mod.meta.schema.json).
The README hook regenerates the Included table. If it changes, the commit fails:
review and stage README.md, then retry. `npm run readme` does the same manually
(exit 1 means it wrote changes). There is no separate mod catalog.

## License

MIT for original repository tooling and documentation, with third-party
exceptions in [LICENSING.md](LICENSING.md). Each mod carries its own LICENSE and
PROVENANCE.md describing its authorship and any reused material.
