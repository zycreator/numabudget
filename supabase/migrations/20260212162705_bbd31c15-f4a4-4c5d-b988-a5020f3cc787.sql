
ALTER TABLE public.budget_items ADD COLUMN paid boolean NOT NULL DEFAULT false;
ALTER TABLE public.plan_items ADD COLUMN paid boolean NOT NULL DEFAULT false;
