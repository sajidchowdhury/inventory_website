"use client"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/superadmin/shared/Primitives"
import { ICONS } from "@/components/superadmin/shared/icons"
import { useSuperAdmin } from "@/stores/superadmin"
import {
  Loader2,
  Save,
  Tag,
  Server as ServerIcon,
  Database,
  CreditCard,
  LayoutTemplate,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Zod schema — all fields are strings (form inputs are strings). Numeric
// coercion happens in onSubmit so empty optionals cleanly become null.
// ---------------------------------------------------------------------------
const COLORS = ["emerald", "amber", "cyan", "blue", "violet", "rose"] as const
const ICON_KEYS = Object.keys(ICONS)
const PAID_COLUMN_TYPES = ["boolean", "int"] as const

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  key: z
    .string()
    .min(2, "Key is required")
    .regex(
      /^[a-z0-9-]+$/,
      "Lowercase letters, numbers, and dashes only"
    ),
  icon: z.string(),
  color: z.enum(COLORS),
  folderPath: z.string().optional(),
  appPort: z.string().optional(),
  dbPath: z.string().optional(),
  dbType: z.string(),
  usersTable: z.string().optional(),
  emailColumn: z.string().optional(),
  paidColumn: z.string().optional(),
  paidColumnType: z.enum(PAID_COLUMN_TYPES),
  nameColumn: z.string().optional(),
  phoneColumn: z.string().optional(),
  paymentTable: z.string().optional(),
  bkashNumber: z.string().optional(),
  nagadNumber: z.string().optional(),
  bankAccount: z.string().optional(),
  monthlyAmount: z.string().min(1, "Required"),
  currency: z.string(),
  dueDayOfMonth: z.string(),
  landingUrl: z.string().optional(),
  heroHeadline: z.string().optional(),
  heroSubtitle: z.string().optional(),
  ctaPrimary: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const DEFAULTS: FormValues = {
  name: "",
  key: "",
  icon: "Package",
  color: "emerald",
  folderPath: "",
  appPort: "",
  dbPath: "",
  dbType: "sqlite",
  usersTable: "users",
  emailColumn: "email",
  paidColumn: "is_paid",
  paidColumnType: "boolean",
  nameColumn: "name",
  phoneColumn: "phone",
  paymentTable: "payments",
  bkashNumber: "",
  nagadNumber: "",
  bankAccount: "",
  monthlyAmount: "500",
  currency: "BDT",
  dueDayOfMonth: "1",
  landingUrl: "",
  heroHeadline: "",
  heroSubtitle: "",
  ctaPrimary: "লগইন করুন",
}

// ---------------------------------------------------------------------------
// Module-level sub-components — required by react-hooks/static-components
// rule (NO inline components during render).
// ---------------------------------------------------------------------------
function FormSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string
  description?: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <Card className="overflow-hidden border-border/60">
      <CardHeader className="bg-muted/30 pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-emerald-600" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4 p-6">{children}</CardContent>
    </Card>
  )
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium">
        {label}
      </Label>
      {children}
      {hint && !error && (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-[11px] text-rose-600">{error}</p>}
    </div>
  )
}

const GRID2 = "grid grid-cols-1 gap-4 sm:grid-cols-2"

