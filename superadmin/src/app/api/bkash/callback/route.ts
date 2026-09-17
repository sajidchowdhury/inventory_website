// bKash callback — bKash redirects here after the user pays (or in mock mode,
// the /api/bkash/simulate page redirects here). Executes the payment + auto-
// approves the matching PaymentRequest (no admin needed). Plan §8 Phase 3.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { executePayment, bkashMockMode } from "@/lib/bkash"
import { approvePaymentRequest } from "@/server/approve"

export const runtime = "nodejs"

const SYSTEM_ACTOR = { id: "bkash", email: "bkash@inventoryos.xyz", name: null, role: "system" }

function htmlPage(title: string, body: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>body{font-family:system-ui,sans-serif;background:#f0fdf4;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center}
    .card{background:#fff;border:1px solid #d1fae5;border-radius:16px;padding:2.5rem;max-width:420px;text-align:center;box-shadow:0 10px 40px -10px rgba(16,185,129,.3)}
    h1{color:#059669;margin:0 0 .5rem;font-size:1.25rem}p{color:#6b7280;margin:.5rem 0;font-size:.9rem}
    .pill{display:inline-block;background:#d1fae5;color:#059669;padding:.25rem .75rem;border-radius:999px;font-size:.75rem;margin:.5rem 0}</style></head>
    <body><div class="card">${body}</div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  )
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const paymentID = url.searchParams.get("paymentID")
  const status = url.searchParams.get("status") || "success"
  if (!paymentID) {
    return htmlPage("bKash — error", "<h1>Missing paymentID</h1><p>The callback was called without a paymentID.</p>", 400)
  }
  try {
    const request = await db.paymentRequest.findFirst({
      where: { txId: paymentID, method: "bkash-auto", status: "pending" },
    })
    if (!request) {
      return htmlPage("bKash — not found", `<h1>Payment not found</h1><p>No pending bKash request for paymentID <code>${paymentID}</code>.</p>`, 404)
    }
    // execute (real bKash) or auto-complete (mock)
    const exec = await executePayment(paymentID)
    if (exec.transactionStatus !== "Completed") {
      await db.paymentRequest.update({
        where: { id: request.id },
        data: { status: "rejected", notes: `bkash status: ${exec.transactionStatus}` },
      })
      return htmlPage("bKash — not completed", `<h1>Payment not completed</h1><p>Status: ${exec.transactionStatus}</p>`)
    }
    // auto-approve
    const res = await approvePaymentRequest(request.id, SYSTEM_ACTOR, {
      source: "bkash-auto",
      trxId: exec.trxID,
    })
    if (!res.ok) {
      return htmlPage("bKash — approve failed", `<h1>Auto-approve failed</h1><p>${res.error}</p>`, 500)
    }
    return htmlPage(
      "bKash — payment completed",
      `<div class="pill">✓ Auto-approved</div>
       <h1>Payment completed</h1>
       <p><strong>${res.clientEmail}</strong> is now active.</p>
       <p>Transaction ID: <code>${exec.trxID}</code></p>
       <p>Amount: <strong>৳${request.amount}</strong></p>
       ${bkashMockMode ? '<p style="font-size:.75rem;color:#9ca3af">Mock mode — no real bKash call made.</p>' : ""}`
    )
  } catch (e: any) {
    return htmlPage("bKash — error", `<h1>Error</h1><p>${e?.message || "unknown"}</p>`, 500)
  }
}
