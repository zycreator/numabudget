import { useMemo } from "react";
import type { BudgetItem, Category, CategoryLimit } from "@/hooks/useBudgetData";

interface Props {
  items: BudgetItem[];
  categories: Category[];
  limits: CategoryLimit[];
}

const formatPHP = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CategoryLimitsCard = ({ items, categories, limits }: Props) => {
  const data = useMemo(() => {
    const expenses = items.filter((i) => i.type === "expense" && i.included && i.amount > 0);
    const spentMap: Record<string, number> = {};
    for (const item of expenses) {
      if (item.category_id) {
        spentMap[item.category_id] = (spentMap[item.category_id] || 0) + item.amount;
      }
    }
    const catMap = new Map(categories.map((c) => [c.id, c]));
    return limits
      .map((l) => {
        const cat = catMap.get(l.category_id);
        const spent = spentMap[l.category_id] || 0;
        const pct = l.limit_amount > 0 ? Math.min((spent / l.limit_amount) * 100, 100) : 0;
        return { name: cat?.name ?? "Unknown", color: cat?.color ?? "#999", spent, limit: l.limit_amount, pct };
      })
      .filter((d) => d.limit > 0);
  }, [items, categories, limits]);

  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card/60 backdrop-blur-xl p-4 shadow-lg shadow-black/10">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Budget Limits</h3>
      <div className="space-y-3">
        {data.map((d) => (
          <div key={d.name}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-foreground font-medium">{d.name}</span>
              <span className={d.pct >= 90 ? "text-negative font-semibold" : d.pct >= 75 ? "text-muted-foreground" : "text-muted-foreground"}>
                {formatPHP(d.spent)} / {formatPHP(d.limit)}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  d.pct >= 90 ? "bg-negative" : d.pct >= 75 ? "bg-primary" : "bg-accent"
                }`}
                style={{ width: `${d.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryLimitsCard;
