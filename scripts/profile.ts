import { readPackage } from "./mod-package.ts";
import { requireTools } from "./prerequisites.ts";
import {
    existsSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    writeFileSync,
    realpathSync,
} from "node:fs";
import { homedir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import { createInterface } from "node:readline/promises";
import { getAsset, isSea } from "node:sea";

type Commands = Record<string, string[]>;
interface Profile {
    sourceDir: string;
    destDir: string;
    data: {
        herdrModsCommands: Commands;
        herdrModsDeclined?: Commands;
        herdrModsBinDir?: string;
    };
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
            "Run sh setup.sh first, or herdr-mods setup --source /path/to/checkout.",
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

function packages(profile: Profile) {
    return readdirSync(join(profile.sourceDir, "mods"), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((entry) =>
            readPackage(join(profile.sourceDir, "mods", entry.name)),
        );
}

function chezmoi(profile: Profile, args: string[]): number {
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
            ...args,
        ],
        { stdio: "inherit" },
    );

    if (result.error) {
        throw new Error(`Cannot run chezmoi: ${result.error.message}`);
    }

    return result.status ?? 1;
}

async function review(
    profile: Profile,
    yes: boolean,
    force = false,
): Promise<void> {
    const same = (a: unknown, b: unknown) =>
        JSON.stringify(a) === JSON.stringify(b);

    const pending = packages(profile).filter(
        (mod) =>
            mod.metadata.install &&
            (force ||
                (!same(
                    profile.data.herdrModsCommands[mod.id],
                    mod.metadata.install,
                ) &&
                    !same(
                        profile.data.herdrModsDeclined?.[mod.id],
                        mod.metadata.install,
                    ))),
    );

    if (!pending.length) {
        return;
    }

    console.log("These commands run after chezmoi installs the mod files:\n");

    for (const mod of pending) {
        console.log(
            `${mod.manifest.title}: ${mod.metadata.build?.description ?? "Package setup"}\n  Command: ${JSON.stringify(mod.metadata.install)}\n  Directory: ${join(profile.destDir, "mods", mod.id)}\n`,
        );
    }

    if (!yes && !process.stdin.isTTY) {
        throw new Error(
            "New build commands need a decision. Rerun interactively or with --yes. No mods have been applied.",
        );
    }

    const reader = !yes
        ? createInterface({ input: process.stdin, output: process.stdout })
        : undefined;

    try {
        let mode = yes
            ? "all"
            : (
                  await reader!.question(
                      "Run [a]ll / [c]hoose individually / [n]one / [q]uit? [q] ",
                  )
              )
                  .trim()
                  .toLowerCase();

        if (!["all", "a", "choose", "c", "none", "n"].includes(mode)) {
            throw new Error("Cancelled; no mods have been applied.");
        }

        if (mode === "a") {
            mode = "all";
        }

        if (mode === "c") {
            mode = "choose";
        }

        const approved = { ...profile.data.herdrModsCommands };
        const declined = { ...profile.data.herdrModsDeclined };

        for (const mod of pending) {
            const accept =
                mode === "all" ||
                (mode === "choose" &&
                    /^(y|yes)$/i.test(
                        (
                            await reader!.question(
                                `Run ${mod.manifest.title}'s command? [y/N] `,
                            )
                        ).trim(),
                    ));

            if (accept) {
                approved[mod.id] = mod.metadata.install!;
                delete declined[mod.id];
            } else {
                delete approved[mod.id];
                declined[mod.id] = mod.metadata.install!;
                console.log(
                    `${mod.manifest.title}: skipped; features needing this build may be unavailable.`,
                );
            }
        }

        profile.data.herdrModsCommands = approved;
        profile.data.herdrModsDeclined = declined;
    } finally {
        reader?.close();
    }
}

function preflight(profile: Profile, commandBuild = false): void {
    const tools = [process.env.HERDR_MODS_CHEZMOI ?? "chezmoi", "node"];

    if (commandBuild || profile.data.herdrModsBinDir) {
        tools.push(
            "npm",
            ...(process.platform === "darwin" ? ["codesign"] : []),
        );
    }

    for (const mod of packages(profile)) {
        if (
            mod.metadata.install &&
            JSON.stringify(profile.data.herdrModsCommands[mod.id]) ===
                JSON.stringify(mod.metadata.install)
        ) {
            tools.push(
                mod.metadata.install[0],
                ...(mod.metadata.build?.requires ?? []),
            );
        }
    }

    requireTools(tools);
}

export async function main(args: string[]): Promise<number> {
    const [command, ...rest] = args;

    if (command === "--licenses") {
        console.log(
            isSea()
                ? getAsset("licenses", "utf8")
                : "Original tooling: MIT; see LICENSE. Compiled runtime licenses: herdr-mods --licenses.",
        );

        return 0;
    }

    if (!command || command === "--help" || command === "help") {
        console.log(`herdr-mods — an isolated chezmoi profile

setup [--source PATH] [--destination PATH] [--bin-dir PATH] [--yes]
    Set up this checkout, install the command, and apply the mods.
apply [--yes]     Review new build commands, then let chezmoi apply changes.
update [--yes]    Update the checkout, review new commands, and apply.
approve [--yes]   Revisit build choices. Setup and apply already offer them.
revoke           Disable current custom build commands.
info             Show profile paths and choices.

Also forwards: diff, status, verify, managed, unmanaged, re-add, add, merge,
source-path, target-path, cat, cat-config. Use COMMAND --help for chezmoi options.
HERDR_MODS_HOME selects the isolated profile directory.
HERDR_MODS_CHEZMOI selects the chezmoi executable.
To clone a repository first: sh setup.sh --repo URL.
`);

        return 0;
    }

    if (command === "setup") {
        const { values } = parseArgs({
            args: rest,
            options: {
                source: { type: "string" },
                destination: { type: "string" },
                "bin-dir": { type: "string" },
                yes: { type: "boolean" },
            },
        });

        const previous = existsSync(join(profileHome(), "chezmoi.json"))
            ? read()
            : undefined;

        const sourceDir = realpathSync(
            resolve(values.source ?? previous?.sourceDir ?? process.cwd()),
        );

        const destDir = resolve(
            values.destination ??
                previous?.destDir ??
                process.env.HERDR_APP_HOME ??
                join(homedir(), ".config/herdr-app"),
        );

        const binDir = resolve(
            values["bin-dir"] ??
                previous?.data.herdrModsBinDir ??
                join(homedir(), ".local/bin"),
        );

        if (
            !existsSync(join(sourceDir, ".chezmoiignore")) ||
            !existsSync(join(sourceDir, "mods"))
        ) {
            throw new Error("Source must be a herdr-mods checkout.");
        }

        if (
            destDir === sourceDir ||
            destDir.startsWith(sourceDir + "/") ||
            sourceDir.startsWith(destDir + "/")
        ) {
            throw new Error("Source and destination must be separate trees.");
        }

        if (
            !(process.env.PATH ?? "")
                .split(delimiter)
                .some((path) => path && resolve(path) === binDir)
        ) {
            throw new Error(
                `Install the executable in a directory on PATH: add ${binDir} to PATH or pass --bin-dir /directory/already/on/PATH. Shell configuration was not changed.`,
            );
        }

        const profile: Profile = {
            sourceDir,
            destDir,
            data: {
                ...previous?.data,
                herdrModsCommands: previous?.data.herdrModsCommands ?? {},
                herdrModsBinDir: binDir,
            },
        };

        console.log(
            `Using checkout: ${sourceDir}\nHerdr destination: ${destDir}\nExecutable: ${join(binDir, "herdr-mods")}\nChecking requirements…`,
        );
        requireTools([
            process.env.HERDR_MODS_CHEZMOI ?? "chezmoi",
            "node",
            "npm",
            ...(process.platform === "darwin" ? ["codesign"] : []),
        ]);
        await review(profile, !!values.yes);
        preflight(profile, true);
        mkdirSync(destDir, { recursive: true });
        save(profile);
        console.log(
            "Applying with chezmoi; it will ask about conflicting local edits…",
        );
        const code = chezmoi(profile, ["apply"]);

        if (code === 0) {
            console.log(
                "Setup complete. Ask your agent to read herdr-app --skill and each mod's RECIPE.md, then integrate the mods into your layout.",
            );
        }

        return code;
    }

    const profile = read();

    if (command === "info") {
        console.log(
            JSON.stringify({ profile: profileHome(), ...profile }, null, 2),
        );

        return 0;
    }

    if (command === "approve") {
        const { values } = parseArgs({
            args: rest,
            options: { yes: { type: "boolean" } },
        });

        await review(profile, !!values.yes, true);
        save(profile);

        return 0;
    }

    if (command === "revoke") {
        profile.data.herdrModsDeclined = Object.fromEntries(
            packages(profile)
                .filter((mod) => mod.metadata.install)
                .map((mod) => [mod.id, mod.metadata.install!]),
        );
        profile.data.herdrModsCommands = {};
        save(profile);

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

    if (
        rest.some((arg) =>
            /^(--(?:config(?:-format)?|source|destination|cache|persistent-state|working-tree)(?:=|$)|-[cSDW])/.test(
                arg,
            ),
        )
    ) {
        throw new Error(
            "Profile overrides are not accepted here; use setup --source or HERDR_MODS_HOME.",
        );
    }

    const yes = rest.includes("--yes");
    const forwardedArgs = rest.filter((arg) => arg !== "--yes");
    const preview = rest.some((arg) =>
        ["--dry-run", "--dry-run=true", "-n", "--help", "-h"].includes(arg),
    );

    if (command === "update" && !preview && !rest.includes("--apply=false")) {
        const code = chezmoi(profile, [
            "update",
            ...forwardedArgs,
            "--apply=false",
        ]);

        if (code !== 0) {
            return code;
        }

        await review(profile, yes);
        preflight(profile);
        save(profile);

        return chezmoi(profile, [
            "apply",
            ...forwardedArgs.filter(
                (arg) => arg !== "--apply" && !arg.startsWith("--apply="),
            ),
        ]);
    }

    if (command === "apply" && !preview) {
        await review(profile, yes);
        preflight(profile);
        save(profile);
    }

    return chezmoi(profile, [command, ...forwardedArgs]);
}
