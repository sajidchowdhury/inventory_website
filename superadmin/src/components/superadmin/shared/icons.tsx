// Maps the `icon` string stored on a Project to a Lucide component.
import {
  Wallet, GraduationCap, Camera, LineChart, Code2, Globe, Package,
  LayoutDashboard, Users, Receipt, TrendingUp, Bell, Server, ScrollText,
  FolderPlus, ShieldCheck, type LucideIcon,
} from "lucide-react"

export const ICONS: Record<string, LucideIcon> = {
  Wallet, GraduationCap, Camera, LineChart, Code2, Globe, Package,
  LayoutDashboard, Users, Receipt, TrendingUp, Bell, Server, ScrollText,
  FolderPlus, ShieldCheck,
}

export const NAV_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  "pending-payments": Receipt,
  "all-clients": Users,
  "income-ledgers": TrendingUp,
  renewals: Bell,
  "server-health": Server,
  "audit-log": ScrollText,
  "add-project": FolderPlus,
  security: ShieldCheck,
  site: Globe,
}

export function getIcon(name?: string | null): LucideIcon {
  return (name && ICONS[name]) || Package
}
