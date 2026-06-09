import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../client";
import { getErrorMessage } from "../errors";
import { setTokens } from "../tokens";
import type { LoginResponse } from "../types";

// ─── Section 3.2: SSO (SAML / OIDC) ────────────────────────────────────────

export type SsoProvider = "saml" | "oidc";

export interface SsoConfig {
  enabled: boolean;
  provider: SsoProvider | null;
  metadataUrl?: string;
  entityId?: string;
  x509cert?: string;
  oidcIssuer?: string;
  oidcClientId?: string;
  defaultRole?: "accountant" | "head" | "branch" | "procurement" | string;
}

export interface UpdateSsoBody {
  provider: SsoProvider;
  enabled?: boolean;
  oidcIssuer?: string;
  oidcClientId?: string;
  oidcClientSecret?: string;
  metadataUrl?: string;
  metadata?: string;
  entityId?: string;
  x509cert?: string;
  defaultRole?: "accountant" | "head" | "branch" | "procurement";
}

const KEY = ["company", "me", "sso"] as const;

export function useSsoConfig() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await api.get<SsoConfig>("/company/me/sso");
      return res.data;
    },
    staleTime: 60_000,
  });
}

export function useUpdateSso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateSsoBody) => {
      const res = await api.put<SsoConfig>("/company/me/sso", body);
      return res.data;
    },
    onSuccess: (data) => {
      qc.setQueryData(KEY, data);
      toast.success("تم حفظ إعدادات SSO");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDisableSso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.delete("/company/me/sso");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("تم إيقاف SSO");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// OIDC callback (public — not behind bearer). Stores tokens on success.
export async function ssoCallback(body: {
  companyId: string;
  code: string;
  redirectUri: string;
}): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>("/auth/sso/oidc/callback", body);
  setTokens({
    accessToken: res.data.accessToken,
    refreshToken: res.data.refreshToken,
  });
  return res.data;
}
