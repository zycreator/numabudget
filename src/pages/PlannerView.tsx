import { useState, useMemo, useCallback, useRef } from "react";
import { useDragReorder } from "@/hooks/useDragReorder";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { usePlanItems, useUpsertPlanItem, useDeletePlanItem, useConvertPlanToBudget, type Plan, type PlanItem } from "@/hooks/usePlans";
import { useCategories, type Category } from "@/hooks/useBudgetData";
import { toast } from "sonner";

const formatPHP = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface PlannerViewProps {
  plan: Plan;
}

const PlannerView = ({ plan }: PlannerViewProps) => {
  const { data: items = [], isLoading } = usePlanItems(plan.id);
  const { data: categories = [] } = useCategories();
  const upsertItem = useUpsertPlanItem();
  const deleteItem = useDeletePlanItem();
  const convertToBudget = useConvertPlanToBudget();

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

  const handleAddItem = (type: "income" | "expense") => {
    const list = type === "income" ? incomeItems : expenseItems;
    upsertItem.mutate({
      plan_id: plan.id,
      description: "",
      amount: 0,
      type,
      category_id: null,
      included: true,
      sort_order: list.length,
      paid: false,
      user_id: "",
    });
  };

  const handleConvert = () => {
    convertToBudget.mutate({ plan, planItems: items }, {
      onSuccess: () => toast.success(`Plan "${plan.name}" converted to a budget!`),
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><p className="text-sm text-muted-foreground">Loading...</p></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">📝 {plan.name}</h1>
          <p className="text-xs text-muted-foreground">Plan / Scratch Pad</p>
        </div>
        <Button onClick={handleConvert} variant="default" size="sm" disabled={convertToBudget.isPending}>
          Convert to Budget
        </Button>
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-muted-foreground mb-2">Plan Summary</h2>
        <p className={`text-3xl font-bold tracking-tight ${net >= 0 ? "text-positive" : "text-negative"}`}>
          {formatPHP(net)}
        </p>
        <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
          <span>Income: {formatPHP(totalIncome)}</span>
          <span>Expenses: {formatPHP(totalExpenses)}</span>
        </div>
      </div>

      {/* Income & Expenses */}
      <div className="grid gap-4 sm:grid-cols-2">
        <PlanEntryCard
          title="Income"
          total={totalIncome - rolloverAmount}
          items={incomeItems}
          categories={categories}
          queryKey={["plan_items", plan.id]}
          onUpdate={(item) => upsertItem.mutate(item)}
          onDelete={(id) => deleteItem.mutate(id)}
          onAdd={() => handleAddItem("income")}
        />
        <PlanEntryCard
          title="Expenses"
          total={totalExpenses}
          items={expenseItems}
          categories={categories}
          queryKey={["plan_items", plan.id]}
          onUpdate={(item) => upsertItem.mutate(item)}
          onDelete={(id) => deleteItem.mutate(id)}
          onAdd={() => handleAddItem("expense")}
        />
      </div>
    </div>
  );
};

interface PlanEntryCardProps {
  title: string;
  total: number;
  items: PlanItem[];
  categories: Category[];
  queryKey: unknown[];
  onUpdate: (item: PlanItem) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

const PlanEntryCard = ({ title, total, items, categories, queryKey, onUpdate, onDelete, onAdd }: PlanEntryCardProps) => {
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const debouncedUpdate = useCallback((item: PlanItem) => {
    if (debounceRef.current[item.id]) clearTimeout(debounceRef.current[item.id]);
    debounceRef.current[item.id] = setTimeout(() => onUpdate(item), 500);
  }, [onUpdate]);

  const { dragIndex, overIndex, handleDragStart, handleDragOver, handleDragEnd, handleDragLeave } = useDragReorder({
    items,
    onReorder: (reordered) => reordered.forEach((item) => onUpdate(item)),
    queryKey,
  });

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <span className="text-sm font-semibold text-foreground">{formatPHP(total)}</span>
      </div>
      <div className="space-y-1.5">
        {items.map((item, idx) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => handleDragStart(idx, e)}
            onDragOver={(e) => handleDragOver(idx, e)}
            onDragEnd={handleDragEnd}
            onDragLeave={handleDragLeave}
            className={`flex items-center gap-2 transition-all ${!item.included ? "opacity-40" : ""} ${item.paid ? "bg-muted/50 rounded-md px-1 py-0.5" : ""} ${dragIndex === idx ? "opacity-50" : ""} ${overIndex === idx ? "border-t-2 border-accent" : ""}`}>
            <span className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground text-xs select-none">⠿</span>
            <Checkbox
              checked={item.included}
              onCheckedChange={(checked) => onUpdate({ ...item, included: !!checked })}
            />
            <Checkbox
              checked={item.paid}
              onCheckedChange={(checked) => onUpdate({ ...item, paid: !!checked })}
              className="border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground"
            />
            <input
              type="text"
              placeholder="Description"
              defaultValue={item.description}
              onChange={(e) => debouncedUpdate({ ...item, description: e.target.value })}
              className={`flex-1 min-w-0 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring ${item.paid ? "text-muted-foreground bg-muted/30" : ""}`}
            />
            {title === "Expenses" && (
              <select
                defaultValue={item.category_id ?? ""}
                onChange={(e) => onUpdate({ ...item, category_id: e.target.value || null })}
                className={`w-20 shrink-0 rounded-md border border-border bg-background px-1 py-1.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring ${item.paid ? "text-muted-foreground bg-muted/30" : ""}`}
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
                className={`w-full rounded-md border border-border bg-background py-1.5 pl-5 pr-2 text-right text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${item.paid ? "text-muted-foreground bg-muted/30" : ""}`}
                step="0.01"
              />
            </div>
            <button onClick={() => onDelete(item.id)} className="shrink-0 text-muted-foreground/40 hover:text-negative text-xs">✕</button>
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

export default PlannerView;
