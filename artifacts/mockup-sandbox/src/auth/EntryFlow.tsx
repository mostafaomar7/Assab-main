import { useState, type CSSProperties } from "react";
import { LoginPage } from "./LoginPage";
import { writeEntrySelection } from "./entrySelection";

// Pre-login entry: choose dashboard → choose role → login. Pure UI, no API calls
// until the credential step. The chosen {slug, role} is persisted so the mockup
// opens directly on that role after authentication.

const SHELL: CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(145deg, #0A1628 0%, #0F1C35 40%, #1B3A6B 100%)",
  fontFamily: "'IBM Plex Sans Arabic', 'Segoe UI', system-ui, sans-serif",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 32,
  padding: 24,
  direction: "rtl",
};

const DASHBOARDS = [
  {
    slug: "asab/ASABPrototype",
    title: "الداشبورد الرئيسي",
    subtitle: "نظام عصب الكامل",
    desc: "إدارة مالية متكاملة — المبيعات، المصروفات، المشتريات، المخزون، الشفتات، العهد النقدية، والأصول الثابتة",
    badge: "9 موديولات · 6 أدوار · خط اعتماد 6 مراحل",
    icon: "🏢",
    color: "#7C3AED",
    border: "rgba(124,58,237,0.3)",
  },
  {
    slug: "asab/CompanyDashboard",
    title: "بوابة الشركات",
    subtitle: "مجموعة التاج — بوابة المؤسسات",
    desc: "لوحة إدارة متعددة الفروع لمجموعات المطاعم — مراجعة البيانات وتدقيق العمليات عبر جميع العلامات التجارية",
    badge: "5 أدوار · 4 علامات تجارية · متعدد الفروع",
    icon: "🏨",
    color: "#00D9FF",
    border: "rgba(0,217,255,0.3)",
  },
] as const;

const ROLES: Record<string, { id: string; icon: string; title: string; desc: string; accent: string }[]> = {
  "asab/ASABPrototype": [
    { id: "admin", icon: "🧠", title: "أدمن النظام", desc: "إدارة المستخدمين والاشتراكات والإعدادات", accent: "#ef4444" },
    { id: "head", icon: "👑", title: "رئيس الحسابات", desc: "الاعتماد النهائي والإشراف على المحاسبين", accent: "#f59e0b" },
    { id: "accountant", icon: "🧮", title: "المحاسب", desc: "مراجعة وتدقيق العمليات اليومية", accent: "#3b82f6" },
    { id: "branch", icon: "🏪", title: "مدير الفرع", desc: "رفع البيانات اليومية وإدارة الفرع", accent: "#10b981" },
    { id: "procurement", icon: "🛒", title: "مدير المشتريات", desc: "تجميع طلبات الشراء والتنسيق مع الموردين", accent: "#8b5cf6" },
    { id: "supplier", icon: "🏭", title: "المورد", desc: "استلام طلبات التوريد وإدارة الكتالوج", accent: "#06b6d4" },
  ],
  "asab/CompanyDashboard": [
    { id: "company-admin", icon: "🏢", title: "أدمن الشركة", desc: "إدارة الاشتراك والمستخدمين", accent: "#7C3AED" },
    { id: "head", icon: "👑", title: "رئيس الحسابات", desc: "الإشراف والاعتماد النهائي", accent: "#3b82f6" },
    { id: "accountant", icon: "📊", title: "محاسب", desc: "مراجعة العمليات المالية", accent: "#06b6d4" },
    { id: "branch", icon: "🏪", title: "مدير فرع", desc: "رفع بيانات الفرع اليومية", accent: "#10b981" },
    { id: "procurement", icon: "🛒", title: "مدير مشتريات", desc: "أوامر الشراء والموردون", accent: "#f59e0b" },
  ],
};

export function EntryFlow() {
  const [slug, setSlug] = useState<string | null>(null);
  const [step, setStep] = useState<"dashboard" | "role" | "login">("dashboard");

  // ── Step 3: credential login (after dashboard + role are chosen) ──
  if (step === "login") {
    return (
      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setStep("role")}
          style={{
            position: "absolute",
            top: 20,
            insetInlineStart: 20,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.18)",
            color: "rgba(255,255,255,0.8)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          → تغيير الدور
        </button>
        <LoginPage />
      </div>
    );
  }

  // ── Step 2: role chooser for the picked dashboard ──
  if (step === "role" && slug) {
    const dash = DASHBOARDS.find((d) => d.slug === slug)!;
    const roles = ROLES[slug] ?? [];
    return (
      <div style={SHELL}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 30, marginBottom: 6 }}>{dash.icon}</div>
          <h1 style={{ color: "#fff", fontWeight: 800, fontSize: 26, margin: 0 }}>{dash.title}</h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, marginTop: 6 }}>اختر المستخدم للمتابعة لتسجيل الدخول</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, maxWidth: 860, width: "100%" }}>
          {roles.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                writeEntrySelection({ slug, role: r.id });
                setStep("login");
              }}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: `1.5px solid rgba(255,255,255,0.13)`,
                borderRadius: 16,
                padding: "22px 16px",
                cursor: "pointer",
                textAlign: "center",
                fontFamily: "inherit",
                transition: "all 0.16s ease",
                outline: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = r.accent;
                e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                e.currentTarget.style.transform = "translateY(-3px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.13)";
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{ fontSize: 34, marginBottom: 8 }}>{r.icon}</div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 5 }}>{r.title}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, lineHeight: 1.6, minHeight: 30 }}>{r.desc}</div>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => { setSlug(null); setStep("dashboard"); }}
          style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
        >
          → رجوع لاختيار الداشبورد
        </button>
      </div>
    );
  }

  // ── Step 1: dashboard chooser ──
  return (
    <div style={SHELL}>
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#7C3AED,#00D9FF)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 22 }}>ع</span>
          </div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 30 }}>عصب <span style={{ color: "#E8A020" }}>ASAB</span></div>
        </div>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, margin: 0 }}>نظام إدارة مالية المطاعم متعدد الفروع</p>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 6 }}>اختر الداشبورد للبدء</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, width: "100%", maxWidth: 880 }}>
        {DASHBOARDS.map((d) => (
          <button
            key={d.slug}
            type="button"
            onClick={() => { setSlug(d.slug); setStep("role"); }}
            style={{
              display: "block",
              textAlign: "start",
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${d.border}`,
              borderRadius: 20,
              padding: 28,
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `${d.color}20`, border: `1px solid ${d.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{d.icon}</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "white" }}>{d.title}</div>
                <div style={{ fontSize: 12, color: d.color, fontWeight: 600, marginTop: 2 }}>{d.subtitle}</div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7, margin: "0 0 16px" }}>{d.desc}</p>
            <p style={{ fontSize: 10, color: "#475569", margin: "0 0 18px" }}>{d.badge}</p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: d.color, color: "white", padding: "10px 22px", borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
              اختيار المستخدم ←
            </div>
          </button>
        ))}
      </div>
      <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>عصب ASAB · النسخة التجريبية 2.0</p>
    </div>
  );
}
