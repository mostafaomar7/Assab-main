import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../client";
import { getErrorMessage } from "../errors";

// ─── Section 3.5: Outbound webhooks (tenant subscribes to ASAB events) ─────

export type WebhookEvent =
  | "operation.created"
  | "operation.status_changed"
  | "invoice.created"
  | "invoice.paid"
  | "subscription.updated";

// NOTE: webhook objects use snake_case `secret_prefix` on the wire (per backend).
export interface WebhookRow {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret_prefix: string;
  isActive: boolean;
  description?: string;
  lastTriggeredAt?: string | null;
  failureCount: number;
}

export interface CreateWebhookResponse {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret: string; // shown once
  isActive: boolean;
}

export interface WebhookDelivery {
  id: string;
  event: string;
  statusCode?: number;
  error?: string;
  response?: string;
  attemptedAt: string;
}

const KEY = ["company", "me", "webhooks"] as const;

export function useWebhooks() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await api.get<{ data: WebhookRow[] }>(
        "/company/me/webhooks",
      );
      return res.data.data;
    },
    staleTime: 30_000,
  });
}

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      url: string;
      events: WebhookEvent[];
      description?: string;
    }) => {
      const res = await api.post<CreateWebhookResponse>(
        "/company/me/webhooks",
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("تم إنشاء الـ webhook — انسخ الـ secret الآن");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUpdateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: {
      id: string;
      url?: string;
      events?: WebhookEvent[];
      isActive?: boolean;
    }) => {
      const res = await api.patch<WebhookRow>(
        `/company/me/webhooks/${id}`,
        patch,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("تم تحديث الـ webhook");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/company/me/webhooks/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("تم حذف الـ webhook");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: async ({
      id,
      event,
    }: { id: string; event?: WebhookEvent }) => {
      const res = await api.post<{
        delivered: boolean;
        statusCode?: number;
        error?: string;
      }>(`/company/me/webhooks/${id}/test`, event ? { event } : {});
      return res.data;
    },
    onSuccess: (d) =>
      d.delivered
        ? toast.success("تم التسليم بنجاح")
        : toast.warning(`فشل التسليم${d.statusCode ? ` (${d.statusCode})` : ""}`),
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useWebhookDeliveries(
  id: string | null | undefined,
  filter: { page?: number; pageSize?: number } = {},
) {
  return useQuery({
    queryKey: ["company", "me", "webhooks", id, "deliveries", filter] as const,
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await api.get<{
        data: WebhookDelivery[];
        meta: { page: number; pageSize: number; total: number; totalPages: number };
      }>(`/company/me/webhooks/${id}/deliveries`, { params: filter });
      return res.data;
    },
  });
}
