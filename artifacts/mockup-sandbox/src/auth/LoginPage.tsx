import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { getErrorMessage } from "../api/errors";
import { isTwoFactorChallenge } from "../api/auth";
import { ForgotPasswordPage } from "./ForgotPasswordPage";

export function LoginPage() {
  const { login, loginWith2fa, loggingIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotting, setForgotting] = useState(false);
  // 2FA step-up state.
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");

  if (forgotting) return <ForgotPasswordPage onDone={() => setForgotting(false)} />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Step 2 of 2FA — submit the OTP against the step-up token.
    if (twoFactorToken) {
      if (!otpCode) {
        toast.error("من فضلك أدخل رمز التحقق");
        return;
      }
      try {
        await loginWith2fa(twoFactorToken, otpCode);
        toast.success("تم تسجيل الدخول بنجاح");
      } catch (err) {
        toast.error(getErrorMessage(err, "ar"));
      }
      return;
    }
    if (!email || !password) {
      toast.error("من فضلك أدخل البريد وكلمة المرور");
      return;
    }
    try {
      const res = await login(email, password);
      if (isTwoFactorChallenge(res)) {
        // Backend wants a second factor — show the OTP input.
        setTwoFactorToken(res.twoFactorToken);
        toast("أدخل رمز التحقق الثنائي");
        return;
      }
      toast.success("تم تسجيل الدخول بنجاح");
    } catch (err) {
      toast.error(getErrorMessage(err, "ar"));
    }
  }

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
        padding: "24px",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(124,58,237,0.25)",
          borderRadius: 20,
          padding: "36px 32px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        {/* Logo */}
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
                fontSize: 28,
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
              نظام الإدارة المالية
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
          تسجيل الدخول
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "#94a3b8",
            margin: "0 0 28px",
            textAlign: "center",
          }}
        >
          أدخل بياناتك للوصول إلى لوحة التحكم
        </p>

        {/* Email */}
        <label
          style={{
            display: "block",
            fontSize: 12,
            color: "#cbd5e1",
            marginBottom: 6,
            fontWeight: 600,
          }}
        >
          البريد الإلكتروني
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoFocus
          required
          disabled={loggingIn}
          placeholder="name@example.com"
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "white",
            fontSize: 14,
            marginBottom: 18,
            outline: "none",
            direction: "ltr",
            textAlign: "right",
            fontFamily: "inherit",
          }}
        />

        {/* Password */}
        <label
          style={{
            display: "block",
            fontSize: 12,
            color: "#cbd5e1",
            marginBottom: 6,
            fontWeight: 600,
          }}
        >
          كلمة المرور
        </label>
        <div style={{ position: "relative", marginBottom: 24 }}>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            disabled={loggingIn}
            style={{
              width: "100%",
              padding: "12px 14px",
              paddingInlineStart: 44,
              borderRadius: 10,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "white",
              fontSize: 14,
              outline: "none",
              direction: "ltr",
              textAlign: "right",
              fontFamily: "inherit",
            }}
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
            }}
          >
            {showPassword ? "إخفاء" : "إظهار"}
          </button>
        </div>

        {/* 2FA OTP — shown only after a step-up challenge */}
        {twoFactorToken && (
          <>
            <label
              style={{
                display: "block",
                fontSize: 12,
                color: "#cbd5e1",
                marginBottom: 6,
                fontWeight: 600,
              }}
            >
              رمز التحقق الثنائي
            </label>
            <input
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="------"
              disabled={loggingIn}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(124,58,237,0.4)",
                color: "white",
                fontSize: 18,
                letterSpacing: 6,
                marginBottom: 24,
                outline: "none",
                direction: "ltr",
                textAlign: "center",
                fontFamily: "inherit",
              }}
            />
          </>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loggingIn}
          style={{
            width: "100%",
            padding: "13px",
            background: loggingIn
              ? "rgba(124,58,237,0.5)"
              : "linear-gradient(135deg, #7C3AED, #00D9FF)",
            color: "white",
            border: "none",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            cursor: loggingIn ? "wait" : "pointer",
            fontFamily: "inherit",
            transition: "transform 0.15s",
          }}
        >
          {loggingIn
            ? "جاري الدخول..."
            : twoFactorToken
              ? "تأكيد الرمز"
              : "تسجيل الدخول"}
        </button>

        <button
          type="button"
          onClick={() => setForgotting(true)}
          style={{
            display: "block",
            width: "100%",
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            fontSize: 12,
            cursor: "pointer",
            marginTop: 14,
            fontFamily: "inherit",
          }}
        >
          نسيت كلمة المرور؟
        </button>

        <button
          type="button"
          onClick={() => (window.location.hash = "#/onboarding")}
          style={{
            display: "block",
            width: "100%",
            background: "transparent",
            border: "1px solid rgba(124,58,237,0.3)",
            color: "#a78bfa",
            fontSize: 12,
            cursor: "pointer",
            marginTop: 12,
            padding: "10px",
            borderRadius: 10,
            fontFamily: "inherit",
            fontWeight: 600,
          }}
        >
          تسجيل شركة جديدة
        </button>

        <p
          style={{
            fontSize: 11,
            color: "#475569",
            textAlign: "center",
            marginTop: 22,
            marginBottom: 0,
          }}
        >
          عصب ASAB · نظام إدارة مالية المطاعم
        </p>
      </form>
    </div>
  );
}
