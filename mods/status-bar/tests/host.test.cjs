// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Jacobo de Vera
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

function harness(options = {}) {
    const state = new Map(),
        commands = [],
        overlays = [],
        closed = [];
    const tree = { id: "status-modes", type: "stack", active: "custom-status" };
    let notifications = 0;
    function element(id) {
        const data = { nodes: [], elementId: id, clickHandlers: [] };
        const proxy = new Proxy(data, {
            get(target, key) {
                if (key in target) return target[key];
                return (...args) => {
                    if (key === "child") target.nodes.push(args[0]);
                    if (key === "children") target.nodes.push(...args[0]);
                    if (key === "id") target.elementId = args[0];
                    if (key === "on_click") target.clickHandlers.push(args[0]);
                    if (key === "on_size_change") target.sizeChanged = args[0];
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
        v_flex: element,
        svg: element,
        Button: { new: element },
        checking: () => false,
        props: () => options,
        theme: () => ({}),
        shared: (key) => state.get(key),
        setShared: (key, value) => state.set(key, value),
        layout: () => tree,
        nextCommand: () => new Promise(() => {}),
        closeOverlay: (id) => closed.push(id),
        openOverlay: (spec) => overlays.push(spec),
        run: (name, args) => {
            commands.push({ name, args });
            if (name === "layout.select") tree.active = args.child;
        },
        appHome: () => "/app",
        readdir: async () => [],
        readTextFile: async () => null,
    };
    const clean = (file) =>
        readFileSync(join(__dirname, "..", file), "utf8")
            .replace(/^import\s+[\s\S]*?;$/gm, "")
            .replace(/^export /gm, "");
    for (const file of ["client.js", "allocation.js", "settings.js"])
        vm.runInNewContext(clean(file), context);
    vm.runInNewContext(
        clean("main.js").replace(
            "default class StatusBar",
            "globalThis.Host=class StatusBar",
        ),
        context,
    );
    const cx = {
        notify: () => notifications++,
        spawn(fn) {
            fn(cx);
        },
    };
    const mod = new context.Host();
    mod.init({}, cx);
    const publish = (id, item, session = mod.session) =>
        state.set(`status-bar.v1.workspace.item.${id}`, {
            api: 1,
            session,
            owner: "source",
            item,
        });
    return {
        mod,
        cx,
        state,
        publish,
        commands,
        overlays,
        closed,
        context,
        notifications: () => notifications,
    };
}
function find(tree, id) {
    if (tree?.elementId === id) return tree;
    for (const child of tree?.nodes ?? []) {
        const found = find(child, id);
        if (found) return found;
    }
}

test("host accepts only current registrations and drops an absent PR without a slot", () => {
    const h = harness();
    h.mod.width = 1200;
    publishAll();
    function publishAll() {
        h.publish("computer", { label: "Computer" });
        h.publish("pr", { label: "old PR" }, "old-session");
    }
    let tree = h.mod.render();
    assert.ok(find(tree, "item-computer"));
    assert.equal(find(tree, "item-pr"), undefined);
    h.publish("pr", { label: "PR #42" });
    h.mod.width = 1200;
    tree = h.mod.render();
    assert.ok(find(tree, "item-pr"));
    h.publish("pr", null);
    tree = h.mod.render();
    assert.equal(find(tree, "item-pr"), undefined);
});

test("intrinsic measurements update only when their size changes", () => {
    const h = harness();
    h.publish("branch", { label: "long branch", minWidth: 64 });
    const tree = h.mod.render();
    const measure = find(tree, "measure-branch-full");
    const initial = h.notifications();
    measure.sizeChanged({ width: 210, height: 24 }, h.cx);
    measure.sizeChanged({ width: 210, height: 24 }, h.cx);
    assert.equal(h.notifications(), initial + 1);
    assert.equal(h.mod.widths.get("branch:full").width, 210);
});

test("stock switch selects just its stack child and works in both directions", () => {
    const h = harness({ role: "switch" });
    find(h.mod.render(), "status-switch").clickHandlers[0]();
    assert.equal(h.commands[0].args.child, "native-status");
    find(h.mod.render(), "status-switch").clickHandlers[0]();
    assert.equal(h.commands[1].args.child, "custom-status");
    assert.ok(h.commands.every(({ name }) => name === "layout.select"));
});

test("overflow action closes its popup and executes exactly once", () => {
    const h = harness({
        role: "overflow",
        overlay: "popup",
        items: [{ label: "Commands", action: { command: "app.palette" } }],
    });
    const button = find(h.mod.render(), "overflow-0");
    assert.equal(button.clickHandlers.length, 1);
    button.clickHandlers[0]({}, { stop_propagation() {} });
    assert.deepEqual(h.closed, ["popup"]);
    assert.equal(h.commands.length, 1);
    assert.equal(h.commands[0].name, "app.palette");
});

test("overflow button opens a popup carrying current item data", () => {
    const h = harness();
    h.publish("computer", { label: "Computer", compactLabel: "PC" });
    h.mod.width = 25;
    const button = find(h.mod.render(), "status-overflow");
    button.clickHandlers[0]();
    assert.equal(h.overlays.length, 1);
    assert.equal(h.overlays[0].props.role, "overflow");
    assert.equal(h.overlays[0].props.items[0].label, "Computer");
});
