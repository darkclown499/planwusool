#!/usr/bin/env bash
# Fast Wusool worktree environment preflight (wrapper).
# Usage: bash scripts/worktree-preflight.sh
set -euo pipefail

PHP="${PHP:-php}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

command -v "$PHP" >/dev/null 2>&1 || { echo "FATAL: php not found (override with PHP=/path/to/php)" >&2; exit 1; }

exec "$PHP" "$ROOT/scripts/worktree-preflight.php"