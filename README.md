# John NIV Memory Builder

A lightweight Node.js quiz app for memorizing the Gospel of John with chapter progress, recommendations, and leaderboard tracking backed by PostgreSQL.

## Stack

- Node.js with a single `server.mjs`
- Static frontend in `index.html`, `styles.css`, and `script.js`
- PostgreSQL via `pg`
- PM2 for process management
- Nginx for reverse proxy and TLS termination

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create `.env` if you want PostgreSQL-backed progress and leaderboards:

```env
DATABASE_URL=postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE_NAME
PGSSLMODE=disable
PORT=3000
HOST=127.0.0.1
```

3. Start the app:

```bash
npm run dev
# or
npm start
```

If `DATABASE_URL` is missing or the database is unreachable, the app still starts and falls back to local in-memory tracking for the current server process.

## Production

This project is intended to run behind Nginx with PM2 managing the Node process.

### Required files

- `ecosystem.config.cjs` for PM2
- `nginx.conf.example` for reverse proxy setup
- `DEPLOYMENT.md` for step-by-step server instructions
- `scripts/deploy.sh` for simple on-server deploys
- `.github/workflows/deploy.yml` for GitHub Actions deployment
- `scripts/backup-db.sh` for PostgreSQL backups
- `scripts/restore-db.sh` for PostgreSQL restores
- `cron.backup.example` for nightly backup scheduling

### Production environment

```env
NODE_ENV=production
HOST=127.0.0.1
PORT=43117
DATABASE_URL=postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE_NAME
PGSSLMODE=require
```

### PM2 startup

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### GitHub Actions deploy

Set these repository secrets before enabling the workflow:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_PORT`
- `DEPLOY_PATH`

The workflow connects to the server over SSH, updates the checkout to `origin/main`, and runs `./scripts/deploy.sh`.

### Database backups

Run this on the server:

```bash
./scripts/backup-db.sh
```

Optional environment overrides:

- `ENV_FILE` to point at a different env file
- `BACKUP_DIR` to store dumps outside the app directory
- `RETENTION_DAYS` to change cleanup retention

### Database restore

To restore a backup:

```bash
./scripts/restore-db.sh ./backups/postgres-YYYYMMDD-HHMMSS.dump.gz
```

This uses `DATABASE_URL` from `.env` and restores into that database.

### Nightly backups with cron

Use `cron.backup.example` as a starting point, then install it with:

```bash
crontab -e
```

Paste in the cron line and replace `/path/to/app` with the real server path.

### Security notes

- Static serving is locked down to known public files only.
- Sensitive files such as `.env` are not publicly served.
- A health endpoint is available at `/health`.
- Basic security headers are applied in both Node and the sample Nginx config.

## Verify

```bash
curl http://127.0.0.1:43117/health
```

Expected response when PostgreSQL is connected:

```json
{"ok":true,"db":{"configured":true,"connected":true}}
```

If you are running without a database, `connected` will be `false`.
