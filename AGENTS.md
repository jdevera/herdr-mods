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

## Mod conventions

- Keep `main.js`, `mod.json`, and `mod.meta.json` at each mod’s package root, with tests and helper source alongside them. Installed copies should support running and editing their own tests.

- Compose standalone controls beside stock Herdr bars; do not copy a whole bar to add a button or badge. The PR panel owns its lightweight button mode.
- Keep mod icon assets in an `icons/` subfolder.
- Herdr owns `mod.json`; keep its runtime fields there. Repository metadata belongs in `mod.meta.json` (description, license identifier, optional install argv and build inputs/outputs/requirements). Read both files and reuse Herdr fields such as title rather than duplicating them. User configuration belongs only in `settings*.json`. Do not add repository fields or settings to the Herdr manifest.
- Load `settings.json`, then `settings.*.json` in alphabetical (code-point) order. Recursively merge objects; later files override specified values. Keep defaults in code and describe configuration in `config.schema.json`.
- Chezmoi through `herdr-mods` is the repository installation and update workflow. Do not maintain a separate mod-copying installer or partial-install CLI. Keep packages independently copyable for agents.
- A mod may declare an optional `install` command in `mod.meta.json` as a nonempty array of nonempty strings. Never accept a shell command string.
- Integrate custom command review into setup and apply: show all commands, offer all/individual/none/cancel, and remember choices. `--yes` opts in without bypassing chezmoi conflict prompts. Run approved commands after chezmoi copies files, without an implicit shell, from the installed package directory, with `HERDR_MOD_DIR` and `HERDR_APP_HOME` pointing to the destination.
- Use chezmoi onchange hooks for executable updates and restoration. Include source checksums and missing-output state; a fresh missing-output token must restore a binary even if it is deleted immediately after its first build. Build to temporary files and replace working executables only after success.
- Custom commands handle additions or corrections, must be safe to rerun, and must not replace chezmoi file synchronization. Preserve user settings and report post-install failures separately from successful file installation.

- Map complete packages directly with chezmoi, including tests and helper source. Keep chezmoi-specific machinery outside mod packages. Exclude local settings and generated artifacts in both Git and deployment rules. Test ignore behavior and edits returning through re-add.
- Write installation instructions in job-first order: what the user wants, commands, what they do, then requirements. Keep implementation details in a separate section.
- Keep handwritten root README content generic. Mod-specific descriptions belong in the generated catalogue; setup, dependencies, configuration examples, and provenance belong in each mod's documentation.
- `herdr-mods` is an installed executable, not a shell function. Keep its profile isolated from other chezmoi sources. Do not edit shell configuration to install it; use a directory already on PATH or give installation instructions.

- Format code and configuration with Prettier. Use four-space indentation for TypeScript and JavaScript. Use blank lines between logical steps, blocks, and declarations; the ESLint autofix hook enforces vertical spacing in TypeScript. The prek hook formats automatically and stops the commit when files change; stage those changes and retry. Preserve license texts and retained notices verbatim.
