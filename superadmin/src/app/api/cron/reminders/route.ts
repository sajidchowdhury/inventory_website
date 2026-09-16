// Cron: dunning emails — 3 days before, 1 day before, day-of, +3 days overdue.
// Phase 3: now actually sends emails via src/lib/email.ts (SMTP if configured,
// else logs to /tmp/inventoryos-emails.log). Dedup per (subscription, tier).
// Plan §8 step I. Triggered by the dashboard "System Jobs" card OR a systemd
// timer (X-Cron-Secret header).
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentAdmin } from "@/lib/auth"
import { writeAudit } from "@/server/audit"
import { sendEmail, dunningEmail } from "@/lib/email"

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

const DAY = 86400000

// tier → { daysUntil, label, action }
const TIERS = [
  { tier: "dunning-3d", at: 3, daysLabel: "৩ দিনের মধ্যে", action: "এখনই পেমেন্ট করলে পরবর্তী মাস নিরবচ্ছিন্ন চলবে।" },
  { tier: "dunning-1d", at: 1, daysLabel: "আগামীকাল", action: "আগামীকালের মধ্যে পেমেন্ট করুন, নাহলে সাবস্ক্রিপশন স্থগিত হবে।" },
  { tier: "dunning-0d", at: 0, daysLabel: "আজ", action: "আজই পেমেন্ট করুন — নাহলে লগইন বন্ধ হয়ে যাবে।" },
]

export async function POST(req: Request) {
  const actor = await authorized(req)
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const now = new Date()
  let sent = 0
  let failed = 0
  const perTier: Record<string, number> = {}

  // Active subs expiring today/soon
  const upcoming = await db.subscription.findMany({
    where: { status: "active", cycleEnd: { gte: new Date(now.getTime() - 3 * DAY), lte: new Date(now.getTime() + 3 * DAY) } },
    include: {
      client: { select: { email: true, name: true } },
      project: { select: { key: true, name: true, paymentConfig: true } },
    },
  })

  for (const sub of upcoming) {
    const daysUntil = Math.ceil((sub.cycleEnd.getTime() - now.getTime()) / DAY)
    for (const t of TIERS) {
      if (daysUntil !== t.at) continue
      // dedup
      const already = await db.reminderLog.findFirst({
        where: { subscriptionId: sub.id, tier: t.tier },
      })
      if (already) continue
      const cfg = sub.project.paymentConfig
      const payload = dunningEmail({
        clientName: sub.client.name,
        clientEmail: sub.client.email,
        projectName: sub.project.name,
        monthlyAmount: cfg?.monthlyAmount ?? 0,
        currency: cfg?.currency ?? "BDT",
        bkashNumber: cfg?.bkashNumber ?? null,
        daysLabel: t.daysLabel,
        action: t.action,
      })
      const res = await sendEmail(payload)
      await db.reminderLog.create({
        data: {
          subscriptionId: sub.id,
          channel: "email",
          tier: t.tier,
          result: res.ok ? `sent (${res.mode})` : `failed: ${res.error}`,
          sentAt: now,
        },
      })
      if (res.ok) {
        sent++
        perTier[t.tier] = (perTier[t.tier] || 0) + 1
      } else {
        failed++
      }
    }
  }

  // +3 days overdue → tier "dunning-overdue3"
  const overdue3 = await db.subscription.findMany({
    where: {
      status: "expired",
      cycleEnd: { gte: new Date(now.getTime() - 4 * DAY), lt: new Date(now.getTime() - 2 * DAY) },
    },
    include: {
      client: { select: { email: true, name: true } },
      project: { select: { key: true, name: true, paymentConfig: true } },
    },
  })
  for (const sub of overdue3) {
    const already = await db.reminderLog.findFirst({
      where: { subscriptionId: sub.id, tier: "dunning-overdue3" },
    })
    if (already) continue
    const cfg = sub.project.paymentConfig
    const payload = dunningEmail({
      clientName: sub.client.name,
      clientEmail: sub.client.email,
      projectName: sub.project.name,
      monthlyAmount: cfg?.monthlyAmount ?? 0,
      currency: cfg?.currency ?? "BDT",
      bkashNumber: cfg?.bkashNumber ?? null,
      daysLabel: "৩ দিন পার হয়েছে",
      action: "অবিলম্বে পেমেন্ট করুন — অ্যাডমিন আপনাকে কল করতে পারেন।",
    })
    const res = await sendEmail(payload)
    await db.reminderLog.create({
      data: {
        subscriptionId: sub.id,
        channel: "email",
        tier: "dunning-overdue3",
        result: res.ok ? `sent (${res.mode})` : `failed: ${res.error}`,
        sentAt: now,
      },
    })
    if (res.ok) {
      sent++
      perTier["dunning-overdue3"] = (perTier["dunning-overdue3"] || 0) + 1
    } else {
      failed++
    }
  }

  // overdue count for admin to call
  const weekAgo = new Date(now.getTime() - 7 * DAY)
  const overdueForCall = await db.subscription.count({
    where: { status: "expired", cycleEnd: { gte: weekAgo, lt: now } },
  })

  await writeAudit(actor, "cron.reminders", `${sent} sent, ${failed} failed, ${overdueForCall} overdue`)
  return NextResponse.json({ ok: true, sent, failed, perTier, overdueForCall, at: now })
}
