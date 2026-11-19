# Licensing

The root LICENSE applies to original repository tooling and documentation by
Jacobo de Vera, except the components explicitly listed below. It does not
replace licenses or copyright notices on third-party material. This repository
contains multiple licenses; do not assume every file is MIT.

| Scope | License | Provenance and notices |
| --- | --- | --- |
| Original repository tooling and documentation, including scripts/install.py | MIT | [Root LICENSE](LICENSE) |
| mods/branch-pr, including local modifications | Apache-2.0, except the fixture below | [LICENSE](mods/branch-pr/LICENSE), [NOTICE](mods/branch-pr/NOTICE), [PROVENANCE.md](mods/branch-pr/PROVENANCE.md) |
| mods/branch-pr/tests/fixtures/better-icons/mods/better-icons/icons.json | MIT (Material Icon Theme data) | [Original license](mods/branch-pr/tests/fixtures/better-icons/mods/better-icons/LICENSE-material-icon-theme.txt); provenance in the containing mod |
| mods/tabs-pr, including local modifications | Apache-2.0 | [LICENSE](mods/tabs-pr/LICENSE), [NOTICE](mods/tabs-pr/NOTICE), [PROVENANCE.md](mods/tabs-pr/PROVENANCE.md) |
| mods/workspace-status-pr, including local modifications | Apache-2.0, except its four git-*.svg icons | [LICENSE](mods/workspace-status-pr/LICENSE), [NOTICE](mods/workspace-status-pr/NOTICE), [PROVENANCE.md](mods/workspace-status-pr/PROVENANCE.md) |
| mods/workspace-status-pr/git-*.svg | MIT (GitHub Octicons) | [Original license](mods/workspace-status-pr/LICENSE-octicons) |
| layouts/main-pr.json | Apache-2.0 | [LICENSE](layouts/LICENSE), [PROVENANCE.md](layouts/PROVENANCE.md) |

Each new original mod must carry its own MIT LICENSE. A mod based on another
project retains its inherited license and required notices, with local changes
recorded in its PROVENANCE.md and modified Apache files marked as changed.
License texts themselves and retained third-party notices keep their original
wording. The repository-level MIT license does not relicense those components.
