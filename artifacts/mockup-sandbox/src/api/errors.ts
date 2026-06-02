export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    messageAr?: string;
    details?: Record<string, unknown>;
  };
  requestId?: string;
}

export class ApiError extends Error {
  code: string;
  messageAr: string;
  details?: Record<string, unknown>;
  requestId?: string;
  status: number;

  constructor(body: ApiErrorBody, status: number) {
    super(body.error.message);
    this.code = body.error.code;
    this.messageAr = body.error.messageAr || body.error.message;
    this.details = body.error.details;
    this.requestId = body.requestId;
    this.status = status;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

export function getErrorMessage(e: unknown, lang: "ar" | "en" = "ar"): string {
  if (isApiError(e)) return lang === "ar" ? e.messageAr : e.message;
  if (e instanceof Error) return e.message;
  return lang === "ar" ? "حدث خطأ غير متوقع" : "An unexpected error occurred";
}
