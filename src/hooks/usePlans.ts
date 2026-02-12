import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Plan {
  id: string;
  user_id: string;
  name: string;
  include_rollover_from: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanItem {
  id: string;
  plan_id: string;
  user_id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category_id: string | null;
  included: boolean;
  sort_order: number;
  paid: boolean;
}

export const usePlans = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["plans", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Plan[];
    },
    enabled: !!user,
  });
};

export const useCreatePlan = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (plan: { name: string; include_rollover_from?: string | null }) => {
      const { data, error } = await supabase.from("plans").insert({
        user_id: user!.id,
        name: plan.name,
        include_rollover_from: plan.include_rollover_from ?? null,
      }).select().single();
      if (error) throw error;
      return data as Plan;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans"] }),
  });
};

export const useDeletePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      qc.invalidateQueries({ queryKey: ["plan_items"] });
    },
  });
};

export const usePlanItems = (planId: string | null) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["plan_items", user?.id, planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_items")
        .select("*")
        .eq("plan_id", planId!)
        .order("sort_order");
      if (error) throw error;
      return data as PlanItem[];
    },
    enabled: !!user && !!planId,
  });
};

export const useUpsertPlanItem = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (item: Omit<PlanItem, "id"> & { id?: string }) => {
      if (item.id) {
        const { error } = await supabase.from("plan_items").update({
          description: item.description,
          amount: item.amount,
          category_id: item.category_id,
          included: item.included,
          sort_order: item.sort_order,
          paid: item.paid,
        }).eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("plan_items").insert({
          ...item,
          user_id: user!.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan_items"] }),
  });
};

export const useDeletePlanItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plan_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan_items"] }),
  });
};

export const useConvertPlanToBudget = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ plan, planItems }: { plan: Plan; planItems: PlanItem[] }) => {
      // Create a new budget from the plan
      const { data: budget, error: budgetError } = await supabase.from("budgets").insert({
        user_id: user!.id,
        name: plan.name,
      }).select().single();
      if (budgetError) throw budgetError;

      // Copy plan items as budget items
      if (planItems.length > 0) {
        const rows = planItems.map((item, i) => ({
          user_id: user!.id,
          budget_id: (budget as any).id,
          description: item.description,
          amount: item.amount,
          type: item.type,
          category_id: item.category_id,
          month: 0,
          year: 0,
          included: item.included,
          sort_order: i,
        }));
        const { error: itemsError } = await supabase.from("budget_items").insert(rows);
        if (itemsError) throw itemsError;
      }

      return budget;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["budget_items"] });
    },
  });
};
