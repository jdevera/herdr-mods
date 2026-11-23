// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Jacobo de Vera
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");
function settings(files = {}) {
    const context = {
        appHome: () => "/app",
        readdir: async () => Object.keys(files),
        readTextFile: async (path) => files[path.split("/").at(-1)],
    };
    const source = readFileSync(join(__dirname, "../settings.js"), "utf8")
        .replace(/^import\s+[\s\S]*?;$/gm, "")
        .replace(/^export /gm, "");
    vm.runInNewContext(
        source + "\nglobalThis.api={loadSettings, merge, validateSettings};",
        context,
    );
    return context.api;
}

test("settings files follow code-point order and merge objects while replacing arrays", async () => {
    const api = settings({
        "settings.z.json": '{"components":{"branch":{"maxWidth":120}}}',
        "settings.json":
            '{"left":["branch"],"components":{"branch":{"priority":7}}}',
        "settings.a.json": '{"components":{"branch":{"maxWidth":200}}}',
    });
    const value = JSON.parse(JSON.stringify(await api.loadSettings()));
    assert.deepEqual(value.left, ["branch"]);
    assert.deepEqual(value.components.branch, { priority: 7, maxWidth: 120 });
});

test("bad IDs, duplicate placement, malformed files and unsupported settings are rejected", async () => {
    for (const input of [
        '{"left":["branch","branch"]}',
        '{"left":["commands"]}',
        '{"gap":-1}',
        '{"components":{"branch":{"maxWidth":"wide"}}}',
        '{"unknown":true}',
        "null",
        "{",
    ]) {
        await assert.rejects(
            settings({ "settings.json": input }).loadSettings(),
        );
    }
});

test("settings cannot change object prototypes", () => {
    const api = settings();
    const result = api.merge({}, JSON.parse('{"__proto__":{"polluted":true}}'));
    assert.equal(result.polluted, undefined);
    assert.equal({}.polluted, undefined);
});
