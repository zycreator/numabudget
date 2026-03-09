import { useState, useMemo, useCallback, useRef, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";

const DatePopover = ({ value, onSelect, triggerClassName, formatFn, placeholder }: {
  value: string | null | undefined;
  onSelect: (date: Date | undefined) => void;
  triggerClassName: string;
  formatFn: (dateStr: string) => string;
  placeholder: string;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={triggerClassName}>
          {value ? formatFn(value) : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ? new Date(value + (value.length === 10 ? "T00:00:00" : "")) : undefined}
          onSelect={(date) => {
            onSelect(date);
            setOpen(false);
          }}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
};


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
  const exportRef = useRef<(() => void) | null>(null);
  const [prefLoaded, setPrefLoaded] = useState(false);

  const { data: budgets = [] } = useBudgets();
  const { data: plans = [] } = usePlans();
  const updateBudgetIndex = useUpdateBudget();

  // Load last opened budget from user_preferences
  useEffect(() => {
    if (!user || prefLoaded) return;
    const load = async () => {
      const { data } = await supabase
        .from("user_preferences")
        .select("last_budget_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.last_budget_id) {
        setActiveBudgetId(data.last_budget_id);
      }
      setPrefLoaded(true);
    };
    load();
  }, [user, prefLoaded]);

  // Save last opened budget to user_preferences
  const saveLastBudget = useCallback(async (budgetId: string) => {
    if (!user) return;
    await supabase
      .from("user_preferences")
      .upsert({ user_id: user.id, last_budget_id: budgetId, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  }, [user]);

  // Auto-select first budget if none selected (only after pref loaded)
  const effectiveBudgetId = activeBudgetId ?? (prefLoaded && budgets.length > 0 ? budgets[0].id : null);
  const activeBudget = budgets.find((b) => b.id === effectiveBudgetId) ?? null;
  const activePlan = plans.find((p) => p.id === activePlanId) ?? null;

  const handleSelectBudget = (id: string) => {
    setActiveBudgetId(id);
    setActivePlanId(null);
    saveLastBudget(id);
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
          onSelectPlan={handleSelectPlan}
          onToggleRecurring={activeBudget ? () => setShowRecurring(v => !v) : undefined}
          onExport={activeBudget ? () => exportRef.current?.() : undefined}
          onToggleSettings={activeBudget ? () => setShowSettings(v => !v) : undefined}
          onSignOut={() => signOut()}
        />

        <main className="flex-1 min-h-0 h-screen overflow-y-auto bg-secondary">
          <div className="mx-auto max-w-5xl px-2 sm:px-4 md:px-6 space-y-3 sm:space-y-4">

            {activePlanId && activePlan ? (
            <>
              <div className="sticky top-0 z-50 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 bg-background border-b border-border shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SidebarTrigger className="h-5 w-5" />
                    <h1 className="text-xs sm:text-sm font-semibold text-foreground">Plan</h1>
                  </div>
                  <button onClick={() => signOut()} className="rounded-md border border-border px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground">Sign Out</button>
                </div>
              </div>
              <PlannerView plan={activePlan} />
            </>
            ) : effectiveBudgetId && activeBudget ? (
            <BudgetView
              budget={activeBudget}
              showSettings={showSettings}
              showRecurring={showRecurring}
              exportRef={exportRef} />
            ) : (
            <div className="pt-4">
              <div className="flex items-center gap-2 mb-8">
                <SidebarTrigger className="h-5 w-5" />
                <h1 className="text-sm font-semibold text-foreground">Budget</h1>
              </div>
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-sm text-muted-foreground">No budgets yet. Create one from the sidebar!</p>
              </div>
            </div>
            )}
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
  exportRef: React.MutableRefObject<(() => void) | null>;
}

const BudgetView = ({ budget, showSettings, showRecurring, exportRef }: BudgetViewProps) => {
  const { user } = useAuth();
  const { data: items = [], isLoading } = useBudgetItems(budget.id);
  const { data: categories = [] } = useCategories();
  const { data: savingsGoal } = useSavingsGoal(budget.id);
  const { data: recurringItems = [] } = useRecurringItems();
  const { data: categoryLimits = [] } = useCategoryLimits(budget.id);
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
    () => incomeItems.reduce((s, r) => s + (r.included ? r.amount : 0), 0),
    [incomeItems]
  );
  const totalIncomeAll = useMemo(
    () => incomeItems.reduce((s, r) => s + r.amount, 0),
    [incomeItems]
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
    const maxSort = list.length > 0 ? Math.max(...list.map(i => i.sort_order)) : 0;
    upsertItem.mutate({
      budget_id: budget.id,
      type,
      description: "",
      amount: 0,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      included: true,
      paid: false,
      sort_order: maxSort + 1,
      pay_period: payPeriod,
      item_date: null,
      category_id: null,
    });
  };

  const handleDeleteItem = (id: string) => {
    deleteItem.mutate(id);
  };

  const resortPeriodByDate = (periodItems: BudgetItem[], updatedItem: BudgetItem) => {
    const sorted = [...periodItems.map(i => i.id === updatedItem.id ? updatedItem : i)]
      .sort((a, b) => {
        if (!a.item_date && !b.item_date) return a.sort_order - b.sort_order;
        if (!a.item_date) return 1;
        if (!b.item_date) return -1;
        return a.item_date.localeCompare(b.item_date);
      });
    sorted.forEach((item, idx) => {
      if (item.sort_order !== idx) {
        upsertItem.mutate({ ...item, sort_order: idx });
      }
    });
  };

  // Export CSV
  useEffect(() => {
    exportRef.current = () => {
      const rows = [["Type", "Description", "Amount", "Category", "Included", "Paid", "Date", "Period"]];
      items.forEach(item => {
        const cat = categories.find(c => c.id === item.category_id);
        rows.push([
          item.type,
          item.description,
          String(item.amount),
          cat?.name ?? "",
          item.included ? "Yes" : "No",
          item.paid ? "Yes" : "No",
          item.item_date ?? "",
          String(item.pay_period ?? 1),
        ]);
      });
      const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${budget.name || "budget"}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };
  }, [items, categories, budget.name, exportRef]);

  if (isLoading) return <p className="text-xs text-muted-foreground p-4">Loading…</p>;

  return (
    <div className="pt-4 space-y-4 px-2 sm:px-4 md:px-6">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 -mx-2 sm:-mx-4 md:-mx-6 px-2 sm:px-4 md:px-6 py-3 bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="h-5 w-5" />
          <h1 className="text-sm font-semibold text-foreground truncate">{budget.name}</h1>
          {budget.start_date && budget.end_date && (
            <span className="hidden sm:inline text-[10px] text-muted-foreground ml-auto">
              {format(new Date(budget.start_date), "MMM d")} – {format(new Date(budget.end_date), "MMM d, yyyy")}
            </span>
          )}
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-lg border border-border bg-card/60 backdrop-blur p-3">
          <p className="text-[10px] text-muted-foreground mb-1">Income</p>
          <p className="text-sm font-bold text-foreground">{formatPHP(totalIncome)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/60 backdrop-blur p-3">
          <p className="text-[10px] text-muted-foreground mb-1">Expenses</p>
          <p className="text-sm font-bold text-foreground">{formatPHP(totalExpenses)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/60 backdrop-blur p-3">
          <p className="text-[10px] text-muted-foreground mb-1">Remaining</p>
          <p className={`text-sm font-bold ${net >= 0 ? "text-positive" : "text-negative"}`}>{formatPHP(net)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/60 backdrop-blur p-3">
          <p className="text-[10px] text-muted-foreground mb-1">Savings Rate</p>
          <p className="text-sm font-bold text-foreground">{pctSaved.toFixed(1)}%</p>
        </div>
      </div>

      {/* Period balances when split */}
      {splitEnabled && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border bg-card/60 backdrop-blur p-3">
            <p className="text-[10px] text-muted-foreground mb-1">Period 1 Balance</p>
            <p className={`text-sm font-bold ${periodBalance1Checked >= 0 ? "text-positive" : "text-negative"}`}>
              {formatPHP(periodBalance1Checked)} <span className="text-muted-foreground/50 font-normal text-[10px]">/ {formatPHP(periodBalance1Budgeted)}</span>
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card/60 backdrop-blur p-3">
            <p className="text-[10px] text-muted-foreground mb-1">Period 2 Balance</p>
            <p className={`text-sm font-bold ${periodBalance2Checked >= 0 ? "text-positive" : "text-negative"}`}>
              {formatPHP(periodBalance2Checked)} <span className="text-muted-foreground/50 font-normal text-[10px]">/ {formatPHP(periodBalance2Budgeted)}</span>
            </p>
          </div>
        </div>
      )}

      {/* Savings goal progress */}
      {goalTarget > 0 && (
        <div className="rounded-lg border border-border bg-card/60 backdrop-blur p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-muted-foreground">Savings Goal Progress</p>
            <p className="text-[10px] text-muted-foreground">{formatPHP(net)} / {formatPHP(goalTarget)}</p>
          </div>
          <Progress value={goalPct} className="h-2" />
        </div>
      )}

      {/* Income & Expense cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EntryCard
          title="Income"
          total={totalIncome}
          items={incomeItems}
          categories={categories}
          queryKey={["budget_items", budget.id]}
          onUpdate={(item) => upsertItem.mutate(item)}
          onDelete={handleDeleteItem}
          onAdd={(pp) => handleAddItem("income", pp)}
          splitEnabled={splitEnabled}
          onToggleSplit={handleToggleSplit}
        />
        <EntryCard
          title="Expenses"
          total={totalExpenses}
          items={expenseItems}
          categories={categories}
          queryKey={["budget_items", budget.id]}
          onUpdate={(item) => upsertItem.mutate(item)}
          onDelete={handleDeleteItem}
          onAdd={(pp) => handleAddItem("expense", pp)}
          splitEnabled={splitEnabled}
          onToggleSplit={handleToggleSplit}
        />
      </div>

      {/* Expense breakdown charts */}
      {expenseItems.length > 0 && categories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExpensePieChart items={expenseItems} categories={categories} />
          <ExpenseLegend items={expenseItems} categories={categories} />
        </div>
      )}

      {/* Category limits */}
      {categories.length > 0 && (
        <CategoryLimitsCard
          items={expenseItems}
          categories={categories}
          limits={categoryLimits}
        />
      )}

      {/* Debt & Savings boards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DebtBoard
          items={debtItems}
          totalDebt={totalDebt}
          queryKey={["debt_items", budget.id]}
          onUpsert={(item) => upsertDebt.mutate(item)}
          onDelete={(id) => deleteDebt.mutate(id)}
          onAdd={() => upsertDebt.mutate({
            user_id: user!.id,
            budget_id: budget.id,
            description: "",
            amount: 0,
            sort_order: debtItems.length,
          })}
        />
        <SavingsBoard
          items={savingsItems}
          totalSaved={totalSaved}
          totalTarget={totalSavingsTarget}
          queryKey={["savings_items", budget.id]}
          onUpsert={(item) => upsertSaving.mutate(item)}
          onDelete={(id) => deleteSaving.mutate(id)}
          onAdd={() => upsertSaving.mutate({
            user_id: user!.id,
            budget_id: budget.id,
            description: "",
            saved_amount: 0,
            target_amount: 0,
            sort_order: savingsItems.length,
          })}
        />
      </div>

      {/* Settings panel */}
      {showSettings && (
        <SettingsPanel
          categories={categories}
          categoryLimits={categoryLimits.map(cl => ({ category_id: cl.category_id, limit_amount: cl.limit_amount }))}
          budgetId={budget.id}
          savingsGoal={goalTarget}
          onUpsertCategory={(c) => upsertCategory.mutate({ ...c, user_id: user!.id })}
          onDeleteCategory={(id) => deleteCategory.mutate(id)}
          onSetGoal={(amt) => upsertGoal.mutate({
            user_id: user!.id,
            budget_id: budget.id,
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            target_amount: amt,
          })}
          onSetLimit={(catId, amt) => upsertLimit.mutate({
            user_id: user!.id,
            budget_id: budget.id,
            category_id: catId,
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            limit_amount: amt,
          })}
        />
      )}

      {/* Recurring panel */}
      {showRecurring && (
        <RecurringPanel
          items={recurringItems}
          categories={categories}
          onUpsert={(item) => upsertRecurring.mutate({ ...item, user_id: user!.id })}
          onDelete={(id) => deleteRecurring.mutate(id)}
          onApply={() => applyRecurring.mutate({
            budgetId: budget.id,
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
          })}
        />
      )}
    </div>
  );
};

// ─── Entry Card ──────────────────────────────────────────────
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
      className={`relative flex flex-wrap items-center gap-1 sm:gap-1.5 md:gap-2 py-1 transition-all ${!item.included ? "opacity-40" : ""} ${item.paid ? "bg-muted/50 rounded-md px-1 py-0.5" : ""} ${dIdx === idx ? "opacity-30 scale-95" : ""}`}>
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
      <DatePopover
        value={item.item_date}
        onSelect={(date) => onUpdate({ ...item, item_date: date ? format(date, "yyyy-MM-dd") : null })}
        triggerClassName={`w-10 h-9 sm:h-auto shrink-0 rounded-md border border-border bg-background px-1 py-1.5 text-[10px] text-center focus:outline-none focus:ring-1 focus:ring-ring ${item.item_date ? "text-foreground" : "text-muted-foreground/40"} ${item.paid ? "text-muted-foreground bg-muted/30" : ""}`}
        formatFn={(d) => formatDateShort(d)}
        placeholder="📅"
      />
      <input
        type="text"
        placeholder="Description"
        defaultValue={item.description}
        onChange={(e) => debouncedUpdate({ ...item, description: e.target.value })}
        className={`flex-1 min-w-[60px] rounded-md border border-border bg-background px-2 py-2 sm:py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring ${item.paid ? "text-muted-foreground bg-muted/30" : ""}`} />
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
      className="mt-2 w-full rounded-md border border-dashed border-border py-3 sm:py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors active:bg-secondary">
      + Add Row
    </button>
  );

  return (
    <div className="rounded-xl border border-border p-4 bg-card/60 backdrop-blur-xl shadow-lg shadow-black/10 flex flex-col">
      <div className="mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
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
      <div className="flex flex-col sm:flex-row gap-2">
        <select value={type} onChange={(e) => setType(e.target.value as "income" | "expense")} className="rounded-md border border-border bg-background px-1.5 py-2 sm:py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <div className="flex gap-2 flex-1">
          <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" className="flex-1 min-w-0 rounded-md border border-border bg-background px-2.5 py-2 sm:py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          {type === "expense" &&
          <select value={catId} onChange={(e) => setCatId(e.target.value)} className="w-20 rounded-md border border-border bg-background px-1 py-2 sm:py-1.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="">—</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          }
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="₱" className="w-20 rounded-md border border-border bg-background px-2 py-2 sm:py-1.5 text-xs text-right text-foreground focus:outline-none focus:ring-1 focus:ring-ring" step="0.01" />
          <button onClick={handleAdd} className="rounded-md bg-primary px-3 py-2 sm:py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">Add</button>
        </div>
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
    <div className="rounded-xl border border-border p-4 bg-card/60 backdrop-blur-xl shadow-lg shadow-black/10">
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
          className={`flex flex-wrap items-center gap-1 sm:gap-1.5 md:gap-2 py-1 transition-opacity ${dragIndex === idx ? "opacity-50" : ""} ${overIndex === idx ? "border-t-2 border-accent" : ""}`}>
            <span className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground text-xs select-none">⠿</span>
            <input
            type="text"
            placeholder="Who you owe"
            defaultValue={item.description}
            onChange={(e) => debouncedUpdate({ ...item, description: e.target.value })}
            className="flex-1 min-w-[60px] rounded-md border border-border bg-background px-2 py-2 sm:py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring" />

            <div className="relative w-[72px] sm:w-24 shrink-0">
              <span className="absolute left-1.5 sm:left-2 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs text-muted-foreground/50">₱</span>
              <input
              type="number"
              placeholder="0.00"
              defaultValue={item.amount || ""}
              onChange={(e) => debouncedUpdate({ ...item, amount: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-md border border-border bg-background py-2 sm:py-1.5 pl-4 sm:pl-5 pr-1 text-right text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              step="0.01" />
            </div>
            <DatePopover
              value={item.due_date}
              onSelect={(date) => onUpsert({ ...item, due_date: date ? format(date, "yyyy-MM-dd") : null })}
              triggerClassName={cn(
                "shrink-0 rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring",
                item.due_date ? "text-foreground" : "text-muted-foreground/50"
              )}
              formatFn={(d) => format(new Date(d), "MMM d")}
              placeholder="Due"
            />
            <button
            onClick={() => onDelete(item.id)}
            className="shrink-0 p-1 text-muted-foreground/40 hover:text-negative text-xs">
              ✕
            </button>
          </div>
        )}
      </div>
      <button
        onClick={onAdd}
        className="mt-2 w-full rounded-md border border-dashed border-border py-3 sm:py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors active:bg-secondary">
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
    <div className="rounded-xl border border-border p-4 bg-card/60 backdrop-blur-xl shadow-lg shadow-black/10">
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
              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 md:gap-2 py-1">
                <span className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground text-xs select-none">⠿</span>
                <input
                  type="text"
                  placeholder="Saving for..."
                  defaultValue={item.description}
                  onChange={(e) => debouncedUpdate({ ...item, description: e.target.value })}
                  className="flex-1 min-w-[60px] rounded-md border border-border bg-background px-2 py-2 sm:py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring" />

                <div className="relative w-[68px] sm:w-20 shrink-0">
                  <span className="absolute left-1.5 sm:left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/50">₱</span>
                  <input
                    type="number"
                    placeholder="Saved"
                    defaultValue={item.saved_amount || ""}
                    onChange={(e) => debouncedUpdate({ ...item, saved_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-md border border-border bg-background py-2 sm:py-1.5 pl-4 sm:pl-5 pr-1 text-right text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    step="0.01" />
                </div>
                <span className="text-[10px] text-muted-foreground/50">/</span>
                <div className="relative w-[68px] sm:w-20 shrink-0">
                  <span className="absolute left-1.5 sm:left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/50">₱</span>
                  <input
                    type="number"
                    placeholder="Target"
                    defaultValue={item.target_amount || ""}
                    onChange={(e) => debouncedUpdate({ ...item, target_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-md border border-border bg-background py-2 sm:py-1.5 pl-4 sm:pl-5 pr-1 text-right text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    step="0.01" />
                </div>
                <button
                  onClick={() => onDelete(item.id)}
                  className="shrink-0 p-1 text-muted-foreground/40 hover:text-negative text-xs">
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
        className="mt-2 w-full rounded-md border border-dashed border-border py-3 sm:py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors active:bg-secondary">
        + Add Savings Goal
      </button>
    </div>);

};

export default Index;