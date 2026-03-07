import { useState, useMemo, useCallback, useRef } from "react";
import { useDragReorder } from "@/hooks/useDragReorder";
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
  useClearBudgetItems,
  useApplyRecurring,
  useRolloverAmount,
  type BudgetItem,
  type Category,
  type RecurringItem } from
"@/hooks/useBudgetData";
import {
  useDebtItems,
  useSavingsItems,
  useUpsertDebtItem,
  useDeleteDebtItem,
  useUpsertSavingsItem,
  useDeleteSavingsItem,
  type DebtItem,
  type SavingsItem } from
"@/hooks/useDebtSavingsData";
import { useBudgets, useUpdateBudget, type Budget } from "@/hooks/useBudgets";
import ExpensePieChart from "@/components/budget/ExpensePieChart";
import ExpenseLegend from "@/components/budget/ExpenseLegend";

import CategoryLimitsCard from "@/components/budget/CategoryLimitsCard";
import PlannerView from "@/pages/PlannerView";
import { usePlans, type Plan } from "@/hooks/usePlans";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";


const formatPHP = (n: number) =>
`₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Compact format for mobile headers: drops decimals for large numbers
const formatPHPCompact = (n: number) => {
  if (Math.abs(n) >= 1000) return `₱${(n / 1000).toFixed(1)}k`;
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const formatDateShort = (dateStr: string | null) => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}-${d.getDate()}`;
};

