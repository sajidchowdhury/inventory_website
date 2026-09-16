"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader, StatCard } from "@/components/superadmin/shared/Primitives"
import { Settings, CreditCard, Mail, Fingerprint, Clock, Check, X, Users, FolderKanban, ShieldCheck, Receipt } from "lucide-react"
import { formatNumber } from "@/lib/format"

type Status = {
  bkash: { mode: string; configured: boolean; needs: string[] }
  smtp: { configured: boolean; host: string | null; from: string | null }
  sso: { configured: boolean; secret: boolean }
  cron: { secret: boolean }
  counts: { admins: number; projects: number; clients: number; twoFactorEnabled: number; pendingPayments: number }
}

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string | null }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
        {ok ? (
          <Badge className="gap-1 bg-emerald-100 text-emerald-700"><Check className="size-3" /> On</Badge>
        ) : (
          <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700"><X className="size-3" /> Off</Badge>
        )}
      </div>
    </div>
  )
}

export function SystemSettingsView() {
  const [data, setData] = useState<Status | null>(null)

  useEffect(() => {
    let active = true
    fetch("/api/system/status")
      .then((r) => r.json())
      .then((d) => {
        if (active) setData(d)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader title="System Settings" description="One-glance view of what's configured + what still needs env vars." />

      {data ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard label="Admins" value={formatNumber(data.counts.admins)} icon={ShieldCheck} accent="emerald" sub={`${data.counts.twoFactorEnabled} with 2FA`} />
            <StatCard label="Projects" value={formatNumber(data.counts.projects)} icon={FolderKanban} accent="cyan" />
            <StatCard label="Clients" value={formatNumber(data.counts.clients)} icon={Users} accent="violet" />
            <StatCard label="Pending" value={formatNumber(data.counts.pendingPayments)} icon={Receipt} accent="rose" sub="awaiting approval" />
            <StatCard label="2FA enabled" value={formatNumber(data.counts.twoFactorEnabled)} icon={ShieldCheck} accent="amber" sub={`${data.counts.admins} admins total`} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium"><CreditCard className="size-4 text-emerald-600" /> bKash automated payments</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusRow label="Mode" ok={!data.bkash.configured ? false : true} detail={data.bkash.mode} />
                <div className="mt-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  <p className="mb-1 font-medium text-foreground">Env vars needed for live mode:</p>
                  <code className="text-[11px]">{data.bkash.needs.join(", ")}</code>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium"><Mail className="size-4 text-emerald-600" /> SMTP (dunning emails)</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusRow label="Configured" ok={data.smtp.configured} detail={data.smtp.host || "not set"} />
                <StatusRow label="From address" ok={!!data.smtp.from} detail={data.smtp.from || "default"} />
                <div className="mt-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  Off = dunning emails log to <code>/tmp/inventoryos-emails.log</code> instead of sending.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium"><Fingerprint className="size-4 text-emerald-600" /> SSO</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusRow label="Signing secret" ok={data.sso.secret} detail={data.sso.configured ? "SSO_SECRET or AUTH_SECRET" : "missing"} />
                <div className="mt-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  Product apps verify tokens via <code>GET /api/sso/verify?token=...</code>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium"><Clock className="size-4 text-emerald-600" /> Cron jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusRow label="CRON_SECRET set" ok={data.cron.secret} />
                <div className="mt-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  <code>/api/cron/expire</code> · <code>/api/cron/reminders</code> · <code>/api/cron/sync-clients</code> — all runnable from the dashboard "System Jobs" card or systemd timers.
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
              <Settings className="size-4 shrink-0 text-emerald-600" />
              <p>Everything here flips from off/mock to live by setting env vars on the VPS — no code change. See <code>PHASE2_VES_DEPLOYMENT.md</code>.</p>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex h-32 items-center justify-center">
            <div className="size-5 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
