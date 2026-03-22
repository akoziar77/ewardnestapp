import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Bird, Gift, QrCode, Sparkles, Check, ChevronRight } from "lucide-react";

const STEPS = [
  {
    icon: Bird,
    title: "All your rewards, one nest",
    description:
      "No more juggling cards or forgetting points. We bring every loyalty program into a single view.",
    color: "bg-primary",
  },
  {
    icon: Gift,
    title: "Earn & redeem everywhere",
    description:
      "Scan a QR code at any partner merchant. Points accumulate automatically and you can redeem rewards instantly.",
    color: "bg-secondary",
  },
  {
    icon: Sparkles,
    title: "Smart suggestions",
    description:
      "We'll nudge you when a reward is about to expire or when there's a deal you'd love. No spam, just value.",
    color: "bg-primary",
  },
];

const DEMO_MERCHANTS = [
  { name: "Brew & Bean", category: "Coffee", emoji: "☕" },
  { name: "FreshMart", category: "Grocery", emoji: "🛒" },
  { name: "Glow Studio", category: "Beauty", emoji: "💆" },
  { name: "Pedal Co.", category: "Fitness", emoji: "🚴" },
  { name: "BookNook", category: "Books", emoji: "📚" },
  { name: "Sushi Spot", category: "Dining", emoji: "🍣" },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [selectedMerchants, setSelectedMerchants] = useState<Set<number>>(new Set());
  const [completing, setCompleting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const totalSteps = STEPS.length + 1; // intro steps + merchant linking
  const isLastStep = step === totalSteps - 1;

  const toggleMerchant = (idx: number) => {
    setSelectedMerchants((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const completeOnboarding = async () => {
    if (!user) return;
    setCompleting(true);
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("user_id", user.id);
    navigate("/", { replace: true });
  };

  const next = () => {
    if (isLastStep) {
      completeOnboarding();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div className="flex min-h-screen flex-col px-6 py-12">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 mb-12">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-500 ${
              i === step ? "w-8 bg-primary" : i < step ? "w-2 bg-primary/40" : "w-2 bg-muted"
            }`}
          />
        ))}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        {step < STEPS.length ? (
          /* Feature intro steps */
          <div className="flex flex-col items-center gap-6 text-center animate-in fade-in slide-in-from-right-4 duration-500">
            <div
              className={`flex h-20 w-20 items-center justify-center rounded-3xl ${STEPS[step].color} shadow-lg shadow-primary/10`}
            >
              {(() => {
                const Icon = STEPS[step].icon;
                return <Icon className="h-10 w-10 text-primary-foreground" />;
              })()}
            </div>
            <h2 className="text-balance text-2xl font-bold tracking-tight leading-snug max-w-xs">
              {STEPS[step].title}
            </h2>
            <p className="max-w-xs text-muted-foreground leading-relaxed">
              {STEPS[step].description}
            </p>
          </div>
        ) : (
          /* Merchant selection step */
          <div className="w-full max-w-sm animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary shadow-lg shadow-secondary/10">
                <QrCode className="h-10 w-10 text-secondary-foreground" />
              </div>
              <h2 className="text-balance text-2xl font-bold tracking-tight leading-snug">
                Link your merchants
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Pick the places you visit. You can always add more later.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {DEMO_MERCHANTS.map((m, i) => {
                const selected = selectedMerchants.has(i);
                return (
                  <button
                    key={i}
                    onClick={() => toggleMerchant(i)}
                    className={`group relative flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all duration-200 active:scale-[0.96] ${
                      selected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    {selected && (
                      <div className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                        <Check className="h-3.5 w-3.5 text-primary-foreground" />
                      </div>
                    )}
                    <span className="text-3xl">{m.emoji}</span>
                    <span className="text-sm font-medium">{m.name}</span>
                    <span className="text-xs text-muted-foreground">{m.category}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="mt-8 flex flex-col gap-3">
        <Button
          onClick={next}
          className="h-14 w-full text-base font-semibold active:scale-[0.97] transition-transform"
          disabled={completing}
        >
          {completing
            ? "Setting up…"
            : isLastStep
            ? selectedMerchants.size > 0
              ? `Continue with ${selectedMerchants.size} merchant${selectedMerchants.size > 1 ? "s" : ""}`
              : "Skip for now"
            : "Continue"}
          {!completing && <ChevronRight className="ml-1 h-5 w-5" />}
        </Button>

        {step < STEPS.length && (
          <button
            onClick={() => {
              setStep(STEPS.length); // skip to merchant step
            }}
            className="text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip intro
          </button>
        )}
      </div>
    </div>
  );
}
