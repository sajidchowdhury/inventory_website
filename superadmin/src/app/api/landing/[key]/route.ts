// Public landing content API — Plan §9.
// GET /api/landing/:key returns the LandingContent JSON for that project key.
// PUBLIC (no auth) — read by the public root site and the SiteView in
// SuperAdmin.
//
// Special-case for `root` (project.isRoot=true): merge a server-generated
// `products` array containing every active non-root Project —
//   { key, name, icon, color, landingUrl, live } — so the root site
// auto-lists every product without needing a manual content edit.
//
// Cache 60s at the edge so SuperAdmin edits reflect within a minute.

import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const runtime = "nodejs"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params

  const project = await db.project.findUnique({
    where: { key },
    include: { landing: true },
  })

  if (!project) {
    return NextResponse.json(
      { error: "project not found", key },
      { status: 404 }
    )
  }

  let content: Record<string, unknown> = {}
  try {
    content = JSON.parse(project.landing?.content || "{}") as Record<
      string,
      unknown
    >
  } catch {
    content = {}
  }

  // Attach project metadata so a product SiteView can theme by color without a
  // second (authed) call. Underscored so it's visually distinct from slots.
  content = {
    ...content,
    _project: {
      key: project.key,
      name: project.name,
      icon: project.icon,
      color: project.color,
      landingUrl: project.landingUrl,
      isRoot: project.isRoot,
    },
  }

  // Auto-merge the products list for the root site — Plan §3, §9.
  // Every active non-root project becomes a card; "live" if landingUrl is set.
  if (project.isRoot) {
    const siblings = await db.project.findMany({
      where: { isRoot: false, active: true },
      select: {
        key: true,
        name: true,
        icon: true,
        color: true,
        landingUrl: true,
      },
      orderBy: [{ key: "asc" }],
    })
    const products = siblings.map((p) => ({
      key: p.key,
      name: p.name,
      icon: p.icon,
      color: p.color,
      landingUrl: p.landingUrl,
      live: Boolean(p.landingUrl),
    }))
    content = { ...content, products }
  }

  return NextResponse.json(content, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=60",
      "Content-Type": "application/json; charset=utf-8",
    },
  })
}
