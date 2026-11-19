import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import { createInterface } from "node:readline/promises";
import { getAsset, isSea } from "node:sea";

interface Profile {
    sourceDir: string;
    destDir: string;
    data: { herdrModsCommands: Record<string, string[]> };
}

export function profileHome(): string {
    return resolve(
        process.env.HERDR_MODS_HOME ??
            join(
                process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"),
                "herdr-mods",
            ),
    );
}

function save(profile: Profile): void {
    mkdirSync(profileHome(), { recursive: true });
    writeFileSync(
        join(profileHome(), "chezmoi.json"),
        JSON.stringify(profile, null, 2) + "\n",
        { mode: 0o600 },
    );
}

function read(): Profile {
    const path = join(profileHome(), "chezmoi.json");

    if (!existsSync(path)) {
        throw new Error(
            "Run herdr-mods setup --source /path/to/herdr-mods first.",
        );
    }

    const profile = JSON.parse(readFileSync(path, "utf8")) as Profile;

    if (
        !profile.sourceDir ||
        !profile.destDir ||
        !profile.data?.herdrModsCommands
    ) {
        throw new Error(`Invalid profile: ${path}`);
    }

    return profile;
}

export async function main(args: string[]): Promise<number> {
    const [command, ...rest] = args;

    if (command === "--licenses") {
        if (isSea()) {
            console.log(getAsset("licenses", "utf8"));
        } else {
            console.log(
                "Original tooling: MIT; see LICENSE. The compiled executable embeds its runtime licenses under --licenses.",
            );
        }

        return 0;
    }

    if (!command || command === "--help" || command === "help") {
        console.log(`herdr-mods — isolated chezmoi profile for complete Herdr mod packages

setup --source PATH [--destination PATH]  Create the profile (does not apply)
approve [--yes]                          Review and approve custom build commands
revoke                                  Disable all custom build commands
info                                    Show this profile's paths

Forwarded to chezmoi: diff, apply, status, verify, managed, unmanaged,
re-add, add, merge, update, source-path, target-path, cat, cat-config.
Use --help after a forwarded command for chezmoi's options.

HERDR_MODS_HOME selects the isolated profile directory.
HERDR_MODS_CHEZMOI selects a chezmoi executable (default: chezmoi on PATH).
Layouts and personal settings are not managed. Review diff before apply.
`);

        return 0;
    }

    if (command === "setup") {
        const { values } = parseArgs({
            args: rest,
            options: {
                source: { type: "string" },
                destination: { type: "string" },
            },
        });

        if (!values.source) {
            throw new Error("setup requires --source PATH");
        }

        const sourceDir = resolve(values.source);
        const destDir = resolve(
            values.destination ??
                process.env.HERDR_APP_HOME ??
                join(homedir(), ".config/herdr-app"),
        );

        if (
            !existsSync(join(sourceDir, ".chezmoiignore")) ||
            !existsSync(join(sourceDir, "mods"))
        ) {
            throw new Error(
                "Source must be a herdr-mods checkout with .chezmoiignore and mods/.",
            );
        }

        if (existsSync(join(profileHome(), "chezmoi.json"))) {
            throw new Error(
                `Profile already exists at ${profileHome()}; edit its chezmoi.json to change paths.`,
            );
        }

        if (
            destDir === sourceDir ||
            destDir.startsWith(sourceDir + "/") ||
            sourceDir.startsWith(destDir + "/")
        ) {
            throw new Error("Source and destination must be separate trees.");
        }

        mkdirSync(destDir, { recursive: true });
        save({ sourceDir, destDir, data: { herdrModsCommands: {} } });
        console.log(
            `Created ${join(profileHome(), "chezmoi.json")}\nNext: herdr-mods approve, then herdr-mods diff and herdr-mods apply.`,
        );

        return 0;
    }

    const profile = read();

    if (command === "info") {
        console.log(
            JSON.stringify({ profile: profileHome(), ...profile }, null, 2),
        );

        return 0;
    }

    if (command === "revoke") {
        profile.data.herdrModsCommands = {};
        save(profile);
        console.log("Custom build commands disabled.");

        return 0;
    }

    if (command === "approve") {
        const { values } = parseArgs({
            args: rest,
            options: { yes: { type: "boolean" } },
        });

        const { readdirSync } = await import("node:fs");
        const approved: Record<string, string[]> = {};

        for (const entry of readdirSync(join(profile.sourceDir, "mods"), {
            withFileTypes: true,
        })) {
            if (!entry.isDirectory()) {
                continue;
            }

            const manifest = JSON.parse(
                readFileSync(
                    join(profile.sourceDir, "mods", entry.name, "mod.json"),
                    "utf8",
                ),
            );

            const argv: unknown = manifest.install;

            if (argv === undefined) {
                continue;
            }

            if (
                !Array.isArray(argv) ||
                !argv.length ||
                argv.some(
                    (arg) =>
                        typeof arg !== "string" ||
                        !arg.trim() ||
                        arg.includes("\0"),
                )
            ) {
                throw new Error(`${entry.name}: invalid install argv`);
            }

            console.log(
                `${entry.name}: ${JSON.stringify(argv)}\n  cwd: ${join(profile.destDir, "mods", entry.name)}`,
            );
            let accepted = values.yes;

            if (!accepted && process.stdin.isTTY) {
                const reader = createInterface({
                    input: process.stdin,
                    output: process.stdout,
                });

                try {
                    accepted = /^(y|yes)$/i.test(
                        (
                            await reader.question(
                                "Allow this build on each apply? [y/N] ",
                            )
                        ).trim(),
                    );
                } finally {
                    reader.close();
                }
            }

            if (accepted) {
                approved[entry.name] = argv;
            }
        }

        profile.data.herdrModsCommands = approved;
        save(profile);
        console.log(
            "Approvals saved. Changed command arrays require approval again.",
        );

        return 0;
    }

    const forwarded = [
        "diff",
        "apply",
        "status",
        "verify",
        "managed",
        "unmanaged",
        "re-add",
        "add",
        "merge",
        "update",
        "source-path",
        "target-path",
        "cat",
        "cat-config",
    ];

    if (!forwarded.includes(command)) {
        throw new Error(`Unknown command: ${command}. Run herdr-mods --help.`);
    }

    // Keep all forwarded commands bound to this profile, including short flags.
    if (
        rest.some((arg) =>
            /^(--(?:config(?:-format)?|source|destination|cache|persistent-state|working-tree)(?:=|$)|-[cSDW])/.test(
                arg,
            ),
        )
    ) {
        throw new Error(
            "Profile overrides are not accepted; edit the isolated profile or use HERDR_MODS_HOME.",
        );
    }

    const result = spawnSync(
        process.env.HERDR_MODS_CHEZMOI ?? "chezmoi",
        [
            "--config",
            join(profileHome(), "chezmoi.json"),
            "--source",
            profile.sourceDir,
            "--destination",
            profile.destDir,
            "--cache",
            join(profileHome(), "cache"),
            "--persistent-state",
            join(profileHome(), "state.boltdb"),
            command,
            ...rest,
        ],
        { stdio: "inherit" },
    );

    if (result.error) {
        throw new Error(
            `Cannot run chezmoi: ${result.error.message}. Install chezmoi or set HERDR_MODS_CHEZMOI.`,
        );
    }

    return result.status ?? 1;
}
