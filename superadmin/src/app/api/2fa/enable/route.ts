// Phase 3 2FA: enable — verify the admin's first token against the pending
// secret, then persist twoFactorSecret on AdminUser. Subsequent logins require
// a 6-digit code.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentAdmin } from "@/lib/auth"
import { verifyToken } from "@/lib/totp"
import { writeAudit } from "@/server/audit"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  try {
    const { secret, token } = await req.json()
    if (!secret || !token) {
      return NextResponse.json({ error: "secret and token required" }, { status: 400 })
    }
    if (!verifyToken(String(token), String(secret))) {
      return NextResponse.json({ error: "Invalid 6-digit code — try again" }, { status: 400 })
    }
    await db.adminUser.update({
      where: { id: admin.id },
      data: { twoFactorSecret: String(secret) },
    })
    await writeAudit(admin, "2fa.enable", admin.email)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "enable failed" }, { status: 500 })
  }
}
