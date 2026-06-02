import { useState } from "react";
import { X } from "lucide-react";

const PRESET_REASONS = [
  "بيانات غير مكتملة",
  "فاتورة مفقودة أو غير واضحة",
  "تناقض في المبالغ",
  "فرق في الكميات",
  "مورد غير معتمد",
  "تاريخ غير صحيح",
  "أخرى",
] as const;

interface Props {
  open: boolean;
  /** What's being rejected, e.g. operation publicId, for display only. */
  subject?: string;
  onClose: () => void;
  onSubmit: (payload: { reason: string; notes?: string }) => void;
  /** Optional translate function. */
  t?: (ar: string, en: string) => string;
}

export function RejectModal({
  open,
  subject,
  onClose,
  onSubmit,
  t = (ar) => ar,
}: Props) {
  const [reason, setReason] = useState<string>(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [notes, setNotes] = useState("");

  if (!open) return null;

  const finalReason = reason === "أخرى" ? customReason.trim() : reason;
  const canSubmit = finalReason.length > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({ reason: finalReason, notes: notes.trim() || undefined });
    setReason(PRESET_REASONS[0]);
    setCustomReason("");
    setNotes("");
    onClose();
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,28,53,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
        style={{
          width: "100%",
          maxWidth: 480,
          background: "white",
          borderRadius: 16,
          padding: 24,
          fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
              {t("رفض العملية", "Reject Operation")}
            </div>
            {subject && (
              <div
                style={{
                  fontSize: 13,
                  color: "#64748b",
                  marginTop: 4,
                  fontFamily: "monospace",
                }}
              >
                {subject}
              </div>
            )}
            <div
              style={{
                fontSize: 12,
                color: "#94a3b8",
                marginTop: 8,
                lineHeight: 1.5,
              }}
            >
              {t(
                "ستُعاد العملية إلى مدير الفرع مع سبب الرفض.",
                "The operation will be returned to the branch manager with the rejection reason.",
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Reason select */}
        <label
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 700,
            color: "#475569",
            marginBottom: 6,
          }}
        >
          {t("سبب الرفض", "Reason")} <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            fontSize: 14,
            background: "white",
            color: "#1e293b",
            fontFamily: "inherit",
            marginBottom: 12,
          }}
        >
          {PRESET_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        {reason === "أخرى" && (
          <input
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            placeholder={t("اكتب السبب", "Type the reason")}
            autoFocus
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 14,
              fontFamily: "inherit",
              marginBottom: 12,
            }}
          />
        )}

        {/* Notes */}
        <label
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 700,
            color: "#475569",
            marginBottom: 6,
          }}
        >
          {t("ملاحظات (اختياري)", "Notes (optional)")}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder={t("تفاصيل إضافية...", "Additional details...")}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            fontSize: 14,
            fontFamily: "inherit",
            resize: "vertical",
            marginBottom: 16,
          }}
        />

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-start" }}>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              padding: "10px 20px",
              background: canSubmit ? "#ef4444" : "#cbd5e1",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: canSubmit ? "pointer" : "not-allowed",
              fontFamily: "inherit",
            }}
          >
            {t("تأكيد الرفض", "Confirm Reject")}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              background: "white",
              color: "#475569",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {t("إلغاء", "Cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
