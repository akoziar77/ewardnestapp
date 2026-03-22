import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STREAK_BONUS = 10;

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

    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseUser = createClient(Deno.env.get("SUPABASE_URL")!, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("nest_points, streak_count, last_check_in")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "profile_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toDateString();
    const lastCheckIn = profile.last_check_in
      ? new Date(profile.last_check_in).toDateString()
      : null;

    if (today === lastCheckIn) {
      return new Response(
        JSON.stringify({ streak: profile.streak_count, bonus: 0, message: "Already checked in today" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if streak should reset (missed a day)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const wasYesterday = lastCheckIn === yesterday.toDateString();

    const newStreak = wasYesterday || !lastCheckIn ? profile.streak_count + 1 : 1;
    const newPoints = profile.nest_points + STREAK_BONUS;

    await supabaseAdmin
      .from("profiles")
      .update({
        streak_count: newStreak,
        last_check_in: new Date().toISOString(),
        nest_points: newPoints,
      })
      .eq("user_id", user.id);

    // Log activity
    await supabaseAdmin.from("nest_activities").insert({
      user_id: user.id,
      type: "daily_streak",
      points: STREAK_BONUS,
    });

    // Update tier
    let tier = "Hatchling";
    if (newPoints >= 5000) tier = "Golden Nest";
    else if (newPoints >= 2000) tier = "Winged";
    else if (newPoints >= 500) tier = "Feathered";

    await supabaseAdmin
      .from("profiles")
      .update({ tier })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({ streak: newStreak, bonus: STREAK_BONUS, tier, newTotal: newPoints }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("nest-streak error:", err);
    return new Response(
      JSON.stringify({ error: "internal_error", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
