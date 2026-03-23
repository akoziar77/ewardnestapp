import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Receipt, Gift, Store, TrendingUp, ArrowUpRight } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const [brands, receipts, rewards, merchants] = await Promise.all([
        supabase.from("brands").select("id", { count: "exact", head: true }),
        supabase.from("receipt_uploads").select("id", { count: "exact", head: true }),
        supabase.from("rewards").select("id", { count: "exact", head: true }),
        supabase.from("merchants").select("id", { count: "exact", head: true }),
      ]);
      return {
        brands: brands.count ?? 0,
        receipts: receipts.count ?? 0,
        rewards: rewards.count ?? 0,
        merchants: merchants.count ?? 0,
      };
    },
  });

  const cards = [
    { label: "Total Users", value: stats?.merchants, icon: Users },
    { label: "Partner Brands", value: stats?.brands, icon: Store },
    { label: "Receipts", value: stats?.receipts, icon: Receipt },
    { label: "Rewards Redeemed", value: stats?.rewards, icon: Gift },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">
          Overview of your loyalty program performance.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{label}</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className="text-3xl font-bold tabular-nums text-foreground">
                      {value?.toLocaleString() ?? "0"}
                    </p>
                  )}
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rn-gold/10">
                  <Icon className="h-5 w-5 text-rn-gold" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick activity placeholder */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
            <TrendingUp className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">Activity feed coming soon</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Recent transactions, user signups, and system events will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
