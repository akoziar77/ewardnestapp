import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons in bundled environments
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface BrandMapLocation {
  id: string;
  name: string;
  logo_emoji: string;
  latitude: number;
  longitude: number;
  geofence_radius_meters: number;
  category: string | null;
  milestone_visits: number;
  milestone_points: number;
  // brand_locations fields
  locations?: {
    id: string;
    name: string;
    latitude: number | null;
    longitude: number | null;
    geofence_radius_meters: number;
    city: string | null;
    state: string | null;
  }[];
}

interface BrandMapViewProps {
  brands: BrandMapLocation[];
  onBrandClick?: (brandId: string) => void;
}

function createEmojiIcon(emoji: string) {
  return L.divIcon({
    className: "brand-emoji-marker",
    html: `<div style="font-size:1.75rem;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.18));text-align:center;">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

export default function BrandMapView({ brands, onBrandClick }: BrandMapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Collect all plottable points from brand_locations (or fallback to brand coords)
  const allPoints: { brandId: string; emoji: string; brandName: string; category: string | null; lat: number; lng: number; radius: number; locName: string }[] = [];

  for (const brand of brands) {
    if (brand.locations && brand.locations.length > 0) {
      for (const loc of brand.locations) {
        if (loc.latitude != null && loc.longitude != null) {
          allPoints.push({
            brandId: brand.id,
            emoji: brand.logo_emoji,
            brandName: brand.name,
            category: brand.category,
            lat: loc.latitude,
            lng: loc.longitude,
            radius: loc.geofence_radius_meters,
            locName: loc.name,
          });
        }
      }
    } else if (brand.latitude != null && brand.longitude != null) {
      allPoints.push({
        brandId: brand.id,
        emoji: brand.logo_emoji,
        brandName: brand.name,
        category: brand.category,
        lat: brand.latitude,
        lng: brand.longitude,
        radius: brand.geofence_radius_meters,
        locName: brand.name,
      });
    }
  }

  const defaultCenter: [number, number] =
    allPoints.length > 0
      ? [allPoints[0].lat, allPoints[0].lng]
      : [39.8283, -98.5795];

  const defaultZoom = allPoints.length > 0 ? 12 : 4;

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        center: defaultCenter,
        zoom: defaultZoom,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org">OSM</a>',
      }).addTo(mapRef.current);

      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            mapRef.current?.flyTo(
              [pos.coords.latitude, pos.coords.longitude],
              14,
              { duration: 1 }
            );
          },
          () => {},
          { enableHighAccuracy: true, timeout: 8000 }
        );
      }
    }

    const map = mapRef.current;

    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer);
      }
    });

    for (const pt of allPoints) {
      L.circle([pt.lat, pt.lng], {
        radius: pt.radius,
        color: "hsl(168, 33%, 36%)",
        fillColor: "hsl(168, 33%, 36%)",
        fillOpacity: 0.1,
        weight: 1.5,
        dashArray: "6 4",
      }).addTo(map);

      const marker = L.marker([pt.lat, pt.lng], {
        icon: createEmojiIcon(pt.emoji),
      }).addTo(map);

      marker.bindPopup(`
        <div style="text-align:center;min-width:120px;">
          <p style="font-size:1.125rem;margin-bottom:2px;">${pt.emoji}</p>
          <p style="font-weight:600;font-size:0.875rem;margin:0;">${pt.locName}</p>
          ${pt.category ? `<p style="font-size:0.75rem;color:#888;margin:2px 0 0;">${pt.category}</p>` : ""}
          <p style="font-size:10px;color:#888;margin:4px 0 0;">${pt.radius}m radius</p>
        </div>
      `);

      marker.on("click", () => onBrandClick?.(pt.brandId));
    }

    if (allPoints.length > 1) {
      const bounds = L.latLngBounds(
        allPoints.map((p) => [p.lat, p.lng] as [number, number])
      );
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
    }

    return () => {};
  }, [brands]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border bg-card" style={{ height: 420 }}>
      <div ref={containerRef} className="h-full w-full z-0" style={{ height: "100%", width: "100%" }} />

      {allPoints.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
          <div className="text-center px-6">
            <p className="text-2xl mb-2">📍</p>
            <p className="text-sm font-medium text-foreground">No brand locations yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Brand locations will appear here once they're added
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
