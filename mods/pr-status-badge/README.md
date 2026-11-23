# PR status badge

A current-checkout PR number and state icon linking to GitHub. Gray means draft,
green open, red closed, and purple merged. Missing PRs draw no badge.

**Status-bar-compatible mod — API v1. Also works standalone.**
See RECIPE.md for both placements. The configurable status bar is optional;
standalone use does not import or require it. Keep this whole folder together.

Git and authenticated GitHub CLI must be available on the repository machine.
Lookups run there; clicks open GitHub on the viewing client. Checkout checks run
at most every five seconds; GitHub results are cached for one minute. The mod
performs read-only Git/GitHub lookups and never writes on its own.

Run `node --test tests/*.test.cjs`, then `herdr-app check` and inspect the running
client. Preserve LICENSE-octicons with its unchanged icon assets.
