import assert from "node:assert/strict";
import {
    cpSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    realpathSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { PROJECT } from "../scripts/mods.ts";

const chezmoi = process.env.HERDR_MODS_CHEZMOI ?? "chezmoi";
const available =
    spawnSync(chezmoi, ["--version"], { encoding: "utf8" }).status === 0;

test(
    "isolated chezmoi profile copies complete packages and round-trips edits",
    { skip: !available && "chezmoi is not installed" },
    (t) => {
        const temp = mkdtempSync(join(tmpdir(), "herdr-profile-"));

        t.after(() => rmSync(temp, { recursive: true, force: true }));
        const source = join(temp, "source with spaces");
        const destination = join(temp, "destination");
        const profile = join(temp, "profile");
        const other = join(temp, "other-profile");

        mkdirSync(source);
        mkdirSync(other);
        writeFileSync(join(other, "chezmoi.toml"), "# must not change\n");

        for (const file of [
            "mods",
            "scripts",
            ".chezmoiignore",
            ".chezmoiscripts",
        ]) {
            cpSync(join(PROJECT, file), join(source, file), {
                recursive: true,
            });
        }

        const write = (root: string, path: string, content: string) => {
            const target = join(root, path);

            mkdirSync(join(target, ".."), { recursive: true });
            writeFileSync(target, content);
        };

        const cli = (...args: string[]) =>
            spawnSync(
                process.env.HERDR_MODS_TEST_COMMAND ?? process.execPath,
                [
                    ...(process.env.HERDR_MODS_TEST_COMMAND
                        ? []
                        : [join(PROJECT, "scripts/herdr-mods.ts")]),
                    ...args,
                ],
                {
                    env: {
                        ...process.env,
                        HERDR_MODS_HOME: profile,
                        HERDR_MODS_CHEZMOI: chezmoi,
                        XDG_CONFIG_HOME: other,
                    },
                    encoding: "utf8",
                },
            );

        const ok = (...args: string[]) => {
            const result = cli(...args);

            assert.equal(
                result.status,
                0,
                `${args.join(" ")}\n${result.stdout}\n${result.stderr}`,
            );

            return result.stdout;
        };

        ok("setup", "--source", source, "--destination", destination);
        assert.ok(existsSync(destination));
        assert.notEqual(cli("setup", "--source", source).status, 0);
        assert.notEqual(cli("status", "--source", other).status, 0);
        write(source, "README.md", "root files must not deploy");

        const excluded = [
            "settings.json",
            "settings.local.json",
            "bin/compiled",
            "node_modules/a/index.js",
            "nested/generated.d.ts",
            "nested/jsconfig.json",
            "nested/crash.error",
            "nested/.DS_Store",
            "nested/temp.swp",
            "coverage/report.html",
        ];

        for (const path of excluded) {
            write(source, `mods/pr-panel/${path}`, "excluded source");
            write(destination, `mods/pr-panel/${path}`, "local data");
        }

        write(destination, "layouts/mine.json", "my layout");
        write(destination, "mods/unrelated/main.js", "unrelated");
        ok("apply", "--dry-run", "--no-tty");
        assert.equal(
            existsSync(join(destination, "mods/pr-panel/main.js")),
            false,
        );
        ok("apply", "--no-tty");
        assert.equal(existsSync(join(destination, "README.md")), false);

        for (const path of excluded) {
            assert.equal(
                readFileSync(join(destination, "mods/pr-panel", path), "utf8"),
                "local data",
                path,
            );
        }

        const installedTests = spawnSync(
            process.execPath,
            [
                "--test",
                "tests/pr.test.cjs",
                "tests/settings.test.cjs",
                "tests/packaging.test.cjs",
            ],
            {
                cwd: join(destination, "mods/pr-panel"),
                encoding: "utf8",
            },
        );

        assert.equal(
            installedTests.status,
            0,
            installedTests.stdout + installedTests.stderr,
        );
        assert.equal(
            existsSync(join(destination, "mods/pr-panel/bin/herdr-pr")),
            false,
        );

        for (const path of [
            "tests/pr.test.cjs",
            "helper/main.go",
            "helper/main_test.go",
            "LICENSE",
            "NOTICE",
            "tests/fixtures/better-icons/mods/better-icons/LICENSE-material-icon-theme.txt",
        ]) {
            assert.equal(
                readFileSync(join(destination, "mods/pr-panel", path), "utf8"),
                readFileSync(join(source, "mods/pr-panel", path), "utf8"),
            );
        }

        assert.equal(
            readFileSync(
                join(destination, "mods/pr-panel/settings.local.json"),
                "utf8",
            ),
            "local data",
        );
        assert.equal(
            readFileSync(join(destination, "layouts/mine.json"), "utf8"),
            "my layout",
        );
        assert.equal(
            readFileSync(join(destination, "mods/unrelated/main.js"), "utf8"),
            "unrelated",
        );
        assert.equal(
            readFileSync(join(other, "chezmoi.toml"), "utf8"),
            "# must not change\n",
        );
        write(
            destination,
            "mods/pr-panel/tests/new.test.cjs",
            "// new local test\n",
        );
        ok("add", join(destination, "mods/pr-panel/tests/new.test.cjs"));
        assert.equal(
            readFileSync(
                join(source, "mods/pr-panel/tests/new.test.cjs"),
                "utf8",
            ),
            "// new local test\n",
        );
        write(
            destination,
            "mods/pr-panel/tests/new.test.cjs",
            "// edited test\n",
        );
        write(destination, "mods/pr-panel/main.js", "// edited UI\n");
        ok("re-add", join(destination, "mods/pr-panel"));
        assert.equal(
            readFileSync(
                join(source, "mods/pr-panel/tests/new.test.cjs"),
                "utf8",
            ),
            "// edited test\n",
        );
        assert.equal(
            readFileSync(join(source, "mods/pr-panel/main.js"), "utf8"),
            "// edited UI\n",
        );

        for (const path of excluded) {
            assert.equal(
                readFileSync(join(source, "mods/pr-panel", path), "utf8"),
                "excluded source",
                path,
            );
        }

        write(source, "mods/pr-panel/main.js", "// upstream update\n");
        ok("apply", "--no-tty");
        assert.equal(
            readFileSync(join(destination, "mods/pr-panel/main.js"), "utf8"),
            "// upstream update\n",
        );

        write(source, "mods/pr-panel/main.js", "// conflicting source\n");
        write(
            destination,
            "mods/pr-panel/main.js",
            "// conflicting destination\n",
        );
        assert.notEqual(cli("apply", "--no-tty").status, 0);
        assert.equal(
            readFileSync(join(destination, "mods/pr-panel/main.js"), "utf8"),
            "// conflicting destination\n",
        );
        ok("re-add", join(destination, "mods/pr-panel/main.js"));
        rmSync(join(source, "mods/pr-panel/tests/new.test.cjs"));
        ok("apply", "--no-tty");
        assert.ok(
            existsSync(join(destination, "mods/pr-panel/tests/new.test.cjs")),
        );

        const manifestPath = join(source, "mods/pr-panel/mod.json");
        const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

        manifest.install = [
            process.execPath,
            "-e",
            "require('node:fs').writeFileSync(process.env.HERDR_MOD_DIR+'/bin/built',process.cwd())",
        ];
        writeFileSync(manifestPath, JSON.stringify(manifest));
        ok("approve", "--yes");
        ok("apply", "--dry-run", "--no-tty");
        assert.equal(
            existsSync(join(destination, "mods/pr-panel/bin/built")),
            false,
        );
        ok("apply", "--no-tty");
        assert.equal(
            readFileSync(join(destination, "mods/pr-panel/bin/built"), "utf8"),
            realpathSync(join(destination, "mods/pr-panel")),
        );
        ok("apply", "--no-tty");
        manifest.install = [process.execPath, "-e", "process.exit(7)"];
        writeFileSync(manifestPath, JSON.stringify(manifest));
        assert.match(ok("apply", "--no-tty"), /not approved/);
        ok("approve", "--yes");
        const failed = cli("apply", "--no-tty");

        assert.notEqual(failed.status, 0);
        assert.match(
            failed.stdout + failed.stderr,
            /files installed, but custom build failed/,
        );
        ok("revoke");
        ok("apply", "--no-tty");
    },
);
