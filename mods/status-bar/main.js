// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Jacobo de Vera
import { View, div, svg } from "gpui-kit";
import { h_flex, v_flex, Button } from "gpui-base";
import {
    props,
    shared,
    setShared,
    checking,
    theme,
    layout,
    run,
    closeOverlay,
    nextCommand,
} from "herdr";
import { requestKey, itemKey, renderItem, performAction } from "./client.js";
import { allocate } from "./allocation.js";
import { DEFAULTS, loadSettings } from "./settings.js";

function find(node, id) {
    if (node?.id === id) return node;
    for (const child of node?.children ?? []) {
        const found = find(child, id);
        if (found) return found;
    }
    return null;
}

function validItem(item) {
    return (
        item &&
        typeof item.label === "string" &&
        (item.compactLabel === undefined ||
            typeof item.compactLabel === "string") &&
        (item.icon === undefined || typeof item.icon === "string") &&
        (item.color === undefined || typeof item.color === "string") &&
        (item.detail === undefined ||
            (item.detail &&
                typeof item.detail.label === "string" &&
                typeof item.detail.color === "string"))
    );
}

export default class StatusBar extends View {
    init(_props, cx) {
        this.options = props() ?? {};
        this.bar = this.options.bar ?? "workspace";
        this.settings = DEFAULTS;
        this.width = 0;
        this.widths = new Map();
        this.session = `${Date.now()}-${Math.random()}`;
        this.error = null;
        if (this.options.role || checking()) return;

        setShared(requestKey(this.bar), { api: 1, session: this.session });
        cx.spawn(async () => {
            for (;;) {
                const command = await nextCommand();
                if (command === "more") this.openMore();
            }
        });
        cx.spawn(async (cx) => {
            try {
                this.settings = await loadSettings();
            } catch (error) {
                this.error = error.message;
            }
            cx.notify();
        });
    }

    openMore() {
        if (!this.overflowItems?.length) return;
        performAction({
            overlay: {
                mod: "status-bar",
                kind: "popup",
                width: 320,
                props: { role: "overflow", items: this.overflowItems },
            },
        });
    }

    close() {
        if (
            !this.options.role &&
            !checking() &&
            shared(requestKey(this.bar))?.session === this.session
        )
            setShared(requestKey(this.bar), null);
    }

    switchButton() {
        const t = theme();
        const stack = this.options.stack ?? "status-modes";
        const native = this.options.native ?? "native-status";
        const custom = this.options.custom ?? "custom-status";
        const node = find(layout(), stack);
        const isCustom = node?.active === custom;
        const label = isCustom
            ? "Use stock status bar"
            : "Use custom status bar";
        return h_flex()
            .size_full()
            .bg(t.chrome)
            .border_t(1)
            .border_color(t.border)
            .items_center()
            .justify_center()
            .child(
                Button.new("status-switch")
                    .size(24)
                    .p(4)
                    .border(0)
                    .rounded(4)
                    .text_color(t.muted)
                    .accessibility_label(label)
                    .tooltip(node ? label : `Missing layout stack: ${stack}`)
                    .disabled(!node)
                    .hover((style) => style.bg(t.hover))
                    .on_click(() =>
                        run("layout.select", {
                            stack,
                            child: isCustom ? native : custom,
                        }),
                    )
                    .child(svg("mods/status-bar/icons/switch.svg").size(13)),
            );
    }

    overflow() {
        return v_flex()
            .w_full()
            .max_h(320)
            .overflow_y_scroll()
            .p(6)
            .gap(2)
            .min_w(200)
            .children(
                (this.options.items ?? []).map((item, index) => {
                    return renderItem(item, {
                        id: `overflow-${index}`,
                        onAction: (cx) => {
                            closeOverlay(this.options.overlay);
                            performAction(item.action, cx);
                        },
                    }).w_full();
                }),
            )
            .bg(theme().surface);
    }

