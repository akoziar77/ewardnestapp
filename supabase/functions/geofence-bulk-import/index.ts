import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---------- constants ----------
const BATCH_SIZE = 1000;
const VALID_COUNTRIES = new Set([
  "US","CA","MX","GB","FR","DE","IT","ES","PT","NL","BE","CH","AT","AU","NZ",
  "JP","KR","CN","IN","BR","AR","CL","CO","SE","NO","DK","FI","IE","PL","CZ",
  "HU","RO","BG","HR","GR","TR","ZA","EG","NG","KE","AE","SA","IL","SG","MY",
  "TH","PH","ID","VN","TW","HK","RU","UA",
]);
const VALID_STATUSES = new Set(["ACTIVE", "INACTIVE", "PENDING", "CLOSED"]);
const VALID_GEOFENCE_TYPES = new Set(["CIRCLE", "POLYGON", "MULTI_POLYGON"]);
const VALID_TRIGGERS = new Set(["ENTER", "EXIT", "DWELL"]);
const VALID_DAYS = new Set(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]);
const TIME_RE = /^\d{2}:\d{2}$/;

// ---------- helpers ----------
function maskPhone(phone: string | null): string {
  if (!phone) return "null";
  return phone.length > 4 ? "***" + phone.slice(-4) : "****";
}

