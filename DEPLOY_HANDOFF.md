# Deployment Handoff

This file is the single handoff reference for deploying the app.

## Repository

- Repo URL: `https://github.com/Jaytho1/john-niv-memory-builder.git`
- Deploy branch: `main`
- Runtime: Node.js 20+
- Process manager: PM2
- Reverse proxy: Nginx
- Database: PostgreSQL

## Important Note

Deployment from the Git repo will only include code that has been committed and pushed to GitHub.

If local changes in the current workspace are intended for production, they must be pushed to `origin/main` before deployment.

## What The App Needs

1. A server with Node.js 20+ installed
2. PM2 installed globally
3. Nginx installed
4. A reachable PostgreSQL database
5. Environment variables configured on the server

## Production Environment Variables

Create a `.env` file on the server with values like these:

```env
NODE_ENV=production
HOST=127.0.0.1
PORT=43117
DATABASE_URL=postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE_NAME
PGSSLMODE=require
```

Notes:

- Keep `HOST=127.0.0.1` in production so the Node app is only exposed through Nginx.
- `DATABASE_URL` must point to the production Postgres instance.
- `PGSSLMODE=require` is the expected production setting unless the database provider explicitly says otherwise.

## Install And Run

```bash
git clone https://github.com/Jaytho1/john-niv-memory-builder.git
cd john-niv-memory-builder
npm ci --omit=dev
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

## PM2 App Name

- PM2 app name: `john-memory-app`

Useful PM2 commands:

```bash
pm2 status
pm2 logs john-memory-app
pm2 restart john-memory-app
```

## Nginx

This repo includes:

- `nginx.conf.example`

It proxies traffic to:

- `http://127.0.0.1:43117`

Typical setup:

```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/john-memory-app
sudo ln -s /etc/nginx/sites-available/john-memory-app /etc/nginx/sites-enabled/john-memory-app
sudo nginx -t
sudo systemctl reload nginx
```

Replace `yourdomain.com` in the Nginx config before enabling it.

## HTTPS

After DNS points to the server:

```bash
sudo certbot --nginx -d yourdomain.com
```

## Health Check

From the server:

```bash
curl http://127.0.0.1:43117/health
```

Expected healthy response:

```json
{"ok":true,"db":{"configured":true,"connected":true}}
```

## GitHub Actions Deployment

This repo includes `.github/workflows/deploy.yml`.

It deploys on pushes to `main` and on manual workflow dispatch.

Required GitHub secrets:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_PORT`
- `DEPLOY_PATH`

The workflow expects the target server to already have:

- the repo cloned at `DEPLOY_PATH`
- Node.js installed
- PM2 installed
- environment variables configured
- SSH access available for the deploy key

## Database Expectations

The application stores:

- users
- emails
- preferred language
- word attempts
- solved words / leaderboard progress

The app creates its required tables automatically when it successfully connects to PostgreSQL.

## Backups

Included scripts:

- `scripts/backup-db.sh`
- `scripts/restore-db.sh`

Example backup:

```bash
./scripts/backup-db.sh
```

Example restore:

```bash
./scripts/restore-db.sh ./backups/postgres-YYYYMMDD-HHMMSS.dump.gz
```

## Short Message To Send With This

Use this message if needed:

> Repo: `https://github.com/Jaytho1/john-niv-memory-builder.git`
> Branch: `main`
> This is a Node + PostgreSQL app deployed behind Nginx with PM2.
> Please use `DEPLOY_HANDOFF.md` and `DEPLOYMENT.md` in the repo for the deployment details and required environment variables.
