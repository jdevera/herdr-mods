// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Jacobo de Vera
import { View, div } from "gpui-kit";
import { agents } from "herdr";
import { StatusClient, renderItem } from "./client.js";

export default class AgentStatus extends View {
    init() {
        this.client = new StatusClient();
    }
    close() {
        this.client.close();
    }

    render() {
        const list = agents();
        const blocked = list.filter(
            (agent) => agent.status === "blocked",
        ).length;
        const item = {
            label: `${list.length} agents`,
            compactLabel: String(list.length),
            tooltip: `${list.length} agents across all spaces${blocked ? ` · ${blocked} needs you` : ""}`,
            icon: "mods/status-agents/icons/agents.svg",
            priority: blocked ? 100 : 70,
            keepVisible: blocked > 0,
        };
        if (blocked)
            item.detail = {
                label: `· ${blocked} needs you`,
                compactLabel: `· ${blocked}!`,
                color: "blocked",
            };
        this.client.publish(item);
        return this.client.connected() ? div().size(0) : renderItem(item);
    }
}
