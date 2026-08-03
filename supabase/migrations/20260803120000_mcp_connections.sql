CREATE TABLE public.mcp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tool_name text NOT NULL,
  server_url text NOT NULL,
  sync_salary boolean NOT NULL DEFAULT true,
  sync_income boolean NOT NULL DEFAULT true,
  sync_expenses boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'ready',
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX mcp_connections_user_id_idx ON public.mcp_connections(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcp_connections TO authenticated;
GRANT ALL ON public.mcp_connections TO service_role;

ALTER TABLE public.mcp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY mcp_connections_own ON public.mcp_connections FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER mcp_connections_set_updated_at BEFORE UPDATE ON public.mcp_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
