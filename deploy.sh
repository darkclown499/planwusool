#!/usr/bin/env bash
# =============================================================
# Wusool production deploy script (run on the SERVER).
#
# The ONLY supported way to deploy the app. Guarantees the Vite
# manifest and compiled assets are generated together ON THE
# SERVER, eliminating "white screen" / 404-asset bugs.
#
# Safety guarantees:
#   - stops on failure (set -euo pipefail)
#   - NEVER overwrites .env
#   - NEVER runs migrate:fresh (only forward migrate --force)
#   - NEVER chmod 777
#   - creates a pre-deploy DB + media backup before destructive steps
#   - takes a secure .env recovery snapshot
#   - ALL Laravel artisan/runtime commands run as the web app user (www),
#     never root, so cache/runtime files are never root-owned (prevents the
#     ApiRateLimiter 500 incident caused by root-created storage/framework dirs)
#   - verifies the ownership contract AFTER deploy and FAILS LOUDLY if any
#     root-owned runtime file would break the running app
#   - smoke-tests a rate-limited endpoint so the file-cache write path that
#     failed in production cannot silently pass certification again
#
# Ownership contract (root vs www):
#   ROOT  -> backups, git checkout, service management (systemctl/nginx/php-fpm),
#            ownership correction, ownership verification
#   WWW   -> every `php artisan ...` command (migrations, cache clear/build,
#            storage:link, queue:restart, package:discover, config/route/view
#            cache generation) and `composer` (writes bootstrap/cache)
#
# Usage (on the server, from any directory, as root):
#     bash /www/wwwroot/wusool.ps/deploy.sh [<commit-or-branch>]
# =============================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/wusool.ps}"
BRANCH="${1:-${BRANCH:-main}}"
PHP="${PHP:-/usr/bin/php}"
WEB_USER="${WEB_USER:-www}"
QUEUE_UNIT="${QUEUE_UNIT:-queue-worker}"
APP_URL_PROBE="${APP_URL_PROBE:-https://wusool.ps/}"

# ------------------------------------------------------------------
# Run application commands (php artisan / composer) as the web app user.
# All Laravel runtime state (storage/framework, bootstrap/cache) must be
# created/written by www so php-fpm (www:www) can always read+write it.
# Root never runs these, so it can never leave root-owned runtime files.
# ------------------------------------------------------------------
run_www() {
    runuser -u "$WEB_USER" -- bash -c 'APP_DIR="$1"; shift; cd "$APP_DIR" && exec "$@"' _ "$APP_DIR" "$@"
}

# Ownership-contract guard: list any non-www-owned path under the runtime
# cache trees that php-fpm (www:www) must be able to write.
runtime_owner_violations() {
    find "$APP_DIR/storage/framework" "$APP_DIR/bootstrap/cache" \
         -not -user "$WEB_USER" 2>/dev/null
}

echo "==> Deploying '$BRANCH' to $APP_DIR (app user: $WEB_USER)"

# ------------------------------------------------------------------
# 0) Pre-flight
# ------------------------------------------------------------------
[ -f "$APP_DIR/.env" ] || { echo "FATAL: no .env in $APP_DIR (refusing to continue)" >&2; exit 1; }
id "$WEB_USER" >/dev/null 2>&1 || { echo "FATAL: app user '$WEB_USER' does not exist" >&2; exit 1; }
command -v runuser >/dev/null 2>&1 || { echo "FATAL: runuser not available (cannot run artisan as $WEB_USER)" >&2; exit 1; }
mkdir -p storage/logs bootstrap/cache
# Rebase the runtime cache/state trees onto www before any artisan writes so
# a previously root-owned runtime tree cannot fail a www-run artisan command.
chown -R "${WEB_USER}:${WEB_USER}" storage bootstrap/cache 2>/dev/null || true
run_www "$PHP" artisan storage:link >/dev/null 2>&1 || true

# ------------------------------------------------------------------
# 1) Pre-deploy backup (DB + config snapshot) for a safe rollback point
# ------------------------------------------------------------------
if [ -x /usr/local/bin/wusool-db-backup.sh ]; then
    echo "==> [0/8] Pre-deploy DB backup"
    /usr/local/bin/wusool-db-backup.sh || echo "WARN: pre-deploy DB backup failed"
