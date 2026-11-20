import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PROJECT, discover, isMain } from "./mods.ts";

import { format } from "prettier";

const START = "<!-- mods:start -->";
const END = "<!-- mods:end -->";

export async function generate(root = PROJECT): Promise<boolean> {
    const path = join(root, "README.md");
    const before = readFileSync(path, "utf8");

    if (
        before.split(START).length !== 2 ||
        before.split(END).length !== 2 ||
        before.indexOf(START) > before.indexOf(END)
    ) {
        throw new Error(
            "README.md needs exactly one ordered pair of mod table markers",
        );
    }

    const escape = (text: string) =>
        text.replaceAll("|", "\\|").replaceAll("\n", " ");

    const rows = ["| Mod | Description | License |", "| --- | --- | --- |"];

    for (const { id, manifest: m, metadata } of discover(root)) {
        rows.push(
            `| [${escape(m.title)}](mods/${id}/) | ${escape(metadata.description)} | ${escape(metadata.license)} |`,
        );
    }

    const after =
        before.slice(0, before.indexOf(START) + START.length) +
        "\n\n" +
        (await format(rows.join("\n"), { parser: "markdown" })) +
        "\n" +
        before.slice(before.indexOf(END));

    if (before === after) {
        return false;
    }

    writeFileSync(path, after);

    return true;
}

if (isMain(import.meta.url) && (await generate())) {
    console.log("Updated README.md; stage it and retry the commit.");
    process.exitCode = 1;
}
