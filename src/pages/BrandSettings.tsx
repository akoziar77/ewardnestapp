import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const STORAGE_KEY = "hidden-brand-categories";

export function getHiddenCategories(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export default function BrandSettings() {
  const navigate = useNavigate();

  const allCategories = [
    "Airlines",
    "Apparel",
    "Beauty",
    "Car Rental",
    "Coffee",
    "Convenience",
    "Dining",
    "Electronics",
    "Fast Food",
    "Gas",
    "Grocery",
    "Home Improvement",
    "Hotels",
    "Pharmacy",
    "Retail",
    "Wholesale",
  ];

  const [hidden, setHidden] = useState<string[]>(getHiddenCategories);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hidden));
  }, [hidden]);

  const toggle = (cat: string) => {
    setHidden((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <header className="flex items-center gap-3 px-6 pt-12 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors hover:text-foreground active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Brand Settings</h1>
          <p className="text-sm text-muted-foreground">
            Choose which categories to show
          </p>
        </div>
      </header>

      <div className="px-6 py-2 space-y-1">
        {allCategories.map((cat) => {
          const isVisible = !hidden.includes(cat);
          return (
            <button
              key={cat}
              onClick={() => toggle(cat)}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 transition-all active:scale-[0.99]"
            >
              <span className="text-sm font-medium">{cat}</span>
              <Switch
                checked={isVisible}
                onCheckedChange={() => toggle(cat)}
                onClick={(e) => e.stopPropagation()}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
