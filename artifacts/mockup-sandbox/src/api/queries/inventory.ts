import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../client";
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
