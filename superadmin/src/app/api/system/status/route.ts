// System status — one-glance view of what's configured. Admin-authed.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentAdmin } from "@/lib/auth"
import { bkashMockMode } from "@/lib/bkash"

export const runtime = "nodejs"

export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const [admins, projects, clients, twoFactorEnabled, pendingPayments] = await Promise.all([
    db.adminUser.count(),
    db.project.count({ where: { isRoot: false } }),
    db.client.count(),
    db.adminUser.count({ where: { NOT: { twoFactorSecret: null } } }),
    db.paymentRequest.count({ where: { status: "pending" } }),
  ])

  return NextResponse.json({
    bkash: {
      mode: bkashMockMode ? "mock" : "live",
      configured: !bkashMockMode,
      needs: ["BKASH_BASE_URL", "BKASH_APP_KEY", "BKASH_APP_SECRET", "BKASH_USERNAME", "BKASH_PASSWORD"],
    },
    smtp: {
      configured: !!process.env.SMTP_HOST,
      host: process.env.SMTP_HOST ? `${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}` : null,
      from: process.env.SMTP_FROM || null,
    },
    sso: {
      configured: !!(process.env.SSO_SECRET || process.env.AUTH_SECRET),
      secret: !!(process.env.SSO_SECRET || process.env.AUTH_SECRET),
    },
    cron: {
      secret: !!process.env.CRON_SECRET,
    },
    counts: {
      admins,
      projects,
      clients,
      twoFactorEnabled,
      pendingPayments,
    },
  })
}
