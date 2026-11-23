// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Jacobo de Vera
import { View, div } from "gpui-kit";
import { keys, window } from "herdr";
import { StatusClient, renderItem } from "./client.js";

export function shortcut() {
    const binding = keys().find(
        (binding) =>
            binding.section === "global" && binding.action === "app.palette",
    );
    if (!binding) return "";
    const mac = window()?.platform === "macos";
    const symbols = mac
        ? { cmd: "⌘", ctrl: "⌃", alt: "⌥", option: "⌥", shift: "⇧" }
        : {
              cmd: "Ctrl+",
              ctrl: "Ctrl+",
              alt: "Alt+",
              option: "Alt+",
              shift: "Shift+",
          };
    const parts = binding.keys.endsWith("--")
        ? [...binding.keys.slice(0, -2).split("-"), "-"]
        : binding.keys.split("-");
    return parts
        .map((key) => symbols[key.toLowerCase()] ?? key.toUpperCase())
        .join("");
}

export default class CommandsStatus extends View {
    init() {
        this.client = new StatusClient();
    }
    close() {
        this.client.close();
    }

    render() {
        const key = shortcut();
        const item = {
            label: key ? `${key} Commands` : "Commands",
            compactLabel: "",
            tooltip: key ? `Commands (${key})` : "Commands",
            icon: "mods/status-commands/icons/commands.svg",
            priority: 10,
            action: { command: "app.palette" },
        };
        this.client.publish(item);
        return this.client.connected() ? div().size(0) : renderItem(item);
    }
}
