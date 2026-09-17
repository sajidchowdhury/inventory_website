"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/superadmin/shared/Primitives"
import { Fingerprint, Loader2, Copy, ShieldCheck, Check, X } from "lucide-react"
import { toast } from "sonner"

type Project = { id: string; key: string; name: string; icon: string; color: string }
type IssueResult = { token: string; expiresAt: number; verifyUrl: string }
type VerifyResult = { valid: boolean; email?: string; projectKey?: string; expiresAt?: number; error?: string }

export function SsoView() {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectKey, setProjectKey] = useState("")
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [issued, setIssued] = useState<IssueResult | null>(null)
  const [verify, setVerify] = useState<VerifyResult | null>(null)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    let active = true
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return
        const items = (d.items as Project[]).filter((p) => p.key !== "root")
        setProjects(items)
        if (items[0]) setProjectKey(items[0].key)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  async function issue(e: React.FormEvent) {
    e.preventDefault()
    if (!projectKey || !email) {
      toast.error("Pick a project + enter the email")
      return
    }
    setBusy(true)
    setVerify(null)
    try {
      const r = await fetch("/api/sso/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, projectKey }),
      })
      const d = await r.json()
      if (!r.ok) {
        toast.error(d.error || "Issue failed")
        return
      }
      setIssued(d)
      toast.success("SSO token issued (5-min TTL)")
    } finally {
      setBusy(false)
    }
  }

  async function verifyNow() {
    if (!issued) return
    setVerifying(true)
    try {
      const r = await fetch(issued.verifyUrl)
      const d = await r.json()
      setVerify(d)
    } finally {
      setVerifying(false)
    }
  }

  function copyToken() {
    if (!issued) return
    navigator.clipboard?.writeText(issued.token)
    toast.success("Token copied")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="SSO"
        description="SuperAdmin as the identity provider — issue a signed token a product app verifies to log a user in."
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Issue a token</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={issue} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="project">Project (scope)</Label>
              <select
                id="project"
                value={projectKey}
                onChange={(e) => setProjectKey(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.key}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">User email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={busy}>
                {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Fingerprint className="mr-2 size-4" />}
                Issue SSO token (5-min TTL)
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {issued && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Issued token</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded-md bg-muted px-3 py-2 font-mono text-xs">
                {issued.token}
              </code>
              <Button size="icon" variant="outline" onClick={copyToken} className="size-9 shrink-0">
                <Copy className="size-3.5" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={verifyNow} disabled={verifying}>
                {verifying ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ShieldCheck className="mr-2 size-4" />}
                Verify via /api/sso/verify
              </Button>
              <a href={issued.verifyUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm">
                  Open verify URL ↗
                </Button>
              </a>
            </div>
            {verify && (
              <div className={`rounded-lg border p-3 text-sm ${verify.valid ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
                <div className="flex items-center gap-2 font-medium">
                  {verify.valid ? (
                    <><Check className="size-4 text-emerald-600" /> <span className="text-emerald-700">Valid token</span></>
                  ) : (
                    <><X className="size-4 text-rose-600" /> <span className="text-rose-700">Invalid: {verify.error}</span></>
                  )}
                </div>
                {verify.valid && (
                  <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                    <p>email: <code>{verify.email}</code></p>
                    <p>projectKey: <code>{verify.projectKey}</code></p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Reference integration (product-app side)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
{`// In a product app (e.g. /mudaraba) — verify an SSO token from the callback:
const r = await fetch(
  "https://inventoryos.xyz/api/sso/verify?token=" + ssoToken
)
const { valid, email, projectKey } = await r.json()
if (valid && projectKey === "mudaraba") {
  // create the app's own session for this email
  session.user = await upsertUser(email)
} else {
  redirect("/login")
}`}
          </pre>
          <Badge variant="outline" className="mt-3 text-[10px]">
            HMAC-SHA256 signed · 5-min TTL · scoped to (email, projectKey)
          </Badge>
        </CardContent>
      </Card>
    </div>
  )
}
