import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Budget {
  id: string;
  user_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  rollover_enabled: boolean;
  is_active: boolean;
  created_at: string;
}

export const useBudgets = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["budgets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Budget[];
    },
    enabled: !!user,
  });
};

export const useCreateBudget = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (budget: { name: string; start_date?: string | null; end_date?: string | null; rollover_enabled?: boolean }) => {
      const { data, error } = await supabase.from("budgets").insert({
        user_id: user!.id,
        name: budget.name,
        start_date: budget.start_date ?? null,
        end_date: budget.end_date ?? null,
        rollover_enabled: budget.rollover_enabled ?? false,
      }).select().single();
      if (error) throw error;
      return data as Budget;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets"] }),
  });
};

export const useUpdateBudget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Budget> & { id: string }) => {
      const { error } = await supabase.from("budgets").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets"] }),
  });
};

export const useDuplicateBudget = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (budgetId: string) => {
      // 1. Fetch the source budget
      const { data: source, error: bErr } = await supabase
        .from("budgets")
        .select("*")
        .eq("id", budgetId)
        .single();
      if (bErr) throw bErr;

      // 2. Create the new budget
      const { data: newBudget, error: nErr } = await supabase
        .from("budgets")
        .insert({
          user_id: user!.id,
          name: `${source.name} (copy)`,
          start_date: source.start_date,
          end_date: source.end_date,
          rollover_enabled: source.rollover_enabled,
        })
        .select()
        .single();
      if (nErr) throw nErr;

      // 3. Copy budget_items
      const { data: items } = await supabase
        .from("budget_items")
        .select("*")
        .eq("budget_id", budgetId);
      if (items && items.length > 0) {
        const newItems = items.map(({ id, created_at, ...rest }) => ({
          ...rest,
          user_id: user!.id,
          budget_id: newBudget.id,
          paid: false,
        }));
        await supabase.from("budget_items").insert(newItems);
      }

      // 4. Copy debt_items
      const { data: debts } = await supabase
        .from("debt_items")
        .select("*")
        .eq("budget_id", budgetId);
      if (debts && debts.length > 0) {
        const newDebts = debts.map(({ id, created_at, ...rest }) => ({
          ...rest,
          user_id: user!.id,
          budget_id: newBudget.id,
        }));
        await supabase.from("debt_items").insert(newDebts);
      }

      // 5. Copy savings_items
      const { data: savings } = await supabase
        .from("savings_items")
        .select("*")
        .eq("budget_id", budgetId);
      if (savings && savings.length > 0) {
        const newSavings = savings.map(({ id, created_at, ...rest }) => ({
          ...rest,
          user_id: user!.id,
          budget_id: newBudget.id,
        }));
        await supabase.from("savings_items").insert(newSavings);
      }

      // 6. Copy savings_goals
      const { data: goals } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("budget_id", budgetId);
      if (goals && goals.length > 0) {
        const newGoals = goals.map(({ id, created_at, ...rest }) => ({
          ...rest,
          user_id: user!.id,
          budget_id: newBudget.id,
        }));
        await supabase.from("savings_goals").insert(newGoals);
      }

      // 7. Copy category_limits
      const { data: limits } = await supabase
        .from("category_limits")
        .select("*")
        .eq("budget_id", budgetId);
      if (limits && limits.length > 0) {
        const newLimits = limits.map(({ id, created_at, ...rest }) => ({
          ...rest,
          user_id: user!.id,
          budget_id: newBudget.id,
        }));
        await supabase.from("category_limits").insert(newLimits);
      }

      return newBudget as Budget;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["budget_items"] });
    },
  });
};

export const useDeleteBudget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["budget_items"] });
    },
  });
};
