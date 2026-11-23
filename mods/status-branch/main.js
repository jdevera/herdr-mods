// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Jacobo de Vera
import { View, div } from "gpui-kit";
import { spaces, focused, panes } from "herdr";
import { StatusClient, renderItem } from "./client.js";

export default class BranchStatus extends View {
    init() {
        this.client = new StatusClient();
    }
    close() {
        this.client.close();
    }

    render() {
        const focus = focused();
        const space =
            spaces().find((space) => space.id === focus?.space) ??
            spaces().find((space) => space.active);
        const pane = panes().find((pane) => pane.terminal === focus?.terminal);
        const label = pane?.branch ?? space?.branch;
        const item = label
            ? {
                  label,
                  tooltip: label,
                  icon: "mods/status-branch/icons/branch.svg",
                  minWidth: 64,
                  maxWidth: 240,
                  priority: 80,
              }
            : null;
        this.client.publish(item);
        return this.client.connected() || !item
            ? div().size(0)
            : renderItem(item);
    }
}
