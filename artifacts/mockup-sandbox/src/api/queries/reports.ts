import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, downloadBlob } from "../client";
import { getErrorMessage } from "../errors";
import { queryKeys } from "./keys";

export interface ReportCatalogItem {
  key: string;
  title: string;
  titleEn: string;
  description: string;
  category: "financial" | "operational" | "owner";
  availableFormats: ("pdf" | "xlsx" | "csv")[];
}

export function useReports() {
  return useQuery({
    queryKey: queryKeys.reports,
    queryFn: async () => {
      const res = await api.get<ReportCatalogItem[]>("/company/me/reports");
      return res.data;
    },
    staleTime: 60_000,
  });
}

export function useDownloadReport() {
  return useMutation({
    mutationFn: async ({
      key,
      format = "pdf",
      filename,
    }: {
      key: string;
      format?: "pdf" | "xlsx" | "csv";
      filename?: string;
    }) => {
      await downloadBlob(
        `/company/me/reports/${key}/download`,
        filename ?? `${key}.${format}`,
        { format },
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
