import assert from "node:assert/strict";
import {
    cpSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { TestContext } from "node:test";
import { PROJECT, discover, readJson } from "../scripts/mods.ts";
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

    return { root };
}

function json(path: string, value: unknown) {
    writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
}

function metadata(root: string) {
    return join(root, "mods/pr-panel/mod.meta.json");
}

test("discovers package-root manifests and generates an idempotent README section", async (t) => {
    const { root } = fixture(t);

    assert.deepEqual(
        discover(root).map((m) => m.id),
        ["pr-badge", "pr-panel", "pr-tab-bar"],
    );
    json(metadata(root), {
        ...(readJson(metadata(root)) as object),
        description: "A changed description | with a pipe.",
    });
    assert.equal(await generate(root), true);
    assert.match(
        readFileSync(join(root, "README.md"), "utf8"),
        /changed description \\| with a pipe/,
    );
    assert.equal(await generate(root), false);
    const herdrPath = join(root, "mods/pr-panel/mod.json");
    const originalHerdr = readJson(herdrPath) as object;

    json(herdrPath, { ...originalHerdr, title: "Changed Herdr title" });
    assert.equal(await generate(root), true);
    assert.match(
        readFileSync(join(root, "README.md"), "utf8"),
        /Changed Herdr title/,
    );
    assert.equal("title" in (readJson(metadata(root)) as object), false);
    rmSync(metadata(root));
    assert.throws(
        () => discover(root),
        /Missing mod.meta.json at package root/,
    );
});

test("repository rules accept the tree and reject invalid manifests and license text", (t) => {
    const { root } = fixture(t);

    validate(root);
    const original = readJson(metadata(root)) as object;

    for (const change of [
        { settings: {} },
        { title: "Duplicated title" },
        { place: "none" },
        { description: "" },
        { license: "unknown" },
        { install: "echo hi" },
        { install: [] },
        { install: [""] },
        { install: ["go", 42] },
        { typo: true },
        {
            build: {
                description: "Build",
                inputs: ["helper/**"],
                outputs: ["../escape"],
                requires: [],
            },
        },
        {
            build: {
                description: "Build",
                inputs: [],
                outputs: ["bin/helper"],
                requires: [],
            },
        },
    ]) {
        json(metadata(root), { ...original, ...change });
        assert.throws(() => validate(root));
    }

    json(metadata(root), original);
    writeFileSync(join(root, "mods/pr-panel/LICENSE"), "Apache License 2.0");
    assert.throws(() => validate(root), /license/);
});

test("Herdr manifests keep runtime fields and reject repository metadata", (t) => {
    const { root } = fixture(t);
    const path = join(root, "mods/pr-panel/mod.json");
    const original = readJson(path) as object;

    for (const field of ["description", "license", "install", "settings"]) {
        json(path, { ...original, [field]: "misplaced" });
        assert.throws(
            () => validate(root),
            /does not belong in the Herdr manifest/,
        );
    }

    // Herdr can add runtime fields without changing our repository metadata schema.
    json(path, { ...original, futureHerdrOption: true });
    validate(root);
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
