// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Jacobo de Vera
// Status Bar API v1 client. Distributed with compatible mods so they remain standalone.
import {
    checking,
    props,
    shared,
    setShared,
    theme,
    run,
    openOverlay,
} from "herdr";
import { div, svg } from "gpui-kit";
import { h_flex, Button } from "gpui-base";

export const API_VERSION = 1;

export function requestKey(bar) {
    return `status-bar.v1.${bar}.request`;
}

export function performAction(action, cx) {
    if (action?.url && /^https?:\/\//.test(action.url)) cx.open_url(action.url);
    else if (action?.command) run(action.command, action.args ?? {});
    else if (action?.overlay) openOverlay(action.overlay);
}

// The standalone mod and the bar share presentation and actions.
export function renderItem(item, options = {}) {
    const t = theme();
    const compact = options.variant === "compact";
    const label = compact ? (item.compactLabel ?? item.label) : item.label;
    const color = t[item.color] ?? t.muted;
    const actionable = Boolean(item.action) && !options.measure;
    const id = options.id ?? "status-item";
    const content = h_flex().items_center().gap(5).min_w(0);

    if (item.icon) content.child(svg(item.icon).size(13).flex_none());
    if (label) content.child(div().min_w(0).truncate().child(label));
    if (item.detail)
        content.child(
            div()
                .flex_none()
                .text_color(t[item.detail.color] ?? color)
                .child(
                    compact
                        ? (item.detail.compactLabel ?? item.detail.label)
                        : item.detail.label,
                ),
        );

    const root = actionable ? Button.new(id) : h_flex().id(id);
    root.h(24)
        .px(4)
        .py(0)
        .gap(0)
        .border(0)
        .rounded(4)
        .min_w(0)
        .text_size(11.8)
        .text_color(color)
        .items_center()
        .justify_start()
        .flex_none()
        .child(content);
    if (options.width !== undefined) root.w(options.width);
    if (!options.measure) root.tooltip(item.tooltip ?? item.label);
    if (actionable)
        root.accessibility_label(item.tooltip ?? item.label)
            .hover((style) => style.bg(t.hover))
            .on_click((_event, cx) => {
                cx.stop_propagation();
                if (options.onAction) options.onAction(cx);
                else performAction(item.action, cx);
            });
    return root;
}

export function itemKey(bar, item) {
    return `status-bar.v1.${bar}.item.${item}`;
}

export class StatusClient {
    constructor() {
        this.connection = props()?.statusBar ?? null;
        this.owner = `${Date.now()}-${Math.random()}`;
    }

    connected() {
        return Boolean(this.connection?.bar && this.connection?.item);
    }

    publish(item) {
        if (!this.connected() || checking()) return;

        const { bar, item: id } = this.connection;
        const request = shared(requestKey(bar));
        if (request?.api !== API_VERSION || !request.session) return;

        const key = itemKey(bar, id);
        const value = {
            api: API_VERSION,
            session: request.session,
            owner: this.owner,
            item,
        };
        if (JSON.stringify(shared(key)) !== JSON.stringify(value))
            setShared(key, value);
    }

    close() {
        if (!this.connected() || checking()) return;

        const { bar, item } = this.connection;
        const key = itemKey(bar, item);
        if (shared(key)?.owner === this.owner) setShared(key, null);
    }
}
