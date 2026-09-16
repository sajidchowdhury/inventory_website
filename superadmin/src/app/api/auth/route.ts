import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyPassword, createSession, getCurrentAdmin } from "@/lib/auth"
import { writeAudit } from "@/server/audit"

export const runtime = "nodejs"

export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ admin: null }, { status: 200 })
  return NextResponse.json({ admin })
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 })
    }
    const admin = await db.adminUser.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (!admin) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }
    const ok = await verifyPassword(password, admin.passwordHash)
    if (!ok) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }
    await createSession(admin.id, admin.email)
    await writeAudit({ id: admin.id, email: admin.email }, "auth.login", admin.email, {
      method: "password",
    })
    return NextResponse.json({
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Login failed" }, { status: 500 })
  }
}

export async function DELETE() {
  const admin = await getCurrentAdmin()
  const { destroySession } = await import("@/lib/auth")
  await destroySession()
  if (admin) {
    await writeAudit(admin, "auth.logout", admin.email)
  }
  return NextResponse.json({ ok: true })
}
