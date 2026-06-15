import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../client";
import { getErrorMessage } from "../errors";
import { queryKeys } from "./keys";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface BranchOverviewResponse {
  branch: {
    id: string;
    name: string;
    brandName?: string;
    city?: string;
    monthlyTargetHalalas?: number;
    monthlySalesHalalas?: number;
    monthlyExpensesHalalas?: number;
  };
  kpis?: Record<string, number | string>;
  todayUploads?: { count: number; missing: string[] };
  activeShift?: { id?: string; supervisorName?: string; startedAt?: string };
}

export interface BranchEmployee {
  id: string;
  name: string;
  role?: string;
  active: boolean;
  salaryHalalas?: number;
  startedAt?: string;
}

export interface BranchItem {
  id: string;
  name: string;
  unit?: string;
  category?: string;
  currQty?: number;
  prevQty?: number;
  lastCountedAt?: string;
}

export interface BranchPurchaseRequest {
  id: string;
  publicId?: string;
  itemName?: string;
  qty?: number;
  unit?: string;
  supplierName?: string;
  status: "draft" | "submitted" | "approved" | "rejected" | string;
  createdAt: string;
}

export interface BranchSupplier {
  id: string;
  name: string;
  category?: string;
  phone?: string;
  isPreferred?: boolean;
  isActive: boolean;
}

export interface BranchSettings {
  branchId?: string;
  branchName?: string;
  brandName?: string;
  managerName?: string;
  city?: string;
  address?: string;
  phone?: string;
  uploadTime?: string;
  [k: string]: unknown;
}

export interface BranchActiveShift {
  id?: string;
  supervisorUserId?: string;
  supervisorName?: string;
  startedAt?: string;
  status?: string;
  registerOpeningHalalas?: number;
}

// ─── Queries ─────────────────────────────────────────────────────────────────
export function useBranchOverview() {
  return useQuery({
    queryKey: queryKeys.branchOverview,
    queryFn: async () => {
      const res = await api.get<BranchOverviewResponse>(
        "/company/me/branch/overview",
      );
      return res.data;
    },
    staleTime: 15_000,
  });
}

export function useBranchEmployees() {
  return useQuery({
    queryKey: queryKeys.branchEmployees,
    queryFn: async () => {
      const res = await api.get<{ data: BranchEmployee[] } | BranchEmployee[]>(
        "/company/me/branch/employees",
      );
      const d = res.data as { data?: BranchEmployee[] } | BranchEmployee[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useBranchItems() {
  return useQuery({
    queryKey: queryKeys.branchItems,
    queryFn: async () => {
      const res = await api.get<{ data: BranchItem[] } | BranchItem[]>(
        "/company/me/branch/items",
      );
      const d = res.data as { data?: BranchItem[] } | BranchItem[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useBranchPurchaseRequests() {
  return useQuery({
    queryKey: queryKeys.branchPurchaseRequests,
    queryFn: async () => {
      const res = await api.get<
        { data: BranchPurchaseRequest[] } | BranchPurchaseRequest[]
      >("/company/me/branch/purchase-requests");
      const d = res.data as
        | { data?: BranchPurchaseRequest[] }
        | BranchPurchaseRequest[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useBranchSuppliers() {
  return useQuery({
    queryKey: queryKeys.branchSuppliers,
    queryFn: async () => {
      const res = await api.get<{ data: BranchSupplier[] } | BranchSupplier[]>(
        "/company/me/branch/suppliers",
      );
      const d = res.data as { data?: BranchSupplier[] } | BranchSupplier[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useBranchSettings() {
  return useQuery({
    queryKey: queryKeys.branchSettings,
    queryFn: async () => {
      const res = await api.get<BranchSettings>(
        "/company/me/branch/settings",
      );
      return res.data;
    },
  });
}

export function useUpdateBranchSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<BranchSettings>) => {
      const res = await api.put<BranchSettings>(
        "/company/me/branch/settings",
        patch,
      );
      return res.data;
    },
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.branchSettings, data);
      toast.success("تم حفظ إعدادات الفرع");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useBranchActiveShift() {
  return useQuery({
    queryKey: queryKeys.branchActiveShift,
    queryFn: async () => {
      const res = await api.get<BranchActiveShift | null>(
        "/company/me/branch/shifts/active",
      );
      return res.data;
    },
    staleTime: 10_000,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────
export function useBranchSubmitItemsCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      counts: Array<{ itemId: string; qty: number }>;
      countedAt?: string;
      notes?: string;
    }) => {
      const res = await api.post<{ accepted: number; rejected: number }>(
        "/company/me/branch/items/count",
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.branchItems });
      toast.success("تم تسجيل الجرد");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useBranchUpload() {
  const qc = useQueryClient();
  return useMutation({
    // Contract 4.1: flat multipart daily upload (sales/expenses + optional attachments).
    mutationFn: async (body: {
      reportType: string;
      date?: string;
      salesHalalas?: number;
      shift?: string;
      expensesHalalas?: number;
      expenseNote?: string;
      file?: File;
    }) => {
      const fd = new FormData();
      fd.append("reportType", body.reportType);
      if (body.date) fd.append("date", body.date);
      if (body.salesHalalas != null) fd.append("salesHalalas", String(body.salesHalalas));
      if (body.shift) fd.append("shift", body.shift);
      if (body.expensesHalalas != null) fd.append("expensesHalalas", String(body.expensesHalalas));
      if (body.expenseNote) fd.append("expenseNote", body.expenseNote);
      if (body.file) fd.append("attachments[]", body.file);
      const res = await api.post<{ createdOperationId?: string; status?: string }>(
        "/company/me/branch/upload",
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.branchOverview });
      toast.success("تم رفع البيانات للمحاسب");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useBranchSignAttachment() {
  return useMutation({
    mutationFn: async (body: {
      filename: string;
      mimeType: string;
      sizeBytes: number;
      reportType?: string;
    }) => {
      const res = await api.post<{
        attachmentId: string;
        uploadUrl: string;
        fields?: Record<string, string>;
      }>("/company/me/branch/upload/sign-attachment", body);
      return res.data;
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useCreateBranchPurchaseRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      itemName: string;
      qty: number;
      unit?: string;
      priority?: "normal" | "urgent";
      notes?: string;
    }) => {
      const res = await api.post<BranchPurchaseRequest>(
        "/company/me/branch/purchase-requests",
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.branchPurchaseRequests });
      toast.success("تم إرسال طلب الشراء");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useBranchRequestNewSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      category?: string;
      phone?: string;
      notes?: string;
    }) => {
      const res = await api.post<BranchSupplier>(
        "/company/me/branch/suppliers/request-new",
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.branchSuppliers });
      toast.success("تم إرسال طلب إضافة المورد");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useBranchOpenShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      supervisorUserId?: string;
      registerOpeningHalalas?: number;
      notes?: string;
    } = {}) => {
      const res = await api.post<BranchActiveShift>(
        "/company/me/branch/shifts/open",
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.branchActiveShift });
      qc.invalidateQueries({ queryKey: queryKeys.branchOverview });
      toast.success("تم فتح الشفت");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useBranchCloseShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      registerClosingHalalas,
      notes,
    }: {
      id: string;
      registerClosingHalalas?: number;
      notes?: string;
    }) => {
      const res = await api.post<BranchActiveShift>(
        `/company/me/branch/shifts/${id}/close`,
        { registerClosingHalalas, notes },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.branchActiveShift });
      qc.invalidateQueries({ queryKey: queryKeys.branchOverview });
      toast.success("تم إغلاق الشفت");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
