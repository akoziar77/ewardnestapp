
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Geofences table
CREATE TABLE public.geofences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  geofence_id text NOT NULL UNIQUE,
  location_id text NOT NULL,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  brand_location_id uuid REFERENCES public.brand_locations(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'CIRCLE',
  geometry geometry(Geometry, 4326),
  radius_m numeric NOT NULL DEFAULT 200,
  polygon_coords jsonb,
  active_hours jsonb,
  triggers text[] NOT NULL DEFAULT ARRAY['ENTER'],
  dwell_seconds integer,
  priority integer NOT NULL DEFAULT 1,
  metadata jsonb,
  import_hash text,
  status text NOT NULL DEFAULT 'ACTIVE',
  source_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_geofences_brand_id ON public.geofences(brand_id);
CREATE INDEX idx_geofences_location_id ON public.geofences(location_id);
CREATE INDEX idx_geofences_geometry ON public.geofences USING GIST(geometry);
CREATE INDEX idx_geofences_status ON public.geofences(status);

ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active geofences"
  ON public.geofences FOR SELECT TO authenticated
  USING (true);

-- 2. Brand-Gem mapping table
CREATE TABLE public.brand_gem_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  gem_id text NOT NULL UNIQUE,
  location_id text NOT NULL,
  source_id text,
  linked_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'LINKED'
);

CREATE INDEX idx_bgm_brand_id ON public.brand_gem_mapping(brand_id);
CREATE INDEX idx_bgm_location_id ON public.brand_gem_mapping(location_id);

ALTER TABLE public.brand_gem_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view brand gem mapping"
  ON public.brand_gem_mapping FOR SELECT TO authenticated
  USING (true);

-- 3. Geofence audit log
CREATE TABLE public.geofence_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id text NOT NULL,
  source_id text,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gal_job_id ON public.geofence_audit_log(job_id);
CREATE INDEX idx_gal_entity ON public.geofence_audit_log(entity_type, entity_id);

ALTER TABLE public.geofence_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage audit log"
  ON public.geofence_audit_log FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 4. Import jobs table
CREATE TABLE public.geofence_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id text NOT NULL UNIQUE,
  source_id text NOT NULL,
  status text NOT NULL DEFAULT 'PROCESSING',
  summary jsonb,
  errors jsonb,
  review_csv_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.geofence_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage import jobs"
  ON public.geofence_import_jobs FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 5. Add spatial geometry column to brand_locations
ALTER TABLE public.brand_locations ADD COLUMN IF NOT EXISTS geometry geometry(Point, 4326);

CREATE INDEX IF NOT EXISTS idx_brand_locations_geometry ON public.brand_locations USING GIST(geometry);

-- Backfill existing brand_locations with geometry from lat/lng
UPDATE public.brand_locations
SET geometry = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND geometry IS NULL;

-- 6. Trigger to auto-update geometry on brand_locations
CREATE OR REPLACE FUNCTION public.sync_brand_location_geometry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geometry := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  ELSE
    NEW.geometry := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_brand_location_geometry
  BEFORE INSERT OR UPDATE OF latitude, longitude ON public.brand_locations
  FOR EACH ROW EXECUTE FUNCTION public.sync_brand_location_geometry();

-- 7. Trigger to auto-update updated_at on geofences
CREATE TRIGGER trg_geofences_updated_at
  BEFORE UPDATE ON public.geofences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
