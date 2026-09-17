# Deploy InventoryOS SuperAdmin to your VPS

> One Next.js app serves the **public root site** (`/`), the **admin panel**
> (`/SuperAdmin`), and the **APIs** (`/api/*`) on port 3001. Caddy routes the
> paths and keeps your existing product apps (`/cctv`, `/mudaraba`, …) on their
> own ports.

## What gets deployed

| URL | Served by | What |
|---|---|---|
| `https://inventoryos.xyz` | SuperAdmin app `:3001` `/` | Public controllable root site (Bangla landing) |
| `https://inventoryos.xyz/SuperAdmin` | SuperAdmin app `:3001` `/SuperAdmin` | Admin SPA (login + dashboard) |
| `https://inventoryos.xyz/api/*` | SuperAdmin app `:3001` `/api/*` | Landing content (public) + admin APIs (authed) |
| `https://inventoryos.xyz/cctv` etc. | your existing product apps | Unchanged |

## Prerequisites on the VPS

```bash
node --version    # must be >= 24 (node:sqlite built-in)
bun --version
git --version
caddy --version
```

## 1. One-command deploy

```bash
# on the VPS:
curl -sL https://github.com/sajidchowdhury/inventory_website/raw/main/superadmin/deploy.sh -o deploy.sh
bash deploy.sh
```

The script: clones to `/var/www/inventoryos/superadmin`, installs deps, builds
the standalone Next.js app, seeds the DB, installs the `inventoryos` systemd
service on port 3001, and reloads Caddy. Idempotent — re-run after every push.

When it finishes:
- Public root site → **https://inventoryos.xyz**
- Admin panel → **https://inventoryos.xyz/SuperAdmin**
- Login → `admin@inventoryos.xyz` / `admin123` **(change this immediately)**

## 2. Change the admin password

Log in, then in a terminal on the VPS:

```bash
cd /var/www/inventoryos/superadmin
bun -e '
  const bcrypt = require("bcryptjs");
  const { PrismaClient } = require("@prisma/client");
  const db = new PrismaClient();
  (async () => {
    const h = await bcrypt.hash("YOUR_NEW_PASSWORD", 10);
    await db.adminUser.update({ where: { email: "admin@inventoryos.xyz" }, data: { passwordHash: h } });
    console.log("✓ password changed");
    await db.$disconnect();
  })();
'
```

## 3. Wire your real product apps (Phase 2 cross-DB)

For each product app you want SuperAdmin to actually read/write (not just demo):

1. In the admin panel → open that project → **Settings** tab.
2. Set the **dbPath** to the app's real SQLite file
   (e.g. `/var/www/cctv/db/custom.db`).
3. Set the **schema map** (usersTable / emailColumn / paidColumn / nameColumn /
   phoneColumn) to match that app's `users` table.
4. Click **Validate mapping** — green = SuperAdmin can read the app's users.
5. Make the `.db` file readable+writable by the SuperAdmin service user:
   ```bash
   sudo chmod 664 /var/www/cctv/db/custom.db /var/www/cctv/db/custom.db-*
   # and ensure WAL mode on the app's DB:
   sqlite3 /var/www/cctv/db/custom.db "PRAGMA journal_mode=WAL;"
   ```

After that, approving a pending payment for that app's user flips `is_paid` in
the app's real DB (no app code change), and the Clients tab reads live users.

## 4. Enable automation (optional, env-driven — no code change)

Edit `/var/www/inventoryos/superadmin/.env`:

```env
# bKash automated payments (get these from your bKash merchant account)
BKASH_BASE_URL=https://tokenized.sandbox.bka.sh/v1.2.0   # sandbox; production URL for live
BKASH_APP_KEY=...
BKASH_APP_SECRET=...
BKASH_USERNAME=...
BKASH_PASSWORD=...
BKASH_CALLBACK_URL=https://inventoryos.xyz/api/bkash/callback

# Real dunning emails (any transactional SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=InventoryOS <noreply@inventoryos.xyz>
```

Then `sudo systemctl restart inventoryos`.

## 5. Set up the cron jobs (systemd timers)

```bash
# daily expiry at 00:05
sudo tee /etc/systemd/system/inventoryos-cron-expire.service >/dev/null <<'EOF'
[Unit]
Description=InventoryOS — expire overdue subscriptions
[Service]
Type=oneshot
ExecStart=/usr/bin/curl -fsS -X POST http://localhost:3001/api/cron/expire -H "X-Cron-Secret: $(grep ^CRON_SECRET /var/www/inventoryos/superadmin/.env | cut -d= -f2)"
EOF

sudo tee /etc/systemd/system/inventoryos-cron-expire.timer >/dev/null <<'EOF'
[Unit]
Description=Daily 00:05 expiry
[Timer]
OnCalendar=*-*-* 00:05:00
Persistent=true
[Install]
WantedBy=timers.target
EOF

# repeat for reminders (09:00) + sync-clients (every 6h) — see PHASE2_VPS_DEPLOYMENT.md §6
sudo systemctl enable --now inventoryos-cron-expire.timer
```

## 6. Manual / re-deploy

```bash
cd /var/www/inventoryos/superadmin
git pull origin main
bun install
bun run build
sudo systemctl restart inventoryos
```

## 7. Verify

```bash
# public root site serves the controllable landing
curl -s https://inventoryos.xyz/api/landing/root | head -c 200

# admin panel reachable
curl -s -o /dev/null -w "%{http_code}\n" https://inventoryos.xyz/SuperAdmin

# service healthy
sudo systemctl status inventoryos
sudo journalctl -u inventoryos -n 50
```

## Files

| File | Purpose |
|---|---|
| `deploy.sh` | one-command VPS deploy (clone + build + systemd + caddy) |
| `Caddyfile.prod` | production Caddy config (copy to /etc/caddy/Caddyfile) |
| `.env.example` | all env vars (DATABASE_URL, AUTH_SECRET, CRON_SECRET, BKASH_*, SMTP_*) |

## Troubleshooting

- **node:sqlite / `Cannot find module 'node:sqlite'`** → Node must be ≥ 24.
  Check `node --version` in the service's ExecStart. The deploy script uses
  `$(which node)`.
- **Admin shows blank** → check `sudo journalctl -u inventoryos -f` for runtime
  errors; verify `.env` `DATABASE_URL` points to a writable path.
- **Cross-DB reads 0 users** → the project's `dbPath` file doesn't exist or
  isn't readable by the service user. Run `Validate mapping` in the Settings tab.
- **Caddy 502** → the app isn't up on :3001. `sudo systemctl restart inventoryos`.
