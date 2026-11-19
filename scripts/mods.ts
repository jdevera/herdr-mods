import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export type Json =
    null | boolean | number | string | Json[] | { [key: string]: Json };

export type Config = { [key: string]: Json };

export interface Manifest {
    title: string;
    description: string;
    license: string;
    $schema?: string;
    $comment?: string;
    cloned_from?: { name: string; version: string };
    install?: string[];
}

export interface Mod {
    id: string;
    package: string;
    source: string;
    manifest: Manifest;
}

export function readJson(path: string): unknown {
    return JSON.parse(readFileSync(path, "utf8"));
}

export function isObject(value: unknown): value is Config {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function discover(root = PROJECT): Mod[] {
    const mods = readdirSync(join(root, "mods"), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
        .map((entry) => {
            const pkg = join(root, "mods", entry.name);
            const sources = [pkg, join(pkg, "runtime")].filter((p) =>
                existsSync(join(p, "mod.json")),
            );

            if (sources.length !== 1) {
                throw new Error(
                    `${pkg}: expected exactly one mod.json at root or runtime/`,
                );
            }

            const raw = readJson(join(sources[0], "mod.json"));

            if (!isObject(raw)) {
                throw new Error(`${pkg}: manifest must be an object`);
            }

            for (const field of ["title", "description", "license"]) {
                if (typeof raw[field] !== "string" || !raw[field].trim()) {
                    throw new Error(`${pkg}: missing ${field}`);
                }
            }

            if ("settings" in raw) {
                throw new Error(
                    `${pkg}: configuration belongs in settings.json, not mod.json`,
                );
            }

            if (
                "install" in raw &&
                (!Array.isArray(raw.install) ||
                    !raw.install.length ||
                    raw.install.some(
                        (arg) =>
                            typeof arg !== "string" ||
                            !arg.trim() ||
                            arg.includes("\0"),
                    ))
            ) {
                throw new Error(
                    `${pkg}: install must be a nonempty array of nonempty strings`,
                );
            }

            return {
                id: entry.name,
                package: pkg,
                source: sources[0],
                manifest: raw as unknown as Manifest,
            };
        });

    if (!mods.length) {
        throw new Error("No mods found");
    }

    return mods;
}

export function legalFiles(pkg: string): string[] {
    return [
        ...new Set([
            "LICENSE",
            "PROVENANCE.md",
            ...readdirSync(pkg).filter((name) =>
                /^(LICENSE|NOTICE)/.test(name),
            ),
        ]),
    ].sort();
}

export function isSettings(name: string): boolean {
    return name === "settings.json" || /^settings\..+\.json$/.test(name);
}

export function mergeConfig(base: Config, overrides: Config): Config {
    const result = { ...base };

    for (const [key, value] of Object.entries(overrides)) {
        if (
            key === "__proto__" ||
            key === "constructor" ||
            key === "prototype"
        ) {
            throw new Error(`Invalid configuration key: ${key}`);
        }

        result[key] =
            isObject(value) && isObject(result[key])
                ? mergeConfig(result[key], value)
                : value;
    }

    return result;
}

export function isMain(url: string): boolean {
    return (
        !!process.argv[1] &&
        realpathSync(fileURLToPath(url)) === realpathSync(process.argv[1])
    );
}
