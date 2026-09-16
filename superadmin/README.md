# InventoryOS SuperAdmin

One control panel above every SaaS product under `inventoryos.xyz`. Handles the
manual bKash/Nagad/bank subscription approval workflow, per-project payment
config, client cross-index, ledgers, **dynamic landing-page content for the
root site + every product**, per-project + cross-project analytics, and
(Phase 2) reads/writes each app's real SQLite DB via `node:sqlite` + a
per-project schema map.

See **SUPERADMIN_IMPLEMENTATION_PLAN.md** for the full engineering spec and
**PHASE2_VPS_DEPLOYMENT.md** for the runbook to deploy on the real VPS.

## Run locally

```bash
cd superadmin
bun install
bun run db:push                                  # creates db/superadmin.db
bun run db:seed                                  # admin + 6 projects + ~70 clients
node sample-apps/init-mudaraba-db.mjs            # the real demo .db the cross-db reads
bun run dev                                      # http://localhost:3000
```

Log in: `admin@inventoryos.xyz` / `admin123` (change on a real deploy).

## Single-route SPA

The sandbox exposes only `/`, so SuperAdmin is a client-side SPA: all pages are
views switched via the Zustand store in `src/stores/superadmin.ts`. On the real
VPS deploy at `inventoryos.xyz/SuperAdmin` (see playbook).

## Phase 2 cross-app DB (the linchpin)

`src/lib/cross-db.ts` reads/writes each project's REAL `.db` via `node:sqlite`
`DatabaseSync` + the per-project schema map; falls back to the `MockAppUser`
mirror for unwired apps. Approving a payment flips `is_paid` in the app's real
`users` table — proven end-to-end against `sample-apps/mudaraba.db`.

node:sqlite loading gotcha: a static `import { DatabaseSync } from "node:sqlite"`
breaks Turbopack at build time. Fixed with a lazy `eval("require")("node:sqlite")`
inside `openDb()`. Requires Node 24+.
