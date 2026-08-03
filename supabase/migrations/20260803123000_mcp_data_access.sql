CREATE TABLE public.mcp_data_access (
  user_id uuid PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  token_hash text,
  expose_expenses boolean NOT NULL DEFAULT true,
  expose_income boolean NOT NULL DEFAULT true,
  expose_deals boolean NOT NULL DEFAULT true,
  expose_analysis boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX mcp_data_access_token_hash_idx ON public.mcp_data_access(token_hash)
  WHERE token_hash IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcp_data_access TO authenticated;
GRANT ALL ON public.mcp_data_access TO service_role;

ALTER TABLE public.mcp_data_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY mcp_data_access_own ON public.mcp_data_access FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER mcp_data_access_set_updated_at BEFORE UPDATE ON public.mcp_data_access
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
