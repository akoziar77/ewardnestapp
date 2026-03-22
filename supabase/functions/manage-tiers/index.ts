import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth check
  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabaseUser.auth.getUser(token);
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Service role client for writes
  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const body = await req.json();
    const { action } = body;

    // ── TIER CRUD ──
    if (action === "upsert_tier") {
      const { id, name, slug, description, price_cents, price_label, interval, stripe_price_id, stripe_product_id, sort_order, is_free } = body;
      const row: Record<string, unknown> = { name, slug, description, price_cents, price_label, interval, stripe_price_id: stripe_price_id || null, stripe_product_id: stripe_product_id || null, sort_order, is_free };
      if (id) row.id = id;
      const { data, error } = await admin.from("subscription_tiers").upsert(row, { onConflict: "id" }).select().single();
      if (error) throw error;
      return respond(data);
    }

    if (action === "delete_tier") {
      const { id } = body;
      const { error } = await admin.from("subscription_tiers").delete().eq("id", id);
      if (error) throw error;
      return respond({ success: true });
    }

    // ── FEATURE CRUD ──
    if (action === "upsert_feature") {
      const { id, feature_key, label, description, sort_order } = body;
      const row: Record<string, unknown> = { feature_key, label, description, sort_order };
      if (id) row.id = id;
      const { data, error } = await admin.from("subscription_features").upsert(row, { onConflict: "id" }).select().single();
      if (error) throw error;
      return respond(data);
    }

    if (action === "delete_feature") {
      const { id } = body;
      const { error } = await admin.from("subscription_features").delete().eq("id", id);
      if (error) throw error;
      return respond({ success: true });
    }

    // ── FEATURE ACCESS TOGGLE ──
    if (action === "set_feature_access") {
      const { tier_id, feature_id, enabled } = body;
      const { data, error } = await admin.from("tier_feature_access").upsert(
        { tier_id, feature_id, enabled },
        { onConflict: "tier_id,feature_id" },
      ).select().single();
      if (error) throw error;
      return respond(data);
    }

    // ── BULK SET ACCESS (for new tier/feature) ──
    if (action === "bulk_set_access") {
      const { rows } = body; // Array of { tier_id, feature_id, enabled }
      const { data, error } = await admin.from("tier_feature_access").upsert(rows, { onConflict: "tier_id,feature_id" }).select();
      if (error) throw error;
      return respond(data);
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  function respond(data: unknown) {
    return new Response(JSON.stringify(data), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
