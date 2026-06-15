import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, type Page } from "../../client";
import { getErrorMessage } from "../../errors";
import type {
  PlatformProcurementItem,
  PlatformProcurementOrder,
  PlatformProcurementOverview,
  PlatformProcurementSupplier,
} from "../../types/platform";
import {
  queryKeys,
  type PlatformProcurementOrdersFilter,
} from "../keys";

// ─── Overview ───────────────────────────────────────────────────────────────
export function useProcurementOverviewPlatform() {
  return useQuery({
    queryKey: queryKeys.platformProcurementOverview,
    queryFn: async () => {
      const res = await api.get<PlatformProcurementOverview>(
        "/company/me/procurement/overview",
      );
      return res.data;
    },
    staleTime: 15_000,
  });
}

// ─── Orders ─────────────────────────────────────────────────────────────────
export function useProcurementOrdersPlatform(
  filter: PlatformProcurementOrdersFilter = {},
) {
  return useQuery({
    queryKey: queryKeys.platformProcurementOrders(filter),
    queryFn: async () => {
      const res = await api.get<
        Page<PlatformProcurementOrder> | PlatformProcurementOrder[]
      >("/company/me/procurement/orders", { params: filter });
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useProcurementOrderPlatform(id?: string) {
  return useQuery({
    queryKey: queryKeys.platformProcurementOrder(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await api.get<PlatformProcurementOrder>(
        `/company/me/procurement/orders/${id}`,
      );
      return res.data;
    },
  });
}

export function useApproveProcurementOrderPlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: { id: string } & Record<string, unknown>) => {
      const res = await api.post<PlatformProcurementOrder>(
        `/company/me/procurement/orders/${id}/approve`,
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "procurement", "orders"] });
      qc.invalidateQueries({
        queryKey: ["platform", "procurement", "overview"],
      });
      toast.success("تم اعتماد الطلب");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useBulkApproveProcurementOrdersPlatform() {
  const qc = useQueryClient();
  return useMutation({
    // Contract 5.3 bulk: POST /company/me/procurement/orders/approve { orderIds?, branch?, supplier? }
    mutationFn: async (body: { orderIds?: string[]; branch?: string; supplier?: string }) => {
      const res = await api.post<{ approved: string[]; count: number }>(
        "/company/me/procurement/orders/approve",
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "procurement", "orders"] });
      qc.invalidateQueries({ queryKey: ["platform", "procurement", "overview"] });
      toast.success("تم اعتماد الطلبات");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useRejectProcurementOrderPlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      reason,
      notes,
    }: {
      id: string;
      reason: string;
      notes?: string;
    }) => {
      const res = await api.post<PlatformProcurementOrder>(
        `/company/me/procurement/orders/${id}/reject`,
        { reason, notes },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "procurement", "orders"] });
      qc.invalidateQueries({
        queryKey: ["platform", "procurement", "overview"],
      });
      toast.success("تم رفض الطلب");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function usePartialRejectProcurementOrderPlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: { id: string } & Record<string, unknown>) => {
      const res = await api.post<PlatformProcurementOrder>(
        `/company/me/procurement/orders/${id}/partial-reject`,
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "procurement", "orders"] });
      toast.success("تم الرفض الجزئي");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useConsolidateProcurementOrdersPlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await api.post<unknown>(
        "/company/me/procurement/orders/consolidate",
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "procurement", "orders"] });
      qc.invalidateQueries({
        queryKey: ["platform", "procurement", "overview"],
      });
      toast.success("تم تجميع الطلبات");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useSendProcurementOrderPlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      ...body
    }: { groupId: string } & Record<string, unknown>) => {
      const res = await api.post<unknown>(
        `/company/me/procurement/orders/grouped/${groupId}/send`,
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "procurement", "orders"] });
      qc.invalidateQueries({
        queryKey: ["platform", "procurement", "overview"],
      });
      toast.success("تم إرسال الطلب للمورد");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Suppliers & items ──────────────────────────────────────────────────────
export function useProcurementSuppliersPlatform() {
  return useQuery({
    queryKey: queryKeys.platformProcurementSuppliers,
    queryFn: async () => {
      const res = await api.get<
        Page<PlatformProcurementSupplier> | PlatformProcurementSupplier[]
      >("/company/me/procurement/suppliers");
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useProcurementItemsPlatform() {
  return useQuery({
    queryKey: queryKeys.platformProcurementItems,
    queryFn: async () => {
      const res = await api.get<
        Page<PlatformProcurementItem> | PlatformProcurementItem[]
      >("/company/me/procurement/items");
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}
