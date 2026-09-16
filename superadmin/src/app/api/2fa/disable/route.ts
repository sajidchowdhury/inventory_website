// Phase 3 2FA: disable — clear the admin's TOTP secret.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentAdmin } from "@/lib/auth"
import { writeAudit } from "@/server/audit"

export const runtime = "nodejs"

export async function POST() {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  await db.adminUser.update({
    where: { id: admin.id },
    data: { twoFactorSecret: null },
  })
  await writeAudit(admin, "2fa.disable", admin.email)
  return NextResponse.json({ ok: true })
}
