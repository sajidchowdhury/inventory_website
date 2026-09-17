"use client"
import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowRight, ArrowDown, Quote, Moon, ExternalLink, MessageCircle, Facebook, Code2, Sparkles, ChevronLeft, ChevronRight, Globe, type LucideIcon } from "lucide-react"
import { ICONS } from "@/components/superadmin/shared/icons"
import { useSuperAdmin } from "@/stores/superadmin"

// ---------------------------------------------------------------------------
// Shape returned by GET /api/landing/root. All slots optional — the view
// supplies sensible Bangla defaults so the page renders even on an empty
// root project (i.e. before the LandingEditor tab is touched).
// ---------------------------------------------------------------------------
type Product = {
  key: string
  name: string
  icon: string
  color: string
  landingUrl: string | null
  live: boolean
}

type RootContent = {
  badge?: string
  heroHeadline1?: string
  heroHeadline2?: string
  heroSubtitle?: string
  ctaPrimary?: string
  ctaSecondary?: string
  developedBy?: string
  developedByUrl?: string
  missionVerse?: string
  missionTranslation?: string
  missionRef?: string
  missionBody?: string
  visionBody?: string
  visionSub?: string
  footerWhatsapp?: string
  footerFacebook?: string
  footerEmail?: string
  footerTagline?: string
  products?: Product[]
  showcase?: Array<{ name?: string; url?: string; desc?: string }>
}

const FALLBACK: RootContent = {
  badge: "InventoryOS",
  heroHeadline1: "ব্যবসাকে সিস্টেমে রূপ দিন,",
  heroHeadline2: "জীবনকে শান্তিতে ভরিয়ে দিন",
  heroSubtitle:
    "আপনার ব্যবসার জন্য সম্পূর্ণ ডিজিটাল সলিউশন। প্রতিটি ব্যবসার জন্য একটি ডেডিকেটেড সিস্টেম — ঝঞ্ঝাটমুক্ত, স্বয়ংক্রিয়, এবং নির্ভরযোগ্য।",
  ctaPrimary: "আমাদের পণ্যসমূহ দেখুন",
  ctaSecondary: "আমাদের কাজ দেখুন",
  developedBy: "My Creative Code",
  developedByUrl: "https://mycreativecode.com",
  missionVerse: "رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي",
  missionTranslation:
    "হে আমার রব, আমার বক্ষকে প্রশস্ত করুন এবং আমার কাজ সহজ করে দিন।",
  missionRef: "(সূরা ত্বোয়া-হা: ২৫-২৬)",
  missionBody:
    "আমরা বিশ্বাস করি — একজন ভালো ব্যবসায়ী সে-ই, যে তার ব্যবসাকে গোছানো রাখে। হিসাব ঠিক রাখে, লেনদেন স্বচ্ছ রাখে, এবং দিন শেষে আল্লাহর সামনে দাঁড়াতে পারে বিনয়ের সাথে।",
  visionBody:
    "একজন ভালো ব্যবসায়ী সে-ই, যে আল্লাহর দেওয়া রিজিকের অনুসন্ধান করে সৎ পথে, তার হিসাব রাখে গোছানো, এবং কাজ শেষে বলে — আলহামদুলিল্লাহ।",
  visionSub:
    "সুশৃঙ্খল ব্যবসা শুধু লাভ বাড়ায় না — এটি অন্তরে শান্তি আনে। আর সেই শান্তিই পথ দেখায় আল্লাহর দিকে ফিরে আসার।",
  footerWhatsapp: "https://wa.me/8801787492561",
  footerFacebook: "https://facebook.com/inventoryos",
  footerEmail: "hello@inventoryos.xyz",
  footerTagline: "আপনার ব্যবসার জন্য সম্পূর্ণ ডিজিটাল সলিউশন",
  showcase: [
    { name: "nekirjhuri.com", url: "https://nekirjhuri.com", desc: "অনলাইন শপিং ও লাইফস্টাইল প্ল্যাটফর্ম" },
    { name: "rizqunbd.com", url: "https://rizqunbd.com", desc: "রিজিক আনবিডি — খাদ্য ও জীবনযাত্রা" },
    { name: "chowdhurypara.com", url: "https://chowdhurypara.com", desc: "চৌধুরীপাড়া সম্প্রদায় পোর্টাল" },
    { name: "mohipalchowdhurybari.com", url: "https://mohipalchowdhurybari.com", desc: "মহিপাল চৌধুরী বাড়ি — পারিবারিক ওয়েবসাইট" },
    { name: "cakedesk.bd", url: "https://cakedesk.bd", desc: "কেক ডেস্ক — অর্ডার ম্যানেজমেন্ট সিস্টেম" },
    { name: "remotecenter.com.bd", url: "https://remotecenter.com.bd", desc: "রিমোট সেন্টার — রিমোট সার্ভিস হাব" },
  ],
}

