"use client"
import { useEffect, useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { getIcon } from "@/components/superadmin/shared/icons"
import { formatNumber, formatDate } from "@/lib/format"
import {
  Users,
  UserCheck,
  UserX,
  Search,
  RefreshCw,
} from "lucide-react"

type ClientRow = {
  id: string
  projectId: string
  projectKey: string
  projectName: string
  projectColor: string
  projectIcon: string
  email: string
  name: string | null
  phone: string | null
  createdAt: string
  status: "active" | "expired" | "none"
  cycleEnd?: string
}

type ProjectOption = {
  id: string
  key: string
  name: string
  color: string
  icon: string
  isRoot?: boolean
}

const STATUS_BADGE: Record<
  ClientRow["status"],
  { label: string; className: string }
> = {
  active: {
    label: "Active",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  expired: {
    label: "Expired",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  none: {
    label: "No sub",
    className: "bg-slate-50 text-slate-600 border-slate-200",
  },
}

export function AllClientsView() {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [loading, setLoading] = useState(true)
  const [projectFilter, setProjectFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState("")

  // Initial load — active-flag pattern: setState only fires inside promise
  // callbacks, never synchronously in the effect body.
  useEffect(() => {
    let active = true
    Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
    ])
      .then(([c, p]) => {
        if (!active) return
        setClients(c.items || [])
        setProjects(
          (p.items || []).filter((x: ProjectOption) => !x.isRoot),
        )
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
      const [c, p] = await Promise.all([
        fetch("/api/clients").then((r) => r.json()),
        fetch("/api/projects").then((r) => r.json()),
      ])
      setClients(c.items || [])
      setProjects((p.items || []).filter((x: ProjectOption) => !x.isRoot))
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return clients.filter((c) => {
      if (projectFilter !== "all" && c.projectId !== projectFilter) return false
      if (statusFilter !== "all" && c.status !== statusFilter) return false
      if (q && !`${c.name || ""} ${c.email}`.toLowerCase().includes(q))
        return false
      return true
    })
  }, [clients, projectFilter, statusFilter, search])

  const stats = useMemo(() => {
    let activeCount = 0
    let expired = 0
    for (const c of filtered) {
      if (c.status === "active") activeCount++
      else if (c.status === "expired") expired++
    }
    return { total: filtered.length, active: activeCount, expired }
  }, [filtered])

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Clients"
        description="Every client across every product."
        action={
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className="mr-2 size-3.5" /> Refresh
          </Button>
        }
      />

      {/* stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total clients"
          value={formatNumber(stats.total)}
          sub="matching current filters"
          icon={Users}
          accent="emerald"
        />
        <StatCard
          label="Active subs"
          value={formatNumber(stats.active)}
          sub="cycle in date"
          icon={UserCheck}
          accent="cyan"
        />
        <StatCard
          label="Expired subs"
          value={formatNumber(stats.expired)}
          sub="needs renewal"
          icon={UserX}
          accent="rose"
        />
      </div>

      {/* filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="md:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="none">No sub</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* table */}
      {loading ? (
        <Card>
          <CardContent className="h-32 animate-pulse bg-muted" />
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients match"
          description="Try adjusting your project / status filters or the search box."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Client</th>
                    <th className="px-4 py-2.5 font-medium">Project</th>
                    <th className="px-4 py-2.5 font-medium">Phone</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const Icon = getIcon(c.projectIcon)
                    const badge = STATUS_BADGE[c.status]
                    return (
                      <tr
                        key={c.id}
                        className="border-b border-border/40 hover:bg-muted/40"
                      >
                        <td className="px-4 py-2.5">
                          <div className="font-medium">
                            {c.name || c.email}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {c.email}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md bg-${c.projectColor}-50 px-2 py-1 text-xs text-${c.projectColor}-600`}
                          >
                            <Icon className="size-3" />
                            {c.projectName}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {c.phone || (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${badge.className}`}
                          >
                            {badge.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {formatDate(c.createdAt)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
