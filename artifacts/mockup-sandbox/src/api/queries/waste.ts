import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, downloadBlob } from "../client";
import type {
  WasteAllocation,
  WasteEntry,
  WasteProductRow,
} from "../types/company";
import type { Page } from "../types";
import { getErrorMessage } from "../errors";
import { queryKeys, type WasteFilter } from "./keys";

export function useWaste(filter: WasteFilter = {}) {
  return useQuery({
    queryKey: queryKeys.waste(filter),
    queryFn: async () => {
      const res = await api.get<Page<WasteEntry>>("/company/me/waste", {
        params: filter,
      });
      return res.data;
    },
  });
}

export function usePatchWasteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      entryId,
      productIdx,
      patch,
    }: {
      entryId: string;
      productIdx: number;
      patch: Partial<
        Pick<WasteProductRow, "classification" | "responsibility" | "qty" | "totalHalalas">
      >;
    }) => {
      const res = await api.patch<WasteEntry>(
        `/company/me/waste/${entryId}/products/${productIdx}`,
        patch,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["waste"] });
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function usePutWasteAllocations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      entryId,
      productIdx,
      allocations,
    }: {
      entryId: string;
      productIdx: number;
      allocations: WasteAllocation[];
    }) => {
      const res = await api.put<WasteEntry>(
        `/company/me/waste/${entryId}/products/${productIdx}/allocations`,
        { allocations },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["waste"] });
      toast.success("تم حفظ التوزيع");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useApproveWaste() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const res = await api.post<WasteEntry>(
        `/company/me/waste/${entryId}/approve`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["waste"] });
      qc.invalidateQueries({ queryKey: queryKeys.accDashboard });
      toast.success("تم اعتماد سجل الهدر");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useRejectWaste() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      entryId,
      reason,
      notes,
    }: {
      entryId: string;
      reason: string;
      notes?: string;
    }) => {
      const res = await api.post<WasteEntry>(
        `/company/me/waste/${entryId}/reject`,
        { reason, notes },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["waste"] });
      toast.success("تم رفض السجل");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useBulkApproveWaste() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entryIds: string[]) => {
      const res = await api.post<{ approved: string[]; failed: string[] }>(
        "/company/me/waste/bulk-approve",
        { entryIds },
      );
      return res.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["waste"] });
      toast.success(`تم اعتماد ${data.approved.length} سجل`);
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useExportWaste() {
  return useMutation({
    mutationFn: async (filter: WasteFilter = {}) => {
      await downloadBlob("/company/me/waste/export", "waste.xlsx", filter);
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
