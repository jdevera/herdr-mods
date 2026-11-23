# Branch status setup

Read the installed Herdr guide and this package's source and README.md. Install
this complete package through the repository's chezmoi workflow, preserving
settings, licenses and provenance. This mod runs no programs or network requests.

For standalone placement, add an ordinary layout block referencing `status-branch`.
For bar placement, install status-bar and follow its RECIPE.md, using item ID
`branch`. Keep its zero-width source block unhidden and add the item ID to the
bar's settings. Preserve unrelated layout nodes and avoid duplicate sources.

Run the package tests, `herdr-app check`, inspect status, and verify a screenshot.
