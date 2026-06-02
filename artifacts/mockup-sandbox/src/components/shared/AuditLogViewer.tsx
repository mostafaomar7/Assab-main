import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, Filter, RefreshCw } from "lucide-react";
import { useAuditLogs } from "../../api/queries/misc";
import { useAdminAuditLogs } from "../../api/queries/platform/admin";
import type {
  AuditLogsFilter,
  AdminAuditLogsFilter,
} from "../../api/queries/keys";

interface Props {
  scope: "company" | "admin";
  /** Optional translate function — falls back to Arabic-only. */
  t?: (ar: string, en: string) => string;
}

/** Normalized row shape used by the table. */
interface Row {
  id: string;
  timestamp: string;
  actorId?: string;
  actorName?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown> | unknown;
}

interface FilterState {
  actorId: string;
  action: string;
  entityType: string;
  dateFrom: string;
  dateTo: string;
}

const EMPTY_FILTERS: FilterState = {
  actorId: "",
  action: "",
  entityType: "",
  dateFrom: "",
  dateTo: "",
};

function toCompanyFilter(f: FilterState): AuditLogsFilter {
  const out: AuditLogsFilter = {};
  if (f.actorId) out.actorId = f.actorId;
  if (f.action) out.action = f.action;
  if (f.entityType) out.entityType = f.entityType;
  if (f.dateFrom) out.dateFrom = f.dateFrom;
  if (f.dateTo) out.dateTo = f.dateTo;
  return out;
}

