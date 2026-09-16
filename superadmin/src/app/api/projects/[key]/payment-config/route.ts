// Per-project payment config — bKash/Nagad/bank + monthly amount + due day.
// Plan §8 step A. The product app fetches these (via GET /api/public/payment-config)
// to show users "Send <amount> BDT to bKash <number>".
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
  const project = await db.project.findUnique({ where: { key } })
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 })

  const cfg = project
    ? await db.projectPaymentConfig.upsert({
        where: { projectId: project.id },
        update: {},
        create: {
          projectId: project.id,
          monthlyAmount: 0,
          currency: "BDT",
          dueDayOfMonth: 1,
        },
      })
    : null
  if (!cfg) return NextResponse.json({ error: "not found" }, { status: 404 })

  return NextResponse.json({
    projectId: cfg.projectId,
    bkashNumber: cfg.bkashNumber,
    nagadNumber: cfg.nagadNumber,
    bankAccount: cfg.bankAccount,
    monthlyAmount: cfg.monthlyAmount,
    currency: cfg.currency,
    dueDayOfMonth: cfg.dueDayOfMonth,
    updatedAt: cfg.updatedAt,
  })
}

const FIELDS = [
  "bkashNumber",
  "nagadNumber",
  "bankAccount",
  "monthlyAmount",
  "currency",
  "dueDayOfMonth",
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
  for (const k of FIELDS) {
    if (!(k in body)) continue
    const v = body[k]
    if (v === undefined || v === null) {
      data[k] = null
      continue
    }
    if (k === "monthlyAmount") {
      const n = Number(v)
      if (Number.isFinite(n) && n >= 0) data[k] = n
    } else if (k === "dueDayOfMonth") {
      const n = Number(v)
      if (Number.isInteger(n) && n >= 1 && n <= 28) data[k] = n
    } else if (typeof v === "string") {
      data[k] = v
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "no updatable fields supplied" }, { status: 400 })
  }

  const updated = await db.projectPaymentConfig.upsert({
    where: { projectId: project.id },
    update: data,
    create: {
      projectId: project.id,
      ...data,
      monthlyAmount: typeof data.monthlyAmount === "number" ? data.monthlyAmount : 0,
      currency: typeof data.currency === "string" ? data.currency : "BDT",
      dueDayOfMonth:
        typeof data.dueDayOfMonth === "number" ? data.dueDayOfMonth : 1,
    },
  })
  await writeAudit(admin, "paymentconfig.update", project.key, {
    fields: Object.keys(data),
  })

  return NextResponse.json({
    ok: true,
    paymentConfig: {
      projectId: updated.projectId,
      bkashNumber: updated.bkashNumber,
      nagadNumber: updated.nagadNumber,
      bankAccount: updated.bankAccount,
      monthlyAmount: updated.monthlyAmount,
      currency: updated.currency,
      dueDayOfMonth: updated.dueDayOfMonth,
      updatedAt: updated.updatedAt,
    },
  })
}
