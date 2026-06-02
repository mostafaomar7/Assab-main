import { useQuery } from "@tanstack/react-query";
import { api } from "../client";
import type { AccDashboardResponse } from "../types/company";
import { queryKeys } from "./keys";

export function useAccDashboard() {
  return useQuery({
    queryKey: queryKeys.accDashboard,
    queryFn: async () => {
      const res = await api.get<AccDashboardResponse>(
        "/company/me/accountant/dashboard",
      );
      return res.data;
    },
    staleTime: 15_000,
  });
}
