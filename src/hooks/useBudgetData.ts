import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface BudgetItem {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category_id: string | null;
  budget_id: string | null;
  month: number;
  year: number;
  included: boolean;
  sort_order: number;
  paid: boolean;
  pay_period: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface SavingsGoal {
  id: string;
  budget_id: string | null;
  month: number;
  year: number;
  target_amount: number;
}

export interface RecurringItem {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category_id: string | null;
  is_active: boolean;
}

export interface CategoryLimit {
  id: string;
  category_id: string;
  budget_id: string | null;
  month: number;
  year: number;
  limit_amount: number;
}

// ─── Queries ─────────────────────────────────────────────────

export const useCategories = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["categories", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Category[];
    },
    enabled: !!user,
  });
};

export const useBudgetItems = (budgetId: string | null) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["budget_items", user?.id, budgetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_items")
        .select("*")
        .eq("budget_id", budgetId!)
        .order("sort_order");
      if (error) throw error;
      return (data as unknown as BudgetItem[]).map(item => ({ ...item, pay_period: item.pay_period ?? 1 }));
    },
    enabled: !!user && !!budgetId,
  });
};

export const useSavingsGoal = (budgetId: string | null) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["savings_goal", user?.id, budgetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("budget_id", budgetId!)
        .maybeSingle();
      if (error) throw error;
      return data as SavingsGoal | null;
    },
    enabled: !!user && !!budgetId,
  });
};

export const useRecurringItems = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["recurring_items", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_items")
        .select("*")
        .eq("is_active", true)
        .order("created_at");
      if (error) throw error;
      return data as RecurringItem[];
    },
    enabled: !!user,
  });
};

export const useCategoryLimits = (budgetId: string | null) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["category_limits", user?.id, budgetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_limits")
        .select("*")
        .eq("budget_id", budgetId!);
      if (error) throw error;
      return data as CategoryLimit[];
    },
    enabled: !!user && !!budgetId,
  });
};

// ─── Mutations ───────────────────────────────────────────────

export const useUpsertBudgetItem = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (item: Omit<BudgetItem, "id"> & { id?: string }) => {
      if (item.id) {
        const { error } = await supabase.from("budget_items").update({
          description: item.description,
          amount: item.amount,
          category_id: item.category_id,
          included: item.included,
          sort_order: item.sort_order,
          paid: item.paid,
          pay_period: item.pay_period,
        }).eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("budget_items").insert({
          ...item,
          user_id: user!.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budget_items"] }),
  });
};

export const useDeleteBudgetItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budget_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budget_items"] }),
  });
};

export const useUpsertCategory = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (cat: Omit<Category, "id"> & { id?: string }) => {
      if (cat.id) {
        const { error } = await supabase.from("categories").update({ name: cat.name, color: cat.color }).eq("id", cat.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert({ ...cat, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
};

export const useDeleteCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
};

export const useUpsertSavingsGoal = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (goal: { budget_id: string; target_amount: number }) => {
      // Check if goal exists for this budget
      const { data: existing } = await supabase
        .from("savings_goals")
        .select("id")
        .eq("budget_id", goal.budget_id)
        .eq("user_id", user!.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from("savings_goals").update({
          target_amount: goal.target_amount,
        }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("savings_goals").insert({
          user_id: user!.id,
          budget_id: goal.budget_id,
          target_amount: goal.target_amount,
          month: 0,
          year: 0,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["savings_goal"] }),
  });
};

export const useUpsertRecurringItem = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (item: Omit<RecurringItem, "id"> & { id?: string }) => {
      if (item.id) {
        const { error } = await supabase.from("recurring_items").update({
          description: item.description,
          amount: item.amount,
          type: item.type,
          category_id: item.category_id,
          is_active: item.is_active,
        }).eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("recurring_items").insert({ ...item, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring_items"] }),
  });
};

export const useDeleteRecurringItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recurring_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring_items"] }),
  });
};

export const useUpsertCategoryLimit = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (limit: { category_id: string; budget_id: string; limit_amount: number }) => {
      const { data: existing } = await supabase
        .from("category_limits")
        .select("id")
        .eq("budget_id", limit.budget_id)
        .eq("category_id", limit.category_id)
        .eq("user_id", user!.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from("category_limits").update({
          limit_amount: limit.limit_amount,
        }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("category_limits").insert({
          ...limit,
          user_id: user!.id,
          month: 0,
          year: 0,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["category_limits"] }),
  });
};

export const useClearBudgetItems = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (budgetId: string) => {
      const { error } = await supabase.from("budget_items").delete().eq("budget_id", budgetId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budget_items"] }),
  });
};

export const useApplyRecurring = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ budgetId, items }: { budgetId: string; items: RecurringItem[] }) => {
      const rows = items.map((item, i) => ({
        user_id: user!.id,
        budget_id: budgetId,
        description: item.description,
        amount: item.amount,
        type: item.type,
        category_id: item.category_id,
        month: 0,
        year: 0,
        included: true,
        sort_order: i,
      }));
      if (rows.length > 0) {
        const { error } = await supabase.from("budget_items").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budget_items"] }),
  });
};

// ─── Rollover ────────────────────────────────────────────────

export const useRolloverAmount = (budgetId: string | null) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["rollover_amount", user?.id, budgetId],
    queryFn: async () => {
      // Get the budget to find its created_at
      const { data: budget, error: bErr } = await supabase
        .from("budgets")
        .select("*")
        .eq("id", budgetId!)
        .single();
      if (bErr) throw bErr;

      // Find the previous budget (the one created right before this one) that has rollover enabled
      const { data: prevBudgets, error: pErr } = await supabase
        .from("budgets")
        .select("*")
        .eq("user_id", user!.id)
        .eq("rollover_enabled", true)
        .lt("created_at", budget.created_at)
        .order("created_at", { ascending: false })
        .limit(1);
      if (pErr) throw pErr;

      if (!prevBudgets || prevBudgets.length === 0) return null;

      const prevBudget = prevBudgets[0];

      // Calculate the previous budget's net
      const { data: prevItems, error: iErr } = await supabase
        .from("budget_items")
        .select("*")
        .eq("budget_id", prevBudget.id);
      if (iErr) throw iErr;

      const income = (prevItems || [])
        .filter((i: any) => i.type === "income" && i.included)
        .reduce((s: number, i: any) => s + Number(i.amount), 0);
      const expenses = (prevItems || [])
        .filter((i: any) => i.type === "expense" && i.included)
        .reduce((s: number, i: any) => s + Number(i.amount), 0);

      const remaining = income - expenses;
      if (remaining <= 0) return null;

      return {
        amount: remaining,
        fromBudgetName: prevBudget.name,
        fromBudgetId: prevBudget.id,
      };
    },
    enabled: !!user && !!budgetId,
  });
};
