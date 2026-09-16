"use client"
import { useState } from "react"
import { useSuperAdmin } from "@/stores/superadmin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldCheck, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function LoginView() {
  const { setAdmin, setAuthChecked } = useSuperAdmin()
  const [email, setEmail] = useState("admin@inventoryos.xyz")
  const [password, setPassword] = useState("admin123")
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const d = await r.json()
      if (!r.ok) {
        toast.error(d.error || "Login failed")
        return
      }
      setAdmin(d.admin)
      setAuthChecked(true)
      toast.success(`Welcome back, ${d.admin.name || d.admin.email}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-white p-4">
      <div className="absolute right-0 top-0 hidden h-full w-1/2 opacity-[0.07] md:block">
        <svg viewBox="0 0 400 600" fill="none" className="h-full w-full">
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#10B981" strokeWidth="0.5" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <circle cx="300" cy="200" r="120" stroke="#10B981" strokeWidth="1" fill="none" opacity="0.5" />
          <circle cx="300" cy="200" r="80" stroke="#10B981" strokeWidth="1" fill="none" opacity="0.3" />
        </svg>
      </div>
      <Card className="relative w-full max-w-md border-emerald-100 shadow-lg">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <CardTitle className="text-xl">InventoryOS SuperAdmin</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to manage every product from one panel.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Admin email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@inventoryos.xyz"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Demo admin — <span className="font-mono">admin@inventoryos.xyz</span> /{" "}
              <span className="font-mono">admin123</span>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
