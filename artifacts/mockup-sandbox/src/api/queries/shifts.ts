import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, downloadBlob } from "../client";
import type { Page } from "../types";
import type { Shift, ShiftConfig } from "../types/company";
import { getErrorMessage } from "../errors";
import { queryKeys, type ShiftFilter } from "./keys";

export function useShifts(filter: ShiftFilter = {}) {
  return useQuery({
    queryKey: queryKeys.shifts(filter),
    queryFn: async () => {
      const res = await api.get<Page<Shift>>("/company/me/shifts", {
        params: filter,
      });
      return res.data;
    },
  });
}

export function useShiftConfigs() {
  return useQuery({
    queryKey: queryKeys.shiftConfigs,
    queryFn: async () => {
      const res = await api.get<ShiftConfig[]>("/company/me/shifts/configs");
      return res.data;
    },
    staleTime: 60_000,
  });
}

export function useSaveShiftConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      brandId,
      config,
    }: {
      brandId: string;
      config: Omit<ShiftConfig, "brandId" | "brandName">;
    }) => {
      const res = await api.put<ShiftConfig>(
        `/company/me/brands/${brandId}/shift-config`,
        config,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.shiftConfigs });
      toast.success("تم حفظ إعدادات الشفت");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useCloseShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      shiftId,
      notes,
    }: {
      shiftId: string;
      notes?: string;
    }) => {
      const res = await api.post<Shift>(
        `/company/me/shifts/${shiftId}/close`,
        { notes },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("تم إغلاق الشفت");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useExportShifts() {
  return useMutation({
    mutationFn: async (filter: ShiftFilter = {}) => {
      await downloadBlob("/company/me/shifts/export", "shifts.xlsx", filter);
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
