import { useState, useCallback, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Row {
  description: string;
  amount: string;
  included: boolean;
}

const makeRows = (count: number): Row[] =>
  Array.from({ length: count }, () => ({ description: "", amount: "", included: true }));

const formatPHP = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Index = () => {
  const [month, setMonth] = useState(new Date().getMonth());
  const [incomeRows, setIncomeRows] = useState<Row[]>(makeRows(5));
  const [expenseRows, setExpenseRows] = useState<Row[]>(makeRows(15));

  const updateRow = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Row[]>>, i: number, field: keyof Row, value: string) => {
      setter((prev) => {
        const next = [...prev];
        const parsedValue = field === "included" ? value === "true" : value;
        next[i] = { ...next[i], [field]: parsedValue };
        return next;
      });
    },
    []
  );

  const totalIncome = useMemo(
    () => incomeRows.reduce((s, r) => s + (r.included ? (parseFloat(r.amount) || 0) : 0), 0),
    [incomeRows]
  );
  const totalExpenses = useMemo(
    () => expenseRows.reduce((s, r) => s + (r.included ? (parseFloat(r.amount) || 0) : 0), 0),
    [expenseRows]
  );
  const net = totalIncome - totalExpenses;
  const pctSaved = totalIncome > 0 ? (net / totalIncome) * 100 : 0;

  const clearAll = () => {
    setIncomeRows(makeRows(5));
    setExpenseRows(makeRows(15));
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Budget</h1>
          <button
            onClick={clearAll}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
          >
            Clear All
          </button>
        </div>

        {/* Summary */}
        <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-medium text-muted-foreground">Monthly Summary</h2>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
          </div>
          <p
            className={`text-3xl sm:text-4xl font-bold tracking-tight ${
              net >= 0 ? "text-positive" : "text-negative"
            }`}
          >
            {formatPHP(net)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {pctSaved >= 0 ? "+" : ""}
            {pctSaved.toFixed(1)}% saved
          </p>
        </div>

        {/* Columns */}
        <div className="grid gap-4 sm:grid-cols-2">
          <EntryCard
            title="Income"
            total={totalIncome}
            rows={incomeRows}
            onChange={(i, f, v) => updateRow(setIncomeRows, i, f, v)}
          />
          <EntryCard
            title="Expenses"
            total={totalExpenses}
            rows={expenseRows}
            onChange={(i, f, v) => updateRow(setExpenseRows, i, f, v)}
          />
        </div>
      </div>
    </div>
  );
};

interface EntryCardProps {
  title: string;
  total: number;
  rows: Row[];
  onChange: (i: number, field: keyof Row, value: string) => void;
}

const EntryCard = ({ title, total, rows, onChange }: EntryCardProps) => (
  <div className="rounded-lg border border-border bg-card p-4">
    <div className="mb-3 flex items-baseline justify-between">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <span className="text-sm font-semibold text-foreground">{formatPHP(total)}</span>
    </div>
    <div className="space-y-1.5">
      {rows.map((row, i) => (
        <div key={i} className={`flex items-center gap-2 ${!row.included ? "opacity-40" : ""}`}>
          <Checkbox
            checked={row.included}
            onCheckedChange={(checked) => onChange(i, "included", String(!!checked))}
            className="shrink-0"
          />
          <input
            type="text"
            placeholder="Description"
            value={row.description}
            onChange={(e) => onChange(i, "description", e.target.value)}
            className="flex-1 min-w-0 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="relative w-28 shrink-0">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/50">₱</span>
            <input
              type="number"
              placeholder="0.00"
              value={row.amount}
              onChange={(e) => onChange(i, "amount", e.target.value)}
              className="w-full rounded-md border border-border bg-background py-1.5 pl-5 pr-2 text-right text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              step="0.01"
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default Index;
