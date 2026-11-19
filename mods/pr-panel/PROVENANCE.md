# Branch PR provenance

License: Apache-2.0 for this package, including local modifications, except
`tests/fixtures/better-icons/mods/better-icons/icons.json`, whose Material Icon
Theme data is MIT; its original license is alongside it. The fixture is only
used by tests and is not deployed. See LICENSE and the retained upstream NOTICE.

Upstream: https://github.com/munza/herdr-mods/tree/1abf4870adb4c3f7a71739db1e0c29493f5e3f95/branch-pr
Version: 2.4.0. Copyright 2026 Tawsif Aqib.
Local modifications: Copyright 2026 Jacobo de Vera.

This is a locally maintained derivative. The upstream runtime was moved to
`runtime/`; helper and tests remain within this package. The upstream preview
screenshot was removed. README and RECIPE were adapted for this repository. The recipe now documents
actual caching, remote helper installation, layout integration, and read-only
validation instead of upstream action-testing requirements.
The helper installer now uses the new path and deploys license and provenance.
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

Manifest and schema now include descriptions and license identifiers for repository discovery and validation.

## Repository conventions

The maintained package is named `pr-panel`; upstream is still Branch PR.
Metadata uses the shared repository schema. User configuration is loaded from
`settings.json`, followed by `settings.*.json` in alphabetical order, with recursive
object merging. Its schema is `runtime/config.schema.json`. The upstream Go
installer was removed in favor of the repository Node installer. The original
`install.ts` post-install script is MIT-licensed; see LICENSE-install.
Runtime JavaScript and JSON were formatted with Prettier; behavior changes are
recorded above and in the configuration loader.
The fixture license is tests/fixtures/better-icons/mods/better-icons/LICENSE-material-icon-theme.txt.
