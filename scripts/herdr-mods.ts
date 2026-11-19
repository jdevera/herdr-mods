import { main } from "./profile.ts";

main(process.argv.slice(2)).then(
    (code) => {
        process.exitCode = code;
    },
    (error: unknown) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    },
);
