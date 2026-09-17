"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"

// Authed CSV download (sends the admin cookie). Fetches → blob → triggers a
// download with the filename from the Content-Disposition header.
export function ExportButton({ url, label = "Export CSV" }: { url: string; label?: string }) {
  const [busy, setBusy] = useState(false)
  async function run() {
    setBusy(true)
    try {
      const r = await fetch(url)
      if (!r.ok) {
        const e = await r.json().catch(() => ({}))
        toast.error(e.error || `Export failed (${r.status})`)
        return
      }
      const blob = await r.blob()
      const disp = r.headers.get("content-disposition") || ""
      const name = disp.match(/filename="?([^";]+)"?/)?.[1] || "export.csv"
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(a.href)
      toast.success("Export downloaded")
    } finally {
      setBusy(false)
    }
  }
  return (
    <Button variant="outline" size="sm" onClick={run} disabled={busy}>
      {busy ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <Download className="mr-2 size-3.5" />}
      {label}
    </Button>
  )
}
