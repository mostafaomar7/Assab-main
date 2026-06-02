import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, downloadBlob } from "../client";
import type { CashCustodyRow, CashTransaction } from "../types/company";
import { getErrorMessage } from "../errors";
import { queryKeys, type CashFilter } from "./keys";

export function useCashCustody(filter: CashFilter = {}) {
  return useQuery({
    queryKey: queryKeys.cashCustody(filter),
    queryFn: async () => {
      const res = await api.get<CashCustodyRow[]>("/company/me/cash-custody", {
        params: filter,
      });
      return res.data;
    },
  });
}

export function useCashTransactions(custodyId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.cashTransactions(custodyId ?? ""),
    enabled: Boolean(custodyId),
    queryFn: async () => {
      const res = await api.get<CashTransaction[]>(
        `/company/me/cash-custody/${custodyId}/transactions`,
      );
      return res.data;
    },
  });
}

export function useSettleCash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      custodyId,
      notes,
    }: {
      custodyId: string;
      notes?: string;
    }) => {
      const res = await api.post<CashCustodyRow>(
        `/company/me/cash-custody/${custodyId}/settle`,
        { notes },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash-custody"] });
      toast.success("تم التسوية");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useApproveCashTxn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      custodyId,
      txnId,
    }: {
      custodyId: string;
      txnId: string;
    }) => {
      const res = await api.post<CashTransaction>(
        `/company/me/cash-custody/${custodyId}/transactions/${txnId}/approve`,
      );
      return res.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.cashTransactions(vars.custodyId),
      });
      qc.invalidateQueries({ queryKey: ["cash-custody"] });
      toast.success("تم اعتماد الحركة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useRejectCashTxn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      custodyId,
      txnId,
      reason,
    }: {
      custodyId: string;
      txnId: string;
      reason: string;
    }) => {
      const res = await api.post<CashTransaction>(
        `/company/me/cash-custody/${custodyId}/transactions/${txnId}/reject`,
        { reason },
      );
      return res.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.cashTransactions(vars.custodyId),
      });
      qc.invalidateQueries({ queryKey: ["cash-custody"] });
      toast.success("تم رفض الحركة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useExportCash() {
  return useMutation({
    mutationFn: async (filter: CashFilter = {}) => {
      await downloadBlob(
        "/company/me/cash-custody/export",
        "cash-custody.xlsx",
        filter,
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
