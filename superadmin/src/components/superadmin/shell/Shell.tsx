"use client"
import { useSuperAdmin, type ViewKey } from "@/stores/superadmin"
import { Sidebar, Topbar } from "@/components/superadmin/shell/Sidebar"
import { DashboardView } from "@/components/superadmin/views/DashboardView"
import { PendingPaymentsView } from "@/components/superadmin/views/PendingPaymentsView"
import { AllClientsView } from "@/components/superadmin/views/AllClientsView"
import { IncomeLedgersView } from "@/components/superadmin/views/IncomeLedgersView"
import { RenewalsView } from "@/components/superadmin/views/RenewalsView"
import { ServerHealthView } from "@/components/superadmin/views/ServerHealthView"
import { AuditLogView } from "@/components/superadmin/views/AuditLogView"
import { AddProjectView } from "@/components/superadmin/views/AddProjectView"
import { SiteView } from "@/components/superadmin/views/SiteView"
import { ProjectView } from "@/components/superadmin/views/project/ProjectView"
import { LoginView } from "@/components/superadmin/views/LoginView"
import { PlaceholderView } from "@/components/superadmin/views/PlaceholderView"

// Fallback only — every ViewKey now has a real view wired in.
function UnknownView() {
  return <PlaceholderView view="dashboard" title="Unknown view" />
}

// View registry — single source of truth for what each ViewKey renders.
export const VIEWS: Partial<Record<ViewKey, () => React.ReactElement>> = {
  dashboard: DashboardView,
  "pending-payments": PendingPaymentsView,
  "all-clients": AllClientsView,
  "income-ledgers": IncomeLedgersView,
  renewals: RenewalsView,
  "server-health": ServerHealthView,
  "audit-log": AuditLogView,
  "add-project": AddProjectView,
  project: ProjectView,
  site: SiteView,
}

export function Shell() {
  const { view } = useSuperAdmin()
  const View = VIEWS[view] ?? UnknownView
  return (
    <div className="flex min-h-screen flex-row bg-muted/20">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <View />
        </main>
      </div>
    </div>
  )
}

export { LoginView }
