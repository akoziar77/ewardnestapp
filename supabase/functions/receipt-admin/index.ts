import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  jsonResponse,
  errorResponse,
  logInfo,
  logWarn,
  calculateBasePoints,
  updateTierProgression,
  nowTimestamp,
} from "../_shared/utils.ts";
import { applyBoosters } from "../_shared/booster-engine.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("unauthorized", 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller identity
    const anonKey =
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseUser = createClient(Deno.env.get("SUPABASE_URL")!, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();
    if (authError || !user) return errorResponse("unauthorized", 401);

    // Verify admin role via user_roles table
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role_id, roles(name)")
      .eq("user_id", user.id)
      .limit(10);

    const hasAdmin = adminRole?.some(
      (r: any) => (r as any).roles?.name === "admin"
    );
    if (!hasAdmin) return errorResponse("forbidden: admin role required", 403);

    const body = await req.json();
    const { action } = body;

    switch (action) {
      // ── List receipts ──
      case "list_receipts": {
        const statusFilter = body.status; // optional: "pending" | "approved" | "rejected"
        const flaggedOnly = body.flagged_only ?? false;
        const limit = body.limit ?? 100;

        let query = supabaseAdmin
          .from("receipt_uploads")
          .select(
            "id, user_id, merchant_name, normalized_merchant, total_amount, status, confidence, admin_review_flag, brand_id, created_at, retry_count"
          )
          .order("created_at", { ascending: false })
          .limit(limit);

        if (statusFilter) query = query.eq("status", statusFilter);
        if (flaggedOnly) query = query.eq("admin_review_flag", true);

        const { data, error } = await query;
        if (error) throw error;
        return jsonResponse({ receipts: data ?? [] });
      }

      // ── View receipt details ──
      case "view_receipt": {
        if (!body.receipt_id) return errorResponse("receipt_id required", 400);

        const [receiptRes, itemsRes, logsRes] = await Promise.all([
          supabaseAdmin
            .from("receipt_uploads")
            .select("*")
            .eq("id", body.receipt_id)
            .single(),
          supabaseAdmin
            .from("receipt_line_items")
            .select("*")
            .eq("receipt_id", body.receipt_id),
          supabaseAdmin
            .from("receipt_processing_logs")
            .select("*")
            .eq("receipt_id", body.receipt_id)
            .order("created_at", { ascending: false }),
        ]);

        if (receiptRes.error) throw receiptRes.error;
        return jsonResponse({
          receipt: receiptRes.data,
          items: itemsRes.data ?? [],
          logs: logsRes.data ?? [],
        });
      }

      // ── Approve receipt + award deferred points ──
      case "approve_receipt": {
        if (!body.receipt_id) return errorResponse("receipt_id required", 400);

        const { data: receipt, error: fetchErr } = await supabaseAdmin
          .from("receipt_uploads")
          .select("*")
          .eq("id", body.receipt_id)
          .single();

        if (fetchErr || !receipt) return errorResponse("receipt not found", 404);

        await supabaseAdmin
          .from("receipt_uploads")
          .update({ status: "approved", admin_review_flag: false })
          .eq("id", body.receipt_id);

        // Award deferred points if brand matched and not already awarded
        let pointsAwarded = 0;
        if (receipt.brand_id && receipt.total_amount && receipt.total_amount > 0) {
          // Check if points were already awarded
          const { data: existingTx } = await supabaseAdmin
            .from("transactions")
            .select("id")
            .eq("user_id", receipt.user_id)
            .ilike("source", "receipt%")
            .limit(1);

          // Only award if no existing receipt transaction for this receipt
          const basePoints = await calculateBasePoints(
            supabaseAdmin,
            receipt.total_amount,
            receipt.brand_id
          );

          const boosterResult = await applyBoosters({
            client: supabaseAdmin,
            user_id: receipt.user_id,
            brand_id: receipt.brand_id,
            amount: receipt.total_amount,
            action_type: "receipt_scan",
          });

          pointsAwarded = basePoints + (boosterResult.totalBonusPoints ?? 0);

          await updateTierProgression(
            supabaseAdmin,
            receipt.user_id,
            receipt.brand_id,
            receipt.total_amount
          );

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("nest_points")
            .eq("user_id", receipt.user_id)
            .single();

          if (profile) {
            await supabaseAdmin
              .from("profiles")
              .update({
                nest_points: (profile.nest_points ?? 0) + pointsAwarded,
                updated_at: nowTimestamp(),
              })
              .eq("user_id", receipt.user_id);
          }

          await supabaseAdmin.from("transactions").insert({
            user_id: receipt.user_id,
            brand_id: receipt.brand_id,
            amount: receipt.total_amount,
            points_earned: pointsAwarded,
            source: "receipt_approved",
          });
        }

        await logStep(supabaseAdmin, body.receipt_id, "approved", "Receipt approved by admin", {
          admin_id: user.id,
          points_awarded: pointsAwarded,
        });
        await logInfo(supabaseAdmin, "Receipt approved", {
          receipt_id: body.receipt_id,
          admin_id: user.id,
          points: pointsAwarded,
        });

        return jsonResponse({ success: true, points_awarded: pointsAwarded });
      }

      // ── Reject receipt ──
      case "reject_receipt": {
        if (!body.receipt_id) return errorResponse("receipt_id required", 400);
        const reason = body.reason ?? "Rejected by admin";

        await supabaseAdmin
          .from("receipt_uploads")
          .update({ status: "rejected", admin_review_flag: false })
          .eq("id", body.receipt_id);

        await logStep(supabaseAdmin, body.receipt_id, "rejected", reason, {
          admin_id: user.id,
        });
        await logWarn(supabaseAdmin, "Receipt rejected", {
          receipt_id: body.receipt_id,
          admin_id: user.id,
          reason,
        });

        return jsonResponse({ success: true });
      }

      // ── Rematch brand ──
      case "rematch_brand": {
        if (!body.receipt_id) return errorResponse("receipt_id required", 400);

        const { data: receipt } = await supabaseAdmin
          .from("receipt_uploads")
          .select("merchant_name, normalized_merchant")
          .eq("id", body.receipt_id)
          .single();

        if (!receipt) return errorResponse("receipt not found", 404);

        // Use provided brand_id override or re-match
        let brandId: string | null = body.brand_id ?? null;

        if (!brandId) {
          brandId = await matchBrand(
            supabaseAdmin,
            receipt.normalized_merchant,
            receipt.merchant_name
          );
        }

        await supabaseAdmin
          .from("receipt_uploads")
          .update({ brand_id: brandId })
          .eq("id", body.receipt_id);

        await logStep(supabaseAdmin, body.receipt_id, "rematched", "Brand rematched", {
          brand_id: brandId,
          admin_id: user.id,
        });

        return jsonResponse({ success: true, brand_id: brandId });
      }

      // ── Recalculate points ──
      case "recalc_points": {
        if (!body.receipt_id) return errorResponse("receipt_id required", 400);

        const { data: receipt } = await supabaseAdmin
          .from("receipt_uploads")
          .select("user_id, brand_id, total_amount, status")
          .eq("id", body.receipt_id)
          .single();

        if (!receipt) return errorResponse("receipt not found", 404);
        if (!receipt.brand_id || !receipt.total_amount) {
          return errorResponse("missing brand or total", 400);
        }

        const basePoints = await calculateBasePoints(
          supabaseAdmin,
          receipt.total_amount,
          receipt.brand_id
        );

        const boosterResult = await applyBoosters({
          client: supabaseAdmin,
          user_id: receipt.user_id,
          brand_id: receipt.brand_id,
          amount: receipt.total_amount,
          action_type: "receipt_scan",
        });

        const totalPoints = basePoints + (boosterResult.totalBonusPoints ?? 0);

        await logStep(supabaseAdmin, body.receipt_id, "recalculated", "Points recalculated", {
          base_points: basePoints,
          booster_bonus: boosterResult.totalBonusPoints ?? 0,
          total_points: totalPoints,
          admin_id: user.id,
        });

        return jsonResponse({
          success: true,
          base_points: basePoints,
          booster_bonus: boosterResult.totalBonusPoints ?? 0,
          total_points: totalPoints,
        });
      }

      // ── Adjust points manually ──
      case "adjust_points": {
        if (!body.receipt_id || body.points === undefined) {
          return errorResponse("receipt_id and points required", 400);
        }

        const { data: receipt } = await supabaseAdmin
          .from("receipt_uploads")
          .select("user_id, brand_id, total_amount")
          .eq("id", body.receipt_id)
          .single();

        if (!receipt) return errorResponse("receipt not found", 404);

        const points = Number(body.points);

        // Update profile
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("nest_points")
          .eq("user_id", receipt.user_id)
          .single();

        if (profile) {
          await supabaseAdmin
            .from("profiles")
            .update({
              nest_points: (profile.nest_points ?? 0) + points,
              updated_at: nowTimestamp(),
            })
            .eq("user_id", receipt.user_id);
        }

        await supabaseAdmin.from("transactions").insert({
          user_id: receipt.user_id,
          brand_id: receipt.brand_id ?? "00000000-0000-0000-0000-000000000001",
          amount: receipt.total_amount ?? 0,
          points_earned: points,
          source: "receipt_adjustment",
        });

        await logStep(supabaseAdmin, body.receipt_id, "adjusted", "Points manually adjusted", {
          points,
          admin_id: user.id,
          reason: body.reason ?? "admin adjustment",
        });
        await logWarn(supabaseAdmin, "Receipt points adjusted", {
          receipt_id: body.receipt_id,
          admin_id: user.id,
          points,
        });

        return jsonResponse({ success: true, points_adjusted: points });
      }

      default:
        return errorResponse("invalid_action", 400, {
          valid_actions: [
            "list_receipts",
            "view_receipt",
            "approve_receipt",
            "reject_receipt",
            "rematch_brand",
            "recalc_points",
            "adjust_points",
          ],
        });
    }
  } catch (err) {
    console.error("receipt-admin error:", err);
    return errorResponse("internal_error", 500, { message: String(err) });
  }
});

