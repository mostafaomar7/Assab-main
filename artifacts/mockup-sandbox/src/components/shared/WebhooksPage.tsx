import { useState } from "react";
import { Webhook, Plus, Trash2, Copy, Check, Loader2, X, Zap, Power } from "lucide-react";
import {
  useWebhooks,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useTestWebhook,
  type WebhookEvent,
  type CreateWebhookResponse,
} from "../../api/queries/webhooks";

interface Props {
  t?: (ar: string, en: string) => string;
}

const FONT = "'IBM Plex Sans Arabic', system-ui, sans-serif";

const ALL_EVENTS: Array<{ key: WebhookEvent; ar: string }> = [
  { key: "operation.created", ar: "إنشاء عملية" },
  { key: "operation.status_changed", ar: "تغيّر حالة عملية" },
  { key: "invoice.created", ar: "إنشاء فاتورة" },
  { key: "invoice.paid", ar: "دفع فاتورة" },
  { key: "subscription.updated", ar: "تحديث اشتراك" },
];

export function WebhooksPage({ t = (ar) => ar }: Props) {
  const { data: hooks = [], isLoading } = useWebhooks();
  const createMut = useCreateWebhook();
  const updateMut = useUpdateWebhook();
  const deleteMut = useDeleteWebhook();
  const testMut = useTestWebhook();

  const [showCreate, setShowCreate] = useState(false);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<WebhookEvent[]>(["operation.created"]);
  const [description, setDescription] = useState("");
  const [created, setCreated] = useState<CreateWebhookResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleEvent = (e: WebhookEvent) =>
    setEvents((p) => (p.includes(e) ? p.filter((x) => x !== e) : [...p, e]));

  const handleCreate = async () => {
    if (!url.trim() || events.length === 0) return;
    const res = await createMut.mutateAsync({ url: url.trim(), events, description: description.trim() || undefined });
    setCreated(res);
    setUrl(""); setEvents(["operation.created"]); setDescription(""); setShowCreate(false);
  };

  const copySecret = () => {
    if (created) navigator.clipboard?.writeText(created.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const card: React.CSSProperties = { background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" };
  const primaryBtn: React.CSSProperties = { padding: "10px 18px", background: "linear-gradient(135deg, #7C3AED, #00D9FF)", color: "white", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT, display: "inline-flex", alignItems: "center", gap: 6 };
  const input: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, fontFamily: FONT, marginBottom: 12, direction: "ltr", textAlign: "right" };

  return (
    <div dir="rtl" style={{ fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Webhook size={22} style={{ color: "#7C3AED" }} />
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", margin: 0 }}>Webhooks</h2>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: "2px 0 0" }}>{t("استقبل أحداث النظام على رابطك", "Receive system events at your URL")}</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} style={primaryBtn}><Plus size={15} /> {t("جديد", "New")}</button>
      </div>

      {/* One-time secret reveal */}
      {created && (
        <div style={{ ...card, padding: 16, marginBottom: 16, border: "1px solid #a7f3d0", background: "#f0fdf4" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#065f46" }}>{t("انسخ الـ secret الآن — للتحقق من التوقيع", "Copy the secret now — to verify the signature")}</span>
            <button onClick={() => setCreated(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={16} /></button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <code style={{ flex: 1, background: "white", padding: "10px 12px", borderRadius: 8, fontSize: 12, direction: "ltr", wordBreak: "break-all", border: "1px solid #d1fae5" }}>{created.secret}</code>
            <button onClick={copySecret} style={{ ...primaryBtn, background: "#059669" }}>{copied ? <Check size={15} /> : <Copy size={15} />}</button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div style={{ ...card, padding: 18, marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>{t("رابط الاستقبال (URL)", "Endpoint URL")}</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/webhooks/asab" style={input} />
          <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>{t("الأحداث", "Events")}</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {ALL_EVENTS.map((e) => (
              <button key={e.key} onClick={() => toggleEvent(e.key)} style={{ padding: "6px 12px", borderRadius: 999, border: events.includes(e.key) ? "2px solid #7C3AED" : "1px solid #e2e8f0", background: events.includes(e.key) ? "rgba(124,58,237,0.06)" : "white", fontSize: 12, cursor: "pointer", fontFamily: FONT, color: "#334155" }}>
                {t(e.ar, e.key)}
              </button>
            ))}
          </div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>{t("وصف (اختياري)", "Description (optional)")}</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...input, direction: "rtl" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleCreate} disabled={createMut.isPending || !url.trim() || !events.length} style={{ ...primaryBtn, opacity: url.trim() && events.length ? 1 : 0.6 }}>
              {createMut.isPending ? <Loader2 size={15} className="animate-spin" /> : t("إنشاء", "Create")}
            </button>
            <button onClick={() => setShowCreate(false)} style={{ padding: "10px 18px", background: "white", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>{t("إلغاء", "Cancel")}</button>
          </div>
        </div>
      )}

      {/* List */}
      <div style={card}>
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: "#7C3AED" }} /></div>
        ) : hooks.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>{t("لا توجد webhooks بعد", "No webhooks yet")}</div>
        ) : (
          hooks.map((h) => (
            <div key={h.id} style={{ padding: "14px 18px", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: h.isActive ? "#10b981" : "#cbd5e1", flexShrink: 0 }} />
                    <code style={{ fontSize: 12, color: "#1e293b", direction: "ltr", wordBreak: "break-all" }}>{h.url}</code>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                    {h.events.map((e) => (
                      <span key={e} style={{ fontSize: 10, background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 999, direction: "ltr" }}>{e}</span>
                    ))}
                  </div>
                  {h.failureCount > 0 && (
                    <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>{t("محاولات فاشلة:", "Failures:")} {h.failureCount}</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => testMut.mutate({ id: h.id })} title={t("اختبار", "Test")} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#7C3AED", padding: 6 }}><Zap size={15} /></button>
                  <button onClick={() => updateMut.mutate({ id: h.id, isActive: !h.isActive })} title={t("تفعيل/إيقاف", "Toggle")} style={{ background: "transparent", border: "none", cursor: "pointer", color: h.isActive ? "#64748b" : "#10b981", padding: 6 }}><Power size={15} /></button>
                  <button onClick={() => deleteMut.mutate(h.id)} title={t("حذف", "Delete")} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#ef4444", padding: 6 }}><Trash2 size={15} /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
