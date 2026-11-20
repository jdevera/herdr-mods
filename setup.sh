#!/bin/sh
set -eu

source_dir=''
repo=''
branch=''
destination=''
bin_dir=''
yes=false
while [ "$#" -gt 0 ]; do
    case "$1" in
        --source|--repo|--branch|--destination|--bin-dir)
            [ "$#" -ge 2 ] || { printf 'Missing value for %s\n' "$1" >&2; exit 1; }
            case "$1" in
                --source) source_dir=$2 ;;
                --repo) repo=$2 ;;
                --branch) branch=$2 ;;
                --destination) destination=$2 ;;
                --bin-dir) bin_dir=$2 ;;
            esac
            shift 2 ;;
        --yes) yes=true; shift ;;
        --help|-h)
            printf '%s\n' 'Usage: sh setup.sh [--source CHECKOUT | --repo URL] [--branch BRANCH] [--destination DIR] [--bin-dir DIR] [--yes]' 'Reuses this checkout by default. --repo lets chezmoi clone into an isolated source directory.'
            exit 0 ;;
        *) printf 'Unknown option: %s\n' "$1" >&2; exit 1 ;;
    esac
done

[ -z "$source_dir" ] || [ -z "$repo" ] || { printf '%s\n' 'Use either --source or --repo.' >&2; exit 1; }
chezmoi_bin=${HERDR_MODS_CHEZMOI:-chezmoi}
missing=false
for tool in node npm git "$chezmoi_bin"; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        printf 'Missing: %s\n' "$tool" >&2
        missing=true
    fi
done
if command -v node >/dev/null 2>&1 && ! node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>24 || a===24&&b>=12 ? 0 : 1)'; then
    printf '%s\n' 'Node.js 24.12 or newer is required.' >&2
    missing=true
fi
if [ "$missing" = true ]; then
    if [ "$(uname -s)" = Darwin ]; then
        printf '%s\n' 'chezmoi: brew install chezmoi' 'mise, if missing: brew install mise' >&2
    else
        printf '%s\n' 'chezmoi: https://www.chezmoi.io/install/' 'mise: https://mise.jdx.dev/getting-started.html' >&2
    fi
    printf '%s\n' 'Node.js and npm: mise use --global node@24' 'Git, if missing: install it with your package manager.' 'Install the missing tools and rerun this command. Nothing has been installed.' >&2
    exit 1
fi

profile_dir=${HERDR_MODS_HOME:-${XDG_CONFIG_HOME:-$HOME/.config}/herdr-mods}
if [ -n "$repo" ]; then
    source_dir=${XDG_DATA_HOME:-$HOME/.local/share}/herdr-mods
    if [ -e "$source_dir/.git" ]; then
        [ "$(git -C "$source_dir" config --get remote.origin.url)" = "$repo" ] || { printf '%s\n' 'That source directory belongs to another repository. Use --source for an existing checkout.' >&2; exit 1; }
        printf 'Reusing checkout: %s\n' "$source_dir"
    else
        [ ! -e "$source_dir" ] || { printf 'Source already exists: %s\n' "$source_dir" >&2; exit 1; }
        temporary=$(mktemp -d)
        trap 'rm -rf "$temporary"' EXIT HUP INT TERM
        printf '{}\n' > "$temporary/chezmoi.json"
        printf 'Cloning with chezmoi into %s…\n' "$source_dir"
        mkdir -p "$(dirname "$source_dir")" "$profile_dir"
        set -- --config "$temporary/chezmoi.json" --source "$source_dir" --destination "${destination:-${HERDR_APP_HOME:-$HOME/.config/herdr-app}}" --cache "$profile_dir/cache" --persistent-state "$profile_dir/state.boltdb" init --config-path "$temporary/chezmoi.json" --guess-repo-url=false
        if [ -n "$branch" ]; then set -- "$@" --branch "$branch"; fi
        "$chezmoi_bin" "$@" -- "$repo"
    fi
elif [ -z "$source_dir" ]; then
    script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
    if [ -f "$script_dir/scripts/herdr-mods.ts" ]; then
        source_dir=$script_dir
    elif [ -f "$profile_dir/chezmoi.json" ]; then
        source_dir=$(node -e 'console.log(JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8")).sourceDir)' "$profile_dir/chezmoi.json")
    else
        printf '%s\n' 'Pass --repo URL to clone, or --source PATH to reuse a checkout.' >&2
        exit 1
    fi
fi
[ -f "$source_dir/scripts/herdr-mods.ts" ] || { printf 'Not a herdr-mods checkout: %s\n' "$source_dir" >&2; exit 1; }
set -- setup --source "$source_dir"
if [ -n "$destination" ]; then set -- "$@" --destination "$destination"; fi
if [ -n "$bin_dir" ]; then set -- "$@" --bin-dir "$bin_dir"; fi
if [ "$yes" = true ]; then set -- "$@" --yes; fi
node "$source_dir/scripts/herdr-mods.ts" "$@"
