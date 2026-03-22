import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTiers, useFeatures, useFeatureAccess, useInvalidateTierData, type DbTier, type DbFeature } from "@/hooks/useTierData";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Crown, Layers } from "lucide-react";

async function invokeManage(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("manage-tiers", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// ── Tier Form ──
function TierForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: DbTier;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priceCents, setPriceCents] = useState(initial?.price_cents?.toString() ?? "0");
  const [priceLabel, setPriceLabel] = useState(initial?.price_label ?? "$0");
  const [stripePriceId, setStripePriceId] = useState(initial?.stripe_price_id ?? "");
  const [stripeProductId, setStripeProductId] = useState(initial?.stripe_product_id ?? "");
  const [sortOrder, setSortOrder] = useState(initial?.sort_order?.toString() ?? "0");
  const [isFree, setIsFree] = useState(initial?.is_free ?? false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) {
      toast.error("Name and slug are required");
      return;
    }
    setSaving(true);
    try {
      await invokeManage({
        action: "upsert_tier",
        id: initial?.id,
        name: name.trim(),
        slug: slug.trim().toLowerCase().replace(/\s+/g, "-"),
        description: description.trim() || null,
        price_cents: parseInt(priceCents) || 0,
        price_label: priceLabel.trim(),
        interval: "month",
        stripe_price_id: stripePriceId.trim() || null,
        stripe_product_id: stripeProductId.trim() || null,
        sort_order: parseInt(sortOrder) || 0,
        is_free: isFree,
      });
      toast.success(initial ? "Tier updated" : "Tier created");
      onSave();
    } catch (e: any) {
      toast.error(e.message || "Failed to save tier");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pro" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Slug</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="pro" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Description</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="For power users" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Price (cents)</Label>
          <Input type="number" value={priceCents} onChange={(e) => setPriceCents(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Price label</Label>
          <Input value={priceLabel} onChange={(e) => setPriceLabel(e.target.value)} placeholder="$4.99" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Sort order</Label>
          <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Stripe Price ID</Label>
          <Input value={stripePriceId} onChange={(e) => setStripePriceId(e.target.value)} placeholder="price_..." />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Stripe Product ID</Label>
          <Input value={stripeProductId} onChange={(e) => setStripeProductId(e.target.value)} placeholder="prod_..." />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={isFree} onCheckedChange={setIsFree} />
        <Label className="text-sm">Free tier (no payment required)</Label>
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1 active:scale-[0.97]" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1 gap-2 active:scale-[0.97]" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving…" : "Save Tier"}
        </Button>
      </div>
    </div>
  );
}

// ── Feature Form ──
function FeatureForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: DbFeature;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [featureKey, setFeatureKey] = useState(initial?.feature_key ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [sortOrder, setSortOrder] = useState(initial?.sort_order?.toString() ?? "0");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!featureKey.trim() || !label.trim()) {
      toast.error("Key and label are required");
      return;
    }
    setSaving(true);
    try {
      const result = await invokeManage({
        action: "upsert_feature",
        id: initial?.id,
        feature_key: featureKey.trim().toLowerCase().replace(/\s+/g, "_"),
        label: label.trim(),
        description: description.trim() || null,
        sort_order: parseInt(sortOrder) || 0,
      });
      // If new feature, create access rows for all tiers (disabled by default)
      if (!initial?.id && result?.id) {
        // We'll rely on the parent to refresh — access rows will be created on toggle
      }
      toast.success(initial ? "Feature updated" : "Feature created");
      onSave();
    } catch (e: any) {
      toast.error(e.message || "Failed to save feature");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Feature key</Label>
          <Input value={featureKey} onChange={(e) => setFeatureKey(e.target.value)} placeholder="unlimited_brands" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Label</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Unlimited Brands" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Description</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Connect as many brands as you want" />
      </div>
      <div className="w-1/3 space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Sort order</Label>
        <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1 active:scale-[0.97]" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1 gap-2 active:scale-[0.97]" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving…" : "Save Feature"}
        </Button>
      </div>
    </div>
  );
}

// ── Main Admin Page ──
export default function ManageTiers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: tiers = [], isLoading: tiersLoading } = useTiers();
  const { data: features = [], isLoading: featuresLoading } = useFeatures();
  const { data: access = [], isLoading: accessLoading } = useFeatureAccess();
  const invalidate = useInvalidateTierData();

  const [tierDialog, setTierDialog] = useState<{ open: boolean; tier?: DbTier }>({ open: false });
  const [featureDialog, setFeatureDialog] = useState<{ open: boolean; feature?: DbFeature }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<{ type: "tier" | "feature"; id: string; name: string } | null>(null);
  const [togglingAccess, setTogglingAccess] = useState<string | null>(null);

  if (!user) {
    navigate("/auth");
    return null;
  }

  const isLoading = tiersLoading || featuresLoading || accessLoading;

  const getAccess = (tierId: string, featureId: string): boolean => {
    const row = access.find((a) => a.tier_id === tierId && a.feature_id === featureId);
    return row?.enabled ?? false;
  };

  const toggleAccess = async (tierId: string, featureId: string, enabled: boolean) => {
    const key = `${tierId}-${featureId}`;
    setTogglingAccess(key);
    try {
      await invokeManage({ action: "set_feature_access", tier_id: tierId, feature_id: featureId, enabled });
      invalidate();
    } catch {
      toast.error("Failed to update");
    } finally {
      setTogglingAccess(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await invokeManage({
        action: deleteTarget.type === "tier" ? "delete_tier" : "delete_feature",
        id: deleteTarget.id,
      });
      toast.success(`${deleteTarget.name} deleted`);
      invalidate();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground active:scale-95 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Manage Plans</h1>
            <p className="text-sm text-muted-foreground">Create tiers, add features, and configure access</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : (
          <Tabs defaultValue="matrix" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="matrix">Feature Matrix</TabsTrigger>
              <TabsTrigger value="tiers">Tiers ({tiers.length})</TabsTrigger>
              <TabsTrigger value="features">Features ({features.length})</TabsTrigger>
            </TabsList>

            {/* ── Feature Matrix ── */}
            <TabsContent value="matrix" className="space-y-4">
              <div className="rounded-2xl border border-border overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky left-0 bg-muted/50 min-w-[200px]">
                        Feature
                      </th>
                      {tiers.map((t) => (
                        <th key={t.id} className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[100px]">
                          <div className="flex flex-col items-center gap-0.5">
                            <span>{t.name}</span>
                            <span className="text-[10px] font-normal">{t.price_label}{!t.is_free && "/mo"}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {features.map((f, i) => (
                      <tr key={f.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "bg-background" : "bg-muted/10"}`}>
                        <td className="px-4 py-3 sticky left-0 bg-inherit">
                          <p className="font-medium">{f.label}</p>
                          <p className="text-xs text-muted-foreground">{f.description}</p>
                        </td>
                        {tiers.map((t) => {
                          const enabled = getAccess(t.id, f.id);
                          const key = `${t.id}-${f.id}`;
                          return (
                            <td key={t.id} className="text-center px-4 py-3">
                              <Switch
                                checked={enabled}
                                onCheckedChange={(val) => toggleAccess(t.id, f.id, val)}
                                disabled={togglingAccess === key}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* ── Tiers Tab ── */}
            <TabsContent value="tiers" className="space-y-4">
              <Button
                className="gap-2 active:scale-[0.97]"
                onClick={() => setTierDialog({ open: true })}
              >
                <Plus className="h-4 w-4" />
                New Tier
              </Button>

              <div className="space-y-3">
                {tiers.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Crown className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{t.name}</p>
                        <Badge variant="outline" className="text-xs">{t.slug}</Badge>
                        {t.is_free && <Badge variant="secondary" className="text-xs">Free</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.price_label}{!t.is_free && "/mo"} · Sort: {t.sort_order}
                        {t.stripe_price_id && ` · ${t.stripe_price_id}`}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 active:scale-[0.95]"
                        onClick={() => setTierDialog({ open: true, tier: t })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive active:scale-[0.95]"
                        onClick={() => setDeleteTarget({ type: "tier", id: t.id, name: t.name })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* ── Features Tab ── */}
            <TabsContent value="features" className="space-y-4">
              <Button
                className="gap-2 active:scale-[0.97]"
                onClick={() => setFeatureDialog({ open: true })}
              >
                <Plus className="h-4 w-4" />
                New Feature
              </Button>

              <div className="space-y-3">
                {features.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Layers className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{f.label}</p>
                        <Badge variant="outline" className="text-xs font-mono">{f.feature_key}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{f.description} · Sort: {f.sort_order}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 active:scale-[0.95]"
                        onClick={() => setFeatureDialog({ open: true, feature: f })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive active:scale-[0.95]"
                        onClick={() => setDeleteTarget({ type: "feature", id: f.id, name: f.label })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Tier Dialog */}
      <Dialog open={tierDialog.open} onOpenChange={(o) => !o && setTierDialog({ open: false })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tierDialog.tier ? "Edit Tier" : "New Tier"}</DialogTitle>
            <DialogDescription>Configure the subscription tier details</DialogDescription>
          </DialogHeader>
          <TierForm
            initial={tierDialog.tier}
            onSave={() => { setTierDialog({ open: false }); invalidate(); }}
            onCancel={() => setTierDialog({ open: false })}
          />
        </DialogContent>
      </Dialog>

      {/* Feature Dialog */}
      <Dialog open={featureDialog.open} onOpenChange={(o) => !o && setFeatureDialog({ open: false })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{featureDialog.feature ? "Edit Feature" : "New Feature"}</DialogTitle>
            <DialogDescription>Configure the feature details</DialogDescription>
          </DialogHeader>
          <FeatureForm
            initial={featureDialog.feature}
            onSave={() => { setFeatureDialog({ open: false }); invalidate(); }}
            onCancel={() => setFeatureDialog({ open: false })}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this {deleteTarget?.type} and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
}
