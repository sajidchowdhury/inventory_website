"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  LayoutTemplate, Save, Plus, Trash2, Eye, RefreshCw, ExternalLink,
} from "lucide-react"
import type { ProjectData } from "@/components/superadmin/views/project/ProjectView"

type SlotType = "text" | "textarea" | "number" | "list"

type Slot = {
  key: string
  label: string
  type: SlotType
  placeholder?: string
}

type SlotSection = {
  section: string
  slots: Slot[]
}

const ROOT_SECTIONS: SlotSection[] = [
  {
    section: "Hero",
    slots: [
      { key: "badge", label: "Badge", type: "text" },
      { key: "heroHeadline1", label: "Headline line 1", type: "text" },
      { key: "heroHeadline2", label: "Headline line 2", type: "text" },
      { key: "heroSubtitle", label: "Subtitle", type: "textarea" },
      { key: "ctaPrimary", label: "Primary CTA", type: "text" },
      { key: "ctaSecondary", label: "Secondary CTA", type: "text" },
      { key: "developedBy", label: "Developed by", type: "text" },
      { key: "developedByUrl", label: "Developed by URL", type: "text" },
    ],
  },
  {
    section: "Mission",
    slots: [
      { key: "missionVerse", label: "Verse (Arabic)", type: "textarea" },
      { key: "missionTranslation", label: "Translation", type: "textarea" },
      { key: "missionRef", label: "Reference", type: "text" },
      { key: "missionBody", label: "Body", type: "textarea" },
    ],
  },
  {
    section: "Vision",
    slots: [
      { key: "visionBody", label: "Body", type: "textarea" },
      { key: "visionSub", label: "Sub text", type: "textarea" },
    ],
  },
  {
    section: "Footer",
    slots: [
      { key: "footerWhatsapp", label: "WhatsApp link", type: "text" },
      { key: "footerFacebook", label: "Facebook link", type: "text" },
      { key: "footerEmail", label: "Email", type: "text" },
      { key: "footerTagline", label: "Tagline", type: "text" },
    ],
  },
]

const PRODUCT_SECTIONS: SlotSection[] = [
  {
    section: "Hero",
    slots: [
      { key: "badge", label: "Badge", type: "text" },
      { key: "heroHeadline", label: "Headline", type: "text" },
      { key: "heroSubtitle", label: "Subtitle", type: "textarea" },
      { key: "ctaPrimary", label: "Primary CTA", type: "text" },
      { key: "ctaSecondary", label: "Secondary CTA", type: "text" },
    ],
  },
  {
    section: "Features",
    slots: [{ key: "features", label: "Feature bullets", type: "list" }],
  },
  {
    section: "Pricing",
    slots: [
      { key: "pricing", label: "Monthly price (BDT)", type: "number" },
    ],
  },
  {
    section: "Footer",
    slots: [{ key: "footerEmail", label: "Email", type: "text" }],
  },
]

type Content = Record<string, unknown>

function cloneContent(src: unknown): Content {
  if (src && typeof src === "object" && !Array.isArray(src)) {
    return JSON.parse(JSON.stringify(src)) as Content
  }
  return {}
}

