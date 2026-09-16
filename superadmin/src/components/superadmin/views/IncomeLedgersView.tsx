"use client"
import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  PageHeader,
  StatCard,
  EmptyState,
} from "@/components/superadmin/shared/Primitives"
import { ExportButton } from "@/components/superadmin/shared/ExportButton"
import { getIcon } from "@/components/superadmin/shared/icons"
import { formatBDT, formatNumber, formatDateTime } from "@/lib/format"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  Wallet,
  TrendingUp,
  ScrollText,
  RefreshCw,
  ChevronDown,
} from "lucide-react"

type LedgerEntry = {
  id: string
  projectId: string
  projectKey: string
  projectName: string
  projectColor: string
  projectIcon: string
  type: string // "credit" | "debit"
  amount: number
  reason: string
  txId: string | null
  createdAt: string
  clientEmail: string | null
}

type SeriesPoint = { month: string; amount: number }

type EntriesResponse = {
  entries: LedgerEntry[]
  total: number
  incomeThisMonth: number
  mrr: number
}

type SeriesResponse = { series: SeriesPoint[]; total: number }

type ProjectOption = {
  id: string
  key: string
  name: string
  color: string
  icon: string
  isRoot?: boolean
}

const CHART_STROKE = "#10b981" // emerald-500 — matches the brand primary
const PAGE_SIZE = 100
// Range filter (days). All-time = 0 → no cutoff applied client-side.
const RANGES: Record<string, number> = {
  all: 0,
  "30": 30,
  "90": 90,
  "180": 180,
}

function buildQuery(params: Record<string, string | undefined>): string {
  const qp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v) qp.set(k, v)
  }
  const s = qp.toString()
  return s ? `?${s}` : ""
}

