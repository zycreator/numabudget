

# Include Debt & Savings in Budget Totals and Charts

## Overview
Debt and Savings will appear as separate line items in the budget header and as their own slices in the pie chart/legend -- giving you a complete picture of where your money goes.

## Changes

### 1. Budget Header Totals (`src/pages/Index.tsx`)
- Update `net` calculation: `net = totalIncome - totalExpenses - totalDebt - totalSaved`
- Add separate summary lines below the net total showing:
  - **Debt**: ₱X,XXX.XX
  - **Savings**: ₱X,XXX.XX
- Update `pctSaved` to reflect the new net

### 2. Pie Chart (`src/components/budget/ExpensePieChart.tsx`)
- Accept new props: `totalDebt` and `totalSaved`
- After grouping expense categories, append a "Debt" slice (with a distinct color, e.g. `#C97B6B`) and a "Savings" slice (e.g. `#6B9C7A`) when their totals are > 0
- Chart title stays "Expense Breakdown" or rename to "Budget Breakdown"

### 3. Legend (`src/components/budget/ExpenseLegend.tsx`)
- Accept same new props: `totalDebt` and `totalSaved`
- Append "Debt" and "Savings" entries at the end of the legend with matching colors

### 4. Summary Cards (`src/components/budget/SummaryCards.tsx`)
- Update `totalExpenses` prop or add `totalDebt`/`totalSaved` props so "Avg Daily Spend" accounts for all outflows
- Optionally add a "Total Obligations" card (expenses + debt + savings)

### 5. Wiring in `Index.tsx`
- Pass `totalDebt` and `totalSaved` to `ExpensePieChart`, `ExpenseLegend`, and `SummaryCards`
- Show the breakdown condition to include debt/savings (not just `expenseItems.length > 0`)

