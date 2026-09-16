"use client"
import { createElement, useEffect, useState } from "react"
import { useSuperAdmin } from "@/stores/superadmin"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/superadmin/shared/Primitives"
import { getIcon } from "@/components/superadmin/shared/icons"
import {
  Package, RefreshCw, ExternalLink, FileText, Wallet, Users,
  Receipt, LayoutTemplate, Settings as SettingsIcon,
} from "lucide-react"

import { OverviewTab } from "@/components/superadmin/views/project/OverviewTab"
import { PaymentConfigTab } from "@/components/superadmin/views/project/PaymentConfigTab"
import { ClientsTab } from "@/components/superadmin/views/project/ClientsTab"
import { LedgerTab } from "@/components/superadmin/views/project/LedgerTab"
import { LandingEditorTab } from "@/components/superadmin/views/project/LandingEditorTab"
import { SettingsTab } from "@/components/superadmin/views/project/SettingsTab"

export type ProjectData = {
  id: string
  key: string
  name: string
  isRoot: boolean
  icon: string
  color: string
  folderPath: string | null
  appPort: number | null
  dbPath: string | null
  schemaMap: Record<string, unknown>
  landingUrl: string | null
  active: boolean
  createdAt: string
  paymentConfig: {
    bkashNumber: string | null
    nagadNumber: string | null
    bankAccount: string | null
    monthlyAmount: number
    currency: string
    dueDayOfMonth: number
    updatedAt: string
  } | null
  landing: Record<string, unknown>
  counts: {
    clientCount: number
    activeSubs: number
    pendingPayments: number
    incomeThisMonth: number
    dbSize: number
    mrr: number
  }
  lastPayments: Array<{
    id: string
    amount: number
    reason: string
    txId: string | null
    createdAt: string
    clientEmail: string | null
  }>
}

export function ProjectView() {
  const { activeProjectKey } = useSuperAdmin()

  if (!activeProjectKey) {
    return (
      <EmptyState
        icon={Package}
        title="No project selected"
        description="Pick a project from the sidebar to open its workspace — overview, payment config, clients, ledger, landing page, and settings."
      />
    )
  }
  return <ProjectWorkspace key={activeProjectKey} projectKey={activeProjectKey} />
}

function ProjectWorkspace({ projectKey }: { projectKey: string }) {
  const [project, setProject] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState("overview")

  useEffect(() => {
    let active = true
    fetch(`/api/projects/${encodeURIComponent(projectKey)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d: ProjectData) => {
        if (active) setProject(d)
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
  }, [projectKey])

  function reload() {
    setLoading(true)
    fetch(`/api/projects/${encodeURIComponent(projectKey)}`)
      .then((r) => r.json())
      .then((d: ProjectData) => setProject(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  if (loading && !project) {
    return (
      <div className="space-y-4">
        <div className="h-16 animate-pulse rounded-xl bg-muted" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="h-24 animate-pulse rounded-xl bg-muted" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <EmptyState
        icon={Package}
        title="Couldn't load this project"
        description={error || "The project may have been deactivated or deleted."}
      />
    )
  }

  const accent = project.color || "emerald"
  const isLive = Boolean(project.landingUrl)

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className={`flex size-11 items-center justify-center rounded-xl bg-${accent}-50`}>
            {createElement(getIcon(project.icon), {
              className: `size-5 text-${accent}-600`,
            })}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
              {project.isRoot ? (
                <Badge className="bg-violet-50 text-violet-700 border-violet-200">
                  Root site
                </Badge>
              ) : isLive ? (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  <span className="size-1.5 rounded-full bg-emerald-500" /> Live
                </Badge>
              ) : (
                <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                  <span className="size-1.5 rounded-full bg-amber-500" /> Coming soon
                </Badge>
              )}
              {!project.active && (
                <Badge variant="outline" className="border-rose-200 text-rose-700">
                  Inactive
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              key: <span className="font-mono">{project.key}</span>
              {project.appPort ? ` · port ${project.appPort}` : ""}
              {project.folderPath ? ` · ${project.folderPath}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {project.landingUrl && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(project.landingUrl!, "_blank", "noopener")}
            >
              <ExternalLink className="mr-1.5 size-3.5" /> View site
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={reload} disabled={loading}>
            <RefreshCw className="mr-1.5 size-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* tabs */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex w-fit flex-wrap">
          <TabsTrigger value="overview">
            <FileText className="size-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="payment">
            <Wallet className="size-3.5" /> Payment Config
          </TabsTrigger>
          <TabsTrigger value="clients">
            <Users className="size-3.5" /> Clients
          </TabsTrigger>
          <TabsTrigger value="ledger">
            <Receipt className="size-3.5" /> Ledger
          </TabsTrigger>
          <TabsTrigger value="landing">
            <LayoutTemplate className="size-3.5" /> Landing Page
          </TabsTrigger>
          <TabsTrigger value="settings">
            <SettingsIcon className="size-3.5" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="outline-none">
          <OverviewTab project={project} />
        </TabsContent>
        <TabsContent value="payment" className="outline-none">
          <PaymentConfigTab project={project} onSaved={reload} />
        </TabsContent>
        <TabsContent value="clients" className="outline-none">
          <ClientsTab project={project} />
        </TabsContent>
        <TabsContent value="ledger" className="outline-none">
          <LedgerTab project={project} />
        </TabsContent>
        <TabsContent value="landing" className="outline-none">
          <LandingEditorTab project={project} onSaved={reload} />
        </TabsContent>
        <TabsContent value="settings" className="outline-none">
          <SettingsTab project={project} onSaved={reload} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
