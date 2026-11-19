# Ideas

Follow-ups, not requirements for the first chezmoi setup. Keep the mods usable
without chezmoi and avoid rebuilding features chezmoi already provides.

## Make local development easier

- **A useful `herdr-mods doctor`.** Check the isolated profile, command on PATH,
  required tools, missing helper binaries, and Herdr validation errors. Explain
  the smallest corrective action for each failure.
- **Test the installed copy with one command.** Discover a mod's declared test
  command and run it where the user is editing, before bringing changes back.
  Keep commands as argument arrays, as with installation.
- **Explain deployment drift.** Show which mods differ between the checkout and
  installed files, with shortcuts to the relevant native chezmoi diff and re-add
  commands. Never automatically choose which side wins.
- **Preview layout integration.** Have an agent produce a small, reviewable
  layout diff using each mod's recipe, preserving existing panes and shortcuts.

## Make the PR panel more useful

- **Show freshness explicitly.** Keep cached results visible while refreshing,
  show when they were fetched, and offer a deliberate refresh action.
- **Make failed checks actionable.** Group failed jobs first, retain links to
  GitHub, and make the failing log section easy to find and copy.
- **Remember panel navigation per PR.** Preserve the selected section and scroll
  position when switching between branch and repository views.
- **Give failures useful empty states.** Distinguish no linked PR, missing
  authentication, rate limiting, and a temporarily unavailable GitHub connection.

## Keep sharing simple

- **Generate a small mod catalogue.** Extend the README generated from each
  `mod.json` with dependencies and installation steps, without a central manifest.
- **Check upstream changes.** Use each mod's provenance to report new upstream
  revisions for review; never silently replace local improvements or licenses.
- **Build downloadable command binaries.** Once account ownership and a remote
  are chosen, automate platform builds and publish checksums so installation
  does not require a development toolchain.
