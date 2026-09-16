// Per-project landing content — the slot JSON rendered on the product site.
// Plan §9. The public read endpoint is GET /api/landing/[key] (Subagent E);
// this admin endpoint writes the JSON via PATCH.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentAdmin } from "@/lib/auth"
import { writeAudit } from "@/server/audit"

export const runtime = "nodejs"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { key } = await params
  const project = await db.project.findUnique({
    where: { key },
    include: { landing: true },
  })
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 })

  let content: Record<string, unknown> = {}
  try {
    content = JSON.parse(project.landing?.content || "{}")
  } catch {
    content = {}
  }

  return NextResponse.json({
    projectId: project.id,
    isRoot: project.isRoot,
    content,
    updatedAt: project.landing?.updatedAt ?? null,
  })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { key } = await params
  const project = await db.project.findUnique({ where: { key } })
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "content must be a JSON object" }, { status: 400 })
  }

  const contentStr = JSON.stringify(body)
  const updated = await db.landingContent.upsert({
    where: { projectId: project.id },
    update: { content: contentStr },
    create: { projectId: project.id, content: contentStr },
  })
  await writeAudit(admin, "landing.update", project.key, {
    bytes: contentStr.length,
  })

  return NextResponse.json({
    ok: true,
    content: body,
    updatedAt: updated.updatedAt,
  })
}
