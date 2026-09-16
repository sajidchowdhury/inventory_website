# InventoryOS SuperAdmin — Total Implementation Plan

> A single control panel that sits above every SaaS product under `inventoryos.xyz`,
> manages billing/subscriptions for all of them, **and** dynamically controls every
> landing page — including the root `inventoryos.xyz` marketing site itself.

---

## 0. Document purpose

This file is the **end-to-end engineering plan** for building the InventoryOS
SuperAdmin. No code lives here — only the plan. It is meant to be read top to
bottom by the developer (human or AI) who will build Phase 1, and then used as
the spec for wiring it onto the real VPS in later phases.

---

## 1. Vision (one paragraph)

`inventoryos.xyz` is a VPS hosting several independent SaaS apps at sub-paths
(`/cctv`, `/mudaraba`, `/creativecast`, `/mycreativecode`, `/madrashaos`, …).
Each app is a standalone Next.js product with its own folder, its own SQLite DB,
its own login, and a monthly subscription model paid **manually** via bKash/Nagad/
bank (user pays on phone → enters transaction ID → admin verifies → approves).
**SuperAdmin** (at `inventoryos.xyz/SuperAdmin`) is one admin app, above all of
them, that: handles the manual payment approval workflow, stores per-project
payment config (numbers + amount), indexes every client across every product,
keeps ledgers, controls **every landing page's content** (the root site + each
product site), shows per-project + cross-project analytics, and lets you add a
new project by simply giving it the new app's DB path + folder + schema map.

---

## 2. Core architecture decision (read this twice)

The one hard problem: each app has its **own** DB with its **own** schema. A
SuperAdmin can't magically read them. The solution has two layers:

### Layer A — SuperAdmin has its OWN database (`superadmin.db`)

This is the source of truth for everything billing/config/content-related:
projects registry, payment config, pending/approved payments, subscriptions,
ledgers, client cross-index, landing-page content (root + per-project),
admin users, audit log, reminder log.

SuperAdmin uses **Prisma + SQLite** for its own DB.

### Layer B — SuperAdmin reaches into each app's DB via raw SQL + a schema map

Because all apps are SQLite files on the same VPS, SuperAdmin can open any
project's `.db` file with **`better-sqlite3`** (read + targeted write) **without
needing a Prisma schema per app**. No codegen. No rebuilds. Each project just
has a config row that says where its DB lives and how to map it:

```
Project "Mudaraba":
  dbPath:        /var/www/mudaraba/db/custom.db
  usersTable:   users
  emailColumn:  email
  paidColumn:   is_paid
  paymentTable: payments    (optional)
```

This single config block is what makes **"Add new project"** work without
touching the app's code.

> **Alternative (optional, cleaner, more work):** each app exposes one tiny
> HMAC-authed internal API route (`/api/internal/heartbeat`,
> `/api/internal/activate-user`) that SuperAdmin calls instead of opening the
> DB directly. Same effect, decoupled, ~1 file per app. Use this in Phase 2+.

---

## 3. The root `inventoryos.xyz` site is ALSO controllable

This is the key addition. The existing InventoryOS repo (the Bengali emerald
landing page) is treated as **just another controllable site** inside the
SuperAdmin model, but with a special role: it's the "mother" page that
**auto-lists all active products**.

Concretely:

- The root site's content (hero headline, hero subtitle, mission text, dua
  text, vision text, footer contact numbers, WhatsApp/Facebook links) is stored
  as a JSON blob in SuperAdmin's `LandingContent` table, keyed to
  `projectKey = "root"`.
- The root site's **products section** is **auto-generated** from the `Project`
  table — every active project appears as a card, marked "Live" if its
  `landingUrl` is set, otherwise "Coming soon".
- The root `src/app/page.tsx` becomes a thin client that fetches
  `GET /api/landing/root` from SuperAdmin at runtime and renders the template
  with that JSON.
- Editing the root site's hero text or contact numbers is done in the SuperAdmin
  UI under the special **"Root Site"** project entry — same editor, same pattern
  as every other project's landing page.

**Net effect:** one admin panel edits the mother site AND every product site,
and adding a new product in SuperAdmin automatically surfaces it on the mother
site's products grid.

---

