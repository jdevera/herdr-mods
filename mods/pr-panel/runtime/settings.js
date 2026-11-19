// SPDX-License-Identifier: Apache-2.0
// Modified by Jacobo de Vera, 2026: separate, layered configuration; see ../PROVENANCE.md.
import { readTextFile, appHome } from "herdr";
import { readdir } from "fs/promises";

const UNITS = { ms: 1, s: 1000, m: 60000, h: 3600000 };
// "450ms", "60s", "5m", or a plain number of milliseconds. Zero falls back,
// since these values pace timers.
export function duration(value, fallback) {
    if (typeof value === "number") return value > 0 ? value : fallback;
    const match = /^\s*(\d+(?:\.\d+)?)\s*(ms|s|m|h)\s*$/.exec(
        String(value ?? ""),
    );
    return (
        (match && Math.round(Number(match[1]) * UNITS[match[2]])) || fallback
    );
}

const SIZES = { B: 1, KB: 1024, MB: 1024 * 1024 };
// "60KB", "2MB", or a plain number of bytes.
export function size(value, fallback) {
    if (typeof value === "number" && value >= 0) return value;
    const match = /^\s*(\d+(?:\.\d+)?)\s*(B|KB|MB)\s*$/i.exec(
        String(value ?? ""),
    );
    return match
        ? Math.round(Number(match[1]) * SIZES[match[2].toUpperCase()])
        : fallback;
}

const isObject = (v) =>
    v !== null && typeof v === "object" && !Array.isArray(v);

// Deep-merge `given` over `defaults`. The defaults define the keys and their
// types; a duration or size default is a string, and a number is accepted for
// it. Anything else that does not fit is skipped and named in `problems`.
export function mergeSettings(
    defaults,
    given,
    problems = [],
    path = "",
    previous = defaults,
) {
    const result = { ...previous };
    if (!isObject(given)) {
        if (given !== undefined)
            problems.push(`${path || "settings"} must be an object`);
        return result;
    }
    for (const [key, value] of Object.entries(given)) {
        const name = path ? `${path}.${key}` : key;
        if (!Object.prototype.hasOwnProperty.call(defaults, key)) {
            problems.push(`${name} is not a setting`);
            continue;
        }
        const current = defaults[key];
        if (isObject(current))
            result[key] = mergeSettings(
                current,
                value,
                problems,
                name,
                result[key],
            );
        else if (
            typeof value === typeof current ||
            (typeof current === "string" && typeof value === "number")
        )
            result[key] = value;
        else problems.push(`${name} should be a ${typeof current}`);
    }
    return result;
}

// Missing files are optional; malformed files are reported and skipped. Always
// validate against code defaults, so one layer cannot change the accepted type.
export async function loadSettings(name, defaults) {
    const problems = [];
    const folder = `${appHome()}/mods/${name}`;
    let entries;
    try {
        entries = await readdir(folder, { withFileTypes: true });
    } catch (e) {
        return {
            settings: { ...defaults },
            problems: [`Settings directory could not be read: ${e.message}`],
        };
    }
    const names = entries
        .filter((entry) => !entry.isDirectory())
        .map((entry) => entry.name);
    const files = [
        ...names.filter((name) => name === "settings.json"),
        ...names.filter((name) => /^settings\..+\.json$/.test(name)).sort(),
    ];
    let settings = { ...defaults };
    for (const file of files) {
        const fileProblems = [];
        try {
            const raw = await readTextFile(`${folder}/${file}`);
            if (raw == null) throw new Error("file disappeared while reading");
            const given = JSON.parse(raw);
            if (isObject(given)) {
                delete given.$schema;
                delete given.$comment;
            }
            settings = mergeSettings(
                defaults,
                given,
                fileProblems,
                "",
                settings,
            );
        } catch (e) {
            fileProblems.push(`could not be read: ${e.message}`);
        }
        problems.push(...fileProblems.map((problem) => `${file}: ${problem}`));
    }
    return { settings, problems };
}
