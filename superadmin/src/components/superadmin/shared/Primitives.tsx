"use client"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { type LucideIcon } from "lucide-react"

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "emerald",
}: {
  label: string
  value: string
  sub?: string
  icon: LucideIcon
  accent?: string
}) {
  return (
    <Card className="overflow-hidden border-border/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
            {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-xl",
              `bg-${accent}-50`
            )}
          >
            <Icon className={cn("size-5", `text-${accent}-600`)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/60 pb-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <p className="mt-4 text-sm font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>}
    </div>
  )
}

// Tailwind dynamic class safety — these classes must appear verbatim somewhere
// for the JIT compiler to emit them. This block keeps the `bg-${accent}-50` /
// `text-${accent}-600` patterns working.
const _colorSafety = [
  "bg-emerald-50 text-emerald-600",
  "bg-amber-50 text-amber-600",
  "bg-cyan-50 text-cyan-600",
  "bg-blue-50 text-blue-600",
  "bg-violet-50 text-violet-600",
  "bg-rose-50 text-rose-600",
  "bg-slate-50 text-slate-600",
]
void _colorSafety
