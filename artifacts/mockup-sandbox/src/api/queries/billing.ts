import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, downloadBlob } from "../client";
import type { Page } from "../client";
import { getErrorMessage } from "../errors";
import { queryKeys, type BillingInvoicesFilter } from "./keys";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface BillingSummary {
  currentPlanName?: string;
  status?: string;
  nextInvoiceDate?: string;
  nextInvoiceAmountHalalas?: number;
  totalPaidHalalas?: number;
  defaultPaymentMethod?: PaymentMethod | null;
  outstandingHalalas?: number;
}

export interface BillingInvoice {
  id: string;
  publicId: string;
  status: "paid" | "open" | "overdue" | "void" | string;
  issuedAt: string;
  dueAt?: string;
  paidAt?: string;
  totalHalalas: number;
  amountDueHalalas: number;
  lines?: Array<{
    id?: string;
    description: string;
    quantity?: number;
    unitPriceHalalas?: number;
    totalHalalas: number;
  }>;
}

export interface PaymentMethod {
  id: string;
  type: "card" | "bank" | string;
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
  holderName?: string;
}

export interface BillingAddress {
  companyName?: string;
  taxId?: string;
  vatNumber?: string;
  line1?: string;
  line2?: string;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
}

// ─── Summary ─────────────────────────────────────────────────────────────────
export function useBillingSummary() {
  return useQuery({
    queryKey: queryKeys.billingSummary,
    queryFn: async () => {
      const res = await api.get<BillingSummary>(
        "/company/me/billing/summary",
      );
      return res.data;
    },
    staleTime: 30_000,
  });
}

// ─── Invoices ────────────────────────────────────────────────────────────────
export function useBillingInvoices(filter: BillingInvoicesFilter = {}) {
  return useQuery({
    queryKey: queryKeys.billingInvoices(filter),
    queryFn: async () => {
      const res = await api.get<Page<BillingInvoice>>(
        "/company/me/billing/invoices",
        { params: filter },
      );
      return res.data;
    },
  });
}

export function useBillingInvoice(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.billingInvoice(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await api.get<BillingInvoice>(
        `/company/me/billing/invoices/${id}`,
      );
      return res.data;
    },
  });
}

export function useDownloadInvoicePDF() {
  return useMutation({
    mutationFn: async ({
      id,
      filename,
    }: {
      id: string;
      filename?: string;
    }) => {
      await downloadBlob(
        `/company/me/billing/invoices/${id}/pdf`,
        filename ?? `invoice-${id}.pdf`,
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useExportInvoices() {
  return useMutation({
    mutationFn: async (filter: BillingInvoicesFilter = {}) => {
      const res = await api.get<{ jobId: string; status: string }>(
        "/company/me/billing/invoices/export",
        { params: filter },
      );
      return res.data;
    },
    onSuccess: () => toast.success("جاري تحضير ملف التصدير"),
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function usePayInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      paymentMethodId,
    }: {
      id: string;
      paymentMethodId?: string;
    }) => {
      const res = await api.post<BillingInvoice>(
        `/company/me/billing/invoices/${id}/pay`,
        { paymentMethodId },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing"] });
      toast.success("تم دفع الفاتورة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Payment methods ─────────────────────────────────────────────────────────
export function usePaymentMethods() {
  return useQuery({
    queryKey: queryKeys.paymentMethods,
    queryFn: async () => {
      const res = await api.get<{ data: PaymentMethod[] } | PaymentMethod[]>(
        "/company/me/billing/payment-methods",
      );
      const d = res.data as { data?: PaymentMethod[] } | PaymentMethod[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useAddPaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await api.post<PaymentMethod>(
        "/company/me/billing/payment-methods",
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.paymentMethods });
      toast.success("تم إضافة طريقة الدفع");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useSetDefaultPaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<PaymentMethod>(
        `/company/me/billing/payment-methods/${id}/set-default`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.paymentMethods });
      toast.success("تم تعيين الطريقة الافتراضية");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeletePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/company/me/billing/payment-methods/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.paymentMethods });
      toast.success("تم حذف طريقة الدفع");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Billing address ─────────────────────────────────────────────────────────
export function useBillingAddress() {
  return useQuery({
    queryKey: queryKeys.billingAddress,
    queryFn: async () => {
      const res = await api.get<BillingAddress>(
        "/company/me/billing/address",
      );
      return res.data;
    },
  });
}

export function useUpdateBillingAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: BillingAddress) => {
      const res = await api.put<BillingAddress>(
        "/company/me/billing/address",
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.billingAddress });
      toast.success("تم حفظ عنوان الفاتورة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Async export download ──────────────────────────────────────────────────
export function useDownloadExport() {
  return useMutation({
    mutationFn: async ({
      jobId,
      filename,
    }: {
      jobId: string;
      filename?: string;
    }) => {
      await downloadBlob(
        `/company/me/exports/${jobId}/download`,
        filename ?? `export-${jobId}.xlsx`,
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
