import { useState, useMemo, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useBudgetItems,
  useCategories,
  useSavingsGoal,
  useRecurringItems,
  useCategoryLimits,
  useUpsertBudgetItem,
  useDeleteBudgetItem,
  useUpsertCategory,
  useDeleteCategory,
  useUpsertSavingsGoal,
  useUpsertRecurringItem,
  useDeleteRecurringItem,
  useUpsertCategoryLimit,
  useClearMonth,
  useApplyRecurring,
  type BudgetItem,
  type Category,
  type RecurringItem,
} from "@/hooks/useBudget";
import ExpensePieChart from "@/components/budget/ExpensePieChart";
import ExpenseLegend from "@/components/budget/ExpenseLegend";
import SummaryCards from "@/components/budget/SummaryCards";
import CategoryLimitsCard from "@/components/budget/CategoryLimitsCard";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DEFAULT_CATEGORIES = [
  { name: "Food", color: "#A0522D" },
  { name: "Rent", color: "#6B8E6B" },
  { name: "Transport", color: "#B8860B" },
  { name: "Utilities", color: "#708090" },
  { name: "Health", color: "#CD5C5C" },
  { name: "Entertainment", color: "#9370DB" },
  { name: "Savings", color: "#2E8B57" },
  { name: "Other", color: "#8B8682" },
];

