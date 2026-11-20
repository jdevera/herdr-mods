import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

export interface Manifest {
    title: string;
    $comment?: string;
}

export interface Metadata {
    description: string;
    license: string;
    install?: string[];
}

export interface Mod {
    id: string;
    package: string;
    source: string;
    manifest: Manifest;
    metadata: Metadata;
}

export function readJson(path: string): unknown {
    return JSON.parse(readFileSync(path, "utf8"));
}

function object(path: string): Record<string, unknown> {
    if (!existsSync(path)) {
        throw new Error(`Missing ${basename(path)} at package root: ${path}`);
    }

    const raw = readJson(path);

    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
        throw new Error(`${path}: expected an object`);
    }

    return raw as Record<string, unknown>;
}

export function readPackage(pkg: string): Mod {
    const manifest = object(join(pkg, "mod.json"));
    const metadata = object(join(pkg, "mod.meta.json"));

    if (typeof manifest.title !== "string" || !manifest.title.trim()) {
        throw new Error(`${pkg}/mod.json: missing title`);
    }

    for (const field of ["description", "license", "install", "settings"]) {
        if (field in manifest) {
            throw new Error(
                `${pkg}/mod.json: ${field} does not belong in the Herdr manifest`,
            );
        }
    }

    for (const field of ["description", "license"]) {
        if (typeof metadata[field] !== "string" || !metadata[field].trim()) {
            throw new Error(`${pkg}/mod.meta.json: missing ${field}`);
        }
    }

    for (const field of Object.keys(metadata)) {
        if (
            ![
                "description",
                "license",
                "install",
                "$schema",
                "$comment",
            ].includes(field)
        ) {
            throw new Error(
                `${pkg}/mod.meta.json: unknown field ${field}; Herdr fields belong in mod.json and settings in settings.json`,
            );
        }
    }

    if (
        "install" in metadata &&
        (!Array.isArray(metadata.install) ||
            !metadata.install.length ||
            metadata.install.some(
                (arg) =>
                    typeof arg !== "string" ||
                    !arg.trim() ||
                    arg.includes("\0"),
            ))
    ) {
        throw new Error(
            `${pkg}/mod.meta.json: install must be a nonempty array of nonempty strings`,
        );
    }

    return {
        id: basename(pkg),
        package: pkg,
        source: pkg,
        manifest: manifest as unknown as Manifest,
        metadata: metadata as unknown as Metadata,
    };
}
