// Project detail endpoint — opens when an admin clicks a project in the sidebar.
// GET   /api/projects/[key]   → project details incl. schemaMap, paymentConfig,
//                               landing, counts, last 5 payments.
// PATCH /api/projects/[key]   → update name/folderPath/appPort/dbPath/landingUrl/
//                               active/schemaMap (Plan §6, §9).
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentAdmin } from "@/lib/auth"
import { parseSchemaMap, getAppDbSize } from "@/lib/cross-db"
import { writeAudit } from "@/server/audit"

export const runtime = "nodejs"

function startOfMonth() {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), 1)
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { key } = await params
  const project = await db.project.findUnique({
    where: { key },
    include: { paymentConfig: true, landing: true },
  })
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 })

  const [clientCount, activeSubs, pendingPayments, monthCredits, lastPayments, dbSize] =
    await Promise.all([
      db.client.count({ where: { projectId: project.id } }),
      db.subscription.count({ where: { projectId: project.id, status: "active" } }),
      db.paymentRequest.count({ where: { projectId: project.id, status: "pending" } }),
      db.ledger.aggregate({
        where: {
          projectId: project.id,
          type: "credit",
          createdAt: { gte: startOfMonth() },
        },
        _sum: { amount: true },
      }),
      db.ledger.findMany({
        where: { projectId: project.id, type: "credit" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          amount: true,
          reason: true,
          txId: true,
          createdAt: true,
          client: { select: { email: true } },
        },
      }),
      getAppDbSize(project.id),
    ])

  let landingJson: Record<string, unknown> = {}
  try {
    landingJson = JSON.parse(project.landing?.content || "{}")
  } catch {
    landingJson = {}
  }

  return NextResponse.json({
    id: project.id,
    key: project.key,
    name: project.name,
    isRoot: project.isRoot,
    icon: project.icon,
    color: project.color,
    folderPath: project.folderPath,
    appPort: project.appPort,
    dbPath: project.dbPath,
    schemaMap: parseSchemaMap(project.schemaMap),
    landingUrl: project.landingUrl,
    active: project.active,
    createdAt: project.createdAt,
    paymentConfig: project.paymentConfig
      ? {
          bkashNumber: project.paymentConfig.bkashNumber,
          nagadNumber: project.paymentConfig.nagadNumber,
          bankAccount: project.paymentConfig.bankAccount,
          monthlyAmount: project.paymentConfig.monthlyAmount,
          currency: project.paymentConfig.currency,
          dueDayOfMonth: project.paymentConfig.dueDayOfMonth,
          updatedAt: project.paymentConfig.updatedAt,
        }
      : null,
    landing: landingJson,
    counts: {
      clientCount,
      activeSubs,
      pendingPayments,
      incomeThisMonth: monthCredits._sum.amount ?? 0,
      dbSize,
      mrr: (project.paymentConfig?.monthlyAmount ?? 0) * activeSubs,
    },
    lastPayments: lastPayments.map((p) => ({
      id: p.id,
      amount: p.amount,
      reason: p.reason,
      txId: p.txId,
      createdAt: p.createdAt,
      clientEmail: p.client?.email ?? null,
    })),
  })
}

const PATCHABLE_FIELDS = [
  "name",
  "folderPath",
  "appPort",
  "dbPath",
  "landingUrl",
  "active",
  "schemaMap",
] as const

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { key } = await params
  const project = await db.project.findUnique({ where: { key } })
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 })

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const data: Record<string, unknown> = {}
  for (const k of PATCHABLE_FIELDS) {
    if (!(k in body)) continue
    const v = body[k]
    if (v === undefined) continue
    if (k === "schemaMap") {
      data.schemaMap = typeof v === "string" ? v : JSON.stringify(v)
    } else if (k === "appPort") {
      const n = Number(v)
      if (Number.isFinite(n)) data.appPort = n
    } else if (k === "active") {
      data.active = Boolean(v)
    } else if (typeof v === "string") {
      data[k] = v
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "no updatable fields supplied" }, { status: 400 })
  }

  const updated = await db.project.update({ where: { id: project.id }, data })
  await writeAudit(admin, "project.update", project.key, {
    fields: Object.keys(data),
  })

  return NextResponse.json({
    ok: true,
    project: {
      id: updated.id,
      key: updated.key,
      name: updated.name,
      active: updated.active,
      folderPath: updated.folderPath,
      appPort: updated.appPort,
      dbPath: updated.dbPath,
      landingUrl: updated.landingUrl,
    },
  })
}
