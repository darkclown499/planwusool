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
# 2.5) Ownership self-heal AFTER git but BEFORE Composer
# ------------------------------------------------------------------
# The git update above runs as ROOT. Any file tracked in the repo under
# vendor/ (previously vendor was committed, e.g. composer/installed.json,
# autoload.php) is restored root-owned by reset/merge, and Composer runs as
# $WEB_USER — so it cannot replace/delete those files and fails with
# "Permission denied" / "Could not delete vendor/...". Re-owning vendor to the
# app user here makes every deploy self-healing and independent of manual
# chown, and matches the ordering contract: git update -> correct ownership ->
# Composer as app user. Composer install --no-dev no longer fights the tree.
chown -R "${WEB_USER}:${WEB_USER}" vendor 2>/dev/null || true

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
# 4) Frontend build � ATOMIC STAGING (fixes rm -rf public/build incident)
#    Previous incident: `rm -rf public/build; npm run build` + SSH
#    disconnect/build failure left production with NO assets (white screen).
#    New guarantee: live public/build is NEVER deleted before the new
#    build is fully verified. Build goes to public/build.next, is
#    verified (manifest + assets + valid JSON), then atomically swapped
#    via mv (inode rename). Failed build leaves live assets untouched.
#    Previous build is preserved as public/build.prev.<ts> for instant
#    rollback. Park (503) is held only for the integer-ms swap window.
# ------------------------------------------------------------------
echo "==> [3/8] Building frontend assets (atomic staging)"
BACKUP_INDEX="public/index.php.deploy-bak"
BUILD_DIR="build"
STAGE_DIR="build.next"
PREV_PREFIX="build.prev"
ORIG_PREFIX="build.orig"
LIVE_BUILD="public/${BUILD_DIR}"
STAGE_BUILD="public/${STAGE_DIR}"
PREV_BUILD=""
ORIG_BUILD=""
cleanup_prev_builds() {
    # Retain last 3 prev builds for rollback; older ones are removed.
    ls -dt public/${PREV_PREFIX}.* 2>/dev/null | tail -n +4 | xargs -r rm -rf 2>/dev/null || true
}
cleanup_orig_builds() {
    # Retain last 3 ORIGINAL builds (pristine, not polluted with inherited compat assets).
    # Used to rebuild the compatibility union bounded to last 3 deploys.
    ls -dt public/${ORIG_PREFIX}.* 2>/dev/null | tail -n +4 | xargs -r rm -rf 2>/dev/null || true
}
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
verify_staging() {
    local manifest="$STAGE_BUILD/manifest.json"
    if [ ! -f "$manifest" ]; then
        echo "FATAL: Vite manifest missing in staging build ($manifest)" >&2
        return 1
    fi
    "$PHP" -r "json_decode(file_get_contents('$manifest')); if (json_last_error()!==0) exit(1);" 2>/dev/null || {
        echo "FATAL: staging manifest is not valid JSON ($manifest)" >&2
        return 1
    }
    local assets_dir="$STAGE_BUILD/assets"
    if [ ! -d "$assets_dir" ] || ! ls "$assets_dir"/*.js >/dev/null 2>&1; then
        echo "FATAL: No JS assets in staging build ($assets_dir)" >&2
        return 1
    fi
    if [ -f "public/hot" ]; then
        echo "FATAL: Vite hot file exists - dev server leak, refusing to deploy" >&2
        return 1
    fi
    # Every `file` referenced by the staging manifest must physically exist.
    # A manifest that points at missing hashed chunks is exactly the "white
    # screen" regression this script exists to prevent.
    local missing=0 pfile
    while IFS= read -r pfile; do
        [ -z "$pfile" ] && continue
        if [ ! -f "$STAGE_BUILD/$pfile" ]; then
            echo "FATAL: manifest entry '$pfile' missing in staging build" >&2
            missing=1
        fi
    done < <("$PHP" -r '$m=json_decode(file_get_contents($argv[1]), true); foreach ($m as $e) { if (isset($e["file"])) echo $e["file"], PHP_EOL; }' -- "$manifest" 2>/dev/null)
    [ "$missing" -ne 0 ] && return 1
    return 0
}
trap restore_app EXIT

# npm install (does NOT touch public/build)
if [ -d node_modules ]; then
    npm install --no-audit --no-fund --silent || npm ci --no-audit --no-fund --silent
else
    npm ci --no-audit --no-fund --silent
fi

# ensure clean staging dir
rm -rf "$STAGE_BUILD"

# build to STAGING � live assets remain untouched during the whole compile
echo "==> building to staging: $STAGE_BUILD (live $LIVE_BUILD untouched)"
if ! VITE_BUILD_DIR="$STAGE_DIR" npm run build; then
    echo "FATAL: Vite build failed - live assets untouched at $LIVE_BUILD" >&2
    rm -rf "$STAGE_BUILD"
    restore_app
    trap - EXIT
    chmod 644 public/index.php 2>/dev/null || true
    rm -f public/index.php.deploy-bak
    exit 1
fi

# verify staging BEFORE any live mutation
if ! verify_staging; then
    echo "FATAL: staging verification failed - live assets untouched, aborting swap" >&2
    rm -rf "$STAGE_BUILD"
    restore_app
    trap - EXIT
    exit 1
fi

# Preserve ORIGINAL build (pristine, before compatibility pollution) for bounded retention.
# This is the correct source for copy-forward; live PREV builds become polluted
# after we copy compat assets into them, so they would propagate forever if used
# as sources. ORIG builds are never polluted and have correct original mtimes.
if [ -d "$STAGE_BUILD" ]; then
    ORIG_BUILD="public/${ORIG_PREFIX}.$(date +%s)"
    echo "==> preserving original build snapshot: $STAGE_BUILD -> $ORIG_BUILD"
    cp -a "$STAGE_BUILD" "$ORIG_BUILD" 2>/dev/null || {
        echo "WARN: failed to create orig snapshot $ORIG_BUILD (continuing)" >&2
        ORIG_BUILD=""
    }
    if [ -n "$ORIG_BUILD" ] && [ -d "$ORIG_BUILD" ]; then
        chown -R "${WEB_USER}:${WEB_USER}" "$ORIG_BUILD" 2>/dev/null || true
        cleanup_orig_builds
    fi
fi

# park only for the atomic swap window (milliseconds)
park_app

# preserve current live as rollback artifact (timestamped) before swap
if [ -d "$LIVE_BUILD" ]; then
    PREV_BUILD="public/${PREV_PREFIX}.$(date +%s)"
    echo "==> preserving previous build: $LIVE_BUILD -> $PREV_BUILD"
    mv "$LIVE_BUILD" "$PREV_BUILD" || {
        echo "FATAL: failed to preserve previous build" >&2
        restore_app; trap - EXIT; exit 1
    }
    cleanup_prev_builds
fi

# atomic rename: staging becomes live (same filesystem -> inode rename, no partial state)
if ! mv "$STAGE_BUILD" "$LIVE_BUILD"; then
    echo "FATAL: atomic swap failed ($STAGE_BUILD -> $LIVE_BUILD)" >&2
    if [ -n "$PREV_BUILD" ] && [ -d "$PREV_BUILD" ]; then
        mv "$PREV_BUILD" "$LIVE_BUILD" 2>/dev/null || true
        echo "==> rolled back to $PREV_BUILD" >&2
    fi
    restore_app; trap - EXIT; exit 1
fi

echo "==> atomic swap OK: $STAGE_BUILD -> $LIVE_BUILD (previous: ${PREV_BUILD:-none})"

# --- P0 FIX: bounded old hashed asset survival (copy-forward from ORIG only) ---
# Previous bug: old HTML held hashed filenames like app-AbC123.js that were deleted
# from public/build after swap, causing 404 for open tabs until reload.
# Vite hashes are content-addressed: same filename == same content, so missing files
# from earlier builds can be safely copied into the new build without overwriting.
# BOUNDED: we rebuild the compatibility union ONLY from retained ORIGINAL builds
# (public/build.orig.*), not from polluted live PREV builds. This prevents unbounded
# propagation A->B->C->D where A would live forever via recursive inheritance.
# Retention: last 3 ORIG builds (~3 deploys) + never overwrite current manifest assets.
if [ -d "$LIVE_BUILD/assets" ]; then
    echo "==> preserving old hashed assets for open tabs (bounded copy-forward from ORIG)"
    COPIED=0
    # Prune candidate ORIG builds to last 3 (already cleaned) and copy missing files
    for orig in $(ls -dt public/${ORIG_PREFIX}.* 2>/dev/null | head -n 3); do
        [ -d "$orig/assets" ] || continue
        # Skip the ORIG we just created for CURRENT build (would be duplicate)
        [ "$orig" = "$ORIG_BUILD" ] && continue
        for f in "$orig/assets"/*; do
            [ -f "$f" ] || continue
            base="$(basename "$f")"
            # Never overwrite current hashed assets (same name == same content, but current wins)
            if [ ! -e "$LIVE_BUILD/assets/$base" ]; then
                # Do not rely on mtime of copied files; ORIG retains original build time.
                cp -n "$f" "$LIVE_BUILD/assets/$base" 2>/dev/null && COPIED=$((COPIED+1)) || true
            fi
        done
    done
    echo "==> bounded copy-forward done: $COPIED compat files from retained ORIG builds"
    # Safety: ensure we never deleted a file that the current manifest actually needs
    # (above loop only adds missing files, never deletes current).
fi

restore_app
trap - EXIT
chmod 644 public/index.php
rm -f public/index.php.deploy-bak
# correct ownership immediately after root-owned mv so nginx/php-fpm can serve
chown -R "${WEB_USER}:${WEB_USER}" "$LIVE_BUILD" 2>/dev/null || true
echo "==> frontend assets deployed atomically; failed build would have left $LIVE_BUILD untouched"

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

# Origin boot check: HTTP-200 is NOT enough. With display_errors on a broken
# autoload/vendor, PHP returns HTTP 200 while emitting a raw Fatal error, so the
# home smoke above would silently pass on a down app. Probe the origin (bypassing
# Cloudflare cache) and fail if the body is a PHP fatal or is empty/thin.
ORIGIN_PROBE="http://127.0.0.1/"
BOOT_HOST="$(echo "$APP_URL_PROBE" | sed -E 's#^https?://([^/]+).*#\1#')"
BOOT_BODY="$(curl -s --max-time 20 "$ORIGIN_PROBE" -H "Host: $BOOT_HOST" 2>/dev/null || true)"
if printf '%s' "$BOOT_BODY" | grep -qE 'Fatal error|Failed opening required|allowed memory size' || [ "${#BOOT_BODY}" -lt 500 ]; then
    echo "FATAL: origin boot check failed — PHP fatal or thin/empty body on / (app not booting) despite HTTP 200" >&2
    exit 1
fi
echo "==> origin boot check OK (body size ${#BOOT_BODY} bytes, no PHP fatal)"

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

# ------------------------------------------------------------------
# d. MANIFEST-DRIVEN PUBLIC ASSET VERIFICATION (with CF-edge classification)
#    Reads the LIVE manifest's critical entries and probes each asset TWICE:
#      1) at the ORIGIN (127.0.0.1 + Host header) — authoritative app/static state
#      2) over PUBLIC HTTPS (through Cloudflare) — edge-serving state
#    Outcome classification:
#      - origin 5xx / 404 / HTML-for-JS / empty body  -> DEPLOY FAILURE (real bug)
#      - origin healthy but PUBLIC 5xx/520-527/000     -> CDN EDGE FAILURE
#        (the 522-transient family that has hit production; NOT a code bug)
#    Either class FAILS the deploy loudly — the operator must know assets can
#    be broken at the edge even when origin is green. Bounded retries (x3) ride
#    out the flaky CW/CF connection losses seen in production.
# ------------------------------------------------------------------
echo "==> [8/8d] Verifying public build assets (manifest-driven, origin + CF edge)"
ASSET_HOST="$(echo "$APP_URL_PROBE" | sed -E 's#^https?://([^/?]+).*#\1#')"
FAILED_ASSETS=()
while IFS= read -r name; do
    [ -z "$name" ] || [ "$name" = "." ] && continue
    if [ "$name" = "manifest.json" ]; then
        rel="build/manifest.json"
    else
        rel="build/assets/$name"
    fi
    origin_ok=0; ocode=000; otype=""; asize=0
    for t in 1 2 3; do
        probe=$(curl -s -o /dev/null -w '%{http_code} %{content_type} %{size_download}' --max-time 20 -H "Host: $ASSET_HOST" "http://127.0.0.1/$rel" 2>/dev/null || true)
        ocode=$(echo "$probe" | cut -d' ' -f1); otype=$(echo "$probe" | cut -d' ' -f2); asize=$(echo "$probe" | cut -d' ' -f3)
        if [ "$ocode" = "200" ] && [ "$asize" -gt 0 ] && ! echo "$otype" | grep -qE '^text/html'; then
            origin_ok=1; break
        fi
        sleep 2
    done
    if [ "$origin_ok" -ne 1 ]; then
        echo "FATAL: '$rel' BROKEN AT ORIGIN (HTTP $ocode, type $otype, ${asize}b) -> DEPLOY FAILURE" >&2
        FAILED_ASSETS+=("$rel:ORIGIN_FAILURE")
        continue
    fi
    echo "==> '$rel' healthy at origin (HTTP $ocode, $otype, ${asize}b)"
    pub_ok=0; pcode=000; psize=0
    for t in 1 2 3; do
        pub=$(curl -s -o /dev/null -w '%{http_code} %{size_download}' --max-time 30 "https://$ASSET_HOST/$rel" 2>/dev/null || true)
        pcode=$(echo "$pub" | cut -d' ' -f1); psize=$(echo "$pub" | cut -d' ' -f3)
        if [ "$pcode" = "200" ] && [ "$psize" -gt 0 ]; then
            pub_ok=1; break
        fi
        sleep 3
    done
    if [ "$pub_ok" -ne 1 ]; then
        echo "FATAL: '$rel' unreachable at Cloudflare edge (public HTTP $pcode) while ORIGIN healthy -> CDN EDGE FAILURE" >&2
        FAILED_ASSETS+=("$rel:CDN_EDGE_FAILURE")
    else
        echo "==> '$rel' served publicly OK (HTTP $pcode, ${psize}b)"
    fi
done < <(run_www "$PHP" -r '$m=json_decode(file_get_contents($argv[1]), true); echo "manifest.json", PHP_EOL; foreach ($m as $e) { if (isset($e["file"])) echo basename($e["file"]), PHP_EOL; }' -- "public/build/manifest.json")
if [ "${#FAILED_ASSETS[@]}" -ne 0 ]; then
    echo "FATAL: build asset verification failed (${FAILED_ASSETS[*]})" >&2
    exit 1
fi
echo "==> verify_public_assets OK: all manifest assets healthy at origin AND through public HTTPS"

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
