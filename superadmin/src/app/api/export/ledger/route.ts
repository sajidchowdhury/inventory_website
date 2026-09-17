// Export ledger entries as CSV (for accounting). Admin-authed. Optional
// ?projectId= filter.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentAdmin } from "@/lib/auth"
import { rowsToCsv } from "@/lib/csv"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const projectId = url.searchParams.get("projectId")

  const entries = await db.ledger.findMany({
    where: projectId ? { projectId } : {},
    include: {
      project: { select: { key: true, name: true } },
      client: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  })

  const rows: Array<Array<string | number | null>> = [
    ["Date", "Project Key", "Project Name", "Type", "Amount", "Reason", "Transaction ID", "Client Email"],
  ]
  for (const e of entries) {
    const sign = e.type === "credit" ? e.amount : -e.amount
    rows.push([
      e.createdAt.toISOString(),
      e.project.key,
      e.project.name,
      e.type,
      sign,
      e.reason,
      e.txId || "",
      e.client?.email || "",
    ])
  }

  const csv = rowsToCsv(rows)
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ledger-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
