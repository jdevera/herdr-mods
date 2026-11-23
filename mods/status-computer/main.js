// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Jacobo de Vera
import { View, div } from "gpui-kit";
import { spaces } from "herdr";
import { StatusClient, renderItem } from "./client.js";

export default class ComputerStatus extends View {
    init() {
        this.client = new StatusClient();
    }

    close() {
        this.client.close();
    }

    render() {
        const space = spaces().find((space) => space.active);
        const label = space?.machine ?? "This computer";
        const item = {
            label,
            compactLabel: "",
            tooltip: label,
            icon: `mods/status-computer/icons/${space?.machine ? "server" : "computer"}.svg`,
            priority: 20,
            minWidth: 60,
            maxWidth: 220,
        };
        this.client.publish(item);
        return this.client.connected() ? div().size(0) : renderItem(item);
    }
}
