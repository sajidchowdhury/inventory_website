# Phase 2 — VPS Deployment Playbook

> How to take the Phase 1 prototype (running in the sandbox) and wire it onto
> your real `inventoryos.xyz` VPS so SuperAdmin actually controls the live
> Mudaraba / MadrashaOS / CCTV / CreativeCast / MyCreativeCode apps.
>
> This is the runbook you execute on the VPS. The code is already written —
> Phase 2 only changed the cross-db layer to read/write real `.db` files via
> `node:sqlite`, added the 3 cron routes, and seeded mudaraba against a real
> sample `.db` to prove it end-to-end.

---

## 0. What changed in Phase 2 (code)

| File | Change |
|---|---|
| `src/lib/cross-db.ts` | Now reads/writes each project's REAL `.db` via `node:sqlite` `DatabaseSync` using the schema map. Falls back to the `MockAppUser` mirror for any project whose `dbPath` doesn't exist on disk. |
| `sample-apps/mudaraba.db` | A real standalone SQLite file (created by `sample-apps/init-mudaraba-db.mjs`) standing in for the Mudaraba app's own `users` table. 6 users, 2 unpaid. |
| `prisma/seed.ts` | Mudaraba's `dbPath` now points to `sample-apps/mudaraba.db`; a pending payment for `rahim.mudaraba@demo.com` (a real unpaid .db user) is seeded so approving it flips `is_paid=1` in the real file. |
| `src/app/api/cron/{expire,reminders,sync-clients}/route.ts` | 3 scheduled jobs, protected by admin session OR `X-Cron-Secret` header. |
| `src/components/superadmin/views/DashboardView.tsx` | "System Jobs" card with manual triggers for the 3 cron routes. |

**Sandbox proof (verified before this playbook):** open the Mudaraba project →
Clients tab shows the 6 real `.db` users; approve the `rahim.mudaraba@demo.com`
pending payment → `sample-apps/mudaraba.db` `users.is_paid` flips 0→1 for real.

---

## 1. Prerequisites on the VPS

```bash
node --version    # must be >= 24 (node:sqlite is built-in)
bun --version     # for running scripts/seed
git
caddy             # reverse proxy
```

Each product app (Mudaraba, MadrashaOS, CCTV, CreativeCast, MyCreativeCode)
must already be running on its own port (e.g. 3002, 3005, 3003, 3004, 3006)
and using a SQLite DB. Note the absolute path to each app's `.db` file, e.g.
`/var/www/mudaraba/db/custom.db`.

---

## 2. Deploy SuperAdmin

```bash
cd /var/www
git clone <your-superadmin-repo> superadmin
cd superadmin
bun install
cp .env.example .env   # then edit
```

### `.env`

```env
DATABASE_URL=file:/var/www/superadmin/db/superadmin.db
AUTH_SECRET=<generate with: openssl rand -hex 32>
CRON_SECRET=<generate with: openssl rand -hex 32>
# Node 24+ has node:sqlite built in — no native build needed.
```

```bash
bun run db:push
bun run db:seed    # creates the admin + 6 projects + sample data
# IMPORTANT: after seeding, log in once and change the admin password
# (admin@inventoryos.xyz / admin123) — or replace the seed admin row.
```

### Run SuperAdmin as a service (port 3001)

`/etc/systemd/system/inventoryos-superadmin.service`:

```ini
[Unit]
Description=InventoryOS SuperAdmin
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/superadmin
ExecStart=/usr/bin/bun run start
EnvironmentFile=/var/www/superadmin/.env
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now inventoryos-superadmin
```

---

## 3. Caddy — path-based reverse proxy

`/etc/caddy/Caddyfile`:

```caddy
inventoryos.xyz {
  encode zstd gzip

  handle /SuperAdmin* {
    rewrite /SuperAdmin/* /{path.1}
    reverse_proxy localhost:3001
  }

  handle /mudaraba/*      { reverse_proxy localhost:3002 }
  handle /cctv/*          { reverse_proxy localhost:3003 }
  handle /creativecast/*  { reverse_proxy localhost:3004 }
  handle /madrashaos/*    { reverse_proxy localhost:3005 }
  handle /mycreativecode/*{ reverse_proxy localhost:3006 }

  handle /* {
    reverse_proxy localhost:3000   # the root InventoryOS marketing site
  }
}
```

> Each product app must set `basePath` in its `next.config.ts` to match its
> prefix (e.g. Mudaraba sets `basePath: "/mudaraba"`) so its internal links
> resolve correctly under the sub-path.