## 4. Technology stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) + Lucide icons |
| SuperAdmin DB | Prisma + SQLite (`superadmin.db`) |
| Cross-app DB reads | `better-sqlite3` (raw SQL, per-project schema map) |
| Auth | NextAuth.js v4 (single admin account → many admins later) |
| Charts | Recharts |
| State | Zustand (client) + TanStack Query (server) |
| Animations | Framer Motion |
| Forms | react-hook-form + zod |
| Notifications | Sonner toasts |
| Cron / scheduling | Node-based in-app scheduler (Phase 1: a route + Vercel-style cron; Phase 2: systemd timer on VPS) |
| Gateway | Caddy (path-based reverse proxy on the real VPS) |

---

## 5. SuperAdmin's own database schema (Prisma)

```
model Project {
  id            String   @id @default(cuid())
  key           String   @unique           // "mudaraba", "cctv", "root"
  name          String                      // "Mudaraba", "CCTV Business"
  folderPath    String?
  appPort       Int?
  dbType        String   @default("sqlite")
  dbPath        String?                     // /var/www/mudaraba/db/custom.db
  schemaMap     String                      // JSON: usersTable, emailColumn, paidColumn, paymentTable
  landingUrl    String?                     // https://inventoryos.xyz/mudaraba  (if live)
  isRoot        Boolean  @default(false)
  active        Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  paymentConfig ProjectPaymentConfig?
  landing       LandingContent?
  payments      PaymentRequest[]
  subscriptions Subscription[]
  clients       Client[]
  ledger        Ledger[]
}

model ProjectPaymentConfig {
  projectId      String   @id
  project        Project  @relation(fields:[projectId], references:[id])
  bkashNumber    String?
  nagadNumber    String?
  bankAccount    String?
  monthlyAmount  Float
  currency       String   @default("BDT")
  dueDayOfMonth  Int      @default(1)
  updatedAt      DateTime @updatedAt
}

model LandingContent {
  projectId String   @id
  project   Project  @relation(fields:[projectId], references:[id])
  content   String              // JSON: hero, subtitle, features[], pricing, contact, dua, etc.
  updatedAt DateTime @updatedAt
}

model Client {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields:[projectId], references:[id])
  email     String
  name      String?
  phone     String?
  createdAt DateTime @default(now())
  @@unique([projectId, email])
}

model PaymentRequest {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields:[projectId], references:[id])
  clientEmail String
  method      String                       // bkash | nagad | bank
  txId        String
  amount      Float
  status      String   @default("pending")  // pending | approved | rejected
  submittedAt DateTime @default(now())
  reviewedAt  DateTime?
  reviewerId  String?
  notes       String?
  @@index([projectId, status])
  @@index([status])
}

model Subscription {
  id                String   @id @default(cuid())
  projectId         String
  project           Project  @relation(fields:[projectId], references:[id])
  clientId          String
  client            Client   @relation(fields:[clientId], references:[id])
  cycleStart        DateTime
  cycleEnd          DateTime
  status            String   @default("active")  // active | expired | pending
  paymentRequestId  String?
  createdAt         DateTime @default(now())
  @@index([projectId, status])
  @@index([clientId])
}

model Ledger {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields:[projectId], references:[id])
  clientId  String?
  client    Client?  @relation(fields:[clientId], references:[id])
  type      String                              // credit | debit
  amount    Float
  reason    String                              // "monthly subscription", "refund", ...
  txId      String?
  createdAt DateTime @default(now())
  @@index([projectId, createdAt])
}

model AdminUser {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String?
  role         String   @default("admin")    // admin | superadmin
  twoFactorSecret String?
  createdAt    DateTime @default(now())
}

model AuditLog {
  id        String   @id @default(cuid())
  adminId   String?
  action    String                              // "payment.approve", "project.create", "landing.update"...
  target    String?
  meta      String?                             // JSON
  createdAt DateTime @default(now())
}

model ReminderLog {
  id             String   @id @default(cuid())
  subscriptionId String
  channel        String   @default("email")    // email | call
  sentAt         DateTime @default(now())
  result         String?                        // "sent" | "failed: reason"
}
```

---

## 6. The schema map (per-project, the linchpin)

Stored as JSON in `Project.schemaMap`. Tells SuperAdmin how to read/write each
app's existing DB without modifying the app:

