# Branch status

The focused checkout’s branch, falling back to the active space. Long names truncate. No branch means no component. It follows the same pane/space context as the PR badge.

**Status-bar-compatible mod — API v1. Also works standalone.**
The configurable `status-bar` is required only for bar placement. This complete
folder works independently without that package. It runs no external commands
or network requests; it reads Herdr live state.

## Use independently

Install this complete folder with its license, provenance, client and icons.
Place a block in a personal layout:

```json
{
  "id": "status-branch",
  "type": "block",
  "content": { "mod": "status-branch" }
}
```

Allocate a suitable width and a height around 28px in the enclosing layout.

## Use inside the configurable bar

Install `status-bar` too and follow its RECIPE.md. Add this unhidden source block
inside the custom status row:

```json
{
  "id": "status-source-branch",
  "type": "block",
  "size": { "px": 0 },
  "content": {
    "mod": "status-branch",
    "props": { "statusBar": { "bar": "workspace", "item": "branch" } }
  }
}
```

Put `branch` in the bar’s `left` or `right` settings list. The bar handles width,
spacing, compact display and overflow. See its API.md for the full contract.

## Verify

Run `node --test tests/*.test.cjs` from this installed folder, then
`herdr-app check` on the package. Inspect Herdr status and the running screenshot.