// ---------------------------------------------------------------------------
// AddProjectView
// ---------------------------------------------------------------------------
export function AddProjectView() {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  })

  // useWatch (rather than the watch() fn) so the React Compiler can memoize.
  const icon = useWatch({ control, name: "icon" })
  const color = useWatch({ control, name: "color" })
  const paidColumnType = useWatch({ control, name: "paidColumnType" })
  const dbType = useWatch({ control, name: "dbType" })

  // Lookup via direct map access (not a function call) — avoids the
  // react-hooks/static-components "component created during render" rule.
  const PreviewIcon = ICONS[icon] ?? ICONS.Package

  async function onSubmit(v: FormValues) {
    // Build the API payload — strings → numbers/null where appropriate.
    const appPortNum = v.appPort ? Number(v.appPort) : NaN
    const monthlyNum = Number(v.monthlyAmount)
    const dueNum = Number(v.dueDayOfMonth)
    const schemaMap = JSON.stringify({
      usersTable: v.usersTable || "users",
      emailColumn: v.emailColumn || "email",
      paidColumn: v.paidColumn || "is_paid",
      paidColumnType: v.paidColumnType || "boolean",
      nameColumn: v.nameColumn || "name",
      phoneColumn: v.phoneColumn || "phone",
      paymentTable: v.paymentTable || "payments",
    })

    const payload = {
      name: v.name.trim(),
      key: v.key.trim(),
      icon: v.icon,
      color: v.color,
      folderPath: v.folderPath?.trim() || null,
      appPort: Number.isFinite(appPortNum) && appPortNum > 0 ? appPortNum : null,
      dbPath: v.dbPath?.trim() || null,
      dbType: v.dbType,
      schemaMap,
      landingUrl: v.landingUrl?.trim() || null,
      payment: {
        bkashNumber: v.bkashNumber?.trim() || null,
        nagadNumber: v.nagadNumber?.trim() || null,
        bankAccount: v.bankAccount?.trim() || null,
        monthlyAmount: Number.isFinite(monthlyNum) ? monthlyNum : 0,
        currency: v.currency || "BDT",
        dueDayOfMonth: Number.isFinite(dueNum) ? dueNum : 1,
      },
      landing: {
        heroHeadline: v.heroHeadline?.trim() || v.name.trim(),
        heroSubtitle: v.heroSubtitle?.trim() || "",
        ctaPrimary: v.ctaPrimary?.trim() || "লগইন করুন",
      },
    }

    try {
      const r = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        toast.error(d.error || "Failed to create project")
        return
      }
      toast.success("Project created", {
        description: `${payload.name} (${payload.key}) is live.`,
      })
      // Jump to the new project's workspace; reload so the sidebar
      // (which fetches /api/projects on mount) picks up the new entry.
      useSuperAdmin.getState().openProject(payload.key)
      window.location.reload()
    } catch {
      toast.error("Network error — try again")
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Add New Project"
        description="Register a new SaaS product so it appears in the sidebar and on the root site."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* (1) Identity */}
        <FormSection
          title="Identity"
          description="What this product is called inside SuperAdmin and on the root site."
          icon={Tag}
        >
          <div className={GRID2}>
            <Field label="Project name" htmlFor="name" error={errors.name?.message}>
              <Input
                id="name"
                placeholder="e.g. MadrashaOS"
                {...register("name")}
              />
            </Field>
            <Field
              label="Slug / key"
              htmlFor="key"
              hint="Lowercase, dashes ok. Used in URLs + sidebar."
              error={errors.key?.message}
            >
              <Input
                id="key"
                placeholder="e.g. madrasha"
                {...register("key")}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Icon" error={errors.icon?.message}>
              <Select
                value={icon}
                onValueChange={(val) => setValue("icon", val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick an icon" />
                </SelectTrigger>
                <SelectContent>
                  {ICON_KEYS.map((name) => {
                    const I = ICONS[name]
                    return (
                      <SelectItem key={name} value={name}>
                        <I className="size-4" />
                        <span>{name}</span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Color" error={errors.color?.message}>
              <Select
                value={color}
                onValueChange={(val) => setValue("color", val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick a color" />
                </SelectTrigger>
                <SelectContent>
                  {COLORS.map((c) => (
                    <SelectItem key={c} value={c}>
                      <span className={`size-2 rounded-full bg-${c}-500`} />
                      <span className="capitalize">{c}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Preview</Label>
              <div
                className={`flex size-9 items-center justify-center rounded-lg bg-${color}-50`}
              >
                <PreviewIcon className={`size-4 text-${color}-600`} />
              </div>
            </div>
          </div>
        </FormSection>

        {/* (2) Server */}
        <FormSection
          title="Server"
          description="Where this app lives on the VPS — used by Phase 2 cross-DB reads."
          icon={ServerIcon}
        >
          <div className={GRID2}>
            <Field
              label="Folder path"
              htmlFor="folderPath"
              hint="e.g. /var/www/madrasha"
            >
              <Input
                id="folderPath"
                placeholder="/var/www/<slug>"
                {...register("folderPath")}
              />
            </Field>
            <Field
              label="App port"
              htmlFor="appPort"
              hint="Internal port the app runs on."
            >
              <Input
                id="appPort"
                type="number"
                inputMode="numeric"
                placeholder="e.g. 3005"
                {...register("appPort")}
              />
            </Field>
            <Field
              label="DB file path"
              htmlFor="dbPath"
              hint="Absolute path to the app's SQLite DB."
            >
              <Input
                id="dbPath"
                placeholder="/var/www/<slug>/db/custom.db"
                {...register("dbPath")}
              />
            </Field>
            <Field label="DB type" error={errors.dbType?.message}>
              <Select
                value={dbType}
                onValueChange={(val) => setValue("dbType", val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick a DB type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sqlite">sqlite</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </FormSection>

        {/* (3) Schema map */}
        <FormSection
          title="Schema map"
          description="How SuperAdmin reads the app's existing users table — Plan §6."
          icon={Database}
        >
          <div className={GRID2}>
            <Field label="Users table" htmlFor="usersTable">
              <Input
                id="usersTable"
                placeholder="users"
                {...register("usersTable")}
              />
            </Field>
            <Field label="Email column" htmlFor="emailColumn">
              <Input
                id="emailColumn"
                placeholder="email"
                {...register("emailColumn")}
              />
            </Field>
            <Field label="Paid column" htmlFor="paidColumn">
              <Input
                id="paidColumn"
                placeholder="is_paid"
                {...register("paidColumn")}
              />
            </Field>
            <Field
              label="Paid column type"
              error={errors.paidColumnType?.message}
            >
              <Select
                value={paidColumnType}
                onValueChange={(val) => setValue("paidColumnType", val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick a column type" />
                </SelectTrigger>
                <SelectContent>
                  {PAID_COLUMN_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Name column" htmlFor="nameColumn">
              <Input
                id="nameColumn"
                placeholder="name"
                {...register("nameColumn")}
              />
            </Field>
            <Field label="Phone column" htmlFor="phoneColumn">
              <Input
                id="phoneColumn"
                placeholder="phone"
                {...register("phoneColumn")}
              />
            </Field>
            <Field
              label="Payment table"
              htmlFor="paymentTable"
              hint="Optional — used by Phase 2 reads."
            >
              <Input
                id="paymentTable"
                placeholder="payments"
                {...register("paymentTable")}
              />
            </Field>
          </div>
        </FormSection>

        {/* (4) Payment */}
        <FormSection
          title="Payment"
          description="What users see when paying for this product manually."
          icon={CreditCard}
        >
          <div className={GRID2}>
            <Field label="bKash number" htmlFor="bkashNumber">
              <Input
                id="bkashNumber"
                placeholder="017XXXXXXXX"
                {...register("bkashNumber")}
              />
            </Field>
            <Field label="Nagad number" htmlFor="nagadNumber">
              <Input
                id="nagadNumber"
                placeholder="017XXXXXXXX"
                {...register("nagadNumber")}
              />
            </Field>
            <Field label="Bank account" htmlFor="bankAccount">
              <Input
                id="bankAccount"
                placeholder="Islami Bank — 1234567890"
                {...register("bankAccount")}
              />
            </Field>
            <Field
              label="Monthly amount (BDT)"
              htmlFor="monthlyAmount"
              error={errors.monthlyAmount?.message}
            >
              <Input
                id="monthlyAmount"
                type="number"
                inputMode="numeric"
                min={0}
                {...register("monthlyAmount")}
              />
            </Field>
            <Field
              label="Currency"
              htmlFor="currency"
              error={errors.currency?.message}
            >
              <Input id="currency" {...register("currency")} />
            </Field>
            <Field
              label="Due day of month"
              htmlFor="dueDayOfMonth"
              hint="1–28 (avoid months without that day)"
            >
              <Input
                id="dueDayOfMonth"
                type="number"
                min={1}
                max={28}
                {...register("dueDayOfMonth")}
              />
            </Field>
          </div>
        </FormSection>

        {/* (5) Landing */}
        <FormSection
          title="Landing"
          description="Initial landing-page slots. Editable later from the project's Landing tab."
          icon={LayoutTemplate}
        >
          <div className="space-y-4">
            <Field
              label="Landing URL"
              htmlFor="landingUrl"
              hint="If set, project shows as 'Live' on the root site's products grid."
            >
              <Input
                id="landingUrl"
                placeholder="https://inventoryos.xyz/madrashaos"
                {...register("landingUrl")}
              />
            </Field>
            <Field
              label="Hero headline"
              htmlFor="heroHeadline"
              hint="Bangla or English — leave blank to default to the project name."
            >
              <Textarea
                id="heroHeadline"
                rows={2}
                placeholder="মাদরাসা ব্যবস্থাপনা"
                {...register("heroHeadline")}
              />
            </Field>
            <Field label="Hero subtitle" htmlFor="heroSubtitle">
              <Textarea
                id="heroSubtitle"
                rows={2}
                placeholder="ছাত্র, ফি, পরীক্ষা, উপস্থিতি, ডর্মিটরি — সব এক জায়গায়।"
                {...register("heroSubtitle")}
              />
            </Field>
            <Field
              label="Primary CTA label"
              htmlFor="ctaPrimary"
              error={errors.ctaPrimary?.message}
            >
              <Input
                id="ctaPrimary"
                placeholder="লগইন করুন"
                {...register("ctaPrimary")}
              />
            </Field>
          </div>
        </FormSection>

        {/* Submit */}
        <div className="flex flex-col-reverse items-stretch justify-end gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => reset(DEFAULTS)}
            disabled={isSubmitting}
          >
            Reset
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Creating…
              </>
            ) : (
              <>
                <Save className="mr-2 size-4" /> Create project
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
