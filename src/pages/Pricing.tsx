import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TIERS, type TierKey } from "@/lib/subscriptionTiers";
import { FEATURE_GATES } from "@/lib/featureGates";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2, Crown, Rocket, Building2, ExternalLink, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

const tierIcons: Record<TierKey, React.ReactNode> = {
  free: <Rocket className="h-6 w-6" />,
  pro: <Crown className="h-6 w-6" />,
  business: <Building2 className="h-6 w-6" />,
};

export default function Pricing() {
  const { user, subscriptionTier, isSubscribed, refreshSubscription } = useAuth();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCheckout = async (priceId: string, tierKey: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setLoadingTier(tierKey);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch {
      toast.error("Failed to start checkout");
    } finally {
      setLoadingTier(null);
    }
  };

  const handleManage = async () => {
    setLoadingTier("manage");
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch {
      toast.error("Failed to open subscription management");
    } finally {
      setLoadingTier(null);
    }
  };

  const handleRefresh = async () => {
    await refreshSubscription();
    toast.success("Subscription status refreshed");
  };

  const tierOrder: TierKey[] = ["free", "pro", "business"];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors hover:text-foreground active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Plans & Pricing</h1>
            <p className="text-sm text-muted-foreground">
              Unlock premium features for your loyalty rewards
            </p>
          </div>
        </div>

        {/* Tier cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-12">
          {tierOrder.map((key) => {
            const tier = TIERS[key];
            const isCurrent = subscriptionTier === key;
            const isPaid = key !== "free";
            const priceId = "price_id" in tier ? tier.price_id : null;

            return (
              <div
                key={key}
                className={`relative rounded-2xl border p-6 flex flex-col transition-shadow duration-300 ${
                  isCurrent
                    ? "border-primary ring-2 ring-primary/20 shadow-lg"
                    : "border-border hover:shadow-md"
                } ${key === "pro" ? "md:-translate-y-2" : ""}`}
              >
                {isCurrent && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    Your Plan
                  </Badge>
                )}
                {key === "pro" && !isCurrent && (
                  <Badge variant="secondary" className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={`rounded-xl p-2 ${isCurrent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {tierIcons[key]}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{tier.name}</h2>
                    <p className="text-xs text-muted-foreground">{tier.description}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <span className="text-3xl font-bold tabular-nums">{tier.priceLabel}</span>
                  {isPaid && <span className="text-sm text-muted-foreground">/mo</span>}
                </div>

                <div className="flex-1" />

                {isCurrent ? (
                  isSubscribed ? (
                    <Button
                      variant="outline"
                      className="w-full gap-2 active:scale-[0.97]"
                      onClick={handleManage}
                      disabled={loadingTier === "manage"}
                    >
                      {loadingTier === "manage" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="h-4 w-4" />
                      )}
                      Manage Subscription
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  )
                ) : isPaid && priceId ? (
                  <Button
                    className="w-full gap-2 active:scale-[0.97]"
                    onClick={() => handleCheckout(priceId, key)}
                    disabled={!!loadingTier}
                  >
                    {loadingTier === key ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Crown className="h-4 w-4" />
                    )}
                    {loadingTier === key ? "Loading…" : `Upgrade to ${tier.name}`}
                  </Button>
                ) : (
                  <Button variant="ghost" className="w-full" disabled>
                    Free forever
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Feature comparison table */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Feature Comparison</h2>
          <div className="rounded-2xl border border-border overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_80px_80px_80px] md:grid-cols-[1fr_120px_120px_120px] bg-muted/50 border-b border-border px-4 py-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Feature</span>
              {tierOrder.map((key) => (
                <span
                  key={key}
                  className={`text-xs font-semibold uppercase tracking-wider text-center ${
                    subscriptionTier === key ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {TIERS[key].name}
                </span>
              ))}
            </div>

            {/* Feature rows */}
            {FEATURE_GATES.map((gate, i) => (
              <div
                key={gate.key}
                className={`grid grid-cols-[1fr_80px_80px_80px] md:grid-cols-[1fr_120px_120px_120px] items-center px-4 py-3 ${
                  i < FEATURE_GATES.length - 1 ? "border-b border-border" : ""
                } ${i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
              >
                <div>
                  <p className="text-sm font-medium">{gate.label}</p>
                  <p className="text-xs text-muted-foreground hidden md:block">{gate.description}</p>
                </div>
                {tierOrder.map((tier) => (
                  <div key={tier} className="flex justify-center">
                    {gate[tier] ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                        <Check className="h-3.5 w-3.5 text-primary" />
                      </div>
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                        <X className="h-3.5 w-3.5 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {isSubscribed && (
          <div className="text-center mt-6">
            <Button variant="link" size="sm" onClick={handleRefresh}>
              Refresh subscription status
            </Button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
