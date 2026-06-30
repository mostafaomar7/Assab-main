import { useEffect, useState, type ComponentType } from "react";
import { modules as discoveredModules } from "./.generated/mockup-components";
import { EntryFlow } from "./auth/EntryFlow";
import { readEntrySelection } from "./auth/entrySelection";
import { useAuth } from "./auth/AuthContext";
import { OnboardingWizard } from "./auth/OnboardingWizard";
import { InvitationAcceptPage } from "./auth/InvitationAcceptPage";
import { SubscriptionExpiredBanner } from "./components/shared/SubscriptionExpiredBanner";

type ModuleMap = Record<string, () => Promise<Record<string, unknown>>>;

function _resolveComponent(
  mod: Record<string, unknown>,
  name: string,
): ComponentType | undefined {
  const fns = Object.values(mod).filter(
    (v) => typeof v === "function",
  ) as ComponentType[];
  return (
    (mod.default as ComponentType) ||
    (mod.Preview as ComponentType) ||
    (mod[name] as ComponentType) ||
    fns[fns.length - 1]
  );
}

function PreviewRenderer({
  componentPath,
  modules,
}: {
  componentPath: string;
  modules: ModuleMap;
}) {
  const [Component, setComponent] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setComponent(null);
    setError(null);

    async function loadComponent(): Promise<void> {
      const key = `./components/mockups/${componentPath}.tsx`;
      const loader = modules[key];
      if (!loader) {
        setError(`No component found at ${componentPath}.tsx`);
        return;
      }
      try {
        const mod = await loader();
        if (cancelled) return;
        const name = componentPath.split("/").pop()!;
        const comp = _resolveComponent(mod, name);
        if (!comp) {
          setError(`No exported React component found in ${componentPath}.tsx`);
          return;
        }
        setComponent(() => comp);
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        setError(`Failed to load preview.\n${message}`);
      }
    }

    void loadComponent();
    return () => { cancelled = true; };
  }, [componentPath, modules]);

  if (error) {
    return (
      <pre style={{ color: "red", padding: "2rem", fontFamily: "system-ui" }}>
        {error}
      </pre>
    );
  }
  if (!Component) return null;
  return <Component />;
}

// ─── Routing helpers ──────────────────────────────────────────────────────────

function getBasePath(): string {
  return import.meta.env.BASE_URL.replace(/\/$/, "");
}

// Returns true when running as deployed static site (BASE_PATH = /)
function isStaticDeployment(): boolean {
  return getBasePath() === "";
}

// Build an href to a preview component — hash-based in production, path-based in dev
function previewHref(componentSlug: string): string {
  if (isStaticDeployment()) {
    return `#/preview/${componentSlug}`;
  }
  return `${getBasePath()}/preview/${componentSlug}`;
}

