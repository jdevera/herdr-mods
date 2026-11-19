// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Jacobo de Vera
// Post-install addition: build the GitHub helper for this machine.
import { mkdirSync, mkdtempSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

if (!process.env.HERDR_MOD_DIR) {
    throw new Error("Run through scripts/install.ts to supply HERDR_MOD_DIR");
}

const bin = join(process.env.HERDR_MOD_DIR, "bin");

mkdirSync(bin, { recursive: true });
const filename = process.platform === "win32" ? "herdr-pr.exe" : "herdr-pr";
const temp = mkdtempSync(join(bin, ".build-"));

try {
    const built = join(temp, filename);
    const result = spawnSync("go", ["build", "-o", built, "."], {
        cwd: join(import.meta.dirname, "helper"),
        stdio: "inherit",
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        throw new Error(
            `Helper build failed: ${result.signal ?? result.status}`,
        );
    }

    // Rename preserves an existing working binary if the build fails, and avoids
    // rewriting a signed executable in place on macOS.
    renameSync(built, join(bin, filename));
    console.log(`Installed helper: ${join(bin, filename)}`);
} finally {
    rmSync(temp, { recursive: true, force: true });
}
