ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS group_name text NOT NULL DEFAULT 'Selbständig';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS group_name text NOT NULL DEFAULT 'Allgemein';

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  currency text NOT NULL DEFAULT 'EUR',
  expense_groups text[] NOT NULL DEFAULT ARRAY['Allgemein','Privat','Business'],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_own ON public.profiles FOR ALL TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();