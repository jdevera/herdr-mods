// SPDX-License-Identifier: Apache-2.0
// Modified by Jacobo de Vera, 2026: local Herdr mods integration; see PROVENANCE.md.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// Exercise the runtime settings loader with local file API stand-ins.
const context = {
    readTextFile: async () => null,
    appHome: () => "/app",
    readdir: async () => [],
};
vm.createContext(context);
vm.runInContext(
    fs
        .readFileSync(path.join(__dirname, "../runtime/settings.js"), "utf8")
        .replace(/^import\s+[\s\S]*?;\n/gm, "")
        .replaceAll("export function", "function")
        .replaceAll("export async function", "async function"),
    context,
);
const { duration, size, mergeSettings } = context;
const same = (a, b) => assert.equal(JSON.stringify(a), JSON.stringify(b)); // values cross the vm boundary

test("durations and sizes accept units or plain numbers and fall back otherwise", () => {
    assert.equal(duration("450ms", 1), 450);
    assert.equal(duration("60s", 1), 60000);
    assert.equal(duration("1.5m", 1), 90000);
    assert.equal(duration(7, 1), 7);
    assert.equal(duration("soon", 9), 9);
    assert.equal(duration(-1, 9), 9);
    assert.equal(duration(0, 9), 9);
    assert.equal(duration("0s", 9), 9);
    assert.equal(size("60KB", 1), 61440);
    assert.equal(size("2mb", 1), 2097152);
    assert.equal(size(10, 1), 10);
    assert.equal(size("big", 3), 3);
});

test("merge keeps defaults for unknown keys and wrong types, and reports them", () => {
    const defaults = {
        refresh: { every: "60s" },
        list: { page_size: 25 },
        flag: true,
    };
    const problems = [];
    const merged = mergeSettings(
        defaults,
        { refresh: { every: 5, later: 1 }, list: "no", flag: "yes", extra: {} },
        problems,
    );
    same(merged, {
        refresh: { every: 5 },
        list: { page_size: 25 },
        flag: true,
    });
    same(problems, [
        "refresh.later is not a setting",
        "list must be an object",
        "flag should be a boolean",
        "extra is not a setting",
    ]);
    same(mergeSettings(defaults, undefined, []), defaults);
});

function files(values) {
    context.readdir = async () =>
        Object.keys(values).map((name) => ({
            name,
            isDirectory: () => name.endsWith(".dir.json"),
        }));
    context.readTextFile = async (file) => {
        const value = values[file.split("/").pop()];
        if (value instanceof Error) throw value;
        return value;
    };
}

test("base settings precede alphabetically sorted layers and nested siblings survive", async () => {
    files({
        "settings.z.json": '{"refresh":{"every":"3m"}}',
        "settings.a.json": '{"refresh":{"every":2000},"flag":true}',
        "settings.json": '{"refresh":{"every":"90s","delay":"2s"}}',
        "mod.json": '{"settings":{"flag":false}}',
        "settings.dir.json": "invalid",
        "config.schema.json": "invalid",
    });
    const defaults = { refresh: { every: "60s", delay: "1s" }, flag: false };
    const got = await context.loadSettings("x", defaults);
    same(got.settings, { refresh: { every: "3m", delay: "2s" }, flag: true });
    same(got.problems, []);
    same(defaults, { refresh: { every: "60s", delay: "1s" }, flag: false });
});

test("missing base is optional and broken layers do not suppress valid layers", async () => {
    files({
        "settings.a.json": "{",
        "settings.b.json": new Error("denied"),
        "settings.c.json":
            '{"$schema":"./config.schema.json","refresh":{"every":true},"extra":1}',
        "settings.d.json": '{"refresh":{"every":"2m"}}',
    });
    const got = await context.loadSettings("x", { refresh: { every: "60s" } });
    same(got.settings, { refresh: { every: "2m" } });
    assert.equal(got.problems.length, 4);
    assert.match(got.problems[0], /^settings.a.json:/);
    assert.match(got.problems[1], /settings.b.json:.*denied/);
    files({});
    same((await context.loadSettings("x", { a: 1 })).settings, { a: 1 });
});

test("null, arrays, and prototype keys cannot override configuration", async () => {
    files({
        "settings.json": "null",
        "settings.a.json": "[]",
        "settings.b.json": '{"__proto__":{"polluted":true},"constructor":1}',
    });
    const got = await context.loadSettings("x", { a: 1 });
    same(got.settings, { a: 1 });
    assert.equal(got.problems.length, 4);
    assert.equal({}.polluted, undefined);
});

test("directory errors are visible and keep defaults", async () => {
    context.readdir = async () => {
        throw new Error("denied");
    };
    const got = await context.loadSettings("x", { a: 1 });
    same(got.settings, { a: 1 });
    assert.match(got.problems[0], /directory.*denied/);
});
