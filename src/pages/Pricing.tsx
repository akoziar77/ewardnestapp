import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTiers, useFeatures, useFeatureAccess } from "@/hooks/useTierData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2, Crown, Rocket, Building2, ExternalLink, ArrowLeft, Settings } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

export default function Pricing() {
  const { user, subscriptionTier, isSubscribed, refreshSubscription } = useAuth();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const navigate = useNavigate();

  const { data: tiers = [], isLoading: tiersLoading } = useTiers();
  const { data: features = [], isLoading: featuresLoading } = useFeatures();
  const { data: accessRows = [], isLoading: accessLoading } = useFeatureAccess();

  const isLoading = tiersLoading || featuresLoading || accessLoading;

  const getAccess = (tierId: string, featureId: string): boolean => {
    const row = accessRows.find((a) => a.tier_id === tierId && a.feature_id === featureId);
    return row?.enabled ?? false;
  };

  const tierIcon = (slug: string) => {
    if (slug === "business") return <Building2 className="h-6 w-6" />;
    if (slug === "free") return <Rocket className="h-6 w-6" />;
    return <Crown className="h-6 w-6" />;
  };

  const handleCheckout = async (priceId: string, tierSlug: string) => {
    if (!user) { navigate("/auth"); return; }
    setLoadingTier(tierSlug);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: { priceId } });
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

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground active:scale-95 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Plans & Pricing</h1>
            <p className="text-sm text-muted-foreground">
              Unlock premium features for your loyalty rewards
            </p>
          </div>
          <Button variant="ghost" size="icon" className="active:scale-95" onClick={() => navigate("/manage-tiers")}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Tier cards */}
            <div className="grid gap-6 md:grid-cols-3 mb-12">
              {tiers.map((t, idx) => {
                const isCurrent = subscriptionTier === t.slug;
                const isPaid = !t.is_free;

                return (
                  <div
                    key={t.id}
                    className={`relative rounded-2xl border p-6 flex flex-col transition-shadow duration-300 ${
                      isCurrent
                        ? "border-primary ring-2 ring-primary/20 shadow-lg"
                        : "border-border hover:shadow-md"
                    } ${idx === 1 ? "md:-translate-y-2" : ""}`}
                  >
                    {isCurrent && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                        Your Plan
                      </Badge>
                    )}
                    {idx === 1 && !isCurrent && (
                      <Badge variant="secondary" className="absolute -top-3 left-1/2 -translate-x-1/2">
                        Most Popular
                      </Badge>
                    )}

                    <div className="flex items-center gap-3 mb-4">
                      <div className={`rounded-xl p-2 ${isCurrent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {tierIcon(t.slug)}
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">{t.name}</h2>
                        <p className="text-xs text-muted-foreground">{t.description}</p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <span className="text-3xl font-bold tabular-nums">{t.price_label}</span>
                      {isPaid && <span className="text-sm text-muted-foreground">/mo</span>}
                    </div>

                    <div className="flex-1" />

                    {isCurrent ? (
                      isSubscribed ? (
                        <Button variant="outline" className="w-full gap-2 active:scale-[0.97]" onClick={handleManage} disabled={loadingTier === "manage"}>
                          {loadingTier === "manage" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                          Manage Subscription
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full" disabled>Current Plan</Button>
                      )
                    ) : isPaid && t.stripe_price_id ? (
                      <Button className="w-full gap-2 active:scale-[0.97]" onClick={() => handleCheckout(t.stripe_price_id!, t.slug)} disabled={!!loadingTier}>
                        {loadingTier === t.slug ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                        {loadingTier === t.slug ? "Loading…" : `Upgrade to ${t.name}`}
                      </Button>
                    ) : (
                      <Button variant="ghost" className="w-full" disabled>Free forever</Button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Feature comparison table */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold tracking-tight">Feature Comparison</h2>
              <div className="rounded-2xl border border-border overflow-hidden">
                <div className={`grid bg-muted/50 border-b border-border px-4 py-3`} style={{ gridTemplateColumns: `1fr ${tiers.map(() => "100px").join(" ")}` }}>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Feature</span>
                  {tiers.map((t) => (
                    <span
                      key={t.id}
                      className={`text-xs font-semibold uppercase tracking-wider text-center ${subscriptionTier === t.slug ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {t.name}
                    </span>
                  ))}
                </div>

                {features.map((f, i) => (
                  <div
                    key={f.id}
                    className={`grid items-center px-4 py-3 ${i < features.length - 1 ? "border-b border-border" : ""} ${i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
                    style={{ gridTemplateColumns: `1fr ${tiers.map(() => "100px").join(" ")}` }}
                  >
                    <div>
                      <p className="text-sm font-medium">{f.label}</p>
                      <p className="text-xs text-muted-foreground hidden md:block">{f.description}</p>
                    </div>
                    {tiers.map((t) => (
                      <div key={t.id} className="flex justify-center">
                        {getAccess(t.id, f.id) ? (
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
                <Button variant="link" size="sm" onClick={async () => { await refreshSubscription(); toast.success("Refreshed"); }}>
                  Refresh subscription status
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
