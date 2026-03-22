import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, brand_id, provider_name, api_endpoint, access_token, external_member_id, points_balance } = body;

    const adminClient = createClient(supabaseUrl, serviceKey);

    if (action === "connect") {
      // Use manually provided points_balance, or try API if endpoint provided
      let pointsBalance: number | null = typeof points_balance === "number" ? points_balance : null;

      if (pointsBalance === null && api_endpoint && access_token) {
        try {
          const testResponse = await fetch(api_endpoint, {
            headers: {
              Authorization: `Bearer ${access_token}`,
              "Content-Type": "application/json",
            },
          });

          if (testResponse.ok) {
            const apiData = await testResponse.json();
            pointsBalance =
              apiData.points ??
              apiData.balance ??
              apiData.data?.points ??
              apiData.data?.balance ??
              null;
          }
        } catch {
          // API unreachable — continue with manual balance
        }
      }

      const { data, error } = await adminClient
        .from("external_loyalty_connections")
        .upsert(
          {
            user_id: user.id,
            brand_id,
            provider_name: provider_name || "custom",
            api_endpoint: api_endpoint || null,
            access_token: access_token || null,
            external_member_id: external_member_id || null,
            external_points_balance: pointsBalance,
            status: "connected",
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,brand_id" }
        )
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, connection: data }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "disconnect") {
      const { error } = await adminClient
        .from("external_loyalty_connections")
        .delete()
        .eq("user_id", user.id)
        .eq("brand_id", brand_id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sync") {
      // Fetch current connection
      const { data: conn, error: connErr } = await adminClient
        .from("external_loyalty_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("brand_id", brand_id)
        .single();

      if (connErr || !conn) {
        return new Response(
          JSON.stringify({ error: "No connection found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // If manual points_balance provided, update directly
      if (typeof points_balance === "number") {
        await adminClient
          .from("external_loyalty_connections")
          .update({
            external_points_balance: points_balance,
            status: "connected",
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", conn.id);

        return new Response(
          JSON.stringify({ success: true, points_balance }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Try API sync if endpoint configured
      if (conn.api_endpoint) {
        try {
          const fetchHeaders: Record<string, string> = {
            "Content-Type": "application/json",
          };
          if (conn.access_token) {
            fetchHeaders["Authorization"] = `Bearer ${conn.access_token}`;
          }

          const resp = await fetch(conn.api_endpoint, { headers: fetchHeaders });

          if (resp.ok) {
            const apiData = await resp.json();
            const points =
              apiData.points ?? apiData.balance ?? apiData.data?.points ?? apiData.data?.balance ?? null;

            await adminClient
              .from("external_loyalty_connections")
              .update({
                external_points_balance: points,
                status: "connected",
                last_synced_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", conn.id);

            return new Response(
              JSON.stringify({ success: true, points_balance: points }),
              {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        } catch {
          // API unreachable — return current balance without error
        }
      }

      // No API or API failed — return current balance gracefully
      return new Response(
        JSON.stringify({
          success: true,
          points_balance: conn.external_points_balance,
          synced: false,
          message: "No API available. Update points manually.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "sync_all") {
      // Sync all connections for this user — attempt API calls, fallback gracefully
      const { data: connections, error: listErr } = await adminClient
        .from("external_loyalty_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "connected");

      if (listErr) throw listErr;

      const results = [];
      for (const conn of (connections || [])) {
        let points = conn.external_points_balance;
        let synced = false;

        if (conn.api_endpoint) {
          try {
            const fetchHeaders: Record<string, string> = { "Content-Type": "application/json" };
            if (conn.access_token) fetchHeaders["Authorization"] = `Bearer ${conn.access_token}`;

            const resp = await fetch(conn.api_endpoint, { headers: fetchHeaders });
            if (resp.ok) {
              const apiData = await resp.json();
              const newPoints = apiData.points ?? apiData.balance ?? apiData.data?.points ?? apiData.data?.balance ?? null;
              if (newPoints !== null) {
                points = newPoints;
                synced = true;
                await adminClient
                  .from("external_loyalty_connections")
                  .update({
                    external_points_balance: points,
                    last_synced_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", conn.id);
              }
            }
          } catch {
            // Skip — keep existing balance
          }
        }

        results.push({
          brand_id: conn.brand_id,
          provider_name: conn.provider_name,
          points_balance: points,
          synced,
        });
      }

      return new Response(
        JSON.stringify({ success: true, connections: results }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: connect, disconnect, sync, sync_all" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("connect-loyalty error:", err);
    return new Response(
      JSON.stringify({ error: "internal_error", message: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
