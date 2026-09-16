"use client"
import { useEffect, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { PageHeader, EmptyState } from "@/components/superadmin/shared/Primitives"
import { ShieldCheck, ShieldAlert, Loader2, KeyRound, Check, Copy } from "lucide-react"
import { toast } from "sonner"

type SetupData = { secret: string; otpauthUri: string }

export function SecurityView() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [setup, setSetup] = useState<SetupData | null>(null)
  const [token, setToken] = useState("")
  const [busy, setBusy] = useState(false)

  function loadStatus() {
    fetch("/api/2fa/status")
      .then((r) => r.json())
      .then((d) => setEnabled(!!d.enabled))
      .catch(() => setEnabled(false))
  }

  useEffect(() => {
    let active = true
    fetch("/api/2fa/status")
      .then((r) => r.json())
      .then((d) => {
        if (active) setEnabled(!!d.enabled)
      })
      .catch(() => {
        if (active) setEnabled(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function startEnroll() {
    setBusy(true)
    try {
      const r = await fetch("/api/2fa/setup", { method: "POST" })
      const d = await r.json()
      if (!r.ok) {
        toast.error(d.error || "Setup failed")
        return
      }
      setSetup(d)
      setToken("")
    } finally {
      setBusy(false)
    }
  }

  async function enable() {
    if (!setup || token.length !== 6) {
      toast.error("Enter the 6-digit code from your authenticator app")
      return
    }
    setBusy(true)
    try {
      const r = await fetch("/api/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: setup.secret, token }),
      })
      const d = await r.json()
      if (!r.ok) {
        toast.error(d.error || "Invalid code — try again")
        return
      }
      toast.success("2FA enabled — you'll need a 6-digit code on every login")
      setSetup(null)
      setToken("")
      loadStatus()
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    try {
      const r = await fetch("/api/2fa/disable", { method: "POST" })
      const d = await r.json()
      if (!r.ok) {
        toast.error(d.error || "Disable failed")
        return
      }
      toast.info("2FA disabled")
      loadStatus()
    } finally {
      setBusy(false)
    }
  }

  function copySecret() {
    if (!setup) return
    navigator.clipboard?.writeText(setup.secret)
    toast.success("Secret copied")
  }

  if (enabled === null) {
    return (
      <Card>
        <CardContent className="flex h-32 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-emerald-600" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security"
        description="Two-factor authentication (TOTP) for your admin account."
      />

      {/* status card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm font-medium">
            <span>Two-factor authentication</span>
            {enabled ? (
              <Badge className="gap-1.5 bg-emerald-100 text-emerald-700">
                <ShieldCheck className="size-3" /> Enabled
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1.5 border-amber-300 text-amber-700">
                <ShieldAlert className="size-3" /> Not enabled
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {enabled ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Your account requires a 6-digit code from your authenticator app on every login.
              </p>
              <Button variant="outline" onClick={disable} disabled={busy}>
                {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Disable 2FA
              </Button>
            </div>
          ) : !setup ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Add a second factor — a 6-digit time-based code from Google Authenticator / Authy.
              </p>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={startEnroll} disabled={busy}>
                {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <KeyRound className="mr-2 size-4" />}
                Enable 2FA
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* enrollment flow */}
      {setup && !enabled && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Scan + verify</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-6 md:grid-cols-[auto_1fr]">
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-xl border border-border/60 bg-white p-3">
                  <QRCodeSVG value={setup.otpauthUri} size={160} />
                </div>
                <p className="text-xs text-muted-foreground">Scan with your authenticator app</p>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Or enter this secret manually</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-xs break-all">
                      {setup.secret}
                    </code>
                    <Button size="icon" variant="outline" onClick={copySecret} className="size-9 shrink-0">
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="token">Enter the 6-digit code from your app</Label>
                  <Input
                    id="token"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="123456"
                    value={token}
                    onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
                    className="font-mono text-lg tracking-[0.5em]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={enable} disabled={busy || token.length !== 6}>
                    {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
                    Verify & enable
                  </Button>
                  <Button variant="outline" onClick={() => setSetup(null)} disabled={busy}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!enabled && !setup && (
        <EmptyState
          icon={ShieldCheck}
          title="2FA protects the keys to every project"
          description="SuperAdmin can flip is_paid in every app's database and edit every landing page. A second factor stops a stolen password from compromising all of them."
        />
      )}
    </div>
  )
}
