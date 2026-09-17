// bKash merchant API (tokenized checkout v1.2.0) — automated payments.
// Real mode hits the bKash sandbox/production when all creds are in env;
// mock mode (default in the sandbox) generates a fake payment + a self-looping
// simulate URL so the full create→callback→auto-approve flow runs end-to-end
// without a merchant account. See plan §8 (Phase 3 automation).
//
// Flow: create → user pays at bkashURL → bKash redirects to /api/bkash/callback
// ?paymentID= → execute → on Completed, the callback auto-approves the matching
// PaymentRequest (no admin needed).

const BASE = process.env.BKASH_BASE_URL || "" // e.g. https://tokenized.sandbox.bka.sh/v1.2.0
const APP_KEY = process.env.BKASH_APP_KEY || ""
const APP_SECRET = process.env.BKASH_APP_SECRET || ""
const USERNAME = process.env.BKASH_USERNAME || ""
const PASSWORD = process.env.BKASH_PASSWORD || ""
const CALLBACK_URL = process.env.BKASH_CALLBACK_URL || "https://inventoryos.xyz/api/bkash/callback"

export const bkashMockMode = !(BASE && APP_KEY && APP_SECRET && USERNAME && PASSWORD)

export type BkashPayment = {
  paymentID: string
  bkashURL: string
  amount: number
  merchantInvoiceNumber: string
}

export type BkashExecution = {
  transactionStatus: string // "Completed" | "Pending" | "Failed"
  trxID: string
  amount: number
  paymentID: string
}

// token cache (real mode)
let _token: { value: string; exp: number } | null = null

export async function getToken(): Promise<string> {
  if (bkashMockMode) return "mock-token"
  if (_token && _token.exp > Date.now() + 60_000) return _token.value
  const res = await fetch(`${BASE}/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${USERNAME}:${PASSWORD}`).toString("base64")}`,
      "x-app-key": APP_KEY,
    },
    body: JSON.stringify({ app_key: APP_KEY, app_secret: APP_SECRET }),
  })
  const d = await res.json()
  if (!d.id_token) throw new Error(`bKash token grant failed: ${JSON.stringify(d)}`)
  _token = { value: d.id_token, exp: Date.now() + (Number(d.expires_in || 3600) - 60) * 1000 }
  return d.id_token
}

export async function createPayment(opts: {
  amount: number
  invoice: string
  callbackUrl?: string
}): Promise<BkashPayment> {
  const cb = opts.callbackUrl || CALLBACK_URL
  if (bkashMockMode) {
    const paymentID = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    return {
      paymentID,
      bkashURL: `/api/bkash/simulate?paymentID=${paymentID}`,
      amount: opts.amount,
      merchantInvoiceNumber: opts.invoice,
    }
  }
  const token = await getToken()
  const res = await fetch(`${BASE}/tokenized/checkout/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: token,
      "x-app-key": APP_KEY,
    },
    body: JSON.stringify({
      mode: "0011",
      payerReference: opts.invoice,
      callbackURL: cb,
      amount: String(opts.amount),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: opts.invoice,
    }),
  })
  const d = await res.json()
  if (d.status === "failure" || !d.paymentID) {
    throw new Error(`bKash create failed: ${d.errorMessage || JSON.stringify(d)}`)
  }
  return {
    paymentID: d.paymentID,
    bkashURL: d.bkashURL,
    amount: opts.amount,
    merchantInvoiceNumber: opts.invoice,
  }
}

export async function executePayment(paymentID: string): Promise<BkashExecution> {
  if (bkashMockMode) {
    // mock: always succeeds, deterministic trxID derived from paymentID
    const trx = `BKSH${paymentID.replace(/[^0-9]/g, "").slice(-10).padStart(10, "0")}`
    return { transactionStatus: "Completed", trxID: trx, amount: 0, paymentID }
  }
  const token = await getToken()
  const res = await fetch(`${BASE}/tokenized/checkout/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: token,
      "x-app-key": APP_KEY,
    },
    body: JSON.stringify({ paymentID }),
  })
  const d = await res.json()
  return {
    transactionStatus: d.transactionStatus || "Unknown",
    trxID: d.trxID || "",
    amount: Number(d.amount) || 0,
    paymentID,
  }
}
