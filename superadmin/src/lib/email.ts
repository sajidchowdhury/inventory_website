// Email sender for Phase 3 dunning + system notifications.
// Uses nodemailer with SMTP creds from env when configured; otherwise logs to
// console + writes to /tmp/inventoryos-emails.log so the dunning flow is
// observable in the sandbox without a mail server. See plan §8 step I.
import { writeFileSync, appendFileSync, existsSync } from "node:fs"

const LOG_FILE = process.env.EMAIL_LOG_FILE || "/tmp/inventoryos-emails.log"
const SMTP_HOST = process.env.SMTP_HOST // e.g. "smtp.gmail.com"
const SMTP_PORT = Number(process.env.SMTP_PORT || 587)
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_FROM = process.env.SMTP_FROM || "InventoryOS <noreply@inventoryos.xyz>"

export type EmailPayload = {
  to: string
  subject: string
  text: string
  html?: string
}

export type EmailResult =
  | { ok: true; mode: "smtp"; messageId: string }
  | { ok: true; mode: "log"; file: string }
  | { ok: false; error: string }

let _transporter: any = null
async function getTransporter() {
  if (!SMTP_HOST) return null
  if (_transporter) return _transporter
  const nodemailer = await import("nodemailer")
  _transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  })
  return _transporter
}

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  try {
    const transporter = await getTransporter()
    if (!transporter) {
      // No SMTP configured — log to file so the dunning flow is observable.
      const line = `[${new Date().toISOString()}] TO: ${payload.to} | SUBJECT: ${payload.subject}\n${payload.text}\n${"-".repeat(60)}\n`
      if (!existsSync(LOG_FILE)) writeFileSync(LOG_FILE, line)
      else appendFileSync(LOG_FILE, line)
      return { ok: true, mode: "log", file: LOG_FILE }
    }
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    })
    return { ok: true, mode: "smtp", messageId: info.messageId }
  } catch (e: any) {
    return { ok: false, error: e?.message || "send failed" }
  }
}

// Dunning email templates (Bangla-first, since the brand is Bengali).
export function dunningEmail(opts: {
  clientName: string | null
  clientEmail: string
  projectName: string
  monthlyAmount: number
  currency: string
  bkashNumber: string | null
  daysLabel: string // "3 দিন", "আজ", "৩ দিন পার হয়েছে" etc.
  action: string // what to do
}): EmailPayload {
  const subject = `Subscription renewal reminder — ${opts.projectName}`
  const text = `Assalamu Alaikum ${opts.clientName || opts.clientEmail},

আপনার ${opts.projectName} সাবস্ক্রিপশন ${opts.daysLabel} পাল্লেন হতে যাচ্ছে/হয়েছে।

প্রজেক্ট: ${opts.projectName}
মাসিক ফি: ${opts.currency} ${opts.monthlyAmount}
${opts.bkashNumber ? `পেমেন্ট নম্বর (bKash): ${opts.bkashNumber}` : ""}

করণীয়: ${opts.action}

পেমেন্ট সম্পন্ন হলে সফটওয়্যারে লগইন করে আপনার Transaction ID দিন। অ্যাডমিন ভেরিফাই করে সাবস্ক্রিপশন চালু করে দেবেন।

— InventoryOS SuperAdmin`

  return { to: opts.clientEmail, subject, text }
}
