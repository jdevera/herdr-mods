// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Jacobo de Vera
import { appHome, readTextFile } from "herdr";
import { readdir } from "fs/promises";

export const DEFAULTS = {
    left: ["computer", "branch", "pr", "agents"],
    right: ["commands"],
    gap: 10,
    padding: 10,
    components: {},
};
const object = (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value);

export function merge(base, extra) {
    const result = { ...base };
    for (const [key, value] of Object.entries(extra)) {
        if (
            [
                "__proto__",
                "prototype",
                "constructor",
                "$schema",
                "$comment",
            ].includes(key)
        )
            continue;
        result[key] = object(value)
            ? merge(object(base[key]) ? base[key] : {}, value)
            : value;
    }
    return result;
}

export function validateSettings(settings) {
    if (!Array.isArray(settings.left) || !Array.isArray(settings.right))
        throw new Error("left and right must be arrays");
    const ids = [...settings.left, ...settings.right];
    if (
        ids.some(
            (id) => typeof id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(id),
        ) ||
        new Set(ids).size !== ids.length
    )
        throw new Error("left and right must list unique component IDs");
    for (const key of ["gap", "padding"]) {
        if (
            !Number.isFinite(settings[key]) ||
            settings[key] < 0 ||
            settings[key] > 40
        )
            throw new Error(`${key} must be between 0 and 40`);
    }
    if (!object(settings.components))
        throw new Error("components must be an object");
    for (const [id, options] of Object.entries(settings.components)) {
        if (!object(options))
            throw new Error(`${id}: component settings must be an object`);
        for (const [key, value] of Object.entries(options)) {
            if (
                ["minWidth", "maxWidth", "priority"].includes(key) &&
                (!Number.isFinite(value) || value < 0)
            )
                throw new Error(`${id}.${key} must be a nonnegative number`);
            if (
                ["hidden", "keepVisible"].includes(key) &&
                typeof value !== "boolean"
            )
                throw new Error(`${id}.${key} must be boolean`);
            if (
                ![
                    "minWidth",
                    "maxWidth",
                    "priority",
                    "hidden",
                    "keepVisible",
                ].includes(key)
            )
                throw new Error(`${id}.${key} is not a component setting`);
        }
    }
    for (const key of Object.keys(settings)) {
        if (!Object.hasOwn(DEFAULTS, key))
            throw new Error(`${key} is not a status bar setting`);
    }
    return settings;
}

export async function loadSettings() {
    const folder = `${appHome()}/mods/status-bar`;
    const names = await readdir(folder);
    const files = [
        ...names.filter((name) => name === "settings.json"),
        ...names.filter((name) => /^settings\..+\.json$/.test(name)).sort(),
    ];
    let settings = DEFAULTS;
    for (const name of files) {
        const text = await readTextFile(`${folder}/${name}`);
        const value = JSON.parse(text);
        if (!object(value))
            throw new Error(`${name}: expected a settings object`);
        settings = merge(settings, value);
    }
    return validateSettings(settings);
}
