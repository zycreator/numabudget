import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface BudgetItem {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category_id: string | null;
  month: number;
  year: number;
  included: boolean;
  sort_order: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface SavingsGoal {
  id: string;
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
  month: number;
  year: number;
  limit_amount: number;
}

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

export const useBudgetItems = (month: number, year: number) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["budget_items", user?.id, month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_items")
        .select("*")
        .eq("month", month)
        .eq("year", year)
        .order("sort_order");
      if (error) throw error;
      return data as BudgetItem[];
    },
    enabled: !!user,
  });
};

export const useSavingsGoal = (month: number, year: number) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["savings_goal", user?.id, month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("month", month)
        .eq("year", year)
        .maybeSingle();
      if (error) throw error;
      return data as SavingsGoal | null;
    },
    enabled: !!user,
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

export const useCategoryLimits = (month: number, year: number) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["category_limits", user?.id, month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_limits")
        .select("*")
        .eq("month", month)
        .eq("year", year);
      if (error) throw error;
      return data as CategoryLimit[];
    },
    enabled: !!user,
  });
};

// Mutations
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
    mutationFn: async (goal: { month: number; year: number; target_amount: number }) => {
      const { error } = await supabase.from("savings_goals").upsert(
        { ...goal, user_id: user!.id },
        { onConflict: "user_id,month,year" }
      );
      if (error) throw error;
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
    mutationFn: async (limit: { category_id: string; month: number; year: number; limit_amount: number }) => {
      const { error } = await supabase.from("category_limits").upsert(
        { ...limit, user_id: user!.id },
        { onConflict: "user_id,category_id,month,year" }
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["category_limits"] }),
  });
};

export const useClearMonth = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ month, year }: { month: number; year: number }) => {
      const { error } = await supabase.from("budget_items").delete().eq("month", month).eq("year", year);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budget_items"] }),
  });
};

export const useApplyRecurring = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ month, year, items }: { month: number; year: number; items: RecurringItem[] }) => {
      const rows = items.map((item, i) => ({
        user_id: user!.id,
        description: item.description,
        amount: item.amount,
        type: item.type,
        category_id: item.category_id,
        month,
        year,
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
