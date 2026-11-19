#!/usr/bin/env python3
"""Install this project's mods into an existing personal Herdr layout."""

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import shutil
import sys


PROJECT = Path(__file__).resolve().parent.parent
MODS = {
    "branch-pr": PROJECT / "mods/branch-pr/runtime",
    "tabs-pr": PROJECT / "mods/tabs-pr",
    "workspace-status-pr": PROJECT / "mods/workspace-status-pr",
}
CLONED_FROM = {"tabs-pr": "tabs", "workspace-status-pr": "workspace-status"}
LEGAL_FILES = ("LICENSE", "NOTICE", "PROVENANCE.md")
HELPER = PROJECT / ".build/herdr-pr"


def read_json(path):
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError) as error:
        raise ValueError(f"Cannot read {path}: {error}") from error


def find_node(node, name):
    if node.get("id") == name:
        return node
    for child in node.get("children", []):
        found = find_node(child, name)
        if found is not None:
            return found
    return None


def prepare_layout(path):
    """Validate and edit a copy in memory before touching installed files."""
    layout = read_json(path)
    tabs = find_node(layout, "tabs")
    panels = find_node(layout, "panel-body")
    if tabs is None or panels is None:
        raise ValueError("main-pr must contain tabs and panel-body nodes")
    if tabs.get("content", {}).get("mod") not in ("tabs", "tabs-pr"):
        raise ValueError("main-pr uses a different tab bar; integrate it manually")

    panel = find_node(panels, "pull-requests")
    if panel is None:
        panels["children"].append({
            "id": "pull-requests",
            "type": "block",
            "content": {"mod": "branch-pr"},
        })
    elif panel.get("content", {}).get("mod") != "branch-pr":
        raise ValueError("The pull-requests layout ID belongs to another mod")

    tabs["content"]["mod"] = "tabs-pr"
    return layout


def validate_mods(app):
    """Check sources and existing installations; return settings to preserve."""
    if not HELPER.is_file():
        raise ValueError("Build .build/herdr-pr before installing; see README.md")

    settings = {}
    for name, source in MODS.items():
        read_json(source / "mod.json")
        for filename in LEGAL_FILES:
            path = PROJECT / "mods" / name / filename
            if not path.is_file():
                raise ValueError(f"Missing required attribution file: {path}")

        destination = app / "mods" / name
        if destination.is_symlink():
            raise ValueError(f"Refusing to replace a symlink: {destination}")
        if not destination.exists():
            continue

        manifest = read_json(destination / "mod.json")
        if name in CLONED_FROM:
            matches = manifest.get("cloned_from", {}).get("name") == CLONED_FROM[name]
        else:
            matches = manifest.get("title") == "Branch PR"
        if not matches:
            raise ValueError(f"{destination} contains an unrelated mod")
        if "settings" in manifest:
            settings[name] = manifest["settings"]
    return settings


def install_mod(name, source, app, backup, settings):
    destination = app / "mods" / name
    if destination.exists():
        shutil.copytree(destination, backup / name)

    shutil.copytree(
        source,
        destination,
        dirs_exist_ok=True,
        ignore=shutil.ignore_patterns("*.d.ts", "jsconfig.json", "*.error", "bin"),
    )
    for filename in LEGAL_FILES:
        shutil.copy2(PROJECT / "mods" / name / filename, destination / filename)

    if name in settings:
        path = destination / "mod.json"
        manifest = read_json(path)
        manifest["settings"] = settings[name]
        path.write_text(json.dumps(manifest, indent=2) + "\n")


def install(app):
    layout_path = app / "layouts/main-pr.json"
    layout = prepare_layout(layout_path)
    settings = validate_mods(app)

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    backup = app / "backups" / f"pr-panel-{stamp}"
    backup.mkdir(parents=True)
    shutil.copy2(layout_path, backup / layout_path.name)

    for name, source in MODS.items():
        install_mod(name, source, app, backup, settings)

    binary = app / "mods/branch-pr/bin/herdr-pr"
    binary.parent.mkdir(exist_ok=True)
    temporary = binary.with_suffix(".new")
    shutil.copy2(HELPER, temporary)
    # macOS requires replacing a signed executable, not rewriting it in place.
    temporary.replace(binary)

    layout_path.write_text(json.dumps(layout, indent=2) + "\n")
    print(f"Installed mods into {app}")
    print(f"Backup: {backup}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "app_home", nargs="?", type=Path,
        default=Path.home() / ".config/herdr-app",
        help="Herdr config directory (default: ~/.config/herdr-app)",
    )
    args = parser.parse_args()
    try:
        install(args.app_home.expanduser())
    except (OSError, ValueError) as error:
        print(f"Install failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
