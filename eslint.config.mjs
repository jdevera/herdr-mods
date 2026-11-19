import tseslint from "typescript-eslint";
export default tseslint.config(
    { ignores: ["mods/**/*.js", "mods/**/tests/**", "node_modules/**"] },
    ...tseslint.configs.recommended,
    {
        files: ["**/*.ts"],
        rules: {
            curly: ["error", "all"],
            "padding-line-between-statements": [
                "error",
                { blankLine: "always", prev: ["const", "let"], next: "*" },
                {
                    blankLine: "any",
                    prev: ["const", "let"],
                    next: ["const", "let"],
                },
                {
                    blankLine: "always",
                    prev: "*",
                    next: [
                        "return",
                        "throw",
                        "export",
                        "function",
                        "class",
                        "block-like",
                    ],
                },
                {
                    blankLine: "always",
                    prev: [
                        "export",
                        "block-like",
                        "multiline-const",
                        "multiline-let",
                    ],
                    next: "*",
                },
            ],
            "no-multiple-empty-lines": [
                "error",
                { max: 1, maxEOF: 0, maxBOF: 0 },
            ],
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_" },
            ],
        },
    },
);