function toAdminFilter(f: FilterState): AdminAuditLogsFilter {
  const out: AdminAuditLogsFilter = {};
  if (f.actorId) out.actorUserId = f.actorId;
  if (f.action) out.action = f.action;
  if (f.entityType) out.entityType = f.entityType;
  if (f.dateFrom) out.dateFrom = f.dateFrom;
  if (f.dateTo) out.dateTo = f.dateTo;
  return out;
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("ar-EG", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ─── Sub-component: collapsible details cell ─────────────────────────────────
function DetailsCell({
  payload,
  t,
}: {
  payload: unknown;
  t: (ar: string, en: string) => string;
}) {
  const [open, setOpen] = useState(false);

  if (payload == null) {
    return <span style={{ color: "#cbd5e1", fontSize: 11 }}>—</span>;
  }

  return (
    <div style={{ minWidth: 180 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "transparent",
          border: "none",
          color: "#7C3AED",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 600,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: 0,
          fontFamily: "inherit",
        }}
      >
        {open ? <ChevronDown size={12} /> : <ChevronLeft size={12} />}
        {open ? t("إخفاء", "Hide") : t("عرض التفاصيل", "Show details")}
      </button>
      {open && (
        <pre
          dir="ltr"
          style={{
            marginTop: 6,
            padding: 8,
            background: "#0f172a",
            color: "#e2e8f0",
            borderRadius: 6,
            fontSize: 11,
            maxHeight: 240,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          }}
        >
          {JSON.stringify(payload, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
export function AuditLogViewer({ scope, t = (ar) => ar }: Props) {
  const [draft, setDraft] = useState<FilterState>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<FilterState>(EMPTY_FILTERS);

  // Always call both hooks; disable the one we don't need to keep React's
  // hook order stable while only firing one network request.
  const companyQuery = useAuditLogs(scope === "company" ? toCompanyFilter(applied) : {});
  const adminQuery = useAdminAuditLogs(scope === "admin" ? toAdminFilter(applied) : {});

  const active = scope === "company" ? companyQuery : adminQuery;

  const rows: Row[] = useMemo(() => {
    if (scope === "company") {
      const data = companyQuery.data ?? [];
      return data.map((e) => ({
        id: e.id,
        timestamp: e.createdAt,
        actorId: e.actorId,
        actorName: e.actorName,
        action: e.action,
        entityType: e.entityType,
        entityId: e.entityId,
        details: e.metadata,
      }));
    }
    const page = adminQuery.data;
    const data = page?.data ?? [];
    return data.map((e) => ({
      id: e.id,
      timestamp: e.occurredAt,
      actorName: e.actorName,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      details:
        e.before !== undefined || e.after !== undefined
          ? { before: e.before, after: e.after, description: e.description, ip: e.ip }
          : e.description
            ? { description: e.description, ip: e.ip }
            : undefined,
    }));
  }, [scope, companyQuery.data, adminQuery.data]);

  const setField = <K extends keyof FilterState>(k: K, v: FilterState[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const applyFilters = () => setApplied(draft);
  const resetFilters = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
  };

  // ─── Styling tokens ────────────────────────────────────────────────────────
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "#64748b",
    marginBottom: 4,
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "7px 10px",
    fontSize: 12,
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    background: "white",
    color: "#1e293b",
    fontFamily: "inherit",
  };
  const thStyle: React.CSSProperties = {
    textAlign: "right",
    padding: "10px 12px",
    fontSize: 11,
    fontWeight: 700,
    color: "#475569",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
    whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = {
    padding: "10px 12px",
    fontSize: 12,
    color: "#1e293b",
    borderBottom: "1px solid #f1f5f9",
    verticalAlign: "top",
  };

  return (
    <div
      dir="rtl"
      style={{
        fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif",
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Filter bar */}
      <div
        style={{
          padding: 16,
          borderBottom: "1px solid #f1f5f9",
          background: "#fafbfc",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <Filter size={14} color="#7C3AED" />
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
            {t("سجل المراجعة", "Audit Log")}
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => active.refetch()}
            disabled={active.isFetching}
            title={t("تحديث", "Refresh")}
            style={{
              background: "transparent",
              border: "1px solid #e2e8f0",
              borderRadius: 6,
              padding: "5px 10px",
              cursor: active.isFetching ? "wait" : "pointer",
              color: "#475569",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontFamily: "inherit",
            }}
          >
            <RefreshCw
              size={12}
              style={{
                animation: active.isFetching ? "spin 1s linear infinite" : undefined,
              }}
            />
            {t("تحديث", "Refresh")}
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(120px, 1fr))",
            gap: 10,
          }}
        >
          <div>
            <label style={labelStyle}>{t("المستخدم", "Actor")}</label>
            <input
              type="text"
              value={draft.actorId}
              onChange={(e) => setField("actorId", e.target.value)}
              placeholder={t("معرّف المستخدم", "User ID")}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>{t("الإجراء", "Action")}</label>
            <input
              type="text"
              value={draft.action}
              onChange={(e) => setField("action", e.target.value)}
              placeholder={t("اسم الإجراء", "Action name")}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>{t("نوع الكيان", "Entity Type")}</label>
            <input
              type="text"
              value={draft.entityType}
              onChange={(e) => setField("entityType", e.target.value)}
              placeholder={t("مثال: Operation", "e.g. Operation")}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>{t("من تاريخ", "Date From")}</label>
            <input
              type="date"
              value={draft.dateFrom}
              onChange={(e) => setField("dateFrom", e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>{t("إلى تاريخ", "Date To")}</label>
            <input
              type="date"
              value={draft.dateTo}
              onChange={(e) => setField("dateTo", e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            onClick={applyFilters}
            style={{
              background: "#7C3AED",
              color: "white",
              border: "none",
              borderRadius: 6,
              padding: "7px 16px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {t("تطبيق", "Apply")}
          </button>
          <button
            onClick={resetFilters}
            style={{
              background: "transparent",
              color: "#64748b",
              border: "1px solid #e2e8f0",
              borderRadius: 6,
              padding: "7px 16px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {t("إعادة تعيين", "Reset")}
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            direction: "rtl",
          }}
        >
          <thead>
            <tr>
              <th style={thStyle}>{t("الوقت", "Timestamp")}</th>
              <th style={thStyle}>{t("المستخدم", "Actor")}</th>
              <th style={thStyle}>{t("الإجراء", "Action")}</th>
              <th style={thStyle}>{t("الكيان", "Entity")}</th>
              <th style={thStyle}>{t("التفاصيل", "Details")}</th>
            </tr>
          </thead>
          <tbody>
            {active.isLoading && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: 32,
                    textAlign: "center",
                    color: "#94a3b8",
                    fontSize: 12,
                  }}
                >
                  {t("جاري التحميل...", "Loading...")}
                </td>
              </tr>
            )}
            {active.isError && !active.isLoading && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: 32,
                    textAlign: "center",
                    color: "#ef4444",
                    fontSize: 12,
                  }}
                >
                  {t("تعذر تحميل السجل", "Failed to load audit log")}
                </td>
              </tr>
            )}
            {!active.isLoading && !active.isError && rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: 32,
                    textAlign: "center",
                    color: "#94a3b8",
                    fontSize: 12,
                  }}
                >
                  {t("لا توجد سجلات", "No records found")}
                </td>
              </tr>
            )}
            {!active.isLoading &&
              !active.isError &&
              rows.map((row) => (
                <tr key={row.id}>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                    {formatTimestamp(row.timestamp)}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>
                      {row.actorName ?? t("غير محدد", "Unknown")}
                    </div>
                    {row.actorId && (
                      <div style={{ fontSize: 10, color: "#94a3b8" }}>
                        {row.actorId}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: "rgba(124,58,237,0.08)",
                        color: "#7C3AED",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {row.action}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {row.entityType ? (
                      <div>
                        <div style={{ fontWeight: 600 }}>{row.entityType}</div>
                        {row.entityId && (
                          <div style={{ fontSize: 10, color: "#94a3b8" }}>
                            {row.entityId}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: "#cbd5e1", fontSize: 11 }}>—</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <DetailsCell payload={row.details} t={t} />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