export function IncomeLedgersView() {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [series, setSeries] = useState<SeriesPoint[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [incomeThisMonth, setIncomeThisMonth] = useState(0)
  const [mrr, setMrr] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [projectFilter, setProjectFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [rangeFilter, setRangeFilter] = useState<string>("all")
  // How many entries have been fetched from the server (skip cursor).
  const [fetchedCount, setFetchedCount] = useState(PAGE_SIZE)

  // Load the project list once — used by the project <Select>.
  useEffect(() => {
    let active = true
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return
        setProjects(
          (d.items || []).filter((x: ProjectOption) => !x.isRoot),
        )
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  // Load entries + monthly series whenever a filter changes.
  // No synchronous setState in the effect body — all state writes happen
  // inside the promise callbacks (active-flag pattern).
  useEffect(() => {
    let active = true
    const projectId = projectFilter !== "all" ? projectFilter : undefined
    const type = typeFilter !== "all" ? typeFilter : undefined
    const entriesUrl = `/api/ledger${buildQuery({
      projectId,
      type,
      skip: "0",
    })}`
    const seriesUrl = `/api/ledger${buildQuery({
      series: "monthly",
      projectId,
    })}`
    Promise.all([
      fetch(entriesUrl)
        .then((r) => r.json())
        .catch(() => null),
      fetch(seriesUrl)
        .then((r) => r.json())
        .catch(() => null),
    ])
      .then(([e, s]: [EntriesResponse | null, SeriesResponse | null]) => {
        if (!active) return
        if (e) {
          setEntries(e.entries || [])
          setTotal(e.total || 0)
          setIncomeThisMonth(e.incomeThisMonth || 0)
          setMrr(e.mrr || 0)
        }
        if (s) setSeries(s.series || [])
        setFetchedCount(PAGE_SIZE)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [projectFilter, typeFilter])

  async function refresh() {
    setLoading(true)
    try {
      const projectId = projectFilter !== "all" ? projectFilter : undefined
      const type = typeFilter !== "all" ? typeFilter : undefined
      const [e, s] = await Promise.all([
        fetch(`/api/ledger${buildQuery({ projectId, type, skip: "0" })}`).then(
          (r) => r.json(),
        ),
        fetch(`/api/ledger${buildQuery({ series: "monthly", projectId })}`).then(
          (r) => r.json(),
        ),
      ])
      setEntries(e.entries || [])
      setTotal(e.total || 0)
      setIncomeThisMonth(e.incomeThisMonth || 0)
      setMrr(e.mrr || 0)
      setSeries(s.series || [])
      setFetchedCount(PAGE_SIZE)
    } finally {
      setLoading(false)
    }
  }

  async function loadMore() {
    if (loadingMore) return
    setLoadingMore(true)
    try {
      const projectId = projectFilter !== "all" ? projectFilter : undefined
      const type = typeFilter !== "all" ? typeFilter : undefined
      const r = await fetch(
        `/api/ledger${buildQuery({
          projectId,
          type,
          skip: String(fetchedCount),
        })}`,
      )
      const d: EntriesResponse = await r.json()
      setEntries((prev) => [...prev, ...(d.entries || [])])
      setFetchedCount((c) => c + (d.entries?.length || 0))
      setTotal(d.total)
    } finally {
      setLoadingMore(false)
    }
  }

  // Apply the optional period filter client-side (cutoff in days).
  const visibleEntries = useMemo(() => {
    const days = RANGES[rangeFilter] ?? 0
    if (!days) return entries
    const cutoff = Date.now() - days * 86400000
    return entries.filter((e) => new Date(e.createdAt).getTime() >= cutoff)
  }, [entries, rangeFilter])

  const activeProject = projects.find((p) => p.id === projectFilter)
  const chartScopeLabel =
    projectFilter === "all" ? "All projects" : activeProject?.name || "—"
  const hasMore = fetchedCount < total

  return (
    <div className="space-y-6">
      <PageHeader
        title="Income & Ledgers"
        description="Cross-project income and full ledger."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className="mr-2 size-3.5" /> Refresh
            </Button>
            <ExportButton url="/api/export/ledger" />
          </div>
        }
      />

      {/* top stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Income this month"
          value={formatBDT(incomeThisMonth)}
          sub="credits only"
          icon={Wallet}
          accent="emerald"
        />
        <StatCard
          label="MRR"
          value={formatBDT(mrr)}
          sub="monthly recurring revenue"
          icon={TrendingUp}
          accent="cyan"
        />
        <StatCard
          label="Total ledger entries"
          value={formatNumber(total)}
          sub="all matching the filter"
          icon={ScrollText}
          accent="violet"
        />
      </div>

      {/* income chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">
            Income — last 6 months
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {chartScopeLabel}
          </Badge>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={series}>
              <defs>
                <linearGradient
                  id="ledgerIncomeGrad"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={CHART_STROKE}
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="95%"
                    stopColor={CHART_STROKE}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e2e8f0"
                opacity={0.6}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                stroke="#64748b"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#64748b"
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(v: number) => formatBDT(v)}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke={CHART_STROKE}
                strokeWidth={2}
                fill="url(#ledgerIncomeGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="md:w-52">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="md:w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
              <SelectItem value="debit">Debit</SelectItem>
            </SelectContent>
          </Select>
          <Select value={rangeFilter} onValueChange={setRangeFilter}>
            <SelectTrigger className="md:w-40">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 3 months</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
            </SelectContent>
          </Select>
          <div className="md:ml-auto text-xs text-muted-foreground">
            {loading
              ? "Loading…"
              : `Showing ${visibleEntries.length} of ${total}`}
          </div>
        </CardContent>
      </Card>

      {/* ledger table */}
      {loading ? (
        <Card>
          <CardContent className="h-32 animate-pulse bg-muted" />
        </Card>
      ) : visibleEntries.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No ledger entries"
          description="No entries match the current filters yet."
        />
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Ledger entries
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">Project</th>
                    <th className="px-4 py-2.5 font-medium">Type</th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Amount
                    </th>
                    <th className="px-4 py-2.5 font-medium">Reason</th>
                    <th className="px-4 py-2.5 font-medium">Txn ID</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleEntries.map((e) => {
                    const Icon = getIcon(e.projectIcon)
                    const isCredit = e.type === "credit"
                    return (
                      <tr
                        key={e.id}
                        className="border-b border-border/40 hover:bg-muted/40"
                      >
                        <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                          {formatDateTime(e.createdAt)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md bg-${e.projectColor}-50 px-2 py-1 text-xs text-${e.projectColor}-600`}
                          >
                            <Icon className="size-3" />
                            {e.projectName}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              isCredit
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {e.type}
                          </Badge>
                        </td>
                        <td
                          className={`px-4 py-2.5 text-right font-medium ${
                            isCredit ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {isCredit ? "+" : "−"}
                          {formatBDT(e.amount)}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {e.reason}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                          {e.txId || "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <div className="flex justify-center border-t border-border/60 p-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  <ChevronDown className="mr-1.5 size-3.5" />
                  {loadingMore ? "Loading…" : "Load 100 more"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
