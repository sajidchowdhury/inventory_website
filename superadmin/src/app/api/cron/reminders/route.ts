// Cron: send reminders for subscriptions about to expire + flag overdue ones.
// Phase 1/sandbox: email is a STUB — we just write a ReminderLog row proving
// the job ran. On the real VPS, swap the stub for an actual SMTP send (or a
// transactional email service). Plan §8 step I.
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
  const in3days = new Date(now.getTime() + 3 * 86400000)

  // active subs expiring within 3 days → email reminder (stub: log only)
  const upcoming = await db.subscription.findMany({
    where: { status: "active", cycleEnd: { gte: now, lte: in3days } },
    include: { client: { select: { email: true } } },
  })
  let sent = 0
  for (const sub of upcoming) {
    await db.reminderLog.create({
      data: {
        subscriptionId: sub.id,
        channel: "email",
        result: `sent (stub) — expiring ${sub.cycleEnd.toISOString().slice(0, 10)}`,
        sentAt: now,
      },
    })
    sent++
  }

  // overdue (expired ≤7 days) → flag for admin to call
  const weekAgo = new Date(now.getTime() - 7 * 86400000)
  const overdue = await db.subscription.count({
    where: { status: "expired", cycleEnd: { gte: weekAgo, lt: now } },
  })

  await writeAudit(actor, "cron.reminders", `${sent} reminders, ${overdue} overdue`)
  return NextResponse.json({ ok: true, remindersSent: sent, overdueForCall: overdue, at: now })
}
