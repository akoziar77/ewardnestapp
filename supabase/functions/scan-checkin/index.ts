import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const POINTS_PER_CHECKIN = 50;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user JWT
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { merchant_id } = await req.json();
    if (!merchant_id || typeof merchant_id !== "string") {
      return new Response(
        JSON.stringify({ error: "merchant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify merchant exists
    const { data: merchant, error: merchantErr } = await supabaseAdmin
      .from("merchants")
      .select("id, name")
      .eq("id", merchant_id)
      .single();

    if (merchantErr || !merchant) {
      return new Response(
        JSON.stringify({ error: "merchant_not_found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate idempotency key: one check-in per user per merchant per day
    const today = new Date().toISOString().slice(0, 10);
    const idempotencyKey = `checkin:${user.id}:${merchant_id}:${today}`;

    // Check if already checked in today
    const { data: existing } = await supabaseAdmin
      .from("ledger_entries")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({
          error: "already_checked_in",
          message: "You've already checked in at this merchant today.",
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate current balance for this merchant
    const { data: lastEntry } = await supabaseAdmin
      .from("ledger_entries")
      .select("balance_after")
      .eq("user_id", user.id)
      .eq("merchant_id", merchant_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentBalance = lastEntry?.balance_after ?? 0;
    const newBalance = currentBalance + POINTS_PER_CHECKIN;

    // Create ledger entry
    const { data: entry, error: insertErr } = await supabaseAdmin
      .from("ledger_entries")
      .insert({
        user_id: user.id,
        merchant_id: merchant_id,
        delta_points: POINTS_PER_CHECKIN,
        balance_after: newBalance,
        type: "earn",
        idempotency_key: idempotencyKey,
        metadata: { source: "qr_checkin", date: today },
      })
      .select()
      .single();

    if (insertErr) {
      // Could be a race condition duplicate
      if (insertErr.code === "23505") {
        return new Response(
          JSON.stringify({
            error: "already_checked_in",
            message: "You've already checked in at this merchant today.",
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw insertErr;
    }

    return new Response(
      JSON.stringify({
        success: true,
        points_earned: POINTS_PER_CHECKIN,
        new_balance: newBalance,
        merchant_name: merchant.name,
        entry_id: entry.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Check-in error:", err);
    return new Response(
      JSON.stringify({ error: "internal_error", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
