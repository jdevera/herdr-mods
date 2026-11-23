// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Jacobo de Vera

const finite = (value, fallback) =>
    Number.isFinite(value) ? Math.max(0, value) : fallback;

export function occupied(items, gap) {
    return (
        items.reduce((sum, item) => sum + item.width, 0) +
        Math.max(0, items.length - 1) * gap
    );
}

// Keep order, shorten flexible labels, compact, then overflow.
export function allocate(items, available, gap = 10, overflowWidth = 24) {
    const budget = finite(available, 0);
    const visible = items.map((item) => {
        const full = finite(item.fullWidth, 80);
        const width = Math.min(full, finite(item.maxWidth, Infinity));
        return {
            ...item,
            width,
            variant: "full",
            minimum: Math.min(width, finite(item.minWidth, width)),
            compactWidth: Math.min(width, finite(item.compactWidth, width)),
        };
    });
    const overflow = [];
    const priority = [...visible].sort(
        (a, b) => (a.priority ?? 50) - (b.priority ?? 50),
    );
    let used = occupied(visible, gap);
    for (const item of priority) {
        const reduction = Math.min(
            Math.max(0, used - budget),
            item.width - item.minimum,
        );
        item.width -= reduction;
        used -= reduction;
    }
    for (const item of priority) {
        if (used <= budget) break;
        if (item.compactWidth >= item.width) continue;
        used -= item.width - item.compactWidth;
        item.width = item.compactWidth;
        item.variant = "compact";
    }
    for (const item of priority) {
        const reserve = overflow.length
            ? overflowWidth + (visible.length ? gap : 0)
            : 0;
        if (used + reserve <= budget) break;
        if (item.keepVisible) continue;
        visible.splice(visible.indexOf(item), 1);
        overflow.push(item);
        used = occupied(visible, gap);
    }
    const overflowCost = overflow.length
        ? overflowWidth + (visible.length ? gap : 0)
        : 0;
    return {
        visible,
        overflow: items.filter((item) =>
            overflow.some((hidden) => hidden.id === item.id),
        ),
        scroll: used + overflowCost > budget,
    };
}
