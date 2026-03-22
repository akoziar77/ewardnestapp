import { useAuth } from "@/contexts/AuthContext";
import { hasFeatureAccess, type FeatureKey } from "@/lib/featureGates";

/**
 * Hook to check if the current user has access to a specific feature.
 * Returns { allowed, tier } — use `allowed` to gate UI.
 */
export function useFeatureAccess(featureKey: FeatureKey) {
  const { subscriptionTier } = useAuth();
  return {
    allowed: hasFeatureAccess(featureKey, subscriptionTier),
    tier: subscriptionTier,
  };
}
