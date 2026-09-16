"use client"
import { useEffect, useState } from "react"
import { useSuperAdmin } from "@/stores/superadmin"
import { Shell } from "@/components/superadmin/shell/Shell"
import { LoginView } from "@/components/superadmin/views/LoginView"
import { Loader2 } from "lucide-react"

export default function Home() {
  const { admin, authChecked, setAdmin, setAuthChecked } = useSuperAdmin()
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    let active = true
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return
        if (d.admin) setAdmin(d.admin)
        setAuthChecked(true)
      })
      .catch(() => setAuthChecked(true))
      .finally(() => setBooting(false))
    return () => {
      active = false
    }
  }, [setAdmin, setAuthChecked])

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (!admin) return <LoginView />
  return <Shell />
}