const formatPHP = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Index = () => {
  const { user, signOut } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [showSettings, setShowSettings] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);

  const { data: items = [], isLoading } = useBudgetItems(month, year);
  const { data: categories = [] } = useCategories();
  const { data: savingsGoal } = useSavingsGoal(month, year);
  const { data: recurringItems = [] } = useRecurringItems();
  const { data: categoryLimits = [] } = useCategoryLimits(month, year);

  const upsertItem = useUpsertBudgetItem();
  const deleteItem = useDeleteBudgetItem();
  const upsertCategory = useUpsertCategory();
  const deleteCategory = useDeleteCategory();
  const upsertGoal = useUpsertSavingsGoal();
  const upsertRecurring = useUpsertRecurringItem();
  const deleteRecurring = useDeleteRecurringItem();
  const upsertLimit = useUpsertCategoryLimit();
  const clearMonth = useClearMonth();
  const applyRecurring = useApplyRecurring();

  const incomeItems = useMemo(() => items.filter((i) => i.type === "income"), [items]);
  const expenseItems = useMemo(() => items.filter((i) => i.type === "expense"), [items]);

  const totalIncome = useMemo(
    () => incomeItems.reduce((s, r) => s + (r.included ? r.amount : 0), 0),
    [incomeItems]
  );
  const totalExpenses = useMemo(
    () => expenseItems.reduce((s, r) => s + (r.included ? r.amount : 0), 0),
    [expenseItems]
  );
  const net = totalIncome - totalExpenses;
  const pctSaved = totalIncome > 0 ? (net / totalIncome) * 100 : 0;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = year === now.getFullYear() && month === now.getMonth() ? now.getDate() : daysInMonth;

  // Savings goal progress
  const goalTarget = savingsGoal?.target_amount ?? 0;
  const goalPct = goalTarget > 0 ? Math.min((net / goalTarget) * 100, 100) : 0;

  // Init default categories if none exist
  const hasInitRef = useRef(false);
  if (categories.length === 0 && user && !hasInitRef.current) {
    hasInitRef.current = true;
    DEFAULT_CATEGORIES.forEach((c) => upsertCategory.mutate(c));
  }

  const handleAddItem = (type: "income" | "expense") => {
    const list = type === "income" ? incomeItems : expenseItems;
    upsertItem.mutate({
      description: "",
      amount: 0,
      type,
      category_id: null,
      month,
      year,
      included: true,
      sort_order: list.length,
    });
  };

  const handleApplyRecurring = () => {
    if (recurringItems.length > 0) {
      applyRecurring.mutate({ month, year, items: recurringItems });
    }
  };

  // Export to CSV
  const exportCSV = () => {
    const rows = [["Type", "Description", "Category", "Amount", "Included"]];
    const catMap = new Map(categories.map((c) => [c.id, c.name]));
    for (const item of items) {
      rows.push([
        item.type,
        item.description,
        item.category_id ? catMap.get(item.category_id) ?? "" : "",
        item.amount.toString(),
        item.included ? "Yes" : "No",
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-${MONTHS[month]}-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Budget</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowRecurring(!showRecurring)} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground">
              Recurring
            </button>
            <button onClick={() => setShowSettings(!showSettings)} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground">
              Settings
            </button>
            <button onClick={exportCSV} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground">
              Export
            </button>
            <button onClick={() => signOut()} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground">
              Sign Out
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <SettingsPanel
            categories={categories}
            categoryLimits={categoryLimits}
            month={month}
            year={year}
            savingsGoal={savingsGoal?.target_amount ?? 0}
            onUpsertCategory={(c) => upsertCategory.mutate(c)}
            onDeleteCategory={(id) => deleteCategory.mutate(id)}
            onSetGoal={(amt) => upsertGoal.mutate({ month, year, target_amount: amt })}
            onSetLimit={(catId, amt) => upsertLimit.mutate({ category_id: catId, month, year, limit_amount: amt })}
          />
        )}

        {/* Recurring Panel */}
        {showRecurring && (
          <RecurringPanel
            items={recurringItems}
            categories={categories}
            onUpsert={(item) => upsertRecurring.mutate(item)}
            onDelete={(id) => deleteRecurring.mutate(id)}
            onApply={handleApplyRecurring}
          />
        )}

        {/* Monthly Summary */}
        <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-medium text-muted-foreground">Monthly Summary</h2>
            <div className="flex items-center gap-2">
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <p className={`text-3xl sm:text-4xl font-bold tracking-tight ${net >= 0 ? "text-positive" : "text-negative"}`}>
            {formatPHP(net)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {pctSaved >= 0 ? "+" : ""}{pctSaved.toFixed(1)}% saved
          </p>

          {/* Savings Goal Progress */}
          {goalTarget > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Savings Goal</span>
                <span className={`font-medium ${goalPct >= 100 ? "text-positive" : "text-foreground"}`}>
                  {formatPHP(Math.max(0, net))} / {formatPHP(goalTarget)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${goalPct >= 100 ? "bg-positive" : "bg-accent"}`}
                  style={{ width: `${Math.max(0, goalPct)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <SummaryCards
          items={items}
          totalIncome={totalIncome}
          totalExpenses={totalExpenses}
          daysInMonth={daysInMonth}
          currentDay={currentDay}
        />

        {/* Expense Breakdown Chart */}
        {expenseItems.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Expense Breakdown</h3>
            <ExpensePieChart items={items} categories={categories} />
            <ExpenseLegend items={items} categories={categories} />
          </div>
        )}

        {/* Category Limits */}
        <CategoryLimitsCard items={items} categories={categories} limits={categoryLimits} />

        {/* Income & Expenses */}
        <div className="grid gap-4 sm:grid-cols-2">
          <EntryCard
            title="Income"
            total={totalIncome}
            items={incomeItems}
            categories={categories}
            onUpdate={(item) => upsertItem.mutate(item)}
            onDelete={(id) => deleteItem.mutate(id)}
            onAdd={() => handleAddItem("income")}
          />
          <EntryCard
            title="Expenses"
            total={totalExpenses}
            items={expenseItems}
            categories={categories}
            onUpdate={(item) => upsertItem.mutate(item)}
            onDelete={(id) => deleteItem.mutate(id)}
            onAdd={() => handleAddItem("expense")}
          />
        </div>

        {/* Clear / Apply Recurring */}
        <div className="flex gap-2">
          <button
            onClick={() => { if (confirm("Clear all items for this month?")) clearMonth.mutate({ month, year }); }}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
          >
            Clear Month
          </button>
          {recurringItems.length > 0 && (
            <button
              onClick={handleApplyRecurring}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-secondary hover:text-secondary-foreground"
            >
              Apply Recurring Items
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Entry Card ──────────────────────────────────────────────
interface EntryCardProps {
  title: string;
  total: number;
  items: BudgetItem[];
  categories: Category[];
  onUpdate: (item: BudgetItem) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

const EntryCard = ({ title, total, items, categories, onUpdate, onDelete, onAdd }: EntryCardProps) => {
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const debouncedUpdate = useCallback((item: BudgetItem) => {
    if (debounceRef.current[item.id]) clearTimeout(debounceRef.current[item.id]);
    debounceRef.current[item.id] = setTimeout(() => onUpdate(item), 500);
  }, [onUpdate]);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <span className="text-sm font-semibold text-foreground">{formatPHP(total)}</span>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.id} className={`flex items-center gap-2 ${!item.included ? "opacity-40" : ""}`}>
            <Checkbox
              checked={item.included}
              onCheckedChange={(checked) => onUpdate({ ...item, included: !!checked })}
              className="shrink-0"
            />
            <input
              type="text"
              placeholder="Description"
              defaultValue={item.description}
              onChange={(e) => debouncedUpdate({ ...item, description: e.target.value })}
              className="flex-1 min-w-0 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {title === "Expenses" && (
              <select
                defaultValue={item.category_id ?? ""}
                onChange={(e) => onUpdate({ ...item, category_id: e.target.value || null })}
                className="w-20 shrink-0 rounded-md border border-border bg-background px-1 py-1.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            <div className="relative w-24 shrink-0">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/50">₱</span>
              <input
                type="number"
                placeholder="0.00"
                defaultValue={item.amount || ""}
                onChange={(e) => debouncedUpdate({ ...item, amount: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-md border border-border bg-background py-1.5 pl-5 pr-2 text-right text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                step="0.01"
              />
            </div>
            <button
              onClick={() => onDelete(item.id)}
              className="shrink-0 text-muted-foreground/40 hover:text-negative text-xs"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={onAdd}
        className="mt-2 w-full rounded-md border border-dashed border-border py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors"
      >
        + Add Row
      </button>
    </div>
  );
};

// ─── Settings Panel ──────────────────────────────────────────
interface SettingsPanelProps {
  categories: Category[];
  categoryLimits: { category_id: string; limit_amount: number }[];
  month: number;
  year: number;
  savingsGoal: number;
  onUpsertCategory: (c: { id?: string; name: string; color: string }) => void;
  onDeleteCategory: (id: string) => void;
  onSetGoal: (amt: number) => void;
  onSetLimit: (catId: string, amt: number) => void;
}

const SettingsPanel = ({
  categories, categoryLimits, savingsGoal,
  onUpsertCategory, onDeleteCategory, onSetGoal, onSetLimit,
}: SettingsPanelProps) => {
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#8B7355");
  const [goalInput, setGoalInput] = useState(String(savingsGoal || ""));
  const limitMap = useMemo(() => {
    const m: Record<string, number> = {};
    categoryLimits.forEach((l) => (m[l.category_id] = l.limit_amount));
    return m;
  }, [categoryLimits]);

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">Settings</h3>

      {/* Savings Goal */}
      <div>
        <label className="text-xs text-muted-foreground">Monthly Savings Goal (₱)</label>
        <div className="flex gap-2 mt-1">
          <input
            type="number"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="0.00"
          />
          <button onClick={() => onSetGoal(parseFloat(goalInput) || 0)} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            Set
          </button>
        </div>
      </div>

      {/* Categories */}
      <div>
        <label className="text-xs text-muted-foreground">Categories</label>
        <div className="space-y-1 mt-1">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-xs">
              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
              <span className="flex-1 text-foreground">{c.name}</span>
              <input
                type="number"
                placeholder="Limit"
                defaultValue={limitMap[c.id] || ""}
                onChange={(e) => onSetLimit(c.id, parseFloat(e.target.value) || 0)}
                className="w-20 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground text-right focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button onClick={() => onDeleteCategory(c.id)} className="text-muted-foreground/40 hover:text-negative">✕</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <input
            type="color"
            value={newCatColor}
            onChange={(e) => setNewCatColor(e.target.value)}
            className="h-7 w-7 rounded border border-border cursor-pointer"
          />
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="New category"
            className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={() => { if (newCatName.trim()) { onUpsertCategory({ name: newCatName.trim(), color: newCatColor }); setNewCatName(""); } }}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Recurring Panel ─────────────────────────────────────────
interface RecurringPanelProps {
  items: RecurringItem[];
  categories: Category[];
  onUpsert: (item: Omit<RecurringItem, "id"> & { id?: string }) => void;
  onDelete: (id: string) => void;
  onApply: () => void;
}

const RecurringPanel = ({ items, categories, onUpsert, onDelete, onApply }: RecurringPanelProps) => {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [catId, setCatId] = useState("");

  const handleAdd = () => {
    if (!desc.trim()) return;
    onUpsert({
      description: desc.trim(),
      amount: parseFloat(amount) || 0,
      type,
      category_id: catId || null,
      is_active: true,
    });
    setDesc("");
    setAmount("");
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Recurring Items</h3>
        <button onClick={onApply} className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-accent-foreground hover:bg-accent/90">
          Apply to Month
        </button>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 text-xs">
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${item.type === "income" ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"}`}>
              {item.type === "income" ? "INC" : "EXP"}
            </span>
            <span className="flex-1 text-foreground">{item.description}</span>
            <span className="text-muted-foreground">{formatPHP(item.amount)}</span>
            <button onClick={() => onDelete(item.id)} className="text-muted-foreground/40 hover:text-negative">✕</button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <select value={type} onChange={(e) => setType(e.target.value as "income" | "expense")} className="rounded-md border border-border bg-background px-1.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" className="flex-1 min-w-0 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        {type === "expense" && (
          <select value={catId} onChange={(e) => setCatId(e.target.value)} className="w-20 rounded-md border border-border bg-background px-1 py-1.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="">—</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="₱" className="w-20 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-right text-foreground focus:outline-none focus:ring-1 focus:ring-ring" step="0.01" />
        <button onClick={handleAdd} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">Add</button>
      </div>
    </div>
  );
};

export default Index;
