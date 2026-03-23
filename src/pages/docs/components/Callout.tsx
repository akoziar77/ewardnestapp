import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const variants = {
  info: { icon: Info, bg: "bg-primary/5 border-primary/20", text: "text-primary" },
  warning: { icon: AlertTriangle, bg: "bg-secondary/10 border-secondary/30", text: "text-secondary" },
  success: { icon: CheckCircle2, bg: "bg-success/10 border-success/30", text: "text-success" },
};

interface Props {
  type?: keyof typeof variants;
  title?: string;
  children: ReactNode;
}

export function Callout({ type = "info", title, children }: Props) {
  const v = variants[type];
  return (
    <div className={cn("rounded-lg border p-4 my-4 flex gap-3", v.bg)}>
      <v.icon className={cn("h-5 w-5 mt-0.5 shrink-0", v.text)} />
      <div className="text-sm leading-relaxed">
        {title && <p className="font-semibold mb-1">{title}</p>}
        {children}
      </div>
    </div>
  );
}