// Detect which component to render from current URL
// Supports BOTH:
//   • Hash routing:     /#/preview/asab/ASABPrototype       (static deployment)
//   • Pathname routing: /__mockup/preview/asab/ASABPrototype (dev canvas iframes)
function getPreviewPath(): string | null {
  // 1. Hash routing (static deployment)
  const hash = window.location.hash;
  const hashMatch = hash.match(/^#\/preview\/(.+)$/);
  if (hashMatch) return hashMatch[1];

  // 2. Pathname routing (dev / canvas iframes)
  const basePath = getBasePath();
  const { pathname } = window.location;
  const local =
    basePath && pathname.startsWith(basePath)
      ? pathname.slice(basePath.length) || "/"
      : pathname;
  const match = local.match(/^\/preview\/(.+)$/);
  return match ? match[1] : null;
}

// Map a backend defaultPage hint to a known mockup slug. Backend can return
// either a full slug ("asab/CompanyDashboard") or a short hint ("dashboard").
function resolveLandingSlug(defaultPage: string | null, role: string | undefined): string {
  if (defaultPage && defaultPage.includes("/")) return defaultPage;
  if (role === "admin") return "asab/ASABPrototype";
  // Every company role lands in CompanyDashboard (it routes internally by role).
  return "asab/CompanyDashboard";
}

// ─── ASAB Landing Page (only shown for logged-in users — picks a dashboard) ──
function ASABLanding({ onLogout, userName }: { onLogout: () => void; userName: string }) {
  const dashboards = [
    {
      slug: "asab/ASABPrototype",
      title: "الداشبورد الرئيسي",
      subtitle: "نظام عصب الكامل",
      description:
        "إدارة مالية متكاملة — المبيعات، المصروفات، المشتريات، المخزون، الشفتات، العهد النقدية، والأصول الثابتة",
      roles: ["محاسب", "رئيس حسابات", "مدير فرع", "مدير مشتريات", "مشرف", "مدير شركة"],
      badge: "9 موديولات · 6 أدوار · خط اعتماد 6 مراحل",
      color: "#7C3AED",
      border: "rgba(124,58,237,0.25)",
      icon: "🏢",
      gradient: "linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(0,217,255,0.1) 100%)",
    },
    {
      slug: "asab/CompanyDashboard",
      title: "بوابة الشركات",
      subtitle: "مجموعة التاج — بوابة المؤسسات",
      description:
        "لوحة إدارة متعددة الفروع لمجموعات المطاعم — مراجعة البيانات وتدقيق العمليات عبر جميع العلامات التجارية",
      roles: ["المدير التنفيذي", "المشرف المالي", "محاسب المجموعة", "محلل البيانات", "مدير مشتريات"],
      badge: "5 أدوار · 4 علامات تجارية · متعدد الفروع",
      color: "#00D9FF",
      border: "rgba(0,217,255,0.25)",
      icon: "🏨",
      gradient: "linear-gradient(135deg, rgba(0,217,255,0.15) 0%, rgba(124,58,237,0.1) 100%)",
    },
  ] as const;

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(145deg, #0A1628 0%, #0F1C35 40%, #1B3A6B 100%)",
        fontFamily: "'IBM Plex Sans Arabic', 'Segoe UI', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar: user + logout */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 32px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          onClick={onLogout}
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#fca5a5",
            padding: "6px 14px",
            borderRadius: 8,
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          خروج
        </button>
        <div style={{ fontSize: 13, color: "#94a3b8" }}>
          مرحباً، <span style={{ color: "white", fontWeight: 600 }}>{userName}</span>
        </div>
      </div>

      {/* Header */}
      <header style={{ textAlign: "center", padding: "32px 32px 24px" }}>
        <h1 style={{ fontSize: 18, color: "#94a3b8", fontWeight: 400, margin: "0 0 8px" }}>
          نظام إدارة مالية المطاعم المتكامل
        </h1>
        <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>
          اختر الداشبورد للبدء
        </p>
      </header>

      {/* Dashboard Cards */}
      <main style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "0 24px 48px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, width: "100%", maxWidth: 880 }}>
          {dashboards.map((d) => (
            <a
              key={d.slug}
              href={previewHref(d.slug)}
              style={{
                display: "block",
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${d.border}`,
                borderRadius: 20,
                padding: 28,
                textDecoration: "none",
                cursor: "pointer",
                transition: "all 0.2s ease",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", inset: 0, borderRadius: 20, background: d.gradient, pointerEvents: "none" }} />
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: `${d.color}20`, border: `1px solid ${d.color}40`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24, flexShrink: 0,
                  }}>{d.icon}</div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "white" }}>{d.title}</div>
                    <div style={{ fontSize: 12, color: d.color, fontWeight: 600, marginTop: 2 }}>{d.subtitle}</div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7, margin: "0 0 16px" }}>
                  {d.description}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {d.roles.map((r) => (
                    <span key={r} style={{
                      fontSize: 11, padding: "2px 10px", borderRadius: 99,
                      border: `1px solid ${d.color}40`,
                      color: d.color, background: `${d.color}12`,
                      fontWeight: 600,
                    }}>{r}</span>
                  ))}
                </div>
                <p style={{ fontSize: 10, color: "#475569", margin: "0 0 20px" }}>{d.badge}</p>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: d.color, color: "white",
                  padding: "10px 22px", borderRadius: 12,
                  fontSize: 13, fontWeight: 700,
                }}>
                  فتح الداشبورد ←
                </div>
              </div>
            </a>
          ))}
        </div>
      </main>

      <footer style={{ textAlign: "center", padding: "16px 24px 32px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ fontSize: 12, color: "#334155", margin: 0 }}>
          عصب ASAB · نظام إدارة مالية المطاعم · النسخة التجريبية 2.0
        </p>
      </footer>
    </div>
  );
}

// ─── App — auth-aware shell ──────────────────────────────────────────────────
function App() {
  const { user, initializing, defaultPage, logout } = useAuth();
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const onHashChange = () => forceUpdate((n) => n + 1);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // After a fresh login, auto-redirect to the dashboard the user picked on the
  // pre-login entry flow (falls back to the role-appropriate landing).
  useEffect(() => {
    if (!user || !defaultPage) return;
    if (getPreviewPath()) return; // user is already navigated somewhere
    const sel = readEntrySelection();
    const slug = sel?.slug ?? resolveLandingSlug(defaultPage, user.role);
    window.location.hash = `#/preview/${slug}`;
  }, [user, defaultPage]);

  if (initializing) {
    return (
      <div
        dir="rtl"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #0A1628 0%, #0F1C35 40%, #1B3A6B 100%)",
          fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif",
          color: "#94a3b8",
          fontSize: 14,
        }}
      >
        جاري التحميل...
      </div>
    );
  }

  // Public routes (no auth) — onboarding + invitation accept.
  const hash = window.location.hash;
  if (!user && hash.startsWith("#/onboarding")) {
    return <OnboardingWizard onDone={() => (window.location.hash = "#/login")} />;
  }
  if (!user && hash.startsWith("#/accept-invitation/")) {
    return <InvitationAcceptPage onDone={() => (window.location.hash = "#/")} />;
  }

  if (!user) {
    // Pre-login entry: choose dashboard → choose role → login.
    return <EntryFlow />;
  }

  const previewPath = getPreviewPath();
  if (previewPath) {
    return (
      <>
        <SubscriptionExpiredBanner />
        <PreviewRenderer
          componentPath={previewPath}
          modules={discoveredModules}
        />
      </>
    );
  }

  // Just authenticated with a pending entry selection → the redirect effect is about to
  // navigate to the chosen dashboard; show a loader instead of flashing the landing.
  if (readEntrySelection()) {
    return (
      <div
        dir="rtl"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #0A1628 0%, #0F1C35 40%, #1B3A6B 100%)",
          fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif",
          color: "#94a3b8",
          fontSize: 14,
        }}
      >
        جاري فتح الداشبورد...
      </div>
    );
  }

  return (
    <>
      <SubscriptionExpiredBanner />
      <ASABLanding onLogout={() => void logout()} userName={user.name} />
    </>
  );
}

export default App;
