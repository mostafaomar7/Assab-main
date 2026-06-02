import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../client";
import type { AssetDraft, ExpenseInvoice } from "../types/company";
import type { Page } from "../types";
import { getErrorMessage } from "../errors";
import { queryKeys, type ExpenseFilter } from "./keys";

export function useExpenseInvoices(filter: ExpenseFilter = {}) {
  return useQuery({
    queryKey: queryKeys.expenseInvoices(filter),
    queryFn: async () => {
      const res = await api.get<Page<ExpenseInvoice>>(
        "/company/me/expense-invoices",
        { params: filter },
      );
      return res.data;
    },
  });
}

export function useExpenseInvoiceAttachments(invoiceId: string | null | undefined) {
  return useQuery({
    queryKey: ["expense-invoice", invoiceId, "attachments"] as const,
    enabled: Boolean(invoiceId),
    queryFn: async () => {
      const res = await api.get<unknown>(
        `/company/me/expense-invoices/${invoiceId}/attachments`,
      );
      return res.data;
    },
  });
}

export function useVerifyExpenseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const res = await api.post<ExpenseInvoice>(
        `/company/me/expense-invoices/${invoiceId}/verify`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expense-invoices"] });
      qc.invalidateQueries({ queryKey: ["operations"] });
      toast.success("تم تأكيد الفاتورة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUnverifyExpenseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      await api.delete(`/company/me/expense-invoices/${invoiceId}/verify`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expense-invoices"] });
      toast.success("تم إلغاء التأكيد");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export interface ConvertToAssetPayload {
  invoiceId: string;
  proposedName: string;
  proposedCategoryId?: string;
  proposedBranchId?: string;
  proposedPriceHalalas: number;
  notes?: string;
}

export function useConvertToAssetDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ConvertToAssetPayload) => {
      const res = await api.post<AssetDraft>(
        "/company/me/expense-invoices/convert-to-asset-draft",
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.assetDrafts });
      qc.invalidateQueries({ queryKey: ["expense-invoices"] });
      qc.invalidateQueries({ queryKey: queryKeys.accDashboard });
      toast.success("تم تحويل الفاتورة إلى مسودة أصل");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
