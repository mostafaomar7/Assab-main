// ─── Roles ───────────────────────────────────────────────────────────────────
export type RoleKey =
  | "admin"
  | "company-admin"
  | "head"
  | "accountant"
  | "branch"
  | "procurement"
  | "supplier";

// ─── Authentication ──────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: RoleKey;
  /** Null only for platform `admin`. */
  companyId: string | null;
  brandIds?: string[];
  restaurantIds?: string[];
  branchIds?: string[];
  avatar?: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  companyId: string | null;
  /** Backend tells us where to land the user after login. */
  defaultPage: string;
}

export interface MeResponse extends User {
  /** Permission map (key → boolean) for UI gating. */
  permissions: Record<string, boolean>;
}

// ─── Operations (the 6-stage approval pipeline core) ─────────────────────────
export type ModuleKey =
  | "sales"
  | "expenses"
  | "purchases"
  | "inventory"
  | "shifts"
  | "employees"
  | "cash"
  | "waste";

export type OperationStatus =
  | "pending"
  | "approved"
  | "final-approved"
  | "rejected";

export type MatchStatus = "match" | "variance" | "unknown";

export interface OperationActor {
  id: string;
  name: string;
}

export interface Operation {
  id: string;
  /** Human ID, e.g. "OPS-2401". */
  publicId: string;
  moduleKey: ModuleKey;
  status: OperationStatus;
  match?: MatchStatus;
  origin?: "branch-upload" | "system" | "manual";
  branchId: string;
  branchName: string;
  brandId?: string;
  brandName?: string;
  restaurantId?: string;
  restaurantName?: string;
  /** Integer halalas. */
  amountHalalas: number;
  operationDate: string;
  createdAt: string;
  updatedAt: string;
  submittedBy?: OperationActor;
  approvedBy?: OperationActor | null;
  approvedAt?: string | null;
  finalApprovedBy?: OperationActor | null;
  finalApprovedAt?: string | null;
  rejectedBy?: OperationActor | null;
  rejectedAt?: string | null;
  rejectReason?: string | null;
  rejectNotes?: string | null;
  isConditional?: boolean;
  conditionalNote?: string | null;
  isCorrection?: boolean;
  correctiveRefId?: string | null;
  erpPosted?: boolean;
  erpBatchId?: string | null;
}

export interface AuditEvent {
  icon: string;
  action: string;
  by: string;
  time: string;
  isTerminal?: boolean;
  meta?: Record<string, unknown>;
}

// ─── Notifications ───────────────────────────────────────────────────────────
export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  refType?: string | null;
  refId?: string | null;
  readAt?: string | null;
  createdAt: string;
}

// ─── Common Lookup row ───────────────────────────────────────────────────────
export interface LookupRow {
  id: string;
  name: string;
  nameAr?: string;
  parentId?: string | null;
  extra?: Record<string, unknown>;
}

// Re-export error & page types for convenience.
export type { Page } from "../client";
export { ApiError, isApiError, getErrorMessage } from "../errors";
