"use client"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { PageHeader, EmptyState } from "@/components/superadmin/shared/Primitives"
import { formatDateTime } from "@/lib/format"
import {
  ScrollText, Search, RefreshCw, Filter, ChevronDown, ChevronRight,
} from "lucide-react"

type AuditItem = {
  id: string
  adminId: string | null
  adminEmail: string | null
  action: string
  target: string | null
  meta: string | null
  createdAt: string
}

// Category → tailwind color stem. Matches the safety block in Primitives.tsx.
const CATEGORY_COLOR: Record<string, string> = {
  auth: "blue",
  payment: "emerald",
  project: "violet",
  landing: "amber",
  schema: "cyan",
  reminder: "rose",
}

function categoryOf(action: string): string {
  // Use prefix match so "payment.approve" AND "paymentconfig.update" both map
  // to "payment" — same family of sensitive action.
  for (const key of Object.keys(CATEGORY_COLOR)) {
    if (action.startsWith(key)) return key
  }
  return "other"
}

function categoryClass(action: string): string {
  // Use only the color stems that the safety block in Primitives.tsx emits
  // verbatim (bg-*-50 + text-*-600) so Tailwind JIT picks them up.
  const stem = CATEGORY_COLOR[categoryOf(action)] || "slate"
  return `bg-${stem}-50 text-${stem}-600`
}

export function AuditLogView() {
  const [items, setItems] = useState<AuditItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [emailQuery, setEmailQuery] = useState("")
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // Active-flag fetch pattern.
  useEffect(() => {
    let active = true
    fetch("/api/audit")
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
    try {
      const r = await fetch("/api/audit")
      const d = await r.json()
      setItems(d.items || [])
    } finally {
      setLoading(false)
    }
  }

  // Unique action list — derived from fetched items.
  const uniqueActions = useMemo(() => {
    const set = new Set<string>()
    for (const it of items) set.add(it.action)
    return Array.from(set).sort()
  }, [items])

  // Client-side filter.
  const filtered = useMemo(() => {
    const q = emailQuery.trim().toLowerCase()
    return items.filter((it) => {
      if (actionFilter !== "all" && it.action !== actionFilter) return false
      if (q && !(it.adminEmail || "").toLowerCase().includes(q)) return false
      return true
    })
  }, [items, actionFilter, emailQuery])

  function toggleExpand(id: string) {
    setExpanded((s) => ({ ...s, [id]: !s[id] }))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Every sensitive action, recorded."
        action={
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className="mr-2 size-3.5" /> Refresh
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="size-4" /> Filters
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {uniqueActions.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search admin email…"
              value={emailQuery}
              onChange={(e) => setEmailQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {filtered.length} / {items.length} shown
          </div>
        </CardContent>
      </Card>

      {/* Log table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <ScrollText className="size-4 text-violet-600" />
            Recent activity
            <Badge variant="outline" className="ml-1 text-[10px]">newest 100</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="h-32 animate-pulse bg-muted" />
          ) : filtered.length === 0 ? (
            <div className="px-4 pb-4">
              <EmptyState
                icon={ScrollText}
                title={items.length === 0 ? "No audit entries yet" : "No matches for these filters"}
                description={
                  items.length === 0
                    ? "Sensitive actions will be recorded here as they happen."
                    : "Try clearing the action filter or email search."
                }
              />
            </div>
          ) : (
            <div className="max-h-[640px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Timestamp</th>
                    <th className="px-4 py-2.5 font-medium">Admin</th>
                    <th className="px-4 py-2.5 font-medium">Action</th>
                    <th className="px-4 py-2.5 font-medium">Target</th>
                    <th className="px-4 py-2.5 font-medium">Meta</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((it) => (
                    <AuditRow
                      key={it.id}
                      item={it}
                      expanded={!!expanded[it.id]}
                      onToggle={() => toggleExpand(it.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Module-level row component.
function AuditRow({
  item,
  expanded,
  onToggle,
}: {
  item: AuditItem
  expanded: boolean
  onToggle: () => void
}) {
  const parsed = useMemo(() => {
    if (!item.meta) return null
    try {
      const obj = JSON.parse(item.meta)
      return Object.keys(obj).length > 0 ? obj : null
    } catch {
      return null
    }
  }, [item.meta])

  return (
    <tr className="border-b border-border/40 align-top hover:bg-muted/40">
      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
        {formatDateTime(item.createdAt)}
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap text-xs">
        {item.adminEmail ? (
          <span className="font-medium">{item.adminEmail}</span>
        ) : (
          <span className="italic text-muted-foreground">system</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        <Badge variant="outline" className={`text-[10px] ${categoryClass(item.action)}`}>
          {item.action}
        </Badge>
      </td>
      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
        {item.target || <span className="italic">—</span>}
      </td>
      <td className="px-4 py-2.5">
        {parsed ? (
          <div>
            <button
              type="button"
              onClick={onToggle}
              className="flex items-center gap-1 text-[11px] font-medium text-violet-700 hover:underline"
            >
              {expanded ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
              {expanded ? "hide" : "view"} {Object.keys(parsed).length} key{Object.keys(parsed).length === 1 ? "" : "s"}
            </button>
            {expanded && (
              <pre className="mt-1 max-h-48 overflow-auto rounded-md bg-muted/60 p-2 text-[10px] leading-relaxed text-foreground/80">
                {JSON.stringify(parsed, null, 2)}
              </pre>
            )}
          </div>
        ) : (
          <span className="text-xs italic text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  )
}
