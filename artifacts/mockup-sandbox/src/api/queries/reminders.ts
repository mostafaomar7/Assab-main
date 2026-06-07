import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, downloadBlob } from "../client";
import type { Reminder } from "../types/company";
import { getErrorMessage } from "../errors";
import { queryKeys } from "./keys";

export function useReminders() {
  return useQuery({
    queryKey: queryKeys.reminders,
    queryFn: async () => {
      const res = await api.get<Reminder[]>("/company/me/accountant/reminders");
      return res.data;
    },
  });
}

export function usePatchReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<Reminder, "done" | "title" | "description" | "dueAt" | "priority">>;
    }) => {
      const res = await api.patch<Reminder>(
        `/company/me/accountant/reminders/${id}`,
        patch,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.reminders });
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export interface CreateReminderPayload {
  title: string;
  description: string;
  dueAt: string;
  priority: Reminder["priority"];
  scope?: Reminder["scope"];
  branchId?: string | null;
  brandId?: string | null;
}

export function useCreateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateReminderPayload) => {
      const res = await api.post<Reminder>(
        "/company/me/accountant/reminders",
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.reminders });
      toast.success("تم إضافة التذكير");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/company/me/accountant/reminders/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.reminders });
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useExportAccReminders() {
  return useMutation({
    mutationFn: async (format: "xlsx" | "csv" = "xlsx") => {
      await downloadBlob(
        "/company/me/accountant/reminders/export",
        `accountant-reminders.${format}`,
        { format },
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export interface BroadcastReminderPayload {
  messageAr: string;
  messageEn?: string;
  audience:
    | "all-branch-managers"
    | "all-accountants"
    | "all-suppliers"
    | "specific-branches";
  branchIds?: string[];
}

export function useBroadcastReminder() {
  return useMutation({
    mutationFn: async (payload: BroadcastReminderPayload) => {
      const res = await api.post<{
        sentCount: number;
        failedCount: number;
        broadcastId: string;
      }>("/reminders/broadcast", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`تم إرسال البث لـ ${data.sentCount} مستلم`);
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
