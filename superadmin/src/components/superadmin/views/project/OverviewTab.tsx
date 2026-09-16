"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/superadmin/shared/Primitives"
import {
  formatBDT, formatNumber, formatBytes, formatDateTime, relativeTime,
} from "@/lib/format"
import {
  Users, TrendingUp, Database, Wallet, CalendarDays,
  FolderTree, Server, FileCode2,
} from "lucide-react"
import type { ProjectData } from "@/components/superadmin/views/project/ProjectView"

export function OverviewTab({ project }: { project: ProjectData }) {
  const c = project.counts
  const accent = project.color || "emerald"

  return (
    <div className="space-y-6">
      {/* stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Clients"
          value={formatNumber(c.clientCount)}
          sub="from app DB via schema map"
          icon={Users}
          accent={accent}
        />
        <StatCard
          label="Active Subscriptions"
          value={formatNumber(c.activeSubs)}
          sub={`${c.pendingPayments} pending approval`}
          icon={TrendingUp}
          accent="violet"
        />
        <StatCard
          label="App DB size"
          value={formatBytes(c.dbSize)}
          sub={project.dbPath || "no dbPath set"}
          icon={Database}
          accent="cyan"
        />
        <StatCard
          label="MRR"
          value={formatBDT(c.mrr)}
          sub={`${formatBDT(project.paymentConfig?.monthlyAmount ?? 0)} × ${c.activeSubs}`}
          icon={Wallet}
          accent="amber"
        />
      </div>

      {/* two-column details */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Project details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DetailRow icon={FolderTree} label="Folder path" value={project.folderPath} mono />
            <DetailRow icon={Server} label="App port" value={project.appPort ? String(project.appPort) : null} mono />
            <DetailRow icon={Database} label="DB path" value={project.dbPath} mono />
            <DetailRow icon={CalendarDays} label="Created" value={`${formatDateTime(project.createdAt)} (${relativeTime(project.createdAt)})`} />
            <DetailRow
              icon={FileCode2}
              label="Schema map"
              value={
                <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed text-muted-foreground">
{JSON.stringify(project.schemaMap, null, 2)}
                </pre>
              }
              full
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">This month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Income" value={formatBDT(c.incomeThisMonth)} />
            <Row label="MRR" value={formatBDT(c.mrr)} />
            <Row label="Active subs" value={formatNumber(c.activeSubs)} />
            <Row label="Pending approvals" value={formatNumber(c.pendingPayments)} />
            <Row label="Total clients" value={formatNumber(c.clientCount)} />
            {project.paymentConfig && (
              <Row
                label="Monthly amount"
                value={`${formatBDT(project.paymentConfig.monthlyAmount)} · due day ${project.paymentConfig.dueDayOfMonth}`}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* last 5 payments mini-table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Last 5 payments</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {project.lastPayments.length === 0 ? (
            <p className="px-6 py-6 text-sm text-muted-foreground">
              No payments recorded for this project yet.
            </p>
          ) : (
            <div className="divide-y divide-border/60">
              {project.lastPayments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.clientEmail || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.reason} ·{" "}
                      <span title={formatDateTime(p.createdAt)}>
                        {relativeTime(p.createdAt)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {p.txId && (
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {p.txId}
                      </Badge>
                    )}
                    <span className="font-semibold text-emerald-600">
                      +{formatBDT(p.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
  full,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
  mono?: boolean
  full?: boolean
}) {
  return (
    <div className={full ? "" : "flex items-center justify-between gap-3"}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      {value === null || value === undefined || value === "" ? (
        <span className="text-xs text-muted-foreground/70">—</span>
      ) : (
        <div className={mono ? "font-mono text-xs" : "text-xs"}>{value}</div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}
