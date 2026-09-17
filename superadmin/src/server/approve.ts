// Shared auto-approve helper — used by the manual /api/payments PATCH and the
// automated bKash callback so the approve logic (flip app DB paid + Client
// upsert + 30-day Subscription + Ledger credit + PaymentRequest approved +
// audit) lives in exactly one place.
import { db } from "@/lib/db"
import { flipAppUserPaid } from "@/lib/cross-db"
import { writeAudit } from "@/server/audit"

export type ApproveActor = { id: string; email: string; name?: string | null; role?: string }

export async function approvePaymentRequest(
  requestId: string,
  actor: ApproveActor,
  opts: { source?: string; trxId?: string } = {}
): Promise<{ ok: true; clientEmail: string; projectId: string } | { ok: false; error: string }> {
  const request = await db.paymentRequest.findUnique({
    where: { id: requestId },
    include: { project: { select: { id: true, key: true, name: true } } },
  })
  if (!request) return { ok: false, error: "not found" }
  if (request.status !== "pending") return { ok: false, error: `already ${request.status}` }

  // 1. flip the app's user paid flag (non-fatal)
  try {
    await flipAppUserPaid(request.projectId, request.clientEmail, true)
  } catch (e: any) {
    console.warn("flipAppUserPaid failed (non-fatal):", e?.message)
  }
  // 2. upsert Client
  const client = await db.client.upsert({
    where: { projectId_email: { projectId: request.projectId, email: request.clientEmail } },
    update: {},
    create: { projectId: request.projectId, email: request.clientEmail },
  })
  // 3. 30-day Subscription
  const cycleStart = new Date()
  const cycleEnd = new Date(Date.now() + 30 * 86400000)
  await db.subscription.create({
    data: {
      projectId: request.projectId,
      clientId: client.id,
      cycleStart,
      cycleEnd,
      status: "active",
      paymentRequestId: request.id,
    },
  })
  // 4. Ledger credit
  await db.ledger.create({
    data: {
      projectId: request.projectId,
      clientId: client.id,
      type: "credit",
      amount: request.amount,
      reason: `subscription (${opts.source || "manual"})`,
      txId: opts.trxId || request.txId,
    },
  })
  // 5. mark approved
  await db.paymentRequest.update({
    where: { id: request.id },
    data: {
      status: "approved",
      reviewedAt: new Date(),
      reviewerId: actor.id,
      notes: opts.source ? `auto-approved (${opts.source})` : null,
    },
  })
  await writeAudit(actor, "payment.approve", request.txId, {
    project: request.project.key,
    email: request.clientEmail,
    amount: request.amount,
    source: opts.source || "manual",
  })
  return { ok: true, clientEmail: request.clientEmail, projectId: request.projectId }
}
