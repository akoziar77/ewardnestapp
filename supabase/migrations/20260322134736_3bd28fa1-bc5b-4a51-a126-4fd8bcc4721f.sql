
-- Move PostGIS to extensions schema
DROP EXTENSION IF EXISTS postgis CASCADE;
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;

-- Re-add geometry column and indexes since CASCADE dropped them
ALTER TABLE public.brand_locations ADD COLUMN IF NOT EXISTS geometry geometry(Point, 4326);
CREATE INDEX IF NOT EXISTS idx_brand_locations_geometry ON public.brand_locations USING GIST(geometry);

-- Re-add geometry column to geofences
ALTER TABLE public.geofences DROP COLUMN IF EXISTS geometry;
ALTER TABLE public.geofences ADD COLUMN geometry extensions.geometry(Geometry, 4326);
CREATE INDEX IF NOT EXISTS idx_geofences_geometry ON public.geofences USING GIST(geometry);

-- Backfill brand_locations geometry
UPDATE public.brand_locations
SET geometry = extensions.ST_SetSRID(extensions.ST_MakePoint(longitude, latitude), 4326)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND geometry IS NULL;

-- Fix sync_brand_location_geometry function search path
CREATE OR REPLACE FUNCTION public.sync_brand_location_geometry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geometry := extensions.ST_SetSRID(extensions.ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  ELSE
    NEW.geometry := NULL;
  END IF;
  RETURN NEW;
END;
$$;
