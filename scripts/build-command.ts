import {
    chmodSync,
    copyFileSync,
    mkdirSync,
    writeFileSync,
    readFileSync,
    mkdtempSync,
    renameSync,
    rmSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { build } from "esbuild";
import { PROJECT } from "./mods.ts";

function run(command: string, args: string[]): void {
    const result = spawnSync(command, args, { stdio: "inherit" });

    if (result.error || result.status !== 0) {
        throw new Error(
            `${command} failed: ${result.error?.message ?? result.status}`,
        );
    }
}

const directory = join(PROJECT, ".build/command");
const main = join(directory, "main.cjs");
const blob = join(directory, "sea.blob");

mkdirSync(directory, { recursive: true });
const staging = mkdtempSync(join(directory, "build-"));
const output = join(
    staging,
    process.platform === "win32" ? "herdr-mods.exe" : "herdr-mods",
);

try {
    await build({
        entryPoints: [join(PROJECT, "scripts/herdr-mods.ts")],
        bundle: true,
        platform: "node",
        target: "node24",
        format: "cjs",
        outfile: main,
    });
    const nodeLicense =
        process.env.NODE_LICENSE_FILE ??
        join(dirname(process.execPath), "../LICENSE");

    writeFileSync(
        join(directory, "LICENSES.txt"),
        readFileSync(join(PROJECT, "LICENSE"), "utf8") +
            "\nBundled Node.js runtime and dependencies:\n\n" +
            readFileSync(nodeLicense, "utf8"),
    );
    const config = join(directory, "sea.json");

    writeFileSync(
        config,
        JSON.stringify({
            main,
            output: blob,
            disableExperimentalSEAWarning: true,
            useSnapshot: false,
            useCodeCache: false,
            assets: { licenses: join(directory, "LICENSES.txt") },
        }),
    );
    run(process.execPath, ["--experimental-sea-config", config]);
    copyFileSync(process.execPath, output);
    chmodSync(output, 0o755);

    if (process.platform === "darwin") {
        run("codesign", ["--remove-signature", output]);
    }

    run(process.execPath, [
        join(PROJECT, "node_modules/postject/dist/cli.js"),
        output,
        "NODE_SEA_BLOB",
        blob,
        "--sentinel-fuse",
        "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
        ...(process.platform === "darwin"
            ? ["--macho-segment-name", "NODE_SEA"]
            : []),
    ]);

    if (process.platform === "darwin") {
        run("codesign", ["--sign", "-", output]);
    }

    run(output, ["--help"]);
    const final = join(
        directory,
        process.platform === "win32" ? "herdr-mods.exe" : "herdr-mods",
    );

    renameSync(output, final);
    console.log(`Built ${final}`);
} finally {
    rmSync(staging, { recursive: true, force: true });
}
