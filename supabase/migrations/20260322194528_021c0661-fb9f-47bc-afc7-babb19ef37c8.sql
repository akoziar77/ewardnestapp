
CREATE TABLE public.quick_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label text NOT NULL,
  icon_name text NOT NULL DEFAULT 'Zap',
  color_class text NOT NULL DEFAULT 'bg-primary/10 text-primary',
  route text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quick_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quick actions" ON public.quick_actions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert quick actions" ON public.quick_actions
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "Admins can update quick actions" ON public.quick_actions
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete quick actions" ON public.quick_actions
  FOR DELETE TO authenticated USING (is_admin());

-- Seed default quick actions
INSERT INTO public.quick_actions (label, icon_name, color_class, route, sort_order) VALUES
  ('Scan', 'QrCode', 'bg-primary/10 text-primary', '/scan', 0),
  ('Rewards', 'Gift', 'bg-secondary/10 text-secondary', '/rewards', 1),
  ('Brands', 'Store', 'bg-primary/10 text-primary', '/brands', 2),
  ('History', 'Clock', 'bg-muted text-muted-foreground', '/history', 3);
