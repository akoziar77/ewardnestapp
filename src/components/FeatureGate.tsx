import { useNavigate } from "react-router-dom";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import type { FeatureKey } from "@/lib/featureGates";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  featureKey: FeatureKey;
  children: React.ReactNode;
  fallbackMessage?: string;
}

/**
 * Wraps content that requires a specific feature tier.
 * Shows upgrade prompt when the user doesn't have access.
 */
export default function FeatureGate({ featureKey, children, fallbackMessage }: Props) {
  const { allowed } = useFeatureAccess(featureKey);
  const navigate = useNavigate();

  if (allowed) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Lock className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground max-w-xs">
        {fallbackMessage || "This feature requires a paid plan."}
      </p>
      <Button
        size="sm"
        variant="outline"
        className="active:scale-[0.97]"
        onClick={() => navigate("/pricing")}
      >
        View Plans
      </Button>
    </div>
  );
}
