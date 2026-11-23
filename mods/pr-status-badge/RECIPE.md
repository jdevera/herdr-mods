# PR status badge setup

Original MIT-licensed documentation; see LICENSE.

1. Read `herdr-app --skill` and the target client's installed `AGENTS.md`.
2. Inspect the current layout. Clone a shipped layout before editing it.
3. Install this complete package as `$HERDR_APP_HOME/mods/pr-status-badge`, including LICENSE, LICENSE-octicons, and PROVENANCE.md. Git and authenticated `gh` must be available on the repository machine.
4. Locate the existing bottom status block inside the work area's **column**. Replace that block in place with the status row below, keeping the existing status block as its first child. The row is 28 pixels high; the badge is 130 pixels wide. Do not append the badge to the root row, the work-body row, or the panel stack: those placements create a full-height sidebar. Preserve the rest of the layout. The badge renders only a PR number and state icon, and opens GitHub on the viewing client. Without a matching PR it draws no badge.
5. Validate both the mod and the running client with `herdr-app check`, `herdr-app status`, and a screenshot.

The badge is independent of `pr-panel`. It follows the focused checkout, routes
Git and gh to its machine, and caches PR lookups for one minute. State colors are
gray for draft, green for open, red for closed, and purple for merged.

## Bottom status row

Use this structure in place of the existing bottom status block. Keep its
existing ID, content, and props in the first child, and choose unique IDs for
the new row and badge. If there is already a bottom status row, add the badge
there instead of nesting another row. If it already contains this badge, move
or reuse that instance rather than adding a second one.

```json
{
  "id": "status-strip",
  "type": "row",
  "size": { "px": 28 },
  "resizable": false,
  "children": [
    {
      "id": "status",
      "type": "block",
      "content": { "mod": "workspace-status" }
    },
    {
      "id": "pr-status",
      "type": "block",
      "size": { "px": 130 },
      "content": { "mod": "pr-status-badge" }
    }
  ]
}
```

The intended nesting is `work (column) → status-strip (row) → status + badge`.
Herdr's `size.px` applies along the parent's direction: the column sets the
status row's height, and the row sets the badge's width. The badge fills its
allocated block; it cannot position itself at the bottom of the window.
Verify that the badge sits at the bottom right, with no new full-height column
or loss of terminal height beyond the existing status row.

## Migrate the earlier replacement status bar

The former `pr-badge` package included a copy of Herdr's whole status bar.
Replace that layout reference with the stock `workspace-status`, then add the
new standalone badge beside it. After verifying the new layout, remove the old
installed `pr-badge` folder. Chezmoi does not automatically remove obsolete files.
Do not delete user configuration or unrelated customizations. The reference
arrangement is in `examples/layouts/main-pr.json`; adapt it to the existing layout.

## Use the configurable status bar

This is a **status-bar-compatible mod, API v1**, and also works standalone using
the layout above. For bar placement, install `status-bar` and follow its recipe.
Use item ID `pr` and mod `pr-status-badge` in an unhidden zero-width source block
with `props.statusBar = {bar: "workspace", item: "pr"}`. Add `pr` between `branch`
and `agents` in the bar settings. Remove this region's old standalone badge block
to release its fixed 130px slot. No PR publishes null and takes no bar space.
The complete folder, including client.js, remains independently copyable.
