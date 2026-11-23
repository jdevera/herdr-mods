// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Jacobo de Vera
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

function badge(connected = false) {
    const paths = [],
        links = [],
        state = new Map(),
        tasks = [];
    const t = { muted: "gray", ansi2: "green", ansi1: "red", ansi5: "purple" };
    const focus = { space: "space", terminal: "terminal", cwd: "/checkout" };
    let checking = true;
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
        Button: { new: element },
        svg: (path) => {
            paths.push(path);
            return element();
        },
        theme: () => t,
        checking: () => checking,
        props: () =>
            connected ? { statusBar: { bar: "test", item: "pr" } } : {},
        shared: (key) => state.get(key),
        setShared: (key, value) => state.set(key, value),
        focused: () => focus,
        panes: () => [{ terminal: "terminal", branch: "feature" }],
        spaces: () => [
            {
                id: "space",
                active: true,
                machine: "remote-example",
                branch: "other",
                folder: "/repo",
            },
        ],
        run() {},
        openOverlay() {},
        exec: async () => ({ code: 0, stdout: "feature", stderr: "" }),
    };
    const clean = (file) =>
        readFileSync(join(__dirname, "..", file), "utf8").replace(
            /^import\s+[\s\S]*?;$/gm,
            "",
        );
    vm.runInNewContext(clean("client.js").replace(/^export /gm, ""), context);
    vm.runInNewContext(
        clean("main.js").replace(
            "export default class PrStatusBadge",
            "globalThis.Badge=class PrStatusBadge",
        ),
        context,
    );
    const mod = new context.Badge();
    const cx = {
        notify() {},
        timer: { every() {} },
        spawn(fn) {
            tasks.push(fn(cx));
        },
    };
    mod.init({}, cx);
    checking = false;
    return { mod, paths, links, context, focus, state, tasks, cx };
}

test("standalone and bar presentations share PR state icons, colors and client-side links", () => {
    for (const [state, isDraft, color, icon] of [
        ["OPEN", false, "green", "git-pull-request"],
        ["OPEN", true, "gray", "git-pull-request-draft"],
        ["CLOSED", false, "red", "git-pull-request-closed"],
        ["MERGED", true, "purple", "git-merge"],
    ]) {
        const h = badge();
        const url = "https://github.com/example/repo/pull/42";
        const item = h.mod.statusItem({
            pr: { number: 42, title: "Example", state, isDraft, url },
        });
        assert.equal(item.label, "PR #42");
        assert.equal(item.compactLabel, "#42");
        const tree = h.context.renderItem(item);
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

test("absent PR unregisters its visible content instead of reserving a badge slot", () => {
    const h = badge(true);
    h.state.set("status-bar.v1.test.request", { api: 1, session: "one" });
    h.mod.refresh = () => {};
    h.mod.render(h.cx);
    assert.equal(h.state.get("status-bar.v1.test.item.pr").item, null);
    assert.deepEqual(h.paths, []);
    h.mod.close();
    assert.equal(h.state.get("status-bar.v1.test.item.pr"), null);
});

test("lookup follows the focused checkout and routes Git and gh to its machine", async () => {
    const h = badge();
    const calls = [];
    h.context.exec = async (command, args, options) => {
        calls.push({ command, args, options });
        return {
            code: 0,
            stderr: "",
            stdout:
                command === "git"
                    ? "feature\n"
                    : JSON.stringify({
                          number: 42,
                          headRefName: "feature",
                          url: "https://github.com/example/repo/pull/42",
                          state: "OPEN",
                      }),
        };
    };
    h.mod.refresh(h.cx);
    await Promise.all(h.tasks);
    assert.deepEqual(
        calls.map(({ command }) => command),
        ["git", "gh"],
    );
    for (const call of calls) {
        assert.equal(call.options.cwd, "/checkout");
        assert.equal(call.options.on, "remote-example");
    }
    assert.equal(h.mod.result.pr.number, 42);
});

test("a slow response cannot attach a PR to a different checkout", async () => {
    const h = badge();
    let finishGit;
    h.context.exec = (command) =>
        command === "git"
            ? new Promise((resolve) => {
                  finishGit = resolve;
              })
            : Promise.resolve({
                  code: 1,
                  stdout: "",
                  stderr: "no pull requests found",
              });
    h.mod.refresh(h.cx);
    h.focus.cwd = "/another-checkout";
    finishGit({ code: 0, stdout: "feature", stderr: "" });
    await Promise.all(h.tasks);
    assert.equal(h.mod.result, null);
    assert.equal(h.mod.pending, false);
});
