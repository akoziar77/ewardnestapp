
-- Subscription tiers (dynamic, editable from admin UI)
CREATE TABLE public.subscription_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  price_label text NOT NULL DEFAULT '$0',
  interval text NOT NULL DEFAULT 'month',
  stripe_price_id text,
  stripe_product_id text,
  sort_order integer NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Subscription features (the feature rows shown in the comparison table)
CREATE TABLE public.subscription_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Junction: which features are enabled for which tier
CREATE TABLE public.tier_feature_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id uuid NOT NULL REFERENCES public.subscription_tiers(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES public.subscription_features(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  UNIQUE (tier_id, feature_id)
);

-- RLS
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tier_feature_access ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Anyone can view tiers" ON public.subscription_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view features" ON public.subscription_features FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view tier feature access" ON public.tier_feature_access FOR SELECT TO authenticated USING (true);

-- Service role can manage all
CREATE POLICY "Service role manages tiers" ON public.subscription_tiers FOR ALL TO public USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role manages features" ON public.subscription_features FOR ALL TO public USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role manages access" ON public.tier_feature_access FOR ALL TO public USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Updated_at trigger for tiers
CREATE TRIGGER set_subscription_tiers_updated_at
  BEFORE UPDATE ON public.subscription_tiers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
