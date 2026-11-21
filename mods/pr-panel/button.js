// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Jacobo de Vera
import { div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { checking, layout, run, shared, setShared, theme } from "herdr";

function findPanelNode(node, id) {
    if (node?.id === id) return node;
    for (const child of node?.children ?? []) {
        const found = findPanelNode(child, id);
        if (found) return found;
    }
    return null;
}

export function createPanelButton(options) {
    const button = {
        container: options.container ?? "panel",
        stack: options.stack ?? "panel-body",
        target: options.target ?? "pull-requests",
    };
    // The stock tab bar restores only panels registered here. Preserve the
    // user's choices, including an intentionally empty list.
    const enabled = shared("workspace.panels") ?? ["files", "changes"];
    if (!checking() && !enabled.includes(button.target)) {
        setShared("workspace.panels", [...enabled, button.target]);
    }
    return button;
}

export function renderPanelButton(button) {
    const root = layout();
    const panel = findPanelNode(root, button.container);
    const stack = findPanelNode(root, button.stack);
    const available =
        panel && stack?.children?.some((child) => child.id === button.target);
    const active = available && !panel.hidden && stack.active === button.target;
    const t = theme();
    const control = div()
        .id("pr-panel-toggle")
        .px(8)
        .py(5)
        .rounded(6)
        .text_size(12)
        .bg(active ? t.selected : t.chrome)
        .text_color(available ? (active ? t.foreground : t.muted) : t.dim)
        .tooltip(
            available
                ? "Show or hide pull requests"
                : "Add the PR panel to this layout",
        )
        .on_mouse_down("left", (_event, cx) => cx.stop_propagation())
        .child(
            h_flex()
                .items_center()
                .gap(5)
                .child(svg("mods/pr-panel/icons/pull-request.svg").size(14))
                .child("PRs"),
        );

    if (available) {
        control
            .hover((style) => style.bg(t.hover))
            .on_click(() => {
                if (active) run("layout.hide", { id: button.container });
                else {
                    run("layout.select", {
                        stack: button.stack,
                        child: button.target,
                    });
                    run("layout.show", { id: button.container });
                }
            });
    }
    return h_flex()
        .size_full()
        .items_center()
        .justify_center()
        .bg(t.chrome)
        .border_b(1)
        .border_color(t.border)
        .child(control);
}
