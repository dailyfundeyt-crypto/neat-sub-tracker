ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS description text;

CREATE TABLE IF NOT EXISTS public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  category text not null default 'Sonstiges',
  amount numeric not null default 0,
  interval text not null default 'monthly',
  next_payout date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.incomes TO authenticated;
GRANT ALL ON public.incomes TO service_role;

ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS incomes_own ON public.incomes;
CREATE POLICY incomes_own ON public.incomes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS incomes_set_updated_at ON public.incomes;
CREATE TRIGGER incomes_set_updated_at BEFORE UPDATE ON public.incomes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();