const toISODate = (shortStr: string): string | null => {
  const parts = shortStr.trim().split("-");
  if (parts.length !== 2) return null;
  const m = parseInt(parts[0], 10);
  const d = parseInt(parts[1], 10);
  if (!m || !d || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const y = new Date().getFullYear();
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

const Index = () => {
  const { user, signOut } = useAuth();
  const [activeBudgetId, setActiveBudgetId] = useState<string | null>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);

  const { data: budgets = [] } = useBudgets();
  const { data: plans = [] } = usePlans();

  // Auto-select first budget if none selected
  const effectiveBudgetId = activeBudgetId ?? (budgets.length > 0 ? budgets[0].id : null);
  const activeBudget = budgets.find((b) => b.id === effectiveBudgetId) ?? null;
  const activePlan = plans.find((p) => p.id === activePlanId) ?? null;

  const handleSelectBudget = (id: string) => {
    setActiveBudgetId(id);
    setActivePlanId(null);
  };
  const handleSelectPlan = (id: string) => {
    setActivePlanId(id);
    setActiveBudgetId(null);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar
          activeBudgetId={activePlanId ? null : effectiveBudgetId}
          activePlanId={activePlanId}
          onSelectBudget={handleSelectBudget}
          onSelectPlan={handleSelectPlan} />

        <main className="flex-1 min-h-0 h-screen overflow-y-auto bg-secondary">
          <div className="mx-auto max-w-5xl px-3 sm:px-4 space-y-3 sm:space-y-4">

            {activePlanId && activePlan ?
            <PlannerView plan={activePlan} /> :
            effectiveBudgetId && activeBudget ?
            <BudgetView
              budget={activeBudget}
              showSettings={showSettings}
              showRecurring={showRecurring} /> :


            <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-sm text-muted-foreground">No budgets yet. Create one from the sidebar!</p>
              </div>
            }
          <div className="pb-10" />
          </div>
        </main>
      </div>
    </SidebarProvider>);

};

// ─── Budget View ─────────────────────────────────────────────

interface BudgetViewProps {
  budget: Budget;
  showSettings: boolean;
  showRecurring: boolean;
}

const BudgetView = ({ budget, showSettings, showRecurring }: BudgetViewProps) => {
  const { user } = useAuth();
  const { data: items = [], isLoading } = useBudgetItems(budget.id);
  const { data: categories = [] } = useCategories();
  const { data: savingsGoal } = useSavingsGoal(budget.id);
  const { data: recurringItems = [] } = useRecurringItems();
  const { data: categoryLimits = [] } = useCategoryLimits(budget.id);
  const { data: rolloverData } = useRolloverAmount(budget.id);
  const { data: debtItems = [] } = useDebtItems(budget.id);
  const { data: savingsItems = [] } = useSavingsItems(budget.id);
  const updateBudget = useUpdateBudget();

  const upsertItem = useUpsertBudgetItem();
  const deleteItem = useDeleteBudgetItem();
  const upsertCategory = useUpsertCategory();
  const deleteCategory = useDeleteCategory();
  const upsertGoal = useUpsertSavingsGoal();
  const upsertRecurring = useUpsertRecurringItem();
  const deleteRecurring = useDeleteRecurringItem();
  const upsertLimit = useUpsertCategoryLimit();
  const clearItems = useClearBudgetItems();
  const applyRecurring = useApplyRecurring();
  const upsertDebt = useUpsertDebtItem();
  const deleteDebt = useDeleteDebtItem();
  const upsertSaving = useUpsertSavingsItem();
  const deleteSaving = useDeleteSavingsItem();

  const rolloverAmount = rolloverData?.amount ?? 0;
  const splitEnabled = budget.split_enabled ?? false;

  const incomeItems = useMemo(() => items.filter((i) => i.type === "income"), [items]);
  const expenseItems = useMemo(() => items.filter((i) => i.type === "expense"), [items]);

  // Period-level totals: checked (actual) and all (budgeted)
  const incomePeriod1Checked = useMemo(() => incomeItems.filter(i => (i.pay_period === 1 || !splitEnabled) && i.included).reduce((s, i) => s + i.amount, 0), [incomeItems, splitEnabled]);
  const incomePeriod1All = useMemo(() => incomeItems.filter(i => i.pay_period === 1 || !splitEnabled).reduce((s, i) => s + i.amount, 0), [incomeItems, splitEnabled]);
  const incomePeriod2Checked = useMemo(() => splitEnabled ? incomeItems.filter(i => i.pay_period === 2 && i.included).reduce((s, i) => s + i.amount, 0) : 0, [incomeItems, splitEnabled]);
  const incomePeriod2All = useMemo(() => splitEnabled ? incomeItems.filter(i => i.pay_period === 2).reduce((s, i) => s + i.amount, 0) : 0, [incomeItems, splitEnabled]);
  const expensePeriod1Checked = useMemo(() => expenseItems.filter(i => (i.pay_period === 1 || !splitEnabled) && i.included).reduce((s, i) => s + i.amount, 0), [expenseItems, splitEnabled]);
  const expensePeriod1All = useMemo(() => expenseItems.filter(i => i.pay_period === 1 || !splitEnabled).reduce((s, i) => s + i.amount, 0), [expenseItems, splitEnabled]);
  const expensePeriod2Checked = useMemo(() => splitEnabled ? expenseItems.filter(i => i.pay_period === 2 && i.included).reduce((s, i) => s + i.amount, 0) : 0, [expenseItems, splitEnabled]);
  const expensePeriod2All = useMemo(() => splitEnabled ? expenseItems.filter(i => i.pay_period === 2).reduce((s, i) => s + i.amount, 0) : 0, [expenseItems, splitEnabled]);

  const periodBalance1Checked = incomePeriod1Checked - expensePeriod1Checked;
  const periodBalance1Budgeted = incomePeriod1All - expensePeriod1All;
  const periodBalance2Checked = incomePeriod2Checked - expensePeriod2Checked;
  const periodBalance2Budgeted = incomePeriod2All - expensePeriod2All;

  const handleToggleSplit = (enabled: boolean) => {
    updateBudget.mutate({ id: budget.id, split_enabled: enabled } as any);
    if (enabled) {
      items.forEach(item => {
        if (item.pay_period !== 1) {
          upsertItem.mutate({ ...item, pay_period: 1 });
        }
      });
    }
  };

  const totalIncomeChecked = useMemo(
    () => incomeItems.reduce((s, r) => s + (r.included ? r.amount : 0), 0) + rolloverAmount,
    [incomeItems, rolloverAmount]
  );
  const totalIncomeAll = useMemo(
    () => incomeItems.reduce((s, r) => s + r.amount, 0) + rolloverAmount,
    [incomeItems, rolloverAmount]
  );
  const totalIncome = totalIncomeChecked;
  const totalExpensesChecked = useMemo(
    () => expenseItems.reduce((s, r) => s + (r.included ? r.amount : 0), 0),
    [expenseItems]
  );
  const totalExpensesAll = useMemo(
    () => expenseItems.reduce((s, r) => s + r.amount, 0),
    [expenseItems]
  );
  const totalExpenses = totalExpensesChecked;
  const totalDebt = useMemo(() => debtItems.reduce((s, d) => s + d.amount, 0), [debtItems]);
  const totalSaved = useMemo(() => savingsItems.reduce((s, d) => s + d.saved_amount, 0), [savingsItems]);
  const totalSavingsTarget = useMemo(() => savingsItems.reduce((s, d) => s + d.target_amount, 0), [savingsItems]);

  const net = totalIncome - totalExpenses - totalDebt - totalSaved;
  const netBudgeted = totalIncomeAll - totalExpensesAll - totalDebt - totalSaved;
  const pctSaved = totalIncome > 0 ? net / totalIncome * 100 : 0;

  const goalTarget = savingsGoal?.target_amount ?? 0;
  const goalPct = goalTarget > 0 ? Math.min(net / goalTarget * 100, 100) : 0;



  const handleAddItem = (type: "income" | "expense", payPeriod: number = 1) => {
    const list = type === "income" ? incomeItems : expenseItems;
    upsertItem.mutate({
      description: "",
      amount: 0,
      type,
      category_id: null,
      budget_id: budget.id,
      month: 0,
      year: 0,
      included: true,
      sort_order: list.length,
      paid: false,
      pay_period: payPeriod,
      item_date: null
    });
  };

  const handleApplyRecurring = () => {
    if (recurringItems.length > 0) {
      applyRecurring.mutate({ budgetId: budget.id, items: recurringItems });
    }
  };

  const exportCSV = () => {
    const rows = [["Type", "Description", "Category", "Amount", "Included"]];
    const catMap = new Map(categories.map((c) => [c.id, c.name]));
    for (const item of items) {
      rows.push([
      item.type,
      item.description,
      item.category_id ? catMap.get(item.category_id) ?? "" : "",
      item.amount.toString(),
      item.included ? "Yes" : "No"]
      );
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-${budget.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><p className="text-sm text-muted-foreground">Loading...</p></div>;
  }

  return (
    <div className="space-y-4">
      {/* Settings Panel */}
      {showSettings &&
      <SettingsPanel
        categories={categories}
        categoryLimits={categoryLimits}
        budgetId={budget.id}
        savingsGoal={savingsGoal?.target_amount ?? 0}
        onUpsertCategory={(c) => upsertCategory.mutate(c)}
        onDeleteCategory={(id) => deleteCategory.mutate(id)}
        onSetGoal={(amt) => upsertGoal.mutate({ budget_id: budget.id, target_amount: amt })}
        onSetLimit={(catId, amt) => upsertLimit.mutate({ category_id: catId, budget_id: budget.id, limit_amount: amt })} />

      }

      {/* Recurring Panel */}
      {showRecurring &&
      <RecurringPanel
        items={recurringItems}
        categories={categories}
        onUpsert={(item) => upsertRecurring.mutate(item)}
        onDelete={(id) => deleteRecurring.mutate(id)}
        onApply={handleApplyRecurring} />

      }

      {/* Sticky Header + Summary Group */}
      <div className="sticky top-0 z-50 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 sm:py-3 bg-background border-b border-border shadow-sm">
        {/* Budget Title Row */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 mb-2">
          <div className="group relative inline-flex items-center gap-1.5">
            <input
              type="text"
              defaultValue={budget.name}
              key={budget.id}
              onBlur={(e) => {
                const val = e.target.value.trim();
                if (!val) { e.target.value = budget.name; return; }
                if (val !== budget.name) updateBudget.mutate({ id: budget.id, name: val });
              }}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              className="text-xs sm:text-sm font-medium text-foreground bg-transparent rounded-md px-1.5 py-0.5 border border-transparent hover:border-border hover:bg-secondary/30 focus:border-ring focus:bg-background focus:outline-none transition-colors w-full max-w-[200px]"
            />
            <span className="text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-colors text-xs pointer-events-none">✎</span>
            {(budget.start_date || budget.end_date) &&
            <p className="text-[10px] sm:text-xs text-muted-foreground">
                {budget.start_date && new Date(budget.start_date).toLocaleDateString()}
                {budget.start_date && budget.end_date && " – "}
                {budget.end_date && new Date(budget.end_date).toLocaleDateString()}
              </p>
            }
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <label className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-muted-foreground cursor-pointer">
              <Switch
                checked={budget.rollover_enabled}
                onCheckedChange={(v) => updateBudget.mutate({ id: budget.id, rollover_enabled: v })} />
              Rollover
            </label>
            <button onClick={exportCSV} className="rounded-md border border-border px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground">
              Export
            </button>
          </div>
        </div>

        {/* Rollover banner */}
        {rolloverData &&
        <div className="mb-2 rounded-md bg-positive/10 px-3 py-1.5 text-[10px] sm:text-xs text-positive">
            Rollover from "{rolloverData.fromBudgetName}": {formatPHP(rolloverData.amount)}
          </div>
        }

        {/* Summary Cards */}
      {splitEnabled ? (
        <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
          {/* Column 1: Overall Summary */}
          <div className="rounded-md bg-secondary/50 p-1.5 sm:p-3">
            <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-0.5 sm:mb-1">Overall</p>
            <p className={`text-sm sm:text-2xl font-bold tracking-tight ${(totalIncomeAll - totalExpensesAll) >= 0 ? "text-positive" : "text-negative"}`}>
              <span className="sm:hidden">{formatPHPCompact(totalIncomeAll - totalExpensesAll)}</span>
              <span className="hidden sm:inline">{formatPHP(totalIncomeAll - totalExpensesAll)}</span>
            </p>
            <div className="mt-0.5 sm:mt-1 space-y-0 sm:space-y-0.5 text-[8px] sm:text-[10px] text-muted-foreground">
              <p className="truncate">Inc: <span className="text-positive">{formatPHPCompact(totalIncomeChecked - rolloverAmount)}</span><span className="hidden sm:inline"> / {formatPHP(totalIncomeAll - rolloverAmount)}</span></p>
              <p className="truncate">Exp: <span className="text-positive">{formatPHPCompact(totalExpensesChecked)}</span><span className="hidden sm:inline"> / {formatPHP(totalExpensesAll)}</span></p>
            </div>
          </div>
          {/* Column 2: Period 1 Summary */}
          <div className="rounded-md bg-secondary/50 p-1.5 sm:p-3">
            <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-0.5 sm:mb-1">Period 1</p>
            <p className={`text-sm sm:text-2xl font-bold tracking-tight ${periodBalance1Checked >= 0 ? "text-positive" : "text-negative"}`}>
              <span className="sm:hidden">{formatPHPCompact(periodBalance1Checked)}</span>
              <span className="hidden sm:inline">{formatPHP(periodBalance1Checked)}</span>
            </p>
            <div className="mt-0.5 sm:mt-1 space-y-0 sm:space-y-0.5 text-[8px] sm:text-[10px] text-muted-foreground">
              <p className="truncate">Inc: <span className="text-positive">{formatPHPCompact(incomePeriod1Checked)}</span><span className="hidden sm:inline"> / {formatPHP(incomePeriod1All)}</span></p>
              <p className="truncate">Exp: <span className="text-positive">{formatPHPCompact(expensePeriod1Checked)}</span><span className="hidden sm:inline"> / {formatPHP(expensePeriod1All)}</span></p>
            </div>
          </div>
          {/* Column 3: Period 2 Summary */}
          <div className="rounded-md bg-secondary/50 p-1.5 sm:p-3">
            <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-0.5 sm:mb-1">Period 2</p>
            <p className={`text-sm sm:text-2xl font-bold tracking-tight ${periodBalance2Checked >= 0 ? "text-positive" : "text-negative"}`}>
              <span className="sm:hidden">{formatPHPCompact(periodBalance2Checked)}</span>
              <span className="hidden sm:inline">{formatPHP(periodBalance2Checked)}</span>
            </p>
            <div className="mt-0.5 sm:mt-1 space-y-0 sm:space-y-0.5 text-[8px] sm:text-[10px] text-muted-foreground">
              <p className="truncate">Inc: <span className="text-positive">{formatPHPCompact(incomePeriod2Checked)}</span><span className="hidden sm:inline"> / {formatPHP(incomePeriod2All)}</span></p>
              <p className="truncate">Exp: <span className="text-positive">{formatPHPCompact(expensePeriod2Checked)}</span><span className="hidden sm:inline"> / {formatPHP(expensePeriod2All)}</span></p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-md bg-secondary/50 p-2 sm:p-3">
          <p className={`text-2xl sm:text-4xl font-bold tracking-tight ${net >= 0 ? "text-positive" : "text-negative"}`}>
            {formatPHP(net)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            of {formatPHP(netBudgeted)} budgeted · {pctSaved >= 0 ? "+" : ""}{pctSaved.toFixed(1)}% saved
          </p>
        </div>
      )}
        {(totalDebt > 0 || totalSaved > 0) &&
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {totalDebt > 0 && <span>Debt: <span className="font-medium text-foreground">{formatPHP(totalDebt)}</span></span>}
            {totalSaved > 0 && <span>Savings: <span className="font-medium text-foreground">{formatPHP(totalSaved)}</span></span>}
          </div>
        }

        {goalTarget > 0 &&
        <div className="mt-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Savings Goal</span>
              <span className={`font-medium ${goalPct >= 100 ? "text-positive" : "text-foreground"}`}>
                {formatPHP(Math.max(0, net))} / {formatPHP(goalTarget)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
              className={`h-full rounded-full transition-all ${goalPct >= 100 ? "bg-positive" : "bg-accent"}`}
              style={{ width: `${Math.max(0, goalPct)}%` }} />
            </div>
          </div>
        }
      </div>

      {/* Budget Breakdown Chart */}
      {(expenseItems.length > 0 || totalDebt > 0 || totalSaved > 0) &&
      <div className="rounded-lg border border-border p-4 bg-primary-foreground">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Budget Breakdown</h3>
          <ExpensePieChart items={items} categories={categories} totalDebt={totalDebt} totalSaved={totalSaved} />
          <ExpenseLegend items={items} categories={categories} totalDebt={totalDebt} totalSaved={totalSaved} />
        </div>
      }

      {/* Category Limits */}
      <CategoryLimitsCard items={items} categories={categories} limits={categoryLimits} />

      {/* Income & Expenses */}
      {splitEnabled ? (
        <SplitBudgetGrid
          incomeItems={incomeItems}
          expenseItems={expenseItems}
          categories={categories}
          queryKey={["budget_items", user?.id, budget.id]}
          onUpdate={(item) => upsertItem.mutate(item)}
          onDelete={(id) => deleteItem.mutate(id)}
          onAddIncome={(pp) => handleAddItem("income", pp)}
          onAddExpense={(pp) => handleAddItem("expense", pp)}
          onToggleSplit={handleToggleSplit}
          totalIncome={totalIncome - rolloverAmount}
          totalExpenses={totalExpenses}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 sm:items-stretch">
          <EntryCard
            title="Income"
            total={totalIncome - rolloverAmount}
            items={incomeItems}
            categories={categories}
            queryKey={["budget_items", user?.id, budget.id]}
            onUpdate={(item) => upsertItem.mutate(item)}
            onDelete={(id) => deleteItem.mutate(id)}
            onAdd={(payPeriod) => handleAddItem("income", payPeriod)}
            splitEnabled={false}
            onToggleSplit={handleToggleSplit} />

          <EntryCard
            title="Expenses"
            total={totalExpenses}
            items={expenseItems}
            categories={categories}
            queryKey={["budget_items", user?.id, budget.id]}
            onUpdate={(item) => upsertItem.mutate(item)}
            onDelete={(id) => deleteItem.mutate(id)}
            onAdd={(payPeriod) => handleAddItem("expense", payPeriod)}
            splitEnabled={false}
            onToggleSplit={handleToggleSplit} />
        </div>
      )}

      {/* Debt & Savings Boards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <DebtBoard
          items={debtItems}
          totalDebt={totalDebt}
          queryKey={["debt_items", user?.id, budget.id]}
          onUpsert={(item) => upsertDebt.mutate(item)}
          onDelete={(id) => deleteDebt.mutate(id)}
          onAdd={() => upsertDebt.mutate({ budget_id: budget.id, description: "", amount: 0, due_date: null, sort_order: debtItems.length })} />

        <SavingsBoard
          items={savingsItems}
          totalSaved={totalSaved}
          totalTarget={totalSavingsTarget}
          queryKey={["savings_items", user?.id, budget.id]}
          onUpsert={(item) => upsertSaving.mutate(item)}
          onDelete={(id) => deleteSaving.mutate(id)}
          onAdd={() => upsertSaving.mutate({ budget_id: budget.id, description: "", saved_amount: 0, target_amount: 0, sort_order: savingsItems.length })} />

      </div>

      <div className="flex gap-2">
        <button
          onClick={() => {if (confirm("Clear all items for this budget?")) clearItems.mutate(budget.id);}}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground">

          Clear All
        </button>
        {recurringItems.length > 0 &&
        <button
          onClick={handleApplyRecurring}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-secondary hover:text-secondary-foreground">

            Apply Recurring Items
          </button>
        }
      </div>
    </div>);

};

// ─── Split Budget Grid (Period-aligned layout) ──────────────
interface SplitBudgetGridProps {
  incomeItems: BudgetItem[];
  expenseItems: BudgetItem[];
  categories: Category[];
  queryKey: unknown[];
  onUpdate: (item: BudgetItem) => void;
  onDelete: (id: string) => void;
  onAddIncome: (payPeriod: number) => void;
  onAddExpense: (payPeriod: number) => void;
  onToggleSplit: (enabled: boolean) => void;
  totalIncome: number;
  totalExpenses: number;
}

const SplitBudgetGrid = ({
  incomeItems, expenseItems, categories, queryKey,
  onUpdate, onDelete, onAddIncome, onAddExpense, onToggleSplit,
  totalIncome, totalExpenses,
}: SplitBudgetGridProps) => {
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const debouncedUpdate = useCallback((item: BudgetItem) => {
    if (debounceRef.current[item.id]) clearTimeout(debounceRef.current[item.id]);
    debounceRef.current[item.id] = setTimeout(() => onUpdate(item), 500);
  }, [onUpdate]);

  const allItems = useMemo(() => [...incomeItems, ...expenseItems], [incomeItems, expenseItems]);

  // Re-sort a period's items by date, updating sort_order and persisting
  const resortPeriodByDate = useCallback((periodItems: BudgetItem[], changedItem?: BudgetItem) => {
    const list = changedItem
      ? periodItems.map(i => i.id === changedItem.id ? changedItem : i)
      : periodItems;
    const sorted = [...list].sort((a, b) => {
      if (!a.item_date && !b.item_date) return 0;
      if (!a.item_date) return 1;
      if (!b.item_date) return -1;
      return a.item_date.localeCompare(b.item_date);
    });
    sorted.forEach((item, idx) => {
      if (item.sort_order !== idx) {
        onUpdate({ ...item, sort_order: idx });
      }
    });
  }, [onUpdate]);

  const incomeP1 = useMemo(() => incomeItems.filter(i => i.pay_period === 1), [incomeItems]);
  const incomeP2 = useMemo(() => incomeItems.filter(i => i.pay_period === 2), [incomeItems]);
  const expenseP1 = useMemo(() => expenseItems.filter(i => i.pay_period === 1), [expenseItems]);
  const expenseP2 = useMemo(() => expenseItems.filter(i => i.pay_period === 2), [expenseItems]);

  const sumChecked = (items: BudgetItem[]) => items.filter(i => i.included).reduce((s, i) => s + i.amount, 0);
  const sumAll = (items: BudgetItem[]) => items.reduce((s, i) => s + i.amount, 0);

  // Drag reorder hooks for each of the 4 sections
  const incomeP1Drag = useDragReorder({ items: incomeP1, onReorder: (r) => r.forEach(onUpdate), queryKey });
  const incomeP2Drag = useDragReorder({ items: incomeP2, onReorder: (r) => r.forEach(onUpdate), queryKey });
  const expenseP1Drag = useDragReorder({ items: expenseP1, onReorder: (r) => r.forEach(onUpdate), queryKey });
  const expenseP2Drag = useDragReorder({ items: expenseP2, onReorder: (r) => r.forEach(onUpdate), queryKey });

  // Cross-period drop state
  const [dropTarget, setDropTarget] = useState<string | null>(null); // e.g. "income-1", "expense-2"
  const dragCounterRef = useRef<Record<string, number>>({});

  const handleContainerDragEnter = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    dragCounterRef.current[key] = (dragCounterRef.current[key] || 0) + 1;
    setDropTarget(key);
  };
  const handleContainerDragLeave = (e: React.DragEvent, key: string) => {
    dragCounterRef.current[key] = (dragCounterRef.current[key] || 0) - 1;
    if (dragCounterRef.current[key] <= 0) {
      dragCounterRef.current[key] = 0;
      setDropTarget(prev => prev === key ? null : prev);
    }
  };
  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleContainerDrop = (e: React.DragEvent, targetPeriod: number, targetType: "income" | "expense") => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = {};
    setDropTarget(null);
    const draggedId = e.dataTransfer.getData("text/plain");
    const draggedItem = allItems.find(i => i.id === draggedId);
    if (draggedItem && draggedItem.pay_period !== targetPeriod) {
      const movedItem = { ...draggedItem, pay_period: targetPeriod };
      onUpdate(movedItem);
      // Re-sort the target period after a tick so the item lands in date order
      const targetItems = (targetType === "income" ? incomeItems : expenseItems).filter(i => i.pay_period === targetPeriod);
      setTimeout(() => resortPeriodByDate(targetItems, movedItem), 100);
    }
  };
  const handleGlobalDragEnd = () => {
    dragCounterRef.current = {};
    setDropTarget(null);
  };

  const renderRow = (
    item: BudgetItem,
    idx: number,
    dIdx: number | null,
    oIdx: number | null,
    onDragStartFn: (index: number, e: React.DragEvent) => void,
    onDragOverFn: (index: number, e: React.DragEvent) => void,
    onDragEndFn: () => void,
    onDragLeaveFn: () => void,
    showCategory: boolean,
    periodItems: BudgetItem[],
  ) => (
    <div
      key={item.id}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", item.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStartFn(idx, e);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragOverFn(idx, e);
      }}
      onDragEnd={() => { onDragEndFn(); handleGlobalDragEnd(); }}
      onDragLeave={onDragLeaveFn}
      className={`relative flex flex-wrap items-center gap-1.5 sm:gap-2 transition-all ${!item.included ? "opacity-40" : ""} ${item.paid ? "bg-muted/50 rounded-md px-1 py-0.5" : ""} ${dIdx === idx ? "opacity-30 scale-95" : ""}`}
    >
      {oIdx === idx && (
        <div className="absolute -top-[2px] left-0 right-0 h-[3px] rounded-full bg-accent z-10" />
      )}
      <span className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground text-xs select-none">⠿</span>
      <Checkbox checked={item.included} onCheckedChange={(checked) => onUpdate({ ...item, included: !!checked })} />
      <Checkbox checked={item.paid} onCheckedChange={(checked) => onUpdate({ ...item, paid: !!checked })} className="border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground" />
      <Popover>
        <PopoverTrigger asChild>
          <button className={`w-10 h-8 sm:h-auto shrink-0 rounded-md border border-border bg-background px-1 py-1.5 text-[10px] text-center focus:outline-none focus:ring-1 focus:ring-ring ${item.item_date ? "text-foreground" : "text-muted-foreground/40"} ${item.paid ? "text-muted-foreground bg-muted/30" : ""}`}>
            {item.item_date ? formatDateShort(item.item_date) : "M-D"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={item.item_date ? new Date(item.item_date + "T00:00:00") : undefined}
            onSelect={(date) => {
              const newDate = date ? format(date, "yyyy-MM-dd") : null;
              const updated = { ...item, item_date: newDate };
              onUpdate(updated);
              setTimeout(() => resortPeriodByDate(periodItems, updated), 100);
            }}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
      <input
        type="text"
        placeholder="Description"
        defaultValue={item.description}
        onChange={(e) => debouncedUpdate({ ...item, description: e.target.value })}
        className={`flex-1 min-w-[80px] rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring ${item.paid ? "text-muted-foreground bg-muted/30" : ""}`}
      />
      {showCategory && (
        <select
          defaultValue={item.category_id ?? ""}
          onChange={(e) => onUpdate({ ...item, category_id: e.target.value || null })}
          className={`w-16 sm:w-20 shrink-0 rounded-md border border-border bg-background px-1 py-1.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring ${item.paid ? "text-muted-foreground bg-muted/30" : ""}`}
        >
          <option value="">—</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
      <div className="relative w-20 sm:w-24 shrink-0">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/50">₱</span>
        <input
          type="number"
          placeholder="0.00"
          defaultValue={item.amount || ""}
          onChange={(e) => debouncedUpdate({ ...item, amount: parseFloat(e.target.value) || 0 })}
          className={`w-full rounded-md border border-border bg-background py-1.5 pl-5 pr-1 text-right text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${item.paid ? "text-muted-foreground bg-muted/30" : ""}`}
          step="0.01"
        />
      </div>
      <button onClick={() => onDelete(item.id)} className="shrink-0 text-muted-foreground/40 hover:text-negative text-xs">✕</button>
    </div>
  );

  const renderAddButton = (onClick: () => void) => (
    <button
      onClick={onClick}
      className="mt-2 w-full rounded-md border border-dashed border-border py-2.5 sm:py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors active:bg-secondary"
    >
      + Add Row
    </button>
  );

  const renderPeriodSection = (
    items: BudgetItem[],
    drag: ReturnType<typeof useDragReorder<BudgetItem>>,
    containerKey: string,
    targetPeriod: number,
    showCategory: boolean,
    onAdd: () => void,
    targetType: "income" | "expense",
  ) => (
    <div
      className={`flex-1 flex flex-col rounded-md p-2 transition-colors min-h-[60px] ${dropTarget === containerKey ? "bg-accent/10 ring-2 ring-accent/30 ring-inset" : ""}`}
      onDragOver={handleContainerDragOver}
      onDragEnter={(e) => handleContainerDragEnter(e, containerKey)}
      onDragLeave={(e) => handleContainerDragLeave(e, containerKey)}
      onDrop={(e) => handleContainerDrop(e, targetPeriod, targetType)}
    >
      <div className="space-y-1.5">
        {items.map((item, idx) =>
          renderRow(item, idx, drag.dragIndex, drag.overIndex, drag.handleDragStart, drag.handleDragOver, drag.handleDragEnd, drag.handleDragLeave, showCategory, items)
        )}
      </div>
      <div className="mt-auto">
        {renderAddButton(onAdd)}
      </div>
    </div>
  );

  return (
    <div className="space-y-0">
      {/* Card headers row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
        <div className="rounded-t-lg border border-b-0 border-border p-3 bg-primary-foreground flex items-baseline justify-between">
          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Income</h3>
          <span className="text-xs sm:text-sm font-semibold text-foreground">{formatPHP(totalIncome)}</span>
        </div>
        <div className="rounded-t-lg sm:rounded-t-lg border border-b-0 border-border p-3 bg-primary-foreground flex items-baseline justify-between max-sm:rounded-none max-sm:border-t-0">
          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Expenses</h3>
          <span className="text-xs sm:text-sm font-semibold text-foreground">{formatPHP(totalExpenses)}</span>
        </div>
      </div>

      {/* Period 1 row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
        <div className="border-x border-border bg-primary-foreground px-2 sm:px-3 pb-2">
          <div className="flex items-center justify-between mb-1.5 pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Period 1</p>
            <span className="text-[10px] font-medium text-muted-foreground">{formatPHP(sumChecked(incomeP1))} <span className="text-muted-foreground/50">/</span> {formatPHP(sumAll(incomeP1))}</span>
          </div>
          {renderPeriodSection(incomeP1, incomeP1Drag, "income-1", 1, false, () => onAddIncome(1), "income")}
        </div>
        <div className="border-x border-border bg-primary-foreground px-2 sm:px-3 pb-2 max-sm:border-t max-sm:border-border/30">
          <div className="flex items-center justify-between mb-1.5 pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Period 1</p>
            <span className="text-[10px] font-medium text-muted-foreground">{formatPHP(sumChecked(expenseP1))} <span className="text-muted-foreground/50">/</span> {formatPHP(sumAll(expenseP1))}</span>
          </div>
          {renderPeriodSection(expenseP1, expenseP1Drag, "expense-1", 1, true, () => onAddExpense(1), "expense")}
        </div>
      </div>

      {/* Split toggle divider */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
        <div className="border-x border-border bg-primary-foreground px-2 sm:px-3">
          <div className="flex items-center gap-2 py-2.5 sm:py-2 border-t border-b border-border/40">
            <Switch checked={true} onCheckedChange={onToggleSplit} className="scale-75 origin-left" />
            <span className="text-[10px] text-muted-foreground">Split into Pay Periods</span>
          </div>
        </div>
        <div className="border-x border-border bg-primary-foreground px-2 sm:px-3 max-sm:hidden">
          <div className="py-2 border-t border-b border-border/40">
            <span className="text-[10px] text-muted-foreground/40">&nbsp;</span>
          </div>
        </div>
      </div>

      {/* Period 2 row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
        <div className="rounded-b-lg sm:rounded-b-lg border border-t-0 border-border bg-primary-foreground px-2 sm:px-3 pb-3 max-sm:rounded-none">
          <div className="flex items-center justify-between mb-1.5 pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Period 2</p>
            <span className="text-[10px] font-medium text-muted-foreground">{formatPHP(sumChecked(incomeP2))} <span className="text-muted-foreground/50">/</span> {formatPHP(sumAll(incomeP2))}</span>
          </div>
          {renderPeriodSection(incomeP2, incomeP2Drag, "income-2", 2, false, () => onAddIncome(2), "income")}
        </div>
        <div className="rounded-b-lg border border-t-0 border-border bg-primary-foreground px-2 sm:px-3 pb-3">
          <div className="flex items-center justify-between mb-1.5 pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Period 2</p>
            <span className="text-[10px] font-medium text-muted-foreground">{formatPHP(sumChecked(expenseP2))} <span className="text-muted-foreground/50">/</span> {formatPHP(sumAll(expenseP2))}</span>
          </div>
          {renderPeriodSection(expenseP2, expenseP2Drag, "expense-2", 2, true, () => onAddExpense(2), "expense")}
        </div>
      </div>
    </div>
  );
};


interface EntryCardProps {
  title: string;
  total: number;
  items: BudgetItem[];
  categories: Category[];
  queryKey: unknown[];
  onUpdate: (item: BudgetItem) => void;
  onDelete: (id: string) => void;
  onAdd: (payPeriod?: number) => void;
  splitEnabled: boolean;
  onToggleSplit: (enabled: boolean) => void;
}

const EntryCard = ({ title, total, items, categories, queryKey, onUpdate, onDelete, onAdd, splitEnabled, onToggleSplit }: EntryCardProps) => {
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const debouncedUpdate = useCallback((item: BudgetItem) => {
    if (debounceRef.current[item.id]) clearTimeout(debounceRef.current[item.id]);
    debounceRef.current[item.id] = setTimeout(() => onUpdate(item), 500);
  }, [onUpdate]);

  const period1Items = useMemo(() => items.filter(i => i.pay_period === 1 || !splitEnabled), [items, splitEnabled]);
  const period2Items = useMemo(() => splitEnabled ? items.filter(i => i.pay_period === 2) : [], [items, splitEnabled]);

  // Checked (actual) totals per period
  const period1Checked = useMemo(() => period1Items.filter(i => i.included).reduce((s, i) => s + i.amount, 0), [period1Items]);
  const period1All = useMemo(() => period1Items.reduce((s, i) => s + i.amount, 0), [period1Items]);
  const period2Checked = useMemo(() => period2Items.filter(i => i.included).reduce((s, i) => s + i.amount, 0), [period2Items]);
  const period2All = useMemo(() => period2Items.reduce((s, i) => s + i.amount, 0), [period2Items]);

  const { dragIndex, overIndex, handleDragStart, handleDragOver, handleDragEnd, handleDragLeave } = useDragReorder({
    items: splitEnabled ? period1Items : items,
    onReorder: (reordered) => reordered.forEach((item) => onUpdate(item)),
    queryKey
  });

  const {
    dragIndex: dragIndex2,
    overIndex: overIndex2,
    handleDragStart: handleDragStart2,
    handleDragOver: handleDragOver2,
    handleDragEnd: handleDragEnd2,
    handleDragLeave: handleDragLeave2
  } = useDragReorder({
    items: period2Items,
    onReorder: (reordered) => reordered.forEach((item) => onUpdate(item)),
    queryKey
  });

  // Cross-period drop handler
  const handleCrossDrop = (item: BudgetItem, targetPeriod: number) => {
    onUpdate({ ...item, pay_period: targetPeriod });
  };

  // Track which period container is being hovered during cross-period drag
  const [dropTargetPeriod, setDropTargetPeriod] = useState<number | null>(null);
  const dragCounterRef = useRef<Record<number, number>>({ 1: 0, 2: 0 });

  const handlePeriodDragEnter = (e: React.DragEvent, period: number) => {
    e.preventDefault();
    dragCounterRef.current[period] = (dragCounterRef.current[period] || 0) + 1;
    setDropTargetPeriod(period);
  };

  const handlePeriodDragLeaveEvt = (e: React.DragEvent, period: number) => {
    dragCounterRef.current[period] = (dragCounterRef.current[period] || 0) - 1;
    if (dragCounterRef.current[period] <= 0) {
      dragCounterRef.current[period] = 0;
      setDropTargetPeriod((prev) => (prev === period ? null : prev));
    }
  };

  const handlePeriodDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handlePeriodDrop = (e: React.DragEvent, targetPeriod: number) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = { 1: 0, 2: 0 };
    setDropTargetPeriod(null);
    const draggedId = e.dataTransfer.getData("text/plain");
    const draggedItem = items.find(i => i.id === draggedId);
    if (draggedItem && draggedItem.pay_period !== targetPeriod) {
      handleCrossDrop(draggedItem, targetPeriod);
    }
  };

  const handleGlobalDragEnd = () => {
    dragCounterRef.current = { 1: 0, 2: 0 };
    setDropTargetPeriod(null);
  };

  const renderRow = (
    item: BudgetItem,
    idx: number,
    dIdx: number | null,
    oIdx: number | null,
    onDragStartFn: (index: number, e: React.DragEvent) => void,
    onDragOverFn: (index: number, e: React.DragEvent) => void,
    onDragEndFn: () => void,
    onDragLeaveFn: () => void,
  ) => (
    <div
      key={item.id}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", item.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStartFn(idx, e);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragOverFn(idx, e);
      }}
      onDragEnd={() => {
        onDragEndFn();
        handleGlobalDragEnd();
      }}
      onDragLeave={onDragLeaveFn}
      className={`relative flex flex-wrap items-center gap-1.5 sm:gap-2 transition-all ${!item.included ? "opacity-40" : ""} ${item.paid ? "bg-muted/50 rounded-md px-1 py-0.5" : ""} ${dIdx === idx ? "opacity-30 scale-95" : ""}`}>
      {/* Drop indicator line */}
      {oIdx === idx && (
        <div className="absolute -top-[2px] left-0 right-0 h-[3px] rounded-full bg-accent z-10" />
      )}
      <span className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground text-xs select-none">⠿</span>
      <Checkbox
        checked={item.included}
        onCheckedChange={(checked) => onUpdate({ ...item, included: !!checked })} />
      <Checkbox
        checked={item.paid}
        onCheckedChange={(checked) => onUpdate({ ...item, paid: !!checked })}
        className="border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground" />
      <Popover>
        <PopoverTrigger asChild>
          <button className={`w-10 shrink-0 rounded-md border border-border bg-background px-1 py-1.5 text-[10px] text-center focus:outline-none focus:ring-1 focus:ring-ring ${item.item_date ? "text-foreground" : "text-muted-foreground/40"} ${item.paid ? "text-muted-foreground bg-muted/30" : ""}`}>
            {item.item_date ? formatDateShort(item.item_date) : "M-D"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={item.item_date ? new Date(item.item_date + "T00:00:00") : undefined}
            onSelect={(date) => onUpdate({ ...item, item_date: date ? format(date, "yyyy-MM-dd") : null })}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
      <input
        type="text"
        placeholder="Description"
        defaultValue={item.description}
        onChange={(e) => debouncedUpdate({ ...item, description: e.target.value })}
        className={`flex-1 min-w-[80px] rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring ${item.paid ? "text-muted-foreground bg-muted/30" : ""}`} />
      {title === "Expenses" &&
        <select
          defaultValue={item.category_id ?? ""}
          onChange={(e) => onUpdate({ ...item, category_id: e.target.value || null })}
          className={`w-16 sm:w-20 shrink-0 rounded-md border border-border bg-background px-1 py-1.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring ${item.paid ? "text-muted-foreground bg-muted/30" : ""}`}>
          <option value="">—</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      }
      <div className="relative w-20 sm:w-24 shrink-0">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/50">₱</span>
        <input
          type="number"
          placeholder="0.00"
          defaultValue={item.amount || ""}
          onChange={(e) => debouncedUpdate({ ...item, amount: parseFloat(e.target.value) || 0 })}
          className={`w-full rounded-md border border-border bg-background py-1.5 pl-5 pr-1 text-right text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${item.paid ? "text-muted-foreground bg-muted/30" : ""}`}
          step="0.01" />
      </div>
      <button
        onClick={() => onDelete(item.id)}
        className="shrink-0 text-muted-foreground/40 hover:text-negative text-xs">
        ✕
      </button>
    </div>
  );

  const renderAddButton = (payPeriod?: number) => (
    <button
      onClick={() => onAdd(payPeriod)}
      className="mt-2 w-full rounded-md border border-dashed border-border py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors">
      + Add Row
    </button>
  );

  return (
    <div className="rounded-lg border border-border p-4 bg-primary-foreground flex flex-col">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <span className="text-sm font-semibold text-foreground">{formatPHP(total)}</span>
      </div>

      {!splitEnabled && (
        <>
          <div className="space-y-1.5">
            {items.map((item, idx) =>
              renderRow(item, idx, dragIndex, overIndex, handleDragStart, handleDragOver, handleDragEnd, handleDragLeave)
            )}
          </div>
          {renderAddButton()}
        </>
      )}

      {splitEnabled && (
        <div className="flex flex-col flex-1">
          {/* Period 1 — entire section is a drop target */}
          <div
            className={`flex-1 flex flex-col rounded-md p-2 -m-2 transition-colors ${dropTargetPeriod === 1 ? "bg-accent/10 ring-2 ring-accent/30 ring-inset" : ""}`}
            onDragOver={handlePeriodDragOver}
            onDragEnter={(e) => handlePeriodDragEnter(e, 1)}
            onDragLeave={(e) => handlePeriodDragLeaveEvt(e, 1)}
            onDrop={(e) => handlePeriodDrop(e, 1)}
          >
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Period 1</p>
              <span className="text-[10px] font-medium text-muted-foreground">{formatPHP(period1Checked)} <span className="text-muted-foreground/50">/</span> {formatPHP(period1All)}</span>
            </div>
            <div className="space-y-1.5">
              {period1Items.map((item, idx) =>
                renderRow(item, idx, dragIndex, overIndex,
                  handleDragStart, handleDragOver, handleDragEnd, handleDragLeave)
              )}
            </div>
            <div className="mt-auto">
              {renderAddButton(1)}
            </div>
          </div>

          {/* Toggle as divider */}
          <div className="my-3 flex items-center gap-2 py-2 border-t border-b border-border/40">
            <Switch
              checked={splitEnabled}
              onCheckedChange={onToggleSplit}
              className="scale-75 origin-left"
            />
            <span className="text-[10px] text-muted-foreground">Split into Pay Periods</span>
          </div>

          {/* Period 2 — entire section is a drop target */}
          <div
            className={`flex-1 flex flex-col rounded-md p-2 -m-2 transition-colors ${dropTargetPeriod === 2 ? "bg-accent/10 ring-2 ring-accent/30 ring-inset" : ""}`}
            onDragOver={handlePeriodDragOver}
            onDragEnter={(e) => handlePeriodDragEnter(e, 2)}
            onDragLeave={(e) => handlePeriodDragLeaveEvt(e, 2)}
            onDrop={(e) => handlePeriodDrop(e, 2)}
          >
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Period 2</p>
              <span className="text-[10px] font-medium text-muted-foreground">{formatPHP(period2Checked)} <span className="text-muted-foreground/50">/</span> {formatPHP(period2All)}</span>
            </div>
            <div className="space-y-1.5">
              {period2Items.map((item, idx) =>
                renderRow(item, idx, dragIndex2, overIndex2,
                  handleDragStart2, handleDragOver2, handleDragEnd2, handleDragLeave2)
              )}
            </div>
            <div className="mt-auto">
              {renderAddButton(2)}
            </div>
          </div>
        </div>
      )}

      {/* Toggle when not split */}
      {!splitEnabled && (
        <div className="mt-3 flex items-center gap-2 pt-2 border-t border-border/30">
          <Switch
            checked={splitEnabled}
            onCheckedChange={onToggleSplit}
            className="scale-75 origin-left"
          />
          <span className="text-[10px] text-muted-foreground">Split into Pay Periods</span>
        </div>
      )}
    </div>
  );
};

// ─── Settings Panel ──────────────────────────────────────────
interface SettingsPanelProps {
  categories: Category[];
  categoryLimits: {category_id: string;limit_amount: number;}[];
  budgetId: string;
  savingsGoal: number;
  onUpsertCategory: (c: {id?: string;name: string;color: string;}) => void;
  onDeleteCategory: (id: string) => void;
  onSetGoal: (amt: number) => void;
  onSetLimit: (catId: string, amt: number) => void;
}

const SettingsPanel = ({
  categories, categoryLimits, savingsGoal,
  onUpsertCategory, onDeleteCategory, onSetGoal, onSetLimit
}: SettingsPanelProps) => {
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#8B7355");
  const [goalInput, setGoalInput] = useState(String(savingsGoal || ""));
  const limitMap = useMemo(() => {
    const m: Record<string, number> = {};
    categoryLimits.forEach((l) => m[l.category_id] = l.limit_amount);
    return m;
  }, [categoryLimits]);

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">Settings</h3>

      {/* Savings Goal */}
      <div>
        <label className="text-xs text-muted-foreground">Savings Goal (₱)</label>
        <div className="flex gap-2 mt-1">
          <input
            type="number"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="0.00" />

          <button onClick={() => onSetGoal(parseFloat(goalInput) || 0)} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            Set
          </button>
        </div>
      </div>

      {/* Categories */}
      <div>
        <label className="text-xs text-muted-foreground">Categories</label>
        <div className="space-y-1 mt-1">
          {categories.map((c) =>
          <div key={c.id} className="flex items-center gap-2 text-xs">
              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
              <span className="flex-1 text-foreground">{c.name}</span>
              <input
              type="number"
              placeholder="Limit"
              defaultValue={limitMap[c.id] || ""}
              onChange={(e) => onSetLimit(c.id, parseFloat(e.target.value) || 0)}
              className="w-20 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground text-right focus:outline-none focus:ring-1 focus:ring-ring" />

              <button onClick={() => onDeleteCategory(c.id)} className="text-muted-foreground/40 hover:text-negative">✕</button>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-2">
          <input
            type="color"
            value={newCatColor}
            onChange={(e) => setNewCatColor(e.target.value)}
            className="h-7 w-7 rounded border border-border cursor-pointer" />

          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="New category"
            className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />

          <button
            onClick={() => {if (newCatName.trim()) {onUpsertCategory({ name: newCatName.trim(), color: newCatColor });setNewCatName("");}}}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">

            Add
          </button>
        </div>
      </div>
    </div>);

};

// ─── Recurring Panel ─────────────────────────────────────────
interface RecurringPanelProps {
  items: RecurringItem[];
  categories: Category[];
  onUpsert: (item: Omit<RecurringItem, "id"> & {id?: string;}) => void;
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
      is_active: true
    });
    setDesc("");
    setAmount("");
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Recurring Items</h3>
        <button onClick={onApply} className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-accent-foreground hover:bg-accent/90">
          Apply to Budget
        </button>
      </div>
      <div className="space-y-1.5">
        {items.map((item) =>
        <div key={item.id} className="flex items-center gap-2 text-xs">
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${item.type === "income" ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"}`}>
              {item.type === "income" ? "INC" : "EXP"}
            </span>
            <span className="flex-1 text-foreground">{item.description}</span>
            <span className="text-muted-foreground">{formatPHP(item.amount)}</span>
            <button onClick={() => onDelete(item.id)} className="text-muted-foreground/40 hover:text-negative">✕</button>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <select value={type} onChange={(e) => setType(e.target.value as "income" | "expense")} className="rounded-md border border-border bg-background px-1.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" className="flex-1 min-w-0 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        {type === "expense" &&
        <select value={catId} onChange={(e) => setCatId(e.target.value)} className="w-20 rounded-md border border-border bg-background px-1 py-1.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="">—</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        }
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="₱" className="w-20 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-right text-foreground focus:outline-none focus:ring-1 focus:ring-ring" step="0.01" />
        <button onClick={handleAdd} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">Add</button>
      </div>
    </div>);

};

// ─── Debt Board ──────────────────────────────────────────────
interface DebtBoardProps {
  items: DebtItem[];
  totalDebt: number;
  queryKey: unknown[];
  onUpsert: (item: Omit<DebtItem, "id"> & {id?: string;}) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

const DebtBoard = ({ items, totalDebt, queryKey, onUpsert, onDelete, onAdd }: DebtBoardProps) => {
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const debouncedUpdate = useCallback((item: DebtItem) => {
    if (debounceRef.current[item.id]) clearTimeout(debounceRef.current[item.id]);
    debounceRef.current[item.id] = setTimeout(() => onUpsert(item), 500);
  }, [onUpsert]);

  const { dragIndex, overIndex, handleDragStart, handleDragOver, handleDragEnd, handleDragLeave } = useDragReorder({
    items,
    onReorder: (reordered) => reordered.forEach((item) => onUpsert(item)),
    queryKey
  });

  return (
    <div className="rounded-lg border border-border p-4 bg-primary-foreground">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Debt</h3>
        <span className="text-sm font-semibold text-negative">{formatPHP(totalDebt)}</span>
      </div>
      <div className="space-y-1.5">
        {items.map((item, idx) =>
        <div
          key={item.id}
          draggable
          onDragStart={(e) => handleDragStart(idx, e)}
          onDragOver={(e) => handleDragOver(idx, e)}
          onDragEnd={handleDragEnd}
          onDragLeave={handleDragLeave}
          className={`flex flex-wrap items-center gap-1.5 sm:gap-2 transition-opacity ${dragIndex === idx ? "opacity-50" : ""} ${overIndex === idx ? "border-t-2 border-accent" : ""}`}>
            <span className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground text-xs select-none">⠿</span>
            <input
            type="text"
            placeholder="Who you owe"
            defaultValue={item.description}
            onChange={(e) => debouncedUpdate({ ...item, description: e.target.value })}
            className="flex-1 min-w-[80px] rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring" />

            <div className="relative w-20 sm:w-24 shrink-0">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/50">₱</span>
              <input
              type="number"
              placeholder="0.00"
              defaultValue={item.amount || ""}
              onChange={(e) => debouncedUpdate({ ...item, amount: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-md border border-border bg-background py-1.5 pl-5 pr-1 text-right text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              step="0.01" />

            </div>
            <Popover>
              <PopoverTrigger asChild>
                <button className={cn(
                "shrink-0 rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring",
                item.due_date ? "text-foreground" : "text-muted-foreground/50"
              )}>
                  {item.due_date ? format(new Date(item.due_date), "MMM d") : "Due"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                mode="single"
                selected={item.due_date ? new Date(item.due_date) : undefined}
                onSelect={(date) => onUpsert({ ...item, due_date: date ? format(date, "yyyy-MM-dd") : null })}
                className={cn("p-3 pointer-events-auto")} />

              </PopoverContent>
            </Popover>
            <button
            onClick={() => onDelete(item.id)}
            className="shrink-0 text-muted-foreground/40 hover:text-negative text-xs">

              ✕
            </button>
          </div>
        )}
      </div>
      <button
        onClick={onAdd}
        className="mt-2 w-full rounded-md border border-dashed border-border py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors">

        + Add Debt
      </button>
    </div>);

};

// ─── Savings Board ───────────────────────────────────────────
interface SavingsBoardProps {
  items: SavingsItem[];
  totalSaved: number;
  totalTarget: number;
  queryKey: unknown[];
  onUpsert: (item: Omit<SavingsItem, "id"> & {id?: string;}) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

const SavingsBoard = ({ items, totalSaved, totalTarget, queryKey, onUpsert, onDelete, onAdd }: SavingsBoardProps) => {
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const debouncedUpdate = useCallback((item: SavingsItem) => {
    if (debounceRef.current[item.id]) clearTimeout(debounceRef.current[item.id]);
    debounceRef.current[item.id] = setTimeout(() => onUpsert(item), 500);
  }, [onUpsert]);

  const { dragIndex, overIndex, handleDragStart, handleDragOver, handleDragEnd, handleDragLeave } = useDragReorder({
    items,
    onReorder: (reordered) => reordered.forEach((item) => onUpsert(item)),
    queryKey
  });

  return (
    <div className="rounded-lg border border-border p-4 bg-primary-foreground">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Savings</h3>
        <span className="text-sm font-semibold text-positive">
          {formatPHP(totalSaved)}{totalTarget > 0 ? ` / ${formatPHP(totalTarget)}` : ""}
        </span>
      </div>
      <div className="space-y-2.5">
        {items.map((item, idx) => {
          const pct = item.target_amount > 0 ? Math.min(item.saved_amount / item.target_amount * 100, 100) : 0;
          return (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(idx, e)}
              onDragOver={(e) => handleDragOver(idx, e)}
              onDragEnd={handleDragEnd}
              onDragLeave={handleDragLeave}
              className={`space-y-1 transition-opacity ${dragIndex === idx ? "opacity-50" : ""} ${overIndex === idx ? "border-t-2 border-accent" : ""}`}>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground text-xs select-none">⠿</span>
                <input
                  type="text"
                  placeholder="Saving for..."
                  defaultValue={item.description}
                  onChange={(e) => debouncedUpdate({ ...item, description: e.target.value })}
                  className="flex-1 min-w-[80px] rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring" />

                <div className="relative w-20 shrink-0">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/50">₱</span>
                  <input
                    type="number"
                    placeholder="Saved"
                    defaultValue={item.saved_amount || ""}
                    onChange={(e) => debouncedUpdate({ ...item, saved_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-md border border-border bg-background py-1.5 pl-5 pr-1 text-right text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    step="0.01" />

                </div>
                <span className="text-[10px] text-muted-foreground/50">/</span>
                <div className="relative w-20 shrink-0">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/50">₱</span>
                  <input
                    type="number"
                    placeholder="Target"
                    defaultValue={item.target_amount || ""}
                    onChange={(e) => debouncedUpdate({ ...item, target_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-md border border-border bg-background py-1.5 pl-5 pr-1 text-right text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    step="0.01" />

                </div>
                <button
                  onClick={() => onDelete(item.id)}
                  className="shrink-0 text-muted-foreground/40 hover:text-negative text-xs">

                  ✕
                </button>
              </div>
              {item.target_amount > 0 &&
              <div className="flex items-center gap-2 pl-5">
                  <Progress value={pct} className="h-1.5 flex-1" />
                  <span className="text-[10px] text-muted-foreground">{pct.toFixed(0)}%</span>
                </div>
              }
            </div>);

        })}
      </div>
      <button
        onClick={onAdd}
        className="mt-2 w-full rounded-md border border-dashed border-border py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors">

        + Add Savings Goal
      </button>
    </div>);

};

export default Index;