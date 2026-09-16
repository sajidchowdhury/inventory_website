// Schema-map validation endpoint.
// Plan §6 + §11. Re-runs validateSchemaMap(projectId) any time the app's
// underlying schema changes; writes a "schema.validate" audit entry.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentAdmin } from "@/lib/auth"
import { validateSchemaMap } from "@/lib/cross-db"
import { writeAudit } from "@/server/audit"

export const runtime = "nodejs"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { key } = await params
  const project = await db.project.findUnique({ where: { key } })
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 })

  const result = await validateSchemaMap(project.id)
  await writeAudit(admin, "schema.validate", project.key, {
    ok: result.ok,
    sampleEmail: result.sampleEmail,
    error: result.error,
  })

  return NextResponse.json({ ok: result.ok, ...result })
}