```bash
sudo systemctl reload caddy
```

---

## 4. Wire each existing app — two paths (pick one per app)

### Path F1 — direct DB access (no app code change) ★ recommended

For each app, in the SuperAdmin UI → **Add Project** (or edit an existing
project's Settings tab), provide:

| Field | Example value |
|---|---|
| `key` | `mudaraba` |
| `dbType` | `sqlite` |
| `dbPath` | `/var/www/mudaraba/db/custom.db` |
| Schema map → `usersTable` | `users` |
| Schema map → `emailColumn` | `email` |
| Schema map → `paidColumn` | `is_paid` |
| Schema map → `nameColumn` | `name` |
| Schema map → `phoneColumn` | `phone` |
| `landingUrl` | `https://inventoryos.xyz/mudaraba` |
| Payment config → bKash / Nagad / bank + monthly amount | … |

Then click **Validate mapping** — SuperAdmin runs
`SELECT email FROM users LIMIT 1` against the real file. If green, that app is
wired. SuperAdmin will now:

- list that app's real users in the project's **Clients** tab
- flip `users.is_paid = 1` in the real file when you **Approve** a pending payment
- show the real `.db` file size on the project's **Overview** tab

#### Filesystem permissions (critical)

SuperAdmin runs as `www-data`. It needs **read + write** on every app's `.db`
file (and the WAL/SHM sidecars). Easiest: put SuperAdmin and every app in the
`www-data` group, and make each `.db` group-writable:

```bash
sudo usermod -aG <each-app-user> www-data
sudo chmod 664 /var/www/*/db/custom.db
sudo chmod 664 /var/www/*/db/custom.db-*    # wal/shm sidecars
```

SQLite WAL mode is required so the app's process and SuperAdmin don't block
each other. Each app should set `PRAGMA journal_mode=WAL;` on its DB (Prisma
SQLite does this by default; verify with `sqlite3 /var/www/mudaraba/db/custom.db
"PRAGMA journal_mode;"` → should print `wal`).

### Path F2 — internal API route (decoupled, ~1 file per app)

If you'd rather not let SuperAdmin touch an app's DB directly, add a single
internal API route file to each app:

`/var/www/<app>/src/app/api/internal/heartbeat/route.ts`:

```ts
// GET  /api/internal/heartbeat  → { clients, activeSubs, dbSize, health }
// POST /api/internal/activate     → { email } → flips that app's users.is_paid
// Auth: HMAC header X-Internal-Token = HMAC(projectKey + date, projectSecret)
```

Then in SuperAdmin, set the project's `dbPath` blank and instead store an
`apiBase` + `apiSecret`. The cross-db layer swaps to HTTP calls. (Not built
yet — implement when you pick this path; the function signatures already
match.)

---

## 5. Migrate existing clients into the cross-index (one-time)

After wiring all apps via F1, run the sync job once:

```bash
curl -X POST https://inventoryos.xyz/api/cron/sync-clients \
  -H "X-Cron-Secret: $CRON_SECRET"
```

This reads each wired app's real users and upserts them into the `Client`
cross-index in `superadmin.db`. After it runs, the **All Clients** view and the
dashboard totals reflect every real user across every product.

---

## 6. Scheduled jobs (systemd timers)

### `/etc/systemd/system/inventoryos-cron-expire.service`
```ini
[Unit]
Description=InventoryOS — expire overdue subscriptions
[Service]
Type=oneshot
ExecStart=/usr/bin/curl -fsS -X POST http://localhost:3001/api/cron/expire -H "X-Cron-Secret: %d"
```
(Use `EnvironmentFile=` to load CRON_SECRET, or hardcode + `chmod 600`.)

### `/etc/systemd/system/inventoryos-cron-expire.timer`
```ini
[Unit]
Description=Daily 00:05 expiry run
[Timer]
OnCalendar=*-*-* 00:05:00
Persistent=true
[Install]
WantedBy=timers.target
```

Repeat for `reminders` (daily 09:00) and `sync-clients` (every 6h).

```bash
sudo systemctl enable --now inventoryos-cron-expire.timer
sudo systemctl enable --now inventoryos-cron-reminders.timer
sudo systemctl enable --now inventoryos-cron-sync-clients.timer
sudo systemctl list-timers --all | grep inventoryos
```

---

## 7. Backups (nightly)

`/var/www/superadmin/scripts/backup.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
DATE=$(date +%Y%m%d-%H%M)
DEST=/var/backups/inventoryos/$DATE
mkdir -p "$DEST"
cp /var/www/superadmin/db/superadmin.db "$DEST/superadmin.db"
for app in mudaraba madrasha cctv creativecast mycreativecode; do
  [ -f /var/www/$app/db/custom.db ] && cp /var/www/$app/db/custom.db "$DEST/$app.db"
done
tar czf "$DEST.tar.gz" "$DEST" && rm -rf "$DEST"
find /var/backups/inventoryos -name '*.tar.gz' -mtime +14 -delete
```

```bash
# crontab -e
0 2 * * * /var/www/superadmin/scripts/backup.sh
```

(Off-site: rsync `/var/backups/inventoryos/` to S3 / B2 / another VPS nightly.)

---

## 8. Replace the root `inventoryos.xyz` marketing page

The root site (`/`) must render the controllable landing page from SuperAdmin.
Two ways:

1. **Symlink approach (simplest):** make the root site its own tiny Next app
   on port 3000 whose `src/app/page.tsx` fetches `GET https://inventoryos.xyz/api/landing/root`
   and renders the template (see `SiteView.tsx` in this repo — copy its render
   logic). Editing the root project's Landing Page tab in SuperAdmin then
   updates the live marketing site within the cache TTL (60s).
2. **Embed in an existing app:** if you already have a Next app serving `/`,
   add the landing fetch + template render to its `page.tsx`.

Either way, the **products grid auto-generates** from the `Project` table —
add a new project in SuperAdmin → it appears on the marketing site's products
section automatically.

---

## 9. Graceful degradation (app-side, plan §12)

If SuperAdmin goes down, each app must not lock every user out. Each app should
cache the "is this user paid?" answer locally for up to 1 hour so a SuperAdmin
outage doesn't immediately block logins. Concretely, each app's login flow:

1. Check local cache (`paidCache[email]` with 1h TTL) → if present, use it.
2. Else call `GET https://inventoryos.xyz/api/internal/subscription?project=<key>&email=<email>`
   (this endpoint isn't built yet — add it in Phase 3 alongside SSO). Store
   the result in the local cache.
3. If SuperAdmin is unreachable AND no cache → fall back to the app's own
   `users.is_paid` column (which SuperAdmin keeps flipped via F1).

For Phase 2 with F1, option 3 is the default behavior (apps already gate on
their own `is_paid`), so no degradation work is needed yet.

---

## 10. Verification checklist

- [ ] `https://inventoryos.xyz/SuperAdmin` loads the login page.
- [ ] Log in, Dashboard shows all 6 projects + charts.
- [ ] For each wired app: open its project → Clients tab shows the **real**
      users from that app's `.db` (not the MockAppUser mirror).
- [ ] Pending Payments → Approve a real-user payment → `is_paid` flips in the
      app's real `.db` file (verify: `sqlite3 /var/www/<app>/db/custom.db
      "SELECT email,is_paid FROM users WHERE email='<that-email>'"`).
- [ ] Root site (`/`) renders the controllable Bangla landing; editing the root
      project's Landing Page tab updates it within 60s.
- [ ] Adding a new project via Add Project → it appears in the sidebar AND on
      the root site's products grid.
- [ ] `curl -X POST .../api/cron/expire -H "X-Cron-Secret: $CRON_SECRET"` →
      returns `{ok:true, expired:N}`.
- [ ] systemd timers are active (`list-timers` shows all 3).
- [ ] Nightly backup runs (`/var/backups/inventoryos/` has today's tarball).
- [ ] `sudo journalctl -u inventoryos-superadmin -f` shows no errors.

---

## 11. Open Phase 2 decisions (answer before deploying)

1. **Gating model per app:** F1 (SuperAdmin writes the app's `is_paid` column)
   or F2 (app calls SuperAdmin)? F1 needs no app change. Recommended: F1 now.
2. **Does every app already have an `is_paid` boolean/integer column** on its
   users table? If not, add one per app (`ALTER TABLE users ADD COLUMN
   is_paid INTEGER DEFAULT 0`).
3. **WAL mode** on each app's DB? Verify with the `PRAGMA journal_mode` check
   above. If an app uses rollback journal, switch it to WAL before wiring.
4. **Renewal policy:** hard-block on expiry day, or grace period? (Current
   code: the cron flips `active→expired` the moment `cycleEnd < now`.)

---

*End of Phase 2 playbook. The sandbox prototype already proves the cross-db
mechanism (node:sqlite reading/writing a real `.db` via the schema map). This
playbook is the execution guide for your real VPS.*
