alter table public.subscriptions
  add column if not exists discount_title text,
  add column if not exists discount_description text,
  add column if not exists discount_code text,
  add column if not exists discount_url text,
  add column if not exists discount_valid_until date;