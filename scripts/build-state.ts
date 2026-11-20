import { createHash } from "node:crypto";
import {
    existsSync,
    globSync,
    mkdirSync,
    readFileSync,
    statSync,
    writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

export function fingerprint(
    root: string,
    patterns: string[],
    salt = "",
): string {
    const hash = createHash("sha256").update(salt);
    const paths = [
        ...new Set(
            patterns.flatMap((pattern) => globSync(pattern, { cwd: root })),
        ),
    ].sort();

    for (const path of paths) {
        if (statSync(join(root, path)).isFile()) {
            hash.update(path)
                .update("\0")
                .update(readFileSync(join(root, path)))
                .update("\0");
        }
    }

    return hash.digest("hex");
}

export function current(
    stamp: string,
    digest: string,
    outputs: string[],
): boolean {
    return (
        outputs.length > 0 &&
        outputs.every((path) => existsSync(path) && statSync(path).isFile()) &&
        existsSync(stamp) &&
        readFileSync(stamp, "utf8") === digest
    );
}

export function record(stamp: string, digest: string): void {
    mkdirSync(dirname(stamp), { recursive: true });
    writeFileSync(stamp, digest);
}
