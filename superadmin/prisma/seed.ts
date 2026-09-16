// InventoryOS SuperAdmin — Phase 1 seed.
// Run with: bun run db:push && bun run db:seed
// Creates: 1 admin, 6 projects (incl. root), payment configs, landing content,
// ~70 mock app users (mirror table), client cross-index, subscriptions
// (active + expired), pending payment requests, 3 months of ledger credits,
// a few audit + reminder logs.
//
// Admin login: admin@inventoryos.xyz / admin123

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const db = new PrismaClient()

const SCHEMA_MAP = JSON.stringify({
  usersTable: "users",
  emailColumn: "email",
  paidColumn: "is_paid",
  paidColumnType: "boolean",
  nameColumn: "name",
  phoneColumn: "phone",
  paymentTable: "payments",
  paymentColumns: { txId: "trx_id", amount: "amount", method: "method" },
})

const ROOT_LANDING = JSON.stringify({
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
  missionTranslation: "হে আমার রব, আমার বক্ষকে প্রশস্ত করুন এবং আমার কাজ সহজ করে দিন।",
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
})

const PRODUCT_LANDING = (name: string, desc: string) =>
  JSON.stringify({
    badge: name,
    heroHeadline: name,
    heroSubtitle: desc,
    ctaPrimary: "লগইন করুন",
    ctaSecondary: "ডেমো দেখুন",
    features: ["বিনিয়োগকারী ব্যবস্থাপনা", "অটো ক্যালকুলেশন", "এক্সেল এক্সপোর্ট", "রিপোর্ট"],
    pricing: 500,
    footerEmail: "hello@inventoryos.xyz",
  })

const PROJECTS = [
  { key: "root", name: "InventoryOS Root Site", isRoot: true, icon: "Globe", color: "emerald", monthly: 0, landing: ROOT_LANDING },
  { key: "mudaraba", name: "Mudaraba Profit Management", icon: "Wallet", color: "emerald", monthly: 1500, landing: PRODUCT_LANDING("মুদারাবা প্রফিট ম্যানেজমেন্ট", "ইসলামিক মুদারাবা প্রফিট-শেয়ারিং সিস্টেম। ১৫০+ বিনিয়োগকারী, ১৬ সেক্টর, ৮-ফেজ ক্যালকুলেশন ইঞ্জিন।"), dbPath: "sample-apps/mudaraba.db", folderPath: "/var/www/mudaraba", appPort: 3002, landingUrl: "https://inventoryos.xyz/mudaraba" },
  { key: "madrasha", name: "MadrashaOS", icon: "GraduationCap", color: "amber", monthly: 800, landing: PRODUCT_LANDING("MadrashaOS", "মাদরাসা ব্যবস্থাপনা — ছাত্র, ফি, পরীক্ষা, উপস্থিতি, ডর্মিটরি।"), dbPath: "/var/www/madrasha/db/custom.db", folderPath: "/var/www/madrasha", appPort: 3005, landingUrl: "https://inventoryos.xyz/madrashaos" },
  { key: "cctv", name: "CCTV Business Management", icon: "Camera", color: "cyan", monthly: 600, landing: PRODUCT_LANDING("CCTV বিজনেস ম্যানেজমেন্ট", "সিসিটিভি ইনস্টলেশন, মেইনটেন্যান্স, ক্লায়েন্ট ম্যানেজমেন্ট।"), dbPath: "/var/www/cctv/db/custom.db", folderPath: "/var/www/cctv", appPort: 3003 },
  { key: "creativecast", name: "CreativeCast", icon: "LineChart", color: "blue", monthly: 1200, landing: PRODUCT_LANDING("CreativeCast", "এআই-চালিত চাহিদা forecast ও অর্ডার প্ল্যানিং সিস্টেম।"), dbPath: "/var/www/creativecast/db/custom.db", folderPath: "/var/www/creativecast", appPort: 3004, landingUrl: "https://inventoryos.xyz/creativecast" },
  { key: "mycreativecode", name: "MyCreativeCode", icon: "Code2", color: "violet", monthly: 1000, landing: PRODUCT_LANDING("MyCreativeCode", "ক্লায়েন্ট পোর্টফোলিও ও প্রজেক্ট ম্যানেজমেন্ট।"), dbPath: "/var/www/mycreativecode/db/custom.db", folderPath: "/var/www/mycreativecode", appPort: 3006 },
] as const

