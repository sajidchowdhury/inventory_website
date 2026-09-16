"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatCard, PageHeader, EmptyState } from "@/components/superadmin/shared/Primitives"
import { ExportButton } from "@/components/superadmin/shared/ExportButton"
import { getIcon } from "@/components/superadmin/shared/icons"
import { formatDate, relativeTime } from "@/lib/format"
import type { LucideIcon } from "lucide-react"
import { toast } from "sonner"
import {
  Bell, CalendarClock, PhoneCall, RefreshCw, AlertTriangle, Phone, Clock,
} from "lucide-react"

type RenewalRow = {
  id: string
  clientEmail: string
  clientName: string | null
  clientPhone: string | null
  projectId: string
  projectKey: string
  projectName: string
  projectColor: string
  projectIcon: string
  cycleEnd: string
  daysUntil: number
  lastReminder: string | null
}

type RenewalsData = {
  upcoming: RenewalRow[]
  overdue: RenewalRow[]
  remindersCount: number
  recentReminders: Array<{
    id: string
    subscriptionId: string
    channel: string
    result: string | null
    sentAt: string
  }>
}

export function RenewalsView() {
  const [data, setData] = useState<RenewalsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [callingId, setCallingId] = useState<string | null>(null)

  // Active-flag fetch pattern — setState only fires inside promise callbacks.
  useEffect(() => {
    let active = true
    fetch("/api/renewals")
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
      const r = await fetch("/api/renewals")
      const d = await r.json()
      setData(d)
    } finally {
      setLoading(false)
    }
  }

  async function markCalled(row: RenewalRow) {
    setCallingId(row.id)
    try {
      const r = await fetch("/api/renewals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: row.id, action: "call" }),
      })
      if (r.ok) {
        toast.success(`Marked called — ${row.clientEmail}`, {
          description: `Reminder logged for ${row.projectName}`,
        })
        await refresh()
      } else {
        const e = await r.json().catch(() => ({}))
        toast.error(e.error || "Failed to log call")
      }
    } finally {
      setCallingId(null)
    }
  }

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Renewals & Reminders" description="Upcoming renewals and overdue clients to chase." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="h-24 animate-pulse rounded-xl bg-muted" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const upcomingCount = data.upcoming.length
  const overdueCount = data.overdue.length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Renewals & Reminders"
        description="Upcoming renewals and overdue clients to chase."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className="mr-2 size-3.5" /> Refresh
            </Button>
            <ExportButton url="/api/export/renewals" />
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Upcoming (≤7 days)"
          value={String(upcomingCount)}
          sub="active subs ending this week"
          icon={CalendarClock}
          accent="amber"
        />
        <StatCard
          label="Overdue"
          value={String(overdueCount)}
          sub="expired, awaiting renewal"
          icon={AlertTriangle}
          accent="rose"
        />
        <StatCard
          label="Reminders sent (30d)"
          value={String(data.remindersCount)}
          sub="email + call outreach"
          icon={Bell}
          accent="emerald"
        />
      </div>

      {/* Upcoming renewals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Clock className="size-4 text-amber-600" />
            Upcoming renewals
            <Badge variant="outline" className="ml-1 text-[10px]">{upcomingCount}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {upcomingCount === 0 ? (
            <div className="px-4 pb-4">
              <EmptyState
                icon={CalendarClock}
                title="No renewals due this week"
                description="Active subscriptions ending within 7 days will appear here."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Client</th>
                    <th className="px-4 py-2.5 font-medium">Project</th>
                    <th className="px-4 py-2.5 text-right font-medium">Cycle end</th>
                    <th className="px-4 py-2.5 text-right font-medium">Days left</th>
                  </tr>
                </thead>
                <tbody>
                  {data.upcoming.map((row) => {
                    const Icon = getIcon(row.projectIcon)
                    return <UpcomingRenewalRow key={row.id} row={row} icon={Icon} />
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overdue */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="size-4 text-rose-600" />
            Overdue — clients to chase
            <Badge variant="outline" className="ml-1 bg-rose-50 text-rose-700 text-[10px]">
              {overdueCount}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {overdueCount === 0 ? (
            <div className="px-4 pb-4">
              <EmptyState
                icon={Bell}
                title="No overdue subscriptions"
                description="Expired subscriptions still awaiting renewal will surface here."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Client</th>
                    <th className="px-4 py-2.5 font-medium">Project</th>
                    <th className="px-4 py-2.5 text-right font-medium">Expired on</th>
                    <th className="px-4 py-2.5 text-right font-medium">Last reminder</th>
                    <th className="px-4 py-2.5 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.overdue.map((row) => {
                    const Icon = getIcon(row.projectIcon)
                    return (
                      <OverdueRenewalRow
                        key={row.id}
                        row={row}
                        icon={Icon}
                        calling={callingId === row.id}
                        onCall={() => markCalled(row)}
                      />
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Module-level row components — never defined inline during parent render
// (react-hooks/static-components lint rule).

function UpcomingRenewalRow({ row, icon: Icon }: { row: RenewalRow; icon: LucideIcon }) {
  const days = row.daysUntil
  const dayClass =
    days <= 3 ? "text-rose-600 font-semibold" : days <= 7 ? "text-amber-600 font-semibold" : "text-muted-foreground"
  const dayLabel = days <= 0 ? "today" : `${days}d`
  return (
    <tr className="border-b border-border/40 hover:bg-muted/40">
      <td className="px-4 py-2.5">
        <div className="font-medium">{row.clientEmail}</div>
        {row.clientName && (
          <div className="text-xs text-muted-foreground">{row.clientName}</div>
        )}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className={`flex size-6 items-center justify-center rounded-md bg-${row.projectColor}-50`}>
            <Icon className={`size-3 text-${row.projectColor}-600`} />
          </div>
          <Badge variant="outline" className="text-[10px]">{row.projectName}</Badge>
        </div>
      </td>
      <td className="px-4 py-2.5 text-right text-muted-foreground">{formatDate(row.cycleEnd)}</td>
      <td className="px-4 py-2.5 text-right">
        <span className={dayClass}>{dayLabel}</span>
      </td>
    </tr>
  )
}

function OverdueRenewalRow({
  row,
  icon: Icon,
  calling,
  onCall,
}: {
  row: RenewalRow
  icon: LucideIcon
  calling: boolean
  onCall: () => void
}) {
  return (
    <tr className="border-b border-border/40 hover:bg-muted/40">
      <td className="px-4 py-2.5">
        <div className="font-medium">{row.clientEmail}</div>
        {row.clientPhone && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="size-3" /> {row.clientPhone}
          </div>
        )}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className={`flex size-6 items-center justify-center rounded-md bg-${row.projectColor}-50`}>
            <Icon className={`size-3 text-${row.projectColor}-600`} />
          </div>
          <Badge variant="outline" className="text-[10px]">{row.projectName}</Badge>
        </div>
      </td>
      <td className="px-4 py-2.5 text-right text-rose-600">{formatDate(row.cycleEnd)}</td>
      <td className="px-4 py-2.5 text-right text-muted-foreground">
        {row.lastReminder ? (
          <span title={row.lastReminder}>{relativeTime(row.lastReminder)}</span>
        ) : (
          <span className="text-xs italic">never</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        <Button
          size="sm"
          variant="outline"
          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          disabled={calling}
          onClick={onCall}
        >
          <PhoneCall className="mr-1 size-3.5" />
          {calling ? "Logging…" : "Mark called"}
        </Button>
      </td>
    </tr>
  )
}
