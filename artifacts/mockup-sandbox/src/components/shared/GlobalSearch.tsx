import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useSearch, type SearchResult } from "../../api/queries/misc";

interface Props {
  /** Optional translate helper; falls back to Arabic. */
  t?: (ar: string, en: string) => string;
  /** Optional type-filter (e.g. "ops" | "branches" | …). */
  type?: string;
  placeholder?: string;
  /** Theme — "light" for dashboards on white, "dark" for sidebar. */
  theme?: "light" | "dark";
}

const TYPE_LABELS_AR: Record<string, string> = {
  ops: "العمليات",
  branches: "الفروع",
  users: "المستخدمون",
  suppliers: "الموردون",
  items: "الأصناف",
};

const TYPE_LABELS_EN: Record<string, string> = {
  ops: "Operations",
  branches: "Branches",
  users: "Users",
  suppliers: "Suppliers",
  items: "Items",
};

const GROUP_ORDER = ["ops", "branches", "users", "suppliers", "items"];

function useDebounced<T>(value: T, delayMs: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return v;
}

export function GlobalSearch({
  t = (ar) => ar,
  type,
  placeholder,
  theme = "light",
}: Props) {
  const [raw, setRaw] = useState("");
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(raw.trim(), 300);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const { data, isLoading, isFetching } = useSearch(debounced, type);

  // Group results by type (prefer backend-grouped payload when available).
  const grouped = useMemo<Record<string, SearchResult[]>>(() => {
    if (!data) return {};
    if (data.groupedByType && Object.keys(data.groupedByType).length > 0) {
      return data.groupedByType;
    }
    const out: Record<string, SearchResult[]> = {};
    for (const r of data.results ?? []) {
      const key = r.type || "other";
      (out[key] ||= []).push(r);
    }
    return out;
  }, [data]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const totalResults = useMemo(
    () => Object.values(grouped).reduce((n, arr) => n + arr.length, 0),
    [grouped],
  );

  const handlePick = (r: SearchResult) => {
    setOpen(false);
    setRaw("");
    if (!r.link) return;
    // Backend may return either a full hash route ("#/preview/...") or a path ("/preview/...").
    if (r.link.startsWith("#")) {
      window.location.hash = r.link.slice(1);
    } else if (r.link.startsWith("/")) {
      window.location.hash = r.link;
    } else {
      window.location.hash = `/${r.link}`;
    }
  };

  const dark = theme === "dark";
  const bg = dark ? "rgba(255,255,255,0.05)" : "#f8fafc";
  const border = dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0";
  const textColor = dark ? "#e2e8f0" : "#1e293b";
  const placeholderColor = dark ? "#94a3b8" : "#94a3b8";
  const dropdownBg = "white";

  return (
    <div
      ref={wrapRef}
      dir="rtl"
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 480,
        fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Search
          size={16}
          style={{
            position: "absolute",
            insetInlineStart: 12,
            color: placeholderColor,
            pointerEvents: "none",
          }}
        />
        <input
          type="text"
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder ?? t("بحث عمليات، فروع، مستخدمين…", "Search operations, branches, users…")}
          style={{
            width: "100%",
            padding: "10px 14px",
            paddingInlineStart: 36,
            paddingInlineEnd: raw ? 36 : 14,
            borderRadius: 10,
            background: bg,
            border,
            color: textColor,
            fontSize: 13,
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        {raw && (
          <button
            type="button"
            onClick={() => {
              setRaw("");
              setOpen(false);
            }}
            title={t("مسح", "Clear")}
            style={{
              position: "absolute",
              insetInlineEnd: 8,
              background: "transparent",
              border: "none",
              color: placeholderColor,
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && debounced.length >= 2 && (
        <div
          dir="rtl"
          style={{
            position: "absolute",
            top: 46,
            insetInlineStart: 0,
            insetInlineEnd: 0,
            maxHeight: 460,
            background: dropdownBg,
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 12,
            boxShadow: "0 12px 36px rgba(0,0,0,0.15)",
            zIndex: 60,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
              fontSize: 11,
              color: "#64748b",
              fontWeight: 600,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>
              {isLoading || isFetching
                ? t("جاري البحث…", "Searching…")
                : `${totalResults} ${t("نتيجة", "results")}`}
            </span>
            {type && (
              <span style={{ color: "#7C3AED" }}>
                {TYPE_LABELS_AR[type] ?? type}
              </span>
            )}
          </div>

          {/* Body */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {!isLoading && totalResults === 0 && (
              <div
                style={{
                  padding: 32,
                  textAlign: "center",
                  fontSize: 12,
                  color: "#94a3b8",
                }}
              >
                {t("لا توجد نتائج", "No results")}
              </div>
            )}

            {GROUP_ORDER.filter((k) => (grouped[k]?.length ?? 0) > 0).map((key) => {
              const items = grouped[key];
              return (
                <div key={key}>
                  <div
                    style={{
                      padding: "8px 14px",
                      background: "#f8fafc",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#7C3AED",
                      letterSpacing: 0.3,
                    }}
                  >
                    {t(
                      TYPE_LABELS_AR[key] ?? key,
                      TYPE_LABELS_EN[key] ?? key,
                    )}{" "}
                    <span style={{ color: "#94a3b8", fontWeight: 500 }}>
                      ({items.length})
                    </span>
                  </div>
                  {items.map((r) => (
                    <button
                      key={`${key}:${r.id}`}
                      onClick={() => handlePick(r)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "right",
                        padding: "10px 14px",
                        background: "transparent",
                        border: "none",
                        borderBottom: "1px solid rgba(0,0,0,0.04)",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "rgba(124,58,237,0.04)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#1e293b",
                          marginBottom: 2,
                        }}
                      >
                        {r.title}
                        {r.publicId && (
                          <span
                            style={{
                              fontSize: 11,
                              color: "#94a3b8",
                              fontWeight: 500,
                              marginInlineStart: 8,
                            }}
                          >
                            · {r.publicId}
                          </span>
                        )}
                      </div>
                      {r.subtitle && (
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                          {r.subtitle}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              );
            })}

            {/* Any unknown groups not in GROUP_ORDER */}
            {Object.keys(grouped)
              .filter((k) => !GROUP_ORDER.includes(k))
              .map((key) => {
                const items = grouped[key];
                return (
                  <div key={key}>
                    <div
                      style={{
                        padding: "8px 14px",
                        background: "#f8fafc",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#7C3AED",
                      }}
                    >
                      {key} ({items.length})
                    </div>
                    {items.map((r) => (
                      <button
                        key={`${key}:${r.id}`}
                        onClick={() => handlePick(r)}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "right",
                          padding: "10px 14px",
                          background: "transparent",
                          border: "none",
                          borderBottom: "1px solid rgba(0,0,0,0.04)",
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                          {r.title}
                        </div>
                        {r.subtitle && (
                          <div style={{ fontSize: 11, color: "#64748b" }}>
                            {r.subtitle}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
