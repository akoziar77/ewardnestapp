import { Card, CardContent } from "@/components/ui/card";
import { Plug } from "lucide-react";

export default function AdminIntegrations() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Connect external services and APIs.</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
            <Plug className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium">No integrations configured</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Integrations with third-party loyalty providers, POS systems, and payment platforms will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
