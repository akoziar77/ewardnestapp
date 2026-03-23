import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, FileText, SlidersHorizontal, Layout, Footprints } from "lucide-react";

const settingsLinks = [
  { to: "/admin/program-settings/page-access", icon: Shield, label: "Page Access", desc: "Control role-based route permissions" },
  { to: "/admin/program-settings/privacy-policy", icon: FileText, label: "Privacy Policy", desc: "Manage policy versions" },
  { to: "/admin/program-settings/quick-actions", icon: SlidersHorizontal, label: "Quick Actions", desc: "Configure home screen shortcuts" },
  { to: "/admin/program-settings/pages", icon: Layout, label: "Page Directory", desc: "View and label all routes" },
  { to: "/admin/program-settings/onboarding", icon: Footprints, label: "Onboarding", desc: "Edit onboarding flow steps" },
];

export default function AdminProgramSettings() {
  const navigate = useNavigate();

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Program Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your loyalty program behaviour.</p>
      </div>

      <div className="grid gap-3">
        {settingsLinks.map(({ to, icon: Icon, label, desc }) => (
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
