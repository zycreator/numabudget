

## Add Checkbox Toggle for Each Row

Add a small checkbox before each description field in both Income and Expenses sections. When checked (default), the row's amount is included in all totals. When unchecked, the row is excluded from computations but its data remains visible.

### How It Works

- Each row gets a new `included` boolean field (default: `true`)
- A small checkbox appears to the left of the description input
- Unchecking a row grays it out slightly and excludes its amount from Total Income, Total Expenses, Net Total, and Percentage Saved
- All totals update in real time as checkboxes are toggled

### Technical Details

1. **Update the `Row` interface** to add `included: boolean`
2. **Update `makeRows`** to initialize `included: true`
3. **Update total calculations** to only sum rows where `included` is true
4. **Update `EntryCard`** to render a checkbox before each description input, with a handler that toggles the `included` field
5. **Visual feedback**: unchecked rows get reduced opacity so it's clear they're excluded
6. **Update `clearAll`** to reset all checkboxes back to checked

