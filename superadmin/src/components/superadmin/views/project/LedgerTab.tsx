"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { EmptyState } from "@/components/superadmin/shared/Primitives"
import {
  Receipt, RefreshCw, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
} from "lucide-react"
import { formatBDT, formatDateTime, relativeTime } from "@/lib/format"
import type { ProjectData } from "@/components/superadmin/views/project/ProjectView"

type LedgerRow = {
  id: string
  type: string
  amount: number
  reason: string
  txId: string | null
  createdAt: string
  clientEmail: string | null
}

type LedgerData = {
  total: number
  creditTotal: number
  debitTotal: number
  items: LedgerRow[]
}

export function LedgerTab({ project }: { project: ProjectData }) {
  const [data, setData] = useState<LedgerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch(`/api/projects/${encodeURIComponent(project.key)}/ledger`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d: LedgerData) => {
        if (active) setData(d)
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "fetch failed")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [project.key])

  function reload() {
    setLoading(true)
    fetch(`/api/projects/${encodeURIComponent(project.key)}/ledger`)
      .then((r) => r.json())
      .then((d: LedgerData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  return (
    <div className="space-y-4">
      {/* total cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TotalCard
          label="Net total"
          value={data ? formatBDT(data.total) : "—"}
          icon={Receipt}
          accent="emerald"
        />
        <TotalCard
          label="Credits (all-time)"
          value={data ? formatBDT(data.creditTotal) : "—"}
          icon={ArrowUpRight}
          accent="emerald"
        />
        <TotalCard
          label="Debits (all-time)"
          value={data ? formatBDT(data.debitTotal) : "—"}
          icon={ArrowDownRight}
          accent="rose"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Receipt className="size-4" />
              Ledger
              {data && (
                <Badge variant="outline" className="text-[10px]">
                  {data.items.length} entries
                </Badge>
              )}
            </CardTitle>
            <Button size="sm" variant="outline" onClick={reload} disabled={loading}>
              <RefreshCw className="mr-1.5 size-3.5" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="p-6">
              <EmptyState icon={Receipt} title="Couldn't load ledger" description={error} />
            </div>
          ) : loading ? (
            <div className="h-32 animate-pulse bg-muted" />
          ) : !data || data.items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Receipt}
                title="No ledger entries yet"
                description="Approved payments will automatically create ledger credits for this project."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="pr-4">Txn ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="pl-4">
                      <div className="leading-tight">
                        <p className="text-xs">{formatDateTime(row.createdAt)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {relativeTime(row.createdAt)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.type === "credit" ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          <TrendingUp className="size-3" /> credit
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-50 text-rose-700 border-rose-200">
                          <TrendingDown className="size-3" /> debit
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          row.type === "credit"
                            ? "font-semibold text-emerald-600"
                            : "font-semibold text-rose-600"
                        }
                      >
                        {row.type === "credit" ? "+" : "−"}
                        {formatBDT(row.amount)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{row.reason}</TableCell>
                    <TableCell>
                      {row.clientEmail ? (
                        <span className="font-mono text-[11px]">{row.clientEmail}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-4">
                      {row.txId ? (
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {row.txId}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TotalCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  accent: string
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={`mt-1 text-2xl font-bold tracking-tight text-${accent}-600`}>{value}</p>
        </div>
        <div className={`flex size-10 items-center justify-center rounded-xl bg-${accent}-50`}>
          <Icon className={`size-5 text-${accent}-600`} />
        </div>
      </CardContent>
    </Card>
  )
}
