alter table public.subscriptions
  add column if not exists discount_title text,
  add column if not exists discount_description text,
  add column if not exists discount_code text,
  add column if not exists discount_url text,
  add column if not exists discount_valid_until date;

create index if not exists subscriptions_discount_valid_until_idx
  on public.subscriptions (discount_valid_until)
  where discount_valid_until is not null;
