# Optional chezmoi deployment

Implemented on the `chezmoi` branch. See [setup and daily use](../chezmoi.md).
Research used chezmoi 2.74.1; the pre-chezmoi baseline is commit `7356ec2`.

The accepted design maps complete mod packages directly into the Herdr app home.
The panel's intermediate `runtime/` directory was flattened so installed files,
tests, helper source, and license files retain their source-relative paths.
Ordinary files can return through chezmoi re-add without transforming metadata.

A thin optional layer supplies ignore rules and an after-script that calls the
existing custom build command. There is no separate deployable-file inventory.
The installed `herdr-mods` executable supplies isolated config, cache, and state
for a third profile. It replaces the originally proposed shell function.

Layouts and personal settings remain user-owned. Complete packages still work
with manual copying or the Node installer. No Git remote or account ownership is
chosen by this setup.
