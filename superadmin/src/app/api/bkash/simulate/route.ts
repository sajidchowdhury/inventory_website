// Mock bKash payment page — stands in for the real bKash hosted checkout.
// Auto-redirects to /api/bkash/callback?paymentID=...&status=success after a
// short pause, simulating the user completing the payment. Only used in mock
// mode (no merchant creds configured).
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const paymentID = url.searchParams.get("paymentID")
  if (!paymentID) {
    return NextResponse.json({ error: "missing paymentID" }, { status: 400 })
  }
  const callback = `/api/bkash/callback?paymentID=${encodeURIComponent(paymentID)}&status=success`
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>bKash (simulated)</title>
    <meta http-equiv="refresh" content="2;url=${callback}">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>body{font-family:system-ui,sans-serif;background:#e0f2fe;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center}
    .card{background:#fff;border-radius:16px;padding:2.5rem;max-width:380px;text-align:center;box-shadow:0 10px 40px -10px rgba(59,130,246,.3)}
    h1{color:#e2136e;margin:0 0 .5rem;font-size:1.5rem}p{color:#6b7280;margin:.5rem 0;font-size:.85rem}
    .spinner{width:32px;height:32px;border:3px solid #fce7f3;border-top-color:#e2136e;border-radius:50%;margin:1rem auto;animation:s 0.8s linear infinite}
    @keyframes s{to{transform:rotate(360deg)}}</style></head>
    <body><div class="card">
      <h1>bKash</h1>
      <div class="spinner"></div>
      <p>Simulating payment...</p>
      <p style="font-size:.75rem;color:#9ca3af">Redirecting to auto-approve in 2s</p>
    </div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  )
}
