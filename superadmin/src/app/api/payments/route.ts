// Payment approval workflow API.
// GET    /api/payments        → list pending payment requests (the approval queue)
// PATCH  /api/payments        → approve | reject a request (plan §8 step F)
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentAdmin } from "@/lib/auth"
import { writeAudit } from "@/server/audit"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const status = url.searchParams.get("status") || "pending"

  const rows = await db.paymentRequest.findMany({
    where: status === "all" ? {} : { status },
    include: { project: { select: { key: true, name: true, color: true, icon: true } } },
    orderBy: { submittedAt: "desc" },
    take: 100,
  })

  const decorated = rows.map((r) => ({
    id: r.id,
    projectId: r.projectId,
    projectKey: r.project.key,
    projectName: r.project.name,
    projectColor: r.project.color,
    projectIcon: r.project.icon,
    clientEmail: r.clientEmail,
    method: r.method,
    txId: r.txId,
    amount: r.amount,
    status: r.status,
    submittedAt: r.submittedAt,
    reviewedAt: r.reviewedAt,
    notes: r.notes,
  }))

  return NextResponse.json({ items: decorated })
}

export async function PATCH(req: Request) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  try {
    const { id, action, notes } = await req.json()
    if (!id || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 })
    }
    const request = await db.paymentRequest.findUnique({
      where: { id },
      include: { project: true, project: { select: { id: true, key: true, name: true, paymentConfig: true } } },
    })
    if (!request) return NextResponse.json({ error: "not found" }, { status: 404 })
    if (request.status !== "pending") {
      return NextResponse.json({ error: `already ${request.status}` }, { status: 409 })
    }

    if (action === "approve") {
      const { approvePaymentRequest } = await import("@/server/approve")
      const res = await approvePaymentRequest(request.id, admin, { source: "manual" })
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 409 })
      return NextResponse.json({ ok: true, status: "approved" })
    } else {
      // reject
      await db.paymentRequest.update({
        where: { id: request.id },
        data: { status: "rejected", reviewedAt: new Date(), reviewerId: admin.id, notes: notes || null },
      })
      await writeAudit(admin, "payment.reject", request.txId, {
        project: request.project.key,
        email: request.clientEmail,
        reason: notes || "rejected",
      })
      return NextResponse.json({ ok: true, status: "rejected" })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "action failed" }, { status: 500 })
  }
}
