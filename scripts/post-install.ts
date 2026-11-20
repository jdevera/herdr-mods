import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { discover } from "./mods.ts";
import { readPackage } from "./mod-package.ts";

export function postInstall(
    source: string,
    destination: string,
    approved: Record<string, string[]>,
): void {
    for (const mod of discover(source)) {
        const command = mod.metadata.install;

        if (!command) {
            continue;
        }

        if (JSON.stringify(approved[mod.id]) !== JSON.stringify(command)) {
            console.log(
                `${mod.id}: custom build not approved. Run herdr-mods approve, then apply again.`,
            );

            continue;
        }

        const pkg = join(destination, "mods", mod.id);

        if (!existsSync(join(pkg, "mod.json"))) {
            continue;
        }

        const installed = readPackage(pkg).metadata;

        if (JSON.stringify(installed.install) !== JSON.stringify(command)) {
            throw new Error(
                `${mod.id}: installed command differs; apply the complete package before building.`,
            );
        }

        console.log(
            `${mod.id}: ${JSON.stringify(command)}\nWorking directory: ${pkg}`,
        );
        const result = spawnSync(command[0], command.slice(1), {
            cwd: pkg,
            env: {
                ...process.env,
                HERDR_MOD_DIR: pkg,
                HERDR_APP_HOME: destination,
            },
            stdio: "inherit",
        });

        if (result.error || result.status !== 0) {
            throw new Error(
                `${mod.id}: files installed, but custom build failed: ${result.error?.message ?? result.status}`,
            );
        }
    }
}
