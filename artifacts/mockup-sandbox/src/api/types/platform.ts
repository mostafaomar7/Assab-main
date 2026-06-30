/**
 * Platform (ASAB) — domain types for the platform-tier endpoints under
 * `/api/v1/admin/*`, `/api/v1/head/*`, `/api/v1/accountant/*`, `/api/v1/branch/*`,
 * `/api/v1/procurement/*`, `/api/v1/asab/supplier/*`.
 *
 * Pragmatic: response shapes are pulled from BACKEND_API_SPEC.md §6 with
 * sensible defaults. Use `any` where the response shape is uncertain or
 * extensive — the goal is wired endpoints, not perfect types.
 */

// ─── Admin (platform tenant admin) ──────────────────────────────────────────
export interface PlatformAdminOverview {
  kpis: {
    brandCount: number;
    restaurantCount: number;
    branchCount: number;
    activeUserCount: number;
    brandsNeedingRenewal: number;
    uptime: string;
  };
  brandHierarchy: Array<{
    id: string;
    name: string;
    abbr?: string;
    color?: string;
    restaurantCount: number;
    branchCount: number;
    plan?: string;
    subStatus?: string;
    daysLeft?: number;
  }>;
  expiringBrands?: Array<Record<string, unknown>>;
  accountantsByRole?: Record<string, number>;
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  brands?: string[];
  restaurants?: string[];
  branches?: string[];
  modules?: string[];
  reportsTo?: string;
  scope?: "all" | "brand" | "restaurant" | "branch";
  status: "active" | "inactive";
  createdAt?: string;
}

export interface AdminCompany {
  id: string;
  name: string;
  logo?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  city?: string;
  plan?: "Basic" | "Professional" | "Enterprise" | string;
  status?: "active" | "suspended" | "trial" | string;
  modules?: string[];
  adminEmail?: string;
  maxUsers?: number | null;
  maxBranches?: number | null;
  createdAt?: string;
  [k: string]: unknown;
}

export interface AdminBrand {
  id: string;
  name: string;
  abbr?: string;
  color?: string;
  ownerEmail?: string;
  plan?: string;
  modules?: string[];
  restaurants?: AdminRestaurant[];
}

export interface AdminRestaurant {
  id: string;
  brandId: string;
  name: string;
  city?: string;
  status?: "active" | "suspended" | string;
  branches?: AdminBranch[];
}

export interface AdminBranch {
  id: string;
  restaurantId: string;
  name: string;
  manager?: string;
  managerUserId?: string;
  city?: string;
  address?: string;
  phone?: string;
}

export interface AdminRestaurantSubscription {
  id: string;
  restaurantId: string;
  restaurantName: string;
  brandId?: string;
  brandName?: string;
  plan: string;
  status: "active" | "warning" | "danger" | "expired" | string;
  expiresAt: string;
  daysLeft: number;
  monthlyPrice: number;
  autoRenew: boolean;
  reminderEnabled: boolean;
}

export interface AdminSubscription {
  id: string;
  brandId?: string;
  brandName?: string;
  plan: string;
  status: string;
  expiresAt?: string;
  monthlyPrice?: number;
  autoRenew?: boolean;
  reminderEnabled?: boolean;
}

export interface AdminDistribution {
  heads: Array<{
    id: string;
    name: string;
    avatar?: string;
    color?: string;
    accountantCount: number;
    restaurantCount: number;
  }>;
  accountants: Array<{
    id: string;
    name: string;
    avatar?: string;
    headId: string;
    restaurants: string[];
  }>;
  allRestaurants: string[];
  assignedRestaurants: string[];
  freeRestaurants: string[];
  accModules: Record<string, Record<string, string[]>>;
}

export type AdminPermission =
  | "view"
  | "submit"
  | "review"
  | "approve"
  | "final"
  | "none";

export interface AdminPermissionsMatrix {
  matrix: Array<{ module: string; perms: AdminPermission[] }>;
  roles: string[];
  legend: Record<AdminPermission, { labelAr: string; labelEn: string }>;
}

export interface AdminAuditLogEntry {
  id: string;
  action: string;
  actorName?: string;
  actorRole?: string;
  entityType?: string;
  entityId?: string;
  description?: string;
  ip?: string;
  occurredAt: string;
  before?: unknown;
  after?: unknown;
}

export interface AdminSettings {
  // Authoritative field names confirmed by backend (B4).
  notifications?: {
    approvalNotifications?: boolean;
    subscriptionAlerts?: boolean;
    dailyPerformanceReports?: boolean;
  } & Record<string, unknown>;
  backup?: {
    dailyAutoBackup?: boolean;
    weeklyBackup?: boolean;
    dataEncryption?: boolean;
  } & Record<string, unknown>;
  api?: {
    erpConnection?: boolean;
    paymentGatewayConnection?: boolean;
    mobileAppInterface?: boolean;
  } & Record<string, unknown>;
  security?: {
    twoFactorAuthRequired?: boolean;
    sessionDurationMinutes?: number;
    passwordPolicyEnabled?: boolean;
  } & Record<string, unknown>;
  [k: string]: unknown;
}

