import { readdirSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readPackage } from "./mod-package.ts";
import type { Mod } from "./mod-package.ts";

export { readJson } from "./mod-package.ts";

export const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function discover(root = PROJECT): Mod[] {
    const mods = readdirSync(join(root, "mods"), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
        .map((entry) => readPackage(join(root, "mods", entry.name)));

    if (!mods.length) {
        throw new Error("No mods found");
    }

    return mods;
}

export function isMain(url: string): boolean {
    return (
        !!process.argv[1] &&
        realpathSync(fileURLToPath(url)) === realpathSync(process.argv[1])
    );
}
