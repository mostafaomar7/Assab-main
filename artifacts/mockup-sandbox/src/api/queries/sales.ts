import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, downloadBlob } from "../client";
import type {
  SalesDetails,
  SalesVarianceAssignmentPayload,
} from "../types/company";
import { getErrorMessage } from "../errors";
import { queryKeys } from "./keys";

export function useSalesDetails(operationId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.salesDetails(operationId ?? ""),
    enabled: Boolean(operationId),
    queryFn: async () => {
      const res = await api.get<SalesDetails>(
        `/operations/${operationId}/sales-details`,
      );
      return res.data;
    },
  });
}

export function usePatchSalesDetails() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      operationId,
      payload,
    }: {
      operationId: string;
      payload: Partial<SalesDetails>;
    }) => {
      const res = await api.patch<SalesDetails>(
        `/operations/${operationId}/sales-details`,
        payload,
      );
      return res.data;
    },
    onSuccess: (details) => {
      qc.setQueryData(queryKeys.salesDetails(details.operationId), details);
      qc.invalidateQueries({ queryKey: ["operations"] });
      toast.success("تم حفظ التعديلات");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useAssignSalesVariance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      operationId,
      payload,
    }: {
      operationId: string;
      payload: SalesVarianceAssignmentPayload;
    }) => {
      const res = await api.post(
        `/operations/${operationId}/sales-variance/assign`,
        payload,
      );
      return res.data;
    },
    onSuccess: (_data, { operationId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.salesDetails(operationId) });
      qc.invalidateQueries({ queryKey: ["operations"] });
      toast.success("تم إسناد الفرق");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useExportOperationDetail() {
  return useMutation({
    mutationFn: async ({
      operationId,
      filename,
    }: {
      operationId: string;
      filename?: string;
    }) => {
      await downloadBlob(
        `/company/me/operations/${operationId}/export`,
        filename ?? `operation-${operationId}.xlsx`,
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
