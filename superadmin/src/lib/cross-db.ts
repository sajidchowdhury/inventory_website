// Cross-app DB helper. Reads each product app's existing SQLite DB via raw SQL
// using the per-project schema map — see plan §6.
//
// PHASE 2: this now reads/writes the project's REAL .db file using node:sqlite
// (DatabaseSync, built into Node 24+ — no native build, no extra deps).
// Falls back to the MockAppUser mirror inside superadmin.db for any project
// whose dbPath doesn't exist on disk (i.e. an app not yet wired in Phase 2).
//
// On the real VPS, each app's dbPath points to /var/www/<app>/db/custom.db and
// SuperAdmin needs read+write filesystem permissions on that file. SQLite WAL
// mode is recommended so the app's own process and SuperAdmin don't block each
// other (see PHASE2_VPS_DEPLOYMENT.md).
//
// To swap node:sqlite for better-sqlite3 on older Node, the API is nearly
// identical: new Database(path) / db.prepare(sql).all() / .run() — drop-in.

import { db } from "@/lib/db"
import { existsSync, statSync } from "node:fs"
import { resolve } from "node:path"

// node:sqlite (Node 24+ built-in) is loaded LAZILY via direct eval so Turbopack
// can't statically see the `require("node:sqlite")` call and fail to resolve it
// ("Unsupported external type Url for commonjs reference"). Direct eval runs in
// module scope where CJS `require` is available. Lazy = only routes that
// actually read/write a real .db trigger the load; parseSchemaMap and other
// pure helpers never touch it.
//
// To swap to better-sqlite3 on older Node: same API — new Database(path) /
// db.prepare(sql).all() | .get() | .run(). Just change the require target.
let _DatabaseSyncCtor: any = null
function openDb(path: string, opts: { readOnly?: boolean } = {}) {
  if (!_DatabaseSyncCtor) {
    _DatabaseSyncCtor = eval("require")("node:sqlite").DatabaseSync
  }
  return new _DatabaseSyncCtor(path, opts)
}

export type SchemaMap = {
  usersTable?: string
  emailColumn?: string
  paidColumn?: string
  paidColumnType?: "boolean" | "int"
  nameColumn?: string
  phoneColumn?: string
  paymentTable?: string
  paymentColumns?: Record<string, string>
}

export type AppUser = {
  email: string
  name: string | null
  phone: string | null
  isPaid: boolean
}

// Reject anything that isn't a simple SQL identifier — schema maps are
// admin-controlled (not public input) but we still don't interpolate garbage.
function ident(s: string | undefined | null): string | null {
  if (!s) return null
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s) ? s : null
}

export function parseSchemaMap(raw: string): SchemaMap {
  try {
    return JSON.parse(raw || "{}") as SchemaMap
  } catch {
    return {}
  }
}

function resolveDbPath(dbPath: string | null | undefined): string | null {
  if (!dbPath) return null
  const p = dbPath.startsWith("/")
    ? dbPath
    : resolve(process.cwd(), dbPath)
  return existsSync(p) ? p : null
}

type ResolvedProject = {
  project: { id: string; dbPath: string | null; schemaMap: string }
  schema: SchemaMap
  realPath: string | null
}

async function resolveProject(projectId: string): Promise<ResolvedProject | null> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, dbPath: true, schemaMap: true },
  })
  if (!project) return null
  const schema = parseSchemaMap(project.schemaMap)
  const realPath = resolveDbPath(project.dbPath)
  // only use the real .db if we have a valid users table + email column too
  if (realPath && ident(schema.usersTable) && ident(schema.emailColumn)) {
    return { project, schema, realPath }
  }
  return { project, schema, realPath: null }
}

/**
 * List users of a project's app DB via the schema map.
 * Real .db → SELECT <email>,<name>,<phone>,<paid> FROM <usersTable>
 * Fallback → MockAppUser mirror (Phase 1 behavior).
 */
