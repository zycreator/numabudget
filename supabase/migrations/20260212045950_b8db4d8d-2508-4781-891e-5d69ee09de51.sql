
-- =====================================================
-- 1. New table: budgets (replaces month/year concept)
-- =====================================================
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  rollover_enabled BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own budgets"
  ON public.budgets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 2. New table: plans (scratch pad drafts)
-- =====================================================
CREATE TABLE public.plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  include_rollover_from UUID REFERENCES public.budgets(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own plans"
  ON public.plans FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 3. New table: plan_items
-- =====================================================
CREATE TABLE public.plan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  included BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own plan_items"
  ON public.plan_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 4. Add budget_id to budget_items
-- =====================================================
ALTER TABLE public.budget_items
  ADD COLUMN budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE;

-- =====================================================
-- 5. Add budget_id to savings_goals
-- =====================================================
ALTER TABLE public.savings_goals
  ADD COLUMN budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE;

-- =====================================================
-- 6. Add budget_id to category_limits
-- =====================================================
ALTER TABLE public.category_limits
  ADD COLUMN budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE;

-- =====================================================
-- 7. Data migration: create budgets from existing month/year combos
-- =====================================================
INSERT INTO public.budgets (user_id, name, start_date, end_date)
SELECT DISTINCT
  user_id,
  TO_CHAR(MAKE_DATE(year, month + 1, 1), 'FMMonth YYYY'),
  MAKE_DATE(year, month + 1, 1),
  (MAKE_DATE(year, month + 1, 1) + INTERVAL '1 month' - INTERVAL '1 day')::date
FROM public.budget_items;

-- Backfill budget_id on budget_items
UPDATE public.budget_items bi
SET budget_id = b.id
FROM public.budgets b
WHERE b.user_id = bi.user_id
  AND b.start_date = MAKE_DATE(bi.year, bi.month + 1, 1);

-- Backfill budget_id on savings_goals
UPDATE public.savings_goals sg
SET budget_id = b.id
FROM public.budgets b
WHERE b.user_id = sg.user_id
  AND b.start_date = MAKE_DATE(sg.year, sg.month + 1, 1);

-- Backfill budget_id on category_limits
UPDATE public.category_limits cl
SET budget_id = b.id
FROM public.budgets b
WHERE b.user_id = cl.user_id
  AND b.start_date = MAKE_DATE(cl.year, cl.month + 1, 1);

-- =====================================================
-- 8. Update timestamp trigger for plans
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
