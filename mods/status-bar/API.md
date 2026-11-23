# Status Bar API v1

This is this repository's API, not a built-in Herdr API. A compatible mod is
still an ordinary, independently installable Herdr package.

## Declare compatibility

Add to the package's `mod.meta.json` (never `mod.json`):

```json
{ "statusBar": { "api": 1, "standalone": true } }
```

Use `standalone: false` only when the package requires the bar. Document that
requirement prominently. A standalone-compatible mod has no bar dependency when
used without its `statusBar` layout props.

## Connect an ordinary mod

Distribute `client.js` from this package inside the compatible package, preserving
its MIT header and naming its source in PROVENANCE.md. Keep the copies identical;
repository tests check this. Imports remain local to each package.

```js
import { View, div } from "gpui-kit";
import { StatusClient, renderItem } from "./client.js";

export default class ExampleStatus extends View {
  init() {
    this.client = new StatusClient();
  }

  close() {
    this.client.close();
  }

  render() {
    const item = {
      label: "Example status",
      compactLabel: "Example",
      tooltip: "The complete description",
      priority: 50,
      action: { command: "app.palette" },
    };
    this.client.publish(item);
    return this.client.connected() ? div().size(0) : renderItem(item);
  }
}
```

Give the layout copy `props.statusBar = {bar: "workspace", item: "example"}`.
Without these props, it renders independently and never registers. Avoid module
scope side effects; keep instance data and tasks in the view as normal. Guard
processes and file writes with Herdr's `checking()`. Publishing is check-safe.

## The component description

Publish a plain JSON object, or `null` for no component. Functions and GPUI
elements do not cross this API. The same `renderItem` helper can draw the mod
independently, so text, icons, colors and clicks share one implementation.

| Field                  | Meaning                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `label`                | Required full label.                                                                   |
| `compactLabel`         | Optional short label; empty text gives an icon-only form.                              |
| `icon`                 | Optional SVG path relative to Herdr's app home; keep assets in the package's `icons/`. |
| `tooltip`              | Full description available even when text truncates.                                   |
| `color`                | Herdr semantic theme color name; defaults to `muted`.                                  |
| `detail`               | Optional `{label, compactLabel?, color}` for an attention count.                       |
| `minWidth`, `maxWidth` | Bounds in logical pixels; `minWidth` permits text truncation.                          |
| `priority`             | Lower values compact and enter overflow first; default 50.                             |
| `keepVisible`          | Keep in the bar rather than overflow; useful during an alert.                          |
| `action`               | One of the actions below, shared by full, compact and overflow displays.               |

Actions are `{command, args?}`, `{url}` for HTTP(S), or `{overlay}` with Herdr's
`openOverlay` specification. Prefer built-in app commands. Commands addressed to
another mod retain Herdr's rule that only shown copies receive them. The bar
never runs shell commands or evaluates contributor code. A mod may perform its
own data acquisition using Herdr's regular trusted-mod APIs.

## Registration and lifecycle

For bar ID B and item ID I, the request key is `status-bar.v1.B.request` and
registration key is `status-bar.v1.B.item.I` in Herdr shared state. The request
contains `{api: 1, session}`. A registration contains
`{api: 1, session, owner, item}`. The host reads only its current session.
`StatusClient` handles changed-only publication, new sessions and ownership-safe
unregistration. This is the registration API; contributors never import bar code
from another installed folder. A copied client is sufficient.

Use exactly one source for each `(bar, item)` pair. IDs should use letters,
digits, underscores or hyphens. Hidden layout copies continue running only after
Herdr has started them, so source blocks must be unhidden zero-width blocks.
If an item is removed from settings it is not displayed; remove its source block
too if its background work is no longer needed. Deleting a mod folder alone is
not a substitute for removing its layout block. Source errors remain visible in
Herdr status; reload failures retain the last good running mod as Herdr normally does.

The contract intentionally supports compact status indicators and their actions.
A complex custom UI belongs in its own mod or overlay, opened by the component.
