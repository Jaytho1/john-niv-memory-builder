# Production Deployment

This app is designed to run behind Nginx with Node managed by PM2.

## 1. Prepare the server

- Install Node.js 20+
- Install PM2 globally: `npm install -g pm2`
- Install Nginx
- Provision a PostgreSQL database

## 2. Configure environment variables

Create `.env` on the server:

```env
NODE_ENV=production
HOST=127.0.0.1
PORT=43117
DATABASE_URL=postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE_NAME
PGSSLMODE=require
```

Notes:

- Keep `HOST=127.0.0.1` so the app is only reachable through Nginx.
- The app falls back to in-memory progress tracking if `DATABASE_URL` is missing, so production should always set it.

## 3. Install dependencies

```bash
npm ci --omit=dev
```

## 4. Start with PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Useful commands:

```bash
pm2 status
pm2 logs john-memory-app
pm2 restart john-memory-app
```

## 5. Configure Nginx

Copy `nginx.conf.example` into your Nginx site configuration, replace `yourdomain.com`, then enable the site and reload Nginx.

Example:

```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/john-memory-app
sudo ln -s /etc/nginx/sites-available/john-memory-app /etc/nginx/sites-enabled/john-memory-app
sudo nginx -t
sudo systemctl reload nginx
```

## 6. Enable HTTPS

Use Certbot after DNS is pointing at the server:

```bash
sudo certbot --nginx -d yourdomain.com
```

## 7. Verify

From the server:

```bash
curl http://127.0.0.1:43117/health
```

Through the domain:

```bash
curl https://yourdomain.com/health
```

## 8. Optional GitHub Actions deploy

This repo includes `.github/workflows/deploy.yml` for SSH-based deployment from GitHub Actions.

Set these repository secrets:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_PORT`
- `DEPLOY_PATH`

The target server should already have:

- the repository cloned at `DEPLOY_PATH`
- Node.js, PM2, and app environment variables configured
- SSH access for the GitHub Actions key

## 9. Optional database backups

Use the included backup script on the server:

```bash
./scripts/backup-db.sh
```

By default it:

- reads `DATABASE_URL` from `.env`
- writes compressed backups into `./backups`
- deletes backups older than 7 days

Restore a backup with:

```bash
./scripts/restore-db.sh ./backups/postgres-YYYYMMDD-HHMMSS.dump.gz
```

## 10. Optional nightly cron backups

This repo includes `cron.backup.example` as a sample crontab entry:

```cron
15 2 * * * cd /path/to/app && /path/to/app/scripts/backup-db.sh >> /path/to/app/backups/backup.log 2>&1
```

Install it with:

```bash
crontab -e
```

Then paste the line in and replace `/path/to/app` with the real deployment path.
