

# Feature Expansion: Rollover, Planner, and Custom Budget Periods

This plan restructures the budgeting app from a fixed monthly system into a flexible, template-based budget system with rollover support and a built-in planner/scratch pad.

---

## Feature 1: Budget Rollover

A checkbox on each budget view that says "Add remaining balance as rollover to next budget." When enabled, the leftover (income minus expenses) automatically appears as an income line item in the next budget period.

**How it works:**
- A new "rollover" toggle is stored per budget
- When you close/finalize a budget with rollover enabled, the remaining balance is inserted as a special "Rollover from [previous budget name]" income row in the next budget
- The rollover line item is visible and can be removed if you don't want it

---

## Feature 2: Planner / Scratch Pad

A separate "Planner" tab where you can create draft budgets for what-if scenarios. These drafts are saved and can later be converted into real budgets.

**How it works:**
- A new tab/view called "Planner" alongside the main "Budget" view
- Each plan has its own income/expense rows (same layout as the real budget)
- Option to pull in last budget's rollover amount and/or savings data into the plan
- A "Convert to Budget" button creates a real budget from the plan, keeping the draft saved for reference
- Multiple plans can be saved and revisited

---

## Feature 3: Custom Budget Periods (Templates)

Replace the fixed month/year system with fully customizable budget periods. You name your budget anything you want (e.g., "Jan 1-15 Paycheck", "February Rent Cycle", "Vacation Fund"), and optionally attach start/end dates.

**How it works:**
- Instead of selecting a month and year, you create a named "budget" with an optional date range
- A sidebar lists all your saved budgets for quick navigation
- Existing monthly budgets are migrated to named budgets (e.g., "January 2026")
- Each budget is independent -- you can have overlapping periods, short sprints, or long-term budgets

---

## Technical Details

### Database Changes

**New table: `budgets`** (replaces month/year concept)
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `name` (text, NOT NULL) -- e.g., "Jan 1-15 Paycheck"
- `start_date` (date, nullable) -- optional calendar date
- `end_date` (date, nullable) -- optional calendar date
- `rollover_enabled` (boolean, default false)
- `is_active` (boolean, default true) -- for archiving
- `created_at` (timestamptz)
- RLS: user can only access own budgets

**New table: `plans`** (scratch pad drafts)
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `name` (text, NOT NULL)
- `include_rollover_from` (uuid, nullable, FK to budgets) -- optionally pull rollover
- `created_at`, `updated_at`
- RLS: user owns their plans

**New table: `plan_items`** (line items within a plan)
- `id` (uuid, PK)
- `plan_id` (uuid, FK to plans)
- `user_id` (uuid, NOT NULL)
- `description` (text)
- `amount` (numeric)
- `type` (text: income/expense)
- `category_id` (uuid, nullable)
- `included` (boolean, default true)
- `sort_order` (integer)
- RLS: user owns their plan items

**Modify `budget_items`:**
- Add `budget_id` (uuid, FK to budgets)
- Migrate existing rows: create a `budgets` row per unique (month, year) combo, link items
- Eventually drop `month` and `year` columns (after migration)

**Modify `savings_goals` and `category_limits`:**
- Add `budget_id` column referencing the new `budgets` table
- Migrate existing data similarly

### Frontend Changes

1. **Sidebar Navigation**
   - Add a collapsible sidebar listing all budgets and plans
   - Budgets grouped by active/archived
   - "New Budget" and "New Plan" buttons
   - Quick-switch between budgets

2. **Budget Creation Dialog**
   - Name field (required)
   - Optional start date and end date pickers
   - Rollover checkbox: "Carry over remaining balance to next budget"
   - Option to start from a recurring items template

3. **Budget View (refactored Index.tsx)**
   - Replace month/year selectors with budget name display
   - Show date range if set
   - Rollover toggle in the budget header
   - When rollover is enabled and budget has a "previous" budget, show the rollover income line

4. **Planner View (new page/tab)**
   - Same income/expense entry UI as the budget view
   - Toggle to include rollover from a selected previous budget
   - Toggle to include savings goal data
   - "Convert to Budget" button that creates a real budget and copies all plan items
   - Plans list in the sidebar

5. **Hooks Updates**
   - New `useBudgets()` hook for listing/creating/updating budgets
   - New `usePlans()` / `usePlanItems()` hooks
   - Refactor `useBudgetItems()` to accept `budget_id` instead of month/year
   - New `useRollover()` hook to calculate and apply rollover amounts

### Migration Strategy

- Create new tables and add `budget_id` columns
- Run a data migration that creates a `budgets` row for each unique (user_id, month, year) combo with name like "January 2026"
- Backfill `budget_id` on existing `budget_items`, `savings_goals`, and `category_limits`
- Update all queries to use `budget_id`

