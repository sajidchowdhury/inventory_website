// Export all clients cross-project as CSV. Admin-authed. Serves the "call
// overdue clients" workflow — the user downloads this + phones them.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentAdmin } from "@/lib/auth"
import { rowsToCsv } from "@/lib/csv"

export const runtime = "nodejs"

export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const clients = await db.client.findMany({
    include: {
      project: { select: { key: true, name: true } },
      subscriptions: { orderBy: { cycleEnd: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  })

  const rows: Array<Array<string | number | null>> = [
    ["Project Key", "Project Name", "Email", "Name", "Phone", "Status", "Cycle End", "Joined"],
  ]
  const now = Date.now()
  for (const c of clients) {
    const sub = c.subscriptions[0]
    let status = "none"
    if (sub) {
      status = sub.status === "active" && sub.cycleEnd.getTime() > now ? "active" : "expired"
    }
    rows.push([
      c.project.key,
      c.project.name,
      c.email,
      c.name || "",
      c.phone || "",
      status,
      sub ? sub.cycleEnd.toISOString().slice(0, 10) : "",
      c.createdAt.toISOString().slice(0, 10),
    ])
  }

  const csv = rowsToCsv(rows)
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clients-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
