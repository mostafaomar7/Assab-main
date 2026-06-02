import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { forgotPassword, resetPassword } from "../api/auth";
import { getErrorMessage } from "../api/errors";

type Step = "request" | "reset" | "done";

interface Props {
  onDone: () => void;
}

export function ForgotPasswordPage({ onDone }: Props) {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const requestMut = useMutation({
    mutationFn: () => forgotPassword(email),
    onSuccess: () => {
      toast.success("تم إرسال كود التحقق إلى بريدك");
      setStep("reset");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });

  const resetMut = useMutation({
    mutationFn: () => resetPassword(token, newPassword),
    onSuccess: () => {
      toast.success("تم تغيير كلمة المرور — يمكنك تسجيل الدخول");
      setStep("done");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });

  function handleRequest(e: FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error("أدخل البريد الإلكتروني");
      return;
    }
    requestMut.mutate();
  }

  function handleReset(e: FormEvent) {
    e.preventDefault();
    if (!token || !newPassword) {
      toast.error("أكمل بيانات الكود وكلمة المرور");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("كلمة المرور لازم تكون 8 خانات على الأقل");
      return;
    }
    resetMut.mutate();
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
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(124,58,237,0.25)",
          borderRadius: 20,
          padding: "36px 32px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #7C3AED, #00D9FF)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 900,
              color: "white",
              marginBottom: 12,
            }}
          >
            🔐
          </div>
          <h1 style={{ fontSize: 18, color: "white", margin: 0 }}>
            {step === "done" ? "تم!" : "استعادة كلمة المرور"}
          </h1>
          <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0" }}>
            {step === "request" && "أدخل بريدك لإرسال كود التحقق"}
            {step === "reset" && "أدخل الكود وكلمة المرور الجديدة"}
            {step === "done" && "تم تغيير كلمة المرور بنجاح"}
          </p>
        </div>

        {step === "request" && (
          <form onSubmit={handleRequest}>
            <label style={labelStyle}>البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              disabled={requestMut.isPending}
              style={inputStyle}
            />
            <button type="submit" disabled={requestMut.isPending} style={primaryBtn(requestMut.isPending)}>
              {requestMut.isPending ? "جاري الإرسال..." : "إرسال كود التحقق"}
            </button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={handleReset}>
            <label style={labelStyle}>كود التحقق</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              autoFocus
              disabled={resetMut.isPending}
              style={{ ...inputStyle, fontFamily: "monospace" }}
            />
            <label style={labelStyle}>كلمة المرور الجديدة</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              disabled={resetMut.isPending}
              style={inputStyle}
            />
            <button type="submit" disabled={resetMut.isPending} style={primaryBtn(resetMut.isPending)}>
              {resetMut.isPending ? "جاري الحفظ..." : "تغيير كلمة المرور"}
            </button>
          </form>
        )}

        {step === "done" && (
          <button onClick={onDone} style={primaryBtn(false)}>
            رجوع لتسجيل الدخول
          </button>
        )}

        {step !== "done" && (
          <button
            type="button"
            onClick={onDone}
            style={{
              width: "100%",
              padding: "12px",
              background: "transparent",
              color: "#94a3b8",
              border: "none",
              fontSize: 12,
              cursor: "pointer",
              marginTop: 8,
              fontFamily: "inherit",
            }}
          >
            رجوع لتسجيل الدخول
          </button>
        )}
      </div>
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
  direction: "ltr",
  textAlign: "right",
  fontFamily: "inherit",
};

const primaryBtn = (loading: boolean): React.CSSProperties => ({
  width: "100%",
  padding: "13px",
  background: loading ? "rgba(124,58,237,0.5)" : "linear-gradient(135deg, #7C3AED, #00D9FF)",
  color: "white",
  border: "none",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 700,
  cursor: loading ? "wait" : "pointer",
  fontFamily: "inherit",
});
