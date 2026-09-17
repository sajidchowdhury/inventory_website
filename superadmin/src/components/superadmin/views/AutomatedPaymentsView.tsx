"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/superadmin/shared/Primitives"
import { CreditCard, Loader2, ExternalLink, Check, Zap, Info } from "lucide-react"
import { toast } from "sonner"

type Project = { id: string; key: string; name: string; icon: string; color: string }

type CreateResult = {
  bkashURL: string
  paymentID: string
  requestId: string
  amount: number
  mockMode: boolean
}

export function AutomatedPaymentsView() {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectKey, setProjectKey] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [amount, setAmount] = useState("")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<CreateResult | null>(null)
  const [approving, setApproving] = useState(false)

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

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!projectKey || !clientEmail) {
      toast.error("Pick a project + enter the client email")
      return
    }
    setBusy(true)
    try {
      const r = await fetch("/api/bkash/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectKey, clientEmail, amount: amount ? Number(amount) : undefined }),
      })
      const d = await r.json()
      if (!r.ok) {
        toast.error(d.error || "Create failed")
        return
      }
      setResult(d)
      toast.success(`bKash payment created — ৳${d.amount}`)
    } finally {
      setBusy(false)
    }
  }

  async function simulateApprove() {
    if (!result) return
    setApproving(true)
    try {
      const r = await fetch(`/api/bkash/callback?paymentID=${encodeURIComponent(result.paymentID)}&status=success`)
      const text = await r.text()
      if (r.ok && text.includes("Auto-approved")) {
        toast.success("Auto-approved — subscription created, is_paid flipped, ledger credited")
        setResult(null)
      } else {
        toast.error("Auto-approve didn't complete — check dev log")
      }
    } finally {
      setApproving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automated Payments"
        description="bKash tokenized checkout — users pay online, the callback auto-approves. No manual review."
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm font-medium">
            <span>Create a bKash payment</span>
            <Badge variant="outline" className="gap-1.5 border-amber-300 text-amber-700">
              <Info className="size-3" /> Mock mode (no BKASH_* env)
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="project">Project</Label>
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
              <Label htmlFor="email">Client email</Label>
              <Input
                id="email"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@example.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount (BDT) — leave blank for project default</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="auto"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={busy}>
                {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CreditCard className="mr-2 size-4" />}
                Create bKash payment
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-emerald-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Payment ready</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Payment ID</p>
                <code className="text-xs">{result.paymentID}</code>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Amount</p>
                <p className="font-semibold">৳{result.amount}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Mode</p>
                <Badge className={result.mockMode ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}>
                  {result.mockMode ? "Mock" : "Live bKash"}
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={result.bkashURL} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLink className="mr-2 size-4" /> Open bKash checkout
                </Button>
              </a>
              {result.mockMode && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={simulateApprove} disabled={approving}>
                  {approving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Zap className="mr-2 size-4" />}
                  Simulate & auto-approve
                </Button>
              )}
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">Flow:</p>
              <ol className="ml-4 list-decimal space-y-0.5">
                <li><code>POST /api/bkash/create</code> → returns <code>bkashURL</code> + <code>paymentID</code></li>
                <li>User pays at <code>bkashURL</code> (real bKash checkout, or the mock simulate page)</li>
                <li>bKash redirects to <code>/api/bkash/callback?paymentID=...</code></li>
                <li>Callback calls <code>executePayment</code> → on <em>Completed</em>, auto-approves (Subscription + Ledger + <code>is_paid</code> flip + audit). No admin needed.</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
          <Check className="size-4 shrink-0 text-emerald-600" />
          <p>
            Configure on the real VPS by setting <code>BKASH_BASE_URL</code>, <code>BKASH_APP_KEY</code>,
            <code> BKASH_APP_SECRET</code>, <code>BKASH_USERNAME</code>, <code>BKASH_PASSWORD</code> in env.
            The module auto-switches from mock to live — no code change.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
