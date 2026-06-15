import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, type Page } from "../../client";
import { getErrorMessage } from "../../errors";
import type {
  PlatformBranchEmployee,
  PlatformBranchOverview,
  PlatformBranchReportType,
  PlatformBranchSettings,
  PlatformBranchUploadStatus,
} from "../../types/platform";
import { queryKeys } from "../keys";

// ─── Overview ───────────────────────────────────────────────────────────────
export function useBranchOverviewPlatform() {
  return useQuery({
    queryKey: queryKeys.platformBranchOverview,
    queryFn: async () => {
      const res = await api.get<PlatformBranchOverview>("/company/me/branch/overview");
      return res.data;
    },
    staleTime: 15_000,
  });
}

// ─── Uploads ────────────────────────────────────────────────────────────────
export function useBranchUploadStatusPlatform() {
  return useQuery({
    queryKey: queryKeys.platformBranchUploadStatus,
    queryFn: async () => {
      const res = await api.get<PlatformBranchUploadStatus>(
        "/company/me/branch/upload/status",
      );
      return res.data;
    },
  });
}

export function useBranchUploadPlatform() {
  const qc = useQueryClient();
  return useMutation({
    // FormData is allowed — keep body loose to support multipart.
    mutationFn: async ({
      reportType,
      body,
    }: {
      reportType: PlatformBranchReportType;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      body: any;
    }) => {
      const res = await api.post<unknown>(`/company/me/branch/upload/${reportType}`, body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["platform", "branch", "upload", "status"],
      });
      qc.invalidateQueries({ queryKey: ["platform", "branch", "overview"] });
      toast.success("تم رفع الملف");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Employees ──────────────────────────────────────────────────────────────
export function useBranchEmployeesPlatform() {
  return useQuery({
    queryKey: queryKeys.platformBranchEmployees,
    queryFn: async () => {
      const res = await api.get<
        Page<PlatformBranchEmployee> | PlatformBranchEmployee[]
      >("/company/me/branch/employees");
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useAddBranchEmployeePlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      body: Partial<PlatformBranchEmployee> & { name: string; empNumber: string },
    ) => {
      const res = await api.post<PlatformBranchEmployee>(
        "/company/me/branch/employees",
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "branch", "employees"] });
      toast.success("تم إضافة الموظف");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Inventory items & suppliers ────────────────────────────────────────────
export function useBranchInventoryItemsPlatform() {
  return useQuery({
    queryKey: queryKeys.platformBranchInventoryItems,
    queryFn: async () => {
      const res = await api.get<unknown>("/company/me/branch/inventory-items");
      return res.data;
    },
  });
}

export function useBranchSuppliersPlatform() {
  return useQuery({
    queryKey: queryKeys.platformBranchSuppliers,
    queryFn: async () => {
      const res = await api.get<unknown>("/company/me/branch/suppliers");
      return res.data;
    },
  });
}

// ─── Settings ───────────────────────────────────────────────────────────────
export function useBranchSettingsPlatform() {
  return useQuery({
    queryKey: queryKeys.platformBranchSettings,
    queryFn: async () => {
      const res = await api.get<PlatformBranchSettings>("/company/me/branch/settings");
      return res.data;
    },
  });
}

export function useUpdateBranchSettingsPlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<PlatformBranchSettings>) => {
      const res = await api.patch<PlatformBranchSettings>(
        "/company/me/branch/settings",
        patch,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "branch", "settings"] });
      toast.success("تم تحديث الإعدادات");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Asset / inventory confirmations ────────────────────────────────────────
export function useConfirmBranchAssetPlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<unknown>(`/company/me/branch/assets/${id}/confirm`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "branch", "overview"] });
      toast.success("تم تأكيد الأصل");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useReconfirmBranchInventoryPlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<unknown>(`/company/me/branch/inventory/${id}/reconfirm`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "branch", "overview"] });
      toast.success("تم تأكيد الجرد");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
