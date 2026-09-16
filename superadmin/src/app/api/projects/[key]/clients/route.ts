// Per-project clients — read via the cross-DB layer using the schema map.
// Plan §6 + §11. Phase 1 reads from the MockAppUser mirror; Phase 2 will swap
// to better-sqlite3 against project.dbPath (function signature unchanged).
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentAdmin } from "@/lib/auth"
import { listAppUsers, type AppUser } from "@/lib/cross-db"

export const runtime = "nodejs"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { key } = await params
  const project = await db.project.findUnique({ where: { key } })
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 })

  const users: AppUser[] = await listAppUsers(project.id)
  const items = users.map((u) => ({
    email: u.email,
    name: u.name,
    phone: u.phone,
    isPaid: u.isPaid,
  }))

  return NextResponse.json({
    projectId: project.id,
    key: project.key,
    isRoot: project.isRoot,
    total: items.length,
    paidCount: items.filter((u) => u.isPaid).length,
    items,
  })
}