export interface AdminReportItem {
  key: string;
  label: string;
  description?: string;
  category?: string;
}

export type AdminBrandUploadType =
  | "sales-items"
  | "raw-materials"
  | "suppliers"
  | "employees"
  | "fixed-assets";

export interface AdminBrandUploadStatus {
  shared?: { sales?: boolean; materials?: boolean; suppliers?: boolean };
  employees?: Record<string, boolean>;
  assets?: Record<string, boolean>;
  completionPct?: number;
}

// ─── Head (platform) ────────────────────────────────────────────────────────
export interface PlatformHeadDashboard {
  kpis: {
    awaitingApproval?: number;
    finalApprovedAwaitingErp?: number;
    erpPosted?: number;
    rejected?: number;
    performanceRate?: number;
    // Enriched fields (post-MISSING_ENDPOINTS_SPEC):
    performanceRatePct?: number;
    totalReviewedThisMonth?: number;
    totalApprovedThisMonth?: number;
    totalRejectedThisMonth?: number;
    avgReviewTimeMinutes?: number;
    vsLastMonthDeltaPct?: number;
  };
  weeklyPerformance?: Array<{
    day: string;
    dayAr?: string;
    thisWeek: number;
    lastWeek: number;
  }>;
  pipeline?: Array<{ stageId: string; count: number }>;
  exceptions?: unknown[];
  moduleAggregation?: Array<{
    moduleKey: string;
    label: string;
    icon?: string;
    state: string;
    counts: { pending: number; approved: number; final: number; erp: number };
    totalAmount: number;
  }>;
}

export interface PlatformAccountantPerformanceRow {
  id: string;
  name: string;
  // Legacy fields (kept for back-compat with existing UI render paths):
  branchesCount?: number;
  reviewedCount?: number;
  approvedCount?: number;
  pendingCount?: number;
  rate?: number;
  prevMonthRate?: number;
  rating?: number;
  avgReviewTimeMinutes?: number;
  level?: string;
  recentActivities?: Array<{ text: string; timeAgo: string; module: string }>;
  // Enriched fields (post-MISSING_ENDPOINTS_SPEC):
  branchesAssignedCount?: number;
  approvalRatePct?: number;
  previousMonthRatePct?: number;
  avgReviewMinutes?: number;
  levelLabelAr?: string;
}

export interface PlatformHeadReminder {
  id: string;
  type: string;
  title: string;
  body?: string;
  priority?: string;
  refType?: string;
  refId?: string;
  isDone: boolean;
  dueAt?: string;
  createdAt: string;
}

export interface PlatformErpPreflight {
  checks: Array<{ ok: boolean; label: string; severity: "info" | "warning" | "error" }>;
  canProceed: boolean;
  warningCount: number;
}

export interface PlatformErpBatch {
  id: string;
  status: string;
  operationsCount: number;
  totalHalalas?: number;
  createdAt: string;
  completedAt?: string;
  fileUrl?: string;
}

// ─── Accountant (platform) ──────────────────────────────────────────────────
export interface PlatformAccountantDashboard {
  kpis: {
    awaitingReview: number;
    iApproved: number;
    finalApproved: number;
    approvalRate: number;
    overdueCount: number;
  };
  progress?: Record<string, { done: number; total: number; pct: number }>;
  pipeline?: unknown[];
  exceptions?: unknown[];
  modules?: Array<{
    id: string;
    key: string | null;
    label: string;
    icon?: string;
    pendingCount: number;
    totalCount: number;
  }>;
  recentOperations?: unknown[];
}

export interface PlatformAsset {
  id: string;
  name: string;
  category: string;
  branchId: string;
  branchName?: string;
  invNum?: string;
  cost: number;
  usefulLifeMonths: number;
  custodian?: string;
  status: "pending_branch" | "pending_accountant" | "confirmed" | string;
  notes?: string;
  createdAt?: string;
}

export interface PlatformAssetDraft {
  draftId: string;
  status: string;
  assetName?: string;
  category?: string;
  usefulLifeMonths?: number;
  targetBranches?: string[];
  custodian?: string;
  qty?: number;
  notes?: string;
}

export interface PlatformInventoryBranch {
  branchId: string;
  branchName: string;
  operationId?: string;
  status: "pending" | "approved" | "final-approved" | "rejected" | "not_submitted" | string;
  items: Array<{
    item: string;
    cat: string;
    unit: string;
    prev: number;
    curr: number;
    isAnomaly: boolean;
    pct: number;
  }>;
  anomalyCount: number;
  isFlagged: boolean;
  branchConfirmed: boolean;
  sentToConfirm: boolean;
  flaggedItemIndices: number[];
}

