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
  | "supplier-categories";

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
