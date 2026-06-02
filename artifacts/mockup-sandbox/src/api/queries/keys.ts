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
