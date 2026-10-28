import type { PDFFont, PDFPage, PDFEmbeddedPage, RGB } from 'pdf-lib'
import {
  computeBookingFinancials,
  FOOD_MEAL_LABELS,
  getAdvanceTransactions,
  getBookingRooms,
  PAYMENT_METHOD_LABELS,
  type Booking,
} from '../../utils/bookings'
import { formatShortDate, formatDateTime } from './date'
import { formatBookingId } from '../../utils/bookingId'
import { formatServiceDate, sortExtrasForInvoice } from '../../utils/foodBill'
import { formatBDT } from './format'
import {
  bookingIsConferenceOnly,
  formatEventDatesDisplay,
  getBookingDurationCount,
  getBookingEventDates,
} from '../../utils/bookingHelpers'
import { paidSealDate } from './bookingInvoice'

const PAD_URL = '/pad/cherekh-pad.pdf'

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const MARGIN_X = 50
/** Below the pad's dotted header rule. */
const CONTENT_TOP = A4_HEIGHT - 132
/** Above the pad's "Sincerely" / QR footer. */
const CONTENT_BOTTOM = 165
const CONTENT_WIDTH = A4_WIDTH - MARGIN_X * 2

type Align = 'left' | 'right'

interface Column {
  header: string
  width: number
  align?: Align
}

interface Fonts {
  regular: PDFFont
  bold: PDFFont
  serif: PDFFont
}

interface Palette {
  ink: RGB
  muted: RGB
  forest: RGB
  line: RGB
  soft: RGB
  red: RGB
  seal: RGB
}

/** Standard PDF fonts only cover Latin-1; swap anything else so a stray symbol cannot abort the export. */
const makeSanitizer = (font: PDFFont) => {
  const supported = new Set(font.getCharacterSet())
  const replacements: Record<string, string> = { '→': '-', '–': '-', '—': '-', '৳': 'BDT ', '\u00a0': ' ' }
  return (value: string | number | undefined | null): string => {
    if (value === null || value === undefined) return ''
    return Array.from(String(value))
      .map((ch) => replacements[ch] ?? (supported.has(ch.codePointAt(0) ?? 0) ? ch : '?'))
      .join('')
  }
}

const safeFileName = (value: string): string =>
  value.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'guest'

