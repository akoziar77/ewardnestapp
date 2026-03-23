import { useLocation, useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const VERSIONS = ["v1", "v2", "v3"] as const;

export function useVersion() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Extract version from /docs/v2/auth → "v2", default "v1"
  const match = pathname.match(/^\/docs\/(v\d+)/);
  const version = match ? match[1] : "v1";

  const setVersion = (v: string) => {
    if (match) {
      navigate(pathname.replace(/^\/docs\/v\d+/, `/docs/${v}`));
    } else {
      // Current path is unversioned like /docs/webhooks → /docs/v2/webhooks
      const rest = pathname.replace(/^\/docs\/?/, "");
      navigate(`/docs/${v}${rest ? `/${rest}` : ""}`);
    }
  };

  return { version, setVersion };
}

export function VersionSwitcher() {
  const { version, setVersion } = useVersion();

  return (
    <Select value={version} onValueChange={setVersion}>
      <SelectTrigger className="h-8 w-16 text-xs font-mono border-border bg-card">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {VERSIONS.map((v) => (
          <SelectItem key={v} value={v} className="text-xs font-mono">
            {v}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
