import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import type { RoleKey } from "../api/types";

/**
 * Returns true when the current user has the given permission key
 * in their /auth/me permissions map. Falls back to false when no user.
 */
export function useHasPermission(key: string): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(key);
}

/**
 * Returns true when the current user's role matches any of the given roles.
 */
export function useIsRole(...roles: RoleKey[]): boolean {
  const { isRole } = useAuth();
  return isRole(...roles);
}

/**
 * <RequirePermission permission="users.create"> children </RequirePermission>
 * Renders children only when the user has the permission; otherwise renders fallback (or null).
 */
export function RequirePermission({
  permission,
  fallback = null,
  children,
}: {
  permission: string;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const allowed = useHasPermission(permission);
  return allowed ? <>{children}</> : <>{fallback}</>;
}

/**
 * <RequireRole roles={["admin","head"]}> children </RequireRole>
 */
export function RequireRole({
  roles,
  fallback = null,
  children,
}: {
  roles: RoleKey[];
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const allowed = useIsRole(...roles);
  return allowed ? <>{children}</> : <>{fallback}</>;
}
