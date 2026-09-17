// SSO token verifier — PUBLIC (called by product apps to validate a token
// issued by /api/sso/issue). Returns the payload if the signature is valid
// and the token hasn't expired.
import { NextResponse } from "next/server"
import { verifyToken } from "@/lib/sso"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get("token")
  if (!token) return NextResponse.json({ valid: false, error: "missing token" }, { status: 400 })
  const res = verifyToken(token)
  if (!res.ok) return NextResponse.json({ valid: false, error: res.error }, { status: 401 })
  return NextResponse.json({
    valid: true,
    email: res.payload.email,
    projectKey: res.payload.projectKey,
    expiresAt: res.payload.exp,
  })
}
