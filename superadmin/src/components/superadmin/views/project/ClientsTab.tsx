"use client"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { EmptyState } from "@/components/superadmin/shared/Primitives"
import {
  Search, Users, RefreshCw, Check, X, Phone, Mail, User as UserIcon,
} from "lucide-react"
import { formatNumber } from "@/lib/format"
import type { ProjectData } from "@/components/superadmin/views/project/ProjectView"

type Client = {
  email: string
  name: string | null
  phone: string | null
  isPaid: boolean
}

export function ClientsTab({ project }: { project: ProjectData }) {
  const [items, setItems] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    let active = true
    fetch(`/api/projects/${encodeURIComponent(project.key)}/clients`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d) => {
        if (active) setItems(d.items || [])
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
    fetch(`/api/projects/${encodeURIComponent(project.key)}/clients`)
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (c) =>
        c.email.toLowerCase().includes(q) ||
        (c.name?.toLowerCase().includes(q) ?? false) ||
        (c.phone?.toLowerCase().includes(q) ?? false)
    )
  }, [items, query])

  const paidCount = items.filter((c) => c.isPaid).length
  const unpaidCount = items.length - paidCount

  return (
    <div className="space-y-4">
      {/* summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Total clients" value={formatNumber(items.length)} accent="emerald" />
        <MiniStat label="Paid" value={formatNumber(paidCount)} accent="emerald" />
        <MiniStat label="Unpaid" value={formatNumber(unpaidCount)} accent="rose" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Users className="size-4" />
              App users
              {loading ? null : (
                <Badge variant="outline" className="text-[10px]">
                  {items.length} rows
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search email, name, phone…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-8 w-64 pl-8 text-xs"
                />
              </div>
              <Button size="sm" variant="outline" onClick={reload} disabled={loading}>
                <RefreshCw className="mr-1.5 size-3.5" /> Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="p-6">
              <EmptyState icon={Users} title="Couldn't load clients" description={error} />
            </div>
          ) : loading ? (
            <div className="h-32 animate-pulse bg-muted" />
          ) : filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Users}
                title={query ? "No matching clients" : "No clients in this app"}
                description={
                  query
                    ? `No users match "${query}".`
                    : "The schema map's usersTable has no rows — check the Settings tab."
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="pr-4 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 200).map((c) => (
                  <TableRow key={c.email}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2">
                        <Mail className="size-3.5 text-muted-foreground" />
                        <span className="font-mono text-xs">{c.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.name ? (
                        <span className="flex items-center gap-2 text-xs">
                          <UserIcon className="size-3.5 text-muted-foreground" />
                          {c.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {c.phone ? (
                        <span className="flex items-center gap-2 font-mono text-xs">
                          <Phone className="size-3.5 text-muted-foreground" />
                          {c.phone}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      {c.isPaid ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          <Check className="size-3" /> Paid
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <X className="size-3" /> Unpaid
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Reads via <code className="font-mono text-[10px]">listAppUsers()</code> from{" "}
        <code className="font-mono text-[10px]">@/lib/cross-db</code> — Phase 1 reads
        the MockAppUser mirror; Phase 2 swaps to{" "}
        <code className="font-mono text-[10px]">better-sqlite3</code> against{" "}
        <code className="font-mono text-[10px]">{project.dbPath || "<dbPath unset>"}</code>.
      </p>
    </div>
  )
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent: string
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-1 text-xl font-bold tracking-tight text-${accent}-600`}>{value}</p>
      </CardContent>
    </Card>
  )
}
