import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../client";
import { getErrorMessage } from "../errors";
import { queryKeys, type SupportTicketsFilter } from "./keys";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface SupportChannel {
  key: string;
  type: "chat" | "phone" | "email" | "whatsapp" | string;
  label: string;
  labelEn?: string;
  value?: string;
  hours?: string;
  badge?: string;
  isAvailable?: boolean;
}

export interface SupportTicket {
  id: string;
  publicId?: string;
  subject: string;
  category?: string;
  priority?: "low" | "normal" | "high" | "urgent" | string;
  status: "open" | "pending" | "resolved" | "closed" | string;
  body?: string;
  openerId?: string;
  openerName?: string;
  createdAt: string;
  updatedAt?: string;
  messages?: SupportMessage[];
  attachments?: SupportAttachment[];
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  body: string;
  authorType: "company" | "agent" | "system" | string;
  authorName?: string;
  createdAt: string;
}

export interface SupportAttachment {
  id: string;
  ticketId: string;
  filename: string;
  url?: string;
  sizeBytes?: number;
  mimeType?: string;
}

// ─── Channels ────────────────────────────────────────────────────────────────
export function useSupportChannels() {
  return useQuery({
    queryKey: queryKeys.supportChannels,
    queryFn: async () => {
      const res = await api.get<{ data: SupportChannel[] } | SupportChannel[]>(
        "/company/me/support/channels",
      );
      const d = res.data as { data?: SupportChannel[] } | SupportChannel[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
    staleTime: 60_000,
  });
}

// ─── Tickets ─────────────────────────────────────────────────────────────────
export function useSupportTickets(filter: SupportTicketsFilter = {}) {
  return useQuery({
    queryKey: queryKeys.supportTickets(filter),
    queryFn: async () => {
      const res = await api.get<{ data: SupportTicket[] } | SupportTicket[]>(
        "/company/me/support/tickets",
        { params: filter },
      );
      const d = res.data as { data?: SupportTicket[] } | SupportTicket[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useSupportTicket(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.supportTicket(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await api.get<SupportTicket>(
        `/company/me/support/tickets/${id}`,
      );
      return res.data;
    },
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      subject: string;
      category?: string;
      priority?: string;
      body: string;
    }) => {
      const res = await api.post<SupportTicket>(
        "/company/me/support/tickets",
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support", "tickets"] });
      toast.success("تم إرسال طلب الدعم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useReplyToTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      const res = await api.post<SupportMessage>(
        `/company/me/support/tickets/${id}/reply`,
        { body },
      );
      return res.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.supportTicket(vars.id) });
      qc.invalidateQueries({ queryKey: ["support", "tickets"] });
      toast.success("تم إرسال الرد");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useCloseTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<SupportTicket>(
        `/company/me/support/tickets/${id}/close`,
      );
      return res.data;
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.supportTicket(id) });
      qc.invalidateQueries({ queryKey: ["support", "tickets"] });
      toast.success("تم إغلاق التذكرة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUploadTicketAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post<SupportAttachment>(
        `/company/me/support/tickets/${id}/attachments`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return res.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.supportTicket(vars.id) });
      toast.success("تم رفع المرفق");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
