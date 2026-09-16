"use client"
import { useEffect, useState } from "react"
import { useSuperAdmin } from "@/stores/superadmin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatCard, PageHeader } from "@/components/superadmin/shared/Primitives"
import { getIcon } from "@/components/superadmin/shared/icons"
import { formatBDT, formatNumber, formatBytes, relativeTime } from "@/lib/format"
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts"
import {
  Users, Wallet, TrendingUp, Receipt, ArrowUpRight, ArrowRight, Database,
  CalendarX, Bell, RefreshCw,
} from "lucide-react"
import { toast } from "sonner"

type ProjectRow = {
  id: string
  key: string
  name: string
  icon: string
  color: string
  landingUrl: string | null
  clientCount: number
  activeCount: number
  pendingCount: number
  monthlyAmount: number
  incomeThisMonth: number
  dbSize: number
  mrr: number
}

type Stats = {
  totals: {
    totalClients: number
    activeSubs: number
    expiredSubs: number
    pendingPayments: number
    incomeThisMonth: number
    mrr: number
  }
  clientGrowth: Array<{ month: string; income: number }>
  incomeChart: Array<{ name: string; amount: number; color: string }>
  projects: ProjectRow[]
}

const COLORS: Record<string, string> = {
  emerald: "#10b981",
  amber: "#f59e0b",
  cyan: "#06b6d4",
  blue: "#3b82f6",
  violet: "#8b5cf6",
  rose: "#f43f5e",
  slate: "#64748b",
}

export function DashboardView() {
  const { openProject, setView } = useSuperAdmin()
  const [data, setData] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="h-28 animate-pulse rounded-xl bg-muted" />
          </Card>
        ))}
      </div>
    )
  }

  const { totals } = data
  const subPie = [
    { name: "Active", value: totals.activeSubs, color: COLORS.emerald },
    { name: "Expired", value: totals.expiredSubs, color: COLORS.rose },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Cross-project overview — income, clients, subscriptions."
        action={
          <Button variant="outline" size="sm" onClick={() => setView("add-project")}>
            <ArrowRight className="mr-2 size-4" /> Add Project
          </Button>
        }
      />

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Clients"
          value={formatNumber(totals.totalClients)}
          sub={`${totals.activeSubs} active · ${totals.expiredSubs} expired`}
          icon={Users}
          accent="emerald"
        />
        <StatCard
          label="Income (this month)"
          value={formatBDT(totals.incomeThisMonth)}
          sub={`MRR ${formatBDT(totals.mrr)}`}
          icon={Wallet}
          accent="cyan"
        />
        <StatCard
          label="Active Subscriptions"
          value={formatNumber(totals.activeSubs)}
          sub={`${totals.pendingPayments} awaiting approval`}
          icon={TrendingUp}
          accent="violet"
        />
        <StatCard
          label="Pending Payments"
          value={formatNumber(totals.pendingPayments)}
          sub="needs your review"
          icon={Receipt}
          accent="rose"
        />
      </div>

      {/* charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Income — last 6 months</CardTitle>
            <Badge variant="outline" className="text-xs">All projects</Badge>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.clientGrowth}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => formatBDT(v)}
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                />
                <Area type="monotone" dataKey="income" stroke={COLORS.emerald} strokeWidth={2} fill="url(#incomeGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Subscription status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={subPie}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {subPie.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex justify-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ background: COLORS.emerald }} /> Active ({totals.activeSubs})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ background: COLORS.rose }} /> Expired ({totals.expiredSubs})
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* income by project bar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Income by project — this month</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.incomeChart} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={90} />
              <Tooltip formatter={(v: number) => formatBDT(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                {data.incomeChart.map((d, i) => (
                  <Cell key={i} fill={COLORS[d.color] || COLORS.slate} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* project table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Projects</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Project</th>
                  <th className="px-4 py-2.5 text-right font-medium">Clients</th>
                  <th className="px-4 py-2.5 text-right font-medium">Active</th>
                  <th className="px-4 py-2.5 text-right font-medium">Pending</th>
                  <th className="px-4 py-2.5 text-right font-medium">Monthly</th>
                  <th className="px-4 py-2.5 text-right font-medium">Income (mo)</th>
                  <th className="px-4 py-2.5 text-right font-medium">DB size</th>
                  <th className="px-4 py-2.5 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {data.projects.map((p) => {
                  const Icon = getIcon(p.icon)
                  return (
                    <tr key={p.id} className="border-b border-border/40 hover:bg-muted/40">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className={`flex size-7 items-center justify-center rounded-lg bg-${p.color}-50`}>
                            <Icon className={`size-3.5 text-${p.color}-600`} />
                          </div>
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">{formatNumber(p.clientCount)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="text-emerald-600">{p.activeCount}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {p.pendingCount > 0 ? (
                          <Badge className="bg-rose-100 text-rose-700">{p.pendingCount}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">{formatBDT(p.monthlyAmount)}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{formatBDT(p.incomeThisMonth)}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Database className="size-3" />
                          {formatBytes(p.dbSize)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => openProject(p.key)}>
                          Open <ArrowUpRight className="ml-1 size-3" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* System jobs — manual trigger for the Phase 2 cron routes */}
      <SystemJobsCard />
    </div>
  )
}

function SystemJobsCard() {
  const [busy, setBusy] = useState<string | null>(null)

  async function run(job: "expire" | "reminders" | "sync-clients", label: string) {
    setBusy(job)
    try {
      const r = await fetch(`/api/cron/${job}`, { method: "POST" })
      const d = await r.json()
      if (!r.ok) {
        toast.error(`${label} failed: ${d.error || r.status}`)
        return
      }
      const summary =
        job === "expire"
          ? `${d.expired} subscriptions expired`
          : job === "reminders"
          ? `${d.remindersSent} reminders sent · ${d.overdueForCall} overdue for call`
          : `${d.totalUpserted} clients synced from app DBs`
      toast.success(`${label}: ${summary}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">System Jobs</CardTitle>
        <p className="text-xs text-muted-foreground">
          Manual triggers for the scheduled jobs. On the VPS these run via systemd timers (see PHASE2_VPS_DEPLOYMENT.md).
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Button
            variant="outline"
            className="h-auto justify-start gap-2 py-3"
            disabled={busy !== null}
            onClick={() => run("expire", "Expire overdue")}
          >
            <CalendarX className="size-4 text-rose-500" />
            <div className="text-left">
              <p className="text-xs font-medium">Expire overdue</p>
              <p className="text-[10px] text-muted-foreground">subs past cycleEnd → expired</p>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto justify-start gap-2 py-3"
            disabled={busy !== null}
            onClick={() => run("reminders", "Send reminders")}
          >
            <Bell className="size-4 text-amber-500" />
            <div className="text-left">
              <p className="text-xs font-medium">Send reminders</p>
              <p className="text-[10px] text-muted-foreground">email ≤3-day expiries + flag overdue</p>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto justify-start gap-2 py-3"
            disabled={busy !== null}
            onClick={() => run("sync-clients", "Sync clients")}
          >
            <RefreshCw className={busy === "sync-clients" ? "size-4 animate-spin text-emerald-500" : "size-4 text-emerald-500"} />
            <div className="text-left">
              <p className="text-xs font-medium">Sync clients</p>
              <p className="text-[10px] text-muted-foreground">pull real app users into cross-index</p>
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
