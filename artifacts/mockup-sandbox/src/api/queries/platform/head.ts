import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, type Page } from "../../client";
import { getErrorMessage } from "../../errors";
import type { Operation } from "../../types";
import type {
  PlatformAccountantPerformanceRow,
  PlatformErpBatch,
  PlatformErpPreflight,
  PlatformHeadDashboard,
  PlatformHeadReminder,
} from "../../types/platform";
import {
  queryKeys,
  type PlatformErpFilter,
  type PlatformOpsFilter,
} from "../keys";

// ─── Dashboard ──────────────────────────────────────────────────────────────
export function useHeadDashboardPlatform() {
  return useQuery({
    queryKey: queryKeys.platformHeadDashboard,
    queryFn: async () => {
      const res = await api.get<PlatformHeadDashboard>("/head/dashboard");
      return res.data;
    },
    staleTime: 15_000,
  });
}

export function useAccountantsPerformancePlatform() {
  return useQuery({
    queryKey: queryKeys.platformAccountantsPerformance,
    queryFn: async () => {
      const res = await api.get<
        Page<PlatformAccountantPerformanceRow> | PlatformAccountantPerformanceRow[]
      >("/head/accountants/performance");
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

// ─── Reminders ──────────────────────────────────────────────────────────────
export function useHeadRemindersPlatform() {
  return useQuery({
    queryKey: queryKeys.platformHeadReminders,
    queryFn: async () => {
      const res = await api.get<
        Page<PlatformHeadReminder> | PlatformHeadReminder[]
      >("/head/reminders");
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function usePatchHeadReminderPlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<PlatformHeadReminder> & {
      done?: boolean;
    }) => {
      const res = await api.patch<PlatformHeadReminder>(
        `/head/reminders/${id}`,
        patch,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "head", "reminders"] });
      toast.success("تم تحديث التذكير");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useMarkAllHeadRemindersDonePlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post("/head/reminders/mark-all-done");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "head", "reminders"] });
      toast.success("تم تعليم كل التذكيرات كمنجزة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Operations queues ──────────────────────────────────────────────────────
export function usePendingOperations(
  filter: PlatformOpsFilter = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.platformPendingOperations(filter),
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const res = await api.get<Page<Operation> | Operation[]>(
        "/head/operations/pending",
        { params: filter },
      );
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useFinalApprovedOperations(
  filter: PlatformOpsFilter = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.platformFinalApprovedOperations(filter),
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const res = await api.get<Page<Operation> | Operation[]>(
        "/head/operations/final-approved",
        { params: filter },
      );
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useRejectedOperations(
  filter: PlatformOpsFilter = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.platformRejectedOperations(filter),
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const res = await api.get<Page<Operation> | Operation[]>(
        "/head/operations/rejected",
        { params: filter },
      );
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

// ─── ERP ────────────────────────────────────────────────────────────────────
export function useErpPreflightPlatform() {
  return useQuery({
    queryKey: queryKeys.platformErpPreflight,
    queryFn: async () => {
      const res = await api.get<PlatformErpPreflight>("/head/erp/preflight");
      return res.data;
    },
  });
}

export function useErpEligibleOperationsPlatform(
  filter: PlatformErpFilter = {},
) {
  return useQuery({
    queryKey: queryKeys.platformErpEligibleOperations(filter),
    queryFn: async () => {
      const res = await api.get<Page<Operation> | Operation[]>(
        "/head/erp/eligible-operations",
        { params: filter },
      );
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useErpBatchesPlatform(filter: PlatformErpFilter = {}) {
  return useQuery({
    queryKey: queryKeys.platformErpBatches(filter),
    queryFn: async () => {
      const res = await api.get<Page<PlatformErpBatch> | PlatformErpBatch[]>(
        "/head/erp/batches",
        { params: filter },
      );
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

// ─── Reports ────────────────────────────────────────────────────────────────
export function useReportsInternalPlatform() {
  return useQuery({
    queryKey: queryKeys.platformReportsInternal,
    queryFn: async () => {
      const res = await api.get<unknown>("/head/reports/internal");
      return res.data;
    },
  });
}

export function useReportsOwnerPlatform() {
  return useQuery({
    queryKey: queryKeys.platformReportsOwner,
    queryFn: async () => {
      const res = await api.get<unknown>("/head/reports/owner");
      return res.data;
    },
  });
}
