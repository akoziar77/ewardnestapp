import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminRewardsPage() {
  const { data: rewards, isLoading } = useQuery({
    queryKey: ["admin-rewards-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rewards")
        .select("id, title, points_cost, active, inventory, merchant_id, merchants(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rewards</h1>
        <p className="text-sm text-muted-foreground mt-1">All rewards across merchants.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reward</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead className="text-right">Inventory</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rewards?.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell className="text-muted-foreground">{r.merchants?.name ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.points_cost}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.inventory ?? "∞"}</TableCell>
                    <TableCell>
                      <Badge variant={r.active ? "default" : "secondary"}>
                        {r.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {rewards?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                      No rewards created yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
