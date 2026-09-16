// Cron: expire subscriptions past their cycleEnd.
// Triggered by: the dashboard "System Jobs" card (admin session) OR a systemd
// timer on the VPS (X-Cron-Secret header). Plan §8 step H.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentAdmin } from "@/lib/auth"
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

  const now = new Date()
  const expired = await db.subscription.updateMany({
    where: { status: "active", cycleEnd: { lt: now } },
    data: { status: "expired" },
  })
  await writeAudit(actor, "cron.expire", `${expired.count} subscriptions`)
  return NextResponse.json({ ok: true, expired: expired.count, at: now })
}
