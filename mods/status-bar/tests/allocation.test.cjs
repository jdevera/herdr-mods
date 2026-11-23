// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Jacobo de Vera
const { test } = require("node:test");
const assert = require("node:assert/strict");
const allocator = import("../allocation.js");
const item = (id, extra = {}) => ({
    id,
    label: id,
    fullWidth: 100,
    compactWidth: 40,
    priority: 50,
    ...extra,
});

test("natural widths stay grouped; long branches shrink before compacting other items", async () => {
    const { allocate } = await allocator;
    const result = allocate(
        [
            item("branch", { fullWidth: 400, maxWidth: 240, minWidth: 64 }),
            item("pr", { priority: 90 }),
        ],
        250,
        10,
    );
    assert.deepEqual(
        result.visible.map(({ id, width, variant }) => [id, width, variant]),
        [
            ["branch", 140, "full"],
            ["pr", 100, "full"],
        ],
    );
    assert.equal(result.overflow.length, 0);
    assert.equal(result.scroll, false);
});

test("priority controls compaction and overflow without changing display order", async () => {
    const { allocate } = await allocator;
    const result = allocate(
        [
            item("computer", { priority: 10 }),
            item("pr", { priority: 90 }),
            item("agents", { priority: 70 }),
        ],
        110,
        10,
    );
    assert.deepEqual(
        result.visible.map(({ id }) => id),
        ["pr"],
    );
    assert.deepEqual(
        result.overflow.map(({ id }) => id),
        ["computer", "agents"],
    );
    assert.equal(result.visible[0].variant, "compact");
});

test("blocked attention stays available, scrolling if even the minimum cannot fit", async () => {
    const { allocate } = await allocator;
    const result = allocate(
        [item("commands"), item("agents", { keepVisible: true })],
        20,
    );
    assert.deepEqual(
        result.visible.map(({ id }) => id),
        ["agents"],
    );
    assert.equal(result.scroll, true);
});

test("no registered items reserve no width or overflow control", async () => {
    const { allocate } = await allocator;
    assert.deepEqual(allocate([], 400), {
        visible: [],
        overflow: [],
        scroll: false,
    });
});

test("width sweep accounts for overflow control and every gap", async () => {
    const { allocate, occupied } = await allocator;
    for (let width = 0; width <= 1500; width++) {
        const result = allocate(
            [
                item("computer", { priority: 20 }),
                item("branch", { fullWidth: 450, minWidth: 64, maxWidth: 240 }),
                item("pr", { priority: 90 }),
                item("agents", { keepVisible: true }),
                item("commands", { priority: 10 }),
            ],
            width,
            10,
        );
        const used =
            occupied(result.visible, 10) +
            (result.overflow.length
                ? 24 + (result.visible.length ? 10 : 0)
                : 0);
        assert.equal(result.scroll, used > width, `width ${width}`);
        assert.ok(
            result.visible.every(
                ({ width }) => Number.isFinite(width) && width >= 0,
            ),
        );
        assert.equal(
            new Set([...result.visible, ...result.overflow].map(({ id }) => id))
                .size,
            5,
        );
    }
});
