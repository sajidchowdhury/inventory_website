// SSO token issuer + verifier — SuperAdmin as the identity provider.
// Issues short-lived HMAC-signed tokens that product apps verify via the
// public /api/sso/verify endpoint. See plan §3 (Phase 3 SSO).
//
// Flow (production): user hits a product app not logged in → app redirects to
// SuperAdmin's SSO login → user authenticates → SuperAdmin issues a signed
// token scoped to (email, projectKey) → redirects back to the app with
// ?sso_token=... → app calls /api/sso/verify → on valid, creates its own
// session for that user.

import { createHmac, timingSafeEqual } from "node:crypto"

const SECRET = process.env.SSO_SECRET || process.env.AUTH_SECRET || "inventoryos-sso-dev-secret"
const DEFAULT_TTL_S = 5 * 60 // 5 minutes

export type SsoPayload = {
  email: string
  projectKey: string
  exp: number // epoch seconds
}

export function issueToken(payload: { email: string; projectKey: string; ttlSec?: number }): string {
  const exp = Math.floor(Date.now() / 1000) + (payload.ttlSec ?? DEFAULT_TTL_S)
  const body = `${payload.email}|${payload.projectKey}|${exp}`
  const sig = createHmac("sha256", SECRET).update(body).digest("hex")
  return Buffer.from(`${body}|${sig}`).toString("base64url")
}

export function verifyToken(token: string): { ok: true; payload: SsoPayload } | { ok: false; error: string } {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8")
    const parts = decoded.split("|")
    if (parts.length !== 4) return { ok: false, error: "malformed" }
    const [email, projectKey, expStr, sig] = parts
    const body = `${email}|${projectKey}|${expStr}`
    const expectedSig = createHmac("sha256", SECRET).update(body).digest("hex")
    const a = Buffer.from(sig)
    const b = Buffer.from(expectedSig)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, error: "bad signature" }
    }
    const exp = Number(expStr)
    if (Number.isNaN(exp) || exp * 1000 < Date.now()) {
      return { ok: false, error: "expired" }
    }
    return { ok: true, payload: { email, projectKey, exp } }
  } catch {
    return { ok: false, error: "invalid token" }
  }
}
