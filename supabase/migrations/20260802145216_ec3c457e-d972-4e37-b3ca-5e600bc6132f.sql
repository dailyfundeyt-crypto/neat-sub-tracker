CREATE TABLE public.service_logos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_key text NOT NULL UNIQUE,
  logo_url text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.service_logos TO authenticated;
GRANT ALL ON public.service_logos TO service_role;
ALTER TABLE public.service_logos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logos_read" ON public.service_logos FOR SELECT TO authenticated USING (true);
CREATE POLICY "logos_insert" ON public.service_logos FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  logo_url text,
  category text NOT NULL DEFAULT 'Sonstiges',
  price numeric(10,2) NOT NULL DEFAULT 0,
  billing_interval text NOT NULL DEFAULT 'monthly',
  next_payment date,
  cancel_by date,
  credit numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subs_own" ON public.subscriptions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  service_name text NOT NULL,
  logo_url text,
  title text NOT NULL,
  code text,
  url text,
  valid_until date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals TO authenticated;
GRANT ALL ON public.deals TO service_role;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deals_read" ON public.deals FOR SELECT TO authenticated USING (true);
CREATE POLICY "deals_insert" ON public.deals FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "deals_update_own" ON public.deals FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "deals_delete_own" ON public.deals FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();