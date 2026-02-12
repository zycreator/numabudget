import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface DebtItem {
  id: string;
  budget_id: string;
  description: string;
  amount: number;
  due_date: string | null;
  sort_order: number;
}

export interface SavingsItem {
  id: string;
  budget_id: string;
  description: string;
  saved_amount: number;
  target_amount: number;
  sort_order: number;
}

// ─── Queries ─────────────────────────────────────────────────

export const useDebtItems = (budgetId: string | null) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["debt_items", user?.id, budgetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("debt_items")
        .select("*")
        .eq("budget_id", budgetId!)
        .order("sort_order");
      if (error) throw error;
      return data as DebtItem[];
    },
    enabled: !!user && !!budgetId,
  });
};

export const useSavingsItems = (budgetId: string | null) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["savings_items", user?.id, budgetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("savings_items")
        .select("*")
        .eq("budget_id", budgetId!)
        .order("sort_order");
      if (error) throw error;
      return data as SavingsItem[];
    },
    enabled: !!user && !!budgetId,
  });
};

// ─── Mutations ───────────────────────────────────────────────

export const useUpsertDebtItem = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (item: Omit<DebtItem, "id"> & { id?: string }) => {
      if (item.id) {
        const { error } = await supabase.from("debt_items").update({
          description: item.description,
          amount: item.amount,
          due_date: item.due_date,
          sort_order: item.sort_order,
        }).eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("debt_items").insert({
          ...item,
          user_id: user!.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["debt_items"] }),
  });
};

export const useDeleteDebtItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("debt_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["debt_items"] }),
  });
};

export const useUpsertSavingsItem = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (item: Omit<SavingsItem, "id"> & { id?: string }) => {
      if (item.id) {
        const { error } = await supabase.from("savings_items").update({
          description: item.description,
          saved_amount: item.saved_amount,
          target_amount: item.target_amount,
          sort_order: item.sort_order,
        }).eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("savings_items").insert({
          ...item,
          user_id: user!.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["savings_items"] }),
  });
};

export const useDeleteSavingsItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("savings_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["savings_items"] }),
  });
};
