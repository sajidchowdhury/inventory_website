// Per-project ledger — newest first, with running totals.
// Plan §11 per-project overview.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentAdmin } from "@/lib/auth"

export const runtime = "nodejs"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { key } = await params
  const project = await db.project.findUnique({ where: { key } })
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 })

  const [rows, creditSum, debitSum] = await Promise.all([
    db.ledger.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        type: true,
        amount: true,
        reason: true,
        txId: true,
        createdAt: true,
        client: { select: { email: true } },
      },
    }),
    db.ledger.aggregate({
      where: { projectId: project.id, type: "credit" },
      _sum: { amount: true },
    }),
    db.ledger.aggregate({
      where: { projectId: project.id, type: "debit" },
      _sum: { amount: true },
    }),
  ])

  const total = (creditSum._sum.amount ?? 0) - (debitSum._sum.amount ?? 0)

  return NextResponse.json({
    projectId: project.id,
    key: project.key,
    total,
    creditTotal: creditSum._sum.amount ?? 0,
    debitTotal: debitSum._sum.amount ?? 0,
    items: rows.map((r) => ({
      id: r.id,
      type: r.type,
      amount: r.amount,
      reason: r.reason,
      txId: r.txId,
      createdAt: r.createdAt,
      clientEmail: r.client?.email ?? null,
    })),
  })
}
