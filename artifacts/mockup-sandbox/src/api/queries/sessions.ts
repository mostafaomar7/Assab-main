import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../client";
import { getErrorMessage, ApiError } from "../errors";
import { resendForgotPassword } from "../auth";

/**
 * A single active session for the current user.
 * Shape per `GET /auth/sessions` (BACKEND_API_SPEC §4 / sessions table).
 */
export interface UserSession {
  id: string;
  /** Friendly device/user-agent label (e.g. "Chrome on Windows"). */
  device: string;
  /** Last known IP address (IPv4/IPv6). */
  ip: string;
  /** ISO timestamp of last activity. */
  lastUsedAt: string;
  /** True for the session that issued the current bearer token. */
  current: boolean;
}

/** Centralized query key for sessions. */
const sessionsKey = ["auth", "sessions"] as const;

/** GET /auth/sessions — list active sessions for the current user. */
export function useSessions() {
  return useQuery({
    queryKey: sessionsKey,
    queryFn: async () => {
      const res = await api.get<{ data: UserSession[] }>("/auth/sessions");
      return res.data.data;
    },
    staleTime: 30_000,
  });
}

/** DELETE /auth/sessions/{id} — revoke a specific session. */
export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/auth/sessions/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sessionsKey });
      toast.success("تم إنهاء الجلسة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

/** POST /auth/forgot-password/resend — resend reset link (rate-limited). */
export function useResendForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => resendForgotPassword(email),
    onSuccess: () => toast.success("تم إعادة إرسال رابط الاستعادة"),
    onError: (e) => {
      const code = (e as ApiError)?.code;
      if (code === "RATE_LIMITED") {
        toast.warning("يرجى الانتظار قبل إعادة المحاولة");
      } else {
        toast.error(getErrorMessage(e, "ar"));
      }
    },
  });
}
