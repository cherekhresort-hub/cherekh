/**
 * Generic report export (CSV + Excel). Every export carries the business name,
 * report title, period, active filters, generation time (Asia/Dhaka), all
 * filtered rows and a totals row for numeric columns marked `total`.
 */
type Cell = string | number | null | undefined

export interface ExportColumn<T> {
  header: string
  value: (row: T) => Cell
  /** Sum this column into the totals row. */
  total?: boolean
  width?: number
}

export interface ExportSheet<T> {
  name: string
  columns: ExportColumn<T>[]
  rows: T[]
}

export interface ReportExportOptions {
  title: string
  filenameBase: string
  period?: string
  filters?: Record<string, string | undefined>
}

const BUSINESS_NAME = 'Cherekh Center'

const generatedAt = (): string =>
  new Date().toLocaleString('en-GB', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }) + ' (Asia/Dhaka)'

const headerBlock = (opts: ReportExportOptions): Cell[][] => {
  const filters = Object.entries(opts.filters ?? {})
    .filter(([, v]) => v && v !== 'all')
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ')
  return [
    [BUSINESS_NAME],
    [opts.title],
    ['Period', opts.period ?? 'All time'],
    ['Filters', filters || 'None'],
    ['Generated', generatedAt()],
    [],
  ]
}

const sheetMatrix = <T>(sheet: ExportSheet<T>): Cell[][] => {
  const header = sheet.columns.map((c) => c.header)
  const body = sheet.rows.map((row) => sheet.columns.map((c) => normalize(c.value(row))))
  const matrix: Cell[][] = [header, ...body]
  if (sheet.columns.some((c) => c.total)) {
    const totals = sheet.columns.map((c, idx) => {
      if (idx === 0) return 'Total'
      if (!c.total) return ''
      return round2(body.reduce((s, r) => s + (typeof r[idx] === 'number' ? (r[idx] as number) : 0), 0))
    })
    matrix.push(totals)
  }
  return matrix
}

const round2 = (n: number) => Math.round(n * 100) / 100

const normalize = (value: Cell): Cell => {
  if (typeof value === 'number') return Number.isFinite(value) ? round2(value) : ''
  return value ?? ''
}

const csvEscape = (value: Cell): string => {
  const s = value === null || value === undefined ? '' : String(value)
  // Neutralize spreadsheet formula injection from user-entered text.
  const safe = /^[=+\-@]/.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

const safeFilename = (base: string) =>
  base
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'report'

const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const buildReportCsv = <T>(opts: ReportExportOptions, sheet: ExportSheet<T>): string =>
  [...headerBlock(opts), ...sheetMatrix(sheet)].map((row) => row.map(csvEscape).join(',')).join('\r\n')

export const exportReportCsv = <T>(opts: ReportExportOptions, sheet: ExportSheet<T>): void => {
  const csv = buildReportCsv(opts, sheet)
  download(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }), `${safeFilename(opts.filenameBase)}.csv`)
}

export const exportReportExcel = async (opts: ReportExportOptions, sheets: ExportSheet<any>[]): Promise<void> => {
  const XLSX = await import('xlsx')
  const workbook = XLSX.utils.book_new()
  const usedNames = new Set<string>()
  sheets.forEach((sheet) => {
    const ws = XLSX.utils.aoa_to_sheet([...headerBlock(opts), ...sheetMatrix(sheet)])
    ws['!cols'] = sheet.columns.map((c) => ({ wch: c.width ?? Math.max(10, Math.min(40, c.header.length + 4)) }))
    let name = sheet.name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Sheet'
    for (let i = 2; usedNames.has(name); i += 1) name = `${name.slice(0, 28)} ${i}`
    usedNames.add(name)
    XLSX.utils.book_append_sheet(workbook, ws, name)
  })
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  download(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${safeFilename(opts.filenameBase)}.xlsx`
  )
}
