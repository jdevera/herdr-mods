# Agent status

Agent count across all spaces, including a colored count of blocked agents. Blocked attention stays in the bar when space is limited.

**Status-bar-compatible mod — API v1. Also works standalone.**
The configurable `status-bar` is required only for bar placement. This complete
folder works independently without that package. It runs no external commands
or network requests; it reads Herdr live state.

## Use independently

Install this complete folder with its license, provenance, client and icons.
Place a block in a personal layout:

```json
{
  "id": "status-agents",
  "type": "block",
  "content": { "mod": "status-agents" }
}
```

Allocate a suitable width and a height around 28px in the enclosing layout.

## Use inside the configurable bar

Install `status-bar` too and follow its RECIPE.md. Add this unhidden source block
inside the custom status row:

```json
{
  "id": "status-source-agents",
  "type": "block",
  "size": { "px": 0 },
  "content": {
    "mod": "status-agents",
    "props": { "statusBar": { "bar": "workspace", "item": "agents" } }
  }
}
```

Put `agents` in the bar’s `left` or `right` settings list. The bar handles width,
spacing, compact display and overflow. See its API.md for the full contract.

## Verify

Run `node --test tests/*.test.cjs` from this installed folder, then
`herdr-app check` on the package. Inspect Herdr status and the running screenshot.
