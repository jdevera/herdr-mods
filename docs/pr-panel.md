# Pull request panel brief

## Desired behavior

A panel following the focused terminal's repository and branch, on local or
remote machines. Keep the existing colored PR badge.

- Scrollable Markdown PR description.
- Readable conversation comments, review threads, and replies inside Herdr.
- Prominent overall CI status and individual check results; make failures obvious.
- Expand failed jobs to see steps and failed logs where supported.
- Refresh while visible; avoid stale results when switching branches.
- Deploy on the requested viewing clients, preserving their personal layouts.

## Existing candidates researched

Preferred: **Branch PR by munza**
https://github.com/munza/herdr-mods/tree/main/branch-pr

Its recipe documents Overview, Comments, Checks, and Files tabs; a Markdown
description; check groups with failures first; expandable steps and failed output;
and remote Git support with a local helper. It also has write actions (comments,
thread resolution, merging) and agent handoffs. Inspect the source, dependencies,
helper build, permissions, and remote authentication behavior before installation.
Branch PR 2.4.0 is now maintained here, installed, and validated on both clients.

Alternatives:

- Remote Checker: https://github.com/SimonBystromTableCheck/herdr-mods/tree/main/remote-checker
  Strong checks dashboard, but documented comment rows are summaries that open GitHub.
- Redline: https://herdr.dev/mods/iampedii/herdr-redline/
  A broader review workflow with worktrees, diffs, approvals and replies.

## Earlier deployment validation

Validated with both local and remote repository access. The earlier replacement tab bar toggled the panel inside `main-pr`. The current
design instead uses the panel package's button mode beside stock Herdr tabs, and a
standalone MIT PR status badge beside the stock status bar. See each package's
recipe for current integration and migration instructions.

The upstream implementation used the viewer's GitHub login even for remote
spaces. Testing exposed private-repository access failure on the viewing client. The
local patch routes the helper through Herdr to the repository machine, retaining
its credentials and keeping browser navigation local to the viewer.

Validation: 73 JavaScript tests and both Go test packages passed. Both clients
passed `herdr-app check` for Branch PR and pr-tab-bar. A real private PR loaded through both local and remote access, with passing checks. Screenshots
verified native Markdown description and Checks views, plus the full Comments
view on the remote viewing client. Failure coloring and
failed-log behavior are covered by upstream mocked tests; this PR currently
has no failed checks, so live failed-log retrieval was not exercised.

No GitHub write actions, agent messages, remote creation, or publication were
performed. The personal `jdevera` Git identity has been selected. Original repository tooling is MIT; derived mods retain Apache-2.0.
