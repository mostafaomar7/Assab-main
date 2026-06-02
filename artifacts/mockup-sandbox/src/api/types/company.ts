// Company Dashboard — Accountant-scope types.
// Most operation/notification/audit types live in ./index.ts.

import type { Operation, OperationStatus, ModuleKey } from "./index";

// ─── Accountant dashboard summary ────────────────────────────────────────────
export interface AccDashboardKPIs {
  pendingCount: number;
  approvedTodayCount: number;
  rejectedCount: number;
  totalAmountTodayHalalas: number;
  totalAmountMonthHalalas: number;
}

export interface AccDashboardResponse {
  kpis: AccDashboardKPIs;
  pendingByModule: Array<{ moduleKey: ModuleKey; count: number; amountHalalas: number }>;
  recentOps: Operation[];
}

// ─── Sales (recon) details ───────────────────────────────────────────────────
export interface SalesChannel {
  id: string;
  name: string;
  icon?: string;
  /** Reported by POS, halalas. */
  posHalalas: number;
  /** Actual deposit, halalas. */
  actualHalalas: number;
  varianceHalalas: number;
}

export interface SalesDetails {
  operationId: string;
  channels: SalesChannel[];
  totalPosHalalas: number;
  totalActualHalalas: number;
  totalVarianceHalalas: number;
  notes?: string;
}

export interface SalesVarianceAssignmentPayload {
  channelId: string;
  responsibleUserId?: string;
  reasonCode?: string;
  notes?: string;
}

// ─── Expense invoices ────────────────────────────────────────────────────────
export interface ExpenseInvoice {
  id: string;
  /** Human ID, "INV-2025-001". */
  publicId: string;
  operationId: string;
  vendorName: string;
  description: string;
  amountHalalas: number;
  vatHalalas?: number;
  invoiceDate: string;
  verified: boolean;
  verifiedAt?: string | null;
  attachmentIds?: string[];
}

// ─── Purchases ───────────────────────────────────────────────────────────────
export interface PurchaseItem {
  id: string;
  name: string;
  unit: string;
  orderedQty: number;
  receivedQty: number;
  unitPriceHalalas: number;
  totalHalalas: number;
}

// ─── Inventory (Daily reconciliation) ────────────────────────────────────────
export interface InventoryBranchRow {
  branchId: string;
  branchName: string;
  brandName: string;
  date: string;
  status: "pending" | "confirmed" | "flagged";
  itemCount: number;
  varianceCount: number;
}

export interface InventoryItemRow {
  id: string;
  name: string;
  category: string;
  unit: string;
  prevQty: number;
  currQty: number;
  varianceQty: number;
  flagged: boolean;
}

export interface InventoryItemDef {
  id: string;
  name: string;
  category: string;
  unit: string;
}

export interface InventoryCatalogResponse {
  items: InventoryItemDef[];
}

// ─── Waste ───────────────────────────────────────────────────────────────────
export interface WasteAllocation {
  responsibleUserId?: string;
  responsibleUserName?: string;
  shareHalalas: number;
  notes?: string;
}

export interface WasteProductRow {
  productIdx: number;
  itemName: string;
  qty: number;
  unit: string;
  classification: "spoilage" | "breakage" | "shrinkage" | "theft" | "other";
  responsibility: "branch" | "supplier" | "unknown";
  allocations: WasteAllocation[];
  totalHalalas: number;
}

export interface WasteEntry {
  id: string;
  publicId: string;
  branchId: string;
  branchName: string;
  date: string;
  status: OperationStatus;
  products: WasteProductRow[];
  totalHalalas: number;
}

// ─── Assets ──────────────────────────────────────────────────────────────────
export type AssetCondition = "new" | "used" | "needs-repair";

export interface Asset {
  id: string;
  publicId: string; // FA-####
  name: string;
  categoryId: string;
  categoryName?: string;
  branchId: string;
  branchName?: string;
  purchasePriceHalalas: number;
  acquiredDate: string;
  usefulLifeMonths: number;
  condition: AssetCondition;
  serialNumber?: string;
  confirmed: boolean;
  confirmedAt?: string | null;
}

export interface AssetDraft {
  id: string;
  /** "DRAFT-…" */
  publicId: string;
  sourceInvoiceId: string;
  sourceInvoicePublicId: string;
  proposedName: string;
  proposedCategoryId?: string;
  proposedBranchId?: string;
  proposedPriceHalalas: number;
  status: "pending" | "confirmed" | "discarded";
  createdAt: string;
}

export interface AssetImportResult {
  jobId: string;
  parsedRows: number;
  createdRows: number;
}

// ─── Shifts ──────────────────────────────────────────────────────────────────
export type ShiftStatus = "open" | "closed" | "needs-review";

export interface Shift {
  id: string;
  branchId: string;
  branchName: string;
  supervisor: string;
  status: ShiftStatus;
  openedAt: string;
  closedAt?: string | null;
  ordersCount: number;
  salesHalalas: number;
  cashHalalas: number;
  cardHalalas: number;
  deliveryHalalas: number;
}

export interface ShiftConfig {
  brandId: string;
  brandName: string;
  morningStart: string;
  morningEnd: string;
  eveningStart: string;
  eveningEnd: string;
}

// ─── Employees ───────────────────────────────────────────────────────────────
export interface Employee {
  id: string;
  empNumber: string;
  name: string;
  nationalId: string;
  role: string;
  branchId: string;
  branchName: string;
  monthlySalaryHalalas: number;
  balanceHalalas: number;
  active: boolean;
}

export interface EmployeeMovement {
  id: string;
  employeeId: string;
  date: string;
  type: "advance" | "deduction" | "bonus" | "salary" | "settlement";
  amountHalalas: number;
  notes?: string;
  approvedBy?: string;
}

// ─── Cash Custody ────────────────────────────────────────────────────────────
export interface CashCustodyRow {
  id: string;
  branchId: string;
  branchName: string;
  holderUserId: string;
  holderName: string;
  balanceHalalas: number;
  lastSettledAt?: string | null;
  status: "active" | "settled" | "discrepancy";
}

export type CashTxnStatus = "pending" | "approved" | "rejected";

export interface CashTransaction {
  id: string;
  custodyId: string;
  date: string;
  type: "in" | "out";
  amountHalalas: number;
  category: string;
  notes?: string;
  status: CashTxnStatus;
  attachmentIds?: string[];
}

// ─── Reminders ───────────────────────────────────────────────────────────────
export type ReminderPriority = "high" | "medium" | "low";

export interface Reminder {
  id: string;
  title: string;
  description: string;
  dueAt: string;
  priority: ReminderPriority;
  done: boolean;
  scope: "company" | "brand" | "branch" | "personal";
  branchId?: string | null;
  brandId?: string | null;
}
