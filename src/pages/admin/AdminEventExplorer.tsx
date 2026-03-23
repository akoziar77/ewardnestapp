import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Search, RotateCcw, Radio, AlertTriangle, CheckCircle2, XCircle, Clock, Filter } from "lucide-react";

type EventLogRow = {
  id: string;
  event_type: string;
  source: string;
  actor_id: string | null;
  brand_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

type DeliveryRow = {
  id: string;
  subscription_id: string;
  event_id: string;
  attempt_number: number;
  status: string;
  response_status: number | null;
  response_body: string | null;
  error_message: string | null;
  created_at: string;
};

type DlqRow = {
  id: string;
  event_id: string;
  subscription_id: string;
  error_message: string | null;
  failed_at: string;
  payload: Record<string, unknown>;
};

export default function AdminEventExplorer() {
  const { toast } = useToast();
  const [events, setEvents] = useState<EventLogRow[]>([]);
  const [eventTypes, setEventTypes] = useState<{ event_key: string; description: string | null }[]>([]);
  const [selected, setSelected] = useState<EventLogRow | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [dlq, setDlq] = useState<DlqRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [replaying, setReplaying] = useState(false);

  const [filters, setFilters] = useState({
    event_type: "",
    brand_id: "",
    actor_id: "",
  });

  const loadEventTypes = useCallback(async () => {
    const { data } = await supabase.from("event_types").select("event_key, description");
    setEventTypes(data ?? []);
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("event_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (filters.event_type) query = query.eq("event_type", filters.event_type);
    if (filters.brand_id) query = query.eq("brand_id", filters.brand_id);
    if (filters.actor_id) query = query.eq("actor_id", filters.actor_id);

    const { data } = await query;
    setEvents((data as EventLogRow[]) ?? []);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    loadEventTypes();
    loadEvents();
  }, [loadEventTypes, loadEvents]);

  async function openEvent(ev: EventLogRow) {
    setSelected(ev);
    const [{ data: deliveryLogs }, { data: dlqEntries }] = await Promise.all([
      supabase
        .from("webhook_delivery_log")
        .select("*")
        .eq("event_id", ev.id)
        .order("created_at", { ascending: false }),
      supabase.from("dlq_events").select("*").eq("event_id", ev.id),
    ]);
    setDeliveries((deliveryLogs as DeliveryRow[]) ?? []);
    setDlq((dlqEntries as DlqRow[]) ?? []);
  }

  async function replayEvent() {
    if (!selected) return;
    setReplaying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("event_replay_queue").insert({
        event_id: selected.id,
        requested_by: user?.id ?? null,
      });
      toast({ title: "Replay queued", description: `Event ${selected.id.slice(0, 8)}… queued for replay.` });
    } catch {
      toast({ title: "Replay failed", variant: "destructive" });
    } finally {
      setReplaying(false);
    }
  }

  function statusIcon(status: string) {
    switch (status) {
      case "success": return <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />;
      case "failed": case "dead": return <XCircle className="h-4 w-4 text-destructive" />;
      case "retrying": return <RotateCcw className="h-4 w-4 text-secondary" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  }

  function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case "success": return "default";
      case "failed": case "dead": return "destructive";
      case "retrying": return "secondary";
      default: return "outline";
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Event Explorer</h1>
        <p className="text-sm text-muted-foreground mt-1">Inspect events, webhook deliveries, and dead-letter queue entries.</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1 min-w-[180px]">
              <label className="text-xs font-medium text-muted-foreground">Event Type</label>
              <Select value={filters.event_type} onValueChange={(v) => setFilters((f) => ({ ...f, event_type: v === "__all__" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All types</SelectItem>
                  {eventTypes.map((t) => (
                    <SelectItem key={t.event_key} value={t.event_key}>{t.event_key}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 min-w-[180px]">
              <label className="text-xs font-medium text-muted-foreground">Brand ID</label>
              <Input placeholder="Filter by brand…" value={filters.brand_id} onChange={(e) => setFilters((f) => ({ ...f, brand_id: e.target.value }))} />
            </div>
            <div className="space-y-1 min-w-[180px]">
              <label className="text-xs font-medium text-muted-foreground">Actor / User ID</label>
              <Input placeholder="Filter by user…" value={filters.actor_id} onChange={(e) => setFilters((f) => ({ ...f, actor_id: e.target.value }))} />
            </div>
            <Button size="sm" onClick={loadEvents} className="gap-1.5">
              <Filter className="h-4 w-4" /> Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Event list */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Radio className="h-4 w-4" /> Events</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {loading ? (
                <div className="p-4 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
              ) : events.length === 0 ? (
                <p className="p-6 text-center text-muted-foreground text-sm">No events found.</p>
              ) : (
                events.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => openEvent(ev)}
                    className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors ${selected?.id === ev.id ? "bg-muted" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-foreground">{ev.event_type}</span>
                      <Badge variant="outline" className="text-[10px] font-normal">{ev.source}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleString()}</span>
                  </button>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Detail panel */}
        <Card className="lg:col-span-3">
          <CardContent className="pt-6">
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-[560px] text-muted-foreground gap-2">
                <Search className="h-8 w-8" />
                <p className="text-sm">Select an event to inspect</p>
              </div>
            ) : (
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-5">
                  {/* Meta */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Type</span><p className="font-medium">{selected.event_type}</p></div>
                    <div><span className="text-muted-foreground">Source</span><p className="font-medium capitalize">{selected.source}</p></div>
                    <div><span className="text-muted-foreground">Timestamp</span><p className="font-medium">{new Date(selected.created_at).toLocaleString()}</p></div>
                    <div><span className="text-muted-foreground">ID</span><p className="font-mono text-xs break-all">{selected.id}</p></div>
                    <div><span className="text-muted-foreground">Brand</span><p className="font-mono text-xs">{selected.brand_id ?? "—"}</p></div>
                    <div><span className="text-muted-foreground">Actor</span><p className="font-mono text-xs">{selected.actor_id ?? "—"}</p></div>
                  </div>

                  <Separator />

                  {/* Payload */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Payload</h4>
                    <pre className="bg-muted rounded-lg p-3 text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto text-foreground">
                      {JSON.stringify(selected.payload, null, 2)}
                    </pre>
                  </div>

                  <Separator />

                  {/* Deliveries */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Webhook Deliveries ({deliveries.length})</h4>
                    {deliveries.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No delivery attempts.</p>
                    ) : (
                      <div className="space-y-2">
                        {deliveries.map((d) => (
                          <div key={d.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                            {statusIcon(d.status)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant={statusVariant(d.status)} className="text-[10px]">{d.status}</Badge>
                                {d.response_status && <span className="text-xs text-muted-foreground">HTTP {d.response_status}</span>}
                                <span className="text-xs text-muted-foreground">Attempt #{d.attempt_number}</span>
                              </div>
                              {d.error_message && <p className="text-xs text-destructive mt-0.5 truncate">{d.error_message}</p>}
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(d.created_at).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* DLQ */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-destructive" /> Dead Letter Queue ({dlq.length})
                    </h4>
                    {dlq.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No DLQ entries.</p>
                    ) : (
                      <div className="space-y-2">
                        {dlq.map((d) => (
                          <div key={d.id} className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                            <p className="text-xs font-medium text-destructive">{d.error_message ?? "Unknown error"}</p>
                            <span className="text-[10px] text-muted-foreground">{new Date(d.failed_at).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Replay */}
                  <Button onClick={replayEvent} disabled={replaying} variant="outline" className="gap-1.5">
                    <RotateCcw className="h-4 w-4" /> {replaying ? "Queuing…" : "Replay Event"}
                  </Button>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
