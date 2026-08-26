#!/usr/bin/env bash
# ==============================================================
# Wusool production deploy script (run on the SERVER).
#
# This is the ONLY supported way to deploy the app. It guarantees
# the Vite manifest and the compiled assets are always generated
# together ON THE SERVER, which eliminates the recurring
# "white screen" / 404-asset bugs caused by committing stale
# public/build output.
#
# Usage (on the server, from the app directory):
#     bash /www/wwwroot/wusool.ps/deploy.sh
# ==============================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/wusool.ps}"
BRANCH="${BRANCH:-main}"
PHP="${PHP:-/usr/bin/php}"
FPM_SERVICE="${FPM_SERVICE:-php-fpm-83}"

cd "$APP_DIR"
echo "==> Deploying branch '$BRANCH' to $APP_DIR"

echo "==> [1/7] Fetching and resetting to origin/$BRANCH"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"
git submodule update --init --recursive 2>/dev/null || true

echo "==> [2/7] Composer install (no-dev)"
if [ -f composer.lock ]; then
    composer install --no-dev --optimize-autoloader --no-interaction
else
    composer update --no-dev --optimize-autoloader --no-interaction
fi

echo "==> [3/7] npm install"
npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund

echo "==> [4/7] Building frontend assets (manifest + files on server)"

# Park the app during the asset rebuild so requests see a friendly maintenance
# page instead of a blank screen / 500 while public/build is temporarily removed.
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
rm -rf public/build
npm run build
restore_app
trap - EXIT
chmod 644 public/index.php

echo "==> [5/7] Database migrations"
"$PHP" artisan migrate --force --no-interaction

echo "==> [6/7] Clearing caches"
"$PHP" artisan optimize:clear
"$PHP" artisan view:clear
"$PHP" artisan config:clear

echo "==> [7/8] Storage link + permissions (php-fpm runs as www on this VPS)"
[ -L public/storage ] || "$PHP" artisan storage:link
WEB_USER="${WEB_USER:-www}"
chown -R "${WEB_USER}:${WEB_USER}" storage bootstrap/cache public 2>/dev/null || true
chmod -R 775 storage bootstrap/cache 2>/dev/null || true

echo "==> [8/9] Restarting queue workers (pick up new code)"
"$PHP" artisan queue:restart 2>/dev/null || true
echo "==> [8/9] Reloading services"
if command -v systemctl >/dev/null 2>&1 && systemctl list-units --type=service 2>/dev/null | grep -q "$FPM_SERVICE"; then
    systemctl reload "$FPM_SERVICE" 2>/dev/null || systemctl restart "$FPM_SERVICE"
else
    service "$FPM_SERVICE" reload 2>/dev/null || /etc/init.d/"$FPM_SERVICE" reload 2>/dev/null || true
fi
nginx -s reload 2>/dev/null || service nginx reload 2>/dev/null || true
if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files 2>/dev/null | grep -q '^queue-worker'; then
    systemctl restart queue-worker 2>/dev/null || true
fi
if command -v supervisorctl >/dev/null 2>&1; then
    supervisorctl restart all 2>/dev/null || supervisorctl restart wusool-worker:* 2>/dev/null || true
fi

echo "==> Done. Verify:"
echo "    curl -I https://wusool.ps/"

echo "==> [9] Notifying search engines (IndexNow, best-effort)"
KEY="189fa4637ec052bd"
if command -v curl >/dev/null 2>&1; then
  curl -s -X POST "https://api.indexnow.org/indexnow" \
    -H "Content-Type: application/json; charset=utf-8" \
    --data "{\"host\":\"wusool.ps\",\"key\":\"$KEY\",\"keyLocation\":\"https://wusool.ps/$KEY.txt\",\"urlList\":[\"https://wusool.ps/\",\"https://wusool.ps/features\",\"https://wusool.ps/sitemap.xml\"]}" \
    -o /dev/null -w "indexnow-home: %{http_code}\n" || echo "indexnow ping skipped"
fi
