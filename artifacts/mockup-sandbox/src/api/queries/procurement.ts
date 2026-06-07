import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, downloadBlob } from "../client";
import { getErrorMessage } from "../errors";
import { queryKeys, type ProcurementOrdersFilter } from "./keys";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface ProcurementOverviewResponse {
  kpis?: Record<string, number | string>;
  pendingCount?: number;
  groupedCount?: number;
  sentCount?: number;
  topSuppliers?: Array<{
    id: string;
    name: string;
    ordersCount: number;
    totalHalalas: number;
  }>;
  recentOrders?: ProcurementOrder[];
}

export interface ProcurementOrder {
  id: string;
  publicId?: string;
  supplierId?: string;
  supplierName?: string;
  branchId?: string;
  branchName?: string;
  brandName?: string;
  status: "draft" | "approved" | "rejected" | "sent" | string;
  totalHalalas: number;
  itemsCount?: number;
  createdAt: string;
  approvedAt?: string;
  sentAt?: string;
  items?: ProcurementOrderItem[];
}

export interface ProcurementOrderItem {
  id?: string;
  itemId: string;
  itemName?: string;
  qty: number;
  unit?: string;
  unitPriceHalalas?: number;
  totalHalalas?: number;
  notes?: string;
}

export interface ProcurementGroupedOrder {
  groupId: string;
  supplierId: string;
  supplierName: string;
  ordersCount: number;
  branchesCount?: number;
  totalHalalas: number;
  orders?: ProcurementOrder[];
}

export interface ProcurementItem {
  id: string;
  name: string;
  category?: string;
  unit?: string;
  lastPriceHalalas?: number;
  avgPriceHalalas?: number;
  preferredSupplierName?: string;
  isActive?: boolean;
}

export interface ItemPriceHistoryRow {
  date: string;
  supplierName?: string;
  pricePerUnitHalalas: number;
  qty?: number;
}

export interface ProcurementSupplier {
  id: string;
  name: string;
  category?: string;
  phone?: string;
  email?: string;
  rating?: number;
  ratingsCount?: number;
  ordersCount?: number;
  isActive: boolean;
  isPreferred?: boolean;
}

export interface ProcurementReport {
  key: string;
  title: string;
  titleEn?: string;
  description?: string;
  availableFormats: ("pdf" | "xlsx" | "csv")[];
}

// ─── Overview ────────────────────────────────────────────────────────────────
export function useProcurementOverview() {
  return useQuery({
    queryKey: queryKeys.procurementOverview,
    queryFn: async () => {
      const res = await api.get<ProcurementOverviewResponse>(
        "/company/me/procurement/overview",
      );
      return res.data;
    },
    staleTime: 15_000,
  });
}

