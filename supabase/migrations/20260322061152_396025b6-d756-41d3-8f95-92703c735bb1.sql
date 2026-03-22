
-- Table to store external loyalty program connections per user per brand
CREATE TABLE public.external_loyalty_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  provider_name text NOT NULL,
  api_endpoint text,
  access_token text,
  refresh_token text,
  external_member_id text,
  external_points_balance integer,
  status text NOT NULL DEFAULT 'connected',
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, brand_id)
);

ALTER TABLE public.external_loyalty_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loyalty connections"
  ON public.external_loyalty_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loyalty connections"
  ON public.external_loyalty_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loyalty connections"
  ON public.external_loyalty_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own loyalty connections"
  ON public.external_loyalty_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add loyalty program config columns to brands
ALTER TABLE public.brands
  ADD COLUMN loyalty_api_url text,
  ADD COLUMN loyalty_provider text;
