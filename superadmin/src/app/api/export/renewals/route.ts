// Export overdue + upcoming renewals as CSV (for the call/email dunning list).
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentAdmin } from "@/lib/auth"
import { rowsToCsv } from "@/lib/csv"

export const runtime = "nodejs"

const DAY = 86400000

export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const now = new Date()
  const in7 = new Date(now.getTime() + 7 * DAY)

  const upcoming = await db.subscription.findMany({
    where: { status: "active", cycleEnd: { gte: now, lte: in7 } },
    include: { client: { select: { email: true, name: true, phone: true } }, project: { select: { key: true, name: true } } },
    orderBy: { cycleEnd: "asc" },
  })
  const overdue = await db.subscription.findMany({
    where: { status: "expired", cycleEnd: { lt: now } },
    include: { client: { select: { email: true, name: true, phone: true } }, project: { select: { key: true, name: true } } },
    orderBy: { cycleEnd: "asc" },
  })

  const rows: Array<Array<string | number | null>> = [
    ["Status", "Project Key", "Project Name", "Client Email", "Client Name", "Phone", "Cycle End", "Days"],
  ]
  for (const s of overdue) {
    rows.push([
      "overdue",
      s.project.key,
      s.project.name,
      s.client.email,
      s.client.name || "",
      s.client.phone || "",
      s.cycleEnd.toISOString().slice(0, 10),
      Math.ceil((now.getTime() - s.cycleEnd.getTime()) / DAY),
    ])
  }
  for (const s of upcoming) {
    rows.push([
      "upcoming",
      s.project.key,
      s.project.name,
      s.client.email,
      s.client.name || "",
      s.client.phone || "",
      s.cycleEnd.toISOString().slice(0, 10),
      Math.ceil((s.cycleEnd.getTime() - now.getTime()) / DAY),
    ])
  }

  const csv = rowsToCsv(rows)
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="renewals-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