// ─── Orders ──────────────────────────────────────────────────────────────────
export function useProcurementOrders(filter: ProcurementOrdersFilter = {}) {
  return useQuery({
    queryKey: queryKeys.procurementOrders(filter),
    queryFn: async () => {
      const res = await api.get<
        { data: ProcurementOrder[] } | ProcurementOrder[]
      >("/company/me/procurement/orders", { params: filter });
      const d = res.data as
        | { data?: ProcurementOrder[] }
        | ProcurementOrder[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useGroupedOrders() {
  return useQuery({
    queryKey: queryKeys.procurementGroupedOrders,
    queryFn: async () => {
      const res = await api.get<
        { data: ProcurementGroupedOrder[] } | ProcurementGroupedOrder[]
      >("/company/me/procurement/orders/grouped");
      const d = res.data as
        | { data?: ProcurementGroupedOrder[] }
        | ProcurementGroupedOrder[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useSentOrders() {
  return useQuery({
    queryKey: queryKeys.procurementSentOrders,
    queryFn: async () => {
      const res = await api.get<
        { data: ProcurementOrder[] } | ProcurementOrder[]
      >("/company/me/procurement/orders/sent");
      const d = res.data as
        | { data?: ProcurementOrder[] }
        | ProcurementOrder[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useCreateProcurementOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      supplierId?: string;
      branchId?: string;
      items: ProcurementOrderItem[];
      notes?: string;
    }) => {
      const res = await api.post<ProcurementOrder>(
        "/company/me/procurement/orders",
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procurement", "orders"] });
      qc.invalidateQueries({ queryKey: queryKeys.procurementOverview });
      toast.success("تم إنشاء الأمر");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeleteProcurementOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/company/me/procurement/orders/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procurement", "orders"] });
      qc.invalidateQueries({ queryKey: queryKeys.procurementOverview });
      toast.success("تم حذف الأمر");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<ProcurementOrder>) => {
      const res = await api.patch<ProcurementOrder>(
        `/company/me/procurement/orders/${id}`,
        patch,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procurement", "orders"] });
      toast.success("تم تحديث الأمر");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useApproveOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<ProcurementOrder>(
        `/company/me/procurement/orders/${id}/approve`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procurement", "orders"] });
      qc.invalidateQueries({ queryKey: queryKeys.procurementOverview });
      toast.success("تم اعتماد الأمر");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useRejectOrder() {
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
      const res = await api.post<ProcurementOrder>(
        `/company/me/procurement/orders/${id}/reject`,
        { reason, notes },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procurement", "orders"] });
      toast.success("تم رفض الأمر");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useSendGroupedOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      const res = await api.post<{ sentOrderIds: string[] }>(
        `/company/me/procurement/orders/grouped/${groupId}/send`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.procurementGroupedOrders });
      qc.invalidateQueries({ queryKey: queryKeys.procurementSentOrders });
      qc.invalidateQueries({ queryKey: queryKeys.procurementOverview });
      toast.success("تم إرسال الأوامر المجمعة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Items ───────────────────────────────────────────────────────────────────
export function useProcurementItems() {
  return useQuery({
    queryKey: queryKeys.procurementItems,
    queryFn: async () => {
      const res = await api.get<
        { data: ProcurementItem[] } | ProcurementItem[]
      >("/company/me/procurement/items");
      const d = res.data as
        | { data?: ProcurementItem[] }
        | ProcurementItem[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useItemPriceHistory(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.itemPriceHistory(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await api.get<
        { data: ItemPriceHistoryRow[] } | ItemPriceHistoryRow[]
      >(`/company/me/procurement/items/${id}/price-history`);
      const d = res.data as
        | { data?: ItemPriceHistoryRow[] }
        | ItemPriceHistoryRow[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useCreateProcurementItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<ProcurementItem>) => {
      const res = await api.post<ProcurementItem>(
        "/company/me/procurement/items",
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.procurementItems });
      toast.success("تم إضافة الصنف");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeleteProcurementItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/company/me/procurement/items/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.procurementItems });
      toast.success("تم حذف الصنف");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUpdateProcurementItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<ProcurementItem>) => {
      const res = await api.patch<ProcurementItem>(
        `/company/me/procurement/items/${id}`,
        patch,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.procurementItems });
      toast.success("تم تحديث الصنف");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Suppliers ───────────────────────────────────────────────────────────────
export function useProcurementSuppliers() {
  return useQuery({
    queryKey: queryKeys.procurementSuppliers,
    queryFn: async () => {
      const res = await api.get<
        { data: ProcurementSupplier[] } | ProcurementSupplier[]
      >("/company/me/suppliers");
      const d = res.data as
        | { data?: ProcurementSupplier[] }
        | ProcurementSupplier[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<ProcurementSupplier>) => {
      const res = await api.post<ProcurementSupplier>(
        "/company/me/suppliers",
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.procurementSuppliers });
      toast.success("تم إضافة المورد");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<ProcurementSupplier>) => {
      const res = await api.patch<ProcurementSupplier>(
        `/company/me/suppliers/${id}`,
        patch,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.procurementSuppliers });
      toast.success("تم تحديث المورد");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useRateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      rating,
      comment,
    }: {
      id: string;
      rating: number;
      comment?: string;
    }) => {
      const res = await api.post<ProcurementSupplier>(
        `/company/me/suppliers/${id}/ratings`,
        { rating, comment },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.procurementSuppliers });
      toast.success("تم حفظ التقييم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useToggleSupplierActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<ProcurementSupplier>(
        `/company/me/suppliers/${id}/toggle-active`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.procurementSuppliers });
      toast.success("تم تحديث حالة المورد");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Reports ─────────────────────────────────────────────────────────────────
export function useProcurementReports() {
  return useQuery({
    queryKey: queryKeys.procurementReports,
    queryFn: async () => {
      const res = await api.get<
        { data: ProcurementReport[] } | ProcurementReport[]
      >("/company/me/procurement/reports");
      const d = res.data as
        | { data?: ProcurementReport[] }
        | ProcurementReport[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
    staleTime: 60_000,
  });
}

export function useDownloadProcurementReport() {
  return useMutation({
    mutationFn: async ({
      key,
      format = "pdf",
      filename,
    }: {
      key: string;
      format?: "pdf" | "xlsx" | "csv";
      filename?: string;
    }) => {
      await downloadBlob(
        `/company/me/procurement/reports/${key}/download`,
        filename ?? `${key}.${format}`,
        { format },
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useExportProcurementItems() {
  return useMutation({
    mutationFn: async (format: "xlsx" | "csv" = "xlsx") => {
      await downloadBlob(
        "/company/me/procurement/items/export",
        `procurement-items.${format}`,
        { format },
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useExportSuppliers() {
  return useMutation({
    mutationFn: async (format: "xlsx" | "csv" = "xlsx") => {
      await downloadBlob(
        "/company/me/suppliers/export",
        `suppliers.${format}`,
        { format },
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
