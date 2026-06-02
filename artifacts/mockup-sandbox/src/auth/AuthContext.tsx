import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
} from "../api/auth";
import { getTokens, clearTokens } from "../api/tokens";
import { disconnectEcho, getEcho } from "../api/echo";
import type {
  AppNotification,
  LoginResponse,
  MeResponse,
  RoleKey,
} from "../api/types";

interface OperationStatusChangedEvent {
  operationId: string;
  from: string;
  to: string;
  by: { id: string; name: string };
}

interface NotificationNewEvent extends AppNotification {}

interface AuthContextValue {
  user: MeResponse | null;
  /** True while we're checking the bootstrap session (first /auth/me). */
  initializing: boolean;
  /** True while the login mutation is in-flight. */
  loggingIn: boolean;
  /** Backend-suggested landing page from the most recent login. Null after refresh-only sessions. */
  defaultPage: string | null;
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  hasPermission: (key: string) => boolean;
  isRole: (...roles: RoleKey[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [defaultPage, setDefaultPage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Bootstrap: if we have a stored token, try /auth/me.
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      const t = getTokens();
      if (!t?.accessToken) {
        setInitializing(false);
        return;
      }
      try {
        const me = await fetchMe();
        if (!cancelled) setUser(me);
      } catch {
        // Token invalid / network. Clear and route to login.
        clearTokens();
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  // Listen for forced-logout signal from the axios 401 interceptor.
  useEffect(() => {
    const handler = () => {
      setUser(null);
      setDefaultPage(null);
      disconnectEcho();
      queryClient.clear();
    };
    window.addEventListener("asab:auth:logout", handler);
    return () => window.removeEventListener("asab:auth:logout", handler);
  }, [queryClient]);

  // ─── Realtime subscriptions (Echo + Pusher) ────────────────────────────────
  // Skips silently when VITE_PUSHER_APP_KEY is not configured (getEcho returns null).
  useEffect(() => {
    if (!user) return;
    const echo = getEcho();
    if (!echo) return;

    // Personal notification channel
    const userChannel = echo.private(`notifications.user.${user.id}`);
    userChannel.listen(".notification.new", (e: NotificationNewEvent) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast(e.title, { description: e.body });
    });

    // Company-wide operations channel (only for company-scoped users)
    let companyChannel: ReturnType<typeof echo.private> | null = null;
    if (user.companyId) {
      companyChannel = echo.private(`operations.company.${user.companyId}`);
      companyChannel.listen(".operation.created", () => {
        queryClient.invalidateQueries({ queryKey: ["operations"] });
        queryClient.invalidateQueries({ queryKey: ["accountant", "dashboard"] });
      });
      companyChannel.listen(".operation.status_changed", (_e: OperationStatusChangedEvent) => {
        queryClient.invalidateQueries({ queryKey: ["operations"] });
        queryClient.invalidateQueries({ queryKey: ["accountant", "dashboard"] });
      });
      companyChannel.listen(".approval.pending", () => {
        queryClient.invalidateQueries({ queryKey: ["accountant", "dashboard"] });
      });
    }

    return () => {
      echo.leave(`notifications.user.${user.id}`);
      if (user.companyId) {
        echo.leave(`operations.company.${user.companyId}`);
      }
    };
  }, [user, queryClient]);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoggingIn(true);
      try {
        const res = await apiLogin(email, password);
        // Hydrate the full me-record (with permissions) immediately.
        const me = await fetchMe();
        setUser(me);
        setDefaultPage(res.defaultPage || null);
        return res;
      } finally {
        setLoggingIn(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
      setDefaultPage(null);
      disconnectEcho();
    }
  }, []);

  const refreshMe = useCallback(async () => {
    const me = await fetchMe();
    setUser(me);
  }, []);

  const hasPermission = useCallback(
    (key: string) => Boolean(user?.permissions?.[key]),
    [user],
  );

  const isRole = useCallback(
    (...roles: RoleKey[]) => Boolean(user && roles.includes(user.role)),
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      loggingIn,
      defaultPage,
      login,
      logout,
      refreshMe,
      hasPermission,
      isRole,
    }),
    [user, initializing, loggingIn, defaultPage, login, logout, refreshMe, hasPermission, isRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
