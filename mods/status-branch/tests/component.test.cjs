// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Jacobo de Vera
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const { join, basename, dirname } = require("node:path");
const vm = require("node:vm");
const name = basename(dirname(__dirname));

function harness(connected = false) {
    const state = new Map();
    const writes = [];
    const icons = [];
    const commands = [];
    const live = {
        spaces: [{ id: "space", active: true, branch: "main", machine: null }],
        agents: [],
        panes: [],
        focus: { space: "space", terminal: "t1" },
    };
    function element() {
        const data = { children: [] };
        const proxy = new Proxy(data, {
            get(target, key) {
                if (key in target) return target[key];
                return (...args) => {
                    if (key === "child") target.children.push(args[0]);
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
            icons.push(path);
            return element();
        },
        theme: () => ({}),
        props: () =>
            connected ? { statusBar: { bar: "test", item: "item" } } : {},
        shared: (key) => state.get(key),
        checking: () => false,
        setShared: (key, value) => {
            state.set(key, value);
            writes.push([key, value]);
        },
        spaces: () => live.spaces,
        agents: () => live.agents,
        focused: () => live.focus,
        panes: () => live.panes,
        keys: () => [
            { section: "global", action: "app.palette", keys: "cmd-shift-p" },
        ],
        window: () => ({ platform: "macos" }),
        run: (...args) => commands.push(args),
        openOverlay() {},
    };
    const clean = (file) =>
        readFileSync(join(__dirname, "..", file), "utf8").replace(
            /^import\s+[\s\S]*?;$/gm,
            "",
        );
    vm.runInNewContext(
        clean("client.js").replace(/^export /gm, "") +
            "\nglobalThis.Client=StatusClient;",
        context,
    );
    vm.runInNewContext(
        clean("main.js")
            .replace(/export default class (\w+)/, "globalThis.Mod=class $1")
            .replace(/^export /gm, ""),
        context,
    );
    const mod = new context.Mod();
    mod.init();
    return { mod, state, writes, icons, live, commands, context };
}

test("standalone use needs no status bar and retains its own assets and actions", () => {
    const h = harness();
    const tree = h.mod.render();
    assert.equal(h.writes.length, 0);
    for (const icon of h.icons)
        assert.ok(
            existsSync(
                join(
                    __dirname,
                    "..",
                    icon
                        .split(`/mods/${name}/`)
                        .at(-1)
                        .replace(`mods/${name}/`, ""),
                ),
            ),
        );
    if (name === "status-commands") {
        tree.click({}, { stop_propagation() {} });
        assert.equal(h.commands[0][0], "app.palette");
    }
});

test("registration is changed-only, follows new bar sessions, and unregisters safely", () => {
    const h = harness(true);
    h.state.set("status-bar.v1.test.request", { api: 1, session: "one" });
    h.mod.render();
    const key = "status-bar.v1.test.item.item";
    assert.equal(h.state.get(key).session, "one");
    const count = h.writes.length;
    h.mod.render();
    assert.equal(h.writes.length, count);
    h.state.set("status-bar.v1.test.request", { api: 1, session: "two" });
    h.mod.render();
    assert.equal(h.state.get(key).session, "two");
    const replacement = new h.context.Client();
    replacement.publish({ label: "new owner" });
    h.mod.close();
    assert.equal(h.state.get(key).item.label, "new owner");
    replacement.close();
    assert.equal(h.state.get(key), null);
});

test("live data changes publish the current component without a polling timer", () => {
    const h = harness(true);
    h.state.set("status-bar.v1.test.request", { api: 1, session: "live" });
    h.mod.render();
    const current = () => h.state.get("status-bar.v1.test.item.item").item;
    if (name === "status-computer") {
        h.live.spaces[0].machine = "remote-example";
        h.mod.render();
        assert.equal(current().label, "remote-example");
    } else if (name === "status-branch") {
        h.live.panes = [{ terminal: "t1", branch: "focused-branch" }];
        h.mod.render();
        assert.equal(current().label, "focused-branch");
        h.live.panes = [];
        h.live.spaces[0].branch = null;
        h.mod.render();
        assert.equal(current(), null);
    } else if (name === "status-agents") {
        h.live.agents = [{ status: "blocked" }, { status: "working" }];
        h.mod.render();
        assert.equal(current().label, "2 agents");
        assert.equal(current().keepVisible, true);
        assert.equal(current().detail.color, "blocked");
    } else {
        assert.equal(current().label, "⌘⇧P Commands");
    }
});