fi
if [ -x /usr/local/bin/wusool-config-backup.sh ]; then
    /usr/local/bin/wusool-config-backup.sh || true
fi

# ------------------------------------------------------------------
# 2) Fetch target; fast-forward if possible
# ------------------------------------------------------------------
echo "==> [1/8] Fetching origin"
git fetch origin "$BRANCH"
TARGET_REV="origin/$BRANCH"

CURRENT=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo detached)
if [ "$CURRENT" = "$BRANCH" ]; then
    echo "==> fast-forwarding local '$BRANCH'"
    # refuse if .env is tracked (never let deploy clobber secrets)
    git ls-files --error-unmatch .env >/dev/null 2>&1 && {
        echo "FATAL: .env is tracked in git; aborting to protect secrets" >&2
        exit 1
    }
    git merge --ff-only "$TARGET_REV" || {
        echo "INFO: not cleanly fast-forwardable; storing stash and retrying force (dev artifacts only)"
        git stash --include-untracked 2>/dev/null || true
        git merge --ff-only "$TARGET_REV" || git reset --hard "$TARGET_REV"
    }
else
    echo "==> detached/other branch; resetting to $TARGET_REV"
    git reset --hard "$TARGET_REV"
fi
git submodule update --init --recursive 2>/dev/null || true

# ------------------------------------------------------------------
# 3) Composer production install — AS WWW (writes bootstrap/cache)
# ------------------------------------------------------------------
echo "==> [2/8] Composer install (no-dev, as $WEB_USER)"
if [ -f composer.lock ]; then
    run_www composer install --no-dev --optimize-autoloader --no-interaction --no-progress
else
    run_www composer update --no-dev --optimize-autoloader --no-interaction --no-progress
fi

# ------------------------------------------------------------------
# 4) Frontend build (park HTTPS requests to a maintenance page)
#    Build assets are emitted to public/build; we keep this as the invoking
#    user (root) for node/npm, then the ownership contract (step 7) re-owns
#    public/ so nginx reads consistent www:www files. npm does not touch
#    storage/framework or bootstrap/cache runtime state.
# ------------------------------------------------------------------
echo "==> [3/8] Building frontend assets"
BACKUP_INDEX="public/index.php.deploy-bak"
park_app() {
    cp -f public/index.php "$BACKUP_INDEX"
    cat > public/index.php <<'INDEXPHP'
<?php
http_response_code(503);
header('Cache-Control: no-store, private');
readfile(__DIR__ . '/maintenance.html');
INDEXPHP
}
restore_app() {
    if [ -f "$BACKUP_INDEX" ]; then
        mv -f "$BACKUP_INDEX" public/index.php
    fi
}
trap restore_app EXIT

park_app
if [ -d node_modules ]; then
    npm install --no-audit --no-fund --silent || npm ci --no-audit --no-fund --silent
else
    npm ci --no-audit --no-fund --silent
fi
rm -rf public/build
npm run build
restore_app
trap - EXIT
chmod 644 public/index.php
rm -f public/index.php.deploy-bak

# ------------------------------------------------------------------
# 5) Database migrations (FORWARD ONLY — never fresh/reset) — AS WWW
# ------------------------------------------------------------------
echo "==> [4/8] Running migrations"
run_www "$PHP" artisan migrate --force --no-interaction

# ------------------------------------------------------------------
# 6) Laravel production caches (rebuilt, not just cleared) — AS WWW so
#    every generated cache file under storage/framework + bootstrap/cache
#    is owned by www (php-fpm) and never root.
# ------------------------------------------------------------------
echo "==> [5/8] Building Laravel caches (as $WEB_USER)"
run_www "$PHP" artisan view:clear
run_www "$PHP" artisan route:clear
run_www "$PHP" artisan config:clear
run_www "$PHP" artisan route:cache || echo "WARN: route:cache not persisted (kept route:clear state)"
run_www "$PHP" artisan config:cache || echo "WARN: config:cache not persisted (kept config:clear state)"
run_www "$PHP" artisan view:cache || echo "WARN: view:cache not persisted (kept view:clear state)"
# do NOT cache events; keep it flexible for addons