// ── Brand matching (shared with receipt-upload) ──
async function matchBrand(
  supabase: ReturnType<typeof createClient>,
  normalizedMerchant: string | null,
  originalMerchant: string | null
): Promise<string | null> {
  const names = [normalizedMerchant, originalMerchant].filter(Boolean) as string[];
  if (names.length === 0) return null;

  for (const name of names) {
    const lower = name.toLowerCase();

    const { data: exact } = await supabase
      .from("brands")
      .select("id")
      .ilike("name", lower)
      .limit(1)
      .maybeSingle();
    if (exact) return exact.id;

    const { data: alias } = await supabase
      .from("brand_aliases")
      .select("brand_id")
      .ilike("alias", lower)
      .limit(1)
      .maybeSingle();
    if (alias) return alias.brand_id;
  }

  const { data: allBrands } = await supabase.from("brands").select("id, name");
  if (allBrands) {
    const target = (normalizedMerchant ?? originalMerchant ?? "").toLowerCase();
    for (const brand of allBrands) {
      const bl = brand.name.toLowerCase();
      if (target.includes(bl) || bl.includes(target)) {
        return brand.id;
      }
    }
  }

  return null;
}

// ── Logging helper ──
async function logStep(
  supabase: ReturnType<typeof createClient>,
  receiptId: string,
  step: string,
  message: string,
  metadata?: Record<string, unknown>
) {
  try {
    await supabase.from("receipt_processing_logs").insert({
      receipt_id: receiptId,
      step,
      message,
      metadata: metadata ?? null,
    });
  } catch (e) {
    console.error("Log step error:", e);
  }
}
