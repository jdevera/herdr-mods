import {
    chmodSync,
    copyFileSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    realpathSync,
    renameSync,
    rmSync,
} from "node:fs";
import { delimiter, join, resolve } from "node:path";
import { homedir } from "node:os";
import { PROJECT } from "./mods.ts";

const built = join(
    PROJECT,
    ".build/command",
    process.platform === "win32" ? "herdr-mods.exe" : "herdr-mods",
);

const targetDir = resolve(
    process.env.HERDR_MODS_BIN_DIR ?? join(homedir(), ".local/bin"),
);

const canonical = (path: string) =>
    existsSync(path) ? realpathSync(path) : resolve(path);

const onPath = (process.env.PATH ?? "")
    .split(delimiter)
    .some((path) => path && canonical(path) === canonical(targetDir));

if (!existsSync(built)) {
    throw new Error("Run npm run build:command first.");
}

if (!onPath) {
    console.log(
        `Built executable: ${built}\nInstall it in a directory on PATH, or add ${targetDir} to PATH and rerun npm run install:command. No shell configuration was changed.`,
    );
    process.exitCode = 1;
} else {
    mkdirSync(targetDir, { recursive: true });
    const staging = mkdtempSync(join(targetDir, ".herdr-mods-"));

    try {
        const temporary = join(staging, "herdr-mods");

        copyFileSync(built, temporary);
        chmodSync(temporary, 0o755);
        renameSync(temporary, join(targetDir, "herdr-mods"));
    } finally {
        rmSync(staging, { recursive: true, force: true });
    }

    console.log(`Installed ${join(targetDir, "herdr-mods")}`);
}