```json
{
  "usersTable": "users",
  "emailColumn": "email",
  "paidColumn": "is_paid",
  "paidColumnType": "boolean",
  "nameColumn": "name",
  "phoneColumn": "phone",
  "paymentTable": "payments",
  "paymentColumns": { "txId": "trx_id", "amount": "amount", "method": "method" }
}
```

SuperAdmin uses this with `better-sqlite3`:

- **Read clients:** `SELECT email, name, phone FROM <usersTable>`
- **Read DB size:** `fs.statSync(project.dbPath).size`
- **Flip paid on approval:** `UPDATE <usersTable> SET <paidColumn> = 1 WHERE <emailColumn> = ?`
- **Validate mapping on save:** run `SELECT <emailColumn> FROM <usersTable> LIMIT 1` — if it errors, reject the "Add Project" form.

A "Validate mapping" button on each project's settings page re-runs this any
time the app's schema changes.

---

## 7. SuperAdmin module breakdown (sidebar structure)

```
SuperAdmin
├── Dashboard                       (cross-project overview)
├── All Clients                      (every client, project-tagged)
├── Pending Payments                 (approval queue, all projects)
├── Income & Ledgers                 (cross-project totals + charts)
├── Renewals & Reminders             (upcoming + overdue)
├── Projects ▾                       (sidebar sub-menu)
│   ├── Root Site                    (the inventoryos.xyz mother page content)
│   ├── Mudaraba
│   ├── MadrashaOS
│   ├── CCTV
│   ├── CreativeCast
│   ├── MyCreativeCode
│   └── + Add new project
│        (each project sub-menu opens a tabbed view:)
│        ├─ Overview         (clients, DB size, health, MRR)
│        ├─ Payment Config   (bKash/Nagad/bank + monthly amount + due day)
│        ├─ Clients          (active/inactive list per project)
│        ├─ Ledger           (project-only ledger)
│        ├─ Landing Page     (content editor — slots)
│        ├─ Settings         (schema map, folder path, port, validate)
│        └─ Danger Zone      (deactivate project)
├── Server Health                    (VPS CPU/RAM/disk/uptime)
└── Audit Log
```

The "Projects" sub-menu is generated dynamically from the `Project` table, so
adding a project instantly adds a sidebar entry.

---

## 8. Manual payment flow — end to end (matches your A–I)

```
A. Admin sets bKash number + monthly amount per project in SuperAdmin
   → saved to ProjectPaymentConfig.

B. User logs into product app (e.g. /mudaraba) → app sees no active subscription
   → shows payment screen: "Send <amount> BDT to bKash <number>, then enter
   your transaction ID below."
   The number + amount come from SuperAdmin (app fetches
   GET /api/public/payment-config?project=mudaraba).

C. User pays via bKash on phone → types transaction ID in app → clicks Done.
   App POSTs { project, email, txId, amount, method } to
   POST /api/payments  → stored as PaymentRequest status = "pending".

D. SuperAdmin → "Pending Payments" queue → every request shows
   project badge + user email + txId + amount + time submitted.

E. Admin checks own phone for that exact txId → clicks Approve (or Reject).

F. On Approve, SuperAdmin atomically:
   1. creates Subscription(cycleStart=now, cycleEnd=now+30d, status=active)
   2. upserts Client (projectId, email, name, phone)
   3. writes Ledger credit (amount, reason="monthly subscription", txId)
   4. flips the app's user record to paid
      (better-sqlite3 UPDATE on the app's users.paidColumn via schema map)
   5. writes AuditLog ("payment.approve")
   On Reject: marks status=rejected, notes reason, logs.

G. App's next login/session check → sees active subscription → grants access.

H. Monthly: cron at 00:05 every day → for every Subscription where
   cycleEnd < now AND status=active → set status=expired →
   app starts blocking → user pays again → loop restarts at C.

I. Reminders: cron every day →
   - subscriptions expiring in ≤3 days → email client
   - subscriptions expired in last 7 days → mark "overdue", show in
     "Renewals & Reminders" page for admin to call
   - ReminderLog records every send + result.
```

**Subscription gating decision (must pick one):**

- **Option F1 (no app code change):** SuperAdmin writes `paid=true` into the
  app's users table via the schema map. The app already gates on its own `paid`
  flag. Fastest for existing apps. Requires each app to *have* a paid flag (add
  one if not).
