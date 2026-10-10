# Finance module (first pass)

Expenses, purchases, payments, deposits, assets, investment (Main fund) and financial reports for Cherekh Center.

All calculations live in `src/lib/finance/reporting.ts` (and `revenue.ts` for booking revenue). Pages and reports read from there so a figure is the same everywhere. Those files are pure functions covered by `npm test`.

## Business model

The management company leased Cherekh Center from its owners and runs it under the Cherekh Center name. Every booking, sale, expense and account in the app belongs to Cherekh Center.

- Money the company puts in is **investment**. It goes into the **Main fund** account (the "mother account") and is moved from there to cash, wallets or the bank as needed.
- Money taken back out is a **withdrawal**. It can't exceed the net amount invested.
- The rent paid to the Cherekh owners is an ordinary expense under category **A. Property Rent and Occupancy**.

## Access

| Area | Admin | Manager | Booking officer |
| --- | --- | --- | --- |
| Expenses page (register, suppliers, deposits, reimbursements, assets) | Full | Create, view, record payments/refunds/reimbursements, apply advances | None |
| Approve / reject / void expenses, write off deposits, edit assets | Yes | No | No |
| Finance settings (categories, departments, projects, accounts, transfers, adjustments, reversals, audit log) | Yes | No | No |
| Investment page (add investment, withdraw, move money, reverse) | Yes | No | No |
| Reports: Bookings & revenue, Daywise | Yes | Yes | No |
| Reports: Expenses | Yes | Yes | No |
| Reports: Financial statements, Investment | Yes | No | No |

The database enforces the same rules with row-level security. The browser only uses the signed-in user's token, never a service key.

- Managers can read expenses, lines, assets, deposit settlements, suppliers and reference data. In the ledger they only see expense payments, refunds, reimbursements and deposit refunds linked to an expense, so investment entries never reach them.
- Every write goes through `SECURITY DEFINER` functions in the non-exposed `private` schema. Each one checks the caller's role first. Thin public `SECURITY INVOKER` wrappers keep the RPC names, the same pattern as migration 040. `fin_record_capital` is admin only.
- Supporting documents are stored in the private `finance-docs` storage bucket. Files open through signed URLs that expire after 120 seconds. Managers can only reach `expense/…` and `asset/…` paths.
- Nothing financial is cached in `localStorage`. Finance data is held in memory and cleared when the signed-in user changes.

## Records are never silently deleted

- Expenses cannot be deleted. **Void** requires a reason, marks the expense void, adds an opposite (reversing) entry for every payment on it, and marks its assets void.
- Ledger entries, including investment and withdrawal entries, cannot be edited or deleted. A mistake is corrected with a **reversal**: an opposite entry linked through `reversal_of`. Each entry can be reversed only once, and reversing a transfer reverses both sides.
- Every insert, update and delete on finance tables is written to `fin_audit_log` with the user's email. Admins can read it under Finance settings → Audit log.
- Categories, suppliers and accounts are deactivated, not deleted.

## Classification rules

Every expense line takes its classification from its category when it is recorded. Later category changes don't rewrite history.

| Classification | Profit & loss | Cash flow | Elsewhere |
| --- | --- | --- | --- |
| Operating expense | Expense in the period of the transaction date | Operating | |
| Inventory | Expense when purchased (periodic method, no stock tracking yet) | Operating | |
| Capital asset | Not an expense; only configured depreciation | Investing | Asset register row created automatically |
| Deposit / advance | Not an expense until written off | Investing | Deposit position until refunded, applied or written off |
| Financing cost | Below the operating result | Operating (expense payments) | |
| Other / unclassified | Operating expense, flagged for review | Operating | |

Investment added and investment withdrawn are capital movements: never revenue, never expenses. They appear only under financing in the cash flow and as capital in the financial position.

Transfers between accounts move money and are excluded from income, expenses and cash-flow totals. Balance adjustments are shown on their own line.

## Investment (Main fund)

Admins use the Investment page:

- **Add investment:** amount, date, account (defaults to Main fund), payment method, reference, an optional "invested by" name, and notes. Recorded as an `owner_contribution` ledger entry.
- **Withdraw:** the same fields, recorded as a `capital_withdrawal` entry. The database refuses a withdrawal larger than the net amount invested.
- **Move money:** a normal transfer that starts from the Main fund, for example Main fund → Cash drawer.
- **Reverse:** corrects a mistaken entry with an opposite entry. The original stays visible, crossed out.

The page summary shows the total invested, the Main fund balance, cash spent on expenses, guest payments received, and cash across all accounts. The Main fund is the seeded account `acc-main`. Admins can rename it or add bank details under Expenses → Settings → Accounts.

## Formulas

**Expense totals.** `total = subtotal − discount + tax + additional charges`. Discount, tax and charges are spread over lines pro-rata to the line totals, so each classification receives its share.

**Expense status (company-paid).**
- `net paid = payments − supplier refunds + advances applied` (reversed entries cancel out).
- `outstanding = max(0, total − net paid)`.
- Status is *Paid* only when `net paid ≥ total`. *Partially paid* means something has been paid but not all. *Refunded* means everything paid was refunded.

**Employee-paid.** The expense counts once, on its transaction date. `owed to employee = total − reimbursements`. A reimbursement is cash out against the same expense, not a new expense.

**Deposits.**
- `held = paid deposit portion − refunds received − applied − written off`.
- Applying an advance settles another bill without moving cash.
- A write-off becomes an operating expense on the write-off date.

