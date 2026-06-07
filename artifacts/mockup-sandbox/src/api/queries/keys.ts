import type { ModuleKey, OperationStatus } from "../types";

/** Centralized query key factory. Use these for invalidation across hooks. */
export const queryKeys = {
  // Auth
  me: ["auth", "me"] as const,

  // Notifications
  notifications: (filter?: { unread?: boolean }) =>
    ["notifications", { filter }] as const,

  // Operations
  operations: (filter?: OperationsFilter) =>
    ["operations", { filter }] as const,
  operation: (id: string) => ["operations", id] as const,
  operationAudit: (id: string) => ["operations", id, "audit-trail"] as const,

  // Accountant dashboard
  accDashboard: ["accountant", "dashboard"] as const,

  // Sales recon
  salesDetails: (operationId: string) =>
    ["sales-details", operationId] as const,

  // Expenses
  expenseInvoices: (filter?: ExpenseFilter) =>
    ["expense-invoices", { filter }] as const,

  // Inventory
  inventoryBranches: (filter?: InventoryBranchesFilter) =>
    ["inventory", "branches", { filter }] as const,
  inventoryCatalog: ["inventory", "catalog"] as const,
  dailyInventoryList: (branchId: string) =>
    ["inventory", "daily-list", branchId] as const,

  // Waste
  waste: (filter?: WasteFilter) => ["waste", { filter }] as const,

  // Assets
  assets: (filter?: AssetFilter) => ["assets", { filter }] as const,
  assetDrafts: ["asset-drafts"] as const,

  // Shifts
  shifts: (filter?: ShiftFilter) => ["shifts", { filter }] as const,
  shiftConfigs: ["shifts", "configs"] as const,

  // Employees
  employees: (filter?: EmployeeFilter) =>
    ["employees", { filter }] as const,
  employeeMovements: (employeeId: string) =>
    ["employees", employeeId, "movements"] as const,

  // Cash custody
  cashCustody: (filter?: CashFilter) =>
    ["cash-custody", { filter }] as const,
  cashTransactions: (custodyId: string) =>
    ["cash-custody", custodyId, "transactions"] as const,

  // Reminders
  reminders: ["accountant", "reminders"] as const,

  // Reports catalog
  reports: ["reports"] as const,

  // Lookups
  lookup: (type: LookupType, params?: Record<string, unknown>) =>
    ["lookups", type, params ?? {}] as const,

  // ─── Company Admin ──────────────────────────────────────────────────────────
  companyAdminDashboard: ["company-admin", "dashboard"] as const,

  // Subscription / plans
  subscription: ["subscription"] as const,
  plans: ["plans"] as const,

  // Users / invitations
  companyUsers: (filter?: CompanyUsersFilter) =>
    ["company-users", { filter }] as const,
  companyInvitations: ["company-invitations"] as const,

  // Organization
  companyBrands: ["company-brands"] as const,
  companyModules: ["company-modules"] as const,
  companySettings: ["company-settings"] as const,

  // ─── Billing ────────────────────────────────────────────────────────────────
  billingSummary: ["billing", "summary"] as const,
  billingInvoices: (filter?: BillingInvoicesFilter) =>
    ["billing", "invoices", { filter }] as const,
  billingInvoice: (id: string) => ["billing", "invoices", id] as const,
  paymentMethods: ["billing", "payment-methods"] as const,
  billingAddress: ["billing", "address"] as const,

  // ─── Support ────────────────────────────────────────────────────────────────
  supportChannels: ["support", "channels"] as const,
  supportTickets: (filter?: SupportTicketsFilter) =>
    ["support", "tickets", { filter }] as const,
  supportTicket: (id: string) => ["support", "tickets", id] as const,

  // ─── Head ───────────────────────────────────────────────────────────────────
  headDashboard: ["head", "dashboard"] as const,
  accountantsPerformance: ["head", "accountants-performance"] as const,
  headReminders: ["head", "reminders"] as const,
  erpPreflight: ["erp", "preflight"] as const,
  erpEligibleOperations: ["erp", "eligible-operations"] as const,
  erpBatches: ["erp", "batches"] as const,
  erpBatchStatus: (batchId: string) => ["erp", "batches", batchId, "status"] as const,

  // ─── Branch Manager ─────────────────────────────────────────────────────────
  branchOverview: ["branch", "overview"] as const,
  branchEmployees: ["branch", "employees"] as const,
  branchItems: ["branch", "items"] as const,
  branchPurchaseRequests: ["branch", "purchase-requests"] as const,
  branchSuppliers: ["branch", "suppliers"] as const,
  branchSettings: ["branch", "settings"] as const,
  branchActiveShift: ["branch", "shifts", "active"] as const,

  // ─── Procurement ────────────────────────────────────────────────────────────
  procurementOverview: ["procurement", "overview"] as const,
  procurementOrders: (filter?: ProcurementOrdersFilter) =>
    ["procurement", "orders", { filter }] as const,
  procurementGroupedOrders: ["procurement", "orders", "grouped"] as const,
  procurementSentOrders: ["procurement", "orders", "sent"] as const,
  procurementItems: ["procurement", "items"] as const,
  itemPriceHistory: (id: string) =>
    ["procurement", "items", id, "price-history"] as const,
  procurementSuppliers: ["procurement", "suppliers"] as const,
  procurementReports: ["procurement", "reports"] as const,

  // ─── Attachments ────────────────────────────────────────────────────────────
  attachment: (id: string) => ["attachments", id] as const,

  // ─── Cross-cutting ──────────────────────────────────────────────────────────
  search: (q: string, type?: string) => ["search", { q, type }] as const,
  auditLogs: (filter?: AuditLogsFilter) => ["audit-logs", { filter }] as const,

  // ═══════════════════════════════════════════════════════════════════════════
  // PLATFORM (ASAB) — distinct namespace from /company/me/* hooks above.
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Platform Admin (/api/v1/admin/*) ──────────────────────────────────────
  platformAdminOverview: ["platform", "admin", "overview"] as const,
  platformAdminCompanies: (filter?: AdminCompaniesFilter) =>
    ["platform", "admin", "companies", { filter }] as const,
  platformAdminCompany: (id: string) =>
    ["platform", "admin", "companies", id] as const,
  platformAdminCompanyModules: (id: string) =>
    ["platform", "admin", "companies", id, "modules"] as const,
  platformAdminCompanyUsage: (id: string) =>
    ["platform", "admin", "companies", id, "usage"] as const,
  platformAdminBrands: (filter?: AdminBrandsFilter) =>
    ["platform", "admin", "brands", { filter }] as const,
  platformAdminRestaurantSubs: ["platform", "admin", "restaurants", "subscriptions"] as const,
  platformAdminBranches: (filter?: AdminBranchesFilter) =>
    ["platform", "admin", "branches", { filter }] as const,
  platformAdminUsers: (filter?: AdminUsersFilter) =>
    ["platform", "admin", "users", { filter }] as const,
  platformAdminDistribution: ["platform", "admin", "distribution"] as const,
  platformAdminSubscriptions: (filter?: AdminSubscriptionsFilter) =>
    ["platform", "admin", "subscriptions", { filter }] as const,
  platformAdminPermissions: ["platform", "admin", "permissions"] as const,
  platformAdminAuditLogs: (filter?: AdminAuditLogsFilter) =>
    ["platform", "admin", "audit-logs", { filter }] as const,
  platformAdminSettings: ["platform", "admin", "settings"] as const,
  platformAdminReportsCatalog: ["platform", "admin", "reports", "catalog"] as const,
  platformAdminBrandUploadStatus: (brandId: string) =>
    ["platform", "admin", "brands", brandId, "upload-status"] as const,

  // ─── Platform Head (/api/v1/head/*) ────────────────────────────────────────
  platformHeadDashboard: ["platform", "head", "dashboard"] as const,
  platformAccountantsPerformance: ["platform", "head", "accountants-performance"] as const,
  platformHeadReminders: ["platform", "head", "reminders"] as const,
  platformPendingOperations: (filter?: PlatformOpsFilter) =>
    ["platform", "operations", "pending", { filter }] as const,
  platformFinalApprovedOperations: (filter?: PlatformOpsFilter) =>
    ["platform", "operations", "final-approved", { filter }] as const,
  platformRejectedOperations: (filter?: PlatformOpsFilter) =>
    ["platform", "operations", "rejected", { filter }] as const,
  platformErpPreflight: ["platform", "erp", "preflight"] as const,
  platformErpEligibleOperations: (filter?: PlatformErpFilter) =>
    ["platform", "erp", "eligible-operations", { filter }] as const,
  platformErpBatches: (filter?: PlatformErpFilter) =>
    ["platform", "erp", "batches", { filter }] as const,
  platformReportsInternal: ["platform", "reports", "internal"] as const,
  platformReportsOwner: ["platform", "reports", "owner"] as const,

  // ─── Platform Accountant (/api/v1/accountant/*) ────────────────────────────
  platformAccountantDashboard: ["platform", "accountant", "dashboard"] as const,
  platformAccountantOperations: (filter?: PlatformAccountantOpsFilter) =>
    ["platform", "accountant", "operations", { filter }] as const,
  platformAssets: (filter?: PlatformAssetsFilter) =>
    ["platform", "accountant", "assets", { filter }] as const,
  platformAssetDrafts: ["platform", "accountant", "asset-drafts"] as const,
  platformInventory: (filter?: PlatformInventoryFilter) =>
    ["platform", "accountant", "inventory", { filter }] as const,
  platformInventoryCatalog: ["platform", "accountant", "inventory", "catalog"] as const,
  platformInventoryDailyList: (branchId: string) =>
    ["platform", "accountant", "inventory", "daily-list", branchId] as const,
  platformWaste: (filter?: PlatformWasteFilter) =>
    ["platform", "accountant", "waste", { filter }] as const,
  platformLiveShifts: ["platform", "accountant", "shifts", "live"] as const,
  platformHistoryShifts: (filter?: PlatformShiftsFilter) =>
    ["platform", "accountant", "shifts", "history", { filter }] as const,
  platformEmployees: (filter?: PlatformEmployeesFilter) =>
    ["platform", "accountant", "employees", { filter }] as const,
  platformEmployeeStatement: (id: string) =>
    ["platform", "accountant", "employees", id, "statement"] as const,
  platformCashCustody: (filter?: PlatformCashFilter) =>
    ["platform", "accountant", "cash-custody", { filter }] as const,
  platformCashTransactions: (id: string) =>
    ["platform", "accountant", "cash-custody", id, "transactions"] as const,
  platformReminders: ["platform", "reminders"] as const,
  platformReminderRules: ["platform", "reminders", "rules"] as const,

  // ─── Platform Branch (/api/v1/branch/*) ────────────────────────────────────
  platformBranchOverview: ["platform", "branch", "overview"] as const,
  platformBranchUploadStatus: ["platform", "branch", "upload", "status"] as const,
  platformBranchEmployees: ["platform", "branch", "employees"] as const,
  platformBranchInventoryItems: ["platform", "branch", "inventory-items"] as const,
  platformBranchSuppliers: ["platform", "branch", "suppliers"] as const,
  platformBranchSettings: ["platform", "branch", "settings"] as const,

  // ─── Platform Procurement (/api/v1/procurement/*) ──────────────────────────
  platformProcurementOverview: ["platform", "procurement", "overview"] as const,
  platformProcurementOrders: (filter?: PlatformProcurementOrdersFilter) =>
    ["platform", "procurement", "orders", { filter }] as const,
  platformProcurementOrder: (id: string) =>
    ["platform", "procurement", "orders", id] as const,
  platformProcurementSuppliers: ["platform", "procurement", "suppliers"] as const,
  platformProcurementItems: ["platform", "procurement", "items"] as const,

  // ─── Supplier (/api/v1/asab/supplier/*) ────────────────────────────────────
  supplierOverview: ["platform", "supplier", "overview"] as const,
  supplierOrders: (filter?: SupplierOrdersFilter) =>
    ["platform", "supplier", "orders", { filter }] as const,
  supplierReports: ["platform", "supplier", "reports"] as const,
  supplierItems: ["platform", "supplier", "items"] as const,
};

export type LookupType =
  | "brands"
  | "restaurants"
  | "branches"
  | "users"
  | "cities"
  | "asset-categories"
  | "inventory-categories"
  | "units"
  | "expense-categories"
  | "supplier-categories"
  | "modules";

export interface OperationsFilter {
  moduleKey?: ModuleKey | "all";
  status?: OperationStatus | "all";
  branchId?: string;
  brandId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface ExpenseFilter {
  branchId?: string;
  verified?: boolean;
  search?: string;
  page?: number;
}

export interface InventoryBranchesFilter {
  date?: string;
  status?: "pending" | "confirmed" | "flagged" | "all";
}

export interface WasteFilter {
  branchId?: string;
  status?: OperationStatus | "all";
  dateFrom?: string;
  dateTo?: string;
}

export interface AssetFilter {
  branchId?: string;
  categoryId?: string;
  confirmed?: boolean;
  search?: string;
}

export interface ShiftFilter {
  branchId?: string;
  status?: "open" | "closed" | "needs-review" | "all";
  dateFrom?: string;
  dateTo?: string;
}

export interface EmployeeFilter {
  branchId?: string;
  active?: boolean;
  search?: string;
}

export interface CashFilter {
  branchId?: string;
  status?: "active" | "settled" | "discrepancy" | "all";
}

export interface CompanyUsersFilter {
  role?: string;
  status?: "active" | "inactive" | "all";
  search?: string;
  branchId?: string;
}

export interface BillingInvoicesFilter {
  status?: "paid" | "open" | "overdue" | "void" | "all";
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface SupportTicketsFilter {
  status?: "open" | "pending" | "resolved" | "closed" | "all";
  search?: string;
  page?: number;
}

export interface ProcurementOrdersFilter {
  status?: "draft" | "approved" | "rejected" | "sent" | "all";
  supplierId?: string;
  brandId?: string;
  branchId?: string;
  search?: string;
  page?: number;
}

export interface AuditLogsFilter {
  actorId?: string;
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Platform (ASAB) filter typedefs
// ═══════════════════════════════════════════════════════════════════════════

export interface AdminCompaniesFilter {
  filter?: "all" | "Basic" | "Professional" | "Enterprise" | "trial" | "suspended";
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminBrandsFilter {
  search?: string;
  plan?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminBranchesFilter {
  brandId?: string;
  restaurantId?: string;
  city?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminUsersFilter {
  search?: string;
  roleFilter?: string;
  brandFilter?: string;
  status?: "active" | "inactive" | "all";
  page?: number;
  pageSize?: number;
}

export interface AdminSubscriptionsFilter {
  status?: "active" | "warning" | "danger" | "expired" | "all";
  plan?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminAuditLogsFilter {
  actorUserId?: string;
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PlatformOpsFilter {
  page?: number;
  pageSize?: number;
  groupBy?: "module" | "accountant" | "flat";
  accountantId?: string;
  brandId?: string;
  branchId?: string;
  moduleKey?: string;
  match?: "exact" | "review" | "diff";
  erpPosted?: boolean;
  search?: string;
}

export interface PlatformErpFilter {
  moduleKey?: string;
  period?: "day" | "week" | "month" | "range";
  dateFrom?: string;
  dateTo?: string;
  restaurantId?: string;
  branchId?: string;
  status?: "approved" | "all";
  page?: number;
  pageSize?: number;
}

export interface PlatformAccountantOpsFilter {
  moduleKey?: ModuleKey | "all";
  branchId?: string;
  brandId?: string;
  status?: OperationStatus | "all";
  match?: "exact" | "review" | "diff";
  day?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PlatformAssetsFilter {
  viewMode?: "list" | "branch_report";
  status?: "pending_branch" | "pending_accountant" | "confirmed" | "all";
  category?: string;
  year?: string;
  branchId?: string;
  brandId?: string;
  search?: string;
}

export interface PlatformInventoryFilter {
  type?: "monthly" | "daily";
  branchId?: string;
  brandId?: string;
  search?: string;
}

export interface PlatformWasteFilter {
  branchId?: string;
  brandId?: string;
  status?: OperationStatus | "all";
  dateFrom?: string;
  dateTo?: string;
}

export interface PlatformShiftsFilter {
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface PlatformEmployeesFilter {
  empNumber?: string;
  branchId?: string;
  brandId?: string;
  active?: boolean;
  search?: string;
}

export interface PlatformCashFilter {
  branchId?: string;
  brandId?: string;
  status?: "active" | "settled" | "discrepancy" | "all";
  search?: string;
}

export interface PlatformProcurementOrdersFilter {
  status?: "pending" | "approved" | "rejected" | "sent" | "all";
  groupBy?: "branch" | "supplier";
  city?: string;
  supplierId?: string;
  urgency?: "عاجل" | "عادي";
  page?: number;
  pageSize?: number;
}

export interface SupplierOrdersFilter {
  status?: "pending" | "accepted" | "rejected" | "delivered" | "confirmed" | "all";
  search?: string;
  page?: number;
  pageSize?: number;
}
