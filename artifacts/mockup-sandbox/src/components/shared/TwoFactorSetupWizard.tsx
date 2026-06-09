import { useState } from "react";
import { Shield, X, Copy, Check, Loader2, KeyRound } from "lucide-react";
import {
  useTwoFactorStatus,
  useSetup2FA,
  useVerify2FA,
  useDisable2FA,
  type TwoFactorMethod,
  type TwoFactorSetupTotp,
} from "../../api/queries/twoFactor";

interface Props {
  open: boolean;
  onClose: () => void;
  t?: (ar: string, en: string) => string;
}

const FONT = "'IBM Plex Sans Arabic', system-ui, sans-serif";

type Step = "method" | "scan" | "backup" | "disable";

export function TwoFactorSetupWizard({ open, onClose, t = (ar) => ar }: Props) {
  const { data: status } = useTwoFactorStatus();
  const setupMut = useSetup2FA();
  const verifyMut = useVerify2FA();
  const disableMut = useDisable2FA();

  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<TwoFactorMethod>("totp");
  const [setupData, setSetupData] = useState<TwoFactorSetupTotp | { sentTo: string } | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const enabled = Boolean(status?.enabled);

  const reset = () => {
    setStep(enabled ? "disable" : "method");
    setSetupData(null);
    setCode("");
    setBackupCodes([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const startSetup = async () => {
    const res = await setupMut.mutateAsync(method);
    setSetupData(res);
    setStep("scan");
  };

  const verify = async () => {
    const res = await verifyMut.mutateAsync(code);
    setBackupCodes(res.backupCodes);
    setStep("backup");
  };

  const disable = async () => {
    await disableMut.mutateAsync(code);
    handleClose();
  };

  const copyBackup = () => {
    navigator.clipboard?.writeText(backupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const totp = setupData as TwoFactorSetupTotp | null;
  const sms = setupData as { sentTo: string } | null;

  const primaryBtn: React.CSSProperties = {
    padding: "11px 22px",
    background: "linear-gradient(135deg, #7C3AED, #00D9FF)",
    color: "white",
    border: "none",
    borderRadius: 9,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: FONT,
  };
  const codeInput: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid rgba(124,58,237,0.4)",
    fontSize: 20,
    letterSpacing: 6,
    textAlign: "center",
    direction: "ltr",
    fontFamily: FONT,
    marginBottom: 16,
  };

  // Effective step: if 2FA is already enabled and user just opened, show disable.
  const effStep: Step = step === "method" && enabled ? "disable" : step;

  return (
    <div
      onClick={handleClose}
      style={{ position: "fixed", inset: 0, background: "rgba(15,28,53,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
        style={{ width: "100%", maxWidth: 460, background: "white", borderRadius: 16, padding: 26, fontFamily: FONT, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: "linear-gradient(135deg, #7C3AED, #00D9FF)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={20} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#1e293b" }}>
                {t("المصادقة الثنائية", "Two-Factor Auth")}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                {enabled ? t("مُفعّلة على حسابك", "Enabled on your account") : t("طبقة حماية إضافية", "Extra security layer")}
              </div>
            </div>
          </div>
          <button onClick={handleClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Step: choose method */}
        {effStep === "method" && (
          <>
            <p style={{ fontSize: 13, color: "#475569", marginBottom: 14 }}>
              {t("اختر طريقة التحقق:", "Choose a verification method:")}
            </p>
            {([["totp", "تطبيق المصادقة (Google Authenticator)", "Authenticator app"], ["sms", "رسالة نصية (SMS)", "Text message"]] as const).map(([m, ar, en]) => (
              <button
                key={m}
                onClick={() => setMethod(m as TwoFactorMethod)}
                style={{
                  width: "100%",
                  textAlign: "start",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: method === m ? "2px solid #7C3AED" : "1px solid #e2e8f0",
                  background: method === m ? "rgba(124,58,237,0.05)" : "white",
                  cursor: "pointer",
                  marginBottom: 10,
                  fontFamily: FONT,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#334155",
                }}
              >
                {t(ar, en)}
              </button>
            ))}
            <button onClick={startSetup} disabled={setupMut.isPending} style={{ ...primaryBtn, width: "100%", marginTop: 8 }}>
              {setupMut.isPending ? <Loader2 size={16} className="animate-spin" /> : t("متابعة", "Continue")}
            </button>
          </>
        )}

        {/* Step: scan QR / SMS sent */}
        {effStep === "scan" && (
          <>
            {method === "totp" && totp && (
              <>
                <p style={{ fontSize: 13, color: "#475569", marginBottom: 12 }}>
                  {t("امسح رمز QR بتطبيق المصادقة، ثم أدخل الرمز:", "Scan the QR with your authenticator app, then enter the code:")}
                </p>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                  <img src={totp.qrCodeUrl} alt="2FA QR" style={{ width: 168, height: 168, borderRadius: 12, border: "1px solid #e2e8f0" }} />
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 14, direction: "ltr", wordBreak: "break-all" }}>
                  {t("أو أدخل المفتاح يدوياً:", "Or enter the secret manually:")} <code>{totp.secret}</code>
                </div>
              </>
            )}
            {method === "sms" && sms && (
              <p style={{ fontSize: 13, color: "#475569", marginBottom: 14 }}>
                {t("أرسلنا رمزاً إلى", "We sent a code to")} <strong style={{ direction: "ltr", display: "inline-block" }}>{sms.sentTo}</strong>
              </p>
            )}
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} inputMode="numeric" autoFocus placeholder="------" style={codeInput} />
            <button onClick={verify} disabled={verifyMut.isPending || !code} style={{ ...primaryBtn, width: "100%", opacity: code ? 1 : 0.6 }}>
              {verifyMut.isPending ? <Loader2 size={16} className="animate-spin" /> : t("تأكيد وتفعيل", "Verify & Enable")}
            </button>
          </>
        )}

        {/* Step: backup codes */}
        {effStep === "backup" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#059669", marginBottom: 12 }}>
              <Check size={18} />
              <span style={{ fontSize: 14, fontWeight: 700 }}>{t("تم التفعيل بنجاح", "Successfully enabled")}</span>
            </div>
            <p style={{ fontSize: 12, color: "#475569", marginBottom: 12 }}>
              {t("احفظ رموز الاحتياط هذه في مكان آمن — كل رمز يُستخدم مرة واحدة:", "Save these backup codes somewhere safe — each is single-use:")}
            </p>
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14, direction: "ltr" }}>
              {backupCodes.map((c) => (
                <code key={c} style={{ fontSize: 13, fontFamily: "monospace", color: "#1e293b", textAlign: "center" }}>{c}</code>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={copyBackup} style={{ ...primaryBtn, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? t("تم النسخ", "Copied") : t("نسخ", "Copy")}
              </button>
              <button onClick={handleClose} style={{ flex: 1, padding: "11px 22px", background: "white", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>
                {t("تم", "Done")}
              </button>
            </div>
          </>
        )}

        {/* Step: disable */}
        {effStep === "disable" && (
          <>
            <div style={{ display: "flex", gap: 8, alignItems: "center", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 12, marginBottom: 14 }}>
              <KeyRound size={18} style={{ color: "#dc2626" }} />
              <span style={{ fontSize: 12, color: "#991b1b" }}>
                {t("لإيقاف المصادقة الثنائية، أدخل رمزاً حالياً أو رمز احتياط.", "To disable 2FA, enter a current code or a backup code.")}
              </span>
            </div>
            {status?.backupCodesRemaining != null && (
              <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>
                {t("رموز الاحتياط المتبقية:", "Backup codes remaining:")} {status.backupCodesRemaining}
              </p>
            )}
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} inputMode="numeric" autoFocus placeholder="------" style={codeInput} />
            <button onClick={disable} disabled={disableMut.isPending || !code} style={{ width: "100%", padding: "11px 22px", background: code ? "#dc2626" : "#cbd5e1", color: "white", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: code ? "pointer" : "not-allowed", fontFamily: FONT }}>
              {disableMut.isPending ? <Loader2 size={16} className="animate-spin" /> : t("إيقاف المصادقة الثنائية", "Disable 2FA")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
