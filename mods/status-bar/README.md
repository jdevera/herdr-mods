# Configurable status bar

Keep related information together in the order you choose. The bar measures each
component, shortens flexible labels, switches to compact presentations, then puts
lower-priority items in **More status items**. Missing items consume no space.
Blocked-agent attention stays visible; at extremely small widths, remaining items
can scroll horizontally. The bar keeps the existing 28px height and theme.

## Use this bar

Install the collection with its normal `herdr-mods apply` workflow, then ask your
agent:

```text
Integrate status-bar and its compatible mods into my existing personal Herdr
layout. Read the installed Herdr guide and status-bar/RECIPE.md. Preserve my
panels, keys and terminals. Keep the stock bar available with the switch.
```

The switch at the far right alternates between the custom and stock bars. Its
tooltip says which bar it will show. Herdr remembers the selected stack child.
For a keyboard binding, `status-bar.more` opens the current overflow menu.

The stock `workspace-status` mod is referenced unchanged and receives Herdr updates.

Install `status-computer`, `status-branch`, `pr-status-badge`, `status-agents`, and
`status-commands` for the default arrangement. The PR badge alone runs Git and
GitHub CLI on the repository machine; its click opens the PR on the viewing client.
The bar itself runs no programs or network requests. No extra build is needed.

## Choose your components

Create `settings.json` in this installed mod folder:

```json
{
  "left": ["computer", "branch", "pr", "agents"],
  "right": ["commands"],
  "components": {
    "branch": { "maxWidth": 240 },
    "agents": { "keepVisible": true }
  }
}
```

Saving reloads the bar. An ID appears at most once across both lists. Remove an
ID to leave it out; change its position to move it. Adding a new ID also requires
adding its compatible mod to the layout as described in RECIPE.md.

Defaults are in code. `settings.json` loads first, followed by `settings.*.json`
in code-point order. Objects merge recursively; arrays replace earlier arrays.
User settings are excluded from Git and deployment. Invalid settings show an
exclamation mark with the error as a tooltip; the bar uses its defaults.

Available settings are documented in `config.schema.json`: `gap`, `padding`,
`left`, `right`, and per-component `hidden`, `minWidth`, `maxWidth`, `priority`,
and `keepVisible`. Lower priorities compact and enter overflow first. Branch
and computer labels can truncate. Full labels remain available in tooltips.

## Build a compatible mod

A **status-bar-compatible mod** is an ordinary Herdr mod that supports
[Status Bar API v1](API.md). Its metadata declares whether it also works alone.
Each compatible package includes its own small API client, icons, tests, license,
and provenance. Taking one folder does not require taking the bar to use it alone.

To use its bar integration, install this bar as well. Each mod owns its data;
the bar owns display, sizing and actions through a small data contract.
Herdr shared state connects the running mods. The bar does not import their code.

## Implementation and verification

The custom layout row contains a full-width host plus zero-width source blocks.
These source blocks must stay unhidden so Herdr starts them. They render nothing,
but publish their current component to the host. An absent component publishes
`null`. The host starts a new session on reload, so previous-session values are
never mistaken for current registration. A closed source unregisters itself.

Sizing uses actual native layout measurements for full and compact forms. Those
measurements are independent of the assigned width, preventing resize feedback.
Only changed sizes or content trigger recalculation; there is no resize timer.

After a custom bar has been shown, Herdr keeps its sources alive when switching
to stock. The PR badge retains its existing five-second checkout checks and
one-minute GitHub cache. Nothing in the bar writes to Git or GitHub.

Run this package's tests with `node --test tests/*.test.cjs`, then run
`herdr-app check` on changed packages, inspect status, and verify a screenshot.
The allocator tests cover different widths, overflow, hidden items, long labels,
and blocked-agent preservation. Native integration still needs the running app.
