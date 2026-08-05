# VPS Deployment Guide — Wusool (WhatsStore)

Production deployment guide for Ubuntu 22.04 / 24.04 with PHP 8.2+ and Nginx.

## 1. Server Requirements

- PHP >= 8.2 (extensions: `mbstring`, `gd`, `zip`, `intl`, `bcmath`, `pdo_mysql`, `fileinfo`, `curl`, `exif`, `imagick` or `gd`, `redis` optional)
- Composer 2.x
- Node.js 20+ (build only, not required on server if you build locally)
- MySQL 8.x or MariaDB 10.6+
- Nginx

## 2. Initial Setup

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx mysql-server php8.2-fpm php8.2-cli php8.2-mbstring \
  php8.2-gd php8.2-zip php8.2-intl php8.2-bcmath php8.2-xml php8.2-curl \
  php8.2-mysql composer unzip git
```

Create the project directory and deploy the code (git or SFTP):

```bash
sudo mkdir -p /var/www/wusool
sudo chown -R $USER:www-data /var/www/wusool
cd /var/www/wusool
```

## 3. Environment & Dependencies

```bash
cp .env.example .env
php artisan key:generate

composer install --no-dev --optimize-autoloader
npm ci
npm run build
```

Edit `.env` for production:

```ini
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=wusool
DB_USERNAME=wusool
DB_PASSWORD=strong-password

SESSION_DRIVER=database
CACHE_STORE=file        # or redis
QUEUE_CONNECTION=database
```

Create the database and user, then:

```bash
php artisan migrate --force --seed
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

> Note: seeding creates the default super admin account. Change its credentials immediately after first login.

## 4. File Permissions

```bash
sudo chown -R www-data:www-data storage bootstrap/cache public
sudo chmod -R 775 storage bootstrap/cache
```

## 5. Nginx Virtual Host

`/etc/nginx/sites-available/wusool`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/wusool/public;

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    location ~ /\.ht {
        deny all;
    }

    client_max_body_size 50M;
}
```

Enable and configure HTTPS:

```bash
sudo ln -s /etc/nginx/sites-available/wusool /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## 6. Background Jobs (Queue & Scheduler)

Add the queue worker to systemd (`/etc/systemd/system/queue-worker.service`):

```ini
[Unit]
Description=Laravel queue worker
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/wusool
ExecStart=/usr/bin/php artisan queue:work --sleep=3 --tries=3
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now queue-worker
```

Add the scheduler cron job:

```bash
crontab -e
# add:
* * * * * cd /var/www/wusool && php artisan schedule:run >> /dev/null 2>&1
```

## 7. Deploying Updates

```bash
cd /var/www/wusool
git pull                      # or upload new files
composer install --no-dev --optimize-autoloader
npm ci && npm run build
php artisan migrate --force   # or use the web updater below
php artisan optimize:clear
php artisan config:cache && php artisan route:cache && php artisan view:cache
sudo systemctl restart queue-worker
```

### Web Updater (super admin only)

`GET /update` shows a confirmation page; `POST /update` runs `migrate --force`. Both routes are protected by `auth` + `SuperAdminMiddleware`, so they are only reachable by a logged-in super admin. Anonymous or non-super-admin requests get redirected/denied.

## 8. Security Checklist

- `APP_DEBUG=false` and `APP_ENV=production` in production.
- Change the default super admin credentials after first login.
- Use HTTPS via Certbot (renew automatically).
- Never expose `.env` (Nginx blocks dotfiles above; keep files outside `public/`).
- Keep `php artisan optimize:clear` outputs cached after each deploy.
- Restrict SSH and use strong DB passwords.
- If you don't need the public web updater, disable it by commenting the `/update` routes in `routes/web.php` and deploy only via SSH.
