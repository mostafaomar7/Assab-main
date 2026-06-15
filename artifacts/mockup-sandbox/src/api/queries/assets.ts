import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, downloadBlob } from "../client";
import type {
  Asset,
  AssetDraft,
  AssetImportResult,
} from "../types/company";
import type { Page } from "../types";
import { getErrorMessage } from "../errors";
import { queryKeys, type AssetFilter } from "./keys";

export function useAssets(filter: AssetFilter = {}) {
  return useQuery({
    queryKey: queryKeys.assets(filter),
    queryFn: async () => {
      const res = await api.get<Page<Asset>>("/company/me/assets", {
        params: filter,
      });
      return res.data;
    },
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    // Contract 2.1: { name, category, branchId, invNum?, priceHalalas (or cost), usefulLifeMonths, custodian?, notes? }
    mutationFn: async (payload: {
      name: string;
      category: string;
      branchId: string;
      invNum?: string;
      priceHalalas: number;
      usefulLifeMonths: number;
      custodian?: string;
      notes?: string;
    }) => {
      const res = await api.post<Asset>("/company/me/assets", payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      toast.success("تم إضافة الأصل");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function usePatchAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      // Contract 2.4: { status?, bookValueHalalas?, branchId?, custodian?, note?, name?, category? }
      patch: Partial<Asset> & {
        bookValueHalalas?: number;
        custodian?: string;
        note?: string;
        category?: string;
        status?: string;
      };
    }) => {
      const res = await api.patch<Asset>(`/company/me/assets/${id}`, patch);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      toast.success("تم تحديث الأصل");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useImportAssets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post<AssetImportResult>(
        "/company/me/assets/import",
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return res.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      toast.success(`تم استيراد ${data.createdRows} أصل من ${data.parsedRows}`);
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Asset Drafts (from expense conversions) ─────────────────────────────────
export function useAssetDrafts() {
  return useQuery({
    queryKey: queryKeys.assetDrafts,
    queryFn: async () => {
      const res = await api.get<AssetDraft[]>("/company/me/asset-drafts");
      return res.data;
    },
  });
}

export function useConfirmAssetDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      draftId,
      overrides,
    }: {
      draftId: string;
      overrides?: Partial<Asset>;
    }) => {
      const res = await api.post<Asset>(
        `/company/me/asset-drafts/${draftId}/confirm`,
        overrides,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.assetDrafts });
      qc.invalidateQueries({ queryKey: ["assets"] });
      toast.success("تم تأكيد المسودة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDiscardAssetDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draftId: string) => {
      await api.post(`/company/me/asset-drafts/${draftId}/discard`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.assetDrafts });
      toast.success("تم تجاهل المسودة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useExportAssets() {
  return useMutation({
    mutationFn: async (
      filter: { format?: "xlsx" | "csv"; category?: string; branchId?: string } = {},
    ) => {
      const fmt = filter.format ?? "xlsx";
      await downloadBlob(
        "/company/me/assets/export",
        `assets.${fmt}`,
        { ...filter, format: fmt },
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
