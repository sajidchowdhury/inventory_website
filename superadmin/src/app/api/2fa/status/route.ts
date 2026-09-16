// Phase 3 2FA: status — whether the current admin has 2FA enabled.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentAdmin } from "@/lib/auth"

export const runtime = "nodejs"

export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const row = await db.adminUser.findUnique({
    where: { id: admin.id },
    select: { twoFactorSecret: true },
  })
  return NextResponse.json({ enabled: !!row?.twoFactorSecret })
}
