import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ACTION_POINTS: Record<string, number> = {
  add_card: 50,
  check_balance: 5,
  visit_brand: 10,
  redeem_reward: 20,
};

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

    const { action } = await req.json();
    const points = ACTION_POINTS[action];
    if (!points) {
      return new Response(
        JSON.stringify({ error: "invalid_action", valid_actions: Object.keys(ACTION_POINTS) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("nest_points")
      .eq("user_id", user.id)
      .single();

    const currentPoints = profile?.nest_points ?? 0;
    const newPoints = currentPoints + points;

    // Update nest_points
    await supabaseAdmin
      .from("profiles")
      .update({ nest_points: newPoints })
      .eq("user_id", user.id);

    // Log activity
    await supabaseAdmin.from("nest_activities").insert({
      user_id: user.id,
      type: action,
      points,
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

    // Check challenge progress
    const { data: userChallenges } = await supabaseAdmin
      .from("user_challenges")
      .select("id, challenge_id, progress, completed, challenges(type, requirement, reward_points)")
      .eq("user_id", user.id)
      .eq("completed", false);

    const completedChallenges: string[] = [];
    for (const uc of userChallenges ?? []) {
      const ch = (uc as any).challenges;
      if (!ch) continue;
      if (ch.type === action || ch.type === "action_count") {
        const newProgress = uc.progress + 1;
        const isComplete = newProgress >= ch.requirement;
        await supabaseAdmin
          .from("user_challenges")
          .update({
            progress: newProgress,
            completed: isComplete,
            completed_at: isComplete ? new Date().toISOString() : null,
          })
          .eq("id", uc.id);

        if (isComplete) {
          completedChallenges.push(uc.challenge_id);
          // Award challenge bonus
          await supabaseAdmin
            .from("profiles")
            .update({
              nest_points: newPoints + ch.reward_points,
              challenges_completed: (profile as any)?.challenges_completed + 1 || 1,
            })
            .eq("user_id", user.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        pointsAwarded: points,
        newTotal: newPoints,
        tier,
        completedChallenges,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("nest-earn error:", err);
    return new Response(
      JSON.stringify({ error: "internal_error", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
