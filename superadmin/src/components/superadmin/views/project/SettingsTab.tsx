"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
  Database, FolderTree, Server, Link as LinkIcon, FileCode2,
  CheckCircle2, AlertTriangle, Loader2, Save, ShieldAlert,
  Power, RefreshCw,
} from "lucide-react"
import type { ProjectData } from "@/components/superadmin/views/project/ProjectView"

type SchemaMapForm = {
  usersTable: string
  emailColumn: string
  paidColumn: string
  paidColumnType: string
  nameColumn: string
  phoneColumn: string
  paymentTable: string
}

type ProjectForm = {
  folderPath: string
  appPort: string
  dbPath: string
  landingUrl: string
}

type ValidateResult =
  | { state: "idle" }
  | { state: "running" }
  | { state: "ok"; sampleEmail?: string }
  | { state: "error"; error: string }

const PAID_COLUMN_TYPES = ["boolean", "int"] as const

function readSchemaMap(src: Record<string, unknown>): SchemaMapForm {
  return {
    usersTable: typeof src.usersTable === "string" ? src.usersTable : "",
    emailColumn: typeof src.emailColumn === "string" ? src.emailColumn : "",
    paidColumn: typeof src.paidColumn === "string" ? src.paidColumn : "",
    paidColumnType:
      typeof src.paidColumnType === "string" ? src.paidColumnType : "boolean",
    nameColumn: typeof src.nameColumn === "string" ? src.nameColumn : "",
    phoneColumn: typeof src.phoneColumn === "string" ? src.phoneColumn : "",
    paymentTable: typeof src.paymentTable === "string" ? src.paymentTable : "",
  }
}

function readProjectForm(src: ProjectData): ProjectForm {
  return {
    folderPath: src.folderPath ?? "",
    appPort: src.appPort != null ? String(src.appPort) : "",
    dbPath: src.dbPath ?? "",
    landingUrl: src.landingUrl ?? "",
  }
}

