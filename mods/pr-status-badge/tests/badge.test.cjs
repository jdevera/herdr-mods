// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Jacobo de Vera
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

function badge() {
    const paths = [];
    const links = [];
    function element() {
        const data = { children: [] };
        const proxy = new Proxy(data, {
            get(target, key) {
                if (key in target) return target[key];
                return (...args) => {
                    if (key === "child") target.children.push(args[0]);
                    if (key === "text_color") target.color = args[0];
                    if (key === "on_click") target.click = args[0];
                    return proxy;
                };
            },
        });
        return proxy;
    }
    const context = {
        View: class {},
        div: element,
        h_flex: element,
        svg: (path) => {
            paths.push(path);
            return element();
        },
    };
    const source = readFileSync(join(__dirname, "../main.js"), "utf8")
        .replace(/^import\s+[\s\S]*?;$/gm, "")
        .replace(
            "export default class PrStatusBadge",
            "globalThis.Badge = class PrStatusBadge",
        );
    vm.runInNewContext(source, context);
    return { mod: new context.Badge(), paths, links };
}

test("badge uses the matching state icon and opens its PR URL on the client", () => {
    const t = { muted: "gray", ansi2: "green", ansi1: "red", ansi5: "purple" };
    for (const [state, isDraft, color, icon] of [
        ["OPEN", false, "green", "git-pull-request"],
        ["OPEN", true, "gray", "git-pull-request-draft"],
        ["CLOSED", false, "red", "git-pull-request-closed"],
        ["MERGED", true, "purple", "git-merge"],
    ]) {
        const h = badge();
        const url = "https://github.com/example/repo/pull/42";
        const tree = h.mod.prBadge(t, {
            pr: { number: 42, title: "Example", state, isDraft, url },
        });
        assert.equal(tree.color, color);
        assert.deepEqual(h.paths, [
            `mods/pr-status-badge/icons/${icon}-16.svg`,
        ]);
        assert.ok(existsSync(join(__dirname, `../icons/${icon}-16.svg`)));
        tree.click(
            {},
            { stop_propagation() {}, open_url: (value) => h.links.push(value) },
        );
        assert.deepEqual(h.links, [url]);
    }
});

test("absent PR draws no badge or link", () => {
    const h = badge();
    const tree = h.mod.prBadge({}, null);
    assert.deepEqual(tree.children, []);
    assert.equal(Object.hasOwn(tree, "click"), false);
    assert.deepEqual(h.paths, []);
});
