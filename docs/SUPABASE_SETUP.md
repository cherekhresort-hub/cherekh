# Supabase setup — Cherekh Center

## 1. Environment variables

Copy `.env.example` to `.env.local` (local) and add the same keys in **Netlify → Site settings → Environment variables**:

```env
VITE_SUPABASE_URL=https://llbfrmecyozjlbhgggdx.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon public key>
```

**Never** put the service role key or `sb_secret_*` keys in `VITE_*` variables or in git.

## 2. Run the database migrations

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**
2. Paste and run, in order:
   - `supabase/migrations/001_bookings.sql`
   - `supabase/migrations/002_user_roles.sql`
   - `supabase/migrations/003_bookings_list_view.sql`
   - `supabase/migrations/004_admin_notifications.sql` *(legacy — superseded by 026/027; skip if setting up fresh after 027)*

**001** creates:

- `bookings` table (full booking JSON in `payload`)
- `booking_availability` view (dates/rooms only — safe for public availability checks)
- Row Level Security policies

**002** creates:

- `user_roles` table with seeded accounts:
  - `malthas.dev01@gmail.com` → **admin** (full access, including delete)
  - `cherekhresort@gmail.com` → **manager** (create/read/update only; delete blocked in RLS)
- RLS so only admins can **delete** rows in `bookings`

**003** creates:

- `bookings_list` view — summary columns extracted from `payload` (guest name, rooms, payment totals) without sending the full JSON blob on every admin page load
- `grant select` for authenticated users

**004** *(removed)* — was `admin_notifications` for the old manager bell icon. Use **`026_staff_activity_log.sql`** and **`027_drop_admin_notifications.sql`** instead.

**026** creates:

- `staff_activity_log` table — all staff roles log important actions; admins read them on the **Activity** page
- RLS: staff **insert** their own rows; admins **select**

Enable **Realtime** on `staff_activity_log` (Database → Replication) so Activity counts update live.

## 3. Create dashboard users

1. Dashboard → **Authentication** → **Users** → **Add user** (once per email above)
2. Set a strong password for each account
3. Sign in at `/login` — only emails listed in `user_roles` can access the admin console

Managers can view and edit most of the UI, but:

- **Cannot** change room catalog rates or booking subtotals (rent) — rate card only
- **Cannot** delete bookings, payment lines, discounts, staff, or custom roles
- **Every staff action** (bookings, discounts, status, staff, housekeeping, guests, settings, inquiries, team access) is recorded in the **Activity** log

Admins review activity on **Activity** in the sidebar and can delete records where permitted.

## 4. Enable Realtime (optional)

Dashboard → **Database** → **Replication** → enable `bookings` for live admin updates.

## 5. Migrate existing local data

On first load with Supabase configured, if the cloud database is empty but the browser still has `cherekh_bookings` in localStorage, bookings are uploaded automatically once.

## Troubleshooting

### Login: “This email is not authorized for the admin panel”

Usually one of:

1. **`002_user_roles.sql` not run** — run it so the two emails are seeded in `user_roles`.
2. **Auth user email must match exactly** (case-insensitive) — e.g. `malthas.dev01@gmail.com`, `cherekhresort@gmail.com`.
3. **Missing grant on `user_roles`** — if you already ran an older `002`, run:

```sql
grant select on public.user_roles to authenticated;
```

4. **Confirm rows exist** (Table Editor → `user_roles`) or run:

```sql
insert into public.user_roles (email, role)
values
  ('malthas.dev01@gmail.com', 'admin'),
  ('cherekhresort@gmail.com', 'manager')
on conflict (email) do update set role = excluded.role;
```

The app checks your role **after** Supabase sign-in (RLS only allows reading your own row when authenticated).

### `booking_availability` is not a table

Older copies of `001_bookings.sql` tried to add an RLS policy on the **view**, which Postgres rejects. Re-run the full updated `001_bookings.sql`, or if the table and view already exist, run only:

```sql
revoke all on public.bookings from anon;
grant select on public.booking_availability to anon, authenticated;
grant select, insert, update, delete on public.bookings to authenticated;
```

Then continue with `002_user_roles.sql`.

## Reducing database egress

The app is tuned to minimize Supabase **database egress** (API read volume):

| Optimization | What it does |
|--------------|----------------|
| **Admin-only full sync** | Full `bookings` payloads load only under `/admin`, not on every public page. |
| **Slim availability reads** | Public checks use `booking_availability` with only `id, status, dates, rooms` (no guest PII JSON). |
| **Availability cache** | Same data is reused for 3 minutes per browser tab (booking date changes). |
| **Cache invalidation** | Creating/updating/deleting a booking clears the availability cache so dates stay accurate. |
| **Incremental Realtime** | Admin live updates merge one row (or fetch one `id`) instead of re-downloading every booking. |
| **List vs detail** | Admin tables load `bookings_list` (summary only). Opening a booking, exporting Excel, or saving fetches one row’s full `payload`. |

If `bookings_list` is missing, the app falls back to loading every `payload` (same as before 003).

Run **`007_booking_confirmation_rpc.sql`** so thank-you pages can load a booking on another device when the URL includes `id` and `email` (guest-safe RPC; no full table access for anon).

Run **`008_bookings_rls_tighten.sql`** so anonymous site bookings must be `pending`, and only emails in `user_roles` can read/update bookings.

Run **`009_booking_inventory_rpc.sql`** for atomic inventory checks (prevents double-booking races), safe guest inserts via RPC, staff status updates without wiping booking payloads, and server-side auto-checkout.

Run **`030_advisory_locks_and_rate_limits.sql`** for per-room advisory locks (stronger concurrent booking safety), server-side booking/contact rate limits, and contact-form inserts via RPC only.

Run **`031_booking_rate_limit_30.sql`** if you already applied 030 with the older 5/hour booking cap (updates the limit to **30/hour**). Fresh installs that run the updated 030 file already use 30/hour.

**Rate limits (public):** booking **30/hour** per email or phone; contact form **10/hour** per email or phone. Admin bookings are not rate limited.

Optional: disable **Database → Replication** for `bookings` if you do not need live admin updates (use Refresh instead).

## Security reminder

If API keys were shared in chat or committed by mistake, rotate them in Supabase → **Project Settings** → **API**.