- **Option F2 (cleaner, ~30 lines per app):** each app, on login, calls
  `GET /api/internal/subscription?project=KEY&email=X` (HMAC-signed) on
  SuperAdmin and gates accordingly. SuperAdmin is the single source of truth.

**Recommended:** F1 for Phase 1/2 (works on apps as-is), F2 as the end-state.

---

## 9. Landing page control (root + per-project)

### Slot-based template model

Every controllable page (the root site + each product site) is a **template
with editable slots**. The content of those slots lives as JSON in
`LandingContent.content`. The page renders by fetching the JSON from
SuperAdmin and filling the template.

### Slot schema (example for the root InventoryOS site)

```json
{
  "hero": {
    "badge": "InventoryOS",
    "headline1": "ব্যবসাকে সিস্টেমে রূপ দিন,",
    "headline2": "জীবনকে শান্তিতে ভরিয়ে দিন",
    "subtitle": "আপনার ব্যবসার জন্য সম্পূর্ণ ডিজিটাল সলিউশন...",
    "ctaPrimary": "আমাদের পণ্যসমূহ দেখুন",
    "ctaSecondary": "আমাদের কাজ দেখুন",
    "developedBy": "My Creative Code",
    "developedByUrl": "https://mycreativecode.com"
  },
  "mission": {
    "quranVerse": "...",
    "quranTranslation": "...",
    "quranRef": "(সূরা ত্বোয়া-হা: ২৫-২৬)",
    "missionText": "..."
  },
  "vision": {
    "bodyText": "...",
    "subText": "..."
  },
  "footer": {
    "whatsapp": "https://wa.me/8801787492561",
    "facebook": "https://facebook.com/...",
    "email": "...",
    "brandTagline": "আপনার ব্যবসার জন্য সম্পূর্ণ ডিজিটাল সলিউশন"
  },
  "products": "AUTO_FROM_PROJECT_TABLE",
  "showcase": [
    { "name": "nekirjhuri.com", "url": "...", "desc": "..." },
    { "name": "rizqunbd.com",   "url": "...", "desc": "..." }
  ]
}
```

### How the root products section auto-generates

The root page's products grid is **not** hand-edited. When the root page
renders, it calls `GET /api/landing/root` and SuperAdmin merges:

- For each active `Project` where `isRoot=false`:
  - if `landingUrl` set → render a "Live" product card (link = landingUrl)
  - else → render a "Coming soon" card
- Slot data fills in the hero/mission/vision/footer.

**Result:** when you "Add new project" in SuperAdmin, it appears on the root
site's products grid automatically. No content edit needed.

### Public read API (cacheable)

- `GET /api/landing/:key` → returns the `LandingContent.content` JSON for that
  project key (or merged auto-content for `root`). Public, no auth, cached at
  the edge / via `Cache-Control` (e.g. 60s) so a SuperAdmin edit shows up within
  a minute on every visitor's next request.

### Editor UI in SuperAdmin

Under each project sub-menu → "Landing Page" tab → a form with one field per
slot (text inputs, textareas, repeatable lists for features/showcase). Save
writes the JSON. Live preview pane on the right shows the rendered result.

---

## 10. Add new project — the form

```
Project name:           MadrashaOS
Slug/key:              madrasha                (used in URLs + sidebar)
Folder path (VPS):      /var/www/madrasha
App port:              3005
DB type:               sqlite
DB file path:          /var/www/madrasha/db/custom.db
Schema map:
   users table:        users
   email column:       email
   paid column:        is_paid
   name column:        name
   phone column:       phone
   payment table:      payments   (optional)
Default monthly:       500 BDT
Due day of month:      1
bKash number:          017XXXXXXXX
Nagad number:          017XXXXXXXX
Bank account:          .....
Landing URL:           https://inventoryos.xyz/madrasha   (leave blank if not live yet)
Landing content:       (paste-from-template JSON, or start blank)
```

On submit, SuperAdmin:

1. Tests DB connection — `SELECT 1`.
2. Validates the schema map — `SELECT <emailColumn> FROM <usersTable> LIMIT 1`.
3. If both pass → saves `Project` + `ProjectPaymentConfig` + `LandingContent`.
4. Project appears in sidebar immediately.
5. If `landingUrl` set → appears on root site products grid as "Live".

