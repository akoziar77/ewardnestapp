import { Navigate, Outlet, useLocation } from "react-router-dom";

export function ProtectedRoute({
  signedIn,
  roles,
  required,
}: {
  signedIn: boolean;
  roles: string[];
  required?: string[];
}) {
  const loc = useLocation();
  if (!signedIn) return <Navigate to="/auth" state={{ from: loc }} replace />;
  // Admin always passes
  if (roles.includes("admin")) return <Outlet />;
  // Users with no roles assigned yet are treated as "user" level
  const effectiveRoles = roles.length > 0 ? roles : ["user"];
  if (required && !required.some((r) => effectiveRoles.includes(r)))
    return <Navigate to="/" replace />;
  return <Outlet />;
}
