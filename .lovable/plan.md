

# Debt & Savings Boards

Replace the current Debt & Savings summary cards with full interactive boards (like Income and Expenses), where you can add, edit, and delete individual entries.

---

## What You'll Get

**Debt Board** -- each row tracks:
- Description (who you owe)
- Amount owed
- Due date

**Savings Board** -- each row tracks:
- Description (what you're saving for)
- Amount saved so far
- Target amount (with progress bar)

Both boards are per-budget, so each budget has its own debt and savings entries. Totals are shown at the top of each board.

---

## Technical Details

### Database: Two New Tables

**`debt_items`**
- `id` (uuid, PK)
- `budget_id` (uuid, NOT NULL)
- `user_id` (uuid, NOT NULL)
- `description` (text, default '')
- `amount` (numeric, default 0)
- `due_date` (date, nullable)
- `sort_order` (integer, default 0)
- `created_at` (timestamptz)
- RLS: users manage own rows

**`savings_items`**
- `id` (uuid, PK)
- `budget_id` (uuid, NOT NULL)
- `user_id` (uuid, NOT NULL)
- `description` (text, default '')
- `saved_amount` (numeric, default 0)
- `target_amount` (numeric, default 0)
- `sort_order` (integer, default 0)
- `created_at` (timestamptz)
- RLS: users manage own rows

### New Hooks (in `useBudgetData.ts`)

- `useDebtItems(budgetId)` -- fetch debt items for the active budget
- `useSavingsItems(budgetId)` -- fetch savings items for the active budget
- `useUpsertDebtItem()` / `useDeleteDebtItem()` -- CRUD for debt
- `useUpsertSavingsItem()` / `useDeleteSavingsItem()` -- CRUD for savings

### UI Changes (`Index.tsx`)

- Remove the current Debt & Savings summary cards
- Add a new grid section below Income/Expenses (or alongside) with two boards:
  - **Debt board**: rows with description input, amount input, date picker, and delete button. Total debt shown in header.
  - **Savings board**: rows with description input, saved amount input, target amount input, a small progress bar per row, and delete button. Total saved / total target shown in header.
- Both boards have "+ Add Row" buttons like the existing Income/Expenses cards
- Debounced input updates (same pattern as EntryCard)

