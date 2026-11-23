# Computer status

The active space’s machine name, or This computer. Compact form uses its computer/server icon; the tooltip keeps the name.

**Status-bar-compatible mod — API v1. Also works standalone.**
The configurable `status-bar` is required only for bar placement. This complete
folder works independently without that package. It runs no external commands
or network requests; it reads Herdr live state.

## Use independently

Install this complete folder with its license, provenance, client and icons.
Place a block in a personal layout:

```json
{
  "id": "status-computer",
  "type": "block",
  "content": { "mod": "status-computer" }
}
```

Allocate a suitable width and a height around 28px in the enclosing layout.

## Use inside the configurable bar

Install `status-bar` too and follow its RECIPE.md. Add this unhidden source block
inside the custom status row:

```json
{
  "id": "status-source-computer",
  "type": "block",
  "size": { "px": 0 },
  "content": {
    "mod": "status-computer",
    "props": { "statusBar": { "bar": "workspace", "item": "computer" } }
  }
}
```

Put `computer` in the bar’s `left` or `right` settings list. The bar handles width,
spacing, compact display and overflow. See its API.md for the full contract.

## Verify

Run `node --test tests/*.test.cjs` from this installed folder, then
`herdr-app check` on the package. Inspect Herdr status and the running screenshot.