// ---------------------------------------------------------------------------
// Color-stem → literal Tailwind classes (so the JIT picks them up).
// Blue is allowed only as the accent for products whose `color` is "blue"
// (e.g. creativecast — matches the original repo). No indigo anywhere.
// ---------------------------------------------------------------------------
type Accent = {
  card: string
  iconBg: string
  iconText: string
  liveBadge: string
  liveButton: string
}

const ACCENTS: Record<string, Accent> = {
  emerald: {
    card: "border-emerald-100 hover:border-emerald-300",
    iconBg: "bg-emerald-50",
    iconText: "text-emerald-600",
    liveBadge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    liveButton: "bg-emerald-600 hover:bg-emerald-700",
  },
  amber: {
    card: "border-amber-100 hover:border-amber-300",
    iconBg: "bg-amber-50",
    iconText: "text-amber-600",
    liveBadge: "bg-amber-100 text-amber-700 border-amber-200",
    liveButton: "bg-amber-600 hover:bg-amber-700",
  },
  cyan: {
    card: "border-cyan-100 hover:border-cyan-300",
    iconBg: "bg-cyan-50",
    iconText: "text-cyan-600",
    liveBadge: "bg-cyan-100 text-cyan-700 border-cyan-200",
    liveButton: "bg-cyan-600 hover:bg-cyan-700",
  },
  blue: {
    card: "border-blue-100 hover:border-blue-300",
    iconBg: "bg-blue-50",
    iconText: "text-blue-600",
    liveBadge: "bg-blue-100 text-blue-700 border-blue-200",
    liveButton: "bg-blue-600 hover:bg-blue-700",
  },
  violet: {
    card: "border-violet-100 hover:border-violet-300",
    iconBg: "bg-violet-50",
    iconText: "text-violet-600",
    liveBadge: "bg-violet-100 text-violet-700 border-violet-200",
    liveButton: "bg-violet-600 hover:bg-violet-700",
  },
  rose: {
    card: "border-rose-100 hover:border-rose-300",
    iconBg: "bg-rose-50",
    iconText: "text-rose-600",
    liveBadge: "bg-rose-100 text-rose-700 border-rose-200",
    liveButton: "bg-rose-600 hover:bg-rose-700",
  },
}

const BN = { fontFamily: "var(--font-bn), sans-serif" } as const

function accent(color: string): Accent {
  return ACCENTS[color] || ACCENTS.emerald
}

// ---------------------------------------------------------------------------
// Module-level sub-components (required by react-hooks/static-components).
// ---------------------------------------------------------------------------
function VerseBox({
  verse,
  translation,
  ref_,
}: {
  verse: string
  translation: string
  ref_: string
}) {
  return (
    <div className="inline-block rounded-2xl border border-emerald-100 bg-emerald-50 px-8 py-4">
      <p className="mb-2 text-2xl text-emerald-700" dir="rtl">
        {verse}
      </p>
      <p className="text-sm text-gray-500" style={BN}>
        {translation}
      </p>
      <p className="mt-1 text-xs text-gray-400">{ref_}</p>
    </div>
  )
}