export function SettingsTab({
  project,
  onSaved,
}: {
  project: ProjectData
  onSaved: () => void
}) {
  const [schema, setSchema] = useState<SchemaMapForm>(() =>
    readSchemaMap(project.schemaMap)
  )
  const [proj, setProj] = useState<ProjectForm>(() => readProjectForm(project))
  const [validate, setValidate] = useState<ValidateResult>({ state: "idle" })
  const [saving, setSaving] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

  // Re-hydrate when project changes (e.g. after a sibling tab calls onSaved).
  useEffect(() => {
    const t = setTimeout(() => {
      setSchema(readSchemaMap(project.schemaMap))
      setProj(readProjectForm(project))
    }, 0)
    return () => clearTimeout(t)
  }, [project])

  function setSchemaField<K extends keyof SchemaMapForm>(
    key: K,
    value: SchemaMapForm[K]
  ) {
    setSchema((prev) => ({ ...prev, [key]: value }))
  }
  function setProjField<K extends keyof ProjectForm>(key: K, value: ProjectForm[K]) {
    setProj((prev) => ({ ...prev, [key]: value }))
  }

  async function save() {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        folderPath: proj.folderPath || null,
        appPort: proj.appPort ? Number(proj.appPort) : null,
        dbPath: proj.dbPath || null,
        landingUrl: proj.landingUrl || null,
        schemaMap: schema,
      }
      const r = await fetch(`/api/projects/${encodeURIComponent(project.key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const e = await r.json().catch(() => ({}))
        toast.error(e.error || "Save failed")
        return
      }
      toast.success("Project settings saved")
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  async function runValidate() {
    setValidate({ state: "running" })
    // Save first so the validator hits the freshest schema map.
    await save()
    try {
      const r = await fetch(
        `/api/projects/${encodeURIComponent(project.key)}/validate`,
        { method: "POST" }
      )
      const d = await r.json()
      if (!r.ok) {
        setValidate({ state: "error", error: d.error || `HTTP ${r.status}` })
        return
      }
      if (d.ok) {
        setValidate({ state: "ok", sampleEmail: d.sampleEmail })
        toast.success("Schema map valid", {
          description: d.sampleEmail ? `Sample email: ${d.sampleEmail}` : undefined,
        })
      } else {
        setValidate({ state: "error", error: d.error || "validation failed" })
        toast.error("Schema map invalid", {
          description: d.error || "see result",
        })
      }
    } catch (e: unknown) {
      setValidate({
        state: "error",
        error: e instanceof Error ? e.message : "network error",
      })
    }
  }

  async function deactivate() {
    setDeactivating(true)
    try {
      const r = await fetch(`/api/projects/${encodeURIComponent(project.key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !project.active }),
      })
      if (!r.ok) {
        const e = await r.json().catch(() => ({}))
        toast.error(e.error || "Action failed")
        return
      }
      toast.success(
        project.active ? "Project deactivated" : "Project reactivated"
      )
      setDeactivateOpen(false)
      onSaved()
    } finally {
      setDeactivating(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* project paths */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <FolderTree className="size-4" /> Project paths
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField
            icon={FolderTree}
            label="Folder path (VPS)"
            value={proj.folderPath}
            onChange={(v) => setProjField("folderPath", v)}
            placeholder="/var/www/mudaraba"
            mono
          />
          <TextField
            icon={Server}
            label="App port"
            value={proj.appPort}
            onChange={(v) => setProjField("appPort", v)}
            placeholder="3002"
            mono
          />
          <TextField
            icon={Database}
            label="DB file path"
            value={proj.dbPath}
            onChange={(v) => setProjField("dbPath", v)}
            placeholder="/var/www/mudaraba/db/custom.db"
            mono
          />
          <TextField
            icon={LinkIcon}
            label="Landing URL (leave blank if not live yet)"
            value={proj.landingUrl}
            onChange={(v) => setProjField("landingUrl", v)}
            placeholder="https://inventoryos.xyz/mudaraba"
            mono
          />
        </CardContent>
      </Card>

      {/* schema map */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <FileCode2 className="size-4" /> Schema map
            </CardTitle>
            <Button size="sm" variant="outline" onClick={runValidate} disabled={validate.state === "running"}>
              {validate.state === "running" ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 size-3.5" />
              )}
              {validate.state === "running" ? "Validating…" : "Validate mapping"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextField
              icon={Database}
              label="Users table"
              value={schema.usersTable}
              onChange={(v) => setSchemaField("usersTable", v)}
              placeholder="users"
              mono
            />
            <TextField
              icon={FileCode2}
              label="Email column"
              value={schema.emailColumn}
              onChange={(v) => setSchemaField("emailColumn", v)}
              placeholder="email"
              mono
            />
            <TextField
              icon={FileCode2}
              label="Paid column"
              value={schema.paidColumn}
              onChange={(v) => setSchemaField("paidColumn", v)}
              placeholder="is_paid"
              mono
            />
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <FileCode2 className="size-3.5 text-muted-foreground" />
                Paid column type
              </Label>
              <Select
                value={schema.paidColumnType}
                onValueChange={(v) => setSchemaField("paidColumnType", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAID_COLUMN_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Phase 1 writes 1/true on approval regardless of type.
              </p>
            </div>
            <TextField
              icon={FileCode2}
              label="Name column"
              value={schema.nameColumn}
              onChange={(v) => setSchemaField("nameColumn", v)}
              placeholder="name"
              mono
            />
            <TextField
              icon={FileCode2}
              label="Phone column"
              value={schema.phoneColumn}
              onChange={(v) => setSchemaField("phoneColumn", v)}
              placeholder="phone"
              mono
            />
            <TextField
              icon={Database}
              label="Payment table (optional)"
              value={schema.paymentTable}
              onChange={(v) => setSchemaField("paymentTable", v)}
              placeholder="payments"
              mono
            />
          </div>

          <ValidateResultBox result={validate} />

          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-[10px] leading-relaxed text-muted-foreground">
{JSON.stringify(schema, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {/* save bar */}
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" onClick={save} disabled={saving}>
          <Save className="mr-1.5 size-3.5" />
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </div>

      {/* danger zone */}
      <Card className="border-rose-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-rose-700">
            <ShieldAlert className="size-4" /> Danger zone
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {project.active ? (
              <p>
                Deactivating hides this project from the sidebar and root-site products
                grid. Existing subscriptions remain in the DB. Reversible.
              </p>
            ) : (
              <p>This project is currently <span className="font-medium text-rose-600">inactive</span>. You can reactivate it.</p>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            className={project.active ? "border-rose-200 text-rose-700 hover:bg-rose-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}
            onClick={() => setDeactivateOpen(true)}
          >
            <Power className="mr-1.5 size-3.5" />
            {project.active ? "Deactivate project" : "Reactivate project"}
          </Button>
        </CardContent>
      </Card>

      <DeactivateDialog
        open={deactivateOpen}
        project={project}
        deactivating={deactivating}
        onConfirm={deactivate}
        onCancel={() => setDeactivateOpen(false)}
      />
    </div>
  )
}

function TextField({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  mono?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs">
        <Icon className="size-3.5 text-muted-foreground" />
        {label}
      </Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={mono ? "font-mono text-xs" : "text-sm"}
      />
    </div>
  )
}

function ValidateResultBox({ result }: { result: ValidateResult }) {
  if (result.state === "idle") return null
  if (result.state === "running") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 p-3 text-xs">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">Running validation…</span>
      </div>
    )
  }
  if (result.state === "ok") {
    return (
      <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50/50 p-3 text-xs">
        <CheckCircle2 className="size-4 text-emerald-600" />
        <div>
          <p className="font-medium text-emerald-700">Schema map valid</p>
          {result.sampleEmail && (
            <p className="mt-0.5 text-muted-foreground">
              Sample row email:{" "}
              <span className="font-mono">{result.sampleEmail}</span>
            </p>
          )}
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50/50 p-3 text-xs">
      <AlertTriangle className="size-4 text-rose-600" />
      <div>
        <p className="font-medium text-rose-700">Schema map invalid</p>
        <p className="mt-0.5 text-muted-foreground">{result.error}</p>
      </div>
    </div>
  )
}

function DeactivateDialog({
  open,
  project,
  deactivating,
  onConfirm,
  onCancel,
}: {
  open: boolean
  project: ProjectData
  deactivating: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {project.active ? "Deactivate this project?" : "Reactivate this project?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {project.active
              ? `${project.name} will be hidden from the sidebar and root-site products grid. Subscriptions and clients stay in the DB — you can reactivate any time.`
              : `${project.name} will be shown again in the sidebar.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={deactivating}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={deactivating}
            className={
              project.active
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }
          >
            {deactivating
              ? "Working…"
              : project.active
                ? "Yes, deactivate"
                : "Yes, reactivate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
