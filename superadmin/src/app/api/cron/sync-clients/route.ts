// Cron: sync each wired project's real app users into the Client cross-index.
// This keeps the All Clients / dashboard views consistent with each app's own
// live users table. Plan §6 + §11. Phase 2 migration job.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentAdmin } from "@/lib/auth"
import { listAppUsers } from "@/lib/cross-db"
import { writeAudit } from "@/server/audit"

export const runtime = "nodejs"

const CRON_SECRET = process.env.CRON_SECRET || "inventoryos-cron-dev"

async function authorized(req: Request) {
  const admin = await getCurrentAdmin()
  if (admin) return admin
  const secret = req.headers.get("x-cron-secret")
  if (secret && secret === CRON_SECRET) {
    return { id: "cron", email: "cron@inventoryos.xyz", name: null, role: "system" }
  }
  return null
}

export async function POST(req: Request) {
  const actor = await authorized(req)
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const projects = await db.project.findMany({
    where: { isRoot: false, active: true },
    select: { id: true, key: true, name: true, dbPath: true },
  })

  const perProject: Array<{ key: string; name: string; read: number; upserted: number; source: string }> = []
  let totalUpserted = 0

  for (const p of projects) {
    try {
      const users = await listAppUsers(p.id)
      let upserted = 0
      for (const u of users) {
        await db.client.upsert({
          where: { projectId_email: { projectId: p.id, email: u.email } },
          update: { name: u.name ?? undefined, phone: u.phone ?? undefined },
          create: { projectId: p.id, email: u.email, name: u.name ?? undefined, phone: u.phone ?? undefined },
        })
        upserted++
      }
      totalUpserted += upserted
      perProject.push({
        key: p.key,
        name: p.name,
        read: users.length,
        upserted,
        source: p.dbPath ? "real-db" : "mirror",
      })
    } catch (e: any) {
      perProject.push({ key: p.key, name: p.name, read: 0, upserted: 0, source: `error: ${e?.message}` })
    }
  }

  await writeAudit(actor, "cron.sync-clients", `${totalUpserted} clients synced`)
  return NextResponse.json({ ok: true, totalUpserted, perProject, at: new Date() })
}
