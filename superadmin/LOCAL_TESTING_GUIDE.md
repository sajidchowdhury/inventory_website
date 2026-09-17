# Local Testing Guide — InventoryOS SuperAdmin

> Clone the repo on your own PC and run the full SuperAdmin — login → manual
> payment approval (flips a real app DB) → bKash automated → SSO → 2FA → CSV
> exports → controllable root site.

## 1. Prerequisites

| Tool | Version | Why |
|---|---|---|
| **Node.js** | **24+** (required) | The cross-db layer uses `node:sqlite`, a Node 24 built-in |
| **Bun** | latest | Runs the dev server + the seed script |
| **Git** | any | Clone |

Check:

```bash
node --version    # must print v24.x or higher
bun --version
git --version
```

<details>
<summary><strong>Node not 24+?</strong></summary>

The only Node-24-specific piece is `node:sqlite` in `src/lib/cross-db.ts`. On
older Node, swap that one line for `better-sqlite3` (same API):

```bash
bun add better-sqlite3
```
then in `src/lib/cross-db.ts` change the `_DatabaseSyncCtor = eval("require")("node:sqlite").DatabaseSync`
line to `_DatabaseSyncCtor = require("better-sqlite3")` and `new _DatabaseSyncCtor(path, opts)`
becomes `new _DatabaseSyncCtor(path, opts)` (better-sqlite3 uses `{ readonly: true }` too).
</details>

## 2. Clone + install

```bash
git clone https://github.com/sajidchowdhury/inventory_website.git
cd inventory_website/superadmin
bun install
```

## 3. Configure env

```bash
cp .env.example .env
```

The defaults in `.env.example` work for local testing as-is:
- `DATABASE_URL=file:./db/superadmin.db` (Prisma creates it on `db:push`)
- `AUTH_SECRET` is a dev default (change on a real deploy)
- bKash / SMTP left blank → **mock mode** (the full flow runs without merchant creds / mail server)

## 4. Initialize the databases

```bash
bun run db:push          # creates db/superadmin.db from prisma/schema.prisma
bun run db:seed          # seeds: 1 admin + 6 projects + ~70 clients + 7 pending payments + 3-month ledger
node sample-apps/init-mudaraba-db.mjs   # creates sample-apps/mudaraba.db — the REAL demo app DB the cross-db layer reads/writes
```

Note the seed output:
- Admin login: **`admin@inventoryos.xyz`** / **`admin123`** (change this on a real deploy)
- 6 projects seeded (Root, Mudaraba, MadrashaOS, CCTV, CreativeCast, MyCreativeCode)

## 5. Run

```bash
bun run dev
```

Open **http://localhost:3000** in your browser. Log in with the credentials above.

> If your dev server dies (some machines reap backgrounded processes), just
> re-run `bun run dev`.

## 6. The full-process test walkthrough

Open each sidebar view in order. Every step below is verified to work against
the seeded data.

### A. Dashboard
- 4 stat cards (Total Clients, Income this month, Active Subs, Pending Payments)
- 6-month income AreaChart + subscription PieChart + income-by-project BarChart
- Projects table (Mudaraba shows 18 clients, DB size, MRR)
- **System Jobs** card at the bottom (3 manual-trigger buttons)

### B. Pending Payments — the manual approval flow (your A→I)
- 7 pending requests listed (project badge, method badge, txId, amount)
- Find the one for **`rahim.mudaraba@demo.com`** (Mudaraba, BDT 1500, bkash, txId `BKSH88776655`)
- Click **Approve** → toast "Approved — rahim.mudaraba@demo.com activated for Mudaraba"
- The list auto-refreshes (7 → 6)
- **Verify the real app DB flipped** — run this in a separate terminal:

  ```bash
  node -e "const{DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('sample-apps/mudaraba.db',{readOnly:true});console.log(db.prepare('SELECT email,is_paid FROM users WHERE email=?').get('rahim.mudaraba@demo.com'));db.close()"
  # → { email: 'rahim.mudaraba@demo.com', is_paid: 1 }   ← flipped from 0 to 1
  ```

  This is the Phase 2 linchpin: **SuperAdmin wrote to the app's real SQLite DB**.

### C. Mudaraba project → Clients tab
- Sidebar → **Projects** → **Mudaraba Profit Management**
- Click the **Clients** tab → you'll see the 6 real users from `mudaraba.db`
  (rahim now shows **Paid** after the approve above)
- This is the cross-db read — live from the app's `.db` file, not a mirror

### D. The other project tabs
- **Overview** — 4 StatCards + schemaMap JSON + last-5 payments
- **Payment Config** — edit bKash/Nagad/bank numbers + monthly amount (confirm flow)
- **Ledger** — project ledger with credit/debit badges + net total
- **Landing Page** — slot editor for the project's landing content + live preview
- **Settings** — schema-map editor + **Validate mapping** button + Danger Zone (deactivate)

### E. System Jobs (on the Dashboard)
- **Sync clients** — reads each project's real users → upserts into the cross-index (toast shows count)
- **Send reminders** — dunning email schedule (3d/1d/0d/+3-overdue); in mock mode emails log to `/tmp/inventoryos-emails.log`
- **Expire overdue** — marks active subs past cycleEnd as expired