export interface PlatformShift {
  id: string;
  branchId: string;
  branchName?: string;
  supervisor?: string;
  startedAt?: string;
  endedAt?: string;
  status: "open" | "closed" | "needs-review" | string;
  cashInDrawer?: number;
  salesSystem?: number;
  variance?: number;
}

export interface PlatformEmployee {
  id: string;
  empNumber?: string;
  name: string;
  branchId?: string;
  branchName?: string;
  role?: string;
  monthlySalary?: number;
  active?: boolean;
}

export interface PlatformCashCustodyRow {
  id: string;
  branchId: string;
  branchName?: string;
  custodian?: string;
  balance?: number;
  status: string;
  lastTxnAt?: string;
}

export interface PlatformReminderRow {
  id: string;
  module: string;
  branchId?: string;
  branchName?: string;
  urgency?: string;
  status: "not_sent" | "sent" | "responded" | string;
  message?: string;
  response?: string;
  createdAt?: string;
}

export interface PlatformReminderRule {
  id: string;
  module: string;
  triggerHour: string;
  repeatHours: number;
  active: boolean;
}

// ─── Branch (platform) ─────────────────────────────────────────────────────
export interface PlatformBranchOverview {
  branch: { id: string; name: string; manager?: string };
  kpis: {
    todaySales: number;
    todayOrders: number;
    activeEmployees: number;
    requiredReportsCount: number;
  };
  requiredReports: Array<{ id: string; name: string; deadline: string; urgent: boolean }>;
  currentShift: {
    supervisor: string;
    startedAt: string;
    duration: string;
    ordersCount: number;
    salesAmount: number;
    cashAmount: number;
  } | null;
}

export interface PlatformBranchUploadStatus {
  date: string;
  reports: Array<{
    id: string;
    name: string;
    description: string;
    required: boolean;
    lastUpload: string | null;
    lastStatus: "success" | "late" | "missing";
    todayDeadline: string;
    uploadedToday: boolean;
  }>;
}

export type PlatformBranchReportType =
  | "sales"
  | "inventory"
  | "cash"
  | "waste"
  | "purchases"
  | "expenses";

export interface PlatformBranchEmployee {
  id: string;
  empNumber: string;
  name: string;
  nationalId?: string;
  role?: string;
  monthlySalary?: number;
  shiftType?: string;
  hireDate?: string;
}

export interface PlatformBranchSettings {
  workingHours?: { open: string; close: string };
  autoCloseShift?: boolean;
  deliveryAppsEnabled?: string[];
  cashAlertThreshold?: number;
  notificationPrefs?: { newReminders: boolean; opsApproved: boolean };
  [k: string]: unknown;
}

// ─── Procurement (platform) ────────────────────────────────────────────────
export interface PlatformProcurementOverview {
  kpis: {
    newOrders: number;
    consolidated: number;
    sentToSuppliers: number;
    ordersValueThisWeek: number;
  };
  newOrders?: Array<{
    id: string;
    branch: string;
    itemCount: number;
    total: number;
    urgency?: string;
  }>;
}

export interface PlatformProcurementOrder {
  id: string;
  publicId?: string;
  branchId: string;
  branchName?: string;
  supplierId?: string;
  supplierName?: string;
  status: string;
  total: number;
  itemCount?: number;
  urgency?: string;
  items?: Array<{
    id: string;
    name: string;
    unit?: string;
    ordered?: number;
    recommended?: number;
    dailyAvg?: number;
    price?: number;
    historicPrice?: number;
    qtyStatus?: "ok" | "over" | "under";
    priceStatus?: "ok" | "high";
  }>;
  anomalies?: { qtyOverCount: number; priceHighCount: number };
}

export interface PlatformProcurementSupplier {
  id: string;
  name: string;
  category?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  commercialReg?: string;
  paymentTerms?: string;
  rating?: number;
}

export interface PlatformProcurementItem {
  id: string;
  name: string;
  unit?: string;
  category?: string;
  defaultPrice?: number;
}

// ─── Supplier ───────────────────────────────────────────────────────────────
export interface SupplierOverview {
  kpis: {
    newOrders: number;
    acceptedThisMonth: number;
    totalSalesThisMonth: number;
    activeItems: number;
    totalItems: number;
  };
  recentOrders?: SupplierOrder[];
}

export interface SupplierOrder {
  id: string;
  publicId?: string;
  branchName?: string;
  status: "pending" | "accepted" | "rejected" | "delivered" | "confirmed" | string;
  total: number;
  deliveryDate?: string;
  items?: Array<{ name: string; unit: string; qty: number; price: number }>;
  createdAt?: string;
}

export interface SupplierReports {
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  topItems?: Array<{ name: string; qty: number; revenue: number }>;
  topBranches?: Array<{ branch: string; qty: number; revenue: number }>;
  monthly?: Array<{ month: string; revenue: number; orderCount: number }>;
}

export interface SupplierItem {
  id: string;
  code?: string;
  name: string;
  unit?: string;
  price: number;
  minQty?: number;
  status?: "active" | "inactive" | string;
}
