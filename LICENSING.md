# Licensing

The root LICENSE applies to original repository tooling and documentation by
Jacobo de Vera, except the components explicitly listed below. It does not
replace licenses or copyright notices on third-party material. This repository
contains multiple licenses; do not assume every file is MIT.

| Scope                                                                  | License                                                               | Provenance and notices                                                                                                                            |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Original repository tooling and documentation                          | MIT                                                                   | [Root LICENSE](LICENSE)                                                                                                                           |
| mods/pr-panel, including local modifications                           | Apache-2.0, except the original post-install script and fixture below | [LICENSE](mods/pr-panel/LICENSE), [NOTICE](mods/pr-panel/NOTICE), [PROVENANCE.md](mods/pr-panel/PROVENANCE.md)                                    |
| mods/pr-panel/install.ts                                               | MIT                                                                   | [License](mods/pr-panel/LICENSE-install); provenance in the containing mod                                                                        |
| mods/pr-panel/tests/fixtures/better-icons/mods/better-icons/icons.json | MIT (Material Icon Theme data)                                        | [Original license](mods/pr-panel/tests/fixtures/better-icons/mods/better-icons/LICENSE-material-icon-theme.txt); provenance in the containing mod |
| mods/pr-tab-bar, including local modifications                         | Apache-2.0                                                            | [LICENSE](mods/pr-tab-bar/LICENSE), [NOTICE](mods/pr-tab-bar/NOTICE), [PROVENANCE.md](mods/pr-tab-bar/PROVENANCE.md)                              |
| mods/pr-badge, including local modifications                           | Apache-2.0, except its four git-*.svg icons                           | [LICENSE](mods/pr-badge/LICENSE), [NOTICE](mods/pr-badge/NOTICE), [PROVENANCE.md](mods/pr-badge/PROVENANCE.md)                                    |
| mods/pr-badge/RECIPE.md and mods/pr-tab-bar/RECIPE.md                  | MIT                                                                   | Each package includes LICENSE-recipe                                                                                                              |
| mods/pr-badge/git-*.svg                                                | MIT (GitHub Octicons)                                                 | [Original license](mods/pr-badge/LICENSE-octicons)                                                                                                |
| examples/layouts/main-pr.json                                          | Apache-2.0                                                            | [LICENSE](examples/layouts/LICENSE), [PROVENANCE.md](examples/layouts/PROVENANCE.md)                                                              |

Each new original mod must carry its own MIT LICENSE. A mod based on another
project retains its inherited license and required notices, with local changes
recorded in its PROVENANCE.md and modified Apache files marked as changed.
License texts themselves and retained third-party notices keep their original
wording. The repository-level MIT license does not relicense those components.

The standalone `herdr-mods` executable bundles Node.js. Its build embeds the
complete license file from the Node.js distribution, including its third-party
notices, together with this repository's MIT license. Run `herdr-mods --licenses`
to read them. Build dependencies are not included in the executable.
