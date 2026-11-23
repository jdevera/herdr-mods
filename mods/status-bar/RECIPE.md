# Configurable status bar setup

1. Read the target client's installed Herdr guide and each mod's source. Use the
   repository's chezmoi workflow for installation. Preserve settings and the rest
   of the user's layout. Clone a shipped layout before changing its structure.
2. Locate the existing bottom status region inside the work column. Replace only
   that region with the `status-strip` subtree from
   `examples/layouts/main-pr.json` in this repository. It is a 28px-high row.
3. The row contains `status-modes`, a stack whose `native-status` child references
   stock `workspace-status`, and whose `custom-status` child holds the custom bar
   and component sources. The adjacent 28px switch uses `status-bar` with
   `props: { "role": "switch" }`. Keep the switch outside the stack.
4. Each component source is an unhidden block with `size: { "px": 0 }` in the
   custom row. Its content references the compatible mod and supplies
   `props: { "statusBar": { "bar": "workspace", "item": "computer" } }`.
   The host uses `props: { "bar": "workspace" }`. Source item IDs must match
   the bar's configured `left` and `right` lists. Do not hide source blocks:
   Herdr must start them so they can register. Use settings to hide components.
5. Reuse existing instances where appropriate; remove the previous standalone
   PR badge block from this status region so it does not reserve another 130px.
   Preserve the PR panel and its separate toggle. Inspect for any duplicate
   instances Herdr automatically docked during first discovery and remove only
   new duplicates from this installation.
6. If these IDs already serve other purposes, choose unique ones and pass the
   switch's `stack`, `native`, and `custom` props accordingly. Every bar needs
   a unique `bar` ID, shared with its sources. Configure bar settings in the
   installed `status-bar/settings*.json` files.
7. Check every changed mod with `herdr-app check`, inspect status, and visually
   verify custom, stock, narrow, and missing-PR states. Use `layout.select` to
   test switching without pointer automation. Restore the custom selection.

To add a compatible mod later, copy its complete package with legal files,
add an unhidden zero-width source block to the custom row, and add its item ID
to the bar settings. No source imports, bar edits, or compilation are needed.
See README.md and API.md for configuration and the component contract.
