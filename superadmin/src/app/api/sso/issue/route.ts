// SSO token issuer — admin-issued for the demo (in production a client-login
// flow would call this). Returns a short-lived HMAC-signed token scoped to
// (email, projectKey). Product apps verify it via the public /api/sso/verify.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentAdmin } from "@/lib/auth"
import { issueToken } from "@/lib/sso"
import { writeAudit } from "@/server/audit"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  try {
    const { email, projectKey } = await req.json()
    if (!email || !projectKey) {
      return NextResponse.json({ error: "email and projectKey required" }, { status: 400 })
    }
    const project = await db.project.findUnique({ where: { key: projectKey } })
    if (!project) return NextResponse.json({ error: "project not found" }, { status: 404 })
    const token = issueToken({ email, projectKey, ttlSec: 5 * 60 })
    const exp = Math.floor(Date.now() / 1000) + 5 * 60
    await writeAudit(admin, "sso.issue", `${projectKey}:${email}`, { ttlSec: 300 })
    return NextResponse.json({ token, expiresAt: exp, verifyUrl: `/api/sso/verify?token=${encodeURIComponent(token)}` })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "issue failed" }, { status: 500 })
  }
}
