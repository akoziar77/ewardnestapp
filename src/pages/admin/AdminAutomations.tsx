import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Webhook, Activity } from "lucide-react";

const automationLinks = [
  { to: "/admin/automations/webhooks", icon: Webhook, label: "Webhooks", desc: "Manage webhook subscriptions and deliveries" },
  { to: "/admin/automations/events", icon: Activity, label: "Event Explorer", desc: "Browse the event log and replay events" },
];

export default function AdminAutomations() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Webhooks, events, and automated workflows.</p>
      </div>

      <div className="grid gap-3">
        {automationLinks.map(({ to, icon: Icon, label, desc }) => (
          <Card
            key={to}
            className="cursor-pointer hover:bg-muted/50 transition-colors active:scale-[0.98]"
            onClick={() => navigate(to)}
          >
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium">{label}</p>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
