"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { StatCard, PageHeader } from "@/components/superadmin/shared/Primitives"
import { formatBytes } from "@/lib/format"
import {
  Cpu, MemoryStick, HardDrive, Activity, RefreshCw, Database,
} from "lucide-react"

type HealthData = {
  cpu: {
    load1: number
    load5: number
    load15: number
    cores: number
    model: string
  }
  memory: {
    total: number
    free: number
    used: number
    usedPct: number
  }
  disk: {
    total: number
    free: number
    used: number
    usedPct: number
    path: string
  } | null
  uptime: {
    seconds: number
    human: string
  }
  hostname: string
  platform: string
  platformRelease: string
  nodeVersion: string
}

export function ServerHealthView() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)

  // Active-flag fetch pattern.
  useEffect(() => {
    let active = true
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => {
        if (active) setData(d)
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
    try {
      const r = await fetch("/api/health")
      const d = await r.json()
      setData(d)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Server Health" description="VPS resource usage for the InventoryOS host." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="h-24 animate-pulse rounded-xl bg-muted" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Load average ratio to cores — 1.0 = exactly 1 core fully saturated.
  const loadPct = Math.min(100, (data.cpu.load1 / Math.max(1, data.cpu.cores)) * 100)
  const loadClass =
    loadPct > 80 ? "text-rose-600" : loadPct > 50 ? "text-amber-600" : "text-emerald-600"
  const memClass =
    data.memory.usedPct > 80 ? "text-rose-600" : data.memory.usedPct > 60 ? "text-amber-600" : "text-emerald-600"
  const diskClass =
    !data.disk || data.disk.usedPct > 80
      ? "text-rose-600"
      : data.disk.usedPct > 60
      ? "text-amber-600"
      : "text-emerald-600"

  return (
    <div className="space-y-6">
      <PageHeader
        title="Server Health"
        description="VPS resource usage for the InventoryOS host."
        action={
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className="mr-2 size-3.5" /> Refresh
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="CPU load (1-min)"
          value={data.cpu.load1.toFixed(2)}
          sub={`${data.cpu.cores} cores · load ${data.cpu.load5.toFixed(2)}/${data.cpu.load15.toFixed(2)}`}
          icon={Cpu}
          accent={loadPct > 80 ? "rose" : loadPct > 50 ? "amber" : "emerald"}
        />
        <StatCard
          label="RAM used"
          value={formatBytes(data.memory.used)}
          sub={`of ${formatBytes(data.memory.total)} · ${data.memory.usedPct.toFixed(0)}%`}
          icon={MemoryStick}
          accent={data.memory.usedPct > 80 ? "rose" : data.memory.usedPct > 60 ? "amber" : "emerald"}
        />
        <StatCard
          label="Disk used"
          value={data.disk ? formatBytes(data.disk.used) : "—"}
          sub={data.disk ? `of ${formatBytes(data.disk.total)} · ${data.disk.usedPct.toFixed(0)}%` : "statfs failed"}
          icon={HardDrive}
          accent={!data.disk || data.disk.usedPct > 80 ? "rose" : data.disk.usedPct > 60 ? "amber" : "emerald"}
        />
        <StatCard
          label="Uptime"
          value={data.uptime.human}
          sub={`${data.hostname} · ${data.platform}`}
          icon={Activity}
          accent="cyan"
        />
      </div>

      {/* Detail panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* RAM usage bar */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span className="flex items-center gap-2">
                <MemoryStick className="size-4 text-cyan-600" /> Memory
              </span>
              <span className={memClass}>{data.memory.usedPct.toFixed(1)}%</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={data.memory.usedPct} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatBytes(data.memory.used)} used</span>
              <span>{formatBytes(data.memory.free)} free</span>
            </div>
            <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
              Total physical memory: <span className="font-mono">{formatBytes(data.memory.total)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Disk usage bar */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span className="flex items-center gap-2">
                <HardDrive className="size-4 text-violet-600" /> Disk
              </span>
              <span className={diskClass}>
                {data.disk ? `${data.disk.usedPct.toFixed(1)}%` : "—"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.disk ? (
              <>
                <Progress value={data.disk.usedPct} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatBytes(data.disk.used)} used</span>
                  <span>{formatBytes(data.disk.free)} free</span>
                </div>
                <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                  Mount path: <span className="font-mono">{data.disk.path}</span>
                </div>
              </>
            ) : (
              <div className="rounded-md border border-dashed border-rose-200 bg-rose-50/40 p-3 text-xs text-rose-700">
                statfs failed on this host — disk metrics unavailable.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CPU + system detail */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Cpu className="size-4 text-emerald-600" /> CPU & system
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SystemStat label="Load (1m)" value={data.cpu.load1.toFixed(2)} valueClass={loadClass} />
            <SystemStat label="Load (5m)" value={data.cpu.load5.toFixed(2)} />
            <SystemStat label="Load (15m)" value={data.cpu.load15.toFixed(2)} />
            <SystemStat label="Cores" value={String(data.cpu.cores)} />
            <SystemStat label="Uptime" value={data.uptime.human} />
            <SystemStat label="Hostname" value={data.hostname} />
            <SystemStat label="Platform" value={`${data.platform} ${data.platformRelease}`} />
            <SystemStat label="Node" value={data.nodeVersion} />
          </div>
          <div className="mt-4 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            CPU model: <span className="font-mono">{data.cpu.model}</span>
          </div>
        </CardContent>
      </Card>

      {/* Per-project note */}
      <Card>
        <CardContent className="flex items-start gap-3 p-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
            <Database className="size-4 text-emerald-600" />
          </div>
          <div className="text-sm">
            <p className="font-medium">Per-project DB sizes live on each project&apos;s Overview tab</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Open a project from the sidebar → Overview to see its <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">cross-db.getAppDbSize</code> value, MRR, and active client count.
            </p>
          </div>
          <Badge variant="outline" className="ml-auto text-[10px]">cross-db</Badge>
        </CardContent>
      </Card>
    </div>
  )
}

// Module-level helper — presentational, no hooks.
function SystemStat({
  label,
  value,
  valueClass,
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 truncate text-sm font-semibold ${valueClass ?? ""}`} title={value}>
        {value}
      </p>
    </div>
  )
}
