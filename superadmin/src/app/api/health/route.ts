// Server health API — plan §11.
// GET /api/health → VPS CPU/RAM/disk/uptime via node:os + node:fs statfs.
import { NextResponse } from "next/server"
import { getCurrentAdmin } from "@/lib/auth"
import { hostname, loadavg, cpus, platform, release, totalmem, freemem, uptime, version } from "node:os"
import { statfsSync } from "node:fs"

export const runtime = "nodejs"

function humanizeUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const [load1, load5, load15] = loadavg()
  const coreList = cpus()
  const cores = coreList.length || 1
  const total = totalmem()
  const free = freemem()
  const used = total - free
  const usedPct = total > 0 ? (used / total) * 100 : 0

  let disk: { total: number; free: number; used: number; usedPct: number; path: string } | null = null
  try {
    const path = "/home/z/my-project"
    const stats = statfsSync(path)
    const totalBytes = stats.bsize * stats.blocks
    const freeBytes = stats.bsize * stats.bavail
    const usedBytes = totalBytes - freeBytes
    disk = {
      total: totalBytes,
      free: freeBytes,
      used: usedBytes,
      usedPct: totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0,
      path,
    }
  } catch {
    disk = null
  }

  const upSeconds = uptime()

  return NextResponse.json({
    cpu: {
      load1,
      load5,
      load15,
      cores,
      model: coreList[0]?.model || "unknown",
    },
    memory: {
      total,
      free,
      used,
      usedPct,
    },
    disk,
    uptime: {
      seconds: upSeconds,
      human: humanizeUptime(upSeconds),
    },
    hostname: hostname(),
    platform: platform(),
    platformRelease: release(),
    nodeVersion: version(),
  })
}
