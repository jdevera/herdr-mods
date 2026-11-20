import { createHash } from "node:crypto";
import { existsSync, globSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import { PROJECT, discover, isMain, readJson } from "./mods.ts";

// Fingerprints of complete terms, ignoring whitespace and variable copyright
// lines (MIT) or the optional application appendix (Apache).
const fingerprints = {
    MIT: "a587c3643daff79a3f0aeb2964970db7139e9c8172877068e4ee634769db8216",
    "Apache-2.0":
        "09ae9bf1886f530f7338889ef805f37b288ec6adedd1e1e32058921acf05a782",
};

function license(path: string, kind: string): void {
    const text = readFileSync(path, "utf8");
    let body: string;

    if (kind === "MIT") {
        if (
            !/Copyright.*\d{4}.*\S/.test(text) ||
            !text.includes("Permission is hereby granted")
        ) {
            throw new Error(`${path}: incomplete MIT license`);
        }

        body = text.split("Permission is hereby granted")[1];
    } else if (
        kind === "Apache-2.0" &&
        text.includes("END OF TERMS AND CONDITIONS")
    ) {
        body = text.split("END OF TERMS AND CONDITIONS")[0];
    } else {
        throw new Error(`${path}: incomplete or unsupported license`);
    }

    const hash = createHash("sha256")
        .update(body.trim().split(/\s+/).join(" "))
        .digest("hex");

    if (hash !== fingerprints[kind as keyof typeof fingerprints]) {
        throw new Error(`${path}: unexpected ${kind} license text`);
    }
}

export function validate(root = PROJECT): void {
    const ajv = new Ajv2020({
        allErrors: true,
        strict: false,
        validateFormats: false,
    });

    const schema = ajv.compile(
        readJson(join(root, "schemas/mod.meta.schema.json")) as object,
    );

    const licensing = readFileSync(join(root, "LICENSING.md"), "utf8");

    for (const [, target] of licensing.matchAll(/\]\(([^)]+)\)/g)) {
        if (!existsSync(join(root, target))) {
            throw new Error(`LICENSING.md: missing linked file ${target}`);
        }
    }

    license(join(root, "LICENSE"), "MIT");
    license(join(root, "examples/layouts/LICENSE"), "Apache-2.0");

    for (const mod of discover(root)) {
        if (!schema(mod.metadata)) {
            throw new Error(`${mod.id}: ${ajv.errorsText(schema.errors)}`);
        }

        if (!existsSync(join(mod.source, "main.js"))) {
            throw new Error(`${mod.id}: missing main.js`);
        }

        if (!existsSync(join(mod.package, "RECIPE.md"))) {
            throw new Error(`${mod.id}: missing setup recipe`);
        }

        license(join(mod.package, "LICENSE"), mod.metadata.license);
        const provenance = readFileSync(
            join(mod.package, "PROVENANCE.md"),
            "utf8",
        );

        for (const token of [
            "License:",
            mod.metadata.license,
            "Local modifications:",
            mod.metadata.license === "Apache-2.0" ? "Upstream:" : "Source:",
        ]) {
            if (!provenance.includes(token)) {
                throw new Error(`${mod.id}: provenance missing ${token}`);
            }
        }

        if (mod.metadata.license === "Apache-2.0") {
            if (!readFileSync(join(mod.package, "NOTICE"), "utf8").trim()) {
                throw new Error(`${mod.id}: empty NOTICE`);
            }

            if (!mod.manifest.$comment?.includes("Modified")) {
                throw new Error(`${mod.id}: missing modification notice`);
            }
        }

        if (!licensing.includes(`mods/${mod.id}`)) {
            throw new Error(`${mod.id}: missing license scope`);
        }

        for (const extra of globSync("**/LICENSE-*", { cwd: mod.package })) {
            license(join(mod.package, extra), "MIT");

            if (
                !provenance.includes(extra) &&
                !provenance.includes(extra.split("/").at(-1)!)
            ) {
                throw new Error(`${extra}: missing provenance`);
            }
        }

        const configSchema = join(mod.source, "config.schema.json");
        const configs = globSync(["settings.json", "settings.*.json"], {
            cwd: mod.source,
        });

        if (configs.length && !existsSync(configSchema)) {
            throw new Error(`${mod.id}: settings require config.schema.json`);
        }

        if (existsSync(configSchema)) {
            const config = ajv.compile(readJson(configSchema) as object);

            for (const file of configs) {
                if (!config(readJson(join(mod.source, file)))) {
                    throw new Error(
                        `${mod.id}/${file}: ${ajv.errorsText(config.errors)}`,
                    );
                }
            }
        }
    }

    console.log(
        "Repository metadata schemas, configuration schemas, required files, licenses and provenance passed",
    );
}

if (isMain(import.meta.url)) {
    validate();
}
