import {
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../client";
import { getErrorMessage } from "../errors";

// ─── Section 2.4: Custom report builder ────────────────────────────────────

export interface BuilderDimension {
  key: string;
  labelAr: string;
  labelEn: string;
  type: "string" | "date" | "enum" | string;
}

export interface BuilderMetric {
  key: string;
  labelAr: string;
  labelEn: string;
  aggregation: "sum" | "count" | "avg" | string;
}

export interface BuilderFilterField {
  key: string;
  labelAr: string;
  type: "string" | "date" | "enum" | string;
  options?: string[];
}

export interface BuilderFields {
  dimensions: BuilderDimension[];
  metrics: BuilderMetric[];
  filters: BuilderFilterField[];
}

export interface BuilderQuery {
  dimensions?: string[];
  metrics?: string[];
  filters?: Record<string, unknown>;
  dateRange?: { from?: string; to?: string };
}

export interface BuilderPreviewResponse {
  rows: Array<Record<string, unknown>>;
  totals: Record<string, number>;
  rowCount: number;
  capped: boolean;
}

export function useReportBuilderFields() {
  return useQuery({
    queryKey: ["reports", "builder", "fields"] as const,
    queryFn: async () => {
      const res = await api.get<BuilderFields>("/reports/builder/fields");
      return res.data;
    },
    staleTime: 5 * 60_000,
  });
}

export function usePreviewBuilderReport() {
  return useMutation({
    mutationFn: async (body: BuilderQuery) => {
      const res = await api.post<BuilderPreviewResponse>(
        "/reports/builder/preview",
        body,
      );
      return res.data;
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useSaveBuilderReport() {
  return useMutation({
    mutationFn: async (body: {
      name: string;
      descriptionAr?: string;
      definition: BuilderQuery;
    }) => {
      const res = await api.post<{ id: string; name: string; createdAt: string }>(
        "/reports/builder/save",
        body,
      );
      return res.data;
    },
    onSuccess: () => toast.success("تم حفظ التقرير المخصص"),
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