---

## 11. Analytics & server-side details

### Per-project (Overview tab)
- Total clients (count of rows in app's users table, via raw SQL)
- Active vs inactive subscriptions (from SuperAdmin `Subscription` table)
- DB file size — `fs.statSync(project.dbPath).size` formatted MB
- MRR estimate — `monthlyAmount × active_subscriptions`
- Last payment date
- App health — HTTP ping to `http://localhost:<appPort>/api/health`

### Cross-project (Dashboard)
- Total clients across all projects
- Total income this month (sum of `Ledger` credits this month)
- Income by project (bar chart, Recharts)
- Client growth over time (line chart)
- Active vs expired subscriptions (donut)
- Pending payments count (badge in topbar)

### Renewals & Reminders page
- Upcoming renewals (next 7 days)
- Overdue subscriptions (expired, not yet repaid)
- Reminder history per client

### Server health (the VPS itself)
- CPU %, load average — Node `os`
- RAM used/total — `os.totalmem() / os.freemem()`
- Disk used/total — `diskusage` package or `statvfs`
- Uptime
- Per-app disk usage of their folder (`du`-style via recursive fs)
- Shown only to superadmin role

---

## 12. Security

- **SuperAdmin login:** NextAuth credentials provider, strong password, 2FA
  (TOTP) in Phase 2.
- **VPS firewall:** only ports 80/443 open; SuperAdmin DB file `chmod 600`,
  outside web root.
- **Internal endpoints** (if using Layer-B alternative): HMAC-signed with a
  shared secret per project stored in `Project.schemaMap` (or a dedicated
  `Project.apiSecret`).
- **Audit log** for every sensitive action (approve, reject, config edit,
  project create/delete, landing edit).
- **Backups:** daily dump of `superadmin.db` + each app DB to an off-VPS
  location (Phase 2 task).
- **Graceful degradation in apps:** if SuperAdmin is unreachable, each app
  caches "is user paid?" for up to 1 hour so a SuperAdmin outage doesn't lock
  everyone out. (App-side concern; documented here as a requirement.)
- **No plaintext payment credentials** stored; bKash numbers are just
  display strings (not secrets).

---

## 13. Routing on the real VPS (Caddy)

The Caddyfile on the real VPS does **path-based** reverse proxying (this is
*different* from the dev sandbox's `XTransformPort` trick — that's dev-only):

```
inventoryos.xyz {
  handle /SuperAdmin/*   { reverse_proxy localhost:3001 }   # SuperAdmin app
  handle /mudaraba/*      { reverse_proxy localhost:3002 }   # Mudaraba app
  handle /cctv/*          { reverse_proxy localhost:3003 }
  handle /creativecast/*  { reverse_proxy localhost:3004 }
  handle /madrashaos/*    { reverse_proxy localhost:3005 }
  handle /mycreativecode/*{ reverse_proxy localhost:3006 }
  handle /*               { reverse_proxy localhost:3000 }   # root InventoryOS site
}
```

Each app is configured with `basePath` matching its prefix (e.g. Mudaraba's
`next.config.ts` sets `basePath: "/mudaraba"`) so internal links/assets resolve
correctly under the sub-path.

---

## 14. Phased roadmap

### Phase 1 — Prototype in the dev sandbox (build now)

Goal: a fully clickable SuperAdmin demo against **sample/mock data**, proving
every concept before touching the real VPS.

Deliverables:
- SuperAdmin login page (NextAuth, one hardcoded admin for the demo)
- Sidebar with dynamic project list (seeded: Root, Mudaraba, MadrashaOS, CCTV,
  CreativeCast, MyCreativeCode)
- Dashboard (cross-project income, client count, charts — sample data)
- Per-project tabbed view: Overview / Payment Config / Clients / Ledger /
  Landing Page / Settings
- Pending Payments approval queue (with seeded pending requests) — Approve /
  Reject flow that flips mock app DB rows + writes Subscription + Ledger
- Landing Page editor with live preview, serving JSON at
  `GET /api/landing/:key`
- A mocked "root site" page (`/` route) that renders the InventoryOS landing
  page from SuperAdmin content (so editing the editor updates the live page)
- "Add new project" form with schema-map validation (against a sample SQLite
  file we create in the sandbox)
- Mock clients seeded per project; mock pending payments seeded
- All charts/tables populated and interactive
- Lint passes; runs on port 3000

### Phase 2 — Wire to the real VPS

- Deploy SuperAdmin at `inventoryos.xyz/SuperAdmin` (port 3001 in Caddy)
- For each existing app, choose F1 or F2:
  - F1: give SuperAdmin the app's DB path + schema map (no app change)
  - F2: add the one-file internal API route to the app
- Migrate existing clients into the `Client` cross-index (one-time sync job)
- Replace the existing root InventoryOS `page.tsx` with the SuperAdmin-driven
  version (it already looks identical — just sourced from JSON now)
- Set up daily DB backups
- Configure the daily cron for expiry + reminders (systemd timer)

### Phase 3 — Automation & polish

- bKash automated API (replaces manual approval for users who opt in)
- SSO across all apps (one InventoryOS account → all products)
- Automated dunning emails (3 days before, 1 day before, day-of, +3 overdue)
- Mobile-responsive SuperAdmin (approve from phone)
- 2FA for admins
- Per-project role-based access (e.g. a CCTV-only admin)

---

## 15. Phase 1 — file-by-file build order

This is the order the developer should write files in for the Phase 1
prototype. Each step is independently verifiable.

1. **Prisma schema** (`prisma/schema.prisma`) — all models from §5.
2. **Seed script** (`prisma/seed.ts`) — 1 superadmin, 6 projects (incl. root),
   sample clients, sample pending payments, sample ledger entries, sample
   landing content for root + each project.
3. **`db push`** — create `superadmin.db`.
4. **Auth** — NextAuth credentials provider; `/login` page; middleware protecting
   everything under `/SuperAdmin/*` except `/login`.
5. **App shell** — layout with sidebar (dynamic from `Project` table) + topbar
   (pending-payments badge, admin menu).
6. **Dashboard page** — cross-project cards + Recharts (income by project, client
   growth, active vs expired).
7. **Pending Payments page** — table of `PaymentRequest` where status=pending,
   Approve/Reject buttons, toast feedback.
8. **Project sub-pages** — dynamic route `/SuperAdmin/projects/[key]` with tabs:
   - Overview (counts + DB size mock + health ping mock)
   - Payment Config (form → upsert `ProjectPaymentConfig`)
   - Clients (raw-SQL read of a sandbox sample app DB via schema map)
   - Ledger (table filtered by projectId)
   - Landing Page (slot form + live preview)
   - Settings (schema map editor + "Validate mapping" button)
9. **All Clients page** — table of every `Client` with project badge.
10. **Income & Ledgers page** — cross-project totals + monthly chart.
11. **Renewals & Reminders page** — upcoming + overdue lists.
12. **Server Health page** — CPU/RAM/disk/uptime via Node `os`.
13. **Audit Log page** — table of every audit entry.
14. **Add Project form** — full validation, on save appears in sidebar + on root
    products grid.
15. **Public landing API** — `GET /api/landing/:key` (returns content JSON, with
    `root` special-cased to merge auto-generated products list).
16. **Root site page** (`src/app/page.tsx`) — replace static content with a fetch
    to `/api/landing/root` and render the InventoryOS template from that JSON.
    (Visually identical to the repo you shared — just data-driven now.)
17. **Lint + smoke test** — every page renders, every Approve works, every
    landing edit reflects on the root page.

---

## 16. Sample data to seed for Phase 1

- 1 admin: `admin@inventoryos.xyz` / `admin123` (demo only)
- 6 projects: `root`, `mudaraba`, `madrasha`, `cctv`, `creativecast`, `mycreativecode`
- Per non-root project: 8–20 mock clients, ~60% with active subscriptions,
  ~10% expired, a few pending payments queued for approval
- Ledger: 3 months of credits per active subscription
- Landing content: root = the InventoryOS repo's current Bengali content (so the
  prototype root page looks just like the repo's `page.tsx`); each product = a
  short hero+features JSON
- 1 mock app SQLite file (`/home/z/my-project/sample-apps/mudaraba.db`) with a
  `users(email, name, phone, is_paid)` table + 5 rows, so the schema-map read
  and the "flip paid on approve" both really work end-to-end in the sandbox.

---

## 17. Definition of done (Phase 1)

The prototype is done when all of the following are true:

- [ ] Admin can log in to `/SuperAdmin` and see a sidebar listing all 6 projects.
- [ ] Dashboard shows cross-project income, client counts, and at least 3 charts.
- [ ] Pending Payments page lists seeded requests; Approve flips a mock app's
      `is_paid` column to 1, creates a Subscription, writes a Ledger credit,
      and logs to AuditLog.
- [ ] Each project's Payment Config tab edits bKash number + monthly amount and
      the change persists.
- [ ] Each project's Clients tab lists users read via raw SQL through the
      schema map from the sample app DB.
- [ ] Each project's Landing Page tab edits slot content; saving changes what
      `GET /api/landing/:key` returns.
- [ ] The root `/` page renders the InventoryOS landing page from
      `GET /api/landing/root` and editing the root's editor updates the live
      page within the cache TTL.
- [ ] Adding a new project via the form validates the sample DB + schema map,
      and the project instantly appears in the sidebar and (if live) on the
      root page's products grid.
- [ ] Audit Log page records every approve / reject / config edit / landing edit.
- [ ] `bun run lint` passes with no errors.
- [ ] App runs on port 3000 with no runtime errors in `dev.log`.

---

## 18. Open decisions (the user must answer these before Phase 2)

1. **Gating model:** F1 (SuperAdmin writes app's `paid` flag — no app change)
   or F2 (app asks SuperAdmin on login — ~30 lines per app)? Recommended: F1
   now, F2 later.
2. **Does every existing app already have a `paid`/`is_paid` boolean column on
   its users table?** If not, we add one — small migration per app.
3. **Renewal policy:** grace period in days before an expired subscription is
   fully blocked? (Suggested: 0 days hard block, but show "overdue" banner.)
4. **Reminder channels:** email only for now, or also SMS via a gateway?
5. **Currency:** BDT only, or multi-currency later?
6. **SSO across apps in Phase 3 — yes or no?** (Affects how we design
   `Client.email` uniqueness now.)
7. **Backup target:** where should nightly `superadmin.db` dumps go?
   (S3 bucket? Another VPS? Email?)
8. **bKash automated API in Phase 3:** do you have / will you get a merchant
   bKash account for automated reconciliation?

---

## 19. Risks & mitigations

| Risk | Mitigation |
|---|---|
| SuperAdmin down → all apps lock users out | Apps cache "paid" status for 1h; degrade gracefully |
| Manual approval won't scale past ~hundreds of users/month | Phase 3 introduces bKash automated API |
| Schema drift in an app breaks SuperAdmin reads | "Validate mapping" button per project; audit log on every read error |
| Single admin = single point of trust compromise | 2FA in Phase 2; IP allowlist on VPS firewall; full audit log |
| Cross-business client data集中 in one DB | Encrypt `superadmin.db` at rest (Phase 2); strict admin role separation |
| Raw SQL writes to app DBs corrupt data | Only write to the documented `paidColumn`; never write arbitrary columns; wrap every write in a transaction + audit log |
| Root site products grid grows huge as you add projects | Cap displayed cards at 12 with "view all" link; order by `active` then `createdAt` |

---

## 20. Summary (the one-paragraph version)

Build one Next.js app called **SuperAdmin** with its own Prisma/SQLite DB that
is the source of truth for projects, payment config, pending approvals,
subscriptions, ledgers, client index, landing content, and audit log. It reaches
into each product app's existing SQLite DB via `better-sqlite3` + a per-project
schema map (no app code change needed) to read clients and flip the `paid` flag
on approval. The **root `inventoryos.xyz` site is treated as a special project
(`isRoot=true`)** whose content slots (hero, mission, dua, footer, products
grid) are editable from the same panel, and whose products grid is auto-generated
from the `Project` table so adding a new project instantly surfaces it on the
mother site. Phase 1 = a fully clickable prototype with seeded sample data in
the dev sandbox; Phase 2 = wire it to the real VPS apps; Phase 3 = automate
bKash, SSO, dunning.

---

*End of plan. No code in this document. Begin Phase 1 build from §15.*
