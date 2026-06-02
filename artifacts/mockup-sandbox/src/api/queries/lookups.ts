import { useQuery } from "@tanstack/react-query";
import { api } from "../client";
import type { LookupRow } from "../types";
import { queryKeys, type LookupType } from "./keys";

export function useLookup(type: LookupType, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.lookup(type, params),
    queryFn: async () => {
      const res = await api.get<LookupRow[]>(`/company/me/lookups/${type}`, {
        params,
      });
      return res.data;
    },
    staleTime: 5 * 60_000, // lookups change infrequently
  });
}

// Branch-scoped employee lookup (sales-variance assignment, etc.)
export function useBranchEmployeesLookup(branchId: string | null | undefined) {
  return useQuery({
    queryKey: ["lookups", "branch-employees", branchId] as const,
    enabled: Boolean(branchId),
    queryFn: async () => {
      const res = await api.get<LookupRow[]>(
        `/company/me/branches/${branchId}/employees/lookup`,
      );
      return res.data;
    },
    staleTime: 5 * 60_000,
  });
}
