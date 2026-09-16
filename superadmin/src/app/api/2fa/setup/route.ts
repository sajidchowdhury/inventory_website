// Phase 3 2FA: enroll — generate a fresh TOTP secret + otpauth URI for QR apps.
// The secret is NOT saved until /api/2fa/enable verifies a token against it.
import { NextResponse } from "next/server"
import { getCurrentAdmin } from "@/lib/auth"
import { generateSecret, keyuri } from "@/lib/totp"

export const runtime = "nodejs"

export async function POST() {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const secret = generateSecret()
  const otpauthUri = keyuri(admin.email, secret)
  return NextResponse.json({ secret, otpauthUri })
}