    measure(item, variant, signature) {
        return h_flex()
            .id(`measure-${item.id}-${variant}`)
            .flex_none()
            .on_size_change((size, cx) => {
                const key = `${item.id}:${variant}`;
                const width = Math.ceil(size.width);
                const previous = this.widths.get(key);
                if (
                    previous?.signature === signature &&
                    previous.width === width
                )
                    return;
                this.widths.set(key, { signature, width });
                cx.notify();
            })
            .child(
                renderItem(item, {
                    id: `probe-${item.id}-${variant}`,
                    variant,
                    measure: true,
                }),
            );
    }

    render() {
        if (this.options.role === "switch") return this.switchButton();
        if (this.options.role === "overflow") return this.overflow();

        const t = theme();
        const { left, right, gap, padding, components } = this.settings;
        const items = [];
        const probes = [];
        for (const id of [...left, ...right]) {
            const record = shared(itemKey(this.bar, id));
            if (
                record?.api !== 1 ||
                record.session !== this.session ||
                !validItem(record.item) ||
                components[id]?.hidden
            )
                continue;
            const item = {
                ...record.item,
                ...components[id],
                id,
                side: right.includes(id) ? "right" : "left",
            };
            const signature = JSON.stringify(item);
            const measured = (variant) => {
                const value = this.widths.get(`${id}:${variant}`);
                return value?.signature === signature ? value.width : undefined;
            };
            items.push({
                ...item,
                fullWidth: measured("full"),
                compactWidth: measured("compact"),
            });
            probes.push(
                this.measure(item, "full", signature),
                this.measure(item, "compact", signature),
            );
        }

        // Keep a small margin; intrinsic measurements never depend on allocations.
        const allocation = allocate(
            items,
            Math.max(0, this.width - padding * 2 - 8 - (this.error ? 24 : 0)),
            gap,
        );
        this.overflowItems = allocation.overflow;
        const group = (side) =>
            h_flex()
                .gap(gap)
                .items_center()
                .flex_none()
                .children(
                    allocation.visible
                        .filter((item) => item.side === side)
                        .map((item) =>
                            renderItem(item, {
                                id: `item-${item.id}`,
                                variant: item.variant,
                                width: item.width,
                            }),
                        ),
                );
        const contents = h_flex().flex_1().min_w(0).h_full().items_center();
        if (allocation.scroll) contents.overflow_x_scroll();
        const leftGroup = group("left");
        if (allocation.overflow.length)
            leftGroup.child(
                Button.new("status-overflow")
                    .size(24)
                    .p(4)
                    .border(0)
                    .rounded(4)
                    .text_color(t.muted)
                    .accessibility_label("More status items")
                    .tooltip("More status items")
                    .flex_none()
                    .hover((style) => style.bg(t.hover))
                    .on_click(() => this.openMore())
                    .child(svg("mods/status-bar/icons/more.svg").size(13)),
            );
        const hasLeft =
            allocation.overflow.length ||
            allocation.visible.some((item) => item.side === "left");
        const hasRight = allocation.visible.some(
            (item) => item.side === "right",
        );
        if (hasLeft) contents.child(leftGroup);
        contents.child(
            div()
                .flex_1()
                .min_w(hasLeft && hasRight ? gap : 0),
        );
        if (hasRight) contents.child(group("right"));

        const root = h_flex()
            .id("status-bar-root")
            .relative()
            .size_full()
            .min_w(0)
            .overflow_hidden()
            .items_center()
            .px(padding)
            .bg(t.chrome)
            .border_t(1)
            .border_color(t.border)
            .on_size_change((size, cx) => {
                const width = Math.floor(size.width);
                if (this.width === width) return;
                this.width = width;
                cx.notify();
            })
            .child(contents);
        if (this.error)
            root.child(
                div().text_color(t.blocked).tooltip(this.error).child("!"),
            );
        return root.child(
            h_flex()
                .absolute()
                .left(0)
                .top(0)
                .opacity(0)
                .flex_none()
                .children(probes),
        );
    }
}
