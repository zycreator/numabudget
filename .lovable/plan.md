

# Add "Paid" Status Checkbox to Budget Rows

## Overview
Add a second, smaller checkbox to each expense/income row that marks it as "paid/spent." When checked, the row's fields turn grey to give you an instant visual indicator of what's been settled.

## How It Will Work
- Each row gets two small checkboxes side by side:
  1. **Green checkbox** (existing) -- toggles whether the row is included in totals
  2. **Terracotta/muted checkbox** (new) -- marks the row as paid/spent
- When the "paid" checkbox is ticked, the entire row's fields (description, amount, category) get a grey background and slightly muted text
- Both checkboxes will be shrunk to the same small size (h-3.5 w-3.5) to keep things minimal and clean

## What Changes

### 1. Database Migration
- Add a `paid` boolean column (default `false`) to the `budget_items` table
- Add a `paid` boolean column (default `false`) to the `plan_items` table (for Planner consistency)

### 2. Data Layer Updates
- **`src/hooks/useBudgetData.ts`**: Add `paid` field to `BudgetItem` interface and include it in the upsert mutation

### 3. UI Changes
- **`src/pages/Index.tsx`** (EntryCard component):
  - Make both checkboxes smaller (h-3.5 w-3.5)
  - Add second checkbox with a distinct muted/brown color
  - When `paid` is true: apply grey background and reduced opacity to the row's input fields
- **`src/pages/PlannerView.tsx`**: Same treatment for plan entry rows

### 4. Checkbox Styling
- The existing "included" checkbox stays green (primary color)
- The new "paid" checkbox uses a warm grey/brown accent color to differentiate it
- Both are the same small size to keep the layout clean

## Visual Behavior
- **Unchecked (not paid)**: Row looks normal
- **Checked (paid)**: Row fields get a light grey background tint, text becomes slightly muted -- giving a clear "this is done" feel without a harsh strikethrough
