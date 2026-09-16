// Renewals & Reminders API — plan §8 step H+I.
// GET  /api/renewals      → upcoming renewals (≤7 days) + overdue (expired) + reminder history (30d)
// POST /api/renewals      → record a manual call reminder: writes ReminderLog + AuditLog.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentAdmin } from "@/lib/auth"
import { writeAudit } from "@/server/audit"

export const runtime = "nodejs"

const SEVEN_DAYS_MS = 7 * 86400000
const THIRTY_DAYS_MS = 30 * 86400000

export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const now = new Date()
  const horizon = new Date(now.getTime() + SEVEN_DAYS_MS)

  // Active subs ending within 7 days → upcoming renewals queue.
  const upcomingRows = await db.subscription.findMany({
    where: {
      status: "active",
      cycleEnd: { gte: now, lte: horizon },
    },
    include: {
      client: { select: { email: true, name: true, phone: true } },
      project: { select: { id: true, key: true, name: true, color: true, icon: true } },
    },
    orderBy: { cycleEnd: "asc" },
    take: 100,
  })

  // Expired subs → overdue queue (clients to chase).
  const overdueRows = await db.subscription.findMany({
    where: { status: "expired" },
    include: {
      client: { select: { email: true, name: true, phone: true } },
      project: { select: { id: true, key: true, name: true, color: true, icon: true } },
    },
    orderBy: { cycleEnd: "desc" },
    take: 100,
  })

  // Recent reminder history (last 30 days) for the stat card.
  const since = new Date(now.getTime() - THIRTY_DAYS_MS)
  const remindersCount = await db.reminderLog.count({
    where: { sentAt: { gte: since } },
  })

  // Last reminder per overdue subscription — lookup batch.
  const overdueIds = overdueRows.map((s) => s.id)
  const lastReminderRows = await db.reminderLog.findMany({
    where: { subscriptionId: { in: overdueIds } },
    orderBy: { sentAt: "desc" },
  })
  const lastReminderBySub: Record<string, Date> = {}
  for (const r of lastReminderRows) {
    if (!lastReminderBySub[r.subscriptionId]) {
      lastReminderBySub[r.subscriptionId] = r.sentAt
    }
  }

  // Recent reminder history items (last 20, newest first) for optional display.
  const recentReminders = await db.reminderLog.findMany({
    where: { sentAt: { gte: since } },
    orderBy: { sentAt: "desc" },
    take: 20,
    select: { id: true, subscriptionId: true, channel: true, result: true, sentAt: true },
  })

  const upcoming = upcomingRows.map((s) => ({
    id: s.id,
    clientEmail: s.client.email,
    clientName: s.client.name,
    clientPhone: s.client.phone,
    projectId: s.project.id,
    projectKey: s.project.key,
    projectName: s.project.name,
    projectColor: s.project.color,
    projectIcon: s.project.icon,
    cycleEnd: s.cycleEnd,
    daysUntil: Math.ceil((s.cycleEnd.getTime() - now.getTime()) / 86400000),
  }))

  const overdue = overdueRows.map((s) => ({
    id: s.id,
    clientEmail: s.client.email,
    clientName: s.client.name,
    clientPhone: s.client.phone,
    projectId: s.project.id,
    projectKey: s.project.key,
    projectName: s.project.name,
    projectColor: s.project.color,
    projectIcon: s.project.icon,
    cycleEnd: s.cycleEnd,
    lastReminder: lastReminderBySub[s.id] ?? null,
  }))

  return NextResponse.json({
    upcoming,
    overdue,
    remindersCount,
    recentReminders,
  })
}

export async function POST(req: Request) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  try {
    const { subscriptionId, action } = await req.json()
    if (!subscriptionId || action !== "call") {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 })
    }

    const sub = await db.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        client: { select: { email: true } },
        project: { select: { key: true, name: true } },
      },
    })
    if (!sub) return NextResponse.json({ error: "subscription not found" }, { status: 404 })

    await db.reminderLog.create({
      data: {
        subscriptionId: sub.id,
        channel: "call",
        result: "called",
        sentAt: new Date(),
      },
    })

    await writeAudit(admin, "reminder.call", sub.id, {
      project: sub.project.key,
      email: sub.client.email,
      channel: "call",
      result: "called",
    })

    return NextResponse.json({ ok: true, channel: "call", result: "called" })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "action failed" }, { status: 500 })
  }
}