function ProductCard({ p }: { p: Product }) {
  const a = accent(p.color)
  const I: LucideIcon = ICONS[p.icon] ?? ICONS.Package
  const inner = (
    <Card
      className={`h-full border-2 transition-all duration-300 hover:shadow-lg ${a.card}`}
    >
      <CardContent className="p-6">
        <div className="mb-4 flex items-start justify-between">
          <div
            className={`flex size-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${a.iconBg}`}
          >
            <I className={`size-6 ${a.iconText}`} />
          </div>
          {p.live ? (
            <Badge className={`border ${a.liveBadge}`}>
              <span style={BN}>চালু আছে</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="border-gray-200 text-xs text-gray-400">
              <span style={BN}>শীঘ্রই আসছে</span>
            </Badge>
          )}
        </div>
        <h3 className="mb-2 text-lg font-bold text-gray-900" style={BN}>
          {p.name}
        </h3>
        {p.live && p.landingUrl && (
          <span
            className={`mt-4 inline-flex items-center gap-1 text-sm font-medium ${a.iconText}`}
            style={BN}
          >
            লগইন করুন <ArrowRight className="size-3.5" />
          </span>
        )}
      </CardContent>
    </Card>
  )
  if (p.live && p.landingUrl) {
    return (
      <a
        href={p.landingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group block"
      >
        {inner}
      </a>
    )
  }
  return <div className="group block">{inner}</div>
}

function BackToSuperAdminButton() {
  return (
    <button
      type="button"
      onClick={() => useSuperAdmin.getState().setView("dashboard")}
      className="fixed right-4 top-4 z-50 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-4 py-2 text-xs font-semibold text-emerald-700 shadow-md backdrop-blur transition-colors hover:bg-emerald-50"
    >
      <Code2 className="size-3.5" />
      <span>Back to SuperAdmin</span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// SiteView — fetches GET /api/landing/root and renders the InventoryOS
// Bengali landing page from that JSON. Editing the root project's
// LandingEditor tab reflects here after a refresh.
// ---------------------------------------------------------------------------
export function SiteView() {
  const [content, setContent] = useState<RootContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const showcaseRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    fetch("/api/landing/root")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d: RootContent) => {
        if (active) setContent({ ...FALLBACK, ...d })
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
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="size-6 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (error || !content) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6 text-center">
        <div>
          <p className="text-sm text-rose-600">Root landing unavailable</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => useSuperAdmin.getState().setView("dashboard")}
          >
            Back to SuperAdmin
          </Button>
        </div>
      </div>
    )
  }

  const products = content.products ?? []
  const liveProducts = products.filter((p) => p.live)
  const upcomingProducts = products.filter((p) => !p.live)
  const whatsappHref = content.footerWhatsapp || FALLBACK.footerWhatsapp!
  const facebookHref = content.footerFacebook || FALLBACK.footerFacebook!
  const emailHref = content.footerEmail || FALLBACK.footerEmail!
  const developedBy = content.developedBy || FALLBACK.developedBy!
  const developedByUrl =
    content.developedByUrl || FALLBACK.developedByUrl!
  // Showcase (আমাদের কাজ) — controllable carousel of external projects.
  // Falls back to FALLBACK.showcase when the admin hasn't added any.
  const showcase =
    content.showcase && content.showcase.length > 0
      ? content.showcase
      : (FALLBACK.showcase ?? [])

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <BackToSuperAdminButton />

      {/* ===== Hero ===== */}
      <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/40 via-white to-white" />
        {/* decorative geometric pattern (right side) */}
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-[0.07]">
          <svg viewBox="0 0 400 600" fill="none" className="h-full w-full">
            <pattern id="grid-hero" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#10B981" strokeWidth="0.5" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid-hero)" />
            <circle cx="300" cy="200" r="120" stroke="#10B981" strokeWidth="1" fill="none" opacity="0.5" />
            <circle cx="300" cy="200" r="80" stroke="#10B981" strokeWidth="1" fill="none" opacity="0.3" />
            <circle cx="300" cy="200" r="40" stroke="#10B981" strokeWidth="1" fill="none" opacity="0.2" />
          </svg>
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5">
              <Sparkles className="size-3.5 text-emerald-600" />
              <span className="text-xs font-medium tracking-wide text-emerald-700">
                {content.badge}
              </span>
            </div>

            <h1
              className="mb-6 text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl"
              style={BN}
            >
              {content.heroHeadline1}
              <br />
              <span className="text-emerald-600">{content.heroHeadline2}</span>
            </h1>

            <p
              className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-gray-500 sm:text-xl"
              style={BN}
            >
              {content.heroSubtitle}
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a href="#products">
                <Button
                  size="lg"
                  className="bg-emerald-600 px-8 text-white hover:bg-emerald-700"
                >
                  <span style={BN}>{content.ctaPrimary}</span>
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </a>
              <a href="#showcase">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-gray-300 px-8"
                >
                  <span style={BN}>{content.ctaSecondary}</span>
                </Button>
              </a>
            </div>

            <div className="mt-10 flex items-center justify-center gap-2 text-sm text-gray-400">
              <Code2 className="size-4 text-emerald-500" />
              <span style={BN}>ডিজাইন ও ডেভেলপমেন্ট:</span>
              <a
                href={developedByUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-emerald-600 hover:text-emerald-700"
              >
                {developedBy}
              </a>
            </div>
          </motion.div>

          <motion.div
            className="absolute bottom-10 left-1/2 -translate-x-1/2"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ArrowDown className="size-5 text-gray-400" />
          </motion.div>
        </div>
      </section>

      {/* ===== Mission ===== */}
      <section className="bg-white px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Quote className="mx-auto mb-6 size-12 text-emerald-200" />
            <p
              className="mb-6 text-2xl font-medium leading-relaxed text-gray-800 sm:text-3xl"
              style={BN}
            >
              {content.missionBody}
            </p>
            <VerseBox
              verse={content.missionVerse || ""}
              translation={content.missionTranslation || ""}
              ref_={content.missionRef || ""}
            />
          </motion.div>
        </div>
      </section>

      {/* ===== Products (auto-generated from Project table) ===== */}
      <section id="products" className="bg-gray-50/50 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <motion.div
            className="mb-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl" style={BN}>
              আমাদের পণ্যসমূহ
            </h2>
            <div className="mx-auto mb-4 h-1 w-16 rounded-full bg-emerald-500" />
            <p className="mx-auto max-w-xl text-gray-500" style={BN}>
              প্রতিটি ব্যবসার জন্য একটি ডেডিকেটেড সিস্টেম
            </p>
          </motion.div>

          {products.length === 0 ? (
            <div className="rounded-xl border border-dashed border-emerald-100 py-12 text-center">
              <p className="text-sm text-gray-400" style={BN}>
                এখনও কোনো পণ্য যুক্ত হয়নি। SuperAdmin-এ নতুন প্রজেক্ট যোগ করলেই এখানে দেখা যাবে।
              </p>
            </div>
          ) : (
            <>
              {liveProducts.length > 0 && (
                <div className="mb-8 grid gap-6 sm:grid-cols-2">
                  {liveProducts.map((p, i) => (
                    <motion.div
                      key={p.key}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.08 }}
                    >
                      <ProductCard p={p} />
                    </motion.div>
                  ))}
                </div>
              )}
              {upcomingProducts.length > 0 && (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {upcomingProducts.map((p, i) => (
                    <motion.div
                      key={p.key}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.06 }}
                    >
                      <ProductCard p={p} />
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ===== Showcase (আমাদের কাজ) — controllable carousel + contact CTA ===== */}
      <section id="showcase" className="bg-white px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-10 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl" style={BN}>
              আমাদের কাজ
            </h2>
            <div className="mx-auto mb-4 h-1 w-16 rounded-full bg-emerald-500" />
            <p className="mx-auto max-w-xl text-gray-500" style={BN}>
              যেসব প্রজেক্ট আমরা ডিজাইন ও ডেভেলপ করেছি
            </p>
          </motion.div>

          {showcase.length > 0 ? (
            <div className="relative">
              <div
                ref={showcaseRef}
                className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                style={{ scrollBehavior: "smooth" }}
              >
                {showcase.map((p, i) => {
                  const url = p.url || "#"
                  const href = url.startsWith("http") ? url : `https://${url}`
                  return (
                    <a
                      key={i}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group w-72 shrink-0 rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                          <Globe className="size-5" />
                        </div>
                        <ExternalLink className="size-4 text-gray-300 transition-colors group-hover:text-emerald-500" />
                      </div>
                      <h3 className="mt-4 text-base font-bold text-gray-900" style={BN}>
                        {p.name || "—"}
                      </h3>
                      {p.desc && (
                        <p className="mt-2 text-sm leading-relaxed text-gray-500" style={BN}>
                          {p.desc}
                        </p>
                      )}
                      {p.url && (
                        <p className="mt-3 truncate text-xs text-emerald-600">{p.url}</p>
                      )}
                    </a>
                  )
                })}
              </div>
              {showcase.length > 1 && (
                <div className="mt-4 flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9 rounded-full border-gray-300"
                    onClick={() =>
                      showcaseRef.current?.scrollBy({ left: -300, behavior: "smooth" })
                    }
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9 rounded-full border-gray-300"
                    onClick={() =>
                      showcaseRef.current?.scrollBy({ left: 300, behavior: "smooth" })
                    }
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
              <p className="text-sm text-gray-400" style={BN}>
                কোনো প্রজেক্ট যোগ করা হয়নি — SuperAdmin → Root Site → Landing Page এ গিয়ে প্রজেক্ট যোগ করুন।
              </p>
            </div>
          )}

          {/* contact CTA */}
          <div className="mt-16 text-center">
            <p className="mb-6 text-lg text-gray-700" style={BN}>
              আপনার ব্যবসার জন্য সিস্টেম তৈরি করতে চান?
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <Button className="bg-emerald-600 text-white hover:bg-emerald-700">
                  <MessageCircle className="mr-2 size-4" />
                  WhatsApp
                </Button>
              </a>
              <a href={facebookHref} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="border-gray-300">
                  <Facebook className="mr-2 size-4 text-blue-600" />
                  <span style={BN}>ফেসবুক পেজ</span>
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Vision ===== */}
      <section
        id="vision"
        className="bg-gradient-to-b from-white to-emerald-50/30 px-6 py-24"
      >
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-8 inline-flex items-center justify-center">
              <div className="flex size-16 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50">
                <Moon className="size-8 text-emerald-600" />
              </div>
            </div>
            <p
              className="mb-6 text-xl font-medium leading-relaxed text-gray-700 sm:text-2xl"
              style={BN}
            >
              {content.visionBody}
            </p>
            <p
              className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-gray-500"
              style={BN}
            >
              {content.visionSub}
            </p>
            <VerseBox
              verse={content.missionVerse || ""}
              translation={content.missionTranslation || ""}
              ref_={content.missionRef || ""}
            />
          </motion.div>
        </div>
      </section>

      {/* ===== Footer (sticky — mt-auto) ===== */}
      <footer className="mt-auto border-t border-gray-100 bg-white">
        <div className="h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400" />
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-8 sm:grid-cols-4">
            {/* brand */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Code2 className="size-5 text-emerald-600" />
                <h4 className="text-sm font-semibold text-gray-900">InventoryOS</h4>
              </div>
              <p className="text-sm text-gray-500" style={BN}>
                {content.footerTagline}
              </p>
            </div>

            {/* products */}
            <div>
              <h4 className="mb-4 text-sm font-semibold text-gray-900" style={BN}>
                আমাদের পণ্য
              </h4>
              <ul className="space-y-2">
                {products.slice(0, 4).map((p) => (
                  <li key={p.key}>
                    {p.live && p.landingUrl ? (
                      <a
                        href={p.landingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-500 transition-colors hover:text-emerald-600"
                      >
                        {p.name}
                      </a>
                    ) : (
                      <span className="text-sm text-gray-400" style={BN}>
                        {p.name} (শীঘ্রই)
                      </span>
                    )}
                  </li>
                ))}
                {products.length === 0 && (
                  <li className="text-sm text-gray-400" style={BN}>
                    কোনো পণ্য নেই
                  </li>
                )}
              </ul>
            </div>

            {/* contact */}
            <div>
              <h4 className="mb-4 text-sm font-semibold text-gray-900" style={BN}>
                যোগাযোগ
              </h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-emerald-600"
                  >
                    <MessageCircle className="size-3.5" />
                    WhatsApp
                  </a>
                </li>
                <li>
                  <a
                    href={facebookHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-emerald-600"
                  >
                    <Facebook className="size-3.5 text-blue-600" />
                    <span style={BN}>ফেসবুক পেজ</span>
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${emailHref}`}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-emerald-600"
                  >
                    <ExternalLink className="size-3.5" />
                    {emailHref}
                  </a>
                </li>
              </ul>
            </div>

            {/* developed by */}
            <div>
              <h4 className="mb-4 text-sm font-semibold text-gray-900" style={BN}>
                ডেভেলপড বাই
              </h4>
              <a
                href={developedByUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2"
              >
                <Code2 className="size-4 text-emerald-600 transition-transform group-hover:scale-110" />
                <span className="text-sm font-medium text-gray-700 transition-colors group-hover:text-emerald-600">
                  {developedBy}
                </span>
                <ExternalLink className="size-3 text-gray-300 transition-colors group-hover:text-emerald-500" />
              </a>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-50 pt-8 sm:flex-row">
            <p className="text-xs text-gray-400" style={BN}>
              © {new Date().getFullYear()} InventoryOS · সব অধিকার সংরক্ষিত
            </p>
            <p className="text-base text-emerald-600" dir="rtl">
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
