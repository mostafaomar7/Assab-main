import { Download, Trash2, FileText, Loader2 } from "lucide-react";
import { downloadBlob } from "../../api/client";
import { useAttachment, useDeleteAttachment } from "../../api/queries/uploads";

interface Props {
  attachmentIds: string[];
  onDelete?: (id: string) => void;
  readOnly?: boolean;
  /** Optional translate function — falls back to Arabic-only. */
  t?: (ar: string, en: string) => string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function AttachmentList({
  attachmentIds,
  onDelete,
  readOnly = false,
  t = (ar) => ar,
}: Props) {
  if (attachmentIds.length === 0) {
    return (
      <div
        dir="rtl"
        style={{
          fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif",
          fontSize: 12,
          color: "#94a3b8",
          padding: 12,
          textAlign: "center",
        }}
      >
        {t("لا توجد مرفقات", "No attachments")}
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      style={{
        fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {attachmentIds.map((id) => (
        <AttachmentRow
          key={id}
          id={id}
          onDelete={onDelete}
          readOnly={readOnly}
          t={t}
        />
      ))}
    </div>
  );
}

function AttachmentRow({
  id,
  onDelete,
  readOnly,
  t,
}: {
  id: string;
  onDelete?: (id: string) => void;
  readOnly: boolean;
  t: (ar: string, en: string) => string;
}) {
  const { data: attachment, isLoading, isError } = useAttachment(id);
  const deleteAttachment = useDeleteAttachment();

  const handleDownload = async () => {
    if (!attachment) return;
    await downloadBlob(
      `/attachments/${id}/download`,
      attachment.filename || `attachment-${id}`,
    );
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(id);
    } else {
      deleteAttachment.mutate(id);
    }
  };

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "rgba(124,58,237,0.08)",
          color: "#7C3AED",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <FileText size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {isLoading && (
          <div
            style={{
              fontSize: 12,
              color: "#94a3b8",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Loader2 size={12} className="spin" />
            {t("جاري التحميل...", "Loading...")}
          </div>
        )}
        {isError && (
          <div style={{ fontSize: 12, color: "#ef4444" }}>
            {t("تعذر تحميل المرفق", "Failed to load attachment")}
          </div>
        )}
        {attachment && (
          <>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#1e293b",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {attachment.filename}
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>
              {formatBytes(attachment.sizeBytes)}
              {attachment.mimeType ? ` · ${attachment.mimeType}` : ""}
            </div>
          </>
        )}
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        <button
          onClick={handleDownload}
          disabled={!attachment}
          title={t("تنزيل", "Download")}
          style={{
            background: "rgba(0,217,255,0.08)",
            border: "1px solid rgba(0,217,255,0.2)",
            color: "#00B8DB",
            borderRadius: 8,
            width: 32,
            height: 32,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: attachment ? "pointer" : "not-allowed",
            opacity: attachment ? 1 : 0.4,
          }}
        >
          <Download size={14} />
        </button>
        {!readOnly && (
          <button
            onClick={handleDelete}
            disabled={deleteAttachment.isPending}
            title={t("حذف", "Delete")}
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#ef4444",
              borderRadius: 8,
              width: 32,
              height: 32,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: deleteAttachment.isPending ? "not-allowed" : "pointer",
              opacity: deleteAttachment.isPending ? 0.5 : 1,
            }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