function computeHash(obj: Record<string, unknown>): string {
  const sorted = JSON.stringify(obj, Object.keys(obj).sort());
  let h = 0;
  for (let i = 0; i < sorted.length; i++) {
    h = ((h << 5) - h + sorted.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

interface LocationRecord {
  location_id: string;
  brand_code: string;
  gem_id: string;
  name: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state_province: string;
  postal_code: string;
  country_code: string;
  latitude: number;
  longitude: number;
  phone?: string | null;
  open_date?: string | null;
  status: string;
  geofence: {
    geofence_id: string;
    type: string;
    radius_m?: number;
    polygon_coords?: number[][];
    active_hours?: { day_of_week: string; start_time: string; end_time: string }[] | null;
    triggers: string[];
    dwell_seconds?: number | null;
    priority: number;
    metadata?: Record<string, unknown> | null;
  };
  metadata?: Record<string, unknown> | null;
}

interface ValidationError {
  location_id: string;
  geofence_id?: string;
  error_code: string;
  message: string;
}

function validateLocation(loc: LocationRecord): ValidationError[] {
  const errs: ValidationError[] = [];
  const lid = loc.location_id || "UNKNOWN";

  if (!loc.location_id) errs.push({ location_id: lid, error_code: "MISSING_LOCATION_ID", message: "location_id required" });
  if (!loc.brand_code) errs.push({ location_id: lid, error_code: "MISSING_BRAND_CODE", message: "brand_code required" });
  if (!loc.gem_id) errs.push({ location_id: lid, error_code: "MISSING_GEM_ID", message: "gem_id required" });
  if (!loc.name) errs.push({ location_id: lid, error_code: "MISSING_NAME", message: "name required" });
  if (!loc.address_line1) errs.push({ location_id: lid, error_code: "MISSING_ADDRESS", message: "address_line1 required" });
  if (!loc.city) errs.push({ location_id: lid, error_code: "MISSING_CITY", message: "city required" });
  if (!loc.state_province) errs.push({ location_id: lid, error_code: "MISSING_STATE", message: "state_province required" });
  if (!loc.postal_code) errs.push({ location_id: lid, error_code: "MISSING_POSTAL", message: "postal_code required" });
  if (!loc.country_code || !VALID_COUNTRIES.has(loc.country_code)) errs.push({ location_id: lid, error_code: "INVALID_COUNTRY", message: `Invalid country_code: ${loc.country_code}` });
  if (typeof loc.latitude !== "number" || loc.latitude < -90 || loc.latitude > 90) errs.push({ location_id: lid, error_code: "INVALID_LAT", message: `latitude must be [-90,90]: ${loc.latitude}` });
  if (typeof loc.longitude !== "number" || loc.longitude < -180 || loc.longitude > 180) errs.push({ location_id: lid, error_code: "INVALID_LNG", message: `longitude must be [-180,180]: ${loc.longitude}` });
  if (!VALID_STATUSES.has(loc.status)) errs.push({ location_id: lid, error_code: "INVALID_STATUS", message: `Invalid status: ${loc.status}` });

  // Geofence validation
  const gf = loc.geofence;
  if (!gf) {
    errs.push({ location_id: lid, error_code: "MISSING_GEOFENCE", message: "geofence object required" });
    return errs;
  }
  if (!gf.geofence_id) errs.push({ location_id: lid, geofence_id: gf.geofence_id, error_code: "MISSING_GF_ID", message: "geofence_id required" });
  if (!VALID_GEOFENCE_TYPES.has(gf.type)) errs.push({ location_id: lid, geofence_id: gf.geofence_id, error_code: "INVALID_GF_TYPE", message: `Invalid type: ${gf.type}` });
  if (gf.type === "CIRCLE" && (typeof gf.radius_m !== "number" || gf.radius_m <= 0)) errs.push({ location_id: lid, geofence_id: gf.geofence_id, error_code: "INVALID_RADIUS", message: "radius_m must be > 0 for CIRCLE" });
  if ((gf.type === "POLYGON" || gf.type === "MULTI_POLYGON") && (!Array.isArray(gf.polygon_coords) || gf.polygon_coords.length < 3)) errs.push({ location_id: lid, geofence_id: gf.geofence_id, error_code: "INVALID_POLYGON", message: "polygon_coords needs >= 3 points" });

  if (gf.triggers) {
    for (const t of gf.triggers) {
      if (!VALID_TRIGGERS.has(t)) errs.push({ location_id: lid, geofence_id: gf.geofence_id, error_code: "INVALID_TRIGGER", message: `Invalid trigger: ${t}` });
    }
  }

  if (gf.active_hours && Array.isArray(gf.active_hours)) {
    for (const ah of gf.active_hours) {
      if (!VALID_DAYS.has(ah.day_of_week)) errs.push({ location_id: lid, geofence_id: gf.geofence_id, error_code: "INVALID_DAY", message: `Invalid day: ${ah.day_of_week}` });
      if (!TIME_RE.test(ah.start_time)) errs.push({ location_id: lid, geofence_id: gf.geofence_id, error_code: "INVALID_TIME", message: `Invalid start_time: ${ah.start_time}` });
      if (!TIME_RE.test(ah.end_time)) errs.push({ location_id: lid, geofence_id: gf.geofence_id, error_code: "INVALID_TIME", message: `Invalid end_time: ${ah.end_time}` });
    }
  }

  return errs;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { source_id, locations } = body as { source_id: string; locations: LocationRecord[] };

    if (!source_id) throw new Error("source_id required");
    if (!Array.isArray(locations) || locations.length === 0) throw new Error("locations array required and non-empty");

    const jobId = `job_${source_id}_${Date.now()}`;
    const startTime = Date.now();

    // Create job record
    await supabase.from("geofence_import_jobs").insert({
      job_id: jobId,
      source_id,
      status: "PROCESSING",
    });

    // ---------- Step 1: Preflight validation ----------
    const allErrors: ValidationError[] = [];
    const validLocations: LocationRecord[] = [];

    for (const loc of locations) {
      const errs = validateLocation(loc);
      if (errs.length > 0) {
        allErrors.push(...errs);
      } else {
        validLocations.push(loc);
      }
    }

    const errorRate = allErrors.length / locations.length;
    if (errorRate > 0.01 && allErrors.length > 0) {
      // Abort if >1% fail validation
      await supabase.from("geofence_import_jobs").update({
        status: "FAILED",
        summary: { processed: 0, inserted: 0, updated: 0, skipped: 0, review_count: 0, errors: allErrors.length, elapsed_time: Date.now() - startTime },
        errors: allErrors.slice(0, 500),
        completed_at: new Date().toISOString(),
      }).eq("job_id", jobId);

      return new Response(JSON.stringify({
        job_id: jobId,
        status: "FAILED",
        summary: { processed: 0, inserted: 0, updated: 0, skipped: 0, review_count: 0, errors: allErrors.length, elapsed_time: Date.now() - startTime },
        errors: allErrors.slice(0, 200),
        review_csv_url: null,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    // ---------- Step 2: Resolve brands ----------
    const brandCodes = [...new Set(validLocations.map((l) => l.brand_code))];
    const { data: existingBrands } = await supabase.from("brands").select("id, name").in("name", brandCodes);
    const brandMap = new Map<string, string>();
    for (const b of existingBrands || []) {
      brandMap.set(b.name.toLowerCase(), b.id);
    }

    // Create placeholder brands for missing codes
    const missingCodes = brandCodes.filter((c) => !brandMap.has(c.toLowerCase()));
    for (const code of missingCodes) {
      const { data: newBrand } = await supabase.from("brands").insert({ name: code, category: "PENDING_REVIEW", logo_emoji: "🏪" }).select("id").single();
      if (newBrand) brandMap.set(code.toLowerCase(), newBrand.id);
    }

    // ---------- Step 3: Process in batches ----------
    let inserted = 0, updated = 0, skipped = 0, reviewCount = 0;
    const reviewRecords: Record<string, unknown>[] = [];
    const auditEntries: Record<string, unknown>[] = [];

    for (let i = 0; i < validLocations.length; i += BATCH_SIZE) {
      const batch = validLocations.slice(i, i + BATCH_SIZE);

      for (const loc of batch) {
        const brandId = brandMap.get(loc.brand_code.toLowerCase());
        if (!brandId) {
          allErrors.push({ location_id: loc.location_id, error_code: "BRAND_NOT_FOUND", message: `Could not resolve brand: ${loc.brand_code}` });
          auditEntries.push({ job_id: jobId, source_id, entity_type: "LOCATION", entity_id: loc.location_id, action: "ERROR", details: { error: "brand_not_found" } });
          continue;
        }

        // Compute hashes
        const locHashFields = { name: loc.name, address_line1: loc.address_line1, city: loc.city, state_province: loc.state_province, postal_code: loc.postal_code, latitude: loc.latitude, longitude: loc.longitude, status: loc.status };
        const locHash = computeHash(locHashFields as unknown as Record<string, unknown>);

        const gfHashFields = { type: loc.geofence.type, radius_m: loc.geofence.radius_m, triggers: loc.geofence.triggers, priority: loc.geofence.priority, active_hours: loc.geofence.active_hours, dwell_seconds: loc.geofence.dwell_seconds };
        const gfHash = computeHash(gfHashFields as unknown as Record<string, unknown>);

        // ---------- Brand-Gem mapping ----------
        const { data: existingGem } = await supabase.from("brand_gem_mapping").select("id, brand_id, status").eq("gem_id", loc.gem_id).maybeSingle();

        if (existingGem && existingGem.brand_id !== brandId) {
          // Conflict — gem already linked to different brand
          reviewRecords.push({
            type: "GEM_CONFLICT",
            location_id: loc.location_id,
            gem_id: loc.gem_id,
            existing_brand_id: existingGem.brand_id,
            new_brand_id: brandId,
            message: "gem_id already linked to different brand",
          });
          reviewCount++;
          auditEntries.push({ job_id: jobId, source_id, entity_type: "BRAND_GEM", entity_id: loc.gem_id, action: "REVIEW", details: { existing_brand: existingGem.brand_id, new_brand: brandId } });
        } else if (!existingGem) {
          await supabase.from("brand_gem_mapping").insert({ brand_id: brandId, gem_id: loc.gem_id, location_id: loc.location_id, source_id, status: "LINKED" });
          auditEntries.push({ job_id: jobId, source_id, entity_type: "BRAND_GEM", entity_id: loc.gem_id, action: "INSERT", details: { brand_id: brandId } });
        }

        // ---------- Upsert brand_location ----------
        const { data: existingLoc } = await supabase.from("brand_locations").select("id").eq("name", loc.name).eq("brand_id", brandId).eq("latitude", loc.latitude).eq("longitude", loc.longitude).maybeSingle();

        let brandLocationId: string;
        if (existingLoc) {
          brandLocationId = existingLoc.id;
          skipped++;
          auditEntries.push({ job_id: jobId, source_id, entity_type: "LOCATION", entity_id: loc.location_id, action: "SKIP", details: { brand_location_id: brandLocationId } });
        } else {
          const { data: newLoc } = await supabase.from("brand_locations").insert({
            brand_id: brandId,
            name: loc.name,
            address_line: [loc.address_line1, loc.address_line2].filter(Boolean).join(", "),
            city: loc.city,
            state: loc.state_province,
            zip_code: loc.postal_code,
            country: loc.country_code,
            latitude: loc.latitude,
            longitude: loc.longitude,
            phone: loc.phone,
            geofence_radius_meters: loc.geofence.type === "CIRCLE" ? Math.round(loc.geofence.radius_m || 200) : 200,
          }).select("id").single();

          brandLocationId = newLoc?.id || "";
          inserted++;
          auditEntries.push({ job_id: jobId, source_id, entity_type: "LOCATION", entity_id: loc.location_id, action: "INSERT", details: { brand_location_id: brandLocationId, phone: maskPhone(loc.phone || null) } });
        }

        // ---------- Upsert geofence ----------
        const gf = loc.geofence;
        const { data: existingGf } = await supabase.from("geofences").select("id, import_hash, brand_id, location_id").eq("geofence_id", gf.geofence_id).maybeSingle();

        if (existingGf) {
          if (existingGf.import_hash === gfHash) {
            auditEntries.push({ job_id: jobId, source_id, entity_type: "GEOFENCE", entity_id: gf.geofence_id, action: "SKIP", details: { hash: gfHash } });
          } else if (existingGf.brand_id !== brandId) {
            // Geofence linked to different brand — review
            reviewRecords.push({
              type: "GEOFENCE_BRAND_CONFLICT",
              geofence_id: gf.geofence_id,
              location_id: loc.location_id,
              existing_brand_id: existingGf.brand_id,
              new_brand_id: brandId,
            });
            reviewCount++;
            auditEntries.push({ job_id: jobId, source_id, entity_type: "GEOFENCE", entity_id: gf.geofence_id, action: "REVIEW", details: { conflict: "brand_mismatch" } });
          } else {
            await supabase.from("geofences").update({
              location_id: loc.location_id,
              brand_location_id: brandLocationId,
              type: gf.type,
              radius_m: gf.radius_m || 200,
              polygon_coords: gf.polygon_coords || null,
              active_hours: gf.active_hours || null,
              triggers: gf.triggers,
              dwell_seconds: gf.dwell_seconds || null,
              priority: gf.priority,
              metadata: gf.metadata || null,
              import_hash: gfHash,
              status: loc.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
              source_id,
            }).eq("id", existingGf.id);

            updated++;
            auditEntries.push({ job_id: jobId, source_id, entity_type: "GEOFENCE", entity_id: gf.geofence_id, action: "UPDATE", details: { old_hash: existingGf.import_hash, new_hash: gfHash } });
          }
        } else {
          await supabase.from("geofences").insert({
            geofence_id: gf.geofence_id,
            location_id: loc.location_id,
            brand_id: brandId,
            brand_location_id: brandLocationId,
            type: gf.type,
            radius_m: gf.radius_m || 200,
            polygon_coords: gf.polygon_coords || null,
            active_hours: gf.active_hours || null,
            triggers: gf.triggers,
            dwell_seconds: gf.dwell_seconds || null,
            priority: gf.priority,
            metadata: gf.metadata || null,
            import_hash: gfHash,
            status: loc.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
            source_id,
          });

          auditEntries.push({ job_id: jobId, source_id, entity_type: "GEOFENCE", entity_id: gf.geofence_id, action: "INSERT", details: { brand_id: brandId } });
        }
      }

      // Flush audit entries per batch
      if (auditEntries.length > 0) {
        await supabase.from("geofence_audit_log").insert(auditEntries);
        auditEntries.length = 0;
      }
    }

    // ---------- Step 4: Generate review CSV ----------
    let reviewCsvUrl: string | null = null;
    if (reviewRecords.length > 0) {
      const csvHeader = "type,location_id,gem_id,geofence_id,existing_brand_id,new_brand_id,message\n";
      const csvRows = reviewRecords.map((r) =>
        `${r.type || ""},${r.location_id || ""},${r.gem_id || ""},${r.geofence_id || ""},${r.existing_brand_id || ""},${r.new_brand_id || ""},${r.message || ""}`
      ).join("\n");
      const csvContent = csvHeader + csvRows;
      const csvBlob = new Blob([csvContent], { type: "text/csv" });
      const csvPath = `reviews/${jobId}_review.csv`;

      // Try uploading to storage
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(csvPath, csvBlob, { contentType: "text/csv", upsert: true });
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(csvPath);
        reviewCsvUrl = urlData?.publicUrl || null;
      }
    }

    // ---------- Step 5: Finalize job ----------
    const elapsed = Date.now() - startTime;
    const finalStatus = allErrors.length > 0 ? "PARTIAL_SUCCESS" : "SUCCESS";
    const summary = {
      processed: validLocations.length,
      inserted,
      updated,
      skipped,
      review_count: reviewCount,
      errors: allErrors.length,
      elapsed_time: elapsed,
    };

    await supabase.from("geofence_import_jobs").update({
      status: finalStatus,
      summary,
      errors: allErrors.slice(0, 500),
      review_csv_url: reviewCsvUrl,
      completed_at: new Date().toISOString(),
    }).eq("job_id", jobId);

    return new Response(JSON.stringify({
      job_id: jobId,
      status: finalStatus,
      summary,
      errors: allErrors.slice(0, 200),
      review_csv_url: reviewCsvUrl,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: unknown) {
    console.error("Geofence bulk import error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
