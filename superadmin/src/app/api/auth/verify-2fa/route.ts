// Phase 3 2FA: verify — consume a post-password challenge + 6-digit token,
// verify the TOTP against the admin's stored secret, then create a session.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createSession } from "@/lib/auth"
import { verifyToken } from "@/lib/totp"
import { writeAudit } from "@/server/audit"

export const runtime = "nodejs"

const CHALLENGE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function POST(req: Request) {
  try {
    const { challenge, token } = await req.json()
    if (!challenge || !token) {
      return NextResponse.json({ error: "challenge and token required" }, { status: 400 })
    }
    const row = await db.twoFactorChallenge.findUnique({ where: { id: String(challenge) } })
    if (!row || row.used) {
      return NextResponse.json({ error: "Invalid or expired challenge" }, { status: 400 })
    }
    if (row.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Challenge expired — please log in again" }, { status: 400 })
    }
    const admin = await db.adminUser.findUnique({ where: { id: row.adminId } })
    if (!admin || !admin.twoFactorSecret) {
      return NextResponse.json({ error: "2FA not enabled for this account" }, { status: 400 })
    }
    if (!verifyToken(String(token), admin.twoFactorSecret)) {
      return NextResponse.json({ error: "Invalid 6-digit code" }, { status: 400 })
    }
    // consume challenge + issue session
    await db.twoFactorChallenge.update({ where: { id: row.id }, data: { used: true } })
    await createSession(admin.id, admin.email)
    await writeAudit({ id: admin.id, email: admin.email }, "auth.login", admin.email, {
      method: "password+totp",
    })
    return NextResponse.json({
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "verify failed" }, { status: 500 })
  }
}

export function makeChallengeTTL() {
  return CHALLENGE_TTL_MS
}
