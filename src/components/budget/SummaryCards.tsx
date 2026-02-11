import type { BudgetItem } from "@/hooks/useBudget";

interface Props {
  items: BudgetItem[];
  totalIncome: number;
  totalExpenses: number;
  daysInMonth: number;
  currentDay: number;
}

const formatPHP = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const SummaryCards = ({ items, totalIncome, totalExpenses, daysInMonth, currentDay }: Props) => {
  const expenses = items.filter((i) => i.type === "expense" && i.included && i.amount > 0);
  
  // Top expense
  const topExpense = expenses.length > 0
    ? expenses.reduce((max, i) => (i.amount > max.amount ? i : max), expenses[0])
    : null;

  // Average daily spend
  const avgDaily = currentDay > 0 ? totalExpenses / currentDay : 0;

  // Days left
  const daysLeft = Math.max(0, daysInMonth - currentDay);

  // Transaction count
  const txCount = items.filter((i) => i.included && i.amount > 0).length;

  const cards = [
    { label: "Top Expense", value: topExpense ? `${topExpense.description || "Unnamed"} (${formatPHP(topExpense.amount)})` : "—" },
    { label: "Avg Daily Spend", value: formatPHP(avgDaily) },
    { label: "Days Left", value: `${daysLeft} day${daysLeft !== 1 ? "s" : ""}` },
    { label: "Transactions", value: String(txCount) },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{c.label}</p>
          <p className="mt-1 text-sm font-semibold text-foreground truncate">{c.value}</p>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;
