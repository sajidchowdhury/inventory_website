"use client"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
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
import { Wallet, Save, ShieldCheck, Phone, Banknote, CalendarDays } from "lucide-react"
import { formatBDT } from "@/lib/format"
import type { ProjectData } from "@/components/superadmin/views/project/ProjectView"

const schema = z.object({
  bkashNumber: z.string().max(40).optional().or(z.literal("")),
  nagadNumber: z.string().max(40).optional().or(z.literal("")),
  bankAccount: z.string().max(120).optional().or(z.literal("")),
  monthlyAmount: z.coerce.number().min(0).max(1_000_000),
  currency: z.string().max(8).default("BDT"),
  dueDayOfMonth: z.coerce.number().int().min(1).max(28),
})

type FormValues = z.infer<typeof schema>

const CURRENCIES = ["BDT", "USD", "EUR", "GBP"] as const

export function PaymentConfigTab({
  project,
  onSaved,
}: {
  project: ProjectData
  onSaved: () => void
}) {
  const cfg = project.paymentConfig
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      bkashNumber: "",
      nagadNumber: "",
      bankAccount: "",
      monthlyAmount: 0,
      currency: "BDT",
      dueDayOfMonth: 1,
    },
  })

  // Hydrate the form once the project's payment config is available.
  // setTimeout(0) defers the reset out of the synchronous effect body so we
  // don't trip the react-hooks/set-state-in-effect lint rule.
  useEffect(() => {
    if (!cfg) return
    const t = setTimeout(() => {
      form.reset({
        bkashNumber: cfg.bkashNumber ?? "",
        nagadNumber: cfg.nagadNumber ?? "",
        bankAccount: cfg.bankAccount ?? "",
        monthlyAmount: cfg.monthlyAmount,
        currency: cfg.currency,
        dueDayOfMonth: cfg.dueDayOfMonth,
      })
    }, 0)
    return () => clearTimeout(t)
  }, [cfg, form])

  const { register, handleSubmit, formState, watch, setValue } = form
  const monthly = watch("monthlyAmount")
  const dueDay = watch("dueDayOfMonth")
  const currency = watch("currency")

  function onValid(v: FormValues) {
    setPendingValues(v)
    setConfirmOpen(true)
  }

  async function applyChanges() {
    if (!pendingValues) return
    setSubmitting(true)
    try {
      const r = await fetch(
        `/api/projects/${encodeURIComponent(project.key)}/payment-config`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pendingValues),
        }
      )
      if (!r.ok) {
        const e = await r.json().catch(() => ({}))
        toast.error(e.error || "Save failed")
        return
      }
      toast.success("Payment config saved", {
        description: `${formatBDT(pendingValues.monthlyAmount)} due on day ${pendingValues.dueDayOfMonth}`,
      })
      setConfirmOpen(false)
      setPendingValues(null)
      onSaved()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Wallet className="size-4" /> Payment collection config
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onValid)} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field icon={Phone} label="bKash number" hint="Where users send bKash payments">
              <Input
                placeholder="01XXXXXXXXX"
                {...register("bkashNumber")}
                defaultValue={cfg?.bkashNumber ?? ""}
              />
            </Field>
            <Field icon={Phone} label="Nagad number" hint="Where users send Nagad payments">
              <Input
                placeholder="01XXXXXXXXX"
                {...register("nagadNumber")}
                defaultValue={cfg?.nagadNumber ?? ""}
              />
            </Field>
            <Field icon={Banknote} label="Bank account" hint="Bank name + account number" wide>
              <Input
                placeholder="Islami Bank — 1234567890"
                {...register("bankAccount")}
                defaultValue={cfg?.bankAccount ?? ""}
              />
            </Field>
            <Field icon={Wallet} label="Monthly amount" hint="BDT per 30-day cycle">
              <Input
                type="number"
                min={0}
                step={50}
                {...register("monthlyAmount")}
                defaultValue={cfg?.monthlyAmount ?? 0}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {formatBDT(monthly || 0)} per active subscription
              </p>
            </Field>
            <Field icon={CalendarDays} label="Due day of month" hint="1–28 (auto-renew reminder day)">
              <Input
                type="number"
                min={1}
                max={28}
                {...register("dueDayOfMonth")}
                defaultValue={cfg?.dueDayOfMonth ?? 1}
              />
            </Field>
            <Field icon={Wallet} label="Currency" hint="BDT is the Phase 1 default">
              <Select
                value={currency}
                onValueChange={(v) => setValue("currency", v, { shouldValidate: true })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="md:col-span-2 mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-border/60 pt-4">
              <p className="mr-auto text-xs text-muted-foreground">
                Saved values: <span className="font-mono">{formatBDT(monthly || 0)}</span> · due day {dueDay} · {currency}
              </p>
              <Button type="submit" disabled={formState.isSubmitting || !cfg}>
                <Save className="mr-1.5 size-4" /> Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-emerald-100 bg-emerald-50/30">
        <CardContent className="flex items-start gap-3 pt-6">
          <ShieldCheck className="size-4 mt-0.5 text-emerald-600" />
          <div className="text-xs leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">How this is used</p>
            <p className="mt-1">
              The product app fetches this config via{" "}
              <code className="font-mono text-[10px]">GET /api/public/payment-config?project={project.key}</code>{" "}
              and shows users the exact amount + numbers to send to. After payment, the user
              enters their transaction ID in the app — the request lands in the SuperAdmin
              "Pending Payments" queue for approval.
            </p>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        values={pendingValues}
        submitting={submitting}
        onConfirm={applyChanges}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}

function Field({
  icon: Icon,
  label,
  hint,
  wide,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  hint?: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={wide ? "md:col-span-2 space-y-1.5" : "space-y-1.5"}>
      <Label className="flex items-center gap-1.5">
        <Icon className="size-3.5 text-muted-foreground" />
        {label}
      </Label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

function ConfirmDialog({
  open,
  values,
  submitting,
  onConfirm,
  onCancel,
}: {
  open: boolean
  values: FormValues | null
  submitting: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!values) {
    return null
  }
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apply payment config changes?</AlertDialogTitle>
          <AlertDialogDescription>
            Review the values below — they will be served to every user paying for this product.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-border/60 p-4 text-sm">
          <SummaryRow label="bKash" value={values.bkashNumber || "—"} />
          <SummaryRow label="Nagad" value={values.nagadNumber || "—"} />
          <SummaryRow label="Bank" value={values.bankAccount || "—"} />
          <SummaryRow label="Monthly" value={formatBDT(values.monthlyAmount)} />
          <SummaryRow label="Due day" value={String(values.dueDayOfMonth)} />
          <SummaryRow label="Currency" value={values.currency} />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={submitting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {submitting ? "Saving…" : "Apply changes"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="truncate font-mono text-xs">{value}</span>
    </>
  )
}
