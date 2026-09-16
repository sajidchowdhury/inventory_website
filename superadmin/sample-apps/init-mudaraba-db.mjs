// Phase 2 demo: create a REAL standalone SQLite DB that stands in for the
// Mudaraba product app's own `users` table on the VPS. This file is what
// SuperAdmin's cross-db layer reads/writes via node:sqlite + the schema map.
//
// On the real VPS, this file would be /var/www/mudaraba/db/custom.db owned by
// the Mudaraba app; SuperAdmin just needs read+write filesystem permissions.
//
// Run with NODE (not bun):  node sample-apps/init-mudaraba-db.mjs   (idempotent)

import { DatabaseSync } from "node:sqlite"
import { mkdirSync, existsSync, rmSync } from "node:fs"
import { resolve } from "node:path"

const dir = resolve(process.cwd(), "sample-apps")
mkdirSync(dir, { recursive: true })
const dbPath = resolve(dir, "mudaraba.db")

// remove old file + WAL/SHM sidecars so the script is idempotent
for (const ext of ["", "-wal", "-shm"]) {
  const p = dbPath + ext
  if (existsSync(p)) rmSync(p)
}

const db = new DatabaseSync(dbPath)
db.exec("PRAGMA journal_mode = WAL;")
db.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    phone TEXT,
    is_paid INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`)

const users = [
  ["rahim.mudaraba@demo.com", "Rahim Ahmed", "01711122233", 0], // UNPAID — flipped on approval in the demo
  ["karim.mudaraba@demo.com", "Karim Hossain", "01722233344", 1],
  ["fatema.mudaraba@demo.com", "Fatema Akter", "01733344556", 1],
  ["abdullah.mudaraba@demo.com", "Abdullah Islam", "01744455667", 0],
  ["ayesha.mudaraba@demo.com", "Ayesha Begum", "01755566778", 1],
  ["sadia.mudaraba@demo.com", "Sadia Akter", "01766677889", 1],
]

const insert = db.prepare("INSERT INTO users (email, name, phone, is_paid) VALUES (?, ?, ?, ?)")
for (const [email, name, phone, isPaid] of users) {
  insert.run(email, name, phone, isPaid)
}

const count = db.prepare("SELECT COUNT(*) AS n FROM users").get()
const unpaid = db.prepare("SELECT email FROM users WHERE is_paid = 0").all()
console.log(`✓ created ${dbPath}`)
console.log(`  users: ${count.n}`)
console.log(`  unpaid (flipped on approval): ${unpaid.map((u) => u.email).join(", ")}`)
db.close()
