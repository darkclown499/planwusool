#!/usr/bin/env bash
#
# Wusool deployment script — run from the project root on the VPS.
#
# Usage:
#   ./deploy.sh [branch]        # default branch: main
#
# Requirements: git, composer, node/npm, php, and sudo for cache/perms.
# This script is safe to re-run; it is idempotent.
#
set -euo pipefail

BRANCH="${1:-main}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$APP_DIR"

echo "==> [1/8] Pulling latest code (branch: $BRANCH)"
git fetch --all --prune
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "==> [2/8] Installing PHP dependencies"
if [ -f composer.phar ]; then
    php composer.phar install --no-dev --no-interaction --prefer-dist --optimize-autoloader
else
    composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader
fi

echo "==> [3/8] Installing JS dependencies"
npm ci || npm install --no-audit --no-fund

echo "==> [4/8] Building frontend assets"
npm run build

echo "==> [5/8] Running database migrations"
php artisan migrate --force

echo "==> [6/8] Caching config, routes and views"
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache 2>/dev/null || true

echo "==> [7/8] Creating storage link and fixing permissions"
[ -L public/storage ] || php artisan storage:link
# php-fpm runs as www:www on this VPS (BT panel) — using www-data here
# silently breaks runtime view compilation (Blade tempnam) and causes 500s.
WEB_USER="${WEB_USER:-www}"
sudo chown -R "${WEB_USER}:${WEB_USER}" storage bootstrap/cache public 2>/dev/null || true
sudo chmod -R 775 storage bootstrap/cache 2>/dev/null || true

echo "==> [8/8] Restarting queue worker"
if systemctl list-unit-files 2>/dev/null | grep -q '^queue-worker'; then
    sudo systemctl restart queue-worker
fi

echo "==> Deployment complete for branch '$BRANCH'."
