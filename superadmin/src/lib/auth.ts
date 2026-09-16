// Simple, secure-enough auth for the Phase 1 prototype.
// Phase 2 will swap this for NextAuth.js v4 with 2FA — see plan §12.
// Uses bcryptjs for password hashing + an HMAC-signed httpOnly cookie token,
// backed by an AdminSession row in superadmin.db.

import { createHmac } from "crypto"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { cookies } from "next/headers"

const SESSION_COOKIE = "sa_session"
const SESSION_TTL_MS = 1000 * 60 * 60 * 12 // 12h
const SECRET = process.env.AUTH_SECRET || "inventoryos-superadmin-dev-secret-change-me"

function hmacSign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex")
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export async function createSession(adminId: string, email: string) {
  const token = `${adminId}.${Date.now()}.${Math.random().toString(36).slice(2)}`
  const signature = hmacSign(token)
  const signedToken = `${token}.${signature}`
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await db.adminSession.create({
    data: { token: signedToken, adminId, adminEmail: email, expiresAt },
  })
  const store = await cookies()
  store.set(SESSION_COOKIE, signedToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  })
  return signedToken
}

export async function destroySession() {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) {
    await db.adminSession.deleteMany({ where: { token } }).catch(() => {})
  }
  store.delete(SESSION_COOKIE)
}

export type SessionAdmin = {
  id: string
  email: string
  name: string | null
  role: string
}

export async function getCurrentAdmin(): Promise<SessionAdmin | null> {
  try {
    const store = await cookies()
    const token = store.get(SESSION_COOKIE)?.value
    if (!token) return null
    const [payload, sig] = token.split(".")
    // token format: id.timestamp.rand.sig — reconstruct payload + verify sig
    const parts = token.split(".")
    const sigPart = parts[parts.length - 1]
    const payloadStr = parts.slice(0, -1).join(".")
    if (hmacSign(payloadStr) !== sigPart) return null
    const session = await db.adminSession.findUnique({ where: { token } })
    if (!session) return null
    if (session.expiresAt.getTime() < Date.now()) {
      await db.adminSession.delete({ where: { id: session.id } }).catch(() => {})
      return null
    }
    const admin = await db.adminUser.findUnique({ where: { id: session.adminId } })
    if (!admin) return null
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    }
  } catch {
    return null
  }
}

export async function requireAdmin(): Promise<SessionAdmin> {
  const admin = await getCurrentAdmin()
  if (!admin) throw new Error("UNAUTHORIZED")
  return admin
}