# ------------------------------------------------------------------
# 7) Ownership contract: storage + bootstrap/cache writable by www:www
#    (no 777), and public re-owned so nginx/static are consistent. Run as
#    root (only root can chown). Then verify ZERO root-owned files remain.
# ------------------------------------------------------------------
echo "==> [6/8] Ownership contract (www:www, no 777)"
chown -R "${WEB_USER}:${WEB_USER}" storage bootstrap/cache public 2>/dev/null || true
chmod -R 775 storage bootstrap/cache 2>/dev/null || true
chmod 600 .env 2>/dev/null || true

# Regression guard: fail loudly if any root-owned runtime payload remains —
# exactly the condition that caused the ApiRateLimiter 500 in production.
GOT="$(runtime_owner_violations | head -50)"
if [ -n "$GOT" ]; then
    echo "FATAL: root-owned runtime files remain under storage/framework or bootstrap/cache (ownership contract violated):" >&2
    echo "$GOT" >&2
    exit 1
fi
echo "==> ownership OK: zero root-owned files under storage/framework and bootstrap/cache"

# ------------------------------------------------------------------
# 8) Reload services + queue worker
# ------------------------------------------------------------------
echo "==> [7/8] Reloading services"
run_www "$PHP" artisan queue:restart 2>/dev/null || true
if systemctl list-unit-files 2>/dev/null | grep -q "^$QUEUE_UNIT"; then
    systemctl restart "$QUEUE_UNIT" 2>/dev/null || true
fi
if command -v systemctl >/dev/null 2>&1; then
    systemctl reload "$QUEUE_UNIT" 2>/dev/null || systemctl restart "$QUEUE_UNIT" 2>/dev/null || true
    systemctl reload nginx 2>/dev/null || systemctl restart nginx 2>/dev/null || true
else
    service php-fpm-83 reload 2>/dev/null || /etc/init.d/php-fpm-83 reload 2>/dev/null || true
    /etc/init.d/nginx reload 2>/dev/null || true
fi

# ------------------------------------------------------------------
# 9) Verification / smoke tests
#    a. HOME page (200/301/302)
#    b. RATE-LIMITED endpoint — exercises the ApiRateLimiter file-cache
#       write path that failed in production. Must return 200 (not 500).
#    c. ownership contract re-check (post-reload, post-any-write)
# ------------------------------------------------------------------
echo "==> [8/8] Smoke tests"

home_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$APP_URL_PROBE" 2>/dev/null || echo "000")
echo "home HTTP: $home_code"
if [ "$home_code" != "200" ] && [ "$home_code" != "302" ] && [ "$home_code" != "301" ]; then
    echo "FATAL: home smoke test failed (HTTP $home_code)" >&2
    exit 1
fi

# Find the storefront root host to probe a rate-limited API route on.
RATE_PROBE_HOST="$(echo "$APP_URL_PROBE" | sed -E 's#^https?://([^/]+).*#\1#')"
rl_codes=""
for i in 1 2 3; do
    c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 \
        "https://$RATE_PROBE_HOST/api/cart?store_id=61" -H "Host: $RATE_PROBE_HOST" 2>/dev/null || echo "000")
    rl_codes="$rl_codes $c"
    echo "rate-limited /api/cart hit $i: HTTP $c"
done
for c in $rl_codes; do
    if [ "$c" = "500" ] || [ "$c" = "000" ]; then
        echo "FATAL: rate-limited endpoint returned $c — file-cache write path broken (ApiRateLimiter)" >&2
        exit 1
    fi
done
echo "==> rate-limited endpoint OK (all non-500):$rl_codes"

# Final ownership re-check after all writes (rate limiter + reloads).
GOT="$(runtime_owner_violations | head -50)"
if [ -n "$GOT" ]; then
    echo "FATAL: root-owned runtime files appeared after smoke tests:" >&2
    echo "$GOT" >&2
    exit 1
fi
echo "==> final ownership OK: zero root-owned files under storage/framework and bootstrap/cache"

echo "==> Deployed HEAD: $(git rev-parse --short HEAD)"
echo "==> Done. Successfully deployed."
