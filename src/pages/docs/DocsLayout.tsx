import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Book, Webhook, Zap, KeyRound, Shield, Code2, FileText, FlaskConical, ChevronLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const sections = [
  { label: "Getting Started", path: "/docs", icon: Book, end: true },
  { label: "Authentication", path: "/docs/auth", icon: Shield },
  { label: "API Keys", path: "/docs/api-keys", icon: KeyRound },
  { label: "Webhooks", path: "/docs/webhooks", icon: Webhook },
  { label: "Events", path: "/docs/events", icon: Zap },
  { label: "Node SDK", path: "/docs/sdk-node", icon: Code2 },
  { label: "Testing", path: "/docs/testing", icon: FlaskConical },
  { label: "Changelog", path: "/docs/changelog", icon: FileText },
];

export default function DocsLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center h-14 px-4 gap-4">
          <NavLink to="/" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-sm">
            <ChevronLeft className="h-4 w-4" />
            App
          </NavLink>
          <div className="h-5 w-px bg-border" />
          <span className="font-semibold text-foreground tracking-tight">RewardsNest Developer Portal</span>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        {/* Sidebar */}
        <aside className="hidden md:block w-56 shrink-0 border-r border-border">
          <ScrollArea className="h-[calc(100vh-3.5rem)] py-6 px-3">
            <nav className="flex flex-col gap-0.5">
              {sections.map((s) => (
                <NavLink
                  key={s.path}
                  to={s.path}
                  end={s.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )
                  }
                >
                  <s.icon className="h-4 w-4 shrink-0" />
                  {s.label}
                </NavLink>
              ))}
            </nav>
          </ScrollArea>
        </aside>

        {/* Mobile nav */}
        <div className="md:hidden border-b border-border overflow-x-auto">
          <div className="flex gap-1 px-4 py-2">
            {sections.map((s) => (
              <NavLink
                key={s.path}
                to={s.path}
                end={s.end}
                className={({ isActive }) =>
                  cn(
                    "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )
                }
              >
                {s.label}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 min-w-0 px-6 py-8 md:px-10 md:py-10">
          <div className="max-w-3xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
