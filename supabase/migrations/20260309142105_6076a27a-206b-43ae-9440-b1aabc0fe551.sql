
ALTER TABLE public.profiles
  ADD COLUMN has_lifetime_access boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  DROP COLUMN subscription_status,
  DROP COLUMN stripe_customer_id;
