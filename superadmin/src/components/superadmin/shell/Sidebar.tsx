"use client"
import { useEffect, useState } from "react"
import { useSuperAdmin, type ViewKey, navigate } from "@/stores/superadmin"
import { NAV_ICONS, getIcon } from "@/components/superadmin/shared/icons"
import { cn } from "@/lib/utils"
import {
  ChevronDown, ChevronRight, Folder, LogOut, Bell, ShieldCheck,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

type ProjectItem = {
  id: string
  key: string
  name: string
  icon: string
  color: string
  isRoot: boolean
}

const NAV: Array<{ key: ViewKey; label: string }> = [
  { key: "dashboard", label: "Dashboard" },
  { key: "pending-payments", label: "Pending Payments" },
  { key: "all-clients", label: "All Clients" },
  { key: "income-ledgers", label: "Income & Ledgers" },
  { key: "renewals", label: "Renewals" },
  { key: "server-health", label: "Server Health" },
  { key: "audit-log", label: "Audit Log" },
  { key: "add-project", label: "Add Project" },
  { key: "site", label: "Preview Root Site" },
]

export function Sidebar({ pendingCount = 0 }: { pendingCount?: number }) {
  const { view, activeProjectKey, projectsOpen, toggleProjects, setView } = useSuperAdmin()
  const [projects, setProjects] = useState<ProjectItem[]>([])

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.items || []))
      .catch(() => {})
  }, [])

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border/60 bg-sidebar">
      {/* brand */}
      <div className="flex h-14 items-center gap-2 border-b border-border/60 px-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <ShieldCheck className="size-4" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">InventoryOS</p>
          <p className="text-[10px] text-muted-foreground">SuperAdmin</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {/* cross-project */}
        <div className="space-y-0.5">
          {NAV.slice(0, 1).map((item) => {
            const Icon = NAV_ICONS[item.key]
            const active = view === item.key
            return (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* approval queue with badge */}
        <div className="mt-4 space-y-0.5">
          {NAV.slice(1, 2).map((item) => {
            const Icon = NAV_ICONS[item.key]
            const active = view === item.key
            return (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {pendingCount > 0 && (
                  <Badge className="bg-rose-500 text-white">{pendingCount}</Badge>
                )}
              </button>
            )
          })}
        </div>

        {/* Projects group */}
        <div className="mt-4">
          <button
            onClick={toggleProjects}
            className="flex w-full items-center gap-1 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
          >
            {projectsOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            <Folder className="size-3" />
            <span>Projects</span>
          </button>
          {projectsOpen && (
            <div className="mt-1 space-y-0.5">
              {projects.map((p) => {
                const Icon = getIcon(p.icon)
                const active = view === "project" && activeProjectKey === p.key
                return (
                  <button
                    key={p.id}
                    onClick={() => navigate("project", p.key)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 pl-6 text-sm transition-colors",
                      active
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("size-4", `text-${p.color}-600`)} />
                    <span className="truncate">{p.isRoot ? "Root Site" : p.name}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* remaining nav */}
        <div className="mt-4 space-y-0.5">
          {NAV.slice(2).map((item) => {
            const Icon = NAV_ICONS[item.key]
            const active = view === item.key
            return (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}

export function Topbar() {
  const { admin, view, activeProjectKey } = useSuperAdmin()
  const router = useRouter()
  const [pending, setPending] = useState(0)

  useEffect(() => {
    fetch("/api/payments?status=pending")
      .then((r) => r.json())
      .then((d) => setPending(d.items?.length || 0))
      .catch(() => {})
    const t = setInterval(() => {
      fetch("/api/payments?status=pending")
        .then((r) => r.json())
        .then((d) => setPending(d.items?.length || 0))
        .catch(() => {})
    }, 30000)
    return () => clearInterval(t)
  }, [])

  const titles: Partial<Record<ViewKey, string>> = {
    dashboard: "Dashboard",
    "pending-payments": "Pending Payments",
    "all-clients": "All Clients",
    "income-ledgers": "Income & Ledgers",
    renewals: "Renewals & Reminders",
    "server-health": "Server Health",
    "audit-log": "Audit Log",
    "add-project": "Add New Project",
    project: `Project: ${activeProjectKey ?? ""}`,
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" })
    router.refresh()
    window.location.reload()
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border/60 bg-background px-6">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold">{titles[view] || "SuperAdmin"}</h2>
        {pending > 0 && view !== "pending-payments" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 border-rose-200 text-rose-600"
            onClick={() => useSuperAdmin.getState().setView("pending-payments")}
          >
            <Bell className="size-3.5" />
            {pending} pending
          </Button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-md border border-border/60 px-2.5 py-1 text-xs text-muted-foreground md:flex">
          <Search className="size-3.5" />
          <span>Search…</span>
          <kbd className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px]">⌘K</kbd>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
            {admin?.email?.[0]?.toUpperCase() || "A"}
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-xs font-medium">{admin?.name || admin?.email}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{admin?.role}</p>
          </div>
          <Button size="icon" variant="ghost" className="size-8" onClick={logout}>
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