### F. Security (2FA)
- Sidebar → **Security (2FA)** → **Enable 2FA**
- Scan the QR with **Google Authenticator** / **Authy** (or enter the secret manually)
- Enter the 6-digit code → **Verify & enable**
- **Log out, log back in** → after password, you'll be asked for the 6-digit code
- (Disable when you're done testing)

### G. Automated Payments (bKash)
- Sidebar → **Automated Payments**
- Pick **Mudaraba**, enter `rahim.mudaraba@demo.com`, leave amount blank (uses 1500)
- **Create bKash payment** → returns a `paymentID` + a mock checkout URL
- Click **Simulate & auto-approve** → toast "Auto-approved — subscription created, is_paid flipped, ledger credited"
- This is the Phase 3 bKash flow — **no admin needed**; the callback auto-approves

### H. SSO
- Sidebar → **SSO** → pick a project + enter an email → **Issue SSO token**
- Copy the token, click **Verify via /api/sso/verify** → shows `{valid:true, email, projectKey}`
- (A product app would call this verify endpoint after redirecting the user back with the token)

### I. CSV exports
- **All Clients** → **Export CSV** → downloads `clients-YYYY-MM-DD.csv` (every client cross-project)
- **Income & Ledgers** → **Export CSV** → `ledger-...csv` (full ledger, signed amounts)
- **Renewals** → **Export CSV** → `renewals-...csv` (overdue + upcoming with phones — the dunning call list)

### J. System Settings
- Sidebar → **System Settings** → one-glance view of what's configured
  (bKash=mock, SMTP=off, SSO secret, CRON_SECRET) + counts (admins/projects/clients/2FA/pending)
  + the exact env vars you'd set on the VPS for live mode

### K. Preview Root Site
- Sidebar → **Preview Root Site** → renders the controllable Bangla landing page
  (hero "ব্যবসাকে সিস্টেমে রূপ দিন…", mission, vision, footer, auto-generated products grid)
- This is the content fetched from `GET /api/landing/root` — edit the **Root Site** project's
  Landing Page tab to change it, then re-open the preview

## 7. Reset to a clean state

```bash
node sample-apps/init-mudaraba-db.mjs   # recreate the demo app DB (resets is_paid flags)
bun run db:seed                          # re-seed superadmin.db (clears + recreates all demo data)
```

## 8. Switch a feature from mock to live

Everything flips by setting env vars — **no code change**:

| Feature | Env vars to set |
|---|---|
| bKash automated | `BKASH_BASE_URL`, `BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_USERNAME`, `BKASH_PASSWORD` (merchant account) |
| Dunning emails | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (any transactional SMTP) |
| SSO signing | `SSO_SECRET` (or reuse `AUTH_SECRET`) |
| Cron jobs | `CRON_SECRET` (so systemd timers can hit `/api/cron/*` without an admin session) |

Edit `.env`, restart `bun run dev`.

## 9. The API surface (for curl / integration testing)

```bash
# login (saves cookie)
curl -c cookies.txt -X POST localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@inventoryos.xyz","password":"admin123"}'

# pending payments
curl -b cookies.txt localhost:3000/api/payments?status=pending

# approve the first one
curl -b cookies.txt -X PATCH localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{"id":"<id-from-above>","action":"approve"}'

# CSV exports
curl -b cookies.txt localhost:3000/api/export/clients -o clients.csv
curl -b cookies.txt localhost:3000/api/export/ledger -o ledger.csv
curl -b cookies.txt localhost:3000/api/export/renewals -o renewals.csv

# cron jobs
curl -b cookies.txt -X POST localhost:3000/api/cron/sync-clients
curl -b cookies.txt -X POST localhost:3000/api/cron/expire
curl -b cookies.txt -X POST localhost:3000/api/cron/reminders

# system status
curl -b cookies.txt localhost:3000/api/system/status

# SSO (issue + verify)
curl -b cookies.txt -X POST localhost:3000/api/sso/issue \
  -H "Content-Type: application/json" \
  -d '{"email":"rahim.mudaraba@demo.com","projectKey":"mudaraba"}'
curl "localhost:3000/api/sso/verify?token=<token-from-above>"

# public landing content (no auth)
curl localhost:3000/api/landing/root
```

## 10. Deploying to the real VPS

Once local testing passes, follow **`PHASE2_VPS_DEPLOYMENT.md`** — the runbook
for deploying on `inventoryos.xyz` (systemd service, Caddy path-based proxy,
wiring each real app via the Add Project form + schema map, systemd timers,
nightly backups, graceful degradation).

---

**TL;DR:**

```bash
git clone https://github.com/sajidchowdhury/inventory_website.git
cd inventory_website/superadmin
bun install
cp .env.example .env
bun run db:push && bun run db:seed
node sample-apps/init-mudaraba-db.mjs
bun run dev
# → http://localhost:3000  →  admin@inventoryos.xyz / admin123
```
