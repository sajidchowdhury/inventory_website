"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader, EmptyState } from "@/components/superadmin/shared/Primitives"
import { getIcon } from "@/components/superadmin/shared/icons"
import { formatBDT, formatDateTime, relativeTime } from "@/lib/format"
import { toast } from "sonner"
import { Check, X, Receipt, RefreshCw } from "lucide-react"

type PendingItem = {
  id: string
  projectId: string
  projectKey: string
  projectName: string
  projectColor: string
  projectIcon: string
  clientEmail: string
  method: string
  txId: string
  amount: number
  status: string
  submittedAt: string
}

const METHOD_BADGE: Record<string, string> = {
  bkash: "bg-pink-100 text-pink-700 border-pink-200",
  nagad: "bg-orange-100 text-orange-700 border-orange-200",
  bank: "bg-blue-100 text-blue-700 border-blue-200",
}

export function PendingPaymentsView() {
  const [items, setItems] = useState<PendingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState("")

  // Initial fetch — setState only fires inside promise callbacks (async),
  // never synchronously in the effect body.
  useEffect(() => {
    let active = true
    fetch("/api/payments?status=pending")
      .then((r) => r.json())
      .then((d) => {
        if (active) setItems(d.items || [])
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function refresh() {
    setLoading(true)
    const r = await fetch("/api/payments?status=pending")
    const d = await r.json()
    setItems(d.items || [])
    setLoading(false)
  }

  async function approve(item: PendingItem) {
    const r = await fetch("/api/payments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, action: "approve" }),
    })
    if (r.ok) {
      toast.success(`Approved — ${item.clientEmail} activated for ${item.projectName}`)
      refresh()
    } else {
      const e = await r.json().catch(() => ({}))
      toast.error(e.error || "Approve failed")
    }
  }

  async function confirmReject() {
    if (!rejectingId) return
    const r = await fetch("/api/payments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rejectingId, action: "reject", notes: rejectNote }),
    })
    if (r.ok) {
      toast.info("Payment rejected")
      setRejectingId(null)
      setRejectNote("")
      refresh()
    } else {
      toast.error("Reject failed")
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pending Payments"
        description="Verify each transaction ID on your phone, then approve or reject."
        action={
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className="mr-2 size-3.5" /> Refresh
          </Button>
        }
      />

      {loading ? (
        <Card>
          <CardContent className="h-32 animate-pulse bg-muted" />
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No pending payments"
          description="All caught up. New requests will appear here automatically."
        />
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {items.length} request{items.length === 1 ? "" : "s"} awaiting review
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/60">
              {items.map((it) => {
                const Icon = getIcon(it.projectIcon)
                return (
                  <div
                    key={it.id}
                    className="flex flex-col gap-3 px-4 py-3.5 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex size-9 items-center justify-center rounded-lg bg-${it.projectColor}-50`}>
                        <Icon className={`size-4 text-${it.projectColor}-600`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{it.projectName}</span>
                          <Badge variant="outline" className={`text-[10px] ${METHOD_BADGE[it.method] || ""}`}>
                            {it.method}
                          </Badge>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{it.clientEmail}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Txn ID</p>
                        <p className="font-mono text-xs">{it.txId}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Amount</p>
                        <p className="font-semibold">{formatBDT(it.amount)}</p>
                      </div>
                      <div className="hidden text-right lg:block">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Submitted</p>
                        <p className="text-xs" title={formatDateTime(it.submittedAt)}>
                          {relativeTime(it.submittedAt)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => approve(it)}
                        >
                          <Check className="mr-1 size-3.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-rose-200 text-rose-600 hover:bg-rose-50"
                          onClick={() => {
                            setRejectingId(it.id)
                            setRejectNote("")
                          }}
                        >
                          <X className="mr-1 size-3.5" /> Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-base">Reject this payment?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Add a note (optional) — this will be recorded in the audit log.
              </p>
              <Input
                placeholder="e.g. txn ID not found on my phone"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRejectingId(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={confirmReject}>
                  Confirm reject
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
