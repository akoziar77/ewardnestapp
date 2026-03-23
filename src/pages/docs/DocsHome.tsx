import { Link } from "react-router-dom";
import { Webhook, Zap, KeyRound, Shield, Code2, FlaskConical } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const cards = [
  { title: "Authentication", desc: "OAuth 2.0 flows, token management, and session handling.", icon: Shield, path: "/docs/auth" },
  { title: "API Keys", desc: "Generate, rotate, and scope API keys for your integration.", icon: KeyRound, path: "/docs/api-keys" },
  { title: "Webhooks", desc: "Subscribe to events, verify signatures, and handle deliveries.", icon: Webhook, path: "/docs/webhooks" },
  { title: "Events", desc: "Browse the event catalog and understand payload schemas.", icon: Zap, path: "/docs/events" },
  { title: "Node SDK", desc: "Install and use the official Node.js SDK.", icon: Code2, path: "/docs/sdk-node" },
  { title: "Testing", desc: "Sandbox environment, test events, and debugging tools.", icon: FlaskConical, path: "/docs/testing" },
];

export default function DocsHome() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Developer Documentation</h1>
        <p className="mt-2 text-muted-foreground text-base leading-relaxed max-w-2xl">
          Integrate with the RewardsNest platform. Subscribe to real-time events, manage loyalty data, and build custom experiences for your customers.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.path} to={c.path} className="group">
            <Card className="h-full transition-shadow hover:shadow-md border-border">
              <CardHeader className="flex flex-row items-start gap-3 p-5">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <c.icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base group-hover:text-primary transition-colors">{c.title}</CardTitle>
                  <CardDescription className="text-sm">{c.desc}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
