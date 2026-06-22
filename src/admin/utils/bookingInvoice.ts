import {
  computeBookingFinancials,
  getBookingRooms,
  type Booking,
  type Payment,
  type PaymentTransaction,
} from '../../utils/bookings'
import { getResortSettings } from '../data/settings'
import { formatShortDate, formatDateTime } from './date'
import { formatBookingId } from '../../utils/bookingId'
import { formatBDT } from './format'
import {
  bookingIsConferenceOnly,
  formatEventDatesDisplay,
  getBookingDurationCount,
  getBookingEventDates,
} from '../../utils/bookingHelpers'

const escapeHtml = (value: string | number | undefined | null): string => {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Invoice copy uses "Center" branding (legacy settings may still say Resort). */
const invoiceBrandText = (text: string): string =>
  text.replace(/\bResort\b/g, 'Center').replace(/\bresort\b/g, 'center')

const renderTransactions = (txs: PaymentTransaction[]): string => {
  if (txs.length === 0) {
    return `<p class="muted">No payment transactions yet.</p>`
  }
  return `
    <table class="ledger">
      <thead>
        <tr><th>Date</th><th>Type</th><th>Method</th><th>Reference</th><th class="num">Amount</th></tr>
      </thead>
      <tbody>
        ${txs
          .map(
            (t) => `
          <tr>
            <td>${escapeHtml(formatDateTime(t.recordedAt))}</td>
            <td>${escapeHtml(t.type)}</td>
            <td>${escapeHtml(t.method ?? '')}</td>
            <td>${escapeHtml(t.reference ?? '')}</td>
            <td class="num ${t.type === 'refund' ? 'neg' : ''}">
              ${t.type === 'refund' ? '−' : ''}${escapeHtml(formatBDT(t.amount))}
            </td>
          </tr>`
          )
          .join('')}
      </tbody>
    </table>
  `
}

const buildInvoiceHtml = (booking: Booking): string => {
  const settings = getResortSettings()
  const brandName = invoiceBrandText(settings.resortName)
  const brandAddress = invoiceBrandText(settings.address)
  const rooms = getBookingRooms(booking)
  const fin = computeBookingFinancials(booking)
  const payment: Payment | undefined = booking.payment
  const isConferenceOnly = bookingIsConferenceOnly(booking)
  const nights = getBookingDurationCount(booking)
  const stayLabel = isConferenceOnly
    ? formatEventDatesDisplay(getBookingEventDates(booking))
    : `${formatShortDate(booking.checkIn)} → ${formatShortDate(booking.checkOut)}`
  const durationUnit = isConferenceOnly ? 'event day' : 'night'
  const bookingShort = formatBookingId(booking.id)
  const issuedAt = new Date().toLocaleString()
  const logoUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/images/CherekhLogoFinal.svg`
      : '/images/CherekhLogoFinal.svg'

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(brandName)} — Invoice #${escapeHtml(bookingShort)}</title>
  <style>
    :root {
      --forest: #1E4D2B;
      --stone: #4F4A44;
      --muted: #857F70;
      --bg-soft: #FAF8F3;
      --line: #E2E1DA;
      --accent: #C8AE72;
      --red: #B91C1C;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, system-ui, sans-serif;
      color: #1F2937;
      margin: 0;
      padding: 12px 40px 32px;
      background: #fff;
      font-size: 13px;
      line-height: 1.5;
    }
    h1, h2, h3 { font-family: 'Cormorant Garamond', Georgia, serif; color: var(--forest); margin: 0; }
    h1 { font-size: 28px; }
    h2 { font-size: 20px; margin-top: 24px; margin-bottom: 12px; }
    .logo-bar {
      display: flex;
      justify-content: center;
      margin: 0 0 2px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      padding-top: 0;
      padding-bottom: 16px;
      border-bottom: 2px solid var(--forest);
    }
    .header h1 { margin-top: 0; line-height: 1.1; }
    .brand { flex: 1; }
    .brand p { margin: 2px 0; color: var(--muted); font-size: 12px; }
    .meta { flex: 1; text-align: right; }
    .meta .badge {
      display: inline-block;
      padding: 4px 10px;
      background: var(--bg-soft);
      border-radius: 999px;
      color: var(--forest);
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .meta .small { font-size: 11px; color: var(--muted); margin-top: 6px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 20px; }
    .panel {
      background: var(--bg-soft);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 14px 16px;
    }
    .panel .label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted);
      margin: 0 0 4px;
    }
    .panel p { margin: 2px 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    th, td { padding: 8px 6px; text-align: left; border-bottom: 1px solid var(--line); font-size: 12px; }
    th { color: var(--muted); font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .ledger td.neg { color: var(--red); }
    .totals { margin-top: 16px; margin-left: auto; max-width: 320px; }
    .totals .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
    .totals .row.muted { color: var(--muted); }
    .totals .row.discount { color: var(--red); }
    .totals .row.total {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 20px;
      color: var(--forest);
      border-top: 2px solid var(--forest);
      padding-top: 8px;
      margin-top: 4px;
    }
    .totals .row.subline {
      font-size: 11px;
      color: var(--muted);
    }
    .footer {
      margin-top: 36px;
      padding-top: 16px;
      border-top: 1px dashed var(--line);
      font-size: 11px;
      color: var(--muted);
      text-align: center;
    }
    .muted { color: var(--muted); }
    .stamp {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 700;
      border: 1px solid currentColor;
    }
    .stamp.paid { color: var(--forest); }
    .stamp.partial { color: #B45309; }
    .stamp.pending { color: var(--stone); }
    .stamp.refunded { color: var(--red); }
    .logo {
      display: block;
      height: 88px;
      width: auto;
    }
    /* Remove the browser-injected print header/footer (page title + URL/date).
       Margins are restored on the body via padding so content isn't edge-to-edge.
       The top padding is intentionally tight so the logo sits as a header. */
    @page { margin: 0; }
    @media print {
      body { padding: 6mm 16mm 16mm; }
    }
  </style>
</head>
<body>
  <div class="logo-bar">
    <img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(brandName)}" class="logo" />
  </div>

  <header class="header">
    <div class="brand">
      <h1>${escapeHtml(brandName)}</h1>
      <p>${escapeHtml(brandAddress)}</p>
      <p>${escapeHtml(settings.phone)} · ${escapeHtml(settings.email)}</p>
      <p>${escapeHtml(settings.website)}</p>
    </div>
    <div class="meta">
      <span class="badge">Booking Invoice</span>
      <h2 style="margin-top: 8px;">#${escapeHtml(bookingShort)}</h2>
      <div class="small">Issued ${escapeHtml(issuedAt)}</div>
      <div class="small">Status: ${escapeHtml(booking.status)}</div>
    </div>
  </header>

  <section class="grid-2">
    <div class="panel">
      <p class="label">Guest</p>
      <p style="font-weight: 600;">${escapeHtml(booking.name)}</p>
      ${booking.email ? `<p class="muted">${escapeHtml(booking.email)}</p>` : ''}
      <p class="muted">${escapeHtml(booking.phone)}</p>
    </div>
    <div class="panel">
      <p class="label">${isConferenceOnly ? 'Event' : 'Stay'}</p>
      <p><strong>${escapeHtml(stayLabel)}</strong></p>
      <p class="muted">${nights} ${durationUnit}${nights === 1 ? '' : 's'} · ${booking.totalGuests} guest${booking.totalGuests === 1 ? '' : 's'}</p>
    </div>
  </section>

  <h2>Rooms</h2>
  <table>
    <thead>
      <tr><th>Room</th><th>Adults</th><th>Children</th><th class="num">Guests</th></tr>
    </thead>
    <tbody>
      ${rooms
        .map(
          (r) => `
        <tr>
          <td>${escapeHtml(r.roomName)}</td>
          <td>${escapeHtml(r.adults)}</td>
          <td>${escapeHtml(r.children)}</td>
          <td class="num">${escapeHtml(r.totalGuests)}</td>
        </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="row muted"><span>Subtotal</span><span>${escapeHtml(formatBDT(fin.subtotal))}</span></div>
    ${
      fin.discount > 0
        ? `<div class="row discount"><span>Discount${
            payment?.discount?.reason ? ` — ${escapeHtml(payment.discount.reason)}` : ''
          }</span><span>− ${escapeHtml(formatBDT(fin.discount))}</span></div>`
        : ''
    }
    <div class="row total"><span>Total Due</span><span>${escapeHtml(formatBDT(fin.total))}</span></div>
    <div class="row subline"><span>Paid</span><span>${escapeHtml(formatBDT(fin.paid))}</span></div>
    ${fin.refunded > 0 ? `<div class="row subline"><span>Refunded</span><span>− ${escapeHtml(formatBDT(fin.refunded))}</span></div>` : ''}
    <div class="row" style="font-weight: 600;">
      <span>Outstanding</span>
      <span>${escapeHtml(formatBDT(fin.outstanding))}</span>
    </div>
    <div class="row" style="margin-top: 8px;">
      <span class="muted">Payment status</span>
      <span class="stamp ${escapeHtml(fin.status)}">${escapeHtml(fin.status)}</span>
    </div>
  </div>

  <h2>Payment history</h2>
  ${renderTransactions(payment?.transactions ?? [])}

  ${
    booking.specialRequests
      ? `<h2>Special requests</h2>
         <p>${escapeHtml(booking.specialRequests)}</p>`
      : ''
  }

  <div class="footer">
    Thank you for choosing ${escapeHtml(brandName)}. We look forward to hosting you.<br />
    Questions? Reach us at ${escapeHtml(settings.phone)} or ${escapeHtml(settings.email)}.
  </div>
</body>
</html>`
}

/**
 * Opens a popup window with a print-ready invoice for the booking and
 * automatically triggers the browser print dialog. The user can choose
 * "Save as PDF" as the destination to get a downloadable PDF.
 *
 * Returns `false` if the popup was blocked.
 */
export const printBookingInvoice = (booking: Booking): boolean => {
  const html = buildInvoiceHtml(booking)
  const popup = window.open('', '_blank', 'width=900,height=1100')
  if (!popup) return false

  popup.document.open()
  popup.document.write(html)
  popup.document.close()

  const printAfterLoad = () => {
    popup.focus()
    popup.print()
  }

  // Wait for any <img> in the popup (e.g. the logo) to finish loading so the
  // printed page renders with the brand mark instead of a placeholder.
  const waitForImages = (): Promise<void> => {
    const imgs = Array.from(popup.document.images)
    if (imgs.length === 0) return Promise.resolve()
    return Promise.all(
      imgs.map((img) =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener('load', () => resolve(), { once: true })
              img.addEventListener('error', () => resolve(), { once: true })
            })
      )
    ).then(() => undefined)
  }

  const triggerPrint = () => {
    void waitForImages().then(() => setTimeout(printAfterLoad, 80))
  }

  if (popup.document.readyState === 'complete') {
    triggerPrint()
  } else {
    popup.addEventListener('load', triggerPrint, { once: true })
  }
  return true
}
