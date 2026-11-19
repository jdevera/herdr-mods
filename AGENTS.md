# Working on these Herdr mods

- This repository is the source of truth; installed files on each client are deployments.
- Read the installed Herdr guides before changing UI code. Native GPUI JavaScript is not a browser or Node runtime.
- Preserve the user's existing layout, keys, terminals, and unrelated mods.
- For remote setups, identify the repository host and viewing clients at deployment time; verify each target explicitly.
- Keep hostnames, IP addresses, personal paths, and session-specific deployment details out of shared project files.
- Remote repository commands must run on the repository's machine. Open browser links on the viewing client.
- Validate changed mods with `herdr-app check`, inspect status, and visually verify the running client.
- Keep third-party licenses and attribution.
- Inspect third-party code before installing or executing it.

## Licensing and provenance

- MIT is the default for original work, including each new mod written from scratch.
- Reused code retains its inherited license and obligations. Do not replace an upstream license with MIT or describe inherited code as exclusively ours.
- Each mod must contain its own LICENSE and PROVENANCE.md with its source, pinned version/revision when available, authorship, and local changes.
- Preserve applicable copyright notices, license texts, and upstream NOTICE files. Mark modified Apache-2.0 files prominently as changed; use a JSON $comment for JSON files and normal comments for code.
- Keep license exceptions explicit in LICENSING.md and the containing mod's provenance. Before introducing incompatible terms, explain the constraint.
- Keep maintained mods under mods/; do not describe them as vendored. Keep provenance inside each mod, and do not copy upstream preview screenshots.
- Deployment must include each mod's license, notices, and provenance, including any separately licensed assets. Update paths, installers, and tests on moves.
