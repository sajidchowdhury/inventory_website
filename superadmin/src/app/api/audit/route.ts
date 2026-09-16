// Audit log API — plan §12.
// GET /api/audit → newest audit entries first, limit 100.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentAdmin } from "@/lib/auth"

export const runtime = "nodejs"

export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const rows = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      adminId: true,
      adminEmail: true,
      action: true,
      target: true,
      meta: true,
      createdAt: true,
    },
  })

  const items = rows.map((r) => ({
    id: r.id,
    adminId: r.adminId,
    adminEmail: r.adminEmail,
    action: r.action,
    target: r.target,
    meta: r.meta, // raw JSON string, parsed client-side for display
    createdAt: r.createdAt,
  }))

  return NextResponse.json({ items })
}
