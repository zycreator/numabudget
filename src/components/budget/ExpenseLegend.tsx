import { useMemo } from "react";
import type { BudgetItem, Category } from "@/hooks/useBudgetData";

const formatPHP = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const DEBT_COLOR = "#C97B6B";
const SAVINGS_COLOR = "#6B9C7A";

interface Props {
  items: BudgetItem[];
  categories: Category[];
  totalDebt?: number;
  totalSaved?: number;
}

const ExpenseLegend = ({ items, categories, totalDebt = 0, totalSaved = 0 }: Props) => {
  const data = useMemo(() => {
    const expenses = items.filter((i) => i.type === "expense" && i.included && i.amount > 0);
    const catMap = new Map(categories.map((c) => [c.id, c]));
    const grouped: Record<string, { name: string; color: string; total: number }> = {};

    for (const item of expenses) {
      const cat = item.category_id ? catMap.get(item.category_id) : null;
      const key = cat?.id ?? "uncategorized";
      if (!grouped[key]) grouped[key] = { name: cat?.name ?? "Uncategorized", color: cat?.color ?? "#bbb", total: 0 };
      grouped[key].total += item.amount;
    }

    const sorted = Object.values(grouped).sort((a, b) => b.total - a.total);
    if (totalDebt > 0) sorted.push({ name: "Debt", color: DEBT_COLOR, total: totalDebt });
    if (totalSaved > 0) sorted.push({ name: "Savings", color: SAVINGS_COLOR, total: totalSaved });

    const grandTotal = sorted.reduce((sum, g) => sum + g.total, 0);
    return { entries: sorted, grandTotal };
  }, [items, categories, totalDebt, totalSaved]);

  if (data.entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
      {data.entries.map((g) => {
        const pct = data.grandTotal > 0 ? ((g.total / data.grandTotal) * 100).toFixed(1) : "0.0";
        return (
          <div key={g.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
            <span>{g.name}</span>
            <span className="font-medium text-foreground">{formatPHP(g.total)}</span>
            <span className="text-muted-foreground/60">({pct}%)</span>
          </div>
        );
      })}
    </div>
  );
};

export default ExpenseLegend;
