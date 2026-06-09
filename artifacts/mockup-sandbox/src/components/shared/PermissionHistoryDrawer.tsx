import { useState } from "react";
import { History, X, RotateCcw, Loader2, ChevronLeft } from "lucide-react";
import {
  useAdminPermissionsHistory,
  useAdminPermissionsSnapshot,
  useRestoreAdminPermissionsSnapshot,
} from "../../api/queries/platform/admin";

interface Props {
  open: boolean;
  onClose: () => void;
  t?: (ar: string, en: string) => string;
}

const FONT = "'IBM Plex Sans Arabic', system-ui, sans-serif";

const PERM_COLORS: Record<string, string> = {
  view: "#2563eb",
  submit: "#0891b2",
  review: "#d97706",
  approve: "#059669",
  final: "#7C3AED",
  none: "#cbd5e1",
};

export function PermissionHistoryDrawer({ open, onClose, t = (ar) => ar }: Props) {
  const { data: page, isLoading } = useAdminPermissionsHistory();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: snapshot, isLoading: loadingSnap } = useAdminPermissionsSnapshot(selectedId);
  const restoreMut = useRestoreAdminPermissionsSnapshot();

  if (!open) return null;

  const rows = page?.data ?? [];

  const handleRestore = async () => {
    if (!selectedId) return;
    await restoreMut.mutateAsync(selectedId);
    setSelectedId(null);
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,28,53,0.55)", zIndex: 100, display: "flex", justifyContent: "flex-start" }}>
      <div
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
        style={{
          width: 460,
          maxWidth: "100vw",
          height: "100%",
          background: "white",
          fontFamily: FONT,
          boxShadow: "-12px 0 40px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {selectedId && (
              <button onClick={() => setSelectedId(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b", padding: 2 }}>
                <ChevronLeft size={18} style={{ transform: "scaleX(-1)" }} />
              </button>
            )}
            <History size={20} style={{ color: "#7C3AED" }} />
            <div style={{ fontSize: 16, fontWeight: 800, color: "#1e293b" }}>
              {selectedId ? t("معاينة النسخة", "Snapshot preview") : t("تاريخ الصلاحيات", "Permission history")}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}><X size={18} /></button>
        </div>

        {/* List view */}
        {!selectedId && (
          <div style={{ flex: 1, overflowY: "auto" }}>
            {isLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: "#7C3AED" }} /></div>
            ) : rows.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>{t("لا يوجد سجل بعد", "No history yet")}</div>
            ) : (
              rows.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  style={{ width: "100%", textAlign: "start", padding: "14px 20px", borderBottom: "1px solid rgba(0,0,0,0.04)", background: "white", border: "none", cursor: "pointer", fontFamily: FONT }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{r.summaryAr}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>
                    {r.savedBy.name} · {new Date(r.savedAt).toLocaleString("ar-SA")} · {r.changesCount} {t("تعديل", "changes")}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Snapshot preview */}
        {selectedId && (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
              {loadingSnap || !snapshot ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: "#7C3AED" }} /></div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "start", padding: "6px 4px", color: "#64748b", fontWeight: 700 }}>{t("الوحدة", "Module")}</th>
                      {((snapshot as any).roles ?? []).map((role: string) => (
                        <th key={role} style={{ padding: "6px 2px", color: "#64748b", fontWeight: 700, fontSize: 9 }}>{role}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {((snapshot as any).matrix ?? []).map((row: { module: string; perms: string[] }) => (
                      <tr key={row.module} style={{ borderTop: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "6px 4px", color: "#334155", fontWeight: 600 }}>{row.module}</td>
                        {row.perms.map((p, i) => (
                          <td key={i} style={{ padding: "6px 2px", textAlign: "center" }}>
                            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: PERM_COLORS[p] ?? "#cbd5e1" }} title={p} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ padding: 16, borderTop: "1px solid #e2e8f0" }}>
              <button
                onClick={handleRestore}
                disabled={restoreMut.isPending}
                style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg, #7C3AED, #00D9FF)", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                {restoreMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <><RotateCcw size={16} /> {t("استرجاع هذه النسخة", "Restore this snapshot")}</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