const FIRST_NAMES = ["Rahim", "Karim", "Abdullah", "Fatema", "Ayesha", "Sadia", "Hasan", "Tania", "Imran", "Nusrat", "Jamil", "Sumaiya", "Rakib", "Mitu", "Arif", "Lamia"]
const LAST_NAMES = ["Ahmed", "Hossain", "Chowdhury", "Islam", "Begum", "Akter", "Rahman", "Siddique", "Khan", "Das"]

function makeEmail(name: string, i: number, domain: string) {
  const base = name.toLowerCase().replace(/\s+/g, ".")
  return `${base}${i}@${domain}`
}

function makePhone(i: number) {
  return `017${String(10000000 + i * 137).slice(0, 8)}`
}

async function main() {
  console.log("→ clearing existing data…")
  const tables = ["reminderLog", "auditLog", "adminSession", "ledger", "subscription", "paymentRequest", "mockAppUser", "client", "landingContent", "projectPaymentConfig", "project", "adminUser"]
  for (const t of tables) {
    // @ts-expect-error dynamic model name
    await db[t].deleteMany({})
  }

  console.log("→ creating admin…")
  const admin = await db.adminUser.create({
    data: {
      email: "admin@inventoryos.xyz",
      passwordHash: await bcrypt.hash("admin123", 10),
      name: "Sajid Chowdhury",
      role: "superadmin",
    },
  })

  console.log("→ creating projects + payment config + landing content…")
  const projectMap: Record<string, string> = {}
  for (const p of PROJECTS) {
    const project = await db.project.create({
      data: {
        key: p.key,
        name: p.name,
        isRoot: p.isRoot,
        icon: p.icon,
        color: p.color,
        dbPath: p.dbPath ?? null,
        folderPath: p.folderPath ?? null,
        appPort: p.appPort ?? null,
        schemaMap: p.isRoot ? "{}" : SCHEMA_MAP,
        landingUrl: p.landingUrl ?? null,
      },
    })
    projectMap[p.key] = project.id
    await db.projectPaymentConfig.create({
      data: {
        projectId: project.id,
        bkashNumber: p.isRoot ? null : "01787492561",
        nagadNumber: p.isRoot ? null : "01787492561",
        bankAccount: p.isRoot ? null : "Islami Bank — 1234567890",
        monthlyAmount: p.monthly,
        currency: "BDT",
        dueDayOfMonth: 1,
      },
    })
    await db.landingContent.create({
      data: { projectId: project.id, content: p.landing },
    })
  }

  console.log("→ seeding mock app users + client cross-index + subscriptions + ledger…")
  const now = Date.now()
  const DAY = 86400000
  let clientSeq = 0
  for (const p of PROJECTS) {
    if (p.isRoot) continue
    const projectId = projectMap[p.key]

    // Phase 2: mudaraba is wired to the REAL sample-apps/mudaraba.db file.
    // Seed its cross-index + subs from the known real .db users so All Clients
    // / dashboard stay consistent with the live .db the cross-db layer reads.
    // The Clients tab itself reads the real .db directly (not this index).
    if (p.key === "mudaraba") {
      const realUsers = [
        { email: "rahim.mudaraba@demo.com", name: "Rahim Ahmed", phone: "01711122233", paid: false },
        { email: "karim.mudaraba@demo.com", name: "Karim Hossain", phone: "01722233344", paid: true },
        { email: "fatema.mudaraba@demo.com", name: "Fatema Akter", phone: "01733344556", paid: true },
        { email: "abdullah.mudaraba@demo.com", name: "Abdullah Islam", phone: "01744455667", paid: false },
        { email: "ayesha.mudaraba@demo.com", name: "Ayesha Begum", phone: "01755566778", paid: true },
        { email: "sadia.mudaraba@demo.com", name: "Sadia Akter", phone: "01766677889", paid: true },
      ]
      for (const u of realUsers) {
        const client = await db.client.create({
          data: { projectId, email: u.email, name: u.name, phone: u.phone, createdAt: new Date(now - 30 * DAY) },
        })
        if (u.paid) {
          const cycleStart = new Date(now - 12 * DAY)
          const cycleEnd = new Date(now + 18 * DAY)
          await db.subscription.create({
            data: { projectId, clientId: client.id, cycleStart, cycleEnd, status: "active" },
          })
          for (let m = 0; m < 3; m++) {
            await db.ledger.create({
              data: { projectId, clientId: client.id, type: "credit", amount: p.monthly, reason: "monthly subscription", txId: `BKSH${Math.floor(Math.random() * 9e8 + 1e8)}`, createdAt: new Date(now - m * 30 * DAY - 5 * DAY) },
            })
          }
        }
      }
      continue
    }

    const count = p.key === "madrasha" ? 22 : 12
    for (let i = 0; i < count; i++) {
      const name = `${FIRST_NAMES[(clientSeq + i) % FIRST_NAMES.length]} ${LAST_NAMES[(clientSeq + i * 3) % LAST_NAMES.length]}`
      const email = makeEmail(name, i, "gmail.com")
      const phone = makePhone(clientSeq + i)
      const createdAt = new Date(now - (60 - i) * DAY)
      // ~70% paid
      const isPaid = Math.random() < 0.7

      await db.mockAppUser.create({
        data: { projectId, email, name, phone, isPaid, createdAt },
      })
      const client = await db.client.create({
        data: { projectId, email, name, phone, createdAt },
      })

      if (isPaid) {
        // Active subscription, paid this month
        const cycleStart = new Date(now - 12 * DAY)
        const cycleEnd = new Date(now + 18 * DAY)
        const sub = await db.subscription.create({
          data: {
            projectId,
            clientId: client.id,
            cycleStart,
            cycleEnd,
            status: "active",
          },
        })
        // 3 months of ledger credits
        for (let m = 0; m < 3; m++) {
          await db.ledger.create({
            data: {
              projectId,
              clientId: client.id,
              type: "credit",
              amount: p.monthly,
              reason: "monthly subscription",
              txId: `BKSH${Math.floor(Math.random() * 9e8 + 1e8)}`,
              createdAt: new Date(now - m * 30 * DAY - 5 * DAY),
            },
          })
        }
        void sub
      } else if (Math.random() < 0.5) {
        // Expired — overdue, for the renewals list
        const cycleStart = new Date(now - 40 * DAY)
        const cycleEnd = new Date(now - 10 * DAY)
        await db.subscription.create({
          data: {
            projectId,
            clientId: client.id,
            cycleStart,
            cycleEnd,
            status: "expired",
          },
        })
        // reminder log
        await db.reminderLog.create({
          data: {
            subscriptionId: "reminder-" + client.id,
            channel: "email",
            result: "sent",
            sentAt: new Date(now - 8 * DAY),
          },
        })
      }
      clientSeq++
    }
  }

  console.log("→ seeding pending payment requests (the approval queue demo)…")
  const pendingSamples: Array<{ key: string; method: string; amount: number }> = [
    { key: "madrasha", method: "bkash", amount: 800 },
    { key: "cctv", method: "nagad", amount: 600 },
    { key: "creativecast", method: "bkash", amount: 1200 },
    { key: "mycreativecode", method: "bank", amount: 1000 },
    { key: "madrasha", method: "nagad", amount: 800 },
    { key: "cctv", method: "bkash", amount: 600 },
  ]
  for (let i = 0; i < pendingSamples.length; i++) {
    const s = pendingSamples[i]
    const projectId = projectMap[s.key]
    const email = makeEmail(`${FIRST_NAMES[i]} ${LAST_NAMES[i]}`, i + 100, "gmail.com")
    await db.paymentRequest.create({
      data: {
        projectId,
        clientEmail: email,
        method: s.method,
        txId: `BKSH${99000000 + i * 1234}`,
        amount: s.amount,
        status: "pending",
        submittedAt: new Date(now - i * 3600000 - 1800000),
      },
    })
  }

  // Phase 2 demo: a pending payment for the REAL unpaid mudaraba .db user.
  // Approving this one flips is_paid=1 inside sample-apps/mudaraba.db for real.
  await db.paymentRequest.create({
    data: {
      projectId: projectMap["mudaraba"],
      clientEmail: "rahim.mudaraba@demo.com",
      method: "bkash",
      txId: "BKSH88776655",
      amount: 1500,
      status: "pending",
      submittedAt: new Date(now - 900000),
    },
  })

  console.log("→ seeding audit log…")
  const actions = [
    { action: "auth.login", target: admin.email },
    { action: "payment.approve", target: "BKSH99000000" },
    { action: "landing.update", target: "root" },
    { action: "paymentconfig.update", target: "mudaraba" },
    { action: "schema.validate", target: "cctv" },
  ]
  for (let i = 0; i < actions.length; i++) {
    const a = actions[i]
    await db.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: a.action,
        target: a.target,
        meta: JSON.stringify({ ip: "127.0.0.1" }),
        createdAt: new Date(now - (i + 1) * 3600000 * 3),
      },
    })
  }

  console.log("✓ seed complete.")
  console.log("  Admin login: admin@inventoryos.xyz / admin123")
  console.log(`  Projects: ${PROJECTS.length}`)
  console.log(`  Pending payments: ${pendingSamples.length}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
