import { useLookup, type LookupType } from "../../api/queries";

interface Props {
  type: LookupType;
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  params?: Record<string, unknown>;
  /** Optional translate function — falls back to Arabic-only. */
  t?: (ar: string, en: string) => string;
  disabled?: boolean;
  id?: string;
  style?: React.CSSProperties;
}

/**
 * Reusable typed dropdown backed by /company/me/lookups/{type}.
 * Handles loading, error, and empty states.
 */
export function LookupSelect({
  type,
  value,
  onChange,
  placeholder,
  params,
  t = (ar) => ar,
  disabled,
  id,
  style,
}: Props) {
  const { data, isLoading, isError, error } = useLookup(type, params);

  const baseStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    fontSize: 13,
    fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    background: disabled ? "#f8fafc" : "white",
    color: "#1e293b",
    direction: "rtl",
    cursor: disabled ? "not-allowed" : "pointer",
    ...style,
  };

  if (isLoading) {
    return (
      <select id={id} dir="rtl" disabled style={baseStyle}>
        <option>{t("جاري التحميل...", "Loading...")}</option>
      </select>
    );
  }

  if (isError) {
    const msg = error instanceof Error ? error.message : "";
    return (
      <select
        id={id}
        dir="rtl"
        disabled
        style={{ ...baseStyle, borderColor: "#ef4444", color: "#ef4444" }}
        title={msg}
      >
        <option>{t("تعذر تحميل القائمة", "Failed to load")}</option>
      </select>
    );
  }

  const items = data ?? [];

  if (items.length === 0) {
    return (
      <select id={id} dir="rtl" disabled style={{ ...baseStyle, color: "#94a3b8" }}>
        <option>{t("لا توجد عناصر", "No items")}</option>
      </select>
    );
  }

  return (
    <select
      id={id}
      dir="rtl"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      style={baseStyle}
    >
      <option value="">{placeholder ?? t("اختر...", "Select...")}</option>
      {items.map((row) => (
        <option key={row.id} value={row.id}>
          {row.nameAr ?? row.name}
        </option>
      ))}
    </select>
  );
}
