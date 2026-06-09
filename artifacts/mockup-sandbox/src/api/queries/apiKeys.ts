import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../client";
import { getErrorMessage } from "../errors";

// ─── Section 3.3: API keys for 3rd-party integrations ──────────────────────

export type ApiKeyScope =
  | "operations:read"
  | "operations:write"
  | "reports:read"
  | "inventory:read"
  | "inventory:write";

export interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  scopes: ApiKeyScope[];
  lastUsedAt?: string | null;
  createdAt: string;
  expiresAt?: string | null;
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  key: string;
  scopes: ApiKeyScope[];
  expiresAt?: string | null;
}

const KEY = ["company", "me", "api-keys"] as const;

export function useApiKeys() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await api.get<{ data: ApiKeyRow[] }>(
        "/company/me/api-keys",
      );
      return res.data.data;
    },
    staleTime: 30_000,
  });
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      scopes: ApiKeyScope[];
      expiresInDays?: number;
    }) => {
      const res = await api.post<CreateApiKeyResponse>(
        "/company/me/api-keys",
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("تم إنشاء المفتاح — انسخه الآن، لن يظهر مرة أخرى");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/company/me/api-keys/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("تم إلغاء المفتاح");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
