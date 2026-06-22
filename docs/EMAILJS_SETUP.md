# EmailJS — booking confirmation emails

When a booking is created (website, conference, or admin), the app sends:

1. **Guest email** — only if the guest provided an email address  
2. **Resort email** — to `VITE_EMAILJS_RESORT_TO_EMAIL` (default `cherekhcenter@gmail.com`)

Emails are sent from the browser via [EmailJS](https://www.emailjs.com/). Booking save still succeeds if EmailJS fails.

## 1. Environment variables

Add to `.env.local` and **Netlify → Environment variables**:

```env
VITE_EMAILJS_USER_ID=your_public_key_from_emailjs_dashboard
VITE_EMAILJS_SERVICE_ID=service_iued587
VITE_EMAILJS_GUEST_TEMPLATE_ID=template_k1eia5c
VITE_EMAILJS_RESORT_TEMPLATE_ID=template_7i4bkcu
VITE_EMAILJS_RESORT_TO_EMAIL=cherekhcenter@gmail.com
```

Restart the dev server after changing `.env.local`.

## 2. EmailJS template variables

Use these placeholders in **both** templates (same names):

| Variable | Example content |
|----------|-----------------|
| `{{to_email}}` | Recipient (set by app — guest or resort inbox) |
| `{{to_name}}` | Recipient display name |
| `{{guest_name}}` | Lead guest name |
| `{{guest_email}}` | Guest email |
| `{{guest_phone}}` | Guest phone |
| `{{booking_id}}` | Internal booking id |
| `{{check_in}}` | Formatted check-in date |
| `{{check_out}}` | Formatted check-out date |
| `{{nights}}` | Number of nights |
| `{{rooms_summary}}` | e.g. `Room 103 (2 guests); Room 201 (3 guests)` |
| `{{adults}}` | Total adults |
| `{{children}}` | Total children |
| `{{total_guests}}` | Total guests |
| `{{subtotal}}` | e.g. `৳12,000` |
| `{{discount}}` | Discount amount |
| `{{total}}` | Amount due after discount |
| `{{status}}` | `pending`, `confirmed`, etc. |
| `{{special_requests}}` | Guest notes or `—` |
| `{{resort_name}}` | Cherekh Center |
| `{{resort_phone}}` | Resort phone |
| `{{resort_email}}` | Resort email |
| `{{website_url}}` | https://cherekhresort.com |
| `{{booking_url}}` | Thank-you / confirmation link |
| `{{reply_to}}` | Guest email (for resort replies) |

### Guest template (`template_k1eia5c`)

| Field | Value |
|--------|--------|
| **To Email** | `{{to_email}}` |
| **To Name** | `{{to_name}}` |
| **From Name** | `Cherekh Center` |
| **Reply To** | `{{resort_email}}` |
| **Subject** | `Your stay at {{resort_name}} — {{check_in}}` |

Paste into **Content** (HTML mode). Uses inline styles for Gmail/Outlook; forest + teal accents match the website without loud “promo” colors.

```html
<div style="margin:0;padding:0;background:#f4f1ea;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f1ea;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8e4dc;box-shadow:0 4px 24px rgba(30,77,43,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#1E4D2B 0%,#367E7E 100%);padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.85);font-family:Arial,Helvetica,sans-serif;">Booking confirmation</p>
              <h1 style="margin:8px 0 0;font-size:26px;font-weight:normal;color:#ffffff;line-height:1.3;">{{resort_name}}</h1>
              <p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.9);font-family:Arial,Helvetica,sans-serif;">Hill retreat · Thanchi, Bandarban</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#27241F;">Dear {{guest_name}},</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#4f4a44;">Thank you for choosing us. Your reservation is recorded and our team will be in touch if anything else is needed before you arrive.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FBF8F1;border-radius:12px;border:1px solid #ebe6d8;">
                <tr>
                  <td style="padding:20px 22px;font-family:Arial,Helvetica,sans-serif;">
                    <p style="margin:0 0 14px;font-size:11px;font-weight:bold;letter-spacing:0.12em;text-transform:uppercase;color:#367E7E;">Your stay</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;color:#27241F;">
                      <tr><td style="padding:6px 0;color:#857F70;width:38%;">Check-in</td><td style="padding:6px 0;font-weight:600;">{{check_in}}</td></tr>
                      <tr><td style="padding:6px 0;color:#857F70;">Check-out</td><td style="padding:6px 0;font-weight:600;">{{check_out}}</td></tr>
                      <tr><td style="padding:6px 0;color:#857F70;">Nights</td><td style="padding:6px 0;">{{nights}}</td></tr>
                      <tr><td style="padding:6px 0;color:#857F70;vertical-align:top;">Room(s)</td><td style="padding:6px 0;font-weight:600;">{{rooms_summary}}</td></tr>
                      <tr><td style="padding:6px 0;color:#857F70;">Guests</td><td style="padding:6px 0;">{{total_guests}} total ({{adults}} adults, {{children}} children)</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f6f2;border-radius:12px;border-left:4px solid #1E4D2B;">
                <tr>
                  <td style="padding:18px 22px;font-family:Arial,Helvetica,sans-serif;">
                    <p style="margin:0 0 10px;font-size:11px;font-weight:bold;letter-spacing:0.12em;text-transform:uppercase;color:#1E4D2B;">Payment summary</p>
                    <p style="margin:0 0 4px;font-size:14px;color:#4f4a44;">Subtotal <span style="float:right;font-weight:600;color:#27241F;">{{subtotal}}</span></p>
                    <p style="margin:0 0 4px;font-size:14px;color:#4f4a44;">Discount <span style="float:right;">{{discount}}</span></p>
                    <p style="margin:12px 0 0;padding-top:12px;border-top:1px solid #d4e5d9;font-size:16px;color:#27241F;">Total <span style="float:right;font-weight:700;color:#1E4D2B;">{{total}}</span></p>
                    <p style="margin:10px 0 0;font-size:12px;color:#857F70;">Status: {{status}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:bold;letter-spacing:0.1em;text-transform:uppercase;color:#857F70;">Special requests</p>
              <p style="margin:0;font-size:14px;line-height:1.55;color:#4f4a44;background:#faf9f7;padding:12px 14px;border-radius:8px;border:1px solid #ebe6d8;">{{special_requests}}</p>
              <p style="margin:16px 0 0;font-size:12px;color:#857F70;">Reference: {{booking_id}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;text-align:center;">
              <a href="{{booking_url}}" style="display:inline-block;background:#1E4D2B;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;padding:14px 28px;border-radius:10px;">View booking details</a>
              <p style="margin:16px 0 0;font-size:13px;font-family:Arial,Helvetica,sans-serif;">
                <a href="{{website_url}}" style="color:#367E7E;text-decoration:none;">{{website_url}}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#FBF8F1;padding:22px 32px;border-top:1px solid #ebe6d8;font-family:Arial,Helvetica,sans-serif;text-align:center;">
              <p style="margin:0 0 6px;font-size:14px;color:#27241F;">Questions? We are happy to help.</p>
              <p style="margin:0;font-size:14px;color:#4f4a44;">
                <a href="tel:+8801601719735" style="color:#1E4D2B;text-decoration:none;font-weight:600;">{{resort_phone}}</a>
                &nbsp;·&nbsp;
                <a href="mailto:{{resort_email}}" style="color:#367E7E;text-decoration:none;">{{resort_email}}</a>
              </p>
              <p style="margin:14px 0 0;font-size:12px;color:#857F70;">Warm regards,<br>The {{resort_name}} team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
```

---

### Resort template (`template_7i4bkcu`)

| Field | Value |
|--------|--------|
| **To Email** | `{{to_email}}` |
| **To Name** | `{{to_name}}` |
| **From Name** | `Cherekh Bookings` |
| **Reply To** | `{{reply_to}}` |
| **Subject** | `New reservation: {{guest_name}}, {{check_in}}` |

Staff alert layout: clear sections, easy to scan on mobile, reply goes to the guest when email is present.

```html
<div style="margin:0;padding:0;background:#eef2f0;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f0;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dde5e0;">
          <tr>
            <td style="padding:18px 24px;background:#27241F;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:12px;color:#B59455;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">New reservation</p>
                    <h1 style="margin:6px 0 0;font-size:20px;font-weight:600;color:#ffffff;font-family:Georgia,serif;">{{guest_name}}</h1>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;background:#367E7E;color:#fff;font-size:11px;font-weight:600;padding:6px 12px;border-radius:20px;text-transform:capitalize;">{{status}}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 24px 8px;">
              <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#4f4a44;">A new booking was submitted on the website or admin panel. Summary below.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="50%" style="padding-right:8px;vertical-align:top;">
                    <table role="presentation" width="100%" style="background:#f8faf9;border-radius:12px;border:1px solid #e0ebe4;">
                      <tr>
                        <td style="padding:16px 18px;">
                          <p style="margin:0 0 10px;font-size:10px;font-weight:bold;letter-spacing:0.14em;text-transform:uppercase;color:#1E4D2B;">Guest</p>
                          <p style="margin:0 0 6px;font-size:14px;color:#27241F;"><strong>{{guest_name}}</strong></p>
                          <p style="margin:0 0 4px;font-size:13px;"><a href="mailto:{{guest_email}}" style="color:#367E7E;">{{guest_email}}</a></p>
                          <p style="margin:0;font-size:13px;"><a href="tel:{{guest_phone}}" style="color:#1E4D2B;text-decoration:none;">{{guest_phone}}</a></p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" style="padding-left:8px;vertical-align:top;">
                    <table role="presentation" width="100%" style="background:#FBF8F1;border-radius:12px;border:1px solid #ebe6d8;">
                      <tr>
                        <td style="padding:16px 18px;">
                          <p style="margin:0 0 10px;font-size:10px;font-weight:bold;letter-spacing:0.14em;text-transform:uppercase;color:#917541;">Dates</p>
                          <p style="margin:0 0 4px;font-size:13px;color:#857F70;">In</p>
                          <p style="margin:0 0 10px;font-size:15px;font-weight:600;color:#27241F;">{{check_in}}</p>
                          <p style="margin:0 0 4px;font-size:13px;color:#857F70;">Out · {{nights}} nights</p>
                          <p style="margin:0;font-size:15px;font-weight:600;color:#27241F;">{{check_out}}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 16px;">
              <table role="presentation" width="100%" style="background:linear-gradient(90deg,#f1f6f2 0%,#faf8f3 100%);border-radius:12px;border:1px solid #dde8e0;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 8px;font-size:10px;font-weight:bold;letter-spacing:0.14em;text-transform:uppercase;color:#367E7E;">Rooms &amp; guests</p>
                    <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#27241F;line-height:1.45;">{{rooms_summary}}</p>
                    <p style="margin:0;font-size:13px;color:#4f4a44;">{{total_guests}} guests ({{adults}} adults, {{children}} children)</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;">
                <tr>
                  <td style="padding:12px 14px;background:#27241F;color:#fff;border-radius:10px 0 0 10px;width:33%;">Total due</td>
                  <td style="padding:12px 14px;background:#1E4D2B;color:#fff;font-size:18px;font-weight:700;border-radius:0 10px 10px 0;">{{total}}</td>
                </tr>
              </table>
              <p style="margin:8px 0 0;font-size:12px;color:#857F70;">Subtotal {{subtotal}} · Discount {{discount}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 20px;">
              <p style="margin:0 0 6px;font-size:10px;font-weight:bold;letter-spacing:0.1em;text-transform:uppercase;color:#857F70;">Special requests</p>
              <p style="margin:0;font-size:14px;line-height:1.5;color:#27241F;padding:12px 14px;background:#faf9f7;border-radius:8px;border-left:3px solid #B59455;">{{special_requests}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px;text-align:center;">
              <a href="{{booking_url}}" style="display:inline-block;background:#367E7E;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;">Open confirmation page</a>
              <p style="margin:14px 0 0;font-size:12px;color:#857F70;">ID: {{booking_id}}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
```

### Design notes (stays out of spam folders)

- **Subjects** are calm and specific (no ALL CAPS, “FREE”, or “URGENT”).
- **One** primary button per email; no image-only body.
- **Brand greens** (`#1E4D2B`, `#367E7E`) and cream (`#FBF8F1`) — not neon red/yellow promo blocks.
- Plenty of plain text content so filters see a real transactional message.

## 3. EmailJS dashboard checklist

1. **Email Service** `service_iued587` — connected to your sending account (Gmail, etc.).  
2. **Templates** — variables match the table above.  
3. **Account → API keys** — copy the **Public Key** into `VITE_EMAILJS_USER_ID` in `.env.local` and **save the file**.  
4. Under each template, note the **Template ID** if you create new ones and update env vars.

## 4. Testing

1. Set all `VITE_EMAILJS_*` vars locally.  
2. Submit a test booking on `/booking` with your real email.  
3. Check browser DevTools → Console for `[EmailJS]` errors.  
4. Confirm guest + resort inboxes (and spam folder).

If guest email is empty (some admin entries), only the resort email is sent.
