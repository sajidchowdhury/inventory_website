// Lightweight project list for the sidebar + project sub-pages.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentAdmin } from "@/lib/auth"
import { writeAudit } from "@/server/audit"

export const runtime = "nodejs"

export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const projects = await db.project.findMany({
    where: { active: true },
    orderBy: [{ isRoot: "desc" }, { key: "asc" }],
    select: {
      id: true,
      key: true,
      name: true,
      icon: true,
      color: true,
      isRoot: true,
      landingUrl: true,
      appPort: true,
      folderPath: true,
      dbPath: true,
      schemaMap: true,
      createdAt: true,
    },
  })
  return NextResponse.json({ items: projects })
}

// ---------------------------------------------------------------------------
// POST /api/projects — create a new project (Plan §10, §6).
// Body shape:
//   {
//     name, key, icon?, color?,
//     folderPath?, appPort?, dbPath?, dbType?, schemaMap? (string|object),
//     landingUrl?,
//     payment?: { bkashNumber?, nagadNumber?, bankAccount?,
//                 monthlyAmount, currency?, dueDayOfMonth? },
//     landing?: { heroHeadline?, heroSubtitle?, ctaPrimary?, ... }  // slot JSON
//   }
//
// In one transaction we create: Project + ProjectPaymentConfig + LandingContent
// + 2-3 MockAppUser rows (so the Clients tab isn't empty in Phase 1).
// Writes audit "project.create". On duplicate key, Prisma throws P2002 → 409.
// ---------------------------------------------------------------------------
const KEY_RE = /^[a-z0-9-]+$/
const SEED_NAMES = [
  "Rahim Ahmed",
  "Karim Hossain",
  "Fatema Begum",
  "Abdullah Islam",
  "Ayesha Akter",
  "Hasan Rahman",
  "Sadia Khan",
  "Imran Chowdhury",
]

function randomPhone() {
  return `017${Math.floor(Math.random() * 1e8)
    .toString()
    .padStart(8, "0")}`
}

function slugifyName(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9.]/g, "")
}

export async function POST(req: Request) {
  const admin = await getCurrentAdmin()
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: string
    key?: string
    icon?: string
    color?: string
    folderPath?: string | null
    appPort?: number | string | null
    dbPath?: string | null
    dbType?: string
    schemaMap?: string | Record<string, unknown> | null
    landingUrl?: string | null
    payment?: {
      bkashNumber?: string | null
      nagadNumber?: string | null
      bankAccount?: string | null
      monthlyAmount?: number | string
      currency?: string
      dueDayOfMonth?: number | string
    }
    landing?: Record<string, unknown>
  }

  // Required-field validation.
  if (!body.name || typeof body.name !== "string" || body.name.trim().length < 2) {
    return NextResponse.json(
      { error: "name is required (min 2 chars)" },
      { status: 400 }
    )
  }
  if (!body.key || typeof body.key !== "string" || !KEY_RE.test(body.key)) {
    return NextResponse.json(
      { error: "key must be lowercase letters, numbers, and dashes only" },
      { status: 400 }
    )
  }
  const monthlyRaw = body.payment?.monthlyAmount
  const monthly = Number(monthlyRaw)
  if (!Number.isFinite(monthly) || monthly < 0) {
    return NextResponse.json(
      { error: "payment.monthlyAmount is required and must be a non-negative number" },
      { status: 400 }
    )
  }
  const dueRaw = body.payment?.dueDayOfMonth
  const due = Number.isFinite(Number(dueRaw)) ? Number(dueRaw) : 1
  if (due < 1 || due > 28) {
    return NextResponse.json(
      { error: "payment.dueDayOfMonth must be between 1 and 28" },
      { status: 400 }
    )
  }

  // Normalize schema map → JSON string.
  let schemaMapStr = "{}"
  if (body.schemaMap) {
    schemaMapStr =
      typeof body.schemaMap === "string"
        ? body.schemaMap
        : JSON.stringify(body.schemaMap)
  }

  // Normalize appPort.
  let appPort: number | null = null
  if (body.appPort !== undefined && body.appPort !== null && body.appPort !== "") {
    const n = Number(body.appPort)
    if (Number.isFinite(n) && n > 0 && n < 65536) appPort = n
  }

  // Landing content JSON (string). Default to a reasonable starting template
  // based on the submitted hero slots, so the new project's LandingEditor
  // tab opens with non-empty content.
  const landingJson = JSON.stringify({
    badge: body.name,
    heroHeadline:
      body.landing?.heroHeadline ?? body.name,
    heroSubtitle: body.landing?.heroSubtitle ?? "",
    ctaPrimary: body.landing?.ctaPrimary ?? "লগইন করুন",
    ctaSecondary: "ডেমো দেখুন",
    features: [],
    pricing: monthly,
    footerEmail: "hello@inventoryos.xyz",
    ...(body.landing || {}),
  })

  try {
    const created = await db.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          key: body.key as string,
          name: body.name as string,
          icon: body.icon || "Package",
          color: body.color || "emerald",
          folderPath: body.folderPath || null,
          appPort,
          dbPath: body.dbPath || null,
          dbType: body.dbType || "sqlite",
          schemaMap: schemaMapStr,
          landingUrl: body.landingUrl || null,
          isRoot: false,
          active: true,
        },
      })

      await tx.projectPaymentConfig.create({
        data: {
          projectId: project.id,
          bkashNumber: body.payment?.bkashNumber || null,
          nagadNumber: body.payment?.nagadNumber || null,
          bankAccount: body.payment?.bankAccount || null,
          monthlyAmount: monthly,
          currency: body.payment?.currency || "BDT",
          dueDayOfMonth: due,
        },
      })

      await tx.landingContent.create({
        data: { projectId: project.id, content: landingJson },
      })

      // Seed 2-3 MockAppUser rows so the new project's Clients tab isn't empty
      // in Phase 1 (Plan §6 — Phase 2 swaps this for a real read against
      // project.dbPath via better-sqlite3).
      const picks = [...SEED_NAMES]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
      for (const name of picks) {
        const base = slugifyName(name)
        // suffix random int → unique even across re-creates.
        const email = `${base}.${Math.floor(Math.random() * 9000 + 1000)}@gmail.com`
        try {
          await tx.mockAppUser.create({
            data: {
              projectId: project.id,
              email,
              name,
              phone: randomPhone(),
              isPaid: false,
            },
          })
        } catch {
          // ignore unique collisions (shouldn't happen with random suffix)
        }
      }

      return project
    })

    await writeAudit(admin, "project.create", created.key, {
      name: created.name,
      icon: created.icon,
      color: created.color,
      monthlyAmount: monthly,
    })

    return NextResponse.json(
      {
        ok: true,
        project: {
          id: created.id,
          key: created.key,
          name: created.name,
          icon: created.icon,
          color: created.color,
        },
      },
      { status: 201 }
    )
  } catch (e) {
    const err = e as { code?: string; message?: string }
    // Prisma unique-constraint violation → 409
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "A project with this key already exists. Pick a unique slug." },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: err?.message || "Failed to create project" },
      { status: 500 }
    )
  }
}
