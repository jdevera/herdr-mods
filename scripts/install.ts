import {
    cpSync,
    existsSync,
    lstatSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import {
    PROJECT,
    discover,
    isMain,
    isObject,
    isSettings,
    legalFiles,
    mergeConfig,
    readJson,
} from "./mods.ts";
import type { Config, Mod } from "./mods.ts";

interface Options {
    root?: string;
    yes?: boolean;
    selected?: string[];
    approve?: (command: string[], mod: Mod) => Promise<boolean>;
}

function noSymlinks(path: string): void {
    let info;

    try {
        info = lstatSync(path);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return;
        }

        throw error;
    }

    if (info.isSymbolicLink()) {
        throw new Error(`Refusing to overwrite a symlink: ${path}`);
    }

    if (info.isDirectory()) {
        for (const name of readdirSync(path)) {
            noSymlinks(join(path, name));
        }
    }
}

async function confirm(): Promise<boolean> {
    if (!process.stdin.isTTY) {
        return false;
    }

    const reader = createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    try {
        return /^(y|yes)$/i.test(
            (await reader.question("Run this command? [y/N] ")).trim(),
        );
    } finally {
        reader.close();
    }
}

export async function install(
    appHome: string,
    options: Options = {},
): Promise<void> {
    const [major, minor] = process.versions.node.split(".").map(Number);

    if (major < 24 || (major === 24 && minor < 12)) {
        throw new Error("Node.js 24.12+ is required");
    }

    const root = resolve(options.root ?? PROJECT);
    const app = resolve(appHome);
    const all = discover(root);
    const selected = options.selected ?? [];

    for (const id of selected) {
        if (!all.some((mod) => mod.id === id)) {
            throw new Error(`Unknown mod: ${id}`);
        }
    }

    // Validate all sources and migrations before the first write.
    const prepared = all
        .filter((mod) => !selected.length || selected.includes(mod.id))
        .map((mod) => {
            const destination = join(app, "mods", mod.id);

            noSymlinks(destination);
            const required = [
                join(mod.source, "main.js"),
                ...legalFiles(mod.package).map((name) =>
                    join(mod.package, name),
                ),
            ];

            if (mod.manifest.license === "Apache-2.0") {
                required.push(join(mod.package, "NOTICE"));
            }

            for (const path of required) {
                if (!existsSync(path) || !lstatSync(path).isFile()) {
                    throw new Error(`Missing required file: ${path}`);
                }
            }

            let migrated: Config | undefined;

            if (existsSync(destination)) {
                const previous = readJson(join(destination, "mod.json"));

                if (!isObject(previous)) {
                    throw new Error(
                        `${destination}: invalid installed manifest`,
                    );
                }

                const clone = mod.manifest.cloned_from?.name;
                const matches = clone
                    ? isObject(previous.cloned_from) &&
                      previous.cloned_from.name === clone
                    : previous.title === mod.manifest.title;

                if (!matches) {
                    throw new Error(`${destination} contains an unrelated mod`);
                }

                if ("settings" in previous) {
                    if (!isObject(previous.settings)) {
                        throw new Error(
                            `${destination}: legacy settings must be an object`,
                        );
                    }

                    migrated = previous.settings;
                    const configPath = join(destination, "settings.json");

                    if (existsSync(configPath)) {
                        const current = readJson(configPath);

                        if (!isObject(current)) {
                            throw new Error(
                                `${configPath}: configuration must be an object`,
                            );
                        }

                        migrated = mergeConfig(migrated, current);
                    }
                }
            }

            return { mod, destination, migrated };
        });

    const backups = join(app, "backups");

    mkdirSync(backups, { recursive: true });
    const backup = mkdtempSync(join(backups, "mods-"));

    for (const { mod, destination, migrated } of prepared) {
        if (existsSync(destination)) {
            cpSync(destination, join(backup, mod.id), { recursive: true });
        }

        cpSync(mod.source, destination, {
            recursive: true,
            filter: (source) => {
                const name = basename(source);

                if (
                    name === "bin" ||
                    name === "node_modules" ||
                    name === ".build" ||
                    name === "dist" ||
                    name === "coverage" ||
                    name === ".cache" ||
                    name === ".DS_Store" ||
                    name === "__pycache__" ||
                    name === "jsconfig.json" ||
                    isSettings(name) ||
                    name.endsWith(".swp") ||
                    name.endsWith(".swo") ||
                    name.endsWith("~") ||
                    name.endsWith(".d.ts") ||
                    name.endsWith(".error")
                ) {
                    return false;
                }

                return true;
            },
        });

        for (const name of legalFiles(mod.package)) {
            cpSync(join(mod.package, name), join(destination, name));
        }

        if (migrated) {
            writeFileSync(
                join(destination, "settings.json"),
                JSON.stringify(migrated, null, 2) + "\n",
            );
        }

        console.log(`Installed ${mod.id}: ${destination}`);
        const recipe = join(mod.package, "RECIPE.md");

        if (existsSync(recipe)) {
            console.log(`Setup instructions: ${recipe}`);
        }
    }

    console.log(
        `Backup: ${backup}\nFiles installed. Layouts were not changed; follow each mod's setup instructions to show it in Herdr.`,
    );
    const failed = [];

    for (const { mod, destination } of prepared) {
        const command = mod.manifest.install;

        if (!command) {
            continue;
        }

        console.log(
            `\n${mod.id} post-install command: ${JSON.stringify(command)}\nWorking directory: ${mod.package}\nHERDR_MOD_DIR: ${destination}`,
        );

        if (!(
            options.yes || (await (options.approve ?? confirm)(command, mod))
        )) {
            console.log(
                `Skipped ${mod.id} post-install step; its files remain installed. Features requiring this step may be unavailable.`,
            );
            continue;
        }

        const result = spawnSync(command[0], command.slice(1), {
            cwd: mod.package,
            env: {
                ...process.env,
                HERDR_APP_HOME: app,
                HERDR_MOD_DIR: destination,
            },
            stdio: "inherit",
            shell: false,
        });

        if (result.error || result.status !== 0) {
            console.error(
                `${mod.id}: files installed, but post-install failed: ${result.error?.message ?? result.signal ?? `exit ${result.status}`}`,
            );
            failed.push(mod.id);
        }
    }

    if (failed.length) {
        throw new Error(
            `Post-install failed for ${failed.join(", ")}. Rerun the installer to retry.`,
        );
    }
}

if (isMain(import.meta.url)) {
    try {
        const { values, positionals } = parseArgs({
            options: {
                yes: { type: "boolean" },
                mod: { type: "string", multiple: true },
                help: { type: "boolean" },
            },
            allowPositionals: true,
        });

        if (values.help) {
            console.log(
                "node scripts/install.ts [app-home] [--mod NAME ...] [--yes]\nRequires Node 24.12+. No npm install needed. --yes approves every declared post-install command.",
            );
        } else {
            if (positionals.length > 1) {
                throw new Error("Expected at most one app-home path");
            }

            await install(
                positionals[0] ??
                    process.env.HERDR_APP_HOME ??
                    join(homedir(), ".config/herdr-app"),
                { yes: values.yes, selected: values.mod },
            );
        }
    } catch (error) {
        console.error(`Install failed: ${(error as Error).message}`);
        process.exitCode = 1;
    }
}