export function LandingEditorTab({
  project,
  onSaved,
}: {
  project: ProjectData
  onSaved: () => void
}) {
  const sections = project.isRoot ? ROOT_SECTIONS : PRODUCT_SECTIONS
  const [content, setContent] = useState<Content>(() => cloneContent(project.landing))
  const [saving, setSaving] = useState(false)

  // Re-hydrate when project.landing changes (e.g. after a reload from a sibling tab).
  // setTimeout(0) defers the setState out of the effect body so the lint rule
  // react-hooks/set-state-in-effect stays happy.
  useEffect(() => {
    const t = setTimeout(() => setContent(cloneContent(project.landing)), 0)
    return () => clearTimeout(t)
  }, [project.landing])

  function setValue(key: string, value: unknown) {
    setContent((prev) => ({ ...prev, [key]: value }))
  }

  async function save() {
    setSaving(true)
    try {
      const r = await fetch(
        `/api/projects/${encodeURIComponent(project.key)}/landing`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(content),
        }
      )
      if (!r.ok) {
        const e = await r.json().catch(() => ({}))
        toast.error(e.error || "Save failed")
        return
      }
      toast.success("Landing content saved", {
        description: "Public readers will pick this up within the cache TTL.",
      })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <h3 className="text-sm font-medium">
            {project.isRoot ? "Root site template" : "Product landing template"}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Edits the JSON served by{" "}
            <code className="font-mono text-[10px]">GET /api/landing/{project.key}</code>.
            Slots render into the template on every visitor's next request.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {project.landingUrl && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(project.landingUrl!, "_blank", "noopener")}
            >
              <ExternalLink className="mr-1.5 size-3.5" /> Open live
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setContent(cloneContent(project.landing))}>
            <RefreshCw className="mr-1.5 size-3.5" /> Reset
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            <Save className="mr-1.5 size-3.5" /> {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* editor */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <LayoutTemplate className="size-4" /> Slots
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {sections.map((sec) => (
              <div key={sec.section} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {sec.section}
                  </h4>
                  <div className="flex-1 border-t border-border/40" />
                </div>
                {sec.slots.map((slot) => (
                  <SlotField
                    key={slot.key}
                    slot={slot}
                    value={content[slot.key]}
                    onChange={(v) => setValue(slot.key, v)}
                  />
                ))}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* live preview */}
        <Card className="lg:sticky lg:top-4 lg:self-start">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Eye className="size-4" /> Live preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LandingPreview project={project} content={content} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SlotField({
  slot,
  value,
  onChange,
}: {
  slot: Slot
  value: unknown
  onChange: (v: unknown) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs">
        <span className="font-mono text-[10px] text-muted-foreground">{slot.key}</span>
        <span>·</span>
        <span>{slot.label}</span>
      </Label>
      {slot.type === "list" ? (
        <ListEditor
          value={Array.isArray(value) ? (value as Array<string | number>) : []}
          onChange={onChange}
        />
      ) : slot.type === "textarea" ? (
        <Textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={slot.placeholder}
          className="min-h-20 text-sm"
        />
      ) : slot.type === "number" ? (
        <Input
          type="number"
          value={(value as number | string) ?? ""}
          onChange={(e) => {
            const n = Number(e.target.value)
            onChange(Number.isFinite(n) ? n : 0)
          }}
          placeholder={slot.placeholder}
        />
      ) : (
        <Input
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={slot.placeholder}
        />
      )}
    </div>
  )
}

function ListEditor({
  value,
  onChange,
}: {
  value: Array<string | number>
  onChange: (v: Array<string>) => void
}) {
  function update(i: number, v: string) {
    const next = value.slice()
    next[i] = v
    onChange(next.map((x) => String(x)))
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i).map((x) => String(x)))
  }
  function add() {
    onChange([...value.map((x) => String(x)), ""])
  }
  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">No items yet.</p>
      )}
      {value.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={String(item)}
            onChange={(e) => update(i, e.target.value)}
            placeholder={`Feature #${i + 1}`}
            className="text-sm"
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8 text-rose-600 hover:bg-rose-50"
            onClick={() => remove(i)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={add}
        className="text-xs"
      >
        <Plus className="mr-1 size-3" /> Add feature
      </Button>
    </div>
  )
}

function LandingPreview({
  project,
  content,
}: {
  project: ProjectData
  content: Content
}) {
  if (project.isRoot) {
    return <RootPreview content={content} />
  }
  return <ProductPreview content={content} />
}

function RootPreview({ content }: { content: Content }) {
  const s = (k: string) => (typeof content[k] === "string" ? String(content[k]) : "")
  return (
    <div className="space-y-4 rounded-lg border border-border/60 p-4">
      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
        {s("badge") || "Badge"}
      </Badge>
      <div>
        <h2 className="text-lg font-bold leading-tight">
          {s("heroHeadline1") || "Headline 1"}
        </h2>
        <h2 className="text-lg font-bold leading-tight text-emerald-600">
          {s("heroHeadline2") || "Headline 2"}
        </h2>
        <p className="mt-2 text-xs text-muted-foreground">
          {s("heroSubtitle") || "Subtitle"}
        </p>
        <div className="mt-3 flex gap-2">
          <span className="rounded-md bg-emerald-600 px-3 py-1 text-[10px] text-white">
            {s("ctaPrimary") || "Primary"}
          </span>
          <span className="rounded-md border border-border px-3 py-1 text-[10px]">
            {s("ctaSecondary") || "Secondary"}
          </span>
        </div>
      </div>
      <div className="rounded-md bg-muted/60 p-3">
        <p className="text-right text-xs">{s("missionVerse") || "Verse"}</p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {s("missionTranslation") || "Translation"}
        </p>
        <p className="mt-1 text-[10px] font-medium">{s("missionRef") || "(ref)"}</p>
        <p className="mt-2 text-[11px]">{s("missionBody") || "Mission body"}</p>
      </div>
      <div>
        <p className="text-[11px]">{s("visionBody") || "Vision body"}</p>
        <p className="mt-1 text-[10px] text-muted-foreground">{s("visionSub") || "Vision sub"}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-3 text-[10px] text-muted-foreground">
        <span>{s("footerEmail") || "email"}</span>
        <span>·</span>
        <span>{s("footerWhatsapp") || "wa"}</span>
        <span>·</span>
        <span>{s("footerFacebook") || "fb"}</span>
        <span className="ml-auto font-medium text-foreground">
          {s("footerTagline") || "tagline"}
        </span>
      </div>
    </div>
  )
}

function ProductPreview({ content }: { content: Content }) {
  const s = (k: string) => (typeof content[k] === "string" ? String(content[k]) : "")
  const features = Array.isArray(content.features)
    ? (content.features as Array<string | number>)
    : []
  const price = typeof content.pricing === "number" ? content.pricing : Number(content.pricing) || 0
  return (
    <div className="space-y-4 rounded-lg border border-border/60 p-4">
      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
        {s("badge") || "Badge"}
      </Badge>
      <div>
        <h3 className="text-base font-bold">{s("heroHeadline") || "Headline"}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {s("heroSubtitle") || "Subtitle"}
        </p>
        <div className="mt-3 flex gap-2">
          <span className="rounded-md bg-emerald-600 px-3 py-1 text-[10px] text-white">
            {s("ctaPrimary") || "Primary"}
          </span>
          <span className="rounded-md border border-border px-3 py-1 text-[10px]">
            {s("ctaSecondary") || "Secondary"}
          </span>
        </div>
      </div>
      {features.length > 0 && (
        <ul className="space-y-1 text-xs">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-0.5 size-1.5 rounded-full bg-emerald-500" />
              {String(f)}
            </li>
          ))}
        </ul>
      )}
      <div className="rounded-md bg-muted/60 p-3 text-center">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Monthly</p>
        <p className="text-base font-bold text-emerald-600">৳{price || 0}</p>
      </div>
      <div className="border-t border-border/60 pt-3 text-[10px] text-muted-foreground">
        {s("footerEmail") || "email"}
      </div>
    </div>
  )
}
