import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  jsonResponse,
  errorResponse,
  logInfo,
  logWarn,
  calculateBasePoints,
  updateTierProgression,
} from "../_shared/utils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("unauthorized", 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

    const userId = user.id;

    // ── Parse multipart form ──
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return errorResponse("missing file", 400);

    const fileExt = file.name.split(".").pop() ?? "jpg";
    const storagePath = `receipts/${userId}/${crypto.randomUUID()}.${fileExt}`;

    // ── Upload to storage ──
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("receipts")
      .upload(storagePath, file, { contentType: file.type });

    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      return errorResponse("upload_failed", 500, { details: String(uploadErr) });
    }

    // ── OCR via Lovable AI ──
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return errorResponse("AI key not configured", 500);
    }

    // Convert file to base64 for the vision model
    const arrayBuf = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuf).reduce((s, b) => s + String.fromCharCode(b), "")
    );
    const mimeType = file.type || "image/jpeg";

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a receipt OCR parser. Extract data from the receipt image and return a JSON object with these fields:
- merchant: string (store/restaurant name)
- total: number (total amount paid)
- date: string (ISO 8601 date, e.g. "2025-03-15")
- confidence: number (0.0-1.0, how confident you are in the extraction)
- items: array of { name: string, qty: number, price: number }
- raw_text: string (full OCR text of the receipt)

If you cannot determine a field, use null. Return ONLY valid JSON, no markdown.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: `data:${mimeType};base64,${base64}` },
                },
                { type: "text", text: "Extract all data from this receipt." },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "parse_receipt",
                description: "Return structured receipt data",
                parameters: {
                  type: "object",
                  properties: {
                    merchant: { type: "string" },
                    total: { type: "number" },
                    date: { type: "string" },
                    confidence: { type: "number" },
                    raw_text: { type: "string" },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          qty: { type: "number" },
                          price: { type: "number" },
                        },
                        required: ["name", "qty", "price"],
                      },
                    },
                  },
                  required: ["merchant", "total", "date", "confidence", "raw_text", "items"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "parse_receipt" } },
        }),
      }
    );

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const body = await aiResponse.text();
      console.error("AI gateway error:", status, body);
      if (status === 429) return errorResponse("rate_limited", 429);
      if (status === 402) return errorResponse("credits_exhausted", 402);
      return errorResponse("ocr_failed", 500);
    }

    const aiData = await aiResponse.json();
    let parsed: {
      merchant: string | null;
      total: number | null;
      date: string | null;
      confidence: number | null;
      raw_text: string | null;
      items: { name: string; qty: number; price: number }[];
    };

    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      // Fallback: try parsing content directly
      try {
        const content = aiData.choices?.[0]?.message?.content ?? "";
        parsed = JSON.parse(content.replace(/```json\n?|```/g, "").trim());
      } catch {
        parsed = {
          merchant: null,
          total: null,
          date: null,
          confidence: 0,
          raw_text: null,
          items: [],
        };
      }
    }

    // ── Brand matching ──
    const brandId = await matchBrand(supabaseAdmin, parsed.merchant);

    // ── Insert receipt record ──
    const { data: receipt, error: receiptErr } = await supabaseAdmin
      .from("receipt_uploads")
      .insert({
        user_id: userId,
        brand_id: brandId,
        file_path: storagePath,
        ocr_text: parsed.raw_text,
        merchant_name: parsed.merchant,
        total_amount: parsed.total,
        purchase_date: parsed.date,
        confidence: parsed.confidence,
        status: "pending",
      })
      .select()
      .single();

    if (receiptErr) {
      console.error("Receipt insert error:", receiptErr);
      return errorResponse("db_insert_failed", 500);
    }

    // ── Insert line items ──
    if (parsed.items && parsed.items.length > 0) {
      const lineItems = parsed.items.map((i) => ({
        receipt_id: receipt.id,
        item_name: i.name,
        quantity: i.qty,
        price: i.price,
      }));
      await supabaseAdmin.from("receipt_line_items").insert(lineItems);
    }

    // ── Processing log ──
    await supabaseAdmin.from("receipt_processing_logs").insert({
      receipt_id: receipt.id,
      step: "completed",
      message: "Receipt processed successfully",
      metadata: parsed,
    });

    // ── Auto-award points if brand matched ──
    let pointsAwarded = 0;
    if (brandId && parsed.total && parsed.total > 0) {
      try {
        const basePoints = await calculateBasePoints(
          supabaseAdmin,
          parsed.total,
          brandId
        );
        pointsAwarded = basePoints;

        // Update tier progression
        await updateTierProgression(supabaseAdmin, userId, brandId, parsed.total);

        // Update profile nest_points
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("nest_points")
          .eq("user_id", userId)
          .single();

        if (profile) {
          await supabaseAdmin
            .from("profiles")
            .update({
              nest_points: (profile.nest_points ?? 0) + pointsAwarded,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
        }

        // Insert transaction
        await supabaseAdmin.from("transactions").insert({
          user_id: userId,
          brand_id: brandId,
          amount: parsed.total,
          points_earned: pointsAwarded,
          source: "receipt",
        });

        await logInfo(supabaseAdmin, "Receipt points awarded", {
          user_id: userId,
          brand_id: brandId,
          points: pointsAwarded,
          receipt_id: receipt.id,
        });
      } catch (e) {
        console.error("Points awarding error:", e);
        await supabaseAdmin.from("receipt_processing_logs").insert({
          receipt_id: receipt.id,
          step: "points_error",
          message: String(e),
        });
      }
    }

    return jsonResponse({
      success: true,
      receipt_id: receipt.id,
      brand_id: brandId,
      points_awarded: pointsAwarded,
      parsed: {
        merchant: parsed.merchant,
        total: parsed.total,
        date: parsed.date,
        confidence: parsed.confidence,
        items_count: parsed.items?.length ?? 0,
      },
    });
  } catch (err) {
    console.error("receipt-upload error:", err);
    return errorResponse("internal_error", 500, { message: String(err) });
  }
});

// ── Brand matching: exact name → alias → fuzzy ──
async function matchBrand(
  supabase: ReturnType<typeof createClient>,
  merchantName: string | null
): Promise<string | null> {
  if (!merchantName) return null;

  const normalized = merchantName.trim().toLowerCase();

  // 1. Exact match on brands.name
  const { data: exactMatch } = await supabase
    .from("brands")
    .select("id")
    .ilike("name", normalized)
    .limit(1)
    .maybeSingle();

  if (exactMatch) return exactMatch.id;

  // 2. Alias match
  const { data: aliasMatch } = await supabase
    .from("brand_aliases")
    .select("brand_id")
    .ilike("alias", normalized)
    .limit(1)
    .maybeSingle();

  if (aliasMatch) return aliasMatch.brand_id;

  // 3. Fuzzy: check if brand name is contained in merchant name or vice versa
  const { data: allBrands } = await supabase
    .from("brands")
    .select("id, name");

  if (allBrands) {
    for (const brand of allBrands) {
      const brandLower = brand.name.toLowerCase();
      if (normalized.includes(brandLower) || brandLower.includes(normalized)) {
        return brand.id;
      }
    }
  }

  return null;
}
