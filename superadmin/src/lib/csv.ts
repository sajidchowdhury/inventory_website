// Tiny CSV writer with proper escaping (RFC 4180). Fields containing commas,
// quotes, or newlines get wrapped in double quotes with internal quotes doubled.
export function rowsToCsv(rows: Array<Array<string | number | null | undefined>>): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v)
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  return rows.map((r) => r.map(esc).join(",")).join("\r\n")
}
