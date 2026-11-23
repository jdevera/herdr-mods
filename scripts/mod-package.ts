import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

export interface Manifest {
    title: string;
    $comment?: string;
}

export interface Metadata {
    description: string;
    license: string;
    statusBar?: { api: 1; standalone: boolean };
    install?: string[];
    build?: {
        description: string;
        inputs: string[];
        outputs: string[];
        requires: string[];
    };
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

    for (const field of [
        "description",
        "license",
        "install",
        "settings",
        "statusBar",
    ]) {
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
                "statusBar",
                "install",
                "build",
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

    if (metadata.statusBar !== undefined) {
        const status = metadata.statusBar;

        if (
            status === null ||
            typeof status !== "object" ||
            Array.isArray(status) ||
            !Object.keys(status).every((key) =>
                ["api", "standalone"].includes(key),
            ) ||
            (status as Record<string, unknown>).api !== 1 ||
            typeof (status as Record<string, unknown>).standalone !== "boolean"
        ) {
            throw new Error(
                `${pkg}/mod.meta.json: statusBar requires api 1 and boolean standalone`,
            );
        }
    }

    if (metadata.build !== undefined) {
        const build = metadata.build as Metadata["build"];
        const relativePath = (path: unknown) =>
            typeof path === "string" &&
            !!path &&
            !path.startsWith("/") &&
            !path.includes("\\") &&
            !path.split("/").includes("..") &&
            !path.includes("\0");

        if (
            !build ||
            typeof build !== "object" ||
            !metadata.install ||
            typeof build.description !== "string" ||
            !build.description.trim() ||
            !Array.isArray(build.inputs) ||
            !build.inputs.length ||
            !build.inputs.every(relativePath) ||
            !Array.isArray(build.outputs) ||
            !build.outputs.length ||
            !build.outputs.every(
                (path) => relativePath(path) && !/[?*\[\]{}]/.test(path),
            ) ||
            !Array.isArray(build.requires) ||
            !build.requires.every(
                (name) =>
                    typeof name === "string" && /^[a-zA-Z0-9._+-]+$/.test(name),
            )
        ) {
            throw new Error(
                `${pkg}/mod.meta.json: invalid build description, paths, or requirements`,
            );
        }
    }

    return {
        id: basename(pkg),
        package: pkg,
        source: pkg,
        manifest: manifest as unknown as Manifest,
        metadata: metadata as unknown as Metadata,
    };
}
