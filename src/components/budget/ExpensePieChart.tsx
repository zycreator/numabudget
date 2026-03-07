import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { BudgetItem, Category } from "@/hooks/useBudgetData";

const DEBT_COLOR = "#C97B6B";
const SAVINGS_COLOR = "#6B9C7A";

interface Props {
  items: BudgetItem[];
  categories: Category[];
  totalDebt?: number;
  totalSaved?: number;
}

const FALLBACK_COLOR = "hsl(30, 10%, 75%)";

const ExpensePieChart = ({ items, categories, totalDebt = 0, totalSaved = 0 }: Props) => {
  const data = useMemo(() => {
    const expenses = items.filter((i) => i.type === "expense" && i.included && i.amount > 0);
    const catMap = new Map(categories.map((c) => [c.id, c]));
    const grouped: Record<string, { name: string; value: number; color: string }> = {};

    for (const item of expenses) {
      const cat = item.category_id ? catMap.get(item.category_id) : null;
      const key = cat?.id ?? "uncategorized";
      if (!grouped[key]) {
        grouped[key] = { name: cat?.name ?? "Uncategorized", value: 0, color: cat?.color ?? FALLBACK_COLOR };
      }
      grouped[key].value += item.amount;
    }
    const result = Object.values(grouped);
    if (totalDebt > 0) result.push({ name: "Debt", value: totalDebt, color: DEBT_COLOR });
    if (totalSaved > 0) result.push({ name: "Savings", value: totalSaved, color: SAVINGS_COLOR });
    return result;
  }, [items, categories, totalDebt, totalSaved]);

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
        No expense data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={70}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} stroke="none" />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
            fontSize: "12px",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default ExpensePieChart;
