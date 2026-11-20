import { accessSync, constants } from "node:fs";
import { delimiter, join } from "node:path";
import { spawnSync } from "node:child_process";

export function available(command: string): boolean {
    const candidates = command.includes("/")
        ? [command]
        : (process.env.PATH ?? "")
              .split(delimiter)
              .map((dir) => join(dir, command));

    return candidates.some((path) => {
        try {
            accessSync(path, constants.X_OK);

            return true;
        } catch {
            return false;
        }
    });
}

export function requireTools(commands: string[]): void {
    const missing = [...new Set(commands)].filter(
        (command) => !available(command),
    );

    const hints = missing.map((command) => {
        if (command === "node") {
            return "Node.js 24.12+: mise use --global node@24";
        }

        if (command === "npm") {
            return "npm: install Node.js with mise use --global node@24";
        }

        if (command === "go") {
            return "Go: mise use --global go@latest";
        }

        if (command.includes("chezmoi")) {
            return process.platform === "darwin"
                ? "chezmoi: brew install chezmoi"
                : "chezmoi: https://www.chezmoi.io/install/";
        }

        return `${command}: ${process.platform === "darwin" ? `brew install ${command}` : `install ${command} with your package manager`}`;
    });

    if (available("node")) {
        const result = spawnSync("node", ["-p", "process.versions.node"], {
            encoding: "utf8",
        });

        const [major, minor] = result.stdout.trim().split(".").map(Number);

        if (
            result.status !== 0 ||
            !major ||
            major < 24 ||
            (major === 24 && minor < 12)
        ) {
            hints.push("Node.js 24.12+ required: mise use --global node@24");
        }
    }

    if (hints.length) {
        throw new Error(
            `Prerequisites missing or outdated:\n${hints.map((hint) => `  ${hint}`).join("\n")}\n${process.platform === "darwin" ? "If mise is missing: brew install mise" : "Install mise: https://mise.jdx.dev/getting-started.html"}\nInstall them, then rerun setup. No mods have been applied.`,
        );
    }
}
