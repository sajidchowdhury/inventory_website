// Server-only helper: write to the audit log from any API route.
import { db } from "@/lib/db"

export type AuditAction =
  | "auth.login"
  | "auth.logout"
  | "payment.approve"
  | "payment.reject"
  | "project.create"
  | "project.update"
  | "paymentconfig.update"
  | "landing.update"
  | "schema.validate"

export async function writeAudit(
  admin: { id: string; email: string } | null,
  action: AuditAction | string,
  target?: string,
  meta?: Record<string, unknown>
) {
  try {
    await db.auditLog.create({
      data: {
        adminId: admin?.id ?? null,
        adminEmail: admin?.email ?? null,
        action,
        target: target ?? null,
        meta: meta ? JSON.stringify(meta) : null,
      },
    })
  } catch {
    // never let audit failure break the request
  }
}
