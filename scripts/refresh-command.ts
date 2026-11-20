import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { PROJECT } from "./mods.ts";
import { current, fingerprint, record } from "./build-state.ts";
import { requireTools } from "./prerequisites.ts";

const binDir = process.env.HERDR_MODS_BIN_DIR;

if (!binDir) {
    throw new Error(
        "HERDR_MODS_BIN_DIR must name the executable installation directory",
    );
}

const output = join(binDir, "herdr-mods");
const stamp = join(PROJECT, ".build/command/installed.sha256");
const digest = fingerprint(
    PROJECT,
    ["scripts/**/*.ts", "package.json", "package-lock.json", "LICENSE"],
    `${process.platform}/${process.arch}/${process.versions.node}/${output}`,
);

if (current(stamp, digest, [output])) {
    console.log("herdr-mods executable is current.");
} else {
    requireTools([
        "node",
        "npm",
        ...(process.platform === "darwin" ? ["codesign"] : []),
    ]);

    const run = (args: string[]) => {
        const result = spawnSync("npm", args, {
            cwd: PROJECT,
            stdio: "inherit",
        });

        if (result.error || result.status !== 0) {
            throw new Error(
                `Executable update failed; the installed binary was preserved: ${result.error?.message ?? result.status}`,
            );
        }
    };

    const dependencyStamp = join(PROJECT, ".build/dependencies.sha256");
    const dependencies = fingerprint(PROJECT, [
        "package.json",
        "package-lock.json",
    ]);

    if (
        !existsSync(join(PROJECT, "node_modules/esbuild")) ||
        !existsSync(join(PROJECT, "node_modules/postject")) ||
        !existsSync(dependencyStamp) ||
        readFileSync(dependencyStamp, "utf8") !== dependencies
    ) {
        console.log("Installing command build dependencies…");
        run(["ci"]);
        record(dependencyStamp, dependencies);
    }

    console.log("Building and installing herdr-mods…");
    run(["run", "build:command"]);
    run(["run", "install:command"]);
    record(stamp, digest);
}
