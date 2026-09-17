"use client"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2, ArrowRight, Check, ExternalLink, Mail, Phone, MessageCircle, Facebook,
  ChevronLeft, type LucideIcon,
} from "lucide-react"
import { useSuperAdmin } from "@/stores/superadmin"
import { ICONS } from "@/components/superadmin/shared/icons"

// ---------------------------------------------------------------------------
// ProductSiteView — renders a product landing page from GET /api/landing/[key],
// themed by the project's `color`. Modeled on https://inventoryos.xyz/cctv:
// dark hero + stats row → features grid → alternating deep-dives → pricing →
// CTA → footer. Every slot is controllable from the LandingEditor tab.
// ---------------------------------------------------------------------------

type Stat = { value?: string; label?: string }
type Feature = { title?: string; desc?: string }
type DeepDive = { title?: string; desc?: string; bullets?: string }

type ProductContent = {
  badge?: string
  productName?: string
  brandTagline?: string
  heroHeadline?: string
  heroSubtitle?: string
  ctaPrimary?: string
  ctaSecondary?: string
  stats?: Stat[]
  features?: Feature[]
  deepdives?: DeepDive[]
  pricing?: number
  pricingNote?: string
  ctaHeadline?: string
  ctaButton?: string
  footerEmail?: string
  footerPhone?: string
  footerWhatsapp?: string
  footerFacebook?: string
  footerTagline?: string
  _project?: { key: string; name: string; icon: string; color: string; landingUrl: string | null; isRoot: boolean }
}

// Color stem → literal Tailwind classes (JIT-safe). Drives the per-project theme.
const ACCENT: Record<string, { text: string; bg: string; bgSoft: string; border: string; ring: string; gradient: string; cta: string }> = {
  emerald: { text: "text-emerald-400", bg: "bg-emerald-500", bgSoft: "bg-emerald-500/10", border: "border-emerald-500/30", ring: "ring-emerald-500/40", gradient: "from-emerald-500/20", cta: "bg-emerald-600 hover:bg-emerald-700" },
  amber: { text: "text-amber-400", bg: "bg-amber-500", bgSoft: "bg-amber-500/10", border: "border-amber-500/30", ring: "ring-amber-500/40", gradient: "from-amber-500/20", cta: "bg-amber-600 hover:bg-amber-700" },
  cyan: { text: "text-cyan-400", bg: "bg-cyan-500", bgSoft: "bg-cyan-500/10", border: "border-cyan-500/30", ring: "ring-cyan-500/40", gradient: "from-cyan-500/20", cta: "bg-cyan-600 hover:bg-cyan-700" },
  blue: { text: "text-blue-400", bg: "bg-blue-500", bgSoft: "bg-blue-500/10", border: "border-blue-500/30", ring: "ring-blue-500/40", gradient: "from-blue-500/20", cta: "bg-blue-600 hover:bg-blue-700" },
  violet: { text: "text-violet-400", bg: "bg-violet-500", bgSoft: "bg-violet-500/10", border: "border-violet-500/30", ring: "ring-violet-500/40", gradient: "from-violet-500/20", cta: "bg-violet-600 hover:bg-violet-700" },
  rose: { text: "text-rose-400", bg: "bg-rose-500", bgSoft: "bg-rose-500/10", border: "border-rose-500/30", ring: "ring-rose-500/40", gradient: "from-rose-500/20", cta: "bg-rose-600 hover:bg-rose-700" },
}

function accent(color?: string) {
  return ACCENT[color || "emerald"] || ACCENT.emerald
}

const FALLBACK: ProductContent = {
  badge: "Product",
  productName: "Product Name",
  brandTagline: "Built for your business",
  heroHeadline: "Run your business on autopilot",
  heroSubtitle: "A complete toolkit — organized, automated, reliable.",
  ctaPrimary: "Login to Start",
  ctaSecondary: "Explore Features",
  stats: [],
  features: [],
  deepdives: [],
  pricing: 0,
  ctaHeadline: "Ready to get started?",
  ctaButton: "Get Started",
  footerTagline: "Your business, organized.",
}

