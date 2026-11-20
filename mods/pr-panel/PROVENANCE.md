# Branch PR provenance

License: Apache-2.0 for this package, including local modifications, except
`tests/fixtures/better-icons/mods/better-icons/icons.json`, whose Material Icon
Theme data is MIT; its original license is alongside it. The fixture is only
used by tests and is included with complete-package deployments. See LICENSE and the retained upstream NOTICE.

Upstream: https://github.com/munza/herdr-mods/tree/1abf4870adb4c3f7a71739db1e0c29493f5e3f95/branch-pr
Version: 2.4.0. Copyright 2026 Tawsif Aqib.
Local modifications: Copyright 2026 Jacobo de Vera.

This is a locally maintained derivative. The upstream UI files from `mods/branch-pr/` now live at this package’s root;
helper and tests remain alongside them. The upstream preview
screenshot was removed. README and RECIPE were adapted for this repository. The recipe now documents
actual caching, remote helper installation, layout integration, and read-only
validation instead of upstream action-testing requirements.
The helper build resolves source within the package. Complete-package deployment
includes all license and provenance files.
Test paths were updated; Better Icons test data now lives under tests/fixtures.

Modified runtime files:

- main.js: safe check initialization, section commands, caching and refresh.
- github/reads.js: repository-machine authentication, cached details/lists,
  background revalidation, explicit refresh, and write invalidation.
- github/discovery.js: cache-aware context and repository refresh.
- views/list.js and state/saved.js: navigation without redundant requests.
- tests/pr.test.cjs: checking stub, remote routing and cache regressions.

## Cache refinement

PR details and filtered Repo lists now remain fresh for two minutes. PR details
with running checks use 30 seconds (the visible-panel poll still runs every
60 seconds by default). Stale entries remain visible during background refresh.
Explicit refresh bypasses the cache; GitHub writes invalidate it. Cache keys
include checkout context, repository, and PR or list filters. Navigation tokens
prevent late responses from replacing the chosen PR. Failed-job logs are unchanged.
Four regression tests cover round trips, empty lists, stale data, force refresh,
filter/context isolation, and response ordering; all 77 JavaScript tests pass.

Repository descriptions and license identifiers live in `mod.meta.json` for discovery and validation.

## Repository conventions

The maintained package is named `pr-panel`; upstream is still Branch PR.
`mod.json` retains Herdr fields; `mod.meta.json` uses the shared repository metadata schema. User configuration is loaded from
`settings.json`, followed by `settings.*.json` in alphabetical order, with recursive
object merging. Its schema is `config.schema.json`. The upstream Go
installer was removed. Chezmoi handles repository deployment; the package also
supports direct copying. The original
`install.ts` post-install script is MIT-licensed; see LICENSE-install.
Runtime JavaScript and JSON were formatted with Prettier; behavior changes are
recorded above and in the configuration loader.
The fixture license is tests/fixtures/better-icons/mods/better-icons/LICENSE-material-icon-theme.txt.

The intermediate `runtime/` directory was flattened so the package can be copied
directly into Herdr while retaining runnable tests and helper source. Test paths,
schema references, and installation documentation were updated together.

The repository-relative `$schema` metadata link was removed for unchanged copying
and chezmoi re-add. Repository checks still validate metadata against the central schema.

Repository description, license identifier, and any build command are now in
`mod.meta.json`. The Herdr manifest retains its title and runtime fields; tooling
reads both without duplicating the title.
