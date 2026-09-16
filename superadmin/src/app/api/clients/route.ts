// All Clients — cross-project client index.
// GET /api/clients → every Client row joined to its Project + latest Subscription.
// Used by the "All Clients" view (plan §7 sidebar item).
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentAdmin } from "@/lib/auth"

export const runtime = "nodejs"

export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  // One query: every client, project shape on the relation, latest sub via take:1
  const clients = await db.client.findMany({
    include: {
      project: {
        select: { id: true, key: true, name: true, color: true, icon: true },
      },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, cycleEnd: true, cycleStart: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const now = Date.now()
  const items = clients.map((c) => {
    const latest = c.subscriptions[0]
    let status: "active" | "expired" | "none" = "none"
    let cycleEnd: string | undefined
    if (latest) {
      cycleEnd = latest.cycleEnd.toISOString()
      const ended = latest.cycleEnd.getTime() < now
      // Treat as active only if the sub is marked active AND the cycle hasn't ended.
      status = latest.status === "active" && !ended ? "active" : "expired"
    }
    return {
      id: c.id,
      projectId: c.projectId,
      projectKey: c.project.key,
      projectName: c.project.name,
      projectColor: c.project.color,
      projectIcon: c.project.icon,
      email: c.email,
      name: c.name,
      phone: c.phone,
      createdAt: c.createdAt.toISOString(),
      status,
      cycleEnd,
    }
  })

  return NextResponse.json({ items })
}