export const buildBookingInvoicePdf = async (booking: Booking): Promise<Uint8Array> => {
  const { PDFDocument, StandardFonts, rgb, degrees } = await import('pdf-lib')

  const padBytes = await fetch(PAD_URL).then((res) => {
    if (!res.ok) throw new Error(`Pad template missing (${res.status})`)
    return res.arrayBuffer()
  })

  const doc = await PDFDocument.create()
  const padDoc = await PDFDocument.load(padBytes)
  const [pad]: PDFEmbeddedPage[] = await doc.embedPages([padDoc.getPage(0)])

  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    serif: await doc.embedFont(StandardFonts.TimesRomanBold),
  }
  const clean = makeSanitizer(fonts.regular)
  const color: Palette = {
    ink: rgb(0.12, 0.16, 0.22),
    muted: rgb(0.52, 0.5, 0.44),
    forest: rgb(0.118, 0.302, 0.169),
    line: rgb(0.886, 0.882, 0.855),
    soft: rgb(0.98, 0.973, 0.953),
    red: rgb(0.725, 0.11, 0.11),
    seal: rgb(0.784, 0.063, 0.18),
  }

  const fin = computeBookingFinancials(booking)
  const isPaid = fin.status === 'paid'
  const sealDate = isPaid ? paidSealDate(booking) : ''

  const drawSeal = (page: PDFPage) => {
    const cx = A4_WIDTH / 2
    const cy = A4_HEIGHT / 2
    const tilt = 16
    const opacity = 0.22
    const rad = (deg: number) => (deg * Math.PI) / 180
    const rotatePoint = (x: number, y: number) => {
      const a = rad(tilt)
      return { x: cx + x * Math.cos(a) - y * Math.sin(a), y: cy + x * Math.sin(a) + y * Math.cos(a) }
    }
    const scale = 1.05
    page.drawCircle({ x: cx, y: cy, size: 104 * scale, borderColor: color.seal, borderWidth: 5, borderOpacity: opacity })
    page.drawCircle({ x: cx, y: cy, size: 96 * scale, borderColor: color.seal, borderWidth: 1.5, borderOpacity: opacity })
    page.drawCircle({ x: cx, y: cy, size: 62 * scale, borderColor: color.seal, borderWidth: 1.5, borderOpacity: opacity })

    const arcText = (text: string, radius: number, size: number, top: boolean, spacing: number) => {
      const chars = Array.from(text)
      const widths = chars.map((ch) => fonts.bold.widthOfTextAtSize(ch, size) + spacing)
      const total = widths.reduce((a, b) => a + b, 0) - spacing
      let angle = (total / radius) / 2
      chars.forEach((ch, i) => {
        const w = widths[i] - spacing
        const mid = angle - w / 2 / radius
        const theta = top ? Math.PI / 2 + mid : -Math.PI / 2 - mid
        const r = top ? radius : radius + size * 0.7
        const local = { x: r * Math.cos(theta), y: r * Math.sin(theta) }
        const charRotation = top ? theta - Math.PI / 2 : theta + Math.PI / 2
        const offset = { x: (-w / 2) * Math.cos(charRotation), y: (-w / 2) * Math.sin(charRotation) }
        const p = rotatePoint(local.x + offset.x, local.y + offset.y)
        page.drawText(ch, {
          x: p.x,
          y: p.y,
          size,
          font: fonts.bold,
          color: color.seal,
          opacity,
          rotate: degrees((charRotation * 180) / Math.PI + tilt),
        })
        angle -= widths[i] / radius
      })
    }
    arcText('CHEREKH CENTER', 78 * scale, 15, true, 3)
    if (sealDate) arcText(sealDate, 76 * scale, 12, false, 2)

    for (const side of [-1, 1]) {
      const p = rotatePoint(side * 87 * scale - 4, -4)
      page.drawText('*', { x: p.x, y: p.y, size: 16, font: fonts.bold, color: color.seal, opacity, rotate: degrees(tilt) })
    }

    const boxW = 140 * scale
    const boxH = 44 * scale
    const corner = rotatePoint(-boxW / 2, -boxH / 2)
    page.drawRectangle({
      x: corner.x,
      y: corner.y,
      width: boxW,
      height: boxH,
      rotate: degrees(tilt),
      color: rgb(1, 1, 1),
      opacity: 0.6,
      borderColor: color.seal,
      borderWidth: 3,
      borderOpacity: opacity,
    })
    const paidSize = 38
    const paidW = fonts.serif.widthOfTextAtSize('P A I D', paidSize)
    const paidAt = rotatePoint(-paidW / 2, -paidSize * 0.34)
    page.drawText('P A I D', {
      x: paidAt.x,
      y: paidAt.y,
      size: paidSize,
      font: fonts.serif,
      color: color.seal,
      opacity,
      rotate: degrees(tilt),
    })
  }

  let page: PDFPage = doc.addPage([A4_WIDTH, A4_HEIGHT])
  let y = CONTENT_TOP

  const decoratePage = (p: PDFPage) => {
    p.drawPage(pad, { x: 0, y: 0, width: A4_WIDTH, height: A4_HEIGHT })
    if (isPaid) drawSeal(p)
  }
  decoratePage(page)

  const newPage = () => {
    page = doc.addPage([A4_WIDTH, A4_HEIGHT])
    decoratePage(page)
    y = CONTENT_TOP
  }

  /** Returns true when a new page was started. */
  const ensureSpace = (height: number): boolean => {
    if (y - height >= CONTENT_BOTTOM) return false
    newPage()
    return true
  }

  const text = (
    value: string,
    x: number,
    baseline: number,
    opts: { size?: number; font?: PDFFont; color?: RGB; align?: Align; width?: number } = {}
  ) => {
    const size = opts.size ?? 9.5
    const font = opts.font ?? fonts.regular
    let str = clean(value)
    if (opts.width) {
      while (str.length > 1 && font.widthOfTextAtSize(str, size) > opts.width) str = str.slice(0, -2) + '…'
    }
    const w = font.widthOfTextAtSize(str, size)
    page.drawText(str, {
      x: opts.align === 'right' ? x + (opts.width ?? 0) - w : x,
      y: baseline,
      size,
      font,
      color: opts.color ?? color.ink,
    })
  }

  const wrap = (value: string, width: number, size: number, font: PDFFont): string[] => {
    const lines: string[] = []
    for (const paragraph of clean(value).split(/\r?\n/)) {
      let line = ''
      for (const word of paragraph.split(/\s+/)) {
        const candidate = line ? `${line} ${word}` : word
        if (font.widthOfTextAtSize(candidate, size) <= width || !line) line = candidate
        else {
          lines.push(line)
          line = word
        }
      }
      lines.push(line)
    }
    return lines
  }

  const rule = (atY: number, thickness = 0.6, c: RGB = color.line, x = MARGIN_X, width = CONTENT_WIDTH) => {
    page.drawLine({ start: { x, y: atY }, end: { x: x + width, y: atY }, thickness, color: c })
  }

  const heading = (label: string) => {
    ensureSpace(48)
    y -= 18
    text(label, MARGIN_X, y, { size: 13, font: fonts.serif, color: color.forest })
    y -= 8
  }

  const table = (columns: Column[], rows: string[][], negativeRows: Set<number> = new Set()) => {
    const totalWeight = columns.reduce((s, c) => s + c.width, 0)
    const widths = columns.map((c) => (c.width / totalWeight) * CONTENT_WIDTH)
    const rowH = 18
    const drawHeader = () => {
      y -= 12
      let x = MARGIN_X
      columns.forEach((c, i) => {
        text(c.header.toUpperCase(), x + 4, y, {
          size: 7,
          font: fonts.bold,
          color: color.muted,
          align: c.align,
          width: widths[i] - 8,
        })
        x += widths[i]
      })
      y -= 6
      rule(y)
    }
    ensureSpace(12 + 6 + rowH)
    drawHeader()
    rows.forEach((row, r) => {
      if (ensureSpace(rowH)) drawHeader()
      y -= rowH
      let x = MARGIN_X
      row.forEach((cell, i) => {
        text(cell, x + 4, y + 6, {
          size: 8.5,
          align: columns[i].align,
          width: widths[i] - 8,
          color: negativeRows.has(r) && i === row.length - 1 ? color.red : color.ink,
        })
        x += widths[i]
      })
      rule(y)
    })
  }

  // Header
  const bookingShort = formatBookingId(booking.id)
  text('INVOICE', MARGIN_X, y, { size: 7.5, color: color.muted })
  text(`Issued ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' })}`, MARGIN_X, y, {
    size: 8,
    color: color.muted,
    align: 'right',
    width: CONTENT_WIDTH,
  })
  y -= 20
  text(`#${bookingShort}`, MARGIN_X, y, { size: 18, font: fonts.serif, color: color.forest })
  text(`Stay status: ${booking.status}`, MARGIN_X, y + 6, { size: 8, color: color.muted, align: 'right', width: CONTENT_WIDTH })
  y -= 10
  rule(y)

  // Guest / stay panels
  const isConferenceOnly = bookingIsConferenceOnly(booking)
  const nights = getBookingDurationCount(booking)
  const durationUnit = isConferenceOnly ? 'event day' : 'night'
  const stayLabel = isConferenceOnly
    ? formatEventDatesDisplay(getBookingEventDates(booking))
    : `${formatShortDate(booking.checkIn)} - ${formatShortDate(booking.checkOut)}`
  const panelH = 62
  const gap = 10
  const panelW = (CONTENT_WIDTH - gap) / 2
  y -= 10
  const panelTop = y
  const panels: Array<{ label: string; lines: Array<{ value: string; bold?: boolean; muted?: boolean }> }> = [
    {
      label: 'GUEST',
      lines: [
        { value: booking.name, bold: true },
        ...(booking.email ? [{ value: booking.email, muted: true }] : []),
        { value: booking.phone, muted: true },
      ],
    },
    {
      label: isConferenceOnly ? 'EVENT' : 'STAY',
      lines: [
        { value: stayLabel, bold: true },
        {
          value: `${nights} ${durationUnit}${nights === 1 ? '' : 's'} · ${booking.totalGuests} guest${booking.totalGuests === 1 ? '' : 's'}`,
          muted: true,
        },
      ],
    },
  ]
  panels.forEach((panel, i) => {
    const x = MARGIN_X + i * (panelW + gap)
    page.drawRectangle({
      x,
      y: panelTop - panelH,
      width: panelW,
      height: panelH,
      color: color.soft,
      borderColor: color.line,
      borderWidth: 0.6,
    })
    let ly = panelTop - 14
    text(panel.label, x + 10, ly, { size: 6.5, color: color.muted })
    panel.lines.forEach((line) => {
      ly -= 13
      text(line.value, x + 10, ly, {
        size: 9.5,
        font: line.bold ? fonts.bold : fonts.regular,
        color: line.muted ? color.muted : color.ink,
        width: panelW - 20,
      })
    })
  })
  y = panelTop - panelH

  // Rooms
  heading('Rooms')
  table(
    [
      { header: 'Room', width: 3 },
      { header: 'Adults', width: 2 },
      { header: 'Children', width: 2 },
      { header: 'Guests', width: 2, align: 'right' },
    ],
    getBookingRooms(booking).map((r) => [r.roomName, String(r.adults), String(r.children), String(r.totalGuests)])
  )

  // Extras
  const extras = sortExtrasForInvoice(booking.extras ?? [])
  if (extras.length > 0) {
    heading('Extra charges')
    table(
      [
        { header: 'Date', width: 2 },
        { header: 'Item', width: 4 },
        { header: 'Type', width: 1.6 },
        { header: 'Room', width: 1.4 },
        { header: 'Amount', width: 1.8, align: 'right' },
      ],
      extras.map((extra) => [
        extra.serviceDate ? formatServiceDate(extra.serviceDate) : '',
        `${extra.name}${extra.quantity > 1 ? ` × ${extra.quantity}` : ''}`,
        extra.category === 'food' ? (extra.meal ? FOOD_MEAL_LABELS[extra.meal] : 'Food') : 'Other',
        extra.roomName ?? '',
        formatBDT(extra.amount),
      ])
    )
  }

  // Totals
  const advanceTotal = getAdvanceTransactions(booking).reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  const totalsRows: Array<{ label: string; value: string; kind?: 'muted' | 'discount' | 'total' | 'strong' }> = [
    { label: 'Room rent', value: formatBDT(fin.roomRent ?? fin.subtotal), kind: 'muted' },
  ]
  if (fin.foodTotal > 0) totalsRows.push({ label: 'Food bill', value: formatBDT(fin.foodTotal), kind: 'muted' })
  if (fin.otherTotal > 0) totalsRows.push({ label: 'Other bills', value: formatBDT(fin.otherTotal), kind: 'muted' })
  if (fin.discount > 0) {
    const reason = booking.payment?.discount?.reason
    totalsRows.push({ label: `Discount${reason ? ` - ${reason}` : ''}`, value: `- ${formatBDT(fin.discount)}`, kind: 'discount' })
  }
  totalsRows.push({ label: 'Total Due', value: formatBDT(fin.total), kind: 'total' })
  if (advanceTotal > 0) totalsRows.push({ label: 'Advance paid', value: formatBDT(advanceTotal), kind: 'muted' })
  totalsRows.push({ label: advanceTotal > 0 ? 'Total paid' : 'Paid', value: formatBDT(fin.paid), kind: 'muted' })
  if (fin.refunded > 0) totalsRows.push({ label: 'Refunded', value: `- ${formatBDT(fin.refunded)}`, kind: 'muted' })
  totalsRows.push({ label: 'Outstanding', value: formatBDT(fin.outstanding), kind: 'strong' })

  const totalsW = 220
  const totalsX = MARGIN_X + CONTENT_WIDTH - totalsW
  const totalsHeight = totalsRows.reduce((h, r) => h + (r.kind === 'total' ? 26 : 15), 0) + 34
  ensureSpace(totalsHeight + 12)
  y -= 12
  totalsRows.forEach((row) => {
    if (row.kind === 'total') {
      y -= 4
      page.drawLine({ start: { x: totalsX, y: y }, end: { x: totalsX + totalsW, y: y }, thickness: 1.2, color: color.forest })
      y -= 18
      text(row.label, totalsX, y, { size: 14, font: fonts.serif, color: color.forest })
      text(row.value, totalsX, y, { size: 14, font: fonts.serif, color: color.forest, align: 'right', width: totalsW })
      y -= 4
      return
    }
    y -= 15
    const c = row.kind === 'discount' ? color.red : row.kind === 'strong' ? color.ink : color.muted
    const f = row.kind === 'strong' ? fonts.bold : fonts.regular
    text(row.label, totalsX, y, { size: 9, color: c, font: f, width: totalsW - 90 })
    text(row.value, totalsX, y, { size: 9, color: c, font: f, align: 'right', width: totalsW })
  })
  y -= 18
  text('Payment status', totalsX, y, { size: 9, color: color.muted })
  const statusLabel = fin.status.toUpperCase()
  const statusW = fonts.bold.widthOfTextAtSize(statusLabel, 7) + 12
  const statusColor = fin.status === 'paid' ? color.forest : fin.status === 'refunded' ? color.red : color.muted
  page.drawRectangle({
    x: totalsX + totalsW - statusW,
    y: y - 4,
    width: statusW,
    height: 13,
    borderColor: statusColor,
    borderWidth: 0.8,
  })
  text(statusLabel, totalsX + totalsW - statusW + 6, y, { size: 7, font: fonts.bold, color: statusColor })

  // Payment history
  heading('Payment history')
  const txs = booking.payment?.transactions ?? []
  if (txs.length === 0) {
    ensureSpace(16)
    y -= 14
    text('No payment transactions yet.', MARGIN_X, y, { size: 9, color: color.muted })
  } else {
    const negative = new Set<number>()
    txs.forEach((t, i) => t.type === 'refund' && negative.add(i))
    table(
      [
        { header: 'Date', width: 2.6 },
        { header: 'Type', width: 1.4 },
        { header: 'Method', width: 1.6 },
        { header: 'Reference', width: 2.2 },
        { header: 'Amount', width: 1.8, align: 'right' },
      ],
      txs.map((t) => [
        formatDateTime(t.recordedAt),
        t.isAdvance && t.type === 'payment' ? 'advance' : t.type,
        t.method ? PAYMENT_METHOD_LABELS[t.method] : '',
        t.reference ?? '',
        `${t.type === 'refund' ? '-' : ''}${formatBDT(t.amount)}`,
      ]),
      negative
    )
  }

  if (booking.specialRequests?.trim()) {
    heading('Special requests')
    for (const line of wrap(booking.specialRequests, CONTENT_WIDTH, 9.5, fonts.regular)) {
      ensureSpace(14)
      y -= 13
      text(line, MARGIN_X, y, { size: 9.5 })
    }
  }

  const pages = doc.getPages()
  if (pages.length > 1) {
    pages.forEach((p, i) => {
      const label = `Page ${i + 1} of ${pages.length}`
      const w = fonts.regular.widthOfTextAtSize(label, 7.5)
      p.drawText(label, { x: MARGIN_X + CONTENT_WIDTH - w, y: CONTENT_BOTTOM - 14, size: 7.5, font: fonts.regular, color: color.muted })
    })
  }

  doc.setTitle(`Invoice #${bookingShort}`)
  doc.setAuthor('Cherekh Center')
  doc.setCreator('Cherekh Center admin')
  return doc.save()
}

export const bookingInvoiceFileName = (booking: Booking): string =>
  `Cherekh-Invoice-${formatBookingId(booking.id)}-${safeFileName(booking.name)}.pdf`

/** Builds the pad PDF and downloads it. */
export const exportBookingInvoicePdf = async (booking: Booking): Promise<void> => {
  const bytes = await buildBookingInvoicePdf(booking)
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = bookingInvoiceFileName(booking)
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
