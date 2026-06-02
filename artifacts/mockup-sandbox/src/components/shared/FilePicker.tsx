import { useCallback, useRef, useState } from "react";
import { Upload, CheckCircle2, XCircle, Loader2, FileText } from "lucide-react";
import {
  useRequestPresignedUrl,
  type PresignedUrlResponse,
} from "../../api/queries/uploads";
import { useConfirmUpload } from "../../api/queries/uploads";

interface Props {
  accept?: string;
  multiple?: boolean;
  onUploaded: (attachmentIds: string[]) => void;
  label?: string;
  /** Optional translate function — falls back to Arabic-only. */
  t?: (ar: string, en: string) => string;
  /** Optional refType/refId to associate the upload with a domain entity. */
  refType?: string;
  refId?: string;
}

type FileStatus =
  | { kind: "pending"; progress: number }
  | { kind: "uploading"; progress: number }
  | { kind: "confirming" }
  | { kind: "done"; attachmentId: string }
  | { kind: "error"; message: string };

interface FileState {
  id: string;
  file: File;
  status: FileStatus;
}

function genLocalId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Upload a single file to the presigned URL.
 * - If `fields` is present → multipart POST (S3-style).
 * - Otherwise → raw PUT with the file as the body.
 */
async function uploadToPresignedUrl(
  file: File,
  presigned: PresignedUrlResponse,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const usesFields = Boolean(presigned.fields && Object.keys(presigned.fields).length > 0);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onerror = () => reject(new Error("network_error"));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`upload_failed_${xhr.status}`));
      }
    };

    if (usesFields) {
      const fd = new FormData();
      for (const [k, v] of Object.entries(presigned.fields ?? {})) {
        fd.append(k, v);
      }
      fd.append("file", file);
      xhr.open("POST", presigned.uploadUrl);
      xhr.send(fd);
    } else {
      xhr.open("PUT", presigned.uploadUrl);
      if (file.type) xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    }
  });
}

export function FilePicker({
  accept,
  multiple = false,
  onUploaded,
  label,
  t = (ar) => ar,
  refType,
  refId,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<FileState[]>([]);
  const [dragging, setDragging] = useState(false);

  const requestPresigned = useRequestPresignedUrl();
  const confirmUpload = useConfirmUpload();

  const updateItem = useCallback((id: string, patch: Partial<FileState>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );
  }, []);

  const processFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      const newItems: FileState[] = files.map((f) => ({
        id: genLocalId(),
        file: f,
        status: { kind: "pending", progress: 0 },
      }));
      setItems((prev) => [...prev, ...newItems]);

      const uploadedIds: string[] = [];

      for (const item of newItems) {
        try {
          updateItem(item.id, { status: { kind: "uploading", progress: 0 } });

          const presigned = await requestPresigned.mutateAsync({
            filename: item.file.name,
            mimeType: item.file.type || "application/octet-stream",
            sizeBytes: item.file.size,
            refType,
            refId,
          });

          await uploadToPresignedUrl(item.file, presigned, (pct) => {
            updateItem(item.id, { status: { kind: "uploading", progress: pct } });
          });

          updateItem(item.id, { status: { kind: "confirming" } });
          await confirmUpload.mutateAsync(presigned.attachmentId);

          updateItem(item.id, {
            status: { kind: "done", attachmentId: presigned.attachmentId },
          });
          uploadedIds.push(presigned.attachmentId);
        } catch (err) {
          const message = err instanceof Error ? err.message : "upload_failed";
          updateItem(item.id, { status: { kind: "error", message } });
        }
      }

      if (uploadedIds.length > 0) {
        onUploaded(uploadedIds);
      }
    },
    [confirmUpload, onUploaded, refId, refType, requestPresigned, updateItem],
  );

  const handleSelect = (fileList: FileList | null) => {
    if (!fileList) return;
    const arr = Array.from(fileList);
    void processFiles(multiple ? arr : arr.slice(0, 1));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    handleSelect(e.dataTransfer.files);
  };

  return (
    <div
      dir="rtl"
      style={{
        fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif",
        width: "100%",
      }}
    >
      {/* Dropzone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragging ? "#7C3AED" : "#cbd5e1"}`,
          background: dragging ? "rgba(124,58,237,0.06)" : "rgba(248,250,252,0.6)",
          borderRadius: 12,
          padding: 24,
          textAlign: "center",
          cursor: "pointer",
          transition: "all 150ms ease",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleSelect(e.target.files)}
          style={{ display: "none" }}
        />
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "linear-gradient(135deg, #7C3AED 0%, #00D9FF 100%)",
            color: "white",
            marginBottom: 12,
          }}
        >
          <Upload size={20} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>
          {label ?? t("اسحب الملفات هنا أو انقر للاختيار", "Drop files here or click to choose")}
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8" }}>
          {accept
            ? `${t("الأنواع المسموحة", "Allowed types")}: ${accept}`
            : t("جميع أنواع الملفات مدعومة", "All file types supported")}
          {multiple ? ` · ${t("متعدد", "multiple")}` : ""}
        </div>
      </div>

      {/* File list */}
      {items.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((it) => (
            <FileRow key={it.id} item={it} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function FileRow({
  item,
  t,
}: {
  item: FileState;
  t: (ar: string, en: string) => string;
}) {
  const { file, status } = item;

  let statusNode: React.ReactNode = null;
  let progress = 0;
  let progressColor = "#7C3AED";

  switch (status.kind) {
    case "pending":
      statusNode = (
        <span style={{ fontSize: 11, color: "#94a3b8" }}>
          {t("في الانتظار", "Pending")}
        </span>
      );
      break;
    case "uploading":
      progress = status.progress;
      statusNode = (
        <span style={{ fontSize: 11, color: "#7C3AED", display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Loader2 size={12} className="spin" />
          {t("جاري الرفع", "Uploading")} {progress}%
        </span>
      );
      break;
    case "confirming":
      progress = 100;
      progressColor = "#00D9FF";
      statusNode = (
        <span style={{ fontSize: 11, color: "#00D9FF", display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Loader2 size={12} className="spin" />
          {t("جاري التأكيد", "Confirming")}
        </span>
      );
      break;
    case "done":
      progress = 100;
      progressColor = "#10b981";
      statusNode = (
        <span style={{ fontSize: 11, color: "#10b981", display: "inline-flex", alignItems: "center", gap: 4 }}>
          <CheckCircle2 size={12} />
          {t("تم", "Done")}
        </span>
      );
      break;
    case "error":
      progress = 100;
      progressColor = "#ef4444";
      statusNode = (
        <span style={{ fontSize: 11, color: "#ef4444", display: "inline-flex", alignItems: "center", gap: 4 }}>
          <XCircle size={12} />
          {t("فشل", "Failed")}: {status.message}
        </span>
      );
      break;
  }

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
            {file.name}
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8" }}>
            {formatBytes(file.size)}
          </div>
        </div>
        <div>{statusNode}</div>
      </div>
      {/* Progress bar */}
      <div
        style={{
          width: "100%",
          height: 4,
          borderRadius: 2,
          background: "#f1f5f9",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: progressColor,
            transition: "width 150ms ease",
          }}
        />
      </div>
    </div>
  );
}
