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

test("bootstrap fails early with actionable dependency hints", (t) => {
    const temp = mkdtempSync(join(tmpdir(), "herdr-preflight-"));

    t.after(() => rmSync(temp, { recursive: true, force: true }));
    writeFileSync(join(temp, "uname"), "#!/bin/sh\necho Darwin\n", {
        mode: 0o755,
    });
    const result = spawnSync(
        "/bin/sh",
        [join(PROJECT, "setup.sh"), "--source", PROJECT],
        {
            encoding: "utf8",
            env: {
                ...process.env,
                PATH: temp,
                HERDR_MODS_HOME: join(temp, "profile"),
            },
        },
    );

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /brew install chezmoi/);
    assert.match(result.stderr, /mise use --global node@24/);
    assert.equal(existsSync(join(temp, "profile")), false);
});

test(
    "single setup, onchange updates, missing-output recovery, and isolated cloning",
    { skip: !available && "chezmoi is not installed" },
    (t) => {
        const temp = mkdtempSync(join(tmpdir(), "herdr-setup-"));

        t.after(() => rmSync(temp, { recursive: true, force: true }));
        const source = join(temp, "source with spaces");
        const destination = join(temp, "app");
        const bin = join(temp, "bin");
        const profile = join(temp, "profile");

        mkdirSync(source);
        mkdirSync(bin);

        for (const path of [
            "scripts",
            "mods",
            ".chezmoiscripts",
            ".chezmoiignore",
            ".gitignore",
            "package.json",
            "package-lock.json",
            "LICENSE",
            "setup.sh",
        ]) {
            cpSync(join(PROJECT, path), join(source, path), {
                recursive: true,
            });
        }

        // Exercise real setup, templates, caching, and atomic installation without
        // repeatedly compiling a Node runtime or downloading dependencies in tests.
        writeFileSync(
            join(bin, "npm"),
            `#!${process.execPath}
const fs=require('node:fs');
fs.mkdirSync('.build/command',{recursive:true});
if(process.argv[2]==='ci') {
 fs.mkdirSync('node_modules/esbuild',{recursive:true});
 fs.mkdirSync('node_modules/postject',{recursive:true});
} else if(process.argv[3]==='build:command') {
 if(process.env.HERDR_FIXTURE_BUILD_FAIL) process.exit(7);
 const count=fs.existsSync('.build/count')?Number(fs.readFileSync('.build/count'))+1:1;
 fs.writeFileSync('.build/count',String(count));
 fs.writeFileSync('.build/command/herdr-mods','#!/bin/sh\\n# build '+count+'\\necho fixture\\n',{mode:0o755});
} else if(process.argv[3]==='install:command') {
 const r=require('node:child_process').spawnSync(process.execPath,['scripts/install-command.ts'],{stdio:'inherit'});process.exit(r.status??1);
} else {process.exit(2);}
`,
            { mode: 0o755 },
        );
        const metaPath = join(source, "mods/pr-panel/mod.meta.json");
        const meta = JSON.parse(readFileSync(metaPath, "utf8"));

        meta.install = [process.execPath, "build-fixture.cjs"];
        meta.build = {
            description: "Build fixture",
            inputs: ["build-fixture.cjs", "input.txt"],
            outputs: ["bin/fixture"],
            requires: [],
        };
        writeFileSync(metaPath, JSON.stringify(meta));
        writeFileSync(join(source, "mods/pr-panel/input.txt"), "first");
        writeFileSync(
            join(source, "mods/pr-panel/build-fixture.cjs"),
            `const fs=require('node:fs');fs.mkdirSync('bin',{recursive:true});const n=fs.existsSync('bin/count')?Number(fs.readFileSync('bin/count'))+1:1;fs.writeFileSync('bin/count',String(n));fs.writeFileSync('bin/fixture',fs.readFileSync('input.txt'));`,
        );
        const env = {
            ...process.env,
            PATH: `${bin}:${process.env.PATH}`,
            HERDR_MODS_HOME: profile,
            HERDR_MODS_CHEZMOI: chezmoi,
            XDG_DATA_HOME: join(temp, "data"),
        };

        const run = (
            command: string,
            args: string[],
            overrides: Record<string, string> = {},
        ) =>
            spawnSync(command, args, {
                encoding: "utf8",
                env: { ...env, ...overrides },
            });

        const ok = (
            command: string,
            args: string[],
            overrides: Record<string, string> = {},
        ) => {
            const result = run(command, args, overrides);

            assert.equal(
                result.status,
                0,
                `${args.join(" ")}\n${result.stdout}\n${result.stderr}`,
            );

            return result.stdout;
        };

        const cli = (...args: string[]) =>
            ok(process.execPath, [
                join(source, "scripts/herdr-mods.ts"),
                ...args,
            ]);

        const helperCount = () =>
            Number(readFileSync(join(destination, "mods/pr-panel/bin/count")));

        const commandCount = () =>
            Number(readFileSync(join(source, ".build/count")));

        ok("/bin/sh", [
            join(source, "setup.sh"),
            "--source",
            source,
            "--destination",
            destination,
            "--bin-dir",
            bin,
            "--yes",
        ]);
        assert.equal(helperCount(), 1);
        assert.equal(commandCount(), 1);
        assert.equal(cli("diff", "--no-pager"), "");
        rmSync(join(bin, "herdr-mods"));
        rmSync(join(destination, "mods/pr-panel/bin/fixture"));
        cli("apply");
        assert.equal(helperCount(), 2);
        assert.equal(commandCount(), 2);
        cli("apply");
        cli("apply");
        assert.equal(helperCount(), 2);
        assert.equal(commandCount(), 2);
        writeFileSync(join(source, "mods/pr-panel/input.txt"), "second");
        cli("apply", "--dry-run");
        assert.equal(helperCount(), 2);
        cli("apply");
        assert.equal(helperCount(), 3);
        assert.equal(commandCount(), 2);
        const buildSource = join(source, "scripts/herdr-mods.ts");

        writeFileSync(
            buildSource,
            readFileSync(buildSource, "utf8") + "\n// changed source\n",
        );
        const oldBinary = readFileSync(join(bin, "herdr-mods"));
        const failed = run(process.execPath, [buildSource, "apply"], {
            HERDR_FIXTURE_BUILD_FAIL: "1",
        });

        assert.notEqual(failed.status, 0);
        assert.deepEqual(readFileSync(join(bin, "herdr-mods")), oldBinary);
        cli("apply");
        assert.equal(commandCount(), 3);
        assert.equal(helperCount(), 3);
        const customMetaPath = join(
            source,
            "mods/pr-status-badge/mod.meta.json",
        );

        const customMeta = JSON.parse(readFileSync(customMetaPath, "utf8"));

        customMeta.install = [process.execPath, "custom-fixture.cjs"];
        writeFileSync(customMetaPath, JSON.stringify(customMeta));
        writeFileSync(
            join(source, "mods/pr-status-badge/custom-fixture.cjs"),
            `const fs=require('node:fs');fs.mkdirSync('.cache',{recursive:true});const p='.cache/custom-count';fs.writeFileSync(p,String(fs.existsSync(p)?Number(fs.readFileSync(p))+1:1));`,
        );
        const again = ok("/bin/sh", [
            join(source, "setup.sh"),
            "--source",
            source,
            "--yes",
        ]);

        assert.match(again, /Setup complete/);
        assert.equal(
            readFileSync(
                join(destination, "mods/pr-status-badge/.cache/custom-count"),
                "utf8",
            ),
            "1",
        );
        assert.equal(commandCount(), 3);
        assert.equal(
            JSON.parse(readFileSync(join(profile, "chezmoi.json"), "utf8"))
                .sourceDir,
            realpathSync(source),
        );

        ok("git", ["-C", source, "init", "-b", "main"]);
        ok("git", ["-C", source, "add", "."]);
        ok("git", [
            "-C",
            source,
            "-c",
            "user.name=Fixture",
            "-c",
            "user.email=fixture@example.invalid",
            "-c",
            "core.hooksPath=/dev/null",
            "commit",
            "-m",
            "Fixture",
        ]);
        const cloneProfile = join(temp, "clone-profile");

        ok(
            "/bin/sh",
            [
                join(PROJECT, "setup.sh"),
                "--repo",
                source,
                "--destination",
                join(temp, "clone-app"),
                "--bin-dir",
                bin,
                "--yes",
            ],
            { HERDR_MODS_HOME: cloneProfile },
        );
        assert.ok(existsSync(join(temp, "data/herdr-mods/.git")));
        assert.equal(
            JSON.parse(readFileSync(join(cloneProfile, "chezmoi.json"), "utf8"))
                .sourceDir,
            realpathSync(join(temp, "data/herdr-mods")),
        );
        assert.equal(
            JSON.parse(readFileSync(join(profile, "chezmoi.json"), "utf8"))
                .destDir,
            destination,
        );
        const cloneSource = join(temp, "data/herdr-mods");

        writeFileSync(
            join(cloneSource, "local-note.txt"),
            "keep this local work",
        );
        writeFileSync(
            join(source, "mods/pr-panel/input.txt"),
            "upstream change",
        );
        ok("git", ["-C", source, "add", "mods/pr-panel/input.txt"]);
        ok("git", [
            "-C",
            source,
            "-c",
            "user.name=Fixture",
            "-c",
            "user.email=fixture@example.invalid",
            "-c",
            "core.hooksPath=/dev/null",
            "commit",
            "-m",
            "Update fixture",
        ]);
        ok(
            process.execPath,
            [join(cloneSource, "scripts/herdr-mods.ts"), "update", "--yes"],
            { HERDR_MODS_HOME: cloneProfile },
        );
        assert.equal(
            readFileSync(
                join(temp, "clone-app/mods/pr-panel/bin/fixture"),
                "utf8",
            ),
            "upstream change",
        );
        assert.equal(
            readFileSync(join(cloneSource, "local-note.txt"), "utf8"),
            "keep this local work",
        );
    },
);
