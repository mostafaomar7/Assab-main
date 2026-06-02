import { Monitor, Trash2 } from "lucide-react";
import {
  useSessions,
  useRevokeSession,
  type UserSession,
} from "../../api/queries/sessions";

interface Props {
  /** Optional translate function; falls back to Arabic text only. */
  t?: (ar: string, en: string) => string;
}

function timeAgo(iso: string, t: (ar: string, en: string) => string): string {
  const date = new Date(iso);
  const diffMin = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMin < 60) return `${t("منذ", "")} ${diffMin} ${t("دقيقة", "min ago")}`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${t("منذ", "")} ${diffH} ${t("ساعة", "h ago")}`;
  const diffD = Math.floor(diffH / 24);
  return `${t("منذ", "")} ${diffD} ${t("يوم", "d ago")}`;
}

export function SessionsList({ t = (ar) => ar }: Props) {
  const { data, isLoading, isError } = useSessions();
  const revoke = useRevokeSession();

  const items: UserSession[] = data ?? [];

  return (
    <div
      dir="rtl"
      style={{
        background: "white",
        borderRadius: 12,
        border: "1px solid rgba(0,0,0,0.06)",
        fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
            {t("الجلسات النشطة", "Active Sessions")}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
            {t(
              "الأجهزة التي قمت بتسجيل الدخول منها",
              "Devices where you are signed in",
            )}
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
          {items.length}{" "}
          {t(
            items.length === 1 ? "جلسة" : "جلسات",
            items.length === 1 ? "session" : "sessions",
          )}
        </div>
      </div>

      {/* Body */}
      <div>
        {isLoading && (
          <div
            style={{
              padding: 32,
              fontSize: 12,
              color: "#94a3b8",
              textAlign: "center",
            }}
          >
            {t("جاري التحميل...", "Loading...")}
          </div>
        )}
        {!isLoading && isError && (
          <div
            style={{
              padding: 32,
              fontSize: 12,
              color: "#ef4444",
              textAlign: "center",
            }}
          >
            {t("تعذّر تحميل الجلسات", "Failed to load sessions")}
          </div>
        )}
        {!isLoading && !isError && items.length === 0 && (
          <div
            style={{
              padding: 32,
              fontSize: 12,
              color: "#94a3b8",
              textAlign: "center",
            }}
          >
            {t("لا توجد جلسات نشطة", "No active sessions")}
          </div>
        )}
        {items.map((s) => {
          const pending = revoke.isPending && revoke.variables === s.id;
          return (
            <div
              key={s.id}
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid rgba(0,0,0,0.04)",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              {/* Device icon */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: s.current ? "rgba(124,58,237,0.10)" : "#f1f5f9",
                  color: s.current ? "#7C3AED" : "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Monitor size={18} />
              </div>

              {/* Meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#1e293b",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: 280,
                    }}
                    title={s.device}
                  >
                    {s.device}
                  </div>
                  {s.current && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#7C3AED",
                        background: "rgba(124,58,237,0.10)",
                        padding: "2px 8px",
                        borderRadius: 999,
                      }}
                    >
                      {t("هذا الجهاز", "This device")}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#64748b",
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontFamily: "monospace" }}>{s.ip}</span>
                  <span style={{ color: "#cbd5e1" }}>•</span>
                  <span>
                    {t("آخر نشاط:", "Last active:")} {timeAgo(s.lastUsedAt, t)}
                  </span>
                </div>
              </div>

              {/* Revoke action */}
              <button
                onClick={() => revoke.mutate(s.id)}
                disabled={s.current || pending}
                title={
                  s.current
                    ? t("لا يمكن إنهاء الجلسة الحالية", "Cannot revoke current session")
                    : t("إنهاء الجلسة", "Revoke session")
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid",
                  borderColor: s.current ? "#e2e8f0" : "#fecaca",
                  background: s.current ? "#f8fafc" : "white",
                  color: s.current ? "#cbd5e1" : "#dc2626",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: s.current || pending ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  opacity: pending ? 0.6 : 1,
                }}
              >
                <Trash2 size={14} />
                {pending
                  ? t("جاري...", "...")
                  : t("إنهاء", "Revoke")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
