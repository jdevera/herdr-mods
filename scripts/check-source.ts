import { globSync } from "node:fs";
import { spawnSync } from "node:child_process";

let failed = false;

for (const file of globSync(["mods/**/*.js", "mods/**/*.cjs"])) {
    const result = spawnSync(process.execPath, ["--check", file], {
        stdio: "inherit",
    });

    if (result.error || result.status !== 0) {
        failed = true;
    }
}

const go = spawnSync("gofmt", ["-l", ...globSync("mods/**/*.go")], {
    encoding: "utf8",
});

if (go.error || go.status !== 0 || go.stdout.trim()) {
    console.error(go.error ?? go.stderr, go.stdout);
    failed = true;
}

process.exitCode = failed ? 1 : 0;