export function ProductSiteView() {
  const { activeProjectKey, setView } = useSuperAdmin()
  const [content, setContent] = useState<ProductContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!activeProjectKey) return
    fetch(`/api/landing/${encodeURIComponent(activeProjectKey)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d: ProductContent) => {
        if (active) {
          setContent({ ...FALLBACK, ...d })
          setError(null)
        }
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "fetch failed")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [activeProjectKey])

  if (!activeProjectKey) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Open a project from the sidebar, then click “Preview landing”.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (error || !content) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-rose-600">Landing unavailable</p>
        <p className="text-xs text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => setView("project")}>Back to project</Button>
      </div>
    )
  }

  const a = accent(content._project?.color)
  const PIcon: LucideIcon = ICONS[content._project?.icon || "Package"] || ICONS.Package
  const ctaHref = content._project?.landingUrl || "#"
  const bullets = (content.deepdives || []).map((d) =>
    (d.bullets || "").split("\n").map((b) => b.trim()).filter(Boolean)
  )

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* back to SuperAdmin */}
      <div className="fixed right-4 top-4 z-50">
        <Button size="sm" variant="secondary" className="shadow-lg" onClick={() => setView("project")}>
          <ChevronLeft className="mr-1 size-3.5" /> Back to SuperAdmin
        </Button>
      </div>

      {/* ===== HERO (dark) ===== */}
      <section className={`relative overflow-hidden bg-slate-950 px-6 py-20 text-white`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${a.gradient} to-transparent opacity-60`} />
        <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-white/5 blur-3xl" />
        <div className="relative mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="flex items-center gap-2">
              <div className={`flex size-9 items-center justify-center rounded-lg ${a.bg} text-white`}>
                <PIcon className="size-5" />
              </div>
              <Badge className={`border ${a.border} ${a.bgSoft} ${a.text}`}>{content.badge}</Badge>
            </div>
            <p className={`mt-6 text-xs font-medium uppercase tracking-widest ${a.text}`}>{content.brandTagline}</p>
            <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              {content.heroHeadline}
            </h1>
            <p className="mt-4 max-w-2xl text-base text-white/60 sm:text-lg">{content.heroSubtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={ctaHref} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className={`${a.cta} text-white`}>
                  {content.ctaPrimary} <ArrowRight className="ml-2 size-4" />
                </Button>
              </a>
              <a href="#features">
                <Button size="lg" variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">
                  {content.ctaSecondary}
                </Button>
              </a>
            </div>

            {/* stats row */}
            {content.stats && content.stats.length > 0 && (
              <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {content.stats.map((st, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className={`text-2xl font-bold ${a.text}`}>{st.value || "—"}</p>
                    <p className="mt-1 text-xs text-white/50">{st.label || ""}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-slate-900">Everything you need</h2>
            <p className="mt-2 text-slate-500">A complete toolkit — every part of your workflow, in one place.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {content.features?.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
                className={`rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg`}
              >
                <div className={`flex size-10 items-center justify-center rounded-xl ${a.bgSoft} ${a.text}`}>
                  <Check className="size-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{f.title || `Feature ${i + 1}`}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.desc || ""}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== DEEP-DIVES (alternating) ===== */}
      {content.deepdives && content.deepdives.length > 0 && (
        <section className="bg-white px-6 py-20">
          <div className="mx-auto max-w-5xl space-y-16">
            {content.deepdives.map((d, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className={`grid items-center gap-8 lg:grid-cols-2 ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}
              >
                <div>
                  <div className={`mb-3 inline-flex size-9 items-center justify-center rounded-lg ${a.bgSoft} ${a.text}`}>
                    <PIcon className="size-5" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">{d.title || `Spotlight ${i + 1}`}</h3>
                  <p className="mt-2 text-slate-500">{d.desc || ""}</p>
                  {bullets[i] && bullets[i].length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {bullets[i].map((b, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-slate-700">
                          <Check className={`mt-0.5 size-4 shrink-0 ${a.text}`} />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {/* visual mock card */}
                <div className={`rounded-2xl border ${a.border} bg-slate-950 p-6 text-white`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50">{content.productName}</span>
                    <ExternalLink className="size-4 text-white/30" />
                  </div>
                  <div className="mt-4 space-y-2">
                    {[0, 1, 2].map((k) => (
                      <div key={k} className="flex items-center gap-2 rounded-lg bg-white/5 p-2">
                        <div className={`size-2 rounded-full ${a.bg}`} />
                        <div className="h-2 flex-1 rounded-full bg-white/10" />
                        <div className={`h-2 w-12 rounded-full ${a.bgSoft}`} />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ===== PRICING ===== */}
      {content.pricing ? (
        <section className="bg-slate-50 px-6 py-20">
          <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Monthly subscription</p>
            <p className={`mt-4 text-5xl font-bold ${a.text}`}>
              ৳{content.pricing}
              <span className="text-base font-normal text-slate-400">/mo</span>
            </p>
            {content.pricingNote && <p className="mt-2 text-sm text-slate-500">{content.pricingNote}</p>}
            <a href={ctaHref} target="_blank" rel="noopener noreferrer">
              <Button className={`mt-6 w-full ${a.cta} text-white`}>
                {content.ctaButton || "Get Started"} <ArrowRight className="ml-2 size-4" />
              </Button>
            </a>
          </div>
        </section>
      ) : null}

      {/* ===== CTA ===== */}
      <section className={`${a.bg} px-6 py-16 text-white`}>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold">{content.ctaHeadline || "Ready to get started?"}</h2>
          <a href={ctaHref} target="_blank" rel="noopener noreferrer" className="mt-6 inline-block">
            <Button size="lg" variant="secondary" className="text-slate-900">
              {content.ctaButton || "Get Started"} <ArrowRight className="ml-2 size-4" />
            </Button>
          </a>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="mt-auto bg-slate-950 px-6 py-10 text-white/60">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className={`flex size-7 items-center justify-center rounded ${a.bg} text-white`}>
              <PIcon className="size-4" />
            </div>
            <span className="text-sm font-medium text-white">{content.productName || content._project?.name}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {content.footerEmail && <a href={`mailto:${content.footerEmail}`} className="inline-flex items-center gap-1 hover:text-white"><Mail className="size-3.5" />{content.footerEmail}</a>}
            {content.footerPhone && <a href={`tel:${content.footerPhone}`} className="inline-flex items-center gap-1 hover:text-white"><Phone className="size-3.5" />{content.footerPhone}</a>}
            {content.footerWhatsapp && <a href={content.footerWhatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-white"><MessageCircle className="size-3.5" />WhatsApp</a>}
            {content.footerFacebook && <a href={content.footerFacebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-white"><Facebook className="size-3.5" />Facebook</a>}
          </div>
        </div>
        {content.footerTagline && <p className="mt-6 text-center text-xs text-white/40">{content.footerTagline}</p>}
      </footer>
    </div>
  )
}
