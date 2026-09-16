// SuperAdmin SPA navigation state. Single-route constraint means all
// "pages" are views switched via this store, not Next.js routes.
import { create } from "zustand"

export type ViewKey =
  | "dashboard"
  | "pending-payments"
  | "all-clients"
  | "income-ledgers"
  | "renewals"
  | "server-health"
  | "audit-log"
  | "add-project"
  | "security"
  | "automated-payments"
  | "sso"
  | "project"
  | "site"

export type AdminSessionInfo = {
  id: string
  email: string
  name: string | null
  role: string
}

type SuperAdminState = {
  // auth
  admin: AdminSessionInfo | null
  authChecked: boolean
  setAdmin: (a: AdminSessionInfo | null) => void
  setAuthChecked: (v: boolean) => void

  // navigation
  view: ViewKey
  activeProjectKey: string | null
  setView: (v: ViewKey) => void
  openProject: (key: string) => void

  // sidebar (projects sub-menu collapse)
  projectsOpen: boolean
  toggleProjects: () => void
  setProjectsOpen: (v: boolean) => void
}

export const useSuperAdmin = create<SuperAdminState>((set) => ({
  admin: null,
  authChecked: false,
  setAdmin: (a) => set({ admin: a }),
  setAuthChecked: (v) => set({ authChecked: v }),

  view: "dashboard",
  activeProjectKey: null,
  setView: (v) => set({ view: v }),
  openProject: (key) => set({ view: "project", activeProjectKey: key }),

  projectsOpen: true,
  toggleProjects: () => set((s) => ({ projectsOpen: !s.projectsOpen })),
  setProjectsOpen: (v) => set({ projectsOpen: v }),
}))

// Helper to navigate from a sidebar click.
export function navigate(view: ViewKey, projectKey?: string) {
  const s = useSuperAdmin.getState()
  if (view === "project" && projectKey) {
    s.openProject(projectKey)
  } else {
    s.setView(view)
  }
}
