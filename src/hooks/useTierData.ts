import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DbTier {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_cents: number;
  price_label: string;
  interval: string;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  sort_order: number;
  is_free: boolean;
}

export interface DbFeature {
  id: string;
  feature_key: string;
  label: string;
  description: string | null;
  sort_order: number;
}

export interface DbAccess {
  id: string;
  tier_id: string;
  feature_id: string;
  enabled: boolean;
}

export function useTiers() {
  return useQuery<DbTier[]>({
    queryKey: ["subscription_tiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_tiers" as any)
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as unknown as DbTier[];
    },
  });
}

export function useFeatures() {
  return useQuery<DbFeature[]>({
    queryKey: ["subscription_features"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_features" as any)
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as unknown as DbFeature[];
    },
  });
}

export function useFeatureAccess() {
  return useQuery<DbAccess[]>({
    queryKey: ["tier_feature_access"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tier_feature_access" as any)
        .select("*");
      if (error) throw error;
      return data as unknown as DbAccess[];
    },
  });
}

export function useInvalidateTierData() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["subscription_tiers"] });
    qc.invalidateQueries({ queryKey: ["subscription_features"] });
    qc.invalidateQueries({ queryKey: ["tier_feature_access"] });
  };
}
