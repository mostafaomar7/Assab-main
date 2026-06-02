import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, downloadBlob } from "../client";
import type { Page } from "../types";
import type { Employee, EmployeeMovement } from "../types/company";
import { getErrorMessage } from "../errors";
import { queryKeys, type EmployeeFilter } from "./keys";

export function useEmployees(filter: EmployeeFilter = {}) {
  return useQuery({
    queryKey: queryKeys.employees(filter),
    queryFn: async () => {
      const res = await api.get<Page<Employee>>("/company/me/employees", {
        params: filter,
      });
      return res.data;
    },
  });
}

export function useEmployeeMovements(employeeId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.employeeMovements(employeeId ?? ""),
    enabled: Boolean(employeeId),
    queryFn: async () => {
      const res = await api.get<EmployeeMovement[]>(
        `/company/me/employees/${employeeId}/movements`,
      );
      return res.data;
    },
  });
}

export interface EmployeeMovementInput {
  type: EmployeeMovement["type"];
  date: string;
  amountHalalas: number;
  notes?: string;
}

export function useCreateEmployeeMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      employeeId,
      payload,
    }: {
      employeeId: string;
      payload: EmployeeMovementInput;
    }) => {
      const res = await api.post<EmployeeMovement>(
        `/company/me/employees/${employeeId}/movements`,
        payload,
      );
      return res.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.employeeMovements(vars.employeeId),
      });
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("تم تسجيل الحركة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useExportPayroll() {
  return useMutation({
    mutationFn: async (month: string /* YYYY-MM */) => {
      await downloadBlob(
        "/company/me/employees/payroll/export",
        `payroll-${month}.xlsx`,
        { month },
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
