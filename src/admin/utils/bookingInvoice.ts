import {
  computeBookingFinancials,
  FOOD_MEAL_LABELS,
  getAdvanceTransactions,
  getBookingRooms,
  PAYMENT_METHOD_LABELS,
  type Booking,
  type Payment,
  type PaymentTransaction,
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

const escapeHtml = (value: string | number | undefined | null): string => {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

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
            <td>${escapeHtml(t.isAdvance && t.type === 'payment' ? 'advance' : t.type)}</td>
            <td>${escapeHtml(t.method ? PAYMENT_METHOD_LABELS[t.method] : '')}</td>
            <td>${escapeHtml(t.reference ?? '')}</td>
            <td class="num ${t.type === 'refund' ? 'neg' : ''}">
              ${t.type === 'refund' ? '-' : ''}${escapeHtml(formatBDT(t.amount))}
            </td>
          </tr>`
          )
          .join('')}
      </tbody>
    </table>
  `
}

export const paidSealDate = (booking: Booking): string => {
  const lastPayment = (booking.payment?.transactions ?? [])
    .filter((t) => t.type === 'payment')
    .reduce<string | undefined>((latest, t) => (!latest || t.recordedAt > latest ? t.recordedAt : latest), undefined)
  const raw = lastPayment ?? booking.payment?.paidAt
  const date = raw ? new Date(raw) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  return date
    .toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase()
}

const renderPaidSeal = (booking: Booking): string => `
  <div class="paid-seal" aria-hidden="true">
    <svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <path id="seal-top" d="M 34 110 A 76 76 0 0 1 186 110" />
        <path id="seal-bottom" d="M 30 110 A 80 80 0 0 0 190 110" />
      </defs>
      <circle cx="110" cy="110" r="104" fill="none" stroke="currentColor" stroke-width="5" />
      <circle cx="110" cy="110" r="96" fill="none" stroke="currentColor" stroke-width="1.5" />
      <circle cx="110" cy="110" r="62" fill="none" stroke="currentColor" stroke-width="1.5" />
      <text font-size="15" font-weight="700" letter-spacing="3" fill="currentColor" text-anchor="middle">
        <textPath href="#seal-top" startOffset="50%">CHEREKH CENTER</textPath>
      </text>
      <text font-size="12" font-weight="700" letter-spacing="2" fill="currentColor" text-anchor="middle" dominant-baseline="hanging">
        <textPath href="#seal-bottom" startOffset="50%">${escapeHtml(paidSealDate(booking))}</textPath>
      </text>
      <text x="23" y="115" font-size="13" fill="currentColor" text-anchor="middle">★</text>
      <text x="197" y="115" font-size="13" fill="currentColor" text-anchor="middle">★</text>
      <rect x="40" y="88" width="140" height="44" rx="4" fill="#fff" stroke="currentColor" stroke-width="3" />
      <text x="110" y="122" font-size="36" font-weight="800" letter-spacing="6" fill="currentColor" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif">PAID</text>
    </svg>
  </div>`

const buildInvoiceHtml = (booking: Booking): string => {
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
  const advanceTotal = getAdvanceTransactions(booking).reduce(
    (sum, t) => sum + (Number(t.amount) || 0),
    0
  )

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice #${escapeHtml(bookingShort)}</title>
  <style>
    :root {
      --forest: #1E4D2B;
      --stone: #4F4A44;
      --muted: #857F70;
      --bg-soft: #FAF8F3;
      --line: #E2E1DA;
      --red: #B91C1C;
    }
    * { box-sizing: border-box; }
    /* Pad letterhead: pre-printed header (~top 48mm) and footer (~bottom 56mm).
       @page margin 0 hides the browser title/URL so they do not land on the pad art.
       The .pad table's thead/tfoot spacers repeat on every printed page, so page 2+
       keep the same blank header and footer bands as page 1. */
    @page { size: A4; margin: 0; }
    html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: 'Inter', -apple-system, system-ui, sans-serif;
      color: #1F2937;
      margin: 0;
      padding: 0 18mm;
      background: #fff;
      font-size: 12px;
      line-height: 1.45;
    }
    table.pad { width: 100%; border-collapse: collapse; margin: 0; }
    table.pad > thead { display: table-header-group; }
    table.pad > tfoot { display: table-footer-group; }
    table.pad > thead > tr > td,
    table.pad > tfoot > tr > td,
    table.pad > tbody > tr > td { padding: 0; border: 0; font-size: inherit; vertical-align: top; }
    .pad-head { height: 48mm; }
    .pad-foot { height: 56mm; }
    .content table tr, .panel, .totals { break-inside: avoid; page-break-inside: avoid; }
    .content h2 { break-after: avoid; page-break-after: avoid; }
    .paid-seal {
      position: fixed;
      top: 50%;
      left: 50%;
      width: 82mm;
      height: 82mm;
      transform: translate(-50%, -50%) rotate(-16deg);
      color: #C8102E;
      opacity: 0.22;
      pointer-events: none;
      z-index: 0;
    }
    .paid-seal svg { width: 100%; height: 100%; display: block; font-family: 'Inter', Arial, sans-serif; }
    table.pad { position: relative; z-index: 1; }
    h1, h2 { font-family: 'Cormorant Garamond', Georgia, serif; color: var(--forest); margin: 0; }
    h1 { font-size: 22px; }
    h2 { font-size: 15px; margin-top: 14px; margin-bottom: 6px; }
    .meta {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 16px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--line);
    }
    .meta .id { font-size: 18px; }
    .meta .small { font-size: 11px; color: var(--muted); text-align: right; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
    .panel {
      background: var(--bg-soft);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px 12px;
    }
    .panel .label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted);
      margin: 0 0 3px;
    }
    .panel p { margin: 1px 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
    }
    th, td { padding: 5px 6px; text-align: left; border-bottom: 1px solid var(--line); font-size: 11px; }
    th { color: var(--muted); font-weight: 600; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .ledger td.neg { color: var(--red); }
    .totals { margin-top: 12px; margin-left: auto; max-width: 280px; }
    .totals .row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; }
    .totals .row.muted { color: var(--muted); }
    .totals .row.discount { color: var(--red); }
    .totals .row.total {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 18px;
      color: var(--forest);
      border-top: 1.5px solid var(--forest);
      padding-top: 6px;
      margin-top: 2px;
    }
    .totals .row.subline { font-size: 11px; color: var(--muted); }
    .muted { color: var(--muted); }
    .stamp {
      display: inline-block;
      padding: 1px 7px;
      border-radius: 5px;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 700;
      border: 1px solid currentColor;
    }
    .stamp.paid { color: var(--forest); }
    .stamp.partial { color: #B45309; }
    .stamp.pending { color: var(--stone); }
    .stamp.refunded { color: var(--red); }
  </style>
</head>
<body>
  ${fin.status === 'paid' ? renderPaidSeal(booking) : ''}
  <table class="pad" role="presentation">
    <thead><tr><td><div class="pad-head"></div></td></tr></thead>
    <tfoot><tr><td><div class="pad-foot"></div></td></tr></tfoot>
    <tbody><tr><td class="content">
  <div class="meta">
    <div>
      <div class="muted" style="font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;">Invoice</div>
      <h1 class="id">#${escapeHtml(bookingShort)}</h1>
    </div>
    <div class="small">
      <div>Issued ${escapeHtml(issuedAt)}</div>
      <div>Stay status: ${escapeHtml(booking.status)}</div>
    </div>
  </div>

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

  ${
    (booking.extras ?? []).length > 0
      ? `<h2>Extra charges</h2>
         <table>
           <thead>
             <tr><th>Date</th><th>Item</th><th>Type</th><th>Room</th><th class="num">Amount</th></tr>
           </thead>
           <tbody>
             ${sortExtrasForInvoice(booking.extras ?? [])
               .map(
                 (extra) => `
             <tr>
               <td>${escapeHtml(extra.serviceDate ? formatServiceDate(extra.serviceDate) : '')}</td>
               <td>${escapeHtml(extra.name)}${extra.quantity > 1 ? ` × ${escapeHtml(extra.quantity)}` : ''}</td>
               <td>${
                 extra.category === 'food'
                   ? extra.meal
                     ? FOOD_MEAL_LABELS[extra.meal]
                     : 'Food'
                   : 'Other'
               }</td>
               <td>${escapeHtml(extra.roomName ?? '')}</td>
               <td class="num">${escapeHtml(formatBDT(extra.amount))}</td>
             </tr>`
               )
               .join('')}
           </tbody>
         </table>`
      : ''
  }

  <div class="totals">
    <div class="row muted"><span>Room rent</span><span>${escapeHtml(formatBDT(fin.roomRent ?? fin.subtotal))}</span></div>
    ${
      fin.foodTotal > 0
        ? `<div class="row muted"><span>Food bill</span><span>${escapeHtml(formatBDT(fin.foodTotal))}</span></div>`
        : ''
    }
    ${
      fin.otherTotal > 0
        ? `<div class="row muted"><span>Other bills</span><span>${escapeHtml(formatBDT(fin.otherTotal))}</span></div>`
        : ''
    }
    ${
      fin.discount > 0
        ? `<div class="row discount"><span>Discount${
            payment?.discount?.reason ? ` - ${escapeHtml(payment.discount.reason)}` : ''
          }</span><span>- ${escapeHtml(formatBDT(fin.discount))}</span></div>`
        : ''
    }
    <div class="row total"><span>Total Due</span><span>${escapeHtml(formatBDT(fin.total))}</span></div>
    ${advanceTotal > 0 ? `<div class="row subline"><span>Advance paid</span><span>${escapeHtml(formatBDT(advanceTotal))}</span></div>` : ''}
    <div class="row subline"><span>${advanceTotal > 0 ? 'Total paid' : 'Paid'}</span><span>${escapeHtml(formatBDT(fin.paid))}</span></div>
    ${fin.refunded > 0 ? `<div class="row subline"><span>Refunded</span><span>- ${escapeHtml(formatBDT(fin.refunded))}</span></div>` : ''}
    <div class="row" style="font-weight: 600;">
      <span>Outstanding</span>
      <span>${escapeHtml(formatBDT(fin.outstanding))}</span>
    </div>
    <div class="row" style="margin-top: 6px;">
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
    </td></tr></tbody>
  </table>
</body>
</html>`
}

/**
 * Opens a print dialog for pad letterhead: billing details only, with top/bottom
 * space left blank for the pre-printed header and footer.
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

  const triggerPrint = () => {
    popup.focus()
    setTimeout(() => popup.print(), 80)
  }

  if (popup.document.readyState === 'complete') {
    triggerPrint()
  } else {
    popup.addEventListener('load', triggerPrint, { once: true })
  }
  return true
}
