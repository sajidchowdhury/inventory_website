// Income & Ledgers — cross-project ledger + monthly income series.
//
// GET /api/ledger
//   ?series=monthly         → { series: [{month, amount}], total }
//                             (last 6 months of CREDIT entries; projectId filterable)
//   ?projectId=<id>&type=credit|debit|all&skip=<n>
//                           → { entries: [...], total, incomeThisMonth, mrr }
//                             (entries newest-first, capped at 100 per page)
//
// All responses respect the authed admin (401 otherwise). Read-only — no audit
// write needed here; the approval flow in /api/payments writes the ledger rows.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentAdmin } from "@/lib/auth"

export const runtime = "nodejs"

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export async function GET(req: Request) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const projectId = url.searchParams.get("projectId")
  const typeParam = url.searchParams.get("type") // credit | debit | all | null
  const series = url.searchParams.get("series")
  const skip = Math.max(0, Number(url.searchParams.get("skip") || 0))

  const projectFilter = projectId ? { projectId } : {}
  const typeFilter = typeParam && typeParam !== "all" ? { type: typeParam } : {}

  // ---- monthly series mode --------------------------------------------------
  if (series === "monthly") {
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const credits = await db.ledger.findMany({
      where: {
        ...projectFilter,
        type: "credit",
        createdAt: { gte: sixMonthsAgo },
      },
      select: { amount: true, createdAt: true },
    })

    const buckets: Record<string, number> = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      buckets[monthKey(d)] = 0
    }
    let total = 0
    for (const c of credits) {
      const mk = monthKey(c.createdAt)
      if (mk in buckets) {
        buckets[mk] += c.amount
        total += c.amount
      }
    }

    const out = Object.entries(buckets).map(([k, v]) => {
      const [, m] = k.split("-").map(Number)
      return { month: MONTH_NAMES[m - 1], amount: v }
    })

    return NextResponse.json({ series: out, total })
  }

  // ---- entries mode ---------------------------------------------------------
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const where = { ...projectFilter, ...typeFilter }

  const [entries, total, monthCredits, projects] = await Promise.all([
    db.ledger.findMany({
      where,
      include: {
        project: { select: { key: true, name: true, color: true, icon: true } },
        client: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      skip,
    }),
    db.ledger.count({ where }),
    db.ledger.aggregate({
      where: { ...projectFilter, type: "credit", createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    db.project.findMany({
      where: {
        isRoot: false,
        active: true,
        ...(projectId ? { id: projectId } : {}),
      },
      include: {
        paymentConfig: { select: { monthlyAmount: true } },
        _count: {
          select: { subscriptions: { where: { status: "active" } } },
        },
      },
    }),
  ])

  const mrr = projects.reduce(
    (s, p) => s + (p.paymentConfig?.monthlyAmount ?? 0) * p._count.subscriptions,
    0,
  )

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      projectId: e.projectId,
      projectKey: e.project.key,
      projectName: e.project.name,
      projectColor: e.project.color,
      projectIcon: e.project.icon,
      type: e.type,
      amount: e.amount,
      reason: e.reason,
      txId: e.txId,
      createdAt: e.createdAt.toISOString(),
      clientEmail: e.client?.email ?? null,
    })),
    total,
    incomeThisMonth: monthCredits._sum.amount ?? 0,
    mrr,
  })
}
