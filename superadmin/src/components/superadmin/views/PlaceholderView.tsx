"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { NAV_ICONS } from "@/components/superadmin/shared/icons"
import { type ViewKey } from "@/stores/superadmin"
import { Hammer } from "lucide-react"

export function PlaceholderView({
  view,
  title,
}: {
  view: ViewKey
  title: string
}) {
  const Icon = NAV_ICONS[view] || Hammer
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between border-b border-border/60 pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This module is next on the Phase 1 build queue.
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 border-amber-200 text-amber-700">
          <span className="size-1.5 rounded-full bg-amber-500" /> In progress
        </Badge>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50">
            <Icon className="size-7 text-emerald-600" />
          </div>
          <p className="mt-4 text-base font-medium">{title}</p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Scheduled in the implementation plan §15. The data layer, auth, sidebar, dashboard and
            pending-payments approval flow are already live; this view is wired in next.
          </p>
          <pre className="mt-6 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            view = &quot;{view}&quot;
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
