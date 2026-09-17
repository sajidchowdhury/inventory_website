// bKash create payment — admin-triggerable (for demo) / app-triggerable (prod).
// Creates a bKash payment + a pending PaymentRequest (method=bkash-auto,
// txId=paymentID) so the callback can auto-approve on completion.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentAdmin } from "@/lib/auth"
import { createPayment, bkashMockMode } from "@/lib/bkash"
import { writeAudit } from "@/server/audit"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  try {
    const { projectKey, clientEmail, amount } = await req.json()
    if (!projectKey || !clientEmail) {
      return NextResponse.json({ error: "projectKey and clientEmail required" }, { status: 400 })
    }
    const project = await db.project.findUnique({ where: { key: projectKey } })
    if (!project) return NextResponse.json({ error: "project not found" }, { status: 404 })
    const cfg = await db.projectPaymentConfig.findUnique({ where: { projectId: project.id } })
    const finalAmount = Number(amount) || cfg?.monthlyAmount || 0
    if (finalAmount <= 0) {
      return NextResponse.json({ error: "amount not configured" }, { status: 400 })
    }
    const invoice = `INV-${project.key}-${Date.now()}`
    const payment = await createPayment({
      amount: finalAmount,
      invoice,
      callbackUrl: `${process.env.BKASH_CALLBACK_URL || "https://inventoryos.xyz/api/bkash/callback"}`,
    })
    const request = await db.paymentRequest.create({
      data: {
        projectId: project.id,
        clientEmail,
        method: "bkash-auto",
        txId: payment.paymentID,
        amount: finalAmount,
        status: "pending",
        notes: `bkash invoice ${invoice}`,
      },
    })
    await writeAudit(admin, "bkash.create", payment.paymentID, {
      project: project.key,
      email: clientEmail,
      amount: finalAmount,
      mockMode: bkashMockMode,
    })
    return NextResponse.json({
      bkashURL: payment.bkashURL,
      paymentID: payment.paymentID,
      requestId: request.id,
      amount: finalAmount,
      mockMode: bkashMockMode,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "create failed" }, { status: 500 })
  }
}
