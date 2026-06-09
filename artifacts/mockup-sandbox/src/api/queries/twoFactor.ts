import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../client";
import { getErrorMessage } from "../errors";

// ─── Section 3.1: Two-factor authentication ────────────────────────────────

export type TwoFactorMethod = "totp" | "sms";

export interface TwoFactorSetupTotp {
  secret: string;
  qrCodeUrl: string;
}

export interface TwoFactorSetupSms {
  sentTo: string;
}

export type TwoFactorSetupResponse = TwoFactorSetupTotp | TwoFactorSetupSms;

export interface TwoFactorVerifyResponse {
  backupCodes: string[];
}

export interface TwoFactorStatus {
  enabled: boolean;
  method: TwoFactorMethod | null;
  backupCodesRemaining: number;
}

const STATUS_KEY = ["users", "me", "2fa-status"] as const;

export function useTwoFactorStatus() {
  return useQuery({
    queryKey: STATUS_KEY,
    queryFn: async () => {
      const res = await api.get<TwoFactorStatus>("/users/me/2fa-status");
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useSetup2FA() {
  return useMutation({
    mutationFn: async (method: TwoFactorMethod) => {
      const res = await api.post<TwoFactorSetupResponse>(
        "/auth/2fa/setup",
        { method },
      );
      return res.data;
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useVerify2FA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const res = await api.post<TwoFactorVerifyResponse>(
        "/auth/2fa/verify",
        { code },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STATUS_KEY });
      toast.success("تم تفعيل المصادقة الثنائية");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDisable2FA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      await api.post("/auth/2fa/disable", { code });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STATUS_KEY });
      toast.success("تم إيقاف المصادقة الثنائية");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
