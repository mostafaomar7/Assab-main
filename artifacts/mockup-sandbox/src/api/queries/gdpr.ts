import {
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../client";
import { getErrorMessage } from "../errors";

// ─── Section 3.4: GDPR / PDPL data export + account deletion ───────────────

export interface DataExportJobInit {
  jobId: string;
  status: "queued";
}

export interface DataExportJobStatus {
  jobId: string;
  status: "queued" | "processing" | "ready" | "failed" | string;
  downloadUrl?: string | null;
  expiresAt?: string | null;
}

export function useRequestDataExport() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<DataExportJobInit>(
        "/users/me/data-export",
      );
      return res.data;
    },
    onSuccess: () => toast.success("تم بدء تصدير بياناتك — سنخطرك عند الجاهزية"),
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDataExportJob(
  jobId: string | null | undefined,
  opts: { pollMs?: number } = {},
) {
  return useQuery({
    queryKey: ["users", "me", "data-export", jobId] as const,
    enabled: Boolean(jobId),
    queryFn: async () => {
      const res = await api.get<DataExportJobStatus>(
        `/users/me/data-export/${jobId}`,
      );
      return res.data;
    },
    refetchInterval: (q) => {
      const status = (q.state.data as DataExportJobStatus | undefined)?.status;
      if (status === "ready" || status === "failed") return false;
      return opts.pollMs ?? 5000;
    },
  });
}

export interface AccountDeletionRequestResponse {
  requestId: string;
  scheduledFor: string;
}

export function useRequestAccountDeletion() {
  return useMutation({
    mutationFn: async (body: { reason?: string; confirmEmail: string }) => {
      const res = await api.post<AccountDeletionRequestResponse>(
        "/users/me/account-deletion-request",
        body,
      );
      return res.data;
    },
    onSuccess: (d) =>
      toast.success(`تم تسجيل طلب الحذف — مجدول في ${d.scheduledFor}`),
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
