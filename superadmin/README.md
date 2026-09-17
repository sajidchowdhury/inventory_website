# InventoryOS SuperAdmin

One control panel above every SaaS product under `inventoryos.xyz`. Handles the
manual bKash/Nagad/bank subscription approval workflow, per-project payment
config, client cross-index, ledgers, **dynamic landing-page content for the
root site + every product**, per-project + cross-project analytics, reads/writes
each app's real SQLite DB via `node:sqlite` + a per-project schema map, 2FA
admin login, bKash automated payments, SSO token issuance, automated dunning
emails, and CSV exports.

## Quick start (local testing)

See **`LOCAL_TESTING_GUIDE.md`** for the full walkthrough. TL;DR:

```bash
git clone https://github.com/sajidchowdhury/inventory_website.git
cd inventory_website/superadmin
bun install
cp .env.example .env
bun run db:push && bun run db:seed
node sample-apps/init-mudaraba-db.mjs
bun run dev          # → http://localhost:3000  →  admin@inventoryos.xyz / admin123
```

Requires **Node 24+** (the cross-db layer uses `node:sqlite`).

## Docs

| File | What |
|---|---|
| `LOCAL_TESTING_GUIDE.md` | Clone → install → run → full-process test (11 steps) |
| `SUPERADMIN_IMPLEMENTATION_PLAN.md` | The full engineering spec (architecture, schema, phases) |
| `PHASE2_VPS_DEPLOYMENT.md` | Runbook for deploying on the real `inventoryos.xyz` VPS |
| `worklog.md` | Build log across every agent (Task IDs 1→16) |

## The single-route SPA

The sandbox exposes only `/`, so SuperAdmin is a client-side SPA: all pages are
views switched via the Zustand store in `src/stores/superadmin.ts`. On the real
VPS deploy at `inventoryos.xyz/SuperAdmin` (see the deployment playbook).

## Phase 2 cross-app DB (the linchpin)

`src/lib/cross-db.ts` reads/writes each project's REAL `.db` via `node:sqlite`
`DatabaseSync` + the per-project schema map; falls back to the `MockAppUser`
mirror for unwired apps. Approving a payment flips `is_paid` in the app's real
`users` table — proven end-to-end against `sample-apps/mudaraba.db`.

### node:sqlite loading gotcha

A static `import { DatabaseSync } from "node:sqlite"` breaks Turbopack at build
time ("Unsupported external type Url for commonjs reference"). Fixed with a lazy
`eval("require")("node:sqlite")` inside `openDb()` — Turbopack can't statically
see through eval. Requires Node 24+.

## Project layout

```
src/
  app/
    api/            # auth, 2fa, stats, payments, projects/[key]/*, clients, ledger,
                    # renewals, health, audit, landing/[key], cron/*, bkash/*, sso/*,
                    # export/*, system/status
    page.tsx        # SPA host (auth check → Shell or LoginView)
    layout.tsx
  components/
    superadmin/
      shell/        # Sidebar, Topbar, Shell (VIEWS registry)
      views/        # Dashboard, PendingPayments, AllClients, IncomeLedgers,
                    # Renewals, ServerHealth, AuditLog, AddProject, Security,
                    # AutomatedPayments, SsoView, SystemSettings, SiteView, project/*
      shared/       # StatCard, PageHeader, EmptyState, ExportButton, icons
  lib/              # db (Prisma), auth, cross-db, format, utils, totp, email,
                    # bkash, sso, csv
  stores/          # superadmin.ts (Zustand)
  server/          # audit.ts, approve.ts
prisma/            # schema.prisma, seed.ts
sample-apps/       # init-mudaraba-db.mjs (creates the real demo .db)
```

## Status

Phase 1 (SPA admin) + Phase 2 (cross-db node:sqlite) + Phase 3 (2FA, dunning,
bKash automated, SSO) + ops toolkit (CSV exports, System Settings) — all built,
lint-clean, and browser-verified. See `worklog.md`.