export async function listAppUsers(projectId: string): Promise<AppUser[]> {
  const ctx = await resolveProject(projectId)
  if (!ctx) return []

  if (ctx.realPath) {
    const usersTable = ident(ctx.schema.usersTable)!
    const emailCol = ident(ctx.schema.emailColumn)!
    const nameCol = ident(ctx.schema.nameColumn) || "name"
    const phoneCol = ident(ctx.schema.phoneColumn) || "phone"
    const paidCol = ident(ctx.schema.paidColumn) || "is_paid"
    const sqlite = openDb(ctx.realPath, { readOnly: true })
    try {
      const rows = sqlite
        .prepare(
          `SELECT ${emailCol} AS email, ${nameCol} AS name, ${phoneCol} AS phone, ${paidCol} AS is_paid FROM ${usersTable}`
        )
        .all() as Array<{ email: string; name: string | null; phone: string | null; is_paid: number | string | boolean }>
      return rows.map((r) => ({
        email: r.email,
        name: r.name ?? null,
        phone: r.phone ?? null,
        isPaid: Boolean(r.is_paid),
      }))
    } finally {
      sqlite.close()
    }
  }

  // fallback to MockAppUser mirror
  const rows = await db.mockAppUser.findMany({ where: { projectId } })
  return rows.map((r) => ({
    email: r.email,
    name: r.name,
    phone: r.phone,
    isPaid: r.isPaid,
  }))
}

/**
 * Flip a user's paid flag in their app's DB.
 * Real .db → UPDATE <usersTable> SET <paid>=? WHERE <email>=?
 * Fallback → MockAppUser update.
 */
export async function flipAppUserPaid(
  projectId: string,
  email: string,
  paid: boolean
): Promise<boolean> {
  const ctx = await resolveProject(projectId)
  if (!ctx) return false

  if (ctx.realPath) {
    const usersTable = ident(ctx.schema.usersTable)!
    const emailCol = ident(ctx.schema.emailColumn)!
    const paidCol = ident(ctx.schema.paidColumn) || "is_paid"
    const sqlite = openDb(ctx.realPath)
    try {
      const stmt = sqlite.prepare(
        `UPDATE ${usersTable} SET ${paidCol} = ? WHERE ${emailCol} = ?`
      )
      const res = stmt.run(paid ? 1 : 0, email)
      return (res as unknown as { changes: number }).changes > 0
    } finally {
      sqlite.close()
    }
  }

  const existing = await db.mockAppUser.findFirst({
    where: { projectId, email },
  })
  if (!existing) return false
  await db.mockAppUser.update({
    where: { id: existing.id },
    data: { isPaid: paid },
  })
  return true
}

/**
 * Validate that a schema map can read a project's DB.
 * Real .db → SELECT <email> FROM <usersTable> LIMIT 1
 * Fallback → MockAppUser sample.
 */
export async function validateSchemaMap(
  projectId: string
): Promise<{ ok: boolean; sampleEmail?: string; error?: string; source: "real" | "mirror" }> {
  const ctx = await resolveProject(projectId)
  if (!ctx) return { ok: false, error: "project not found", source: "mirror" }

  if (ctx.realPath) {
    const usersTable = ident(ctx.schema.usersTable)
    const emailCol = ident(ctx.schema.emailColumn)
    if (!usersTable || !emailCol) {
      return { ok: false, error: "schema map missing usersTable or emailColumn", source: "real" }
    }
    const sqlite = openDb(ctx.realPath, { readOnly: true })
    try {
      const row = sqlite.prepare(`SELECT ${emailCol} AS email FROM ${usersTable} LIMIT 1`).get() as
        | { email: string }
        | undefined
      return { ok: true, sampleEmail: row?.email, source: "real" }
    } catch (e: any) {
      return { ok: false, error: e?.message || "query failed", source: "real" }
    } finally {
      sqlite.close()
    }
  }

  try {
    const sample = await db.mockAppUser.findFirst({ where: { projectId } })
    return { ok: true, sampleEmail: sample?.email ?? undefined, source: "mirror" }
  } catch (e: any) {
    return { ok: false, error: e?.message || "validation failed", source: "mirror" }
  }
}

/**
 * DB file size of a project (bytes).
 * Real .db → fs.statSync(dbPath).size
 * Fallback → heuristic estimate.
 */
export async function getAppDbSize(projectId: string): Promise<number> {
  const ctx = await resolveProject(projectId)
  if (!ctx) return 0
  if (ctx.realPath) {
    try {
      return statSync(ctx.realPath).size
    } catch {
      return 0
    }
  }
  const count = await db.mockAppUser.count({ where: { projectId } })
  return 24576 + count * 512
}
