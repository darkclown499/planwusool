#!/usr/bin/env bash
# =============================================================
# Wusool worktree bootstrap
#
# Makes a fresh git worktree able to run the canonical tests
# reliably, without manual archaeology.
#
# SOLVES the repeated failure mode where `vendor/` was junctioned
# to another checkout: Composer autoload then resolved
# App\ / Tests\ / Database\ against the PHYSICAL vendor location in
# the OLD worktree, producing dozens of confusing false failures.
#
# GUARANTEES
#   1. verifies this is a Wusool repo/worktree
#   2. works from the CURRENT checkout root (never an old one)
#   3. creates the required writable runtime storage dirs BEFORE
#      composer install (missing storage/framework/views breaks the
#      composer post-autoload-dump boot -> "Please provide a valid
#      cache path.")
#   4. installs a real WORKTREE-LOCAL vendor via `composer install`
#      (the Composer cache is reused safely; cross-checkout vendor
#      junctions are FORBIDDEN and reported)
#   5. installs a real WORKTREE-LOCAL node_modules unless
#      WUSOOL_SKIP_NPM=1
#   6. exposes no secrets (never reads or writes .env)
#   7. never touches production (no config:cache, no deploy, no .env)
#   8. fails loud with a clear message on every step
#
# SAFE TO RE-RUN at any time (idempotent).
#
# USAGE
#   bash scripts/setup-worktree.sh          # PHP + JS deps
#   WUSOOL_SKIP_NPM=1 bash scripts/setup-worktree.sh   # PHP only
#
# Environment overrides:
#   PHP=(${PHP:-php})                 COMPOSER=${COMPOSER:-composer}
#   NPM=${NPM:-npm}                   WUSOOL_SKIP_NPM=0|1
# =============================================================
set -euo pipefail

PHP="${PHP:-php}"
COMPOSER="${COMPOSER:-composer}"
NPM="${NPM:-npm}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail() {
    echo "FATAL: $*" >&2
    exit 1
}

echo "==> Wusool worktree bootstrap"
echo "    ROOT    : $ROOT"

# -------------------------------------------------------------
# 1) Verify this is a Wusool repo (worktree-safe marker check)
# -------------------------------------------------------------
[ -f "composer.json" ] || fail "composer.json missing in $ROOT (not a Wusool checkout?)"
[ -f "artisan" ] || fail "artisan missing in $ROOT (not a Laravel checkout?)"
[ -f "bootstrap/app.php" ] || fail "bootstrap/app.php missing in $ROOT"
[ -f "phpunit.xml" ] || fail "phpunit.xml missing in $ROOT (test bootstrap is the point of this script)"

# -------------------------------------------------------------
# 2) Determine the current root from git (authoritative)
# -------------------------------------------------------------
if command -v git >/dev/null 2>&1; then
    GIT_TOP="$(git -C "$ROOT" rev-parse --show-toplevel 2>/dev/null || true)"
    if [ -n "$GIT_TOP" ]; then
        GIT_TOP="$(cd "$GIT_TOP" && pwd)"
        if [ "$GIT_TOP" != "$ROOT" ]; then
            echo "    WARN   : git top-level is $GIT_TOP (different from $ROOT). Using $ROOT."
        else
            echo "    GIT TOP: $ROOT"
        fi
    fi
fi

# -------------------------------------------------------------
# 3) Reject a pre-existing cross-checkout vendor junction
# -------------------------------------------------------------
if [ -d "vendor" ] && [ -L "vendor" ]; then
    fail "vendor/ is a symlink/junction. A worktree-local vendor is REQUIRED (cross-checkout vendor junctions are the root cause of false test failures). Remove the link and re-run."
fi
if [ -f "vendor/autoload.php" ] && [ ! -f "vendor/composer/autoload_psr4.php" ]; then
    fail "vendor/ exists but is broken (no vendor/composer/autoload_psr4.php). Delete it and re-run; the script installs a clean worktree-local vendor."
fi

# -------------------------------------------------------------
# 4) Prepare writable runtime storage dirs (BEFORE composer, the
#    composer post-autoload-dump runs `artisan package:discover`,
#    whose boot breaks without storage/framework/views)
# -------------------------------------------------------------
mkdir -p \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/framework/testing \
    storage/logs \
    bootstrap/cache

echo "    STORAGE : runtime dirs ensured (storage/framework/{cache,sessions,views,testing}, storage/logs, bootstrap/cache)"
echo "    STORAGE : '.env' is NEVER touched by this script (tests use phpunit.xml + .env.testing)"

# -------------------------------------------------------------
# 5) Composer (real worktree-local vendor; cache reused safely)
# -------------------------------------------------------------
command -v "$COMPOSER" >/dev/null 2>&1 || fail "composer not found (override with COMPOSER=/path/to/composer)"
command -v "$PHP" >/dev/null 2>&1 || fail "php not found (override with PHP=/path/to/php)"

if [ -f composer.lock ]; then
    echo "    PHP     : composer install (worktree-local vendor, composer cache) ..."
    "$COMPOSER" install --no-interaction --prefer-dist
else
    echo "    PHP     : no composer.lock; running composer update ..."
    "$COMPOSER" update --no-interaction
fi

echo "    PHP     : autoload regenerated + package:discover OK (worktree-local)"

# -------------------------------------------------------------
# 6) Node (real worktree-local node_modules; never shared)
# -------------------------------------------------------------
if [ -f "package.json" ] && [ "${WUSOOL_SKIP_NPM:-0}" != "1" ]; then
    if command -v "$NPM" >/dev/null 2>&1; then
        echo "    JS      : npm install (worktree-local node_modules, npm cache) ..."
        "$NPM" install
        echo "    JS      : node_modules ready"
    else
        echo "    WARN    : npm not found (override with NPM=/path/to/npm); skipping JS deps"
    fi
elif [ -f "package.json" ] && [ "${WUSOOL_SKIP_NPM:-0}" = "1" ]; then
    echo "    JS      : skipped (WUSOOL_SKIP_NPM=1)"
else
    echo "    JS      : no package.json, nothing to install"
fi

# -------------------------------------------------------------
# 7) Vite manifest guidance
# -------------------------------------------------------------
if [ -f "public/build/manifest.json" ]; then
    echo "    MANIFEST: public/build/manifest.json present"
else
    echo "    MANIFEST: public/build/manifest.json MISSING - full-page/SSR tests need a real build:"
    echo "              npm run build   (after npm install). This script never fakes it."
fi

# -------------------------------------------------------------
# 8) Done
# -------------------------------------------------------------
echo "==> Bootstrap complete. Verify with:  php scripts/worktree-preflight.php"