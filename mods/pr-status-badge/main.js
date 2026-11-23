// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Jacobo de Vera
import { View, div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, theme, focused, panes, exec, checking } from "herdr";
import { StatusClient, renderItem } from "./client.js";

export default class PrStatusBadge extends View {
    init(_props, cx) {
        this.client = new StatusClient();
        this.result = null;
        this.cache = null;
        this.pending = false;
        this.lastKey = null;
        this.lastCheck = 0;
        if (checking()) return;
        cx.timer.every(5000, (cx) => this.refresh(cx));
        this.refresh(cx);
    }

    close() {
        this.client.close();
    }

    target() {
        const focus = focused();
        const space =
            spaces().find((s) => s.id === focus?.space) ??
            spaces().find((s) => s.active);
        const pane = panes().find((p) => p.terminal === focus?.terminal);
        const cwd = focus?.cwd ?? space?.folder;
        const on = space?.machine ?? null;
        const branch = pane?.branch ?? space?.branch ?? null;
        return { cwd, on, branch, key: JSON.stringify([on, cwd, branch]) };
    }

    refresh(cx) {
        if (checking() || this.pending) return;
        const target = this.target();
        if (this.lastKey === target.key && Date.now() - this.lastCheck < 5000)
            return;
        this.lastKey = target.key;
        this.lastCheck = Date.now();
        if (!target.cwd) {
            this.result = null;
            return;
        }
        this.pending = true;
        cx.spawn(async (cx) => {
            let result = {
                key: target.key,
                branch: null,
                pr: null,
                error: null,
            };
            try {
                const options = {
                    cwd: target.cwd,
                    on: target.on,
                    timeout: 15000,
                };
                const git = await exec(
                    "git",
                    ["branch", "--show-current"],
                    options,
                );
                if (git.code === 0 && git.stdout.trim()) {
                    result.branch = git.stdout.trim();
                    const key = JSON.stringify([
                        target.on,
                        target.cwd,
                        result.branch,
                    ]);
                    if (
                        this.cache?.key !== key ||
                        Date.now() - this.cache.time >= 60000
                    ) {
                        let pr = null,
                            error = null;
                        try {
                            const response = await exec(
                                "gh",
                                [
                                    "pr",
                                    "view",
                                    result.branch,
                                    "--json",
                                    "number,url,title,state,isDraft,headRefName",
                                ],
                                options,
                            );
                            if (response.code === 0) {
                                const data = JSON.parse(response.stdout);
                                if (
                                    data.headRefName === result.branch &&
                                    /^https:\/\/[^/]+\/.+\/pull\/\d+$/.test(
                                        data.url,
                                    )
                                )
                                    pr = data;
                            } else if (
                                !/no pull requests? found/i.test(
                                    response.stderr,
                                )
                            ) {
                                error =
                                    response.stderr.trim() ||
                                    "GitHub PR lookup failed";
                            }
                        } catch (e) {
                            error = String(e);
                        }
                        this.cache = { key, time: Date.now(), pr, error };
                    }
                    result.pr = this.cache.pr;
                    result.error = this.cache.error;
                }
            } catch (e) {
                result.error = String(e);
            }
            this.pending = false;
            // A slow lookup must never attach another branch's PR to the current view.
            if (this.target().key === target.key) this.result = result;
            cx.notify();
        });
    }

    statusItem(result) {
        const pr = result?.pr;
        if (!pr) return null;
        const state =
            pr.state === "MERGED"
                ? "merged"
                : pr.state === "CLOSED"
                  ? "closed"
                  : pr.isDraft
                    ? "draft"
                    : "open";
        const styles = {
            draft: { color: "muted", icon: "git-pull-request-draft" },
            open: { color: "ansi2", icon: "git-pull-request" },
            closed: { color: "ansi1", icon: "git-pull-request-closed" },
            merged: { color: "ansi5", icon: "git-merge" },
        };
        const { color, icon } = styles[state];
        return {
            label: `PR #${pr.number}`,
            compactLabel: `#${pr.number}`,
            icon: `mods/pr-status-badge/icons/${icon}-16.svg`,
            color,
            tooltip: `${pr.title} · ${state}`,
            priority: 90,
            action: { url: pr.url },
        };
    }

    render(cx) {
        this.refresh(cx);
        const target = this.target();
        const result = this.result?.key === target.key ? this.result : null;
        const t = theme();
        const item = this.statusItem(result);
        this.client.publish(item);
        if (this.client.connected()) return div().size(0);

        return h_flex()
            .size_full()
            .items_center()
            .justify_center()
            .bg(t.chrome)
            .border_t(1)
            .border_color(t.border)
            .text_size(11.8)
            .child(item ? renderItem(item, { id: "pr-status-badge" }) : div());
    }
}
