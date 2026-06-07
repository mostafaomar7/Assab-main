import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../client";
import { getErrorMessage } from "../errors";

// ─── Saved filter presets ────────────────────────────────────────────────────
export interface SavedFilter {
  id: string;
  name: string;
  page: string;
  params: Record<string, unknown>;
  createdAt: string;
}

export function useSavedFilters(page: string) {
  return useQuery({
    queryKey: ["users", "me", "saved-filters", page] as const,
    enabled: Boolean(page),
    queryFn: async () => {
      const res = await api.get<{ data: SavedFilter[] } | SavedFilter[]>(
        "/users/me/saved-filters",
        { params: { page } },
      );
      const d = res.data as { data?: SavedFilter[] } | SavedFilter[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
    staleTime: 5 * 60_000,
  });
}

export interface CreateSavedFilterPayload {
  name: string;
  page: string;
  params: Record<string, unknown>;
}

export function useCreateSavedFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSavedFilterPayload) => {
      const res = await api.post<SavedFilter>("/users/me/saved-filters", payload);
      return res.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: ["users", "me", "saved-filters", vars.page],
      });
      toast.success("تم حفظ الفلتر");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeleteSavedFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/me/saved-filters/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users", "me", "saved-filters"] });
      toast.success("تم حذف الفلتر");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Quick stats (header polling) ────────────────────────────────────────────
export interface QuickStats {
  pendingApprovalsCount: number;
  unreadNotificationsCount: number;
  todayOperationsCount: number;
  openRemindersCount: number;
}

export function useQuickStats(opts: { pollMs?: number } = {}) {
  return useQuery({
    queryKey: ["users", "me", "quick-stats"] as const,
    queryFn: async () => {
      const res = await api.get<QuickStats>("/users/me/quick-stats");
      return res.data;
    },
    refetchInterval: opts.pollMs ?? 60_000,
    staleTime: 30_000,
  });
}

// ─── Table column preferences ────────────────────────────────────────────────
export interface TablePrefs {
  table: string;
  visibleColumns: string[];
  columnOrder: string[];
  pageSize: number;
}

export function useTablePrefs(table: string) {
  return useQuery({
    queryKey: ["users", "me", "table-prefs", table] as const,
    enabled: Boolean(table),
    queryFn: async () => {
      const res = await api.get<TablePrefs>("/users/me/table-prefs", {
        params: { table },
      });
      return res.data;
    },
    staleTime: 10 * 60_000,
  });
}

export function useUpdateTablePrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TablePrefs) => {
      const res = await api.put<TablePrefs>("/users/me/table-prefs", payload);
      return res.data;
    },
    onSuccess: (data) => {
      qc.setQueryData(["users", "me", "table-prefs", data.table], data);
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Accountant activity heatmap ─────────────────────────────────────────────
export interface ActivityHeatmapResponse {
  hours: Array<{ hour: number; count: number }>;
  byDay: Array<{ day: number; dayAr: string; totalCount: number }>;
}

export function useActivityHeatmap(
  filter: { dateFrom?: string; dateTo?: string } = {},
) {
  return useQuery({
    queryKey: ["accountant", "dashboard", "activity-heatmap", filter] as const,
    queryFn: async () => {
      const res = await api.get<ActivityHeatmapResponse>(
        "/accountant/dashboard/activity-heatmap",
        { params: filter },
      );
      return res.data;
    },
    staleTime: 60_000,
  });
}
