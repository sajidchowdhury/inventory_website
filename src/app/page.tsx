'use client'

import { motion } from 'framer-motion'
import {
  Wallet, Camera, Smartphone, HeartPulse, Plus,
  ArrowRight, ArrowDown, Quote, Moon, ExternalLink,
  TrendingUp, FileSpreadsheet, Calculator, Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ===== Hero Section ===== */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Subtle emerald gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/40 via-white to-white" />

        {/* Decorative geometric pattern (right side) */}
        <div className="absolute right-0 top-0 w-1/2 h-full opacity-[0.07] pointer-events-none">
          <svg viewBox="0 0 400 600" fill="none" className="w-full h-full">
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#10B981" strokeWidth="0.5" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <circle cx="300" cy="200" r="120" stroke="#10B981" strokeWidth="1" fill="none" opacity="0.5" />
            <circle cx="300" cy="200" r="80" stroke="#10B981" strokeWidth="1" fill="none" opacity="0.3" />
            <circle cx="300" cy="200" r="40" stroke="#10B981" strokeWidth="1" fill="none" opacity="0.2" />
            <polygon points="200,400 250,450 200,500 150,450" stroke="#F59E0B" strokeWidth="1" fill="none" opacity="0.4" />
          </svg>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 mb-8">
              <Sparkles className="size-3.5 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700 tracking-wide">InventoryOS</span>
            </div>

            {/* Main headline */}
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight tracking-tight mb-6"
              style={{ fontFamily: 'var(--font-bn), sans-serif' }}
            >
              ব্যবসাকে সিস্টেমে রূপ দিন,
              <br />
              <span className="text-emerald-600">জীবনকে শান্তিতে ভরিয়ে দিন</span>
            </h1>

            {/* Subtitle */}
            <p
              className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed mb-10"
              style={{ fontFamily: 'var(--font-bn), sans-serif' }}
            >
              আপনার ব্যবসার জন্য সম্পূর্ণ ডিজিটাল সলিউশন। প্রতিটি ব্যবসার জন্য একটি ডেডিকেটেড সিস্টেম —
              ঝঞ্ঝাটমুক্ত, স্বয়ংক্রিয়, এবং নির্ভরযোগ্য।
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="#products">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8">
                  আমাদের পণ্যসমূহ দেখুন
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </a>
              <a href="#vision">
                <Button size="lg" variant="outline" className="px-8 border-gray-300">
                  আমাদের লক্ষ্য
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-10 left-1/2 -translate-x-1/2"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ArrowDown className="size-5 text-gray-400" />
          </motion.div>
        </div>
      </section>

      {/* ===== Mission Section ===== */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Quote className="size-12 text-emerald-200 mx-auto mb-6" />

            <p
              className="text-2xl sm:text-3xl text-gray-800 leading-relaxed font-medium"
              style={{ fontFamily: 'var(--font-bn), sans-serif' }}
            >
              আমাদের লক্ষ্য — ব্যবসায়ীদের সাহায্য করা এমন একটি সিস্টেম তৈরিতে,
              যা তাদের জীবনকে করে তুলবে ঝঞ্ঝাটমুক্ত। আর এই ঝঞ্ঝাটমুক্ত জীবন
              তাদের অনুপ্রেরণা দেবে আল্লাহর দিকে দৌড়াতে।
            </p>

            <p
              className="text-sm text-gray-400 mt-6 tracking-wider uppercase"
              style={{ fontFamily: 'var(--font-bn), sans-serif' }}
            >
              — InventoryOS মিশন
            </p>
          </motion.div>
        </div>
      </section>

      {/* ===== Products Section ===== */}
      <section id="products" className="py-24 px-6 bg-gray-50/50">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2
              className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4"
              style={{ fontFamily: 'var(--font-bn), sans-serif' }}
            >
              আমাদের পণ্যসমূহ
            </h2>
            <div className="w-16 h-1 bg-emerald-500 rounded-full mx-auto mb-4" />
            <p
              className="text-gray-500 max-w-xl mx-auto"
              style={{ fontFamily: 'var(--font-bn), sans-serif' }}
            >
              প্রতিটি ব্যবসার জন্য একটি ডেডিকেটেড সিস্টেম
            </p>
          </motion.div>

          {/* Mudaraba — featured product */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <Card className="overflow-hidden border-2 border-emerald-100 hover:border-emerald-300 transition-all duration-300 hover:shadow-xl group">
              <div className="grid md:grid-cols-2 gap-0">
                {/* Left: Icon + visual */}
                <div className="relative bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-12 flex items-center justify-center min-h-[280px]">
                  <div className="absolute inset-0 opacity-10">
                    <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
                      <circle cx="100" cy="100" r="80" stroke="#10B981" strokeWidth="1" fill="none" />
                      <circle cx="100" cy="100" r="50" stroke="#10B981" strokeWidth="1" fill="none" />
                      <circle cx="100" cy="100" r="20" stroke="#10B981" strokeWidth="1" fill="none" />
                    </svg>
                  </div>
                  <div className="relative z-10 text-center">
                    <div className="size-20 rounded-2xl bg-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
                      <Wallet className="size-10 text-white" />
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                      চালু আছে
                    </Badge>
                  </div>
                </div>

                {/* Right: Content */}
                <div className="p-8 md:p-12 flex flex-col justify-center">
                  <h3
                    className="text-2xl font-bold text-gray-900 mb-3"
                    style={{ fontFamily: 'var(--font-bn), sans-serif' }}
                  >
                    মুদারাবা প্রফিট ম্যানেজমেন্ট
                  </h3>
                  <p
                    className="text-gray-500 leading-relaxed mb-6"
                    style={{ fontFamily: 'var(--font-bn), sans-serif' }}
                  >
                    ইসলামিক মুদারাবা প্রফিট-শেয়ারিং সিস্টেম। ১৫০+ বিনিয়োগকারী, ১৬ সেক্টর,
                    ৮-ফেজ ক্যালকুলেশন ইঞ্জিন, রিটেইনড আর্নিংস, এক্সেল এক্সপোর্ট — সবকিছু এক জায়গায়।
                  </p>

                  {/* Features grid */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {[
                      { icon: Wallet, text: 'বিনিয়োগকারী ব্যবস্থাপনা' },
                      { icon: TrendingUp, text: 'সেক্টর ওয়াইজ ইনভেস্টমেন্ট' },
                      { icon: Calculator, text: 'অটো ক্যালকুলেশন' },
                      { icon: FileSpreadsheet, text: 'এক্সেল টেমপ্লেট' },
                    ].map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <feature.icon className="size-4 text-emerald-500 shrink-0" />
                        <span style={{ fontFamily: 'var(--font-bn), sans-serif' }}>{feature.text}</span>
                      </div>
                    ))}
                  </div>

                  <a href="/mudaraba/login">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto">
                      <span style={{ fontFamily: 'var(--font-bn), sans-serif' }}>লগইন করুন</span>
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </a>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Coming soon products — 2x2 grid */}
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { icon: Camera, title: 'CCTV বিজনেস ম্যানেজমেন্ট', desc: 'সিসিটিভি ইনস্টলেশন, মেইনটেন্যান্স, ক্লায়েন্ট ম্যানেজমেন্ট', color: 'emerald' },
              { icon: Smartphone, title: 'মোবাইল শপ', desc: 'মোবাইল ফোন বিক্রি, রিপেয়ার, ইনভেন্টরি ম্যানেজমেন্ট', color: 'amber' },
              { icon: HeartPulse, title: 'ফার্মেসি', desc: 'ওষুধ ইনভেন্টরি, প্রেসক্রিপশন, সেলস ট্র্যাকিং', color: 'cyan' },
              { icon: Plus, title: 'আরও আসছে...', desc: 'আপনার ব্যবসার জন্য কাস্টম সিস্টেম', color: 'gray' },
            ].map((product, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card className="border border-gray-200 hover:border-emerald-200 hover:shadow-md transition-all duration-300 group h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`size-12 rounded-xl bg-${product.color}-50 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <product.icon className={`size-6 text-${product.color}-600`} />
                      </div>
                      <Badge variant="outline" className="text-xs text-gray-400 border-gray-200">
                        শীঘ্রই আসছে
                      </Badge>
                    </div>
                    <h3
                      className="text-lg font-bold text-gray-900 mb-2"
                      style={{ fontFamily: 'var(--font-bn), sans-serif' }}
                    >
                      {product.title}
                    </h3>
                    <p
                      className="text-sm text-gray-500 leading-relaxed"
                      style={{ fontFamily: 'var(--font-bn), sans-serif' }}
                    >
                      {product.desc}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Vision / Dua Section ===== */}
      <section id="vision" className="py-24 px-6 bg-gradient-to-b from-white to-emerald-50/30">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Moon icon */}
            <div className="inline-flex items-center justify-center mb-8">
              <div className="size-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <Moon className="size-8 text-emerald-600" />
              </div>
            </div>

            {/* Bengali quote */}
            <p
              className="text-xl sm:text-2xl text-gray-700 leading-relaxed mb-8 font-medium"
              style={{ fontFamily: 'var(--font-bn), sans-serif' }}
            >
              আমরা বিশ্বাস করি — সৎ ব্যবসা ইবাদতের অংশ।
              <br />
              আমাদের সিস্টেম শুধু সফটওয়্যার নয়, এটি একটি উদ্যোগ —
              <br />
              মানুষকে আল্লাহর দিকে দৌড়াতে অনুপ্রেরণা দেওয়া।
            </p>

            {/* Quranic reference */}
            <div className="inline-block px-8 py-4 rounded-2xl bg-emerald-50 border border-emerald-100">
              <p className="text-2xl text-emerald-700 font-arabic mb-2" dir="rtl">
                وَقُل رَّبِّ زِدْنِي عِلْمًا
              </p>
              <p className="text-xs text-gray-400">
                (সূরা ত্বোয়া-হা: ১১৪)
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="mt-auto border-t border-gray-100 bg-white">
        {/* Top border accent */}
        <div className="h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400" />

        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid sm:grid-cols-3 gap-8">
            {/* Column 1: Projects */}
            <div>
              <h4
                className="text-sm font-semibold text-gray-900 mb-4"
                style={{ fontFamily: 'var(--font-bn), sans-serif' }}
              >
                আমাদের প্রজেক্ট
              </h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="https://nekirjhuri.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-500 hover:text-emerald-600 transition-colors inline-flex items-center gap-1"
                  >
                    nekirjhuri.com
                    <ExternalLink className="size-3" />
                  </a>
                </li>
                <li>
                  <a
                    href="http://rizqunbd.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-500 hover:text-emerald-600 transition-colors inline-flex items-center gap-1"
                  >
                    rizqunbd.com
                    <ExternalLink className="size-3" />
                  </a>
                </li>
                <li>
                  <a
                    href="/mudaraba/login"
                    className="text-sm text-gray-500 hover:text-emerald-600 transition-colors"
                  >
                    Mudaraba System
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 2: Contact */}
            <div>
              <h4
                className="text-sm font-semibold text-gray-900 mb-4"
                style={{ fontFamily: 'var(--font-bn), sans-serif' }}
              >
                যোগাযোগ
              </h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>inventoryos.xyz</li>
                <li>contact@inventoryos.xyz</li>
              </ul>
            </div>

            {/* Column 3: Brand */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">InventoryOS</h4>
              <p className="text-sm text-gray-500" style={{ fontFamily: 'var(--font-bn), sans-serif' }}>
                © 2026 InventoryOS
                <br />
                সব অধিকার সংরক্ষিত
              </p>
            </div>
          </div>

          {/* Bismillah at bottom */}
          <div className="mt-12 pt-8 border-t border-gray-50 text-center">
            <p className="text-lg text-emerald-600 font-arabic" dir="rtl">
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
