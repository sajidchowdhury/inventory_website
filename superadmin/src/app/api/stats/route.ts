// Dashboard aggregates — one call returns everything the dashboard view needs.
// See plan §11 (per-project + cross-project analytics).
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentAdmin } from "@/lib/auth"
import { getAppDbSize } from "@/lib/cross-db"

export const runtime = "nodejs"

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const [
    totalClients,
    activeSubs,
    expiredSubs,
    pendingPayments,
    monthCredits,
    allCredits,
    projects,
  ] = await Promise.all([
    db.client.count(),
    db.subscription.count({ where: { status: "active" } }),
    db.subscription.count({ where: { status: "expired" } }),
    db.paymentRequest.count({ where: { status: "pending" } }),
    db.ledger.aggregate({
      where: { type: "credit", createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    db.ledger.findMany({
      where: { type: "credit", createdAt: { gte: sixMonthsAgo } },
      select: { amount: true, createdAt: true, projectId: true },
    }),
    db.project.findMany({
      where: { isRoot: false, active: true },
      include: {
        paymentConfig: true,
        _count: { select: { clients: true, payments: { where: { status: "pending" } } } },
      },
    }),
  ])

  // income by project (this month)
  const incomeByProject: Record<string, number> = {}
  // client growth (last 6 months)
  const monthBuckets: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthBuckets[monthKey(d)] = 0
  }
  for (const c of allCredits) {
    const mk = monthKey(c.createdAt)
    if (mk in monthBuckets) monthBuckets[mk] += c.amount
    incomeByProject[c.projectId] = (incomeByProject[c.projectId] || 0) + c.amount
  }

  const clientGrowth = Object.entries(monthBuckets).map(([k, v]) => {
    const [y, m] = k.split("-").map(Number)
    return { month: MONTH_NAMES[m - 1], income: v }
  })

  const projectRows = await Promise.all(
    projects.map(async (p) => {
      const activeCount = await db.subscription.count({
        where: { projectId: p.id, status: "active" },
      })
      const dbSize = await getAppDbSize(p.id)
      return {
        id: p.id,
        key: p.key,
        name: p.name,
        icon: p.icon,
        color: p.color,
        landingUrl: p.landingUrl,
        clientCount: p._count.clients,
        activeCount,
        pendingCount: p._count.payments,
        monthlyAmount: p.paymentConfig?.monthlyAmount ?? 0,
        incomeThisMonth: incomeByProject[p.id] || 0,
        dbSize,
        mrr: (p.paymentConfig?.monthlyAmount ?? 0) * activeCount,
      }
    })
  )

  // income by project for the bar chart
  const incomeChart = projectRows
    .map((p) => ({ name: p.name.replace(/ .*/, ""), amount: p.incomeThisMonth, color: p.color }))
    .sort((a, b) => b.amount - a.amount)

  return NextResponse.json({
    totals: {
      totalClients,
      activeSubs,
      expiredSubs,
      pendingPayments,
      incomeThisMonth: monthCredits._sum.amount ?? 0,
      mrr: projectRows.reduce((s, p) => s + p.mrr, 0),
    },
    clientGrowth,
    incomeChart,
    projects: projectRows,
  })
}
