import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, downloadBlob } from "../client";
import type {
  InventoryBranchRow,
  InventoryCatalogResponse,
  InventoryItemDef,
  InventoryItemRow,
} from "../types/company";
import { getErrorMessage } from "../errors";
import { queryKeys, type InventoryBranchesFilter } from "./keys";

export function useInventoryBranches(filter: InventoryBranchesFilter = {}) {
  return useQuery({
    queryKey: queryKeys.inventoryBranches(filter),
    queryFn: async () => {
      const res = await api.get<InventoryBranchRow[]>(
        "/company/me/inventory/branches",
        { params: filter },
      );
      return res.data;
    },
  });
}

export function useInventoryCatalog() {
  return useQuery({
    queryKey: queryKeys.inventoryCatalog,
    queryFn: async () => {
      const res = await api.get<InventoryCatalogResponse>(
        "/company/me/inventory/items",
      );
      return res.data;
    },
    staleTime: 60_000,
  });
}

export function useSaveInventoryCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: InventoryItemDef[]) => {
      const res = await api.post<InventoryCatalogResponse>(
        "/company/me/inventory/items",
        { items },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventoryCatalog });
      toast.success("تم حفظ كتالوج الأصناف");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useFlagInventoryBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      branchId,
      flagged,
      note,
    }: {
      branchId: string;
      flagged: boolean;
      note?: string;
    }) => {
      await api.post(`/company/me/inventory/branches/${branchId}/flag`, {
        flagged,
        note,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", "branches"] });
      toast.success("تم تحديث حالة الفرع");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useFlagInventoryItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      branchId,
      itemIds,
    }: {
      branchId: string;
      itemIds: string[];
    }) => {
      await api.post(
        `/company/me/inventory/branches/${branchId}/flag-items`,
        { itemIds },
      );
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.dailyInventoryList(vars.branchId),
      });
      qc.invalidateQueries({ queryKey: ["inventory", "branches"] });
      toast.success("تم تمييز الأصناف");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useSendInventoryNotification() {
  return useMutation({
    mutationFn: async ({
      branchId,
      message,
    }: {
      branchId: string;
      message?: string;
    }) => {
      await api.post(
        `/company/me/inventory/branches/${branchId}/send-notification`,
        { message },
      );
    },
    onSuccess: () => toast.success("تم إرسال الإشعار للفرع"),
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useMarkInventoryConfirmed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (branchId: string) => {
      await api.post(
        `/company/me/inventory/branches/${branchId}/mark-confirmed`,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", "branches"] });
      toast.success("تم تأكيد المخزون");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDailyInventoryList(branchId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.dailyInventoryList(branchId ?? ""),
    enabled: Boolean(branchId),
    queryFn: async () => {
      const res = await api.get<{ items: InventoryItemRow[] }>(
        `/company/me/branches/${branchId}/inventory-list`,
      );
      return res.data;
    },
  });
}

export function useSaveDailyInventoryList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      branchId,
      items,
    }: {
      branchId: string;
      items: Array<{ id: string; currQty: number; flagged?: boolean }>;
    }) => {
      const res = await api.put<{ items: InventoryItemRow[] }>(
        `/company/me/branches/${branchId}/inventory-list`,
        { items },
      );
      return res.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.dailyInventoryList(vars.branchId),
      });
      qc.invalidateQueries({ queryKey: ["inventory", "branches"] });
      toast.success("تم حفظ قائمة المخزون");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Daily reconciliation + variance allocation ──────────────────────────────
export interface DailyReconciliationAllocation {
  employeeId: string;
  employeeName: string;
  qty: number;
  valueHalalas: number;
}

export interface DailyReconciliationItem {
  itemId: string;
  itemName: string;
  unit?: string;
  expectedQty: number;
  actualQty: number;
  varianceQty: number;
  variancePct: number;
  varianceValueHalalas: number;
  status: "ok" | "flagged" | string;
  allocatedTo: DailyReconciliationAllocation[];
}

export interface DailyReconciliationResponse {
  branchId: string;
  branchName: string;
  date: string;
  items: DailyReconciliationItem[];
  totalVarianceValueHalalas: number;
  unassignedVarianceValueHalalas: number;
}

export function useDailyReconciliation(
  branchId: string | null | undefined,
  date?: string,
) {
  return useQuery({
    queryKey: ["accountant", "inventory", "daily-reconciliation", branchId, date] as const,
    enabled: Boolean(branchId),
    queryFn: async () => {
      const res = await api.get<DailyReconciliationResponse>(
        `/accountant/inventory/branches/${branchId}/daily-reconciliation`,
        { params: date ? { date } : undefined },
      );
      return res.data;
    },
    staleTime: 30_000,
  });
}

export interface DailyVarianceAllocationPayload {
  date: string;
  items: Array<{
    itemId: string;
    allocations: Array<{ employeeId: string; qty: number }>;
  }>;
}

export function useSaveDailyVarianceAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      branchId,
      payload,
    }: {
      branchId: string;
      payload: DailyVarianceAllocationPayload;
    }) => {
      const res = await api.post<DailyReconciliationResponse>(
        `/accountant/inventory/branches/${branchId}/daily-variance-allocation`,
        payload,
      );
      return res.data;
    },
    onSuccess: (data, vars) => {
      qc.setQueryData(
        ["accountant", "inventory", "daily-reconciliation", vars.branchId, vars.payload.date],
        data,
      );
      qc.invalidateQueries({ queryKey: ["accountant", "inventory"] });
      toast.success("تم حفظ توزيع الفروق");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Section 1.8: Inventory bulk Excel export ─────────────────────────────
export function useExportInventory() {
  return useMutation({
    mutationFn: async (
      filter: {
        brandId?: string;
        branchId?: string;
        date?: string;
        format?: "xlsx" | "csv";
      } = {},
    ) => {
      const fmt = filter.format ?? "xlsx";
      await downloadBlob(
        "/company/me/inventory/export",
        `inventory-variance.${fmt}`,
        { ...filter, format: fmt },
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
