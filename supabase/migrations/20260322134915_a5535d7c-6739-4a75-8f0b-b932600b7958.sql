
-- Allow service role to insert/update geofences
CREATE POLICY "Service role can manage geofences"
  ON public.geofences FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Allow service role to manage brand_gem_mapping
CREATE POLICY "Service role can manage brand gem mapping"
  ON public.brand_gem_mapping FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Allow service role to insert brand_locations (for bulk import)
CREATE POLICY "Service role can insert brand locations"
  ON public.brand_locations FOR INSERT TO public
  WITH CHECK (auth.role() = 'service_role');
