import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { api } from "../api/client";
import { getErrorMessage } from "../api/errors";
import { setTokens } from "../api/tokens";
import type { LoginResponse } from "../api/types";

interface Props {
  onDone: () => void;
}

interface AcceptResponse extends LoginResponse {}

/** Reads the invitation token from the current URL hash (`#/accept-invitation/{token}`). */
function readTokenFromHash(): string {
  const h = window.location.hash || "";
  const m = h.match(/^#\/accept-invitation\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

export function InvitationAcceptPage({ onDone }: Props) {
  const [token, setToken] = useState<string>(() => readTokenFromHash());
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Track external hash changes (e.g. user clicks a different invite link).
  useEffect(() => {
    const handler = () => setToken(readTokenFromHash());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const mut = useMutation({
    mutationFn: async () => {
      const res = await api.post<AcceptResponse>(
        "/company/invitations/accept",
        { token, name, password, phone: phone || undefined },
      );
      return res.data;
    },
    onSuccess: (data) => {
      // Persist tokens so the next requests authenticate.
      setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      toast.success("تم قبول الدعوة — مرحباً بك في عصب");
      // Route to backend-suggested default page. Full reload re-bootstraps AuthContext.
      const fallback = "/preview/asab/CompanyDashboard";
      const target = data.defaultPage && data.defaultPage.includes("/")
        ? `/preview/${data.defaultPage}`
        : fallback;
      window.location.hash = target;
      // Trigger reload so the bootstrap effect in AuthProvider runs with new tokens.
      window.location.reload();
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      toast.error("رابط الدعوة غير صالح");
      return;
    }
    if (!name || !password) {
      toast.error("أكمل الاسم وكلمة المرور");
      return;
    }
    if (password.length < 8) {
      toast.error("كلمة المرور لازم تكون 8 خانات على الأقل");
      return;
    }
    mut.mutate();
  }

  const tokenMissing = !token;

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(145deg, #0A1628 0%, #0F1C35 40%, #1B3A6B 100%)",
        fontFamily:
          "'IBM Plex Sans Arabic', 'Segoe UI', system-ui, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 440,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(124,58,237,0.25)",
          borderRadius: 20,
          padding: "36px 32px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        {/* Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #7C3AED, #00D9FF)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 900,
              color: "white",
            }}
          >
            ع
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: "white",
                lineHeight: 1,
              }}
            >
              عصب{" "}
              <span style={{ color: "#00D9FF", fontFamily: "system-ui" }}>
                ASAB
              </span>
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
              قبول الدعوة
            </div>
          </div>
        </div>

        <h1
          style={{
            fontSize: 18,
            color: "white",
            fontWeight: 700,
            margin: "0 0 4px",
            textAlign: "center",
          }}
        >
          إكمال إعداد الحساب
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "#94a3b8",
            margin: "0 0 24px",
            textAlign: "center",
          }}
        >
          أدخل بياناتك لاستلام الدعوة وفتح لوحة التحكم
        </p>

        {tokenMissing && (
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#fca5a5",
              fontSize: 12,
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            رابط الدعوة غير صالح أو منتهي
          </div>
        )}

        {/* Name */}
        <label style={labelStyle}>الاسم الكامل</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          disabled={mut.isPending}
          style={inputStyle}
        />

        {/* Phone */}
        <label style={labelStyle}>رقم الهاتف (اختياري)</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={mut.isPending}
          style={{ ...inputStyle, direction: "ltr" }}
        />

        {/* Password */}
        <label style={labelStyle}>كلمة المرور</label>
        <div style={{ position: "relative", marginBottom: 24 }}>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            disabled={mut.isPending}
            autoComplete="new-password"
            style={{ ...inputStyle, marginBottom: 0, paddingInlineStart: 44 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            style={{
              position: "absolute",
              insetInlineStart: 8,
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: 11,
              padding: "4px 8px",
              fontFamily: "inherit",
            }}
          >
            {showPassword ? "إخفاء" : "إظهار"}
          </button>
        </div>

        <button
          type="submit"
          disabled={mut.isPending || tokenMissing}
          style={{
            width: "100%",
            padding: "13px",
            background:
              mut.isPending || tokenMissing
                ? "rgba(124,58,237,0.5)"
                : "linear-gradient(135deg, #7C3AED, #00D9FF)",
            color: "white",
            border: "none",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            cursor: mut.isPending ? "wait" : tokenMissing ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {mut.isPending ? "جاري التفعيل…" : "قبول الدعوة وفتح الحساب"}
        </button>

        <button
          type="button"
          onClick={onDone}
          disabled={mut.isPending}
          style={{
            display: "block",
            width: "100%",
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            fontSize: 12,
            cursor: mut.isPending ? "wait" : "pointer",
            marginTop: 14,
            fontFamily: "inherit",
          }}
        >
          رجوع لتسجيل الدخول
        </button>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#cbd5e1",
  marginBottom: 6,
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "white",
  fontSize: 14,
  marginBottom: 18,
  outline: "none",
  direction: "rtl",
  textAlign: "right",
  fontFamily: "inherit",
};
