import { useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  type NotificationPreferences,
  type NotificationEventPref,
} from "../../api/queries/notifications";

interface Props {
  t?: (ar: string, en: string) => string;
}

const FONT = "'IBM Plex Sans Arabic', system-ui, sans-serif";

// Human labels for the event keys the backend ships.
const EVENT_LABELS: Record<string, [string, string]> = {
  "operation.created": ["عملية جديدة", "Operation created"],
  "operation.status_changed": ["تغيّر حالة عملية", "Operation status changed"],
  "approval.pending": ["بانتظار اعتماد", "Approval pending"],
  "invoice.paid": ["دفع فاتورة", "Invoice paid"],
  "subscription.expiring": ["اقتراب انتهاء الاشتراك", "Subscription expiring"],
  "quota.warning": ["تحذير الحصة", "Quota warning"],
  "reminder.responded": ["رد على تذكير", "Reminder responded"],
};

const CHANNELS: Array<{ key: keyof NotificationEventPref; ar: string; en: string }> = [
  { key: "inApp", ar: "داخل التطبيق", en: "In-app" },
  { key: "email", ar: "بريد", en: "Email" },
  { key: "push", ar: "إشعار", en: "Push" },
];

function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 38,
        height: 22,
        borderRadius: 999,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        background: on ? "linear-gradient(135deg, #7C3AED, #00D9FF)" : "#cbd5e1",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          insetInlineStart: on ? 19 : 3,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "white",
          transition: "inset-inline-start 0.2s",
        }}
      />
    </button>
  );
}

