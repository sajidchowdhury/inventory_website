// Currency, date, and byte formatters for the SuperAdmin UI.

export function formatBDT(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n || 0)
}

export function formatDate(d: Date | string | number): string {
  const date = new Date(d)
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function formatDateTime(d: Date | string | number): string {
  const date = new Date(d)
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function relativeTime(d: Date | string | number): string {
  const date = new Date(d)
  const diff = date.getTime() - Date.now()
  const abs = Math.abs(diff)
  const min = 60 * 1000
  const hr = 60 * min
  const day = 24 * hr
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
  if (abs < hr) return rtf.format(Math.round(diff / min), "minute")
  if (abs < day) return rtf.format(Math.round(diff / hr), "hour")
  if (abs < 30 * day) return rtf.format(Math.round(diff / day), "day")
  return rtf.format(Math.round(diff / (30 * day)), "month")
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function daysUntil(d: Date | string | number): number {
  const date = new Date(d)
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}
