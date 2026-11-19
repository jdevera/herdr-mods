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
    symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import type { TestContext } from "node:test";
import { PROJECT, discover, readJson } from "../scripts/mods.ts";
import { install } from "../scripts/install.ts";
import { generate } from "../scripts/readme.ts";
import { validate } from "../scripts/check-repo.ts";

function fixture(t: TestContext) {
    const temp = mkdtempSync(join(tmpdir(), "herdr-mod-test-"));

    t.after(() => rmSync(temp, { recursive: true, force: true }));
    const root = join(temp, "repo");

    mkdirSync(root);

    for (const name of [
        "mods",
        "schemas",
        "examples",
        "README.md",
        "LICENSE",
        "LICENSING.md",
    ]) {
        cpSync(join(PROJECT, name), join(root, name), { recursive: true });
    }

    return { root, app: join(temp, "app") };
}

function json(path: string, value: unknown) {
    writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
}

function manifest(root: string) {
    return join(root, "mods/pr-panel/mod.json");
}

function setCommand(root: string, command: unknown) {
    json(manifest(root), {
        ...(readJson(manifest(root)) as object),
        install: command,
    });
}

const decline = async () => false;

test("discovers package-root manifests and generates an idempotent README section", async (t) => {
    const { root } = fixture(t);

    assert.deepEqual(
        discover(root).map((m) => m.id),
        ["pr-badge", "pr-panel", "pr-tab-bar"],
    );
    json(manifest(root), {
        ...(readJson(manifest(root)) as object),
        description: "A changed description | with a pipe.",
    });
    assert.equal(await generate(root), true);
    assert.match(
        readFileSync(join(root, "README.md"), "utf8"),
        /changed description \\| with a pipe/,
    );
    assert.equal(await generate(root), false);
    rmSync(manifest(root));
    assert.throws(() => discover(root), /missing mod.json at package root/);
});

test("repository rules accept the tree and reject invalid manifests and license text", (t) => {
    const { root } = fixture(t);

    validate(root);
    const original = readJson(manifest(root)) as object;

    for (const change of [
        { settings: {} },
        { description: "" },
        { license: "unknown" },
        { install: "echo hi" },
        { install: [] },
        { install: [""] },
        { install: ["go", 42] },
        { typo: true },
    ]) {
        json(manifest(root), { ...original, ...change });
        assert.throws(() => validate(root));
    }

    json(manifest(root), original);
    writeFileSync(join(root, "mods/pr-panel/LICENSE"), "Apache License 2.0");
    assert.throws(() => validate(root), /license/);
});

test("configuration schema checks standalone settings and required files", (t) => {
    const { root } = fixture(t);
    const config = join(root, "mods/pr-panel/settings.local.json");

    json(config, { list: { page_size: 0 } });
    assert.throws(() => validate(root), /page_size/);
    json(config, { list: { page_size: 50 } });
    validate(root);
    rmSync(join(root, "mods/pr-panel/main.js"));
    assert.throws(() => validate(root), /missing main.js/);
});

test("copies before asking, declines without running, and leaves layout alone", async (t) => {
    const { root, app } = fixture(t);

    mkdirSync(join(app, "layouts"), { recursive: true });
    writeFileSync(join(app, "layouts/personal.json"), "personal");
    const marker = join(app, "executed");

    setCommand(root, [
        process.execPath,
        "-e",
        `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'ran')`,
    ]);
    let asked = 0;

    await install(app, {
        root,
        approve: async () => {
            asked++;

            for (const mod of discover(root)) {
                assert.ok(existsSync(join(app, "mods", mod.id, "main.js")));
            }

            return false;
        },
    });
    assert.equal(asked, 1);
    assert.equal(existsSync(marker), false);
    assert.equal(
        readFileSync(join(app, "layouts/personal.json"), "utf8"),
        "personal",
    );
    assert.equal(
        readFileSync(join(app, "mods/pr-badge/LICENSE-octicons"), "utf8"),
        readFileSync(join(root, "mods/pr-badge/LICENSE-octicons"), "utf8"),
    );

    for (const mod of discover(root)) {
        assert.ok(existsSync(join(app, "mods", mod.id, "mod.schema.json")));
    }
});