export function NotificationPreferencesPage({ t = (ar) => ar }: Props) {
  const { data, isLoading } = useNotificationPreferences();
  const updateMut = useUpdateNotificationPreferences();
  const [draft, setDraft] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  if (isLoading || !draft) {
    return (
      <div dir="rtl" style={{ display: "flex", justifyContent: "center", padding: 48, fontFamily: FONT }}>
        <Loader2 size={28} className="animate-spin" style={{ color: "#7C3AED" }} />
      </div>
    );
  }

  const eventKeys = Object.keys(draft.events ?? {});

  const toggleChannel = (channel: keyof NotificationPreferences["channels"]) =>
    setDraft((p) =>
      p ? { ...p, channels: { ...p.channels, [channel]: { ...p.channels[channel], enabled: !p.channels[channel].enabled } } } : p,
    );

  const toggleEvent = (eventKey: string, ch: keyof NotificationEventPref) =>
    setDraft((p) =>
      p
        ? {
            ...p,
            events: {
              ...p.events,
              [eventKey]: { ...p.events[eventKey], [ch]: !p.events[eventKey]?.[ch] },
            },
          }
        : p,
    );

  const toggleQuiet = () =>
    setDraft((p) =>
      p
        ? {
            ...p,
            quietHours: {
              enabled: !p.quietHours?.enabled,
              startsAt: p.quietHours?.startsAt ?? "22:00",
              endsAt: p.quietHours?.endsAt ?? "07:00",
            },
          }
        : p,
    );

  const card: React.CSSProperties = {
    background: "white",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.06)",
    overflow: "hidden",
    marginBottom: 16,
  };
  const cardHead: React.CSSProperties = {
    padding: "14px 18px",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    fontWeight: 700,
    color: "#1e293b",
    fontSize: 14,
  };
  const row: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 18px",
    borderBottom: "1px solid rgba(0,0,0,0.04)",
  };

  return (
    <div dir="rtl" style={{ fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <Bell size={22} style={{ color: "#7C3AED" }} />
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", margin: 0 }}>
            {t("تفضيلات الإشعارات", "Notification Preferences")}
          </h2>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: "2px 0 0" }}>
            {t("تحكّم في كيفية ومتى نُخطرك", "Control how and when we notify you")}
          </p>
        </div>
      </div>

      {/* Channels */}
      <div style={card}>
        <div style={cardHead}>{t("القنوات", "Channels")}</div>
        {(["inApp", "email", "push", "whatsapp"] as const).map((ch) => (
          <div key={ch} style={row}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
                {ch === "inApp" ? t("داخل التطبيق", "In-app")
                  : ch === "email" ? t("البريد الإلكتروني", "Email")
                  : ch === "push" ? t("إشعارات الجوال", "Push notifications")
                  : t("واتساب", "WhatsApp")}
              </div>
              {ch === "email" && draft.channels.email.address && (
                <div style={{ fontSize: 11, color: "#94a3b8", direction: "ltr", textAlign: "right" }}>
                  {draft.channels.email.address}
                </div>
              )}
            </div>
            <Toggle on={draft.channels[ch].enabled} onClick={() => toggleChannel(ch)} />
          </div>
        ))}
      </div>

      {/* Per-event matrix */}
      <div style={card}>
        <div style={cardHead}>{t("حسب نوع الحدث", "Per event type")}</div>
        <div style={{ ...row, background: "#f8fafc", fontWeight: 700, fontSize: 11, color: "#64748b" }}>
          <span style={{ flex: 1 }}>{t("الحدث", "Event")}</span>
          {CHANNELS.map((c) => (
            <span key={c.key} style={{ width: 56, textAlign: "center" }}>{t(c.ar, c.en)}</span>
          ))}
        </div>
        {eventKeys.map((ek) => (
          <div key={ek} style={row}>
            <span style={{ flex: 1, fontSize: 13, color: "#334155" }}>
              {t(EVENT_LABELS[ek]?.[0] ?? ek, EVENT_LABELS[ek]?.[1] ?? ek)}
            </span>
            {CHANNELS.map((c) => (
              <span key={c.key} style={{ width: 56, display: "flex", justifyContent: "center" }}>
                <Toggle on={Boolean(draft.events[ek]?.[c.key])} onClick={() => toggleEvent(ek, c.key)} />
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Quiet hours */}
      <div style={card}>
        <div style={cardHead}>{t("ساعات الهدوء", "Quiet hours")}</div>
        <div style={row}>
          <span style={{ fontSize: 13, color: "#334155" }}>
            {t("إيقاف الإشعارات في فترة محددة", "Mute notifications during a window")}
          </span>
          <Toggle on={Boolean(draft.quietHours?.enabled)} onClick={toggleQuiet} />
        </div>
        {draft.quietHours?.enabled && (
          <div style={{ ...row, gap: 12, borderBottom: "none" }}>
            <label style={{ fontSize: 12, color: "#64748b" }}>
              {t("من", "From")}{" "}
              <input
                type="time"
                value={draft.quietHours.startsAt}
                onChange={(e) =>
                  setDraft((p) => (p ? { ...p, quietHours: { ...p.quietHours!, startsAt: e.target.value } } : p))
                }
                style={{ marginInlineStart: 6, padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontFamily: FONT }}
              />
            </label>
            <label style={{ fontSize: 12, color: "#64748b" }}>
              {t("إلى", "To")}{" "}
              <input
                type="time"
                value={draft.quietHours.endsAt}
                onChange={(e) =>
                  setDraft((p) => (p ? { ...p, quietHours: { ...p.quietHours!, endsAt: e.target.value } } : p))
                }
                style={{ marginInlineStart: 6, padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontFamily: FONT }}
              />
            </label>
          </div>
        )}
      </div>

      <button
        onClick={() => draft && updateMut.mutate(draft)}
        disabled={updateMut.isPending}
        style={{
          padding: "12px 28px",
          background: updateMut.isPending ? "rgba(124,58,237,0.5)" : "linear-gradient(135deg, #7C3AED, #00D9FF)",
          color: "white",
          border: "none",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 700,
          cursor: updateMut.isPending ? "wait" : "pointer",
          fontFamily: FONT,
        }}
      >
        {updateMut.isPending ? t("جاري الحفظ...", "Saving...") : t("حفظ التفضيلات", "Save Preferences")}
      </button>
    </div>
  );
}