**Revenue earned (accrual).** A booking's value after discount, including extras, is spread evenly across its stay nights. Conference-only bookings use their event days; same-day stays use the check-in day. Only *confirmed* and *checked-out* bookings earn revenue.

**Cash received.** Guest payments minus refunds, by payment date, for every booking status.

**Guest balances.**
- Receivables are earned but unpaid.
- Advances are paid before being earned; they are a liability.
- Money kept on cancelled bookings is shown separately and is not revenue.

**Profit & loss.**

```
Revenue earned (rooms + booking food + other extras)
− Operating expenses (operating + inventory + unclassified + deposit write-offs, incl. rent to the owners)
= Operating result
− Depreciation (assets with a useful life only)
− Financing costs (financing-cost expenses)
= Result before tax
```

The last line is labelled *result before tax*, never net profit. Income tax isn't calculated and restaurant walk-in sales aren't recorded yet. Expenses still pending approval are included and flagged in the notes.

**Statement period.** The financial statements stop at today. For "This month" viewed on the 10th, the profit and loss and cash flow cover the 1st to the 10th, so confirmed nights, depreciation and dated entries after today aren't counted yet. "All time" runs up to today. The position date is the same day.

**Cash flow (direct method).**
- Operating: guest receipts − guest refunds − expense payments for operating and financing-cost lines, including reimbursements.
- Investing: payments for capital and deposit lines + deposit refunds received.
- Financing: investment added − investment withdrawn.
- Adjustments are listed separately. Transfers are excluded.

**Account balances.**
- `opening balance + guest receipts (net) + ledger money in − ledger money out`, from the account's opening date.
- Guest payments are placed into an account by payment method, using each account's "guest payment methods" setting. Unmapped methods appear as *Unassigned guest payments*.

**Investment.**
- `added` and `withdrawn` are the entries' amounts with reversals subtracted. A reversal counts on its own date.
- `total invested = added − withdrawn`. The withdrawal limit is `max(0, total invested)`.
- `spent on expenses = expense payments + reimbursements − supplier refunds − deposit refunds`.
- `cash across all accounts` is the sum of every account balance, including the Main fund and unassigned guest payments.

**Depreciation.**
- Straight-line by day: `(cost − salvage) × days in period ÷ days in useful life`.
- Stops at the end of useful life or on the disposal date.
- Nothing is depreciated until a useful life is entered.
- Assets from rejected or voided expenses are left out of depreciation and the financial position.
- In the position, an asset counts from its purchase date until its disposal or write-off date.

**Approvals.**
- A category, or its parent, can require admin approval, optionally above a threshold. Seeded rules: B, C, F and V above BDT 50,000; X always.
- Expenses an admin records are approved automatically. Ones a manager records start as *pending*.
- An expense with payments can't be rejected. Void it instead, so the payments are reversed.

**Timezone.** All reporting days use Asia/Dhaka, whatever the viewer's device timezone. Weeks start on Monday.

## Not included in this pass

- Restaurant / walk-in POS sales, so revenue is booking-based only.
- Inventory stock levels, consumption and food cost (the periodic method is used instead).
- Payroll.
- A purchase-order workflow (POs can be attached as documents).
- Budgets and budget-vs-actual. A project budget is a reference figure only.
- ADR, RevPAR and per-channel analytics.
- Owner PDF report packs. Excel and CSV exports are available everywhere.
- Return on investment and business valuation.
- The financial position view is partial. Supplier payables, staff reimbursements and deposits reflect current records, not the as-of date.
- Disposing of or writing off an asset doesn't record a gain or loss; its remaining book value simply leaves the position.

## Applying the migrations

The finance tables come from migrations `042`–`050`. Apply them to the Supabase project after reviewing them:

```bash
supabase db push
```

Or run each file in order in the Supabase SQL editor:

1. `042_finance_core.sql`: private schema, role helper, audit log, departments, categories, suppliers, accounts, projects.
2. `043_finance_seed_categories.sql`: departments, default accounts, categories A–Z with subcategories. Idempotent.
3. `044_finance_expenses.sql`: expenses, lines, assets, deposit settlements.
4. `045_finance_ledger.sql`: ledger entries.
5. `046_finance_investments.sql`: the original investor / agreement / loan / allocation tables (removed again by 050).
6. `047_finance_attachments.sql`: private `finance-docs` bucket and attachment records.
7. `048_finance_rpcs.sql`: all write functions.
8. `049_activity_finance_category.sql`: adds the `finance` category to the staff activity log.
9. `050_finance_simple_capital.sql`: removes the investor, agreement, loan and allocation tables, functions and columns, plus the management-lease objects (`fin_leases`, the `lease_rent` kind, `lease_id`, the lease functions) if the earlier lease migration was applied. It limits ledger kinds to the ones in use, creates the **Main fund** account and adds `fin_record_capital`.
   - It stops without changing anything, with a message naming the reason, if any agreement, loan row, allocation, funding or lease-rent ledger entry, or investor/investment/allocation/lease document exists.
   - Investor profiles and leases with no money recorded are deleted one row at a time first, so the audit log keeps a copy of each.
   - Run it as one transaction (the SQL editor and `supabase db push` both do).

Until they are applied, the Expenses and Investment pages and the finance report tabs show a "Finance data is unavailable" notice. The rest of the admin dashboard is unaffected.

After applying:

- Under Expenses → Settings → Accounts, set each account's opening balance and opening date, check the guest payment methods mapped to it, and rename the Main fund or add its bank details if you like.
- Review the seeded categories and approval thresholds.
- Record the money already put into Cherekh Center on the Investment page.
