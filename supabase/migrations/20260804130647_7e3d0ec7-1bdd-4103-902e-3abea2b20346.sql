CREATE TABLE public.mcp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tool_name text NOT NULL,
  server_url text NOT NULL,
  sync_salary boolean NOT NULL DEFAULT false,
  sync_income boolean NOT NULL DEFAULT false,
  sync_expenses boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'connected',
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcp_connections TO authenticated;
GRANT ALL ON public.mcp_connections TO service_role;
ALTER TABLE public.mcp_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY mcp_connections_own ON public.mcp_connections FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER mcp_connections_set_updated_at BEFORE UPDATE ON public.mcp_connections
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.mcp_data_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  expose_expenses boolean NOT NULL DEFAULT true,
  expose_income boolean NOT NULL DEFAULT true,
  expose_deals boolean NOT NULL DEFAULT false,
  expose_analysis boolean NOT NULL DEFAULT true,
  token_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcp_data_access TO authenticated;
GRANT ALL ON public.mcp_data_access TO service_role;
ALTER TABLE public.mcp_data_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY mcp_data_access_own ON public.mcp_data_access FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX mcp_data_access_token_idx ON public.mcp_data_access (token_hash);
CREATE TRIGGER mcp_data_access_set_updated_at BEFORE UPDATE ON public.mcp_data_access
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();