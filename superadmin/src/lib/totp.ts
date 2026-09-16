// TOTP (RFC 6238) helpers for admin 2FA — backed by otplib.
// Used by /api/2fa/* and /api/auth/verify-2fa. See plan §12 (2FA in Phase 3).
import { authenticator } from "otplib"

const ISSUER = "InventoryOS SuperAdmin"

/** Generate a fresh base32 secret for a new 2FA enrollment. */
export function generateSecret(): string {
  return authenticator.generateSecret()
}

/** Build the otpauth:// URI for QR-code apps (Google Authenticator, Authy, etc.). */
export function keyuri(email: string, secret: string): string {
  return authenticator.keyuri(email, ISSUER, secret)
}

/** Generate the current 6-digit token (for display/testing — not used in login). */
export function generateToken(secret: string): string {
  return authenticator.generate(secret)
}

/** Verify a 6-digit token against a secret. Returns true if valid. */
export function verifyToken(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token: token.trim(), secret })
  } catch {
    return false
  }
}