test("approval executes argv literally with the package cwd and destination", async (t) => {
    const { root, app } = fixture(t);
    const argument = "literal $(touch unwanted); space";
    const command = [
        process.execPath,
        "-e",
        "require('node:fs').writeFileSync(process.env.HERDR_MOD_DIR+'/result.json', JSON.stringify({cwd:process.cwd(),home:process.env.HERDR_APP_HOME,arg:process.argv[1]}))",
        argument,
    ];

    setCommand(root, command);
    await install(app, {
        root,
        selected: ["pr-panel"],
        approve: async (shown) => {
            assert.deepEqual(shown, command);

            return true;
        },
    });
    assert.deepEqual(readJson(join(app, "mods/pr-panel/result.json")), {
        cwd: realpathSync(join(root, "mods/pr-panel")),
        home: app,
        arg: argument,
    });
    assert.equal(existsSync(join(app, "mods/pr-badge")), false);
});

test("--yes bypasses approval and a failed command reports partial completion", async (t) => {
    const { root, app } = fixture(t);

    setCommand(root, [process.execPath, "-e", "process.exit(7)"]);
    await assert.rejects(
        install(app, {
            root,
            yes: true,
            approve: async () => {
                throw new Error("must not ask");
            },
        }),
        /Post-install failed/,
    );
    assert.ok(existsSync(join(app, "mods/pr-panel/main.js")));
});

test("updates migrate legacy settings, preserve layers and back up the old manifest", async (t) => {
    const { root, app } = fixture(t);

    await install(app, { root, approve: decline });
    const dest = join(app, "mods/pr-panel");
    const meta = readJson(join(dest, "mod.json")) as object;

    json(join(dest, "mod.json"), {
        ...meta,
        settings: { refresh: { every: "90s", search_debounce: "1s" } },
    });
    json(join(dest, "settings.json"), { refresh: { every: "2m" } });
    const layer = '{"list":{"page_size":42}}\n';

    writeFileSync(join(dest, "settings.local.json"), layer);
    // Even shipped config files must not overwrite a user's versions.
    json(join(root, "mods/pr-panel/settings.local.json"), {
        list: { page_size: 1 },
    });
    await install(app, { root, approve: decline });
    assert.deepEqual(readJson(join(dest, "settings.json")), {
        refresh: { every: "2m", search_debounce: "1s" },
    });
    assert.equal(
        readFileSync(join(dest, "settings.local.json"), "utf8"),
        layer,
    );
    assert.equal(
        "settings" in (readJson(join(dest, "mod.json")) as object),
        false,
    );
});

test("invalid commands fail before installation and installer runs without node_modules", async (t) => {
    const { root, app } = fixture(t);

    setCommand(root, "echo bad");
    await assert.rejects(install(app, { root }), /array/);
    assert.equal(existsSync(app), false);
    cpSync(join(PROJECT, "scripts"), join(root, "scripts"), {
        recursive: true,
    });
    setCommand(root, [process.execPath, "-e", "process.exit(0)"]);
    const alias = root + "-link";

    symlinkSync(root, alias, "dir");

    const result = spawnSync(
        process.execPath,
        [join(alias, "scripts/install.ts"), app, "--yes"],
        { encoding: "utf8" },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.ok(existsSync(join(app, "mods/pr-panel/main.js")));
});

test("installed panel includes runnable tests and helper source", async (t) => {
    const { root, app } = fixture(t);

    await install(app, { root, selected: ["pr-panel"], approve: decline });
    const pkg = join(app, "mods/pr-panel");

    for (const name of [
        "helper/main.go",
        "helper/main_test.go",
        "helper/go.mod",
        "install.ts",
        "README.md",
        "RECIPE.md",
    ]) {
        assert.ok(existsSync(join(pkg, name)), name);
    }

    const result = spawnSync(
        process.execPath,
        [
            "--test",
            "tests/packaging.test.cjs",
            "tests/settings.test.cjs",
            "tests/pr.test.cjs",
        ],
        { cwd: pkg, encoding: "utf8" },
    );

    assert.equal(result.status, 0, result.stdout + result.stderr);
});
