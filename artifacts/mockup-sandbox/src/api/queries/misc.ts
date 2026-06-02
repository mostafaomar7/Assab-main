import { useQuery } from "@tanstack/react-query";
import { api } from "../client";
import { queryKeys, type AuditLogsFilter } from "./keys";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface SearchResult {
  type: "ops" | "branches" | "users" | "suppliers" | "items" | string;
  id: string;
  publicId?: string;
  title: string;
  subtitle?: string;
  link?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  groupedByType?: Record<string, SearchResult[]>;
}

export interface AuditLogEntry {
  id: string;
  actorId?: string;
  actorName?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  ip?: string;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────
export function useSearch(q: string, type?: string) {
  return useQuery({
    queryKey: queryKeys.search(q, type),
    enabled: Boolean(q && q.length >= 2),
    queryFn: async () => {
      const res = await api.get<SearchResponse>("/company/me/search", {
        params: { q, type },
      });
      return res.data;
    },
    staleTime: 5_000,
  });
}

// ─── Pipeline / Aggregation / Exceptions (shared cross-cutting) ─────────────
export function usePipelineOverview() {
  return useQuery({
    queryKey: ["pipeline", "overview"] as const,
    queryFn: async () => {
      const res = await api.get<unknown>("/pipeline/overview");
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useModulesAggregation() {
  return useQuery({
    queryKey: ["modules", "aggregation"] as const,
    queryFn: async () => {
      const res = await api.get<unknown>("/modules/aggregation");
      return res.data;
    },
    staleTime: 30_000,
  });
}

export interface ExceptionEntry {
  id: string;
  type?: string;
  moduleKey?: string;
  message?: string;
  severity?: "low" | "medium" | "high" | "critical" | string;
  occurredAt: string;
}

export function useExceptions(
  filter: Record<string, unknown> = {},
) {
  return useQuery({
    queryKey: ["exceptions", filter] as const,
    queryFn: async () => {
      const res = await api.get<
        { data: ExceptionEntry[] } | ExceptionEntry[]
      >("/exceptions", { params: filter });
      const d = res.data as
        | { data?: ExceptionEntry[] }
        | ExceptionEntry[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useExceptionsLookup() {
  return useQuery({
    queryKey: ["lookups", "exceptions"] as const,
    queryFn: async () => {
      const res = await api.get<unknown>("/lookups/exceptions");
      return res.data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useAuditLogs(filter: AuditLogsFilter = {}) {
  return useQuery({
    queryKey: queryKeys.auditLogs(filter),
    queryFn: async () => {
      const res = await api.get<
        { data: AuditLogEntry[] } | AuditLogEntry[]
      >("/company/me/audit-logs", { params: filter });
      const d = res.data as { data?: AuditLogEntry[] } | AuditLogEntry[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}
