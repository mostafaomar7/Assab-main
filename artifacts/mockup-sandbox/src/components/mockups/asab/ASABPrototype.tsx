import "./_group.css";
import { useState, useMemo, ReactNode, createContext, useContext, useRef } from "react";
import {
  LayoutDashboard, TrendingUp, Wallet, ShoppingCart, Package, Building2, Clock,
  Users, ArrowLeftRight, BarChart3, Settings, Bell, LogOut, ChevronRight,
  ChevronDown, ChevronUp, CheckCircle2, XCircle, MessageSquare, Eye, Download,
  AlertTriangle, Paperclip, ThumbsUp, ThumbsDown, RefreshCw, Star,
  Upload, ChevronsRight, Phone, Search, Plus, Trash2, Edit2, Edit3, X, FileText,
  Truck, Home, Shield, RotateCcw, Lock, Send, Tag, Smartphone, CheckSquare,
  ZapOff, ChevronLeft, Clipboard, Check, CreditCard, ArrowRightToLine, Layers, GitMerge
} from "lucide-react";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface AdminUserData {
  name: string; email: string; phone: string; role: string;
  brands: string[]; restaurants: string[]; branches: string[];
  modules: string[]; reportsTo: string;
  scope: "all" | "brand" | "restaurant" | "branch";
  status: "active" | "inactive";
}
type RoleId = "admin" | "head" | "accountant" | "branch" | "procurement" | "supplier";
type PageId = string;
type OpStatus = "pending" | "approved" | "rejected" | "final-approved";
type MatchStatus = "exact" | "review" | "diff";
type ModuleKey = "sales" | "expenses" | "purchases" | "inventory" | "shifts" | "employees" | "cash";

interface Op {
  id: string;
  branch: string;
  moduleKey: ModuleKey;
  moduleLabel: string;
  amount: number;
  timeAgo: string;
  match: MatchStatus;
  attachments: number;
  status: OpStatus;
  diff?: string;
  rejectReason?: string;
  // Corrective operation traceability
  isCorrection?: boolean;
  correctiveRef?: string;     // ID of the original op this corrects
  // ERP posting is a distinct step AFTER final-approval
  erpPosted?: boolean;
  erpBatchId?: string;        // e.g. ERP-BATCH-20251014-001
  erpPostedAt?: string;
  // Origin: where the operation entered the system
  origin: "mobile" | "procurement" | "system";
  submittedBy?: string;
  reviewedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  finalApprovedBy?: string;
  finalApprovedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
}

interface AppState {
  role: RoleId | null;
  page: PageId;
  detailId: string | null;
  modal: string | null;
}

// ─────────────────────────────────────────────
// ASSET DRAFT — expense-to-asset conversion
// ─────────────────────────────────────────────
type AssetCatType = "معدات"|"تقنية"|"أثاث"|"مركبات"|"أخرى";
interface AssetDraft {
  draftId: string;
  expenseOpId: string;
  invNum: string;
  vendor: string;
  desc: string;
  amount: number;
  expenseBranch: string;
  expenseDate: string;
  assetName: string;
  cat: AssetCatType;
  usefulLife: number;
  targetBranches: string[];
  custodian: string;
  qty: number;
  notes: string;
  convertedAt: string;
  status: "draft"|"confirmed"|"discarded";
}
interface AssetDraftCtxType {
  drafts: AssetDraft[];
  addDraft: (d: AssetDraft) => void;
  discardDraft: (draftId: string) => void;
  confirmDraft: (draftId: string) => void;
  getConvertedInvNums: () => Set<string>;
  navigateToAssets?: () => void;
  setNavigateToAssets: (fn: () => void) => void;
}
const AssetDraftContext = createContext<AssetDraftCtxType>({
  drafts: [], addDraft: ()=>{}, discardDraft: ()=>{}, confirmDraft: ()=>{},
  getConvertedInvNums: ()=>new Set(), navigateToAssets: undefined,
  setNavigateToAssets: ()=>{},
});

interface PageProps {
  navigate: (p: PageId) => void;
  setModal: (id: string | null) => void;
  setDetailId: (id: string | null) => void;
  detailId: string | null;
  ops: Op[];
  approveOp: (id: string) => void;
  rejectOp: (id: string, reason: string) => void;
  finalApproveOp: (id: string) => void;
  bulkApprove: (ids: string[]) => void;
  addCorrectiveOp?: (refId: string) => void;
  markErpPosted?: (ids: string[], batchId: string) => void;
}

interface NavSection { section: string }
interface NavItem { id: string; label: string; icon: ReactNode; badge?: number; badgeColor?: "red" | "yellow" }
type NavEntry = NavSection | NavItem;
function isSection(e: NavEntry): e is NavSection { return "section" in e; }

// ─────────────────────────────────────────────
// INITIAL OPERATIONS DATASET  (18 ops)
// ─────────────────────────────────────────────
const INITIAL_OPS: Op[] = [
  { id:"OPS-2401", branch:"فرع الرياض - العليا",    moduleKey:"sales",     moduleLabel:"مبيعات",         amount:18340, timeAgo:"قبل ساعة",    match:"exact",  attachments:3, status:"pending",         origin:"mobile" },
  { id:"OPS-2400", branch:"فرع جدة - الحمراء",      moduleKey:"expenses",  moduleLabel:"مصروفات",        amount:12500, timeAgo:"قبل 3 ساعات", match:"review", attachments:2, status:"pending",         origin:"mobile" },
  { id:"OPS-2399", branch:"فرع مكة - المعابدة",     moduleKey:"purchases", moduleLabel:"مشتريات",        amount:8200,  timeAgo:"قبل 5 ساعات", match:"diff",   attachments:4, status:"pending",         origin:"procurement", diff:"فرق في الكمية: 5 كجم" },
  { id:"OPS-2398", branch:"فرع الدمام - الكورنيش",  moduleKey:"sales",     moduleLabel:"مبيعات",         amount:45230, timeAgo:"قبل 6 ساعات", match:"exact",  attachments:3, status:"pending",         origin:"mobile" },
  { id:"OPS-2397", branch:"فرع الرياض - النزهة",    moduleKey:"expenses",  moduleLabel:"مصروفات",        amount:3800,  timeAgo:"أمس",          match:"review", attachments:1, status:"pending",         origin:"mobile" },
  { id:"OPS-2396", branch:"فرع الطائف - المحطة",    moduleKey:"inventory", moduleLabel:"مخزون",          amount:6100,  timeAgo:"أمس",          match:"exact",  attachments:2, status:"pending",         origin:"mobile" },
  { id:"OPS-2395", branch:"فرع الرياض - النزهة",    moduleKey:"sales",     moduleLabel:"مبيعات",         amount:22100, timeAgo:"قبل يومين",    match:"exact",  attachments:3, status:"pending",         origin:"mobile" },
  { id:"OPS-2394", branch:"فرع جدة - العزيزية",     moduleKey:"purchases", moduleLabel:"مشتريات",        amount:5600,  timeAgo:"قبل يومين",    match:"diff",   attachments:2, status:"pending",         origin:"procurement", diff:"فرق في السعر: 120 ر.س" },
  { id:"OPS-2393", branch:"فرع مكة - العزيزية",     moduleKey:"shifts",    moduleLabel:"شفتات",          amount:2800,  timeAgo:"قبل 3 أيام",  match:"review", attachments:1, status:"pending",         origin:"mobile" },
  { id:"OPS-2392", branch:"فرع الرياض - العليا",    moduleKey:"employees", moduleLabel:"كشف الحساب",     amount:9400,  timeAgo:"قبل 3 أيام",  match:"exact",  attachments:2, status:"pending",         origin:"mobile" },
  { id:"OPS-2391", branch:"فرع الدمام - الدانة",    moduleKey:"cash",      moduleLabel:"عهدة نقدية",     amount:3000,  timeAgo:"قبل 4 أيام",  match:"exact",  attachments:1, status:"pending",         origin:"mobile" },
  { id:"OPS-2390", branch:"فرع جدة - الحمراء",      moduleKey:"sales",     moduleLabel:"مبيعات",         amount:31800, timeAgo:"قبل 4 أيام",  match:"exact",  attachments:3, status:"approved",        origin:"mobile" },
  { id:"OPS-2389", branch:"فرع الرياض - العليا",    moduleKey:"expenses",  moduleLabel:"مصروفات",        amount:1250,  timeAgo:"قبل 5 أيام",  match:"exact",  attachments:2, status:"approved",        origin:"mobile" },
  { id:"OPS-2388", branch:"فرع مكة - المعابدة",     moduleKey:"inventory", moduleLabel:"مخزون",          amount:8500,  timeAgo:"قبل 5 أيام",  match:"review", attachments:2, status:"approved",        origin:"mobile" },
  { id:"OPS-2387", branch:"فرع الدمام - الكورنيش",  moduleKey:"purchases", moduleLabel:"مشتريات",        amount:4800,  timeAgo:"قبل أسبوع",   match:"exact",  attachments:2, status:"approved",        origin:"procurement" },
  { id:"OPS-2386", branch:"فرع الرياض - النزهة",    moduleKey:"sales",     moduleLabel:"مبيعات",         amount:19200, timeAgo:"قبل أسبوع",   match:"exact",  attachments:3, status:"final-approved",  origin:"mobile" },
  { id:"OPS-2385", branch:"فرع جدة - العزيزية",     moduleKey:"expenses",  moduleLabel:"مصروفات",        amount:2100,  timeAgo:"قبل أسبوع",   match:"exact",  attachments:1, status:"final-approved",  origin:"mobile" },
  { id:"OPS-2384", branch:"فرع الطائف - المحطة",    moduleKey:"expenses",  moduleLabel:"مصروفات",        amount:3400,  timeAgo:"قبل أسبوع",   match:"diff",   attachments:1, status:"rejected",        origin:"mobile",       rejectReason:"فاتورة مفقودة" },
];

// ─────────────────────────────────────────────
// NAV CONFIG (badges computed dynamically — see Sidebar)
// ─────────────────────────────────────────────
const NAV_CONFIG: Record<RoleId, NavEntry[]> = {
  accountant: [
    { section:"الرئيسية" },
    { id:"acc-dashboard",  label:"لوحة التحكم",          icon:<LayoutDashboard size={16}/> },
    { id:"acc-reminders",  label:"التذكيرات",             icon:<Bell size={16}/>,            badge:3, badgeColor:"red" as const },
    { section:"الموديولات" },
    { id:"acc-sales",      label:"المبيعات",              icon:<TrendingUp size={16}/>,      badge:0 },
    { id:"acc-expenses",   label:"المصروفات",             icon:<Wallet size={16}/>,          badge:0 },
    { id:"acc-purchases",  label:"المشتريات",             icon:<ShoppingCart size={16}/>,    badge:0 },
    { id:"acc-inventory",  label:"المخزون",               icon:<Package size={16}/>,         badge:0 },
    { id:"acc-waste",      label:"الهدر والتالف",         icon:<Trash2 size={16}/>,          badge:0 },
    { id:"acc-assets",     label:"الأصول الثابتة",        icon:<Building2 size={16}/> },
    { id:"acc-shifts",     label:"إدارة الشفتات",         icon:<Clock size={16}/>,           badge:0 },
    { id:"acc-employees",  label:"كشف حساب الموظفين",    icon:<Users size={16}/>,           badge:0 },
    { id:"acc-cash",       label:"إدارة العهد النقدية",   icon:<ArrowLeftRight size={16}/>,  badge:0 },
    { section:"التقارير" },
    { id:"acc-reports",    label:"التقارير",              icon:<BarChart3 size={16}/> },
  ],
  head: [
    { section:"الرئيسية" },
    { id:"head-dashboard", label:"لوحة التحكم",           icon:<LayoutDashboard size={16}/> },
    { section:"المراجعة والاعتماد" },
    { id:"head-pending",   label:"بانتظار الاعتماد",       icon:<Clock size={16}/>,           badge:0 },
    { id:"head-approved",  label:"المعتمدة نهائياً",       icon:<CheckCircle2 size={16}/> },
    { id:"head-rejected",  label:"المرفوضة",               icon:<XCircle size={16}/> },
    { section:"الموديولات" },
    { id:"head-sales",     label:"المبيعات",               icon:<TrendingUp size={16}/> },
    { id:"head-expenses",  label:"المصروفات",              icon:<Wallet size={16}/> },
    { id:"head-purchases", label:"المشتريات",              icon:<ShoppingCart size={16}/> },
    { id:"head-inventory", label:"المخزون",                icon:<Package size={16}/> },
    { id:"head-waste",     label:"الهدر والتالف",          icon:<Trash2 size={16}/> },
    { id:"head-assets",    label:"الأصول الثابتة",         icon:<Building2 size={16}/> },
    { id:"head-shifts",    label:"الشفتات",                icon:<Clock size={16}/> },
    { id:"head-employees", label:"كشف حساب الموظفين",     icon:<Users size={16}/> },
    { id:"head-cash",      label:"العهد النقدية",          icon:<ArrowLeftRight size={16}/> },
    { section:"التذكيرات والتقارير" },
    { id:"head-reminders", label:"التذكيرات",              icon:<Bell size={16}/>,            badge:3, badgeColor:"red" as const },
    { section:"الإدارة" },
    { id:"head-accountants", label:"أداء المحاسبين",       icon:<Users size={16}/> },
    { id:"head-erp",       label:"التصدير لـ ERP",         icon:<ChevronsRight size={16}/> },
    { id:"head-reports",   label:"التقارير",               icon:<BarChart3 size={16}/> },
  ],
  admin: [
    { section:"الرئيسية" },
    { id:"admin-overview",       label:"نظرة عامة",        icon:<LayoutDashboard size={16}/> },
    { section:"الإدارة" },
    { id:"admin-users",          label:"المستخدمون",        icon:<Users size={16}/>,           badge:3 },
    { id:"admin-restaurants",    label:"المطاعم والفروع",   icon:<Home size={16}/> },
    { id:"admin-subscriptions",  label:"الاشتراكات",        icon:<Shield size={16}/>,          badge:2, badgeColor:"yellow" as const },
    { id:"admin-companies",      label:"اشتراكات الشركات",  icon:<Building2 size={16}/>,       badge:5, badgeColor:"yellow" as const },
    { id:"admin-permissions",    label:"الصلاحيات",         icon:<Settings size={16}/> },
    { section:"التقارير" },
    { id:"admin-reports",        label:"مدير التقارير",     icon:<BarChart3 size={16}/> },
    { id:"admin-audit",          label:"سجل النشاطات",      icon:<FileText size={16}/> },
    { section:"النظام" },
    { id:"admin-settings",       label:"إعدادات النظام",    icon:<Settings size={16}/> },
  ],
  branch: [
    { section:"الرئيسية" },
    { id:"branch-overview",   label:"نظرة عامة",        icon:<LayoutDashboard size={16}/> },
    { section:"إدارة البيانات" },
    { id:"branch-employees",  label:"الموظفون",          icon:<Users size={16}/> },
    { id:"branch-items",      label:"الأصناف",           icon:<Package size={16}/> },
    { id:"branch-suppliers",  label:"الموردون",          icon:<Truck size={16}/> },
    { id:"branch-upload",     label:"رفع البيانات",      icon:<Upload size={16}/> },
    { section:"الإعدادات" },
    { id:"branch-settings",   label:"إعدادات الفرع",    icon:<Settings size={16}/> },
  ],
  procurement: [
    { section:"الرئيسية" },
    { id:"proc-overview",  label:"لوحة التحكم",      icon:<LayoutDashboard size={16}/> },
    { section:"الطلبات" },
    { id:"proc-new",       label:"الطلبات الجديدة",   icon:<ShoppingCart size={16}/>,  badge:45 },
    { id:"proc-grouped",   label:"الطلبات المجمعة",   icon:<Package size={16}/> },
    { id:"proc-sent",      label:"المرسلة للموردين",  icon:<Truck size={16}/> },
    { section:"الإدارة" },
    { id:"proc-items",     label:"الأصناف",           icon:<Package size={16}/> },
    { id:"proc-suppliers", label:"الموردون",          icon:<Truck size={16}/> },
    { id:"proc-reports",   label:"التقارير",          icon:<BarChart3 size={16}/> },
  ],
  supplier: [
    { section:"الرئيسية" },
    { id:"sup-overview",  label:"لوحة التحكم",        icon:<LayoutDashboard size={16}/> },
    { section:"الطلبات" },
    { id:"sup-new",       label:"الطلبات الجديدة",    icon:<ShoppingCart size={16}/>,   badge:3 },
    { id:"sup-accepted",  label:"المقبولة",            icon:<CheckCircle2 size={16}/> },
    { id:"sup-rejected",  label:"المرفوضة",            icon:<XCircle size={16}/> },
    { section:"الكتالوج" },
    { id:"sup-items",     label:"الأصناف والأسعار",   icon:<Package size={16}/> },
    { id:"sup-reports",   label:"تقارير المبيعات",    icon:<BarChart3 size={16}/> },
  ],
};

const ROLE_PROFILES: Record<RoleId, { name: string; avatar: string; label: string; defaultPage: PageId }> = {
  admin:       { name:"عبدالله الأحمد",    avatar:"عب", label:"أدمن النظام",                    defaultPage:"admin-overview" },
  head:        { name:"خالد العمري",        avatar:"خع", label:"رئيس الحسابات",                  defaultPage:"head-dashboard" },
  accountant:  { name:"أحمد محمد",          avatar:"أم", label:"محاسب — الفروع 1–50",            defaultPage:"acc-dashboard" },
  branch:      { name:"أحمد الشمري",        avatar:"أش", label:"مدير فرع الرياض - العليا",       defaultPage:"branch-overview" },
  procurement: { name:"سعيد أحمد",          avatar:"سأ", label:"مدير المشتريات",                 defaultPage:"proc-overview" },
  supplier:    { name:"محمد العلي",          avatar:"مع", label:"شركة الدواجن الوطنية",           defaultPage:"sup-overview" },
};

const MODULE_TO_NAV: Record<ModuleKey, string> = {
  sales:"acc-sales", expenses:"acc-expenses", purchases:"acc-purchases",
  inventory:"acc-inventory", shifts:"acc-shifts", employees:"acc-employees", cash:"acc-cash",
};

// ─────────────────────────────────────────────
// SHARED DISPLAY CONFIG
// ─────────────────────────────────────────────
const MATCH_CFG: Record<MatchStatus,{label:string; cls:string; dot:string}> = {
  exact:  { label:"متطابق",         cls:"bg-emerald-50 text-emerald-700 border-emerald-200", dot:"bg-emerald-500" },
  review: { label:"يحتاج مراجعة",  cls:"bg-amber-50 text-amber-700 border-amber-200",       dot:"bg-amber-500" },
  diff:   { label:"فرق في الكمية", cls:"bg-red-50 text-red-700 border-red-200",              dot:"bg-red-500" },
};
const STATUS_CFG: Record<OpStatus,{label:string; cls:string}> = {
  "pending":       { label:"معلق",             cls:"bg-amber-50 text-amber-700" },
  "approved":      { label:"موافق عليه",       cls:"bg-blue-50 text-blue-700" },
  "rejected":      { label:"مرفوض",            cls:"bg-red-50 text-red-700" },
  "final-approved":{ label:"معتمد نهائياً",    cls:"bg-emerald-50 text-emerald-700" },
};

// ─────────────────────────────────────────────
// LIFECYCLE PIPELINE  — the 6 stages of every operation in ASAB
// Branch (mobile) → Review → Approval → Final → ERP Export → ERP Reports
// ─────────────────────────────────────────────
const PIPELINE_STAGES = [
  { id:"submit",   icon:"📱", label:"رُفع من الفرع",     labelShort:"الرفع",     color:"blue",    bg:"bg-blue-100",   text:"text-blue-700",   border:"border-blue-300",   fill:"bg-blue-500"    },
  { id:"review",   icon:"🔍", label:"قيد المراجعة",       labelShort:"المراجعة",  color:"amber",   bg:"bg-amber-100",  text:"text-amber-700",  border:"border-amber-300",  fill:"bg-amber-500"   },
  { id:"approved", icon:"✓",  label:"موافق عليه",         labelShort:"الموافقة",  color:"sky",     bg:"bg-sky-100",    text:"text-sky-700",    border:"border-sky-300",    fill:"bg-sky-500"     },
  { id:"final",    icon:"🔒", label:"معتمد نهائياً",      labelShort:"الاعتماد",  color:"emerald", bg:"bg-emerald-100",text:"text-emerald-700",border:"border-emerald-300",fill:"bg-emerald-500" },
  { id:"erp",      icon:"🔗", label:"مُرحَّل لـ ERP",     labelShort:"ERP",       color:"indigo",  bg:"bg-indigo-100", text:"text-indigo-700", border:"border-indigo-300", fill:"bg-indigo-500"  },
  { id:"reports",  icon:"📊", label:"تقارير ERP (قراءة)", labelShort:"التقارير",  color:"slate",   bg:"bg-slate-100",  text:"text-slate-700",  border:"border-slate-300",  fill:"bg-slate-500"   },
] as const;

type PipelineStageId = typeof PIPELINE_STAGES[number]["id"];

function getPipelineStage(op: Op): number {
  // Returns the 0-based index of the current pipeline stage
  if (op.status === "rejected") return -1; // special: not on the forward path
  if (op.erpPosted) return 4;                               // stage 5: ERP posted
  if (op.status === "final-approved") return 3;             // stage 4: final approved, awaiting ERP
  if (op.status === "approved") return 2;                   // stage 3: accountant approved, awaiting head
  return 1;                                                 // stage 2: submitted from branch, under review
}

function getPipelineLabel(op: Op): string {
  if (op.status === "rejected") return "مرفوض";
  const idx = getPipelineStage(op);
  return PIPELINE_STAGES[idx]?.label || "";
}

// Horizontal 6-step pipeline indicator — used in detail pages
function PipelineBar({ op }: { op: Op }) {
  const stage = getPipelineStage(op);
  const isRejected = op.status === "rejected";
  const origin = ORIGIN_CFG[op.origin];
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4" dir="rtl">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">دورة حياة العملية</span>
          <Badge className={`${origin.cls} border text-[10px] font-semibold`}>
            {origin.icon} {origin.label}
          </Badge>
        </div>
        {isRejected
          ? <Badge className="bg-red-50 text-red-700 border border-red-200 text-xs">✕ مرفوض{op.rejectReason ? ` — ${op.rejectReason}` : ""}</Badge>
          : <Badge className={`${PIPELINE_STAGES[stage]?.bg} ${PIPELINE_STAGES[stage]?.text} border ${PIPELINE_STAGES[stage]?.border} text-xs font-bold`}>
              المرحلة {stage + 1}/6 · {PIPELINE_STAGES[stage]?.label}
            </Badge>
        }
      </div>
      <div className="flex items-center gap-0">
        {PIPELINE_STAGES.map((s, i) => {
          const isComplete = !isRejected && i < stage;
          const isCurrent  = !isRejected && i === stage;
          const isPending  = isRejected || i > stage;
          return (
            <div key={s.id} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border-2 transition-all
                  ${isComplete ? `${s.fill} border-transparent text-white` :
                    isCurrent  ? `bg-white ${s.border} ${s.text} shadow-sm font-bold` :
                                 "bg-gray-50 border-gray-200 text-gray-300"}`}>
                  {isComplete ? "✓" : s.icon}
                </div>
                <span className={`text-[9px] font-medium leading-tight text-center max-w-[44px] truncate
                  ${isComplete ? "text-gray-600" : isCurrent ? `${s.text} font-bold` : "text-gray-300"}`}>
                  {s.labelShort}
                </span>
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mt-[-10px] ${isComplete ? s.fill : "bg-gray-150"}`}
                  style={{ backgroundColor: isComplete ? "" : "#e5e7eb" }}/>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Compact inline pill — used in OpRow and lists
function OpStagePill({ op }: { op: Op }) {
  if (op.status === "rejected") {
    return <Badge className="bg-red-50 text-red-600 border border-red-200 text-[10px]">✕ مرفوض</Badge>;
  }
  const idx = getPipelineStage(op);
  const s = PIPELINE_STAGES[idx];
  return (
    <Badge className={`${s.bg} ${s.text} border ${s.border} text-[10px] font-semibold`}>
      {s.icon} م{idx+1} · {s.labelShort}
    </Badge>
  );
}

// Pipeline overview widget — summary counts by stage
function PipelineOverview({ ops, navigate }: { ops: Op[]; navigate: (p:PageId)=>void }) {
  const stageCounts = PIPELINE_STAGES.map((s, i) => ({
    ...s,
    count: ops.filter(o => getPipelineStage(o) === i).length,
  }));
  const rejected = ops.filter(o => o.status === "rejected").length;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden" dir="rtl">
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 text-sm tracking-tight">مسار العمليات — رؤية شاملة للخط الزمني</h3>
        <span className="text-xs text-gray-400">{ops.length} عملية إجمالاً</span>
      </div>
      <div className="grid grid-cols-6 divide-x divide-x-reverse divide-gray-100">
        {stageCounts.map((s, i) => {
          const isAspirational = i === 5; // stage-6: ERP Reports — future state, never set by getPipelineStage
          return (
            <div key={s.id} className={`px-3 py-4 text-center transition-colors
              ${isAspirational ? "bg-slate-50/60" : "hover:bg-gray-50/80"}`}>
              <div className="text-lg mb-1">{s.icon}</div>
              {isAspirational ? (
                <>
                  <p className="text-[10px] font-bold text-slate-400 font-mono">—</p>
                  <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">{s.labelShort}</p>
                  <p className="text-[8px] text-slate-300 mt-1 leading-tight">مرحلة مستقبلية</p>
                </>
              ) : (
                <>
                  <p className={`text-2xl font-extrabold font-mono ${s.count > 0 ? s.text : "text-gray-200"}`}>{s.count}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{s.labelShort}</p>
                  {i < 4 && (
                    <div className={`mx-auto mt-2 h-1 w-6 rounded-full ${s.count > 0 ? s.fill : "bg-gray-100"}`}/>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="px-5 py-2 border-t border-gray-100 bg-slate-50/30 flex items-center justify-between flex-wrap gap-2">
        {rejected > 0 && (
          <span className="text-xs text-red-500 font-medium">✕ {rejected} مرفوضة — خارج المسار</span>
        )}
        <span className="text-[10px] text-slate-400 mr-auto">
          م1–م5: مدارة بواسطة آلة الحالة · م6 (تقارير ERP): بيانات مرجعية مُستوردة — مرحلة مستقبلية
        </span>
      </div>
    </div>
  );
}

// Operation origin — where did this op enter the system?
const ORIGIN_CFG: Record<Op["origin"], { icon: string; label: string; cls: string }> = {
  "mobile":      { icon:"📱", label:"تطبيق الفرع",     cls:"bg-blue-50 text-blue-700 border-blue-200" },
  "procurement": { icon:"🛒", label:"سير المشتريات",   cls:"bg-orange-50 text-orange-700 border-orange-200" },
  "system":      { icon:"⚙",  label:"استيراد النظام",  cls:"bg-gray-50 text-gray-600 border-gray-200" },
};

// ─────────────────────────────────────────────
// MODULE AGGREGATION STATES — accounting export package readiness
// Mirrors the real ASAB export pipeline: ops → accounting entry → ERP batch → ERP import
// ─────────────────────────────────────────────
type ModuleAggState =
  | "empty"               // no ops in this module
  | "incomplete"          // has pending ops — workflow not complete
  | "ready_consolidation" // all ops reviewed/approved, no finals yet — ready to consolidate
  | "consolidated"        // all ops final-approved — accounting entry locked, ready to batch
  | "ready_erp"           // consolidated + no ERP batch yet — ready to export
  | "exported"            // all final-approved ops are ERP-posted
  | "erp_imported";       // ★ aspirational — ERP acknowledged receipt (not in state machine)

interface ModuleAggCfg { label:string; sublabel:string; step:number; cls:string; dot:string; headerCls:string }
const MODULE_AGG_CFG: Record<ModuleAggState, ModuleAggCfg> = {
  empty:               { label:"لا بيانات",            sublabel:"لم يُرفع أي بيان",                  step:0, cls:"bg-gray-50 text-gray-400 border-gray-200",          dot:"bg-gray-300",    headerCls:"text-gray-400"    },
  incomplete:          { label:"غير مكتمل",            sublabel:"توجد بيانات معلقة في المراجعة",      step:1, cls:"bg-red-50 text-red-700 border-red-200",              dot:"bg-red-500",     headerCls:"text-red-700"     },
  ready_consolidation: { label:"جاهز للتجميع",         sublabel:"كل البيانات راجعة — ابدأ التجميع",   step:2, cls:"bg-amber-50 text-amber-700 border-amber-200",        dot:"bg-amber-500",   headerCls:"text-amber-700"   },
  consolidated:        { label:"مُجمَّع",               sublabel:"قيد محاسبي مُغلق — جاهز للدفعة",     step:3, cls:"bg-sky-50 text-sky-700 border-sky-200",              dot:"bg-sky-500",     headerCls:"text-sky-700"     },
  ready_erp:           { label:"جاهز لـ ERP",          sublabel:"دفعة جاهزة للإرسال",                step:4, cls:"bg-emerald-50 text-emerald-700 border-emerald-200",   dot:"bg-emerald-500", headerCls:"text-emerald-700" },
  exported:            { label:"مُصدَّر",               sublabel:"مُرحَّل في ERP — انتظار التأكيد",    step:5, cls:"bg-indigo-50 text-indigo-700 border-indigo-200",     dot:"bg-indigo-500",  headerCls:"text-indigo-700"  },
  erp_imported:        { label:"مُستورَد في ERP ★",    sublabel:"ERP أكّد الاستلام — مرحلة مستقبلية", step:6, cls:"bg-purple-50 text-purple-700 border-purple-200",     dot:"bg-purple-500",  headerCls:"text-purple-700"  },
};

function getModuleAggState(moduleOps: Op[]): ModuleAggState {
  if(moduleOps.length === 0) return "empty";
  const hasPending     = moduleOps.some(o=>o.status==="pending");
  const hasApproved    = moduleOps.some(o=>o.status==="approved");
  const hasFinal       = moduleOps.some(o=>o.status==="final-approved");
  const allFinalPosted = hasFinal && moduleOps.filter(o=>o.status==="final-approved").every(o=>o.erpPosted);

  if(allFinalPosted && !hasPending && !hasApproved) return "exported";
  if(hasFinal && !hasPending && !hasApproved)        return "ready_erp";
  if(!hasPending && !hasFinal && hasApproved)        return "ready_consolidation";
  if(!hasPending && hasFinal && hasApproved)         return "consolidated";
  if(hasPending && (hasApproved || hasFinal))        return "incomplete";
  if(hasPending)                                     return "incomplete";
  return "consolidated";
}

const fmtAmt = (n: number) => n.toLocaleString("ar-SA");

// ─────────────────────────────────────────────
// MICRO-COMPONENTS
// ─────────────────────────────────────────────
function Badge({ children, className="" }:{ children:ReactNode; className?:string }) {
  return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${className}`}>{children}</span>;
}

function Btn({ children, onClick, variant="ghost", size="md", className="" }:{
  children:ReactNode; onClick?:()=>void;
  variant?:"primary"|"success"|"danger"|"ghost"|"outline"|"amber";
  size?:"sm"|"md"; className?:string
}) {
  const base = "inline-flex items-center gap-1.5 font-semibold cursor-pointer border transition-all rounded-lg whitespace-nowrap";
  const sizes = { sm:"px-3 py-1.5 text-xs", md:"px-4 py-2 text-sm" };
  const variants = {
    primary: "bg-purple-600 text-white border-purple-600 hover:bg-purple-700 shadow-sm",
    success: "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-sm",
    danger:  "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    amber:   "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
    ghost:   "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100",
    outline: "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
  };
  return <button onClick={onClick} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>{children}</button>;
}

function KpiCard({ label, value, sub, icon, accent="purple" }:{
  label:string; value:string; sub?:string; icon:ReactNode; accent?:string
}) {
  const accents: Record<string,string> = {
    purple:"border-t-purple-500 bg-purple-500",
    emerald:"border-t-emerald-500 bg-emerald-500",
    amber:"border-t-amber-500 bg-amber-500",
    blue:"border-t-blue-500 bg-blue-500",
    red:"border-t-red-500 bg-red-500",
    orange:"border-t-orange-500 bg-orange-500",
  };
  const borderCls = accents[accent]?.split(" ")[0] || "border-t-purple-500";
  const iconBg    = accents[accent]?.split(" ")[1] || "bg-purple-500";
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 border-t-2 ${borderCls} p-5 flex items-start gap-4`}>
      <div className={`w-10 h-10 rounded-xl ${iconBg} bg-opacity-10 flex items-center justify-center flex-shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-gray-500 text-xs font-medium uppercase tracking-wider leading-tight">{label}</p>
        <p className="text-gray-900 font-extrabold text-3xl mt-1 leading-none font-mono">{value}</p>
        {sub && <p className="text-gray-400 text-xs mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

function Card({ title, children, actions, className="" }:{ title?:string; children:ReactNode; actions?:ReactNode; className?:string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
          <h3 className="font-bold text-gray-900 text-sm tracking-tight">{title}</h3>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

function PageHeader({ title, subtitle, actions }:{ title:string; subtitle?:string; actions?:ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="text-gray-400 text-sm mt-1 font-normal">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

function Breadcrumb({ items }:{ items:{ label:string; onClick?:()=>void }[] }) {
  return (
    <div className="flex items-center gap-1.5 text-sm mb-5 bg-white rounded-xl border border-gray-100 px-4 py-2.5 w-fit shadow-sm" dir="rtl">
      {items.map((item,i) => (
        <div key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={13} className="text-gray-300 rotate-180"/>}
          {item.onClick
            ? <button onClick={item.onClick} className="text-purple-600 hover:text-purple-800 font-medium hover:underline">{item.label}</button>
            : <span className="font-semibold text-gray-700">{item.label}</span>
          }
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, title, desc }:{ icon:string; title:string; desc:string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-3xl mb-4 shadow-sm">{icon}</div>
      <p className="font-bold text-gray-700 mb-1">{title}</p>
      {desc && <p className="text-gray-400 text-sm max-w-xs">{desc}</p>}
    </div>
  );
}

function LockBanner({ op }: { op?: Op }) {
  const isErpPosted = op?.erpPosted === true;
  return (
    <div className="rounded-xl overflow-hidden border-2 border-emerald-300 shadow-md" dir="rtl">
      {/* Authoritative header stripe */}
      <div className={`flex items-center justify-between px-5 py-3 ${isErpPosted ? "bg-gradient-to-l from-emerald-700 to-emerald-600" : "bg-gradient-to-l from-slate-700 to-slate-600"}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <Lock size={14} className="text-white"/>
          </div>
          <div>
            <p className="text-white font-extrabold text-sm leading-tight">
              {isErpPosted ? "سجل مُغلق ومُرحَّل لـ ERP" : "سجل مُغلق — معتمد نهائياً"}
            </p>
            <p className="text-white/70 text-xs mt-0.5">
              {isErpPosted
                ? `دفعة الترحيل: ${op?.erpBatchId || "—"} · ${op?.erpPostedAt || "—"}`
                : "معتمد نهائياً · في انتظار الترحيل لـ ERP"
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`text-xs font-bold border ${isErpPosted ? "bg-white/20 text-white border-white/30" : "bg-white/20 text-white border-white/30"}`}>
            <CheckCircle2 size={10}/>
            {isErpPosted ? "مُرحَّل لـ ERP" : "معتمد نهائياً"}
          </Badge>
        </div>
      </div>
      {/* Immutability notice */}
      <div className="bg-emerald-50 border-t border-emerald-200 px-5 py-2.5 flex items-center gap-2">
        <AlertTriangle size={12} className="text-emerald-600 flex-shrink-0"/>
        <p className="text-xs text-emerald-700 font-medium">
          هذا السجل وصل للحالة النهائية ولا يمكن تعديله أو عكسه. أي تصحيح يتطلب إنشاء عملية تعديل مستقلة مرتبطة بهذا السجل.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// AUDIT TRAIL BUILDER  (derives lifecycle from op state)
// ─────────────────────────────────────────────
interface AuditEvent {
  icon: string;
  cls: string;
  action: string;
  by: string;
  time: string;
  isTerminal?: boolean;
}

function buildAuditTrail(op: Op): AuditEvent[] {
  const trail: AuditEvent[] = [];

  // Step 1: Creation (always present)
  trail.push({
    icon: "📋", cls: "bg-blue-50 text-blue-600",
    action: `أُنشئ السجل: ${op.id}${op.isCorrection ? ` (تعديل على ${op.correctiveRef})` : ""}`,
    by: op.submittedBy || "مدير الفرع",
    time: "08:00 ص"
  });

  // Step 2: Submission
  trail.push({
    icon: "📤", cls: "bg-blue-50 text-blue-600",
    action: "رُفع للمراجعة المحاسبية",
    by: op.submittedBy || "مدير الفرع",
    time: "08:15 ص"
  });

  // Step 3: Accountant review (if beyond pending)
  if (op.status !== "pending") {
    if (op.status === "rejected") {
      trail.push({
        icon: "✕", cls: "bg-red-50 text-red-600",
        action: `مرفوض — السبب: ${op.rejectReason || "لم يُذكر سبب"}`,
        by: op.rejectedBy || op.approvedBy || "المحاسب المختص",
        time: op.rejectedAt || "10:45 ص",
        isTerminal: true
      });
    } else {
      trail.push({
        icon: "✓", cls: "bg-emerald-50 text-emerald-600",
        action: "راجعه المحاسب ووافق عليه — أُرسل لرئيس الحسابات",
        by: op.approvedBy || "المحاسب المختص",
        time: op.approvedAt || "09:30 ص"
      });
    }
  }

  // Step 4: Head accountant final approval
  if (op.status === "final-approved") {
    trail.push({
      icon: "🔒", cls: "bg-emerald-100 text-emerald-700",
      action: "اعتمده رئيس الحسابات نهائياً — سجل مُغلق",
      by: op.finalApprovedBy || "رئيس الحسابات",
      time: op.finalApprovedAt || "16:42 م",
      isTerminal: !op.erpPosted
    });
  }

  // Step 5: ERP posting (if done)
  if (op.erpPosted) {
    trail.push({
      icon: "🔗", cls: "bg-indigo-50 text-indigo-600",
      action: `رُحِّل إلى نظام ERP — دفعة: ${op.erpBatchId || "—"}`,
      by: "النظام التلقائي / رئيس الحسابات",
      time: op.erpPostedAt || "17:00 م",
      isTerminal: true
    });
  }

  return trail;
}

// ─────────────────────────────────────────────
// LOGIN SCREEN
// ─────────────────────────────────────────────
function LoginScreen({ onLogin }:{ onLogin:(r:RoleId)=>void }) {
  const [hovered, setHovered] = useState<RoleId|null>(null);

  const roles: { id:RoleId; icon:string; title:string; desc:string; badge:string; badgeCls:string; accent:string }[] = [
    { id:"admin",       icon:"🧠", title:"أدمن النظام",      desc:"إدارة المستخدمين، الاشتراكات، وإعدادات النظام الكاملة",  badge:"نظام",          badgeCls:"bg-red-500/20 text-red-200",     accent:"#ef4444" },
    { id:"head",        icon:"👑", title:"رئيس الحسابات",    desc:"الاعتماد النهائي للعمليات والإشراف على أداء المحاسبين",  badge:"اعتماد نهائي",  badgeCls:"bg-amber-500/20 text-amber-200",  accent:"#f59e0b" },
    { id:"accountant",  icon:"🧮", title:"المحاسب",          desc:"مراجعة وتدقيق العمليات اليومية من جميع الفروع المخصصة", badge:"مراجعة يومية",  badgeCls:"bg-blue-500/20 text-blue-200",    accent:"#3b82f6" },
    { id:"branch",      icon:"🏪", title:"مدير الفرع",       desc:"رفع البيانات اليومية وإدارة موظفي وموردي الفرع",         badge:"فرع",           badgeCls:"bg-emerald-500/20 text-emerald-200", accent:"#10b981" },
    { id:"procurement", icon:"🛒", title:"مدير المشتريات",   desc:"تجميع طلبات الشراء والتنسيق مع الموردين",               badge:"مشتريات",       badgeCls:"bg-purple-500/20 text-purple-200", accent:"#8b5cf6" },
    { id:"supplier",    icon:"🏭", title:"المورد",            desc:"استلام طلبات التوريد وإدارة الكتالوج والأسعار",          badge:"مورد",          badgeCls:"bg-cyan-500/20 text-cyan-200",    accent:"#06b6d4" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0F1C35 0%,#1B3A6B 60%,#2A5298 100%)", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:36, padding:24 }} dir="rtl">
      {/* Header */}
      <div style={{ textAlign:"center" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:14, marginBottom:8 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:"linear-gradient(135deg,#7C3AED,#00D9FF)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ color:"#fff", fontWeight:900, fontSize:24 }}>ع</span>
          </div>
          <div style={{ color:"#fff", fontWeight:800, fontSize:34, letterSpacing:-1 }}>
            عصب <span style={{ color:"#E8A020" }}>ASAB</span>
          </div>
        </div>
        <p style={{ color:"rgba(255,255,255,0.5)", fontSize:14 }}>نظام إدارة مالية المطاعم متعدد الفروع</p>
        <p style={{ color:"rgba(255,255,255,0.3)", fontSize:12, marginTop:6 }}>اختر دورك للدخول إلى النموذج التفاعلي</p>
      </div>

      {/* Role cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, maxWidth:900, width:"100%" }}>
        {roles.map(r => {
          const isHov = hovered === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onLogin(r.id)}
              onMouseEnter={() => setHovered(r.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: isHov ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.07)",
                border: `1.5px solid ${isHov ? r.accent : "rgba(255,255,255,0.13)"}`,
                borderRadius: 16,
                padding: "24px 18px",
                cursor: "pointer",
                textAlign: "center",
                fontFamily: "inherit",
                transform: isHov ? "translateY(-4px)" : "translateY(0)",
                transition: "all 0.18s ease",
                outline: "none",
                boxShadow: isHov ? `0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px ${r.accent}33` : "none",
              }}
            >
              <div style={{ fontSize:38, marginBottom:10 }}>{r.icon}</div>
              <div style={{ color:"#fff", fontWeight:700, fontSize:15, marginBottom:6 }}>{r.title}</div>
              <div style={{ color:"rgba(255,255,255,0.45)", fontSize:11, lineHeight:1.65, marginBottom:12, minHeight:32 }}>{r.desc}</div>
              <span style={{ display:"inline-block", padding:"4px 12px", borderRadius:20, fontSize:10, fontWeight:700, background:`${r.accent}33`, color:isHov ? "#fff" : "rgba(255,255,255,0.7)", border:`1px solid ${r.accent}55`, transition:"all 0.18s" }}>{r.badge}</span>
            </button>
          );
        })}
      </div>

      <p style={{ color:"rgba(255,255,255,0.2)", fontSize:11 }}>نموذج تفاعلي — ASAB Prototype v2.0</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// REJECT MODAL  (captures reason, calls rejectOp)
// ─────────────────────────────────────────────
function RejectModal({ opId, onReject, onClose }:{ opId:string; onReject:(id:string,reason:string)=>void; onClose:()=>void }) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const canSubmit = reason !== "" && reason !== "اختر السبب...";
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-[480px] max-w-full" dir="rtl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-base">رفض العملية {opId}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-gray-500 text-sm">ستُعاد العملية إلى مدير الفرع مع سبب الرفض.</p>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">سبب الرفض <span className="text-red-500">*</span></label>
            <select value={reason} onChange={e=>setReason(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
              <option value="">اختر السبب...</option>
              <option>بيانات غير مكتملة</option>
              <option>فاتورة مفقودة أو غير واضحة</option>
              <option>تناقض في المبالغ</option>
              <option>فرق في الكميات</option>
              <option>مورد غير معتمد</option>
              <option>تاريخ غير صحيح</option>
              <option>أخرى</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">ملاحظات إضافية</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 resize-none" rows={3} placeholder="تفاصيل إضافية (اختياري)..."/>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => canSubmit && onReject(opId, notes ? `${reason}: ${notes}` : reason)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${canSubmit ? "bg-red-600 text-white hover:bg-red-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
              disabled={!canSubmit}>
              ✕ تأكيد الرفض وإعادة للفرع
            </button>
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">إلغاء</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ADD USER MODAL
// ─────────────────────────────────────────────
const BRANDS_CATALOG = [
  { id:"reem",     name:"علامة الريم",         color:"#7C3AED", abbr:"ر", restaurants:[
    { id:"reem-1", name:"مطعم الريم — العليا",  branches:["فرع العليا الرئيسي","فرع النزهة","فرع الملقا"] },
    { id:"reem-2", name:"مطعم الريم — جدة",    branches:["فرع الحمراء","فرع العزيزية"] },
  ]},
  { id:"herfy",    name:"علامة هرفي",           color:"#D97706", abbr:"هـ", restaurants:[
    { id:"herfy-1",name:"هرفي — الرياض",        branches:["فرع العليا","فرع الإزدهار","فرع السلي","فرع الدوبي"] },
    { id:"herfy-2",name:"هرفي — جدة",           branches:["فرع الكورنيش","فرع بحرة"] },
    { id:"herfy-3",name:"هرفي — مكة",           branches:["فرع المعابدة","فرع العزيزية"] },
  ]},
  { id:"mcd",      name:"ماكدونالدز",           color:"#DC2626", abbr:"م", restaurants:[
    { id:"mcd-1",  name:"ماكدونالدز — الرياض",  branches:["فرع الدبلوماسي","فرع النخيل مول","فرع هايبر بنده"] },
    { id:"mcd-2",  name:"ماكدونالدز — الدمام",  branches:["فرع الكورنيش","فرع الدانة مول"] },
  ]},
  { id:"broasted", name:"بروستد الوطني",         color:"#059669", abbr:"ب", restaurants:[
    { id:"br-1",   name:"بروستد — الطائف",       branches:["فرع المحطة","فرع الشفا"] },
  ]},
];

const ALL_MODULES = ["المبيعات","المصروفات","المشتريات","المخزون","الشفتات","كشف الحساب","العهد النقدية","الأصول الثابتة"];

function AddUserModal({ onAdd, onClose }:{ onAdd:(user:AdminUserData)=>void; onClose:()=>void }) {
  const [step, setStep] = useState(0);
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole]   = useState("محاسب");
  const [reportsTo, setReportsTo] = useState("");
  const [selBrands, setSelBrands]   = useState<string[]>([]);
  const [selRests,  setSelRests]    = useState<string[]>([]);
  const [selBranches, setSelBranches] = useState<string[]>([]);
  const [selModules, setSelModules] = useState<string[]>(["المبيعات","المصروفات"]);

  const isBranchManager   = role === "مدير فرع";
  const isChief           = role === "رئيس حسابات";
  const isMorrad          = role === "مورد";

  const availableRests = BRANDS_CATALOG.filter(b=>selBrands.includes(b.name)).flatMap(b=>b.restaurants);
  const availableBranches = availableRests.filter(r=>selRests.includes(r.name)).flatMap(r=>r.branches);

  const scopeFor = (): AdminUserData["scope"] => {
    if(selBranches.length>0) return "branch";
    if(selRests.length>0)    return "restaurant";
    if(selBrands.length>0)   return "brand";
    return "all";
  };

  const toggleArr = (arr:string[], val:string, setter:(v:string[])=>void) => {
    setter(arr.includes(val) ? arr.filter(x=>x!==val) : [...arr, val]);
  };

  const steps = ["المعلومات الأساسية","التخصيص والنطاق","الموديولات والتسلسل"];
  const canNext0 = name.trim()!=="";
  const canNext1 = isMorrad || selBrands.length>0;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-[640px] max-w-full flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-800 text-base">إضافة مستخدم جديد</h3>
            <p className="text-xs text-gray-400 mt-0.5">الخطوة {step+1} من {steps.length} — {steps[step]}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 px-6 pt-4">
          {steps.map((s,i)=>(
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${i===step?"bg-purple-600 text-white":i<step?"bg-emerald-50 text-emerald-700":"bg-gray-100 text-gray-400"}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${i===step?"bg-white/30":i<step?"bg-emerald-200":"bg-gray-200"}`}>{i<step?"✓":i+1}</span>
                <span className="hidden sm:inline">{s}</span>
              </div>
              {i<steps.length-1 && <div className={`flex-1 h-0.5 mx-1 ${i<step?"bg-emerald-200":"bg-gray-200"}`}/>}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* STEP 0 — Basic info */}
          {step===0 && <>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600 block mb-1">الاسم الكامل <span className="text-red-500">*</span></label>
                <input value={name} onChange={e=>setName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="أحمد محمد السعد"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">البريد الإلكتروني</label>
                <input value={email} onChange={e=>setEmail(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="ahmed@asab.sa"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">رقم الجوال</label>
                <input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="05XXXXXXXX"/>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-2">نوع الدور <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {v:"محاسب",          desc:"مراجعة عمليات المطاعم المخصصة له",  color:"blue"},
                  {v:"رئيس حسابات",    desc:"الإشراف على المحاسبين والاعتماد",    color:"amber"},
                  {v:"مدير فرع",       desc:"رفع بيانات فرع محدد",               color:"emerald"},
                  {v:"مدير مشتريات",  desc:"إدارة طلبات الشراء والموردين",       color:"purple"},
                  {v:"مورد",           desc:"استقبال طلبات التوريد",              color:"orange"},
                  {v:"أدمن",           desc:"إدارة كاملة للنظام",                color:"red"},
                ].map(({v,desc,color})=>(
                  <button key={v} onClick={()=>setRole(v)}
                    className={`p-3 rounded-xl border-2 text-right transition-all ${role===v?`border-${color}-400 bg-${color}-50`:"border-gray-100 hover:border-gray-300"}`}>
                    <p className={`text-xs font-bold ${role===v?`text-${color}-700`:"text-gray-700"}`}>{v}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </>}

          {/* STEP 1 — Assignment */}
          {step===1 && <>
            {isMorrad
              ? <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                  <p className="font-semibold">المورد لا يحتاج تخصيص مطاعم</p>
                  <p className="text-xs mt-1 text-amber-500">يتعامل المورد مع طلبات التوريد المرسلة إليه مباشرةً من مدير المشتريات.</p>
                </div>
              : <>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-2">تخصيص العلامات التجارية <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-2">
                    {BRANDS_CATALOG.map(b=>(
                      <label key={b.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selBrands.includes(b.name)?"border-purple-400 bg-purple-50":"border-gray-100 hover:border-gray-300"}`}>
                        <input type="checkbox" checked={selBrands.includes(b.name)} onChange={()=>{ toggleArr(selBrands,b.name,setSelBrands); setSelRests([]); setSelBranches([]); }} className="sr-only"/>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{background:b.color}}>{b.abbr}</div>
                        <span className="text-sm font-semibold text-gray-700">{b.name}</span>
                        {selBrands.includes(b.name) && <CheckCircle2 size={14} className="text-purple-500 mr-auto"/>}
                      </label>
                    ))}
                  </div>
                </div>

                {availableRests.length>0 && !isChief && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-2">
                      {isBranchManager?"اختر المطعم (واحد فقط)":"تخصيص المطاعم"}
                    </label>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {availableRests.map(r=>(
                        <label key={r.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-all ${selRests.includes(r.name)?"border-purple-300 bg-purple-50":"border-gray-100 hover:border-gray-300"}`}>
                          <input type="checkbox" checked={selRests.includes(r.name)} onChange={()=>{ if(isBranchManager){ setSelRests([r.name]); setSelBranches([]); } else toggleArr(selRests,r.name,setSelRests); }} className="sr-only"/>
                          <span className="text-sm text-gray-700">{r.name}</span>
                          {selRests.includes(r.name) && <CheckCircle2 size={13} className="text-purple-400 mr-auto"/>}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {isBranchManager && availableBranches.length>0 && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-2">تخصيص الفرع (واحد فقط)</label>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {availableBranches.map(br=>(
                        <label key={br} className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-all ${selBranches.includes(br)?"border-emerald-300 bg-emerald-50":"border-gray-100 hover:border-gray-300"}`}>
                          <input type="radio" name="branch" checked={selBranches.includes(br)} onChange={()=>setSelBranches([br])} className="sr-only"/>
                          <span className="text-sm text-gray-700">{br}</span>
                          {selBranches.includes(br) && <CheckCircle2 size={13} className="text-emerald-400 mr-auto"/>}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {isChief && selBrands.length>0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                    <p className="font-semibold mb-1">رئيس الحسابات — نطاق العلامات التجارية</p>
                    <p>سيتمكن من الإشراف على جميع المطاعم والمحاسبين ضمن العلامات التجارية المحددة.</p>
                  </div>
                )}
              </>
            }
          </>}

          {/* STEP 2 — Modules & Hierarchy */}
          {step===2 && <>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-2">الموديولات المتاحة</label>
              <div className="grid grid-cols-4 gap-2">
                {ALL_MODULES.map(m=>(
                  <label key={m} className={`flex items-center gap-1.5 p-2.5 rounded-lg border cursor-pointer transition-all text-xs ${selModules.includes(m)?"border-purple-300 bg-purple-50 text-purple-700 font-semibold":"border-gray-100 text-gray-600 hover:border-gray-300"}`}>
                    <input type="checkbox" checked={selModules.includes(m)} onChange={()=>toggleArr(selModules,m,setSelModules)} className="sr-only"/>
                    {selModules.includes(m) && <CheckCircle2 size={12} className="text-purple-500 flex-shrink-0"/>}
                    {!selModules.includes(m) && <div className="w-3 h-3 border border-gray-300 rounded flex-shrink-0"/>}
                    {m}
                  </label>
                ))}
              </div>
            </div>

            {(role==="محاسب"||role==="مدير فرع") && (
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">يرفع تقاريره إلى</label>
                <select value={reportsTo} onChange={e=>setReportsTo(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">— اختر المسؤول المباشر —</option>
                  <option>خالد العمري — رئيس حسابات</option>
                  <option>أحمد محمد الشهري — محاسب</option>
                </select>
              </div>
            )}

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-600 mb-2">ملخص التخصيص</p>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex gap-2"><span className="text-gray-400 w-20 flex-shrink-0">الاسم:</span><span className="font-medium">{name||"—"}</span></div>
                <div className="flex gap-2"><span className="text-gray-400 w-20 flex-shrink-0">الدور:</span><span className="font-medium">{role}</span></div>
                <div className="flex gap-2"><span className="text-gray-400 w-20 flex-shrink-0">العلامات:</span><span className="font-medium">{selBrands.join("، ")||"—"}</span></div>
                {selRests.length>0 && <div className="flex gap-2"><span className="text-gray-400 w-20 flex-shrink-0">المطاعم:</span><span className="font-medium">{selRests.join("، ")}</span></div>}
                {selBranches.length>0 && <div className="flex gap-2"><span className="text-gray-400 w-20 flex-shrink-0">الفرع:</span><span className="font-medium">{selBranches.join("، ")}</span></div>}
                <div className="flex gap-2"><span className="text-gray-400 w-20 flex-shrink-0">الموديولات:</span><span className="font-medium">{selModules.length} موديول</span></div>
                <div className="flex gap-2"><span className="text-gray-400 w-20 flex-shrink-0">النطاق:</span><span className="font-medium capitalize">{scopeFor()}</span></div>
              </div>
            </div>
          </>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          {step>0 && <button onClick={()=>setStep(s=>s-1)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">← السابق</button>}
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 mr-auto">إلغاء</button>
          {step<2
            ? <button onClick={()=>{if((step===0&&canNext0)||(step===1&&canNext1))setStep(s=>s+1);}}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors ${ (step===0&&canNext0)||(step===1&&canNext1) ? "bg-purple-600 text-white hover:bg-purple-700":"bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                التالي ←
              </button>
            : <button onClick={()=>{ if(!name.trim()) return;
                onAdd({ name,email,phone,role,brands:selBrands,restaurants:selRests,branches:selBranches,modules:selModules,reportsTo,scope:scopeFor(),status:"active" });
              }} className="px-6 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700">
                ✓ إضافة المستخدم
              </button>
          }
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────
function Sidebar({ role, ops, page, navigate, logout, collapsed, setCollapsed }:{
  role:RoleId; ops:Op[]; page:PageId;
  navigate:(p:PageId)=>void; logout:()=>void;
  collapsed:boolean; setCollapsed:(v:boolean)=>void;
}) {
  const profile = ROLE_PROFILES[role];
  const navEntries = NAV_CONFIG[role];
  const { drafts } = useContext(AssetDraftContext);
  const activeDraftCount = drafts.filter(d=>d.status==="draft").length;

  // compute live badge per module nav item
  const pendingByModule = useMemo(()=>{
    const counts: Record<string,number> = {};
    ops.filter(o=>o.status==="pending").forEach(o=>{ counts[MODULE_TO_NAV[o.moduleKey]] = (counts[MODULE_TO_NAV[o.moduleKey]]||0)+1; });
    return counts;
  }, [ops]);
  const headPendingCount = useMemo(()=>ops.filter(o=>o.status==="approved").length, [ops]);
  const totalAccPending = useMemo(()=>ops.filter(o=>o.status==="pending").length, [ops]);

  const getBadge = (item: NavItem): number|undefined => {
    if (role==="accountant") {
      if (item.id==="acc-dashboard") return totalAccPending||undefined;
      if (item.id==="acc-assets")    return activeDraftCount||undefined;
      return pendingByModule[item.id]||undefined;
    }
    if (role==="head" && item.id==="head-pending") return headPendingCount||undefined;
    return item.badge||undefined;
  };

  return (
    <aside className="flex flex-col flex-shrink-0 transition-all duration-200"
      style={{ width:collapsed?64:252, background:"linear-gradient(180deg,#0F1C35 0%,#1B3A6B 100%)", minHeight:"100vh" }}>
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-3 py-4 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background:"linear-gradient(135deg,#7C3AED,#00D9FF)" }}>
          <span className="text-white font-black text-sm">ع</span>
        </div>
        {!collapsed && <div className="flex-1 min-w-0"><div className="text-white font-bold text-base">عصب</div><div className="text-white/40 text-[10px]">ASAB System</div></div>}
        <button onClick={()=>setCollapsed(!collapsed)} className="text-white/30 hover:text-white transition-colors ml-auto">
          <ChevronRight size={16} className={collapsed?"":"rotate-180"} />
        </button>
      </div>
      {/* Role */}
      {!collapsed && (
        <div className="px-3 py-2.5 border-b border-white/10">
          <div className="text-[11px] px-2 py-1 rounded-full inline-block font-semibold bg-white/10 text-white/80">{profile.label}</div>
        </div>
      )}
      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {navEntries.map((entry,i) => {
          if(isSection(entry)) return !collapsed
            ? <div key={i} className="text-white/30 text-[10px] font-bold uppercase tracking-widest px-3 pt-4 pb-1">{entry.section}</div>
            : <div key={i} className="my-2 border-t border-white/10"/>;
          const active = page===entry.id || (entry.id==="acc-sales" && page==="acc-sales-detail") || (entry.id==="acc-inventory" && page==="acc-inventory-items");
          const badge = getBadge(entry);
          return (
            <button key={entry.id} onClick={()=>navigate(entry.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors text-right ${active?"bg-white/15 text-white":"text-white/55 hover:bg-white/8 hover:text-white/90"}`}>
              <span className={`flex-shrink-0 ${active?"text-[#00D9FF]":""}`}>{entry.icon}</span>
              {!collapsed && (<>
                <span className="text-[13px] font-medium flex-1 text-right leading-tight">{entry.label}</span>
                {badge ? <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${entry.id==="acc-assets"?"bg-purple-500 text-white":(entry as NavItem).badgeColor==="yellow"?"bg-amber-500 text-white":"bg-red-500 text-white"}`}>{badge}</span> : null}
              </>)}
            </button>
          );
        })}
      </nav>
      {/* User */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{profile.avatar}</div>
          {!collapsed && (<>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{profile.name}</div>
              <div className="text-white/40 text-[10px] truncate">{profile.label}</div>
            </div>
            <button onClick={logout} className="text-white/30 hover:text-red-300 transition-colors"><LogOut size={14}/></button>
          </>)}
        </div>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────
// APP SHELL
// ─────────────────────────────────────────────
function AppShell({ state, ops, approveOp, rejectOp, finalApproveOp, bulkApprove, addCorrectiveOp, markErpPosted, navigate, logout, setModal, setDetailId }:{
  state:AppState; ops:Op[];
  approveOp:(id:string)=>void; rejectOp:(id:string,r:string)=>void;
  finalApproveOp:(id:string)=>void; bulkApprove:(ids:string[])=>void;
  addCorrectiveOp?:(refId:string)=>void; markErpPosted?:(ids:string[],batchId:string)=>void;
  navigate:(p:PageId)=>void; logout:()=>void;
  setModal:(id:string|null)=>void; setDetailId:(id:string|null)=>void;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AdminUserData[]>([
    { name:"أحمد محمد الشهري", email:"ahmed@asab.sa",   phone:"0501234567", role:"محاسب",         brands:["علامة الريم"],                           restaurants:["مطعم الريم — العليا","مطعم الريم — جدة"], branches:[],                     modules:["المبيعات","المصروفات","المشتريات","المخزون"], reportsTo:"خالد العمري",  scope:"restaurant", status:"active" },
    { name:"سارة العمري",      email:"sara@asab.sa",    phone:"0507654321", role:"محاسب",         brands:["علامة هرفي"],                             restaurants:["هرفي — الرياض"],                          branches:[],                     modules:["المبيعات","المصروفات","المخزون","الشفتات"],    reportsTo:"خالد العمري",  scope:"restaurant", status:"active" },
    { name:"خالد العمري",      email:"khaled@asab.sa",  phone:"0509876543", role:"رئيس حسابات",  brands:["علامة الريم","علامة هرفي","ماكدونالدز"],  restaurants:[],                                          branches:[],                     modules:["المبيعات","المصروفات","المشتريات","المخزون","الشفتات","كشف الحساب","العهد","الأصول"], reportsTo:"",  scope:"brand",      status:"active" },
    { name:"أحمد الشمري",      email:"shammari@asab.sa",phone:"0503456789", role:"مدير فرع",     brands:["علامة الريم"],                            restaurants:["مطعم الريم — العليا"],                     branches:["فرع العليا الرئيسي"], modules:["المبيعات","المصروفات"],                         reportsTo:"أحمد محمد الشهري", scope:"branch", status:"active" },
    { name:"محمد الحربي",      email:"harbi@asab.sa",   phone:"0505678901", role:"محاسب",         brands:["ماكدونالدز"],                             restaurants:["ماكدونالدز — الرياض"],                     branches:[],                     modules:["المبيعات","المصروفات","المشتريات"],              reportsTo:"خالد العمري",  scope:"restaurant", status:"inactive" },
    { name:"فاطمة السالم",     email:"fatima@asab.sa",  phone:"0501122334", role:"محاسب",         brands:["بروستد الوطني"],                          restaurants:["بروستد — الطائف"],                         branches:[],                     modules:["المبيعات","المصروفات"],                         reportsTo:"خالد العمري",  scope:"restaurant", status:"active" },
    { name:"فهد الحربي",       email:"fahad@asab.sa",   phone:"0509988776", role:"مدير مشتريات", brands:["علامة الريم","علامة هرفي"],               restaurants:[],                                          branches:[],                     modules:["المشتريات"],                                    reportsTo:"",          scope:"brand",      status:"active" },
  ]);

  const role = state.role!;
  const profile = ROLE_PROFILES[role];

  const pageLabel = useMemo(()=>{
    const nav = NAV_CONFIG[role];
    for(const e of nav) if(!isSection(e) && e.id===state.page) return e.label;
    if(state.page==="acc-sales-detail") return "تفاصيل عملية المبيعات";
    if(state.page==="acc-inventory-items") return "تحديد أصناف الجرد اليومي";
    return "";
  }, [role, state.page]);

  const pageProps: PageProps = { navigate, setModal, setDetailId, detailId:state.detailId, ops, approveOp, rejectOp, finalApproveOp, bulkApprove, addCorrectiveOp, markErpPosted };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F0F4FA]" dir="rtl">
      <Sidebar role={role} ops={ops} page={state.page} navigate={navigate} logout={logout}
        collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed}/>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-4 flex-shrink-0 shadow-sm z-10">
          <div className="flex-1 min-w-0">
            <h1 className="text-gray-800 font-bold text-base leading-tight">{pageLabel}</h1>
            <p className="text-gray-400 text-xs">{profile.label}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg hidden sm:block">الاثنين، 14 أكتوبر 2025</div>
            <select className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-gray-50">
              <option>هذا الشهر</option><option>هذا الأسبوع</option><option>اليوم</option>
            </select>
            <button className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors">
              <Bell size={16}/>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button onClick={logout} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center gap-1"><LogOut size={13}/> خروج</button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5">
          <PageRouter state={state} pageProps={pageProps} adminUsers={adminUsers} setAdminUsers={setAdminUsers}/>
        </main>
      </div>

      {/* Reject Modal */}
      {state.modal==="reject" && state.detailId && (
        <RejectModal opId={state.detailId}
          onReject={(id,reason)=>{ rejectOp(id,reason); setModal(null); }}
          onClose={()=>setModal(null)}/>
      )}

      {/* Add User Modal */}
      {state.modal==="add-user" && (
        <AddUserModal
          onAdd={u=>{ setAdminUsers(prev=>[...prev,u]); setModal(null); }}
          onClose={()=>setModal(null)}/>
      )}

      {/* Contact Modal */}
      {state.modal==="contact" && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-[380px]" dir="rtl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">التواصل مع الموظف</h3>
              <button onClick={()=>setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
            </div>
            <div className="p-5">
              <div className="text-center mb-5">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center mx-auto mb-2"><span className="text-white font-bold text-lg">خش</span></div>
                <p className="font-bold text-gray-800">خالد الشمري</p><p className="text-gray-500 text-sm">مشرف الشفت — فرع الرياض العليا</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center"><Phone size={18} className="text-emerald-600"/></div>
                  <div><p className="font-semibold text-sm">اتصال هاتفي</p><p className="text-xs text-gray-400">+966 51 234 5678</p></div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:"#25D366"}}><span className="text-white text-lg">📱</span></div>
                  <div><p className="font-semibold text-sm">واتساب</p><p className="text-xs text-gray-400">فتح المحادثة في واتساب</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// OPERATION ROW  (reflects live status)
// ─────────────────────────────────────────────
function OpRow({ op, onView, onApprove, onReject }: {
  op:Op; onView:()=>void; onApprove:()=>void; onReject:()=>void;
}) {
  const match = MATCH_CFG[op.match];
  const statusCfg = STATUS_CFG[op.status];
  const isPending = op.status==="pending";
  const isLocked = op.status==="final-approved";
  const isRejected = op.status==="rejected";
  return (
    <div className={`px-5 py-4 flex items-start gap-4 hover:bg-gray-50/60 transition-colors border-b border-gray-100 last:border-0
      ${op.match==="diff"?"border-r-4 border-r-red-400":op.match==="review"?"border-r-4 border-r-amber-400":""}
      ${isLocked?"bg-slate-50/60":isRejected?"opacity-55":""}`}>
      <span className="mt-0.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100 flex-shrink-0">{op.moduleLabel}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-gray-800 text-sm">{op.branch}</span>
          <span className="text-gray-200">·</span>
          <span className="text-xs text-gray-400 font-mono tracking-tight">{op.id}</span>
          <span className="text-gray-200">·</span>
          <span className="text-xs text-gray-400">⏰ {op.timeAgo}</span>
          <Badge className={`${ORIGIN_CFG[op.origin].cls} border text-[9px]`}>
            {ORIGIN_CFG[op.origin].icon} {ORIGIN_CFG[op.origin].label}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge className={`${match.cls} border`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${match.dot}`}></span>
            {match.label}
          </Badge>
          {op.diff && <span className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">⚠ {op.diff}</span>}
          <span className="flex items-center gap-1 text-xs text-gray-400"><Paperclip size={10}/> {op.attachments}</span>
          <Badge className={`${statusCfg.cls} border ${isLocked?"border-slate-200":""}`}>
            {isLocked && <Lock size={10}/>}
            {statusCfg.label}
          </Badge>
          <OpStagePill op={op}/>
          {op.isCorrection && op.correctiveRef && (
            <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">تعديل ← {op.correctiveRef}</Badge>
          )}
          {isRejected && op.rejectReason && <span className="text-xs text-red-500 font-medium">سبب: {op.rejectReason}</span>}
        </div>
      </div>
      <div className="font-extrabold text-gray-800 font-mono text-sm flex-shrink-0 tabular-nums">{fmtAmt(op.amount)} ر.س</div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Btn size="sm" onClick={onView}><Eye size={12}/> عرض</Btn>
        {isPending && <>
          <Btn size="sm" variant="success" onClick={onApprove}><ThumbsUp size={12}/></Btn>
          <Btn size="sm" variant="danger"  onClick={onReject}><ThumbsDown size={12}/></Btn>
        </>}
        {isLocked && (
          <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-100 border border-slate-200 px-2 py-1.5 rounded-lg">
            <Lock size={11}/> مُغلق
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FILTER BAR  (shared by all ops list pages)
// ─────────────────────────────────────────────
interface Filters { branch:string; status:string; match:string; search:string; }

function FilterBar({ filters, onChange, branches }:{ filters:Filters; onChange:(f:Filters)=>void; branches:string[] }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
        <Search size={13} className="text-gray-400"/>
        <input value={filters.search} onChange={e=>onChange({...filters,search:e.target.value})} placeholder="بحث..." className="text-xs outline-none text-gray-600 w-28"/>
      </div>
      <select value={filters.branch} onChange={e=>onChange({...filters,branch:e.target.value})} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white">
        <option value="">الكل — الفروع</option>
        {branches.map(b=><option key={b}>{b}</option>)}
      </select>
      <select value={filters.status} onChange={e=>onChange({...filters,status:e.target.value})} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white">
        <option value="">كل الحالات</option>
        <option value="pending">معلق</option>
        <option value="approved">موافق عليه</option>
        <option value="rejected">مرفوض</option>
        <option value="final-approved">معتمد نهائياً</option>
      </select>
      <select value={filters.match} onChange={e=>onChange({...filters,match:e.target.value})} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white">
        <option value="">كل المطابقات</option>
        <option value="exact">متطابق</option>
        <option value="review">يحتاج مراجعة</option>
        <option value="diff">فرق</option>
      </select>
      {(filters.branch||filters.status||filters.match||filters.search) &&
        <button onClick={()=>onChange({branch:"",status:"",match:"",search:""})} className="text-xs text-purple-600 hover:underline flex items-center gap-1"><RotateCcw size={11}/> مسح الفلاتر</button>
      }
    </div>
  );
}

function applyFilters(ops:Op[], f:Filters, moduleKey?:ModuleKey): Op[] {
  return ops.filter(op=>{
    if(moduleKey && op.moduleKey!==moduleKey) return false;
    if(f.branch && op.branch!==f.branch) return false;
    if(f.status && op.status!==f.status) return false;
    if(f.match && op.match!==f.match) return false;
    if(f.search && !op.branch.includes(f.search) && !op.id.includes(f.search) && !op.moduleLabel.includes(f.search)) return false;
    return true;
  });
}

const BRANCHES = [...new Set(INITIAL_OPS.map(o=>o.branch))];

// ─────────────────────────────────────────────
// PAGE ROUTER
// ─────────────────────────────────────────────
function PageRouter({ state, pageProps, adminUsers, setAdminUsers }:{
  state:AppState; pageProps:PageProps;
  adminUsers:{name:string;email:string;role:string;restaurant:string;branches:number;status:string}[];
  setAdminUsers:(v:any)=>void;
}) {
  const { role, page } = state;
  const p = pageProps;

  if(role==="accountant") {
    if(page==="acc-dashboard")       return <AccDashboard {...p}/>;
    if(page==="acc-sales")           return <AccSalesPage {...p}/>;
    if(page==="acc-sales-detail")    return <AccSalesDetail {...p}/>;
    if(page==="acc-expenses")        return <AccExpensesPage {...p}/>;
    if(page==="acc-purchases")       return <AccPurchases {...p}/>;
    if(page==="acc-inventory")       return <AccInventory {...p}/>;
    if(page==="acc-inventory-items") return <AccInventoryItems {...p}/>;
    if(page==="acc-shifts")          return <AccShifts {...p}/>;
    if(page==="acc-employees")       return <AccEmployees {...p}/>;
    if(page==="acc-cash")            return <AccCash {...p}/>;
    if(page==="acc-assets")          return <AccAssets {...p}/>;
    if(page==="acc-waste")           return <AccWaste {...p}/>;
    if(page==="acc-reminders")       return <AccReminders {...p}/>;
    if(page==="acc-reports")         return <ReportsPage {...p}/>;
  }
  if(role==="head") {
    if(page==="head-dashboard")    return <HeadDashboard {...p}/>;
    if(page==="head-pending")      return <HeadPending {...p}/>;
    if(page==="head-approved")     return <HeadApproved {...p}/>;
    if(page==="head-rejected")     return <HeadRejected {...p}/>;
    if(page==="head-accountants")  return <HeadAccountants {...p}/>;
    if(page==="head-erp")          return <HeadERP {...p}/>;
    if(page==="head-reports")      return <OwnerReportsPage {...p}/>;
    if(page==="head-reminders")    return <AccReminders {...p}/>;
    const mk = page.replace("head-","") as ModuleKey;
    return <HeadModulePage moduleKey={mk} {...p}/>;
  }
  if(role==="admin") {
    if(page==="admin-overview")      return <AdminOverview {...p}/>;
    if(page==="admin-users")         return <AdminUsers {...p} users={adminUsers} setUsers={setAdminUsers}/>;
    if(page==="admin-restaurants")   return <AdminRestaurants {...p}/>;
    if(page==="admin-subscriptions") return <AdminSubscriptions {...p}/>;
    if(page==="admin-companies")     return <AdminCompanies {...p}/>;
    if(page==="admin-reports")       return <AdminReports {...p}/>;
    if(page==="admin-audit")         return <AdminAudit {...p}/>;
    if(page==="admin-permissions")   return <AdminPermissions {...p}/>;
    if(page==="admin-settings")      return <AdminSettings {...p}/>;
  }
  if(role==="branch") {
    if(page==="branch-overview")   return <BranchOverview {...p}/>;
    if(page==="branch-employees")  return <BranchEmployees {...p}/>;
    if(page==="branch-items")      return <BranchItems {...p}/>;
    if(page==="branch-suppliers")  return <BranchSuppliers {...p}/>;
    if(page==="branch-upload")     return <BranchUpload {...p}/>;
    if(page==="branch-settings")   return <BranchSettings {...p}/>;
  }
  if(role==="procurement") {
    if(page==="proc-overview")   return <ProcOverview {...p}/>;
    if(page==="proc-new")        return <ProcNewOrders {...p}/>;
    if(page==="proc-grouped")    return <ProcGrouped {...p}/>;
    if(page==="proc-sent")       return <ProcSent {...p}/>;
    if(page==="proc-reports")    return <ReportsPage {...p}/>;
    if(page==="proc-items")      return <ProcItems {...p}/>;
    if(page==="proc-suppliers")  return <ProcSuppliers {...p}/>;
    return <SimplePage title={page} icon="🛒" desc=""/>;
  }
  if(role==="supplier") {
    if(page==="sup-overview")  return <SupOverview {...p}/>;
    if(page==="sup-new")       return <SupNewOrders {...p}/>;
    if(page==="sup-accepted")  return <SupAccepted {...p}/>;
    if(page==="sup-rejected")  return <SupRejected {...p}/>;
    if(page==="sup-items")     return <SupItems {...p}/>;
    if(page==="sup-reports")   return <SupReports {...p}/>;
    return <SimplePage title={page} icon="🏭" desc=""/>;
  }
  return <SimplePage title="قيد التطوير" icon="🚧" desc="هذه الصفحة قيد التطوير"/>;
}

// ─────────────────────────────────────────────
// EXCEPTION PANEL  — action-oriented risk & intervention layer
// Each exception surfaces: who owns it, what action is required,
// how long it has been unresolved, and what the financial impact is.
// ─────────────────────────────────────────────
type ExceptionSeverity = "critical"|"high"|"medium";
interface ExceptionItem {
  severity:    ExceptionSeverity;
  icon:        string;
  label:       string;
  count:       number;
  owner:       string;
  action:      string;
  age:         string;
  impact:      string;
  navTarget:   PageId;   // exact page to navigate to for resolution
  navLabel:    string;   // CTA label on the navigate button
  detail?:     string;
}

// derive the module key with the most matching ops, return a nav page
function topModulePage(targetOps: Op[], prefix: string, fallback: string): PageId {
  const freq: Record<string,number> = {};
  targetOps.forEach(o=>{ freq[o.moduleKey]=(freq[o.moduleKey]||0)+1; });
  const top = Object.entries(freq).sort(([,a],[,b])=>b-a)[0];
  return (top ? `${prefix}${top[0]}` : fallback) as PageId;
}

function deriveExceptions(ops: Op[], forRole: "accountant"|"head"): ExceptionItem[] {
  const items: ExceptionItem[] = [];

  // 1. Ops stuck too long in review (pending > 2 days)
  const stuck = ops.filter(o =>
    o.status==="pending" &&
    (o.timeAgo.includes("3 أيام")||o.timeAgo.includes("4 أيام")||o.timeAgo.includes("أسبوع"))
  );
  if(stuck.length > 0) {
    const oldestAge = stuck.map(o=>o.timeAgo).sort().pop() || "";
    const totalAmt  = stuck.reduce((s,o)=>s+o.amount,0);
    const navTarget = forRole==="head" ? "head-pending" as PageId : topModulePage(stuck,"acc-","acc-sales");
    items.push({
      severity:"high", icon:"⏰",
      label:"بيانات معلقة منذ أكثر من يومين بدون مراجعة",
      count:stuck.length,
      owner:  forRole==="head" ? "المحاسب المُكلَّف بالفرع" : "أنت — هذه ضمن فروعك",
      action: "افتح كل عملية معلقة وأكمل المراجعة أو ارفضها بسبب واضح",
      age:    `أطول تأخير: ${oldestAge} — تجاوز الحد المقبول`,
      impact: `${fmtAmt(totalAmt)} ر.س لم تدخل دورة الاعتماد — تعطل التجميع الشهري`,
      navTarget, navLabel: forRole==="head" ? "عرض المعلقة" : "فتح الموديول",
      detail: stuck.map(o=>`${o.branch} · ${o.moduleLabel}`).slice(0,3).join(" | "),
    });
  }

  // 2. Unresolved quantity/price differences — critical risk (blocks consolidation)
  const diffs = ops.filter(o=>o.match==="diff" && o.status==="pending");
  if(diffs.length > 0) {
    const totalDiff = diffs.reduce((s,o)=>s+o.amount,0);
    const navTarget = forRole==="head" ? "head-pending" as PageId : topModulePage(diffs,"acc-","acc-purchases");
    items.push({
      severity:"critical", icon:"⚠",
      label:"فروق في الكميات أو الأسعار لم تُحل بعد",
      count:diffs.length,
      owner:  forRole==="head" ? "المحاسب المُكلَّف — يتطلب تدخل رئيس الحسابات للحالات المعقدة" : "أنت — الفرق يستوجب قرارك",
      action: "راجع الفرق، أصدر عملية تعديل، أو احتسب الفرق وأقفل البيان",
      age:    diffs.map(o=>o.timeAgo).join(" · "),
      impact: `${fmtAmt(totalDiff)} ر.س في بيانات مع فروق — لا يمكن تجميعها حتى تُحل`,
      navTarget, navLabel: "عرض البيانات المُختلفة",
      detail: diffs.map(o=>o.diff||"").filter(Boolean).slice(0,2).join(" | "),
    });
  }

  // 3. Final-approved items still waiting ERP export — head only
  if(forRole==="head") {
    const pendingErp = ops.filter(o=>o.status==="final-approved" && !o.erpPosted);
    if(pendingErp.length > 0) {
      const pendingAmt = pendingErp.reduce((s,o)=>s+o.amount,0);
      items.push({
        severity:"medium", icon:"🔗",
        label:"عمليات مُعتمدة نهائياً لم تُرحَّل لـ ERP بعد",
        count:pendingErp.length,
        owner:  "رئيس الحسابات — يملك صلاحية تشغيل دفعة الترحيل",
        action: "انتقل إلى التصدير لـ ERP وأنشئ دفعة ترحيل لهذه العمليات",
        age:    "مُعتمدة — في انتظار الدفعة",
        impact: `${fmtAmt(pendingAmt)} ر.س غائبة عن ERP — تقارير المالك ناقصة`,
        navTarget:"head-erp", navLabel:"فتح صفحة التصدير لـ ERP",
      });
    }
  }

  // 4. Corrective operations pending review
  const corrections = ops.filter(o=>o.isCorrection && o.status==="pending");
  if(corrections.length > 0) {
    const navTarget = forRole==="head" ? "head-pending" as PageId : topModulePage(corrections,"acc-","acc-sales");
    items.push({
      severity:"medium", icon:"🔄",
      label:"عمليات تعديل مُرتبطة بعمليات سابقة تنتظر المراجعة",
      count:corrections.length,
      owner:  forRole==="head" ? "المحاسب المُصدِر للتعديل" : "أنت — التعديل مرتبط ببيان أصدرته",
      action: "راجع عملية التعديل وتحقق من صحة المبالغ المُصحَّحة قبل الموافقة",
      age:    corrections.map(o=>o.timeAgo).slice(0,2).join(" · "),
      impact: "عدم الموافقة على التعديل يُبقي الرصيد الأصلي مغلوطاً في القيد المحاسبي",
      navTarget, navLabel: "فتح عمليات التعديل",
      detail: corrections.map(o=>`${o.id} ← ${o.correctiveRef||""}`).slice(0,2).join(" | "),
    });
  }

  // 5. Branches with repeated rejection patterns (≥2 rejections)
  const rejByBranch: Record<string,{count:number; total:number}> = {};
  ops.filter(o=>o.status==="rejected").forEach(o=>{
    if(!rejByBranch[o.branch]) rejByBranch[o.branch]={count:0,total:0};
    rejByBranch[o.branch].count++; rejByBranch[o.branch].total+=o.amount;
  });
  const problemBranches = Object.entries(rejByBranch).filter(([,v])=>v.count>=2);
  if(problemBranches.length > 0) {
    const totalRejected = problemBranches.reduce((s,[,v])=>s+v.total,0);
    items.push({
      severity:"medium", icon:"📍",
      label:"فروع تظهر نمط رفض متكرر للبيانات",
      count:problemBranches.length,
      owner:  "مدير الفرع + " + (forRole==="head" ? "رئيس الحسابات" : "أنت"),
      action: "تواصل مع مدير الفرع لتحديد سبب الأخطاء المتكررة وتصحيح منهجية الرفع",
      age:    "نمط متكرر — ليس حادثة معزولة",
      impact: `${fmtAmt(totalRejected)} ر.س في بيانات مرفوضة — مؤشر على مشكلة هيكلية`,
      navTarget: forRole==="head" ? "head-rejected" : "acc-sales" as PageId,
      navLabel: "عرض المرفوضة",
      detail: problemBranches.map(([b,v])=>`${b} (${v.count} مرفوضة)`).join(" | "),
    });
  }

  return items;
}

const EXCEPTION_SEV_CFG: Record<ExceptionSeverity,{ cls:string; barCls:string; dot:string; badgeCls:string; titleCls:string; label:string }> = {
  critical: { cls:"border-red-200 bg-red-50/60",    barCls:"bg-red-500",    dot:"bg-red-500",    badgeCls:"bg-red-100 text-red-700 border-red-200",     titleCls:"text-red-800",   label:"حرج"   },
  high:     { cls:"border-amber-200 bg-amber-50/60", barCls:"bg-amber-500",  dot:"bg-amber-500",  badgeCls:"bg-amber-100 text-amber-700 border-amber-200",titleCls:"text-amber-800", label:"عالي"  },
  medium:   { cls:"border-sky-200 bg-sky-50/60",     barCls:"bg-sky-400",    dot:"bg-sky-400",    badgeCls:"bg-sky-100 text-sky-700 border-sky-200",     titleCls:"text-sky-800",   label:"متوسط" },
};

function ExceptionPanel({ ops, forRole, navigate }: { ops: Op[]; forRole:"accountant"|"head"; navigate:(p:PageId)=>void }) {
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState<number|null>(null);
  const exceptions = deriveExceptions(ops, forRole);
  const criticalCount = exceptions.filter(e=>e.severity==="critical").length;
  const highCount     = exceptions.filter(e=>e.severity==="high").length;

  if(exceptions.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3.5 flex items-center gap-3" dir="rtl">
        <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0"/>
        <span className="text-sm font-semibold text-emerald-800">لا استثناءات مكتشفة — النظام يعمل بشكل طبيعي</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden" dir="rtl">
      <button onClick={()=>setOpen(o=>!o)}
        className="w-full px-5 py-3.5 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50/80 transition-colors">
        <div className="flex items-center gap-3">
          <AlertTriangle size={15} className={criticalCount>0?"text-red-500":"text-amber-500"}/>
          <span className="font-bold text-gray-900 text-sm">استثناءات تستوجب التدخل</span>
          <div className="flex items-center gap-1.5">
            {criticalCount>0 && <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200">{criticalCount} حرج</span>}
            {highCount>0     && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">{highCount} عالي</span>}
            {exceptions.filter(e=>e.severity==="medium").length>0 &&
              <span className="bg-sky-100 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-200">{exceptions.filter(e=>e.severity==="medium").length} متوسط</span>}
          </div>
        </div>
        <span className="text-[11px] text-gray-400 font-medium">{open?"▲ طي":"▼ توسيع"}</span>
      </button>

      {open && (
        <div className="divide-y divide-gray-100">
          {exceptions.map((ex,i)=>{
            const sev   = EXCEPTION_SEV_CFG[ex.severity];
            const isExp = expanded===i;
            return (
              <div key={i} className={`${sev.cls} transition-colors`}>
                {/* Summary row — always visible */}
                <button onClick={()=>setExpanded(isExp?null:i)}
                  className="w-full px-5 py-3.5 flex items-start gap-4 text-right hover:brightness-95 transition-all">
                  <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${sev.barCls}`}/>
                  <span className="text-xl flex-shrink-0 mt-0.5">{ex.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`font-bold text-sm ${sev.titleCls}`}>{ex.label}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sev.badgeCls}`}>{sev.label}</span>
                      <span className={`font-mono font-extrabold text-base ${sev.titleCls}`}>{ex.count}</span>
                    </div>
                    {/* 4 context fields — compact inline */}
                    <div className="flex items-center gap-4 flex-wrap text-[11px]">
                      <span className="flex items-center gap-1 text-gray-600">
                        <span className="font-semibold text-gray-500">المسؤول</span>
                        <span>{ex.owner}</span>
                      </span>
                      <span className="text-gray-300">·</span>
                      <span className="flex items-center gap-1 text-gray-600">
                        <span className="font-semibold text-gray-500">منذ</span>
                        <span>{ex.age}</span>
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 flex-shrink-0 mt-1">{isExp?"▲":"▼"}</span>
                </button>

                {/* Expanded detail — action + impact */}
                {isExp && (
                  <div className="px-5 pb-4 pr-12 space-y-2.5">
                    <div className="bg-white/70 rounded-xl border border-white/80 p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-amber-700">!</span>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">الإجراء المطلوب</p>
                          <p className="text-sm font-semibold text-gray-800">{ex.action}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-red-100 border border-red-200 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-red-700">ر</span>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">الأثر المالي / التشغيلي إذا لم يُحل</p>
                          <p className="text-sm text-gray-700">{ex.impact}</p>
                        </div>
                      </div>
                      {ex.detail && (
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-gray-500">i</span>
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">السياق</p>
                            <p className="text-xs text-gray-500 font-mono">{ex.detail}</p>
                          </div>
                        </div>
                      )}
                      {/* Navigation CTA — routes directly to the affected records/queue */}
                      <div className="pt-2 border-t border-white/60 flex items-center justify-between">
                        <p className="text-[10px] text-gray-400">انتقل مباشرةً إلى السجلات المُتأثرة للتدخل</p>
                        <button
                          onClick={(e)=>{ e.stopPropagation(); navigate(ex.navTarget); }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                            ${sev.badgeCls} border hover:opacity-80`}>
                          <ChevronsRight size={12}/>
                          {ex.navLabel}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MODULE AGGREGATION GRID  — module-level export readiness
// ─────────────────────────────────────────────
const MODULE_META = [
  { key:"sales" as ModuleKey,     label:"المبيعات",           icon:"💰" },
  { key:"expenses" as ModuleKey,  label:"المصروفات",           icon:"💸" },
  { key:"purchases" as ModuleKey, label:"المشتريات",           icon:"🛒" },
  { key:"inventory" as ModuleKey, label:"المخزون",             icon:"📦" },
  { key:"shifts" as ModuleKey,    label:"الشفتات",             icon:"⏰" },
  { key:"employees" as ModuleKey, label:"كشف الحساب",         icon:"👥" },
  { key:"cash" as ModuleKey,      label:"العهد النقدية",       icon:"💼" },
  { key:null,                     label:"الأصول الثابتة",     icon:"🏢" },
];

// Pipeline step labels shown in the legend
const EXPORT_PIPELINE_STEPS: ModuleAggState[] = ["incomplete","ready_consolidation","consolidated","ready_erp","exported","erp_imported"];

function ModuleAggregationGrid({ ops, navigate }: { ops: Op[]; navigate:(p:PageId)=>void }) {
  const [selectedKey, setSelectedKey] = useState<string|null>(null);
  const selectedMeta = selectedKey ? MODULE_META.find(m=>(m.key||m.label)===selectedKey) : null;
  const selectedOps  = selectedMeta?.key ? ops.filter(o=>o.moduleKey===selectedMeta.key) : [];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden" dir="rtl">

      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">جاهزية التجميع المحاسبي — مسار التصدير لـ ERP</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">كل موديول يمثل حزمة قيود محاسبية · اضغط على موديول لفحص محتوى الحزمة</p>
          </div>
        </div>
        <div className="flex items-center gap-0 overflow-x-auto">
          {EXPORT_PIPELINE_STEPS.map((s,i)=>{
            const cfg = MODULE_AGG_CFG[s];
            const isLast = i===EXPORT_PIPELINE_STEPS.length-1;
            return (
              <div key={s} className="flex items-center gap-0 flex-shrink-0">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`}></span>
                  <span className="text-[10px] font-semibold text-gray-600">{cfg.label}</span>
                  {s==="erp_imported" && <span className="text-[9px] text-purple-400 font-bold">★</span>}
                </div>
                {!isLast && <span className="text-gray-300 text-xs flex-shrink-0">→</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Module cards */}
      <div className="p-4 grid grid-cols-4 gap-3">
        {MODULE_META.map(m=>{
          const cardKey = m.key||m.label;
          const mOps    = m.key ? ops.filter(o=>o.moduleKey===m.key) : [];
          const state   = getModuleAggState(mOps);
          const cfg     = MODULE_AGG_CFG[state];
          const counts  = {
            pending:  mOps.filter(o=>o.status==="pending").length,
            approved: mOps.filter(o=>o.status==="approved").length,
            final:    mOps.filter(o=>o.status==="final-approved").length,
            erp:      mOps.filter(o=>o.erpPosted).length,
          };
          const total    = mOps.reduce((s,o)=>s+o.amount,0);
          const stepNum  = cfg.step;
          const maxStep  = 5;
          const isSelected = selectedKey===cardKey;

          return (
            <button key={cardKey} onClick={()=>setSelectedKey(isSelected?null:cardKey)}
              className={`rounded-xl border text-right overflow-hidden transition-all
                ${cfg.cls} ${isSelected?"ring-2 ring-offset-1 ring-purple-400 shadow-md":"hover:brightness-95"}`}>
              <div className="h-1 bg-gray-200/60">
                <div className={`h-1 ${cfg.dot}`} style={{width:`${Math.min((stepNum/maxStep)*100,100)}%`}}/>
              </div>
              <div className="p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">{m.icon}</span>
                  <span className={`text-[9px] font-bold ${cfg.headerCls}`}>{stepNum>0?`م${stepNum}/5`:""}</span>
                </div>
                <p className="font-bold text-sm text-gray-800 mb-0.5">{m.label}</p>
                <p className={`text-[10px] font-semibold mb-1 ${cfg.headerCls}`}>{cfg.label}</p>
                <p className="text-[9px] text-gray-400 mb-2 leading-tight">{cfg.sublabel}</p>
                {mOps.length > 0 ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1 flex-wrap">
                      {counts.pending  > 0 && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">{counts.pending} معلق</span>}
                      {counts.approved > 0 && <span className="text-[9px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full font-semibold">{counts.approved} راجع</span>}
                      {counts.final    > 0 && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">{counts.final} مُجمَّع</span>}
                      {counts.erp      > 0 && <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-semibold">{counts.erp} ERP</span>}
                    </div>
                    {total>0 && <p className="text-[10px] font-mono font-bold text-gray-600">{(total/1000).toFixed(1)}K ر.س</p>}
                  </div>
                ) : (
                  <span className="text-[10px] text-gray-300">لا توجد بيانات</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Accounting package drill-down — shown when a module card is selected */}
      {selectedMeta && (
        <div className="border-t border-gray-100 bg-gray-50/60 p-5" dir="rtl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">{selectedMeta.icon}</span>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">الحزمة المحاسبية — {selectedMeta.label}</h4>
                <p className="text-[10px] text-gray-400">محتوى الحزمة: ما هو مُدرَج، ما هو مُستبعد، ما يمنع التجميع، ما هو جاهز لـ ERP</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedMeta.key && (
                <button onClick={()=>navigate(`head-${selectedMeta.key}` as PageId)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-[11px] font-bold hover:bg-purple-700 transition-colors">
                  <ChevronsRight size={11}/>
                  فتح الموديول
                </button>
              )}
              <button onClick={()=>setSelectedKey(null)} className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 rounded-lg hover:bg-white border border-transparent hover:border-gray-200">
                ✕ إغلاق
              </button>
            </div>
          </div>

          {selectedOps.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">لا توجد بيانات في هذا الموديول</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {/* Left column: included + blocking */}
              <div className="space-y-3">
                {/* Final-approved (in the package) */}
                {selectedOps.filter(o=>o.status==="final-approved").length > 0 && (
                  <div className="bg-white rounded-xl border border-emerald-100 overflow-hidden">
                    <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="text-[11px] font-bold text-emerald-800">مُدرَجة في الحزمة — قيود مُعتمدة نهائياً</span>
                      <span className="text-[10px] text-emerald-600 mr-auto font-mono font-bold">
                        {fmtAmt(selectedOps.filter(o=>o.status==="final-approved").reduce((s,o)=>s+o.amount,0))} ر.س
                      </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {selectedOps.filter(o=>o.status==="final-approved").slice(0,4).map((o,i)=>(
                        <div key={i} className="px-4 py-2 flex items-center gap-3 text-xs">
                          <span className="font-mono text-gray-400 flex-shrink-0">{o.id}</span>
                          <span className="text-gray-600 flex-shrink-0">{o.branch}</span>
                          <span className="flex-1"></span>
                          <span className="font-mono font-bold text-gray-700">{fmtAmt(o.amount)} ر.س</span>
                          {o.erpPosted
                            ? <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">ERP ✓</span>
                            : <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">جاهز</span>}
                        </div>
                      ))}
                      {selectedOps.filter(o=>o.status==="final-approved").length > 4 &&
                        <p className="px-4 py-1.5 text-[10px] text-gray-400">+ {selectedOps.filter(o=>o.status==="final-approved").length-4} عمليات أخرى</p>}
                    </div>
                  </div>
                )}

                {/* Pending (blocking consolidation) */}
                {selectedOps.filter(o=>o.status==="pending").length > 0 && (
                  <div className="bg-white rounded-xl border border-red-100 overflow-hidden">
                    <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      <span className="text-[11px] font-bold text-red-800">معلقة — تمنع اكتمال التجميع</span>
                      <span className="text-[10px] text-red-600 mr-auto font-mono font-bold">
                        {fmtAmt(selectedOps.filter(o=>o.status==="pending").reduce((s,o)=>s+o.amount,0))} ر.س
                      </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {selectedOps.filter(o=>o.status==="pending").slice(0,3).map((o,i)=>(
                        <div key={i} className="px-4 py-2 flex items-center gap-3 text-xs">
                          <span className="font-mono text-gray-400 flex-shrink-0">{o.id}</span>
                          <span className="text-gray-600 flex-shrink-0">{o.branch}</span>
                          {o.match==="diff" && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">⚠ فرق</span>}
                          <span className="flex-1"></span>
                          <span className="font-mono font-bold text-gray-700">{fmtAmt(o.amount)} ر.س</span>
                          <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">{o.timeAgo}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right column: ERP-ready + batches */}
              <div className="space-y-3">
                {/* Ready for ERP export */}
                {(() => {
                  const readyForErp = selectedOps.filter(o=>o.status==="final-approved" && !o.erpPosted);
                  if(readyForErp.length === 0) return null;
                  return (
                    <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden">
                      <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-[11px] font-bold text-emerald-800">جاهز للإرسال لـ ERP</span>
                        <span className="text-[10px] text-emerald-600 mr-auto font-mono font-bold">
                          {fmtAmt(readyForErp.reduce((s,o)=>s+o.amount,0))} ر.س
                        </span>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-xs text-gray-500">{readyForErp.length} عملية مُعتمدة نهائياً لم تُضَم لدفعة ERP بعد</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">ادمجها في الدفعة القادمة من صفحة التصدير لـ ERP</p>
                      </div>
                    </div>
                  );
                })()}

                {/* ERP batch membership */}
                {(() => {
                  const posted = selectedOps.filter(o=>o.erpPosted);
                  if(posted.length === 0) return null;
                  const bm: Record<string,{total:number;count:number}> = {};
                  posted.forEach(o=>{ const b=o.erpBatchId||"—"; if(!bm[b]) bm[b]={total:0,count:0}; bm[b].total+=o.amount; bm[b].count++; });
                  return (
                    <div className="bg-white rounded-xl border border-indigo-100 overflow-hidden">
                      <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        <span className="text-[11px] font-bold text-indigo-800">مُرحَّلة في ERP — دفعات مُغلقة</span>
                        <span className="text-[10px] text-indigo-600 mr-auto font-mono font-bold">
                          {fmtAmt(posted.reduce((s,o)=>s+o.amount,0))} ر.س
                        </span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {Object.entries(bm).map(([bid,{total,count}],i)=>(
                          <div key={i} className="px-4 py-2 flex items-center gap-3">
                            <span className="font-mono text-[10px] text-indigo-700 font-bold">{bid}</span>
                            <span className="flex-1"></span>
                            <span className="text-[10px] text-gray-500">{count} بيان</span>
                            <span className="font-mono text-xs font-bold text-indigo-800">{fmtAmt(total)} ر.س</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Excluded: rejected */}
                {selectedOps.filter(o=>o.status==="rejected").length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                      <span className="text-[11px] font-bold text-gray-600">مُستبعدة — مرفوضة، خارج الحزمة</span>
                      <span className="text-[10px] text-gray-500 mr-auto font-mono">
                        {selectedOps.filter(o=>o.status==="rejected").length} بيانات
                      </span>
                    </div>
                    <div className="px-4 py-2">
                      {selectedOps.filter(o=>o.status==="rejected").slice(0,2).map((o,i)=>(
                        <p key={i} className="text-[10px] text-gray-400 py-0.5">{o.id} · {o.branch} · {o.rejectReason||"—"}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// OWNER REPORTS PAGE
// Two distinct layers:
//  1. "التقارير الداخلية" — finance team operational reports
//  2. "رؤية المالك"       — executive read-only destination built on ERP-verified data only
// The owner layer has zero workflow elements, zero action buttons,
// and presents the financial position as a closed, unambiguous statement.
// ─────────────────────────────────────────────
// September 2025 baseline — simulated previous-period ERP-verified amounts for comparison
const SEPT_BASELINE: Partial<Record<ModuleKey,number>> = {
  sales:     185000,
  expenses:   42000,
  purchases:  88000,
  inventory:  31000,
  shifts:     22000,
  employees:  54000,
  cash:        8500,
};
const SEPT_NET = (SEPT_BASELINE.sales||0) - (SEPT_BASELINE.expenses||0) - (SEPT_BASELINE.purchases||0);

function OwnerReportsPage({ ops }: PageProps) {
  const [tab, setTab] = useState<"internal"|"owner">("owner");

  // — Owner layer data source: ERP-posted only — the verified financial record
  const postedOps    = ops.filter(o=>o.erpPosted);
  const salesPosted  = postedOps.filter(o=>o.moduleKey==="sales").reduce((s,o)=>s+o.amount,0);
  const expPosted    = postedOps.filter(o=>o.moduleKey==="expenses").reduce((s,o)=>s+o.amount,0);
  const purPosted    = postedOps.filter(o=>o.moduleKey==="purchases").reduce((s,o)=>s+o.amount,0);
  const netPosition  = salesPosted - expPosted - purPosted;

  // Period comparison vs September 2025 baseline
  const netPctChange = SEPT_NET > 0 ? Math.round(((netPosition - SEPT_NET) / SEPT_NET) * 100) : null;

  // Branch rankings from ERP-posted ops — descending by amount
  const branchAmts: Record<string,number> = {};
  postedOps.forEach(o=>{ branchAmts[o.branch]=(branchAmts[o.branch]||0)+o.amount; });
  const branchRankings = Object.entries(branchAmts).sort(([,a],[,b])=>b-a).slice(0,5);

  // Category breakdown for owner — ERP-posted amounts only, with period comparison
  const ownerCategories = [
    { key:"sales"     as ModuleKey, label:"الإيرادات",        icon:"💰", color:"bg-emerald-500", textColor:"text-emerald-700", isIncome:true  },
    { key:"expenses"  as ModuleKey, label:"المصروفات",        icon:"💸", color:"bg-red-500",     textColor:"text-red-700",     isIncome:false },
    { key:"purchases" as ModuleKey, label:"المشتريات",        icon:"🛒", color:"bg-orange-500",  textColor:"text-orange-700",  isIncome:false },
    { key:"inventory" as ModuleKey, label:"المخزون",          icon:"📦", color:"bg-amber-500",   textColor:"text-amber-700",   isIncome:false },
    { key:"shifts"    as ModuleKey, label:"الشفتات",          icon:"⏰", color:"bg-blue-500",    textColor:"text-blue-700",    isIncome:false },
    { key:"employees" as ModuleKey, label:"مستحقات الموظفين", icon:"👥", color:"bg-indigo-500",  textColor:"text-indigo-700",  isIncome:false },
    { key:"cash"      as ModuleKey, label:"العهد النقدية",    icon:"💼", color:"bg-purple-500",  textColor:"text-purple-700",  isIncome:false },
  ].map(c=>{
    const amt  = postedOps.filter(o=>o.moduleKey===c.key).reduce((s,o)=>s+o.amount,0);
    const prev = SEPT_BASELINE[c.key]||0;
    const pct  = prev > 0 ? Math.round(((amt-prev)/prev)*100) : null;
    return {...c, amount:amt, prev, pct};
  }).filter(c=>c.amount>0 || c.prev>0);

  const maxCatAmt = Math.max(...ownerCategories.map(c=>Math.max(c.amount,c.prev)), 1);

  // Auto-commentary: 3-4 insight bullets derived from ERP-verified data only
  const commentary: {icon:string; text:string; color:string}[] = [];
  const incomeChange = SEPT_BASELINE.sales ? salesPosted - (SEPT_BASELINE.sales||0) : null;
  if(incomeChange !== null) {
    if(incomeChange > 0) commentary.push({icon:"↑", text:`ارتفعت الإيرادات بمقدار ${fmtAmt(incomeChange)} ر.س مقارنةً بسبتمبر 2025`, color:"text-emerald-700"});
    else if(incomeChange < 0) commentary.push({icon:"↓", text:`انخفضت الإيرادات بمقدار ${fmtAmt(Math.abs(incomeChange))} ر.س مقارنةً بسبتمبر 2025`, color:"text-red-700"});
  }
  if(netPctChange !== null) {
    if(netPctChange >= 0) commentary.push({icon:"✓", text:`صافي المركز المالي تحسَّن ${netPctChange}% مقارنةً بالشهر السابق`, color:"text-emerald-700"});
    else commentary.push({icon:"⚠", text:`صافي المركز المالي تراجع ${Math.abs(netPctChange)}% مقارنةً بالشهر السابق — يستوجب المتابعة`, color:"text-amber-700"});
  }
  const topBranch = branchRankings[0];
  if(topBranch) commentary.push({icon:"🏆", text:`${topBranch[0]} هو الفرع الأعلى إيراداً في ERP بمقدار ${fmtAmt(topBranch[1])} ر.س`, color:"text-indigo-700"});
  const highExpPct = SEPT_BASELINE.expenses && expPosted > (SEPT_BASELINE.expenses||0)*1.1;
  if(highExpPct) commentary.push({icon:"!", text:"المصروفات تجاوزت مستوى سبتمبر بأكثر من 10% — يُوصى بمراجعة بنود الإنفاق", color:"text-red-700"});

  // ERP batch log — source of truth
  const batchMap: Record<string,{id:string; total:number; modules:Set<string>}> = {};
  postedOps.forEach(o=>{
    const b = o.erpBatchId||"دفعة غير مُسمَّاة";
    if(!batchMap[b]) batchMap[b]={id:b,total:0,modules:new Set()};
    batchMap[b].total+=o.amount; batchMap[b].modules.add(o.moduleLabel);
  });
  const batches = Object.values(batchMap);

  return (
    <div className="space-y-5" dir="rtl">
      {/* Page header — kept minimal, layer tabs carry the identity */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">التقارير المالية</h2>
        <p className="text-gray-400 text-sm mt-0.5">طبقتان: التقارير التشغيلية الداخلية · رؤية المالك النهائية</p>
      </div>

      {/* Layer tabs — visually distinct to signal the boundary */}
      <div className="flex gap-0 border-b-2 border-gray-200">
        <button onClick={()=>setTab("internal")}
          className={`px-6 py-3 text-sm font-semibold border-b-2 -mb-0.5 transition-all
            ${tab==="internal"?"border-blue-600 text-blue-700 bg-blue-50/60":"border-transparent text-gray-400 hover:text-gray-600"}`}>
          <span className="flex flex-col items-start gap-0.5">
            <span>📋 التقارير الداخلية</span>
            <span className="text-[10px] font-normal text-gray-400">للفريق المالي · تشغيلية</span>
          </span>
        </button>
        <button onClick={()=>setTab("owner")}
          className={`px-6 py-3 text-sm font-semibold border-b-2 -mb-0.5 transition-all
            ${tab==="owner"?"border-indigo-600 text-indigo-700 bg-indigo-50/60":"border-transparent text-gray-400 hover:text-gray-600"}`}>
          <span className="flex flex-col items-start gap-0.5">
            <span>👁 رؤية المالك</span>
            <span className="text-[10px] font-normal text-gray-400">وجهة نهائية · بيانات ERP فقط · قراءة فقط</span>
          </span>
        </button>
      </div>

      {/* ─── INTERNAL TAB — finance team operational view ─── */}
      {tab==="internal" && (
        <div className="space-y-5">
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-3.5 flex items-start gap-3">
            <span className="text-xl flex-shrink-0 mt-0.5">📋</span>
            <div>
              <p className="text-sm font-bold text-blue-800">تقارير داخلية — الطبقة التشغيلية للفريق المالي</p>
              <p className="text-xs text-blue-600 mt-0.5">تشمل البيانات في جميع مراحل المراجعة · تُستخدم لمتابعة الأداء الداخلي وليس للقرار المالي النهائي</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              {title:"تقرير المبيعات الشهري",     icon:"💰", desc:"إجمالي المبيعات لكل الفروع مجمعةً"},
              {title:"تقرير المصروفات التشغيلية",  icon:"💸", desc:"المصروفات المرفوعة والمعتمدة"},
              {title:"تقرير المشتريات والموردين",  icon:"🛒", desc:"الطلبات والفواتير الواردة"},
              {title:"كشف مستحقات الموظفين",       icon:"👥", desc:"الرواتب والبدلات الشهرية"},
              {title:"تقرير المخزون والجرد",        icon:"📦", desc:"حركة المخزون وفروقات الجرد"},
              {title:"تقرير الأداء العام",          icon:"📊", desc:"ملخص شامل لجميع الموديولات"},
            ].map((r,i)=>(
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 hover:border-blue-200 hover:shadow-sm transition-all shadow-sm">
                <div className="text-2xl mb-3">{r.icon}</div>
                <p className="font-bold text-gray-800 text-sm">{r.title}</p>
                <p className="text-xs text-gray-400 mt-1 mb-3">{r.desc}</p>
                <div className="flex items-center gap-2">
                  <Btn size="sm"><Eye size={11}/> عرض</Btn>
                  <Btn size="sm"><Download size={11}/> تحميل</Btn>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── OWNER TAB — executive read-only destination ─── */}
      {tab==="owner" && (
        <div className="space-y-6">

          {/* Identity header — distinct visual, communicates ERP-only data provenance */}
          <div className="rounded-2xl overflow-hidden shadow-md" style={{background:"linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1e3a5f 100%)"}}>
            <div className="px-8 py-6 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                    <Eye size={18} className="text-white"/>
                  </div>
                  <div>
                    <p className="font-bold text-white text-lg leading-tight">التقرير المالي الموحد</p>
                    <p className="text-indigo-300 text-xs">رؤية المالك — المركز المالي المُعتمد</p>
                  </div>
                </div>
                <p className="text-indigo-200 text-xs leading-relaxed max-w-lg">
                  هذه الصفحة وجهة نهائية للمالك وتُعرض بيانات مُعتمدة نهائياً ومُرحَّلة في ERP حصراً.
                  لا تظهر هنا أي بيانات في طور المراجعة أو الاعتماد أو الانتظار.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-center">
                  <p className="text-indigo-200 text-[10px] font-semibold">الفترة المالية</p>
                  <p className="text-white font-bold text-sm">أكتوبر 2025</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] text-emerald-300 font-semibold">بيانات ERP مُعتمدة</span>
                </div>
              </div>
            </div>
            {/* Data provenance strip */}
            <div className="bg-black/20 border-t border-white/10 px-8 py-2.5 flex items-center gap-8 text-[11px] text-indigo-300">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>المصدر: ERP مُعتمد فقط</span>
              <span>·</span>
              <span>الأرقام غير المُعتمدة نهائياً مُستبعدة</span>
              <span>·</span>
              <span>لا توجد أزرار إجراءات في هذه الصفحة</span>
              <span>·</span>
              <span>{postedOps.length} بيان مُدرَج</span>
            </div>
          </div>

          {postedOps.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
              <div className="text-5xl mb-5">📊</div>
              <p className="font-bold text-gray-700 text-lg mb-2">لا توجد بيانات ERP مُعتمدة بعد</p>
              <p className="text-gray-400 text-sm mb-1">تظهر هنا البيانات بعد الاعتماد النهائي والترحيل لـ ERP فقط</p>
              <p className="text-gray-300 text-xs">الطبقة الداخلية (التبويب الأول) تُظهر جميع البيانات في مراحل المراجعة</p>
            </div>
          ) : (
            <>
              {/* Net position — the headline number for the owner */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">صافي المركز المالي</p>
                    <p className={`text-4xl font-black tabular-nums leading-none mb-2 ${netPosition>=0?"text-emerald-700":"text-red-700"}`}>
                      {netPosition>=0?"+":""}{(netPosition/1000).toFixed(1)}K
                      <span className="text-lg font-semibold text-gray-400 mr-1">ر.س</span>
                    </p>
                    <p className="text-xs text-gray-400">إيرادات − مصروفات − مشتريات</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                      <span>+ إيرادات</span><span className="font-mono font-bold text-emerald-700">{(salesPosted/1000).toFixed(1)}K</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                      <span>− مصروفات</span><span className="font-mono font-bold text-red-600">{(expPosted/1000).toFixed(1)}K</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span>− مشتريات</span><span className="font-mono font-bold text-orange-600">{(purPosted/1000).toFixed(1)}K</span>
                    </div>
                  </div>
                </div>

                {/* Category bar chart — visual financial breakdown */}
                <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">توزيع المبالغ المُعتمدة في ERP حسب الفئة</p>
                  <div className="space-y-3">
                    {ownerCategories.map((c,i)=>{
                      const octPct  = Math.round((c.amount/maxCatAmt)*100);
                      const septPct = Math.round((c.prev/maxCatAmt)*100);
                      const isUp    = c.pct !== null && c.pct > 0;
                      const isDown  = c.pct !== null && c.pct < 0;
                      const isFlat  = c.pct === 0;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-base flex-shrink-0 w-6 text-center">{c.icon}</span>
                          <span className="text-xs font-semibold text-gray-600 w-24 flex-shrink-0 text-right">{c.label}</span>
                          <div className="flex-1 space-y-1">
                            {/* Oct bar */}
                            <div className="bg-gray-100 rounded-full h-2.5">
                              <div className={`h-2.5 rounded-full ${c.color}`} style={{width:`${octPct}%`}}/>
                            </div>
                            {/* Sep comparison bar — lighter */}
                            {c.prev > 0 && (
                              <div className="bg-gray-100 rounded-full h-1.5 opacity-50">
                                <div className={`h-1.5 rounded-full ${c.color}`} style={{width:`${septPct}%`}}/>
                              </div>
                            )}
                          </div>
                          <span className={`text-xs font-mono font-extrabold tabular-nums w-20 text-left flex-shrink-0 ${c.textColor}`}>
                            {(c.amount/1000).toFixed(1)}K ر.س
                          </span>
                          {c.pct !== null && (
                            <span className={`text-[10px] font-bold w-10 text-left flex-shrink-0
                              ${isUp?"text-emerald-600":isDown?"text-red-600":"text-gray-400"}`}>
                              {isUp?"↑":isDown?"↓":"→"}
                              {isUp||isDown?`${Math.abs(c.pct)}%`:"—"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    <p className="text-[10px] text-gray-300 pt-1">الشريط العلوي: أكتوبر 2025 · الشريط السفلي: سبتمبر 2025 (للمقارنة)</p>
                  </div>
                </div>
              </div>

              {/* ─── Period comparison summary ─── */}
              {netPctChange !== null && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">مقارنة الفترة — أكتوبر مقابل سبتمبر 2025</h3>
                    <p className="text-xs text-gray-400 mt-0.5">مبنية على بيانات ERP المُعتمدة في كلا الفترتين · أرقام غير مُعتمدة مُستبعدة</p>
                  </div>
                  <div className="px-6 py-4 grid grid-cols-4 gap-4">
                    {[
                      { label:"صافي المركز المالي", oct:netPosition, sep:SEPT_NET, isIncome:true },
                      { label:"الإيرادات",           oct:salesPosted, sep:SEPT_BASELINE.sales||0, isIncome:true  },
                      { label:"المصروفات",           oct:expPosted,   sep:SEPT_BASELINE.expenses||0, isIncome:false },
                      { label:"المشتريات",           oct:purPosted,   sep:SEPT_BASELINE.purchases||0, isIncome:false },
                    ].map((row,i)=>{
                      const diff    = row.oct - row.sep;
                      const pct     = row.sep > 0 ? Math.round((diff/row.sep)*100) : null;
                      const isPos   = diff > 0;
                      const isNeg   = diff < 0;
                      const isGood  = row.isIncome ? isPos : isNeg;
                      return (
                        <div key={i} className="text-center">
                          <p className="text-[10px] font-semibold text-gray-400 mb-2">{row.label}</p>
                          <p className="text-lg font-black tabular-nums text-gray-900">{(row.oct/1000).toFixed(1)}K</p>
                          <p className="text-[10px] text-gray-400 mb-1">سبتمبر: {(row.sep/1000).toFixed(1)}K</p>
                          {pct !== null && (
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full
                              ${isGood?"bg-emerald-50 text-emerald-700 border border-emerald-100":isPos?"bg-red-50 text-red-700 border border-red-100":"bg-amber-50 text-amber-700 border border-amber-100"}`}>
                              {isPos?"↑":"↓"} {Math.abs(pct)}%
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─── Branch comparison ─── */}
              {branchRankings.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">ترتيب الفروع — حسب المبالغ المُعتمدة في ERP</h3>
                      <p className="text-xs text-gray-400 mt-0.5">بيانات ERP مُعتمدة فقط — فروع بدون ترحيل ERP غير مُدرجة</p>
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                      {branchRankings.length} فرع نشط
                    </span>
                  </div>
                  <div className="px-6 py-3 space-y-3">
                    {branchRankings.map(([branch,total],i)=>{
                      const maxBranch = branchRankings[0][1];
                      const pct = Math.round((total/maxBranch)*100);
                      const medalColors = ["text-yellow-500","text-gray-400","text-amber-600","text-gray-500","text-gray-500"];
                      const medals = ["🥇","🥈","🥉","④","⑤"];
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className={`text-sm flex-shrink-0 ${medalColors[i]}`}>{medals[i]}</span>
                          <span className="text-sm font-semibold text-gray-700 w-28 flex-shrink-0">{branch}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                            <div className="h-2.5 rounded-full bg-indigo-500" style={{width:`${pct}%`}}/>
                          </div>
                          <span className="font-mono font-extrabold text-xs text-indigo-700 tabular-nums w-24 text-left flex-shrink-0">
                            {fmtAmt(total)} ر.س
                          </span>
                          <span className="text-[10px] text-gray-400 w-8 text-left flex-shrink-0">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─── Executive commentary ─── */}
              {commentary.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">الملاحظات التنفيذية</h3>
                    <p className="text-xs text-gray-400 mt-0.5">مُشتقَّة تلقائياً من بيانات ERP المُعتمدة فقط · لا توجد بيانات تقديرية</p>
                  </div>
                  <div className="px-6 py-4 space-y-2.5">
                    {commentary.map((c,i)=>(
                      <div key={i} className="flex items-start gap-3">
                        <span className={`font-bold text-base flex-shrink-0 mt-0.5 ${c.color}`}>{c.icon}</span>
                        <p className={`text-sm font-semibold ${c.color}`}>{c.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ERP batch provenance log */}
              {batches.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">سجل دفعات ERP</h3>
                      <p className="text-xs text-gray-400 mt-0.5">مصدر البيانات المُعتمدة في هذا التقرير — كل دفعة قيد محاسبي مُغلق</p>
                    </div>
                    <Badge className="bg-indigo-50 text-indigo-600 border border-indigo-100 text-xs">🔒 مُغلق</Badge>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {batches.map((b,i)=>(
                      <div key={i} className="px-6 py-4 flex items-center gap-5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                          <ChevronsRight size={14} className="text-indigo-600"/>
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm text-gray-900 font-mono">{b.id}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{[...b.modules].join(" · ")}</p>
                        </div>
                        <p className="font-black text-gray-900 font-mono tabular-nums text-base">
                          {(b.total/1000).toFixed(1)}K
                          <span className="text-xs font-semibold text-gray-400 mr-0.5">ر.س</span>
                        </p>
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg">✓ مُعتمد</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Provenance footer */}
              <div className="flex items-center justify-center gap-4 py-3 text-[11px] text-gray-300 border-t border-gray-100">
                <span>جميع الأرقام من ERP المُعتمد حصراً</span>
                <span>·</span>
                <span>الأرقام الأولية أو غير المُجمَّعة غير مُدرجة</span>
                <span>·</span>
                <span>لا توجد إجراءات في هذه الصفحة</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SimplePage({ title, icon, desc }:{ title:string; icon:string; desc:string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="text-6xl mb-4">{icon}</div>
      <h2 className="text-xl font-bold text-gray-700 mb-2">{title}</h2>
      {desc && <p className="text-gray-400 text-sm">{desc}</p>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ACCOUNTANT PAGES
// ════════════════════════════════════════════════════════════

function AccDashboard({ navigate, setModal, setDetailId, ops, approveOp, rejectOp, bulkApprove }:PageProps) {
  const [filters, setFilters] = useState<Filters>({branch:"",status:"pending",match:"",search:""});

  const pending = ops.filter(o=>o.status==="pending");
  const approved = ops.filter(o=>o.status==="approved");
  const rejected = ops.filter(o=>o.status==="rejected");
  const approvalRate = ops.length>0 ? Math.round((approved.length+ops.filter(o=>o.status==="final-approved").length)/ops.length*100) : 0;

  const pendingByModule: Record<ModuleKey,number> = {} as any;
  pending.forEach(o=>{ pendingByModule[o.moduleKey]=(pendingByModule[o.moduleKey]||0)+1; });

  const modules = [
    { id:"acc-sales",     label:"المبيعات",         icon:"💰", color:"bg-emerald-500", key:"sales" as ModuleKey },
    { id:"acc-expenses",  label:"المصروفات",         icon:"💸", color:"bg-red-500",     key:"expenses" as ModuleKey },
    { id:"acc-purchases", label:"المشتريات",         icon:"🛒", color:"bg-blue-500",    key:"purchases" as ModuleKey },
    { id:"acc-inventory", label:"المخزون",           icon:"📦", color:"bg-amber-500",   key:"inventory" as ModuleKey },
    { id:"acc-waste",     label:"الهدر والتالف",    icon:"🗑️", color:"bg-rose-500",    key:null },
    { id:"acc-assets",    label:"الأصول الثابتة",   icon:"🏢", color:"bg-purple-500",  key:null },
    { id:"acc-shifts",    label:"إدارة الشفتات",    icon:"⏰", color:"bg-cyan-500",    key:"shifts" as ModuleKey },
    { id:"acc-employees", label:"كشف الموظفين",     icon:"👥", color:"bg-indigo-500",  key:"employees" as ModuleKey },
    { id:"acc-cash",      label:"العهد النقدية",     icon:"💼", color:"bg-orange-500",  key:"cash" as ModuleKey },
  ];

  const displayed = applyFilters(ops, filters);
  const pendingIds = pending.map(o=>o.id);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800 font-bold text-xl">ملخص اليوم — الاثنين 14 أكتوبر 2025</h2>
          <p className="text-gray-400 text-sm mt-0.5">الفروع المخصصة: 1–50 | الموديولات: التسعة</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="تنتظر مراجعتي" value={String(pending.length)} sub="📱 رُفعت من الفروع" icon={<Clock size={20} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label="وافقت عليها" value={String(approved.length)} sub="بانتظار الاعتماد النهائي" icon={<CheckCircle2 size={20} className="text-sky-600"/>} accent="blue"/>
        <KpiCard label="معتمدة نهائياً" value={String(ops.filter(o=>o.status==="final-approved").length)} sub="مُغلقة — تنتظر ERP أو مُرحَّلة" icon={<Lock size={20} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label="معدل الموافقة" value={`${approvalRate}%`} sub="هذا الشهر" icon={<TrendingUp size={20} className="text-purple-600"/>} accent="purple"/>
      </div>

      {/* Daily progress bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800 text-sm">🎯 تقدم اليوم</h3>
          <span className="text-xs text-gray-400">الهدف: مراجعة جميع العمليات المعلقة</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[
            {label:"المراجعة",done:ops.filter(o=>o.status!=="pending").length,total:ops.length,color:"bg-purple-500"},
            {label:"الموافقة",done:ops.filter(o=>o.status==="approved"||o.status==="final-approved").length,total:ops.length,color:"bg-emerald-500"},
            {label:"التوثيق",done:ops.filter(o=>o.status==="final-approved"&&o.erpPosted).length,total:ops.filter(o=>o.status==="final-approved").length||1,color:"bg-blue-500"},
            {label:"الفروع المكتملة",done:4,total:8,color:"bg-cyan-500"},
          ].map(({label,done,total,color})=>{
            const pct = Math.min(100,total>0?Math.round(done/total*100):0);
            return (
              <div key={label}>
                <div className="flex justify-between text-[11px] mb-1.5">
                  <span className="font-semibold text-gray-600">{label}</span>
                  <span className={`font-bold ${pct===100?"text-emerald-600":"text-gray-500"}`}>{done}/{total} {pct===100?"✅":""}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`h-2 rounded-full ${color} transition-all`} style={{width:`${pct}%`}}/>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5 text-left">{pct}%</p>
              </div>
            );
          })}
        </div>
      </div>

      <PipelineOverview ops={ops} navigate={navigate}/>

      <ExceptionPanel ops={ops} forRole="accountant" navigate={navigate}/>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2">
          <Card title="الموديولات التسعة" actions={<span className="text-xs text-gray-400">المعلق / الإجمالي</span>}>
            <div className="p-4 grid grid-cols-4 gap-3">
              {modules.map(m=>{
                const mod_pending = m.key ? (pendingByModule[m.key]||0) : 0;
                const mod_total = m.key ? ops.filter(o=>o.moduleKey===m.key).length : 0;
                return (
                  <button key={m.id} onClick={()=>navigate(m.id)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-100 hover:border-purple-300 hover:bg-purple-50/40 transition-all relative cursor-pointer">
                    {mod_pending>0 && <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-red-500"></span>}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg text-white ${m.color}`}>{m.icon}</div>
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">{m.label}</span>
                    <div className="flex items-center gap-1">
                      {mod_pending>0 && <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{mod_pending}</span>}
                      {mod_total>0 && <><span className="text-gray-300 text-[10px]">/</span><span className="text-gray-500 text-[10px]">{mod_total}</span></>}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
        <div>
          <Card title="فلاتر البحث">
            <div className="p-4 space-y-3">
              {[
                { label:"🏪 الفرع", key:"branch" as const, opts:["الكل", ...BRANCHES] },
                { label:"🔄 الحالة", key:"status" as const, opts:["الكل","pending","approved","rejected","final-approved"] },
              ].map(f=>(
                <div key={f.key}>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">{f.label}</label>
                  <select value={filters[f.key]} onChange={e=>setFilters(p=>({...p,[f.key]:e.target.value==="الكل"?"":e.target.value}))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600">
                    {f.opts.map(o=><option key={o} value={o==="الكل"?"":o}>{STATUS_CFG[o as OpStatus]?.label||o}</option>)}
                  </select>
                </div>
              ))}
              <div className="flex items-center gap-2 mt-1">
                <Search size={13} className="text-gray-400 flex-shrink-0"/>
                <input value={filters.search} onChange={e=>setFilters(p=>({...p,search:e.target.value}))} placeholder="بحث..." className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600"/>
              </div>
              {(filters.branch||filters.status!=="pending"||filters.match||filters.search) &&
                <button onClick={()=>setFilters({branch:"",status:"pending",match:"",search:""})} className="text-xs text-purple-600 hover:underline flex items-center gap-1"><RotateCcw size={11}/> مسح الفلاتر</button>
              }
            </div>
          </Card>
        </div>
      </div>

      <Card title="قائمة العمليات" actions={
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{displayed.length} عملية</span>
          {pendingIds.length>0 && <Btn size="sm" variant="success" onClick={()=>bulkApprove(pendingIds)}>✓ موافقة جماعية ({pendingIds.length})</Btn>}
        </div>
      }>
        {displayed.length===0
          ? <EmptyState icon="✅" title="لا توجد عمليات" desc="تم معالجة جميع العمليات أو لا تطابق الفلاتر المحددة"/>
          : displayed.slice(0,8).map(op=>(
              <OpRow key={op.id} op={op}
                onView={()=>{ setDetailId(op.id); navigate("acc-sales-detail"); }}
                onApprove={()=>approveOp(op.id)}
                onReject={()=>{ setDetailId(op.id); setModal("reject"); }}/>
            ))
        }
        {displayed.length>8 && (
          <div className="px-5 py-3 text-center">
            <button onClick={()=>navigate("acc-sales")} className="text-xs text-purple-600 hover:underline">عرض كل {displayed.length} عملية</button>
          </div>
        )}
      </Card>
    </div>
  );
}

function AccModulePage({ moduleKey, title, navigate, setModal, setDetailId, ops, approveOp, rejectOp, bulkApprove }:PageProps&{moduleKey:ModuleKey;title:string}) {
  const [filters, setFilters] = useState<Filters>({branch:"",status:"",match:"",search:""});
  const mOps    = ops.filter(o=>o.moduleKey===moduleKey);
  const filtered = applyFilters(ops, filters, moduleKey);
  const pending  = mOps.filter(o=>o.status==="pending");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">موديول {title}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{pending.length} بيان معلق بانتظار مراجعتك</p>
        </div>
        <div className="flex gap-2">
          {pending.length>0 && <Btn variant="success" size="sm" onClick={()=>bulkApprove(pending.map(o=>o.id))}>✓ موافقة على الكل ({pending.length})</Btn>}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="إجمالي البيانات المرفوعة" value={String(mOps.length)} sub="كل الحالات" icon={<FileText size={18} className="text-purple-600"/>} accent="purple"/>
        <KpiCard label="قيد المراجعة" value={String(pending.length)} sub="رُفعت من الفروع" icon={<Clock size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label="تمت الموافقة" value={String(mOps.filter(o=>o.status==="approved").length)} sub="بانتظار الاعتماد النهائي" icon={<CheckCircle2 size={18} className="text-sky-600"/>} accent="blue"/>
        <KpiCard label="مرفوضة" value={String(mOps.filter(o=>o.status==="rejected").length)} sub="تحتاج إعادة رفع من الفرع" icon={<XCircle size={18} className="text-red-600"/>} accent="red"/>
      </div>

      <FilterBar filters={filters} onChange={setFilters} branches={BRANCHES}/>

      <Card title={`عمليات ${title}`}>
        {filtered.length===0
          ? <EmptyState icon="✅" title="لا توجد عمليات" desc="لا توجد عمليات تطابق الفلاتر المحددة"/>
          : filtered.map(op=>(
              <OpRow key={op.id} op={op}
                onView={()=>{ setDetailId(op.id); navigate("acc-sales-detail"); }}
                onApprove={()=>approveOp(op.id)}
                onReject={()=>{ setDetailId(op.id); setModal("reject"); }}/>
            ))
        }
      </Card>
    </div>
  );
}

// ─── Dedicated Sales page ────────────────────────────────────────────────────
function AccSalesPage({ navigate, setModal, setDetailId, ops, approveOp, rejectOp, bulkApprove }:PageProps) {
  const [filters,      setFilters]      = useState<Filters>({branch:"",status:"",match:"",search:""});
  const [brand,        setBrand]        = useState("");
  const [selectedDay,  setSelectedDay]  = useState("الكل");

  // Simulated day options (current week + quick picks)
  const DAY_OPTIONS = [
    { label:"الكل",              val:"الكل",    ops:8, done:5 },
    { label:"اليوم",             val:"today",   ops:3, done:1 },
    { label:"أمس (14 أكت)",     val:"d14",     ops:4, done:4 },
    { label:"13 أكت (الإثنين)", val:"d13",     ops:2, done:2 },
    { label:"12 أكت (الأحد)",   val:"d12",     ops:3, done:1 },
    { label:"11 أكت (السبت)",   val:"d11",     ops:1, done:0 },
    { label:"10 أكت (الجمعة)",  val:"d10",     ops:2, done:2 },
    { label:"الأسبوع الماضي",   val:"lastWeek",ops:14,done:12},
    { label:"الشهر الماضي",     val:"lastMonth",ops:48,done:40},
  ];

  const mOps    = ops.filter(o=>o.moduleKey==="sales");
  const pending  = mOps.filter(o=>o.status==="pending");
  const filtered = applyFilters(ops, filters, "sales");
  const selectedDayInfo = DAY_OPTIONS.find(d=>d.val===selectedDay);

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">موديول المبيعات</h2>
          <p className="text-gray-400 text-sm mt-0.5">{pending.length} بيان معلق بانتظار مراجعتك</p>
        </div>
        {pending.length>0 && <Btn variant="success" size="sm" onClick={()=>bulkApprove(pending.map(o=>o.id))}>✓ موافقة على الكل ({pending.length})</Btn>}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="إجمالي البيانات المرفوعة" value={String(mOps.length)} sub="كل الحالات" icon={<FileText size={18} className="text-purple-600"/>} accent="purple"/>
        <KpiCard label="قيد المراجعة" value={String(pending.length)} sub="رُفعت من الفروع" icon={<Clock size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label="تمت الموافقة" value={String(mOps.filter(o=>o.status==="approved"||o.status==="final-approved").length)} sub="موافق + معتمد نهائياً" icon={<CheckCircle2 size={18} className="text-sky-600"/>} accent="blue"/>
        <KpiCard label="مرفوضة" value={String(mOps.filter(o=>o.status==="rejected").length)} sub="تحتاج إعادة رفع" icon={<XCircle size={18} className="text-red-600"/>} accent="red"/>
      </div>

      {/* Filter bar — branch, status, brand, date quick-select */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4" dir="rtl">
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">الفرع</label>
            <select value={filters.branch} onChange={e=>setFilters(p=>({...p,branch:e.target.value==="الكل"?"":e.target.value}))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {["الكل",...BRANCHES].map(b=><option key={b} value={b==="الكل"?"":b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">الحالة</label>
            <select value={filters.status} onChange={e=>setFilters(p=>({...p,status:e.target.value==="الكل"?"":e.target.value}))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {["الكل","pending","approved","rejected","final-approved"].map(s=><option key={s} value={s==="الكل"?"":s}>{STATUS_CFG[s as OpStatus]?.label||s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">العلامة التجارية</label>
            <select value={brand} onChange={e=>setBrand(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {["الكل","برغر خليفة","بيتزا باكو","وسطاوي"].map(b=><option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">التاريخ / الفترة</label>
            <select value={selectedDay} onChange={e=>setSelectedDay(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {DAY_OPTIONS.map(d=><option key={d.val} value={d.val}>{d.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">بحث / مرجعي</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Search size={13} className="text-gray-400"/>
              <input value={filters.search} onChange={e=>setFilters(p=>({...p,search:e.target.value}))} placeholder="بحث..." className="flex-1 text-sm outline-none bg-transparent"/>
            </div>
          </div>
          <div className="flex items-end">
            {(filters.branch||filters.status||filters.search||selectedDay!=="الكل"||brand!=="الكل"&&brand) && (
              <button onClick={()=>{ setFilters({branch:"",status:"",match:"",search:""}); setBrand(""); setSelectedDay("الكل"); }}
                className="text-xs text-purple-600 hover:underline flex items-center gap-1 pb-2"><RotateCcw size={11}/> مسح الفلاتر</button>
            )}
          </div>
        </div>
      </div>

      {/* Day-level operations summary — shows ops / completed per selected day */}
      {selectedDay!=="الكل" && selectedDayInfo && (
        <div className={`rounded-xl border p-4 flex items-center gap-4 ${selectedDayInfo.ops>selectedDayInfo.done?"bg-amber-50 border-amber-200":"bg-emerald-50 border-emerald-200"}`} dir="rtl">
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-800">{selectedDayInfo.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {selectedDayInfo.ops} عملية مطلوبة — {selectedDayInfo.done} مكتملة
              {selectedDayInfo.ops>selectedDayInfo.done && <span className="text-amber-700 font-semibold"> · {selectedDayInfo.ops-selectedDayInfo.done} ناقصة</span>}
            </p>
          </div>
          <div className="flex gap-6 text-center">
            <div><p className="text-lg font-black text-gray-800">{selectedDayInfo.ops}</p><p className="text-[10px] text-gray-500">إجمالي</p></div>
            <div><p className="text-lg font-black text-emerald-600">{selectedDayInfo.done}</p><p className="text-[10px] text-gray-500">مكتملة</p></div>
            <div><p className={`text-lg font-black ${selectedDayInfo.ops-selectedDayInfo.done>0?"text-amber-600":"text-gray-300"}`}>{selectedDayInfo.ops-selectedDayInfo.done}</p><p className="text-[10px] text-gray-500">ناقص</p></div>
          </div>
        </div>
      )}

      {/* Operations list */}
      <Card title="بيانات المبيعات" actions={
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{filtered.length} بيان</span>
          <button onClick={()=>alert("جارٍ تصدير بيانات المبيعات إلى Excel...")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-all">
            <FileText size={11}/> Excel
          </button>
          {pending.length>0 && <Btn size="sm" variant="success" onClick={()=>bulkApprove(pending.map(o=>o.id))}>✓ موافقة جماعية</Btn>}
        </div>
      }>
        {filtered.length===0
          ? <EmptyState icon="✅" title="لا توجد بيانات" desc="لا توجد بيانات تطابق الفلاتر المحددة"/>
          : filtered.map(op=>(
              <OpRow key={op.id} op={op}
                onView={()=>{ setDetailId(op.id); navigate("acc-sales-detail"); }}
                onApprove={()=>approveOp(op.id)}
                onReject={()=>{ setDetailId(op.id); setModal("reject"); }}/>
            ))
        }
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// ASSET DRAFT PROVIDER
// ─────────────────────────────────────────────
function AssetDraftProvider({ children }: { children: ReactNode }) {
  const [drafts, setDrafts] = useState<AssetDraft[]>([]);
  const navRef = useRef<(()=>void)|undefined>(undefined);

  const addDraft     = (d: AssetDraft) => setDrafts(p=>[...p.filter(x=>x.draftId!==d.draftId), d]);
  const discardDraft = (id: string)    => setDrafts(p=>p.filter(x=>x.draftId!==id));
  const confirmDraft = (id: string)    => setDrafts(p=>p.map(x=>x.draftId===id?{...x,status:"confirmed" as const}:x));
  const getConvertedInvNums = () => new Set(drafts.filter(d=>d.status==="draft"||d.status==="confirmed").map(d=>d.invNum));
  const setNavigateToAssets = (fn: ()=>void) => { navRef.current = fn; };

  return (
    <AssetDraftContext.Provider value={{ drafts, addDraft, discardDraft, confirmDraft, getConvertedInvNums, navigateToAssets: navRef.current, setNavigateToAssets }}>
      {children}
    </AssetDraftContext.Provider>
  );
}

// ─────────────────────────────────────────────
// CONVERT TO ASSET MODAL
// ─────────────────────────────────────────────
const ALL_BRANCHES_FULL = [
  "فرع الرياض - العليا","فرع الرياض - السليمانية","فرع الرياض - النزهة",
  "فرع جدة - الحمراء","فرع جدة - العزيزية",
  "فرع مكة - المعابدة","فرع مكة - العزيزية",
  "فرع الدمام - الخبر","فرع الدمام - الكورنيش","فرع الدمام - الدانة",
  "فرع الطائف - المحطة",
];
const ASSET_CATS: AssetCatType[] = ["معدات","تقنية","أثاث","مركبات","أخرى"];
const USEFUL_LIFE_OPTS = [
  {label:"24 شهر (سنتان)",val:24},{label:"36 شهر (3 سنوات)",val:36},
  {label:"48 شهر (4 سنوات)",val:48},{label:"60 شهر (5 سنوات)",val:60},
  {label:"72 شهر (6 سنوات)",val:72},{label:"84 شهر (7 سنوات)",val:84},
  {label:"96 شهر (8 سنوات)",val:96},{label:"120 شهر (10 سنوات)",val:120},
];

function ConvertToAssetModal({
  expenseOpId, invNum, vendor, desc, amount, branch, date,
  onClose, onSuccess,
}: {
  expenseOpId:string; invNum:string; vendor:string; desc:string;
  amount:number; branch:string; date:string;
  onClose:()=>void; onSuccess:(draftId:string)=>void;
}) {
  const { addDraft } = useContext(AssetDraftContext);
  const [step, setStep] = useState<1|2|3>(1);
  const [assetName,   setAssetName]   = useState(vendor || desc);
  const [cat,         setCat]         = useState<AssetCatType>("معدات");
  const [usefulLife,  setUsefulLife]  = useState(60);
  const [custodian,   setCustodian]   = useState("مدير الفرع");
  const [qty,         setQty]         = useState(1);
  const [notes,       setNotes]       = useState("");
  const [targetBranches, setTargetBranches] = useState<string[]>([branch]);
  const [confirmed,   setConfirmed]   = useState(false);

  const toggleBranch = (b:string) => setTargetBranches(p=>p.includes(b)?p.filter(x=>x!==b):[...p,b]);
  const canProceed   = assetName.trim().length>0 && targetBranches.length>0 && custodian.trim().length>0;

  const handleConfirm = () => {
    const draftId = `DRAFT-${invNum}-${Date.now()}`;
    addDraft({
      draftId, expenseOpId, invNum, vendor, desc,
      amount, expenseBranch: branch, expenseDate: date,
      assetName: assetName.trim(), cat, usefulLife,
      targetBranches, custodian, qty, notes,
      convertedAt: new Date().toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"}),
      status: "draft",
    });
    setConfirmed(true);
    setStep(3);
    setTimeout(()=>{ onSuccess(draftId); }, 1500);
  };

  const CAT_ICONS:Record<AssetCatType,string> = {معدات:"🔧",تقنية:"💻",أثاث:"🪑",مركبات:"🚗",أخرى:"📦"};

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose} dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-l from-purple-700 to-indigo-700 text-white flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              <GitMerge size={16}/> تحويل مصروف إلى أصل ثابت
            </h3>
            <p className="text-purple-200 text-xs mt-0.5">الفاتورة {invNum} · {vendor}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              {([1,2,3] as const).map((s,i)=>(
                <div key={s} className="flex items-center gap-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all ${step>=s?"bg-white text-purple-700 border-white":"bg-transparent text-purple-300 border-purple-400"}`}>{s}</div>
                  {i<2 && <div className={`w-5 h-0.5 ${step>s?"bg-white":"bg-purple-400/50"}`}/>}
                </div>
              ))}
            </div>
            <button onClick={onClose} className="text-purple-200 hover:text-white"><X size={18}/></button>
          </div>
        </div>

        {/* Step labels */}
        <div className="flex border-b border-gray-100 bg-gray-50/60 flex-shrink-0">
          {[{n:1,l:"بيانات الأصل"},{n:2,l:"الفروع والعهدة"},{n:3,l:"تم الإنشاء"}].map(s=>(
            <div key={s.n} className={`flex-1 py-2.5 text-center text-xs font-semibold transition-colors ${step===s.n?"text-purple-700 border-b-2 border-purple-600":"text-gray-400"}`}>{s.l}</div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── STEP 1: Asset Details ── */}
          {step===1 && (
            <div className="p-6 space-y-5">
              {/* Expense source chip */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0"><Wallet size={16} className="text-amber-600"/></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-amber-800">مصدر المصروف</p>
                  <p className="text-xs text-amber-700 mt-0.5 truncate">{invNum} · {vendor} · <span className="font-mono font-bold">{fmtAmt(amount)} ر.س</span> · {branch}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-amber-600">يُحول المبلغ تلقائياً</p>
                  <p className="text-xs font-bold text-amber-800 font-mono">{fmtAmt(amount)} ر.س</p>
                </div>
              </div>

              {/* Asset name */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">اسم الأصل <span className="text-red-500">*</span></label>
                <input value={assetName} onChange={e=>setAssetName(e.target.value)}
                  placeholder="مثال: ثلاجة صناعية سامسونج — فرع الرياض"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-purple-400 outline-none"/>
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">فئة الأصل <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-5 gap-2">
                  {ASSET_CATS.map(c=>(
                    <button key={c} onClick={()=>setCat(c)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-semibold ${cat===c?"border-purple-500 bg-purple-50 text-purple-700":"border-gray-200 bg-white text-gray-600 hover:border-purple-200"}`}>
                      <span className="text-xl">{CAT_ICONS[c]}</span>{c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Useful life */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">العمر الإنتاجي</label>
                <select value={usefulLife} onChange={e=>setUsefulLife(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-purple-400 outline-none">
                  {USEFUL_LIFE_OPTS.map(o=><option key={o.val} value={o.val}>{o.label}</option>)}
                </select>
              </div>

              {/* Qty */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">الكمية (عدد الوحدات)</label>
                <div className="flex items-center gap-2">
                  <button onClick={()=>setQty(q=>Math.max(1,q-1))} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-lg font-bold">−</button>
                  <span className="w-14 text-center font-bold text-lg text-gray-800">{qty}</span>
                  <button onClick={()=>setQty(q=>q+1)} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-lg font-bold">+</button>
                  <span className="text-xs text-gray-500 mr-2">وحدة — سعر الوحدة: <span className="font-mono font-bold">{fmtAmt(Math.round(amount/qty))} ر.س</span></span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">ملاحظات إضافية</label>
                <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2}
                  placeholder="أي ملاحظات على الأصل (اختياري)..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-purple-400 outline-none resize-none"/>
              </div>
            </div>
          )}

          {/* ── STEP 2: Branches & Custodian ── */}
          {step===2 && (
            <div className="p-6 space-y-5">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                  الفروع المستفيدة <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal mr-2">— يمكن اختيار فرع واحد أو أكثر</span>
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {ALL_BRANCHES_FULL.map(b=>(
                    <button key={b} onClick={()=>toggleBranch(b)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-xs text-right ${targetBranches.includes(b)?"border-purple-500 bg-purple-50 text-purple-700":"border-gray-200 bg-white text-gray-600 hover:border-purple-200"}`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${targetBranches.includes(b)?"bg-purple-500 border-purple-500":"border-gray-300"}`}>
                        {targetBranches.includes(b) && <Check size={10} className="text-white"/>}
                      </div>
                      <span className="font-semibold truncate">{b}</span>
                    </button>
                  ))}
                </div>
                {targetBranches.length>0 && (
                  <p className="text-[11px] text-purple-600 mt-2 font-semibold">
                    ✓ {targetBranches.length} فرع محدد · سيُضاف {qty * targetBranches.length} أصل إجمالاً
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">المسؤول عن العهدة <span className="text-red-500">*</span></label>
                <input value={custodian} onChange={e=>setCustodian(e.target.value)}
                  placeholder="اسم المسؤول عن الأصل (مدير الفرع، مشرف الشفت...)"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-purple-400 outline-none"/>
              </div>

              {/* Summary card */}
              {canProceed && (
                <div className="bg-gradient-to-l from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-purple-800 flex items-center gap-1.5"><Layers size={12}/> ملخص ما سيُضاف في موديول الأصول الثابتة</p>
                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-xs">
                    <div><span className="text-gray-500">الأصل:</span> <span className="font-semibold text-gray-800">{assetName}</span></div>
                    <div><span className="text-gray-500">الفئة:</span> <span className="font-semibold text-gray-800">{CAT_ICONS[cat]} {cat}</span></div>
                    <div><span className="text-gray-500">الكمية:</span> <span className="font-semibold text-gray-800">{qty} وحدة × {targetBranches.length} فرع</span></div>
                    <div><span className="text-gray-500">العمر الإنتاجي:</span> <span className="font-semibold text-gray-800">{usefulLife} شهر</span></div>
                    <div><span className="text-gray-500">القيمة للوحدة:</span> <span className="font-mono font-bold text-purple-700">{fmtAmt(Math.round(amount/qty))} ر.س</span></div>
                    <div><span className="text-gray-500">المسؤول:</span> <span className="font-semibold text-gray-800">{custodian}</span></div>
                  </div>
                  <p className="text-[10px] text-purple-600">سيظهر هذا الأصل كـ "مسودة" في موديول الأصول الثابتة لمراجعتك النهائية</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Success ── */}
          {step===3 && (
            <div className="p-8 flex flex-col items-center gap-5 text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 size={40} className="text-emerald-500"/>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 text-lg">تم إنشاء المسودة بنجاح</h4>
                <p className="text-gray-500 text-sm mt-1">
                  تم تحويل <span className="font-semibold text-purple-700">{invNum}</span> إلى مسودة أصل ثابت
                </p>
                <p className="text-xs text-gray-400 mt-1">انتقل إلى موديول الأصول الثابتة لمراجعتها وتأكيدها</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {targetBranches.map(b=>(
                  <span key={b} className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full font-semibold">{b}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between flex-shrink-0">
          <Btn size="sm" onClick={onClose}><X size={12}/> إغلاق</Btn>
          <div className="flex gap-2">
            {step===1 && (
              <button onClick={()=>setStep(2)} disabled={!assetName.trim()}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${!assetName.trim()?"bg-gray-100 text-gray-400 cursor-not-allowed":"bg-purple-600 text-white hover:bg-purple-700 shadow-sm"}`}>
                التالي: الفروع والعهدة <ChevronLeft size={13}/>
              </button>
            )}
            {step===2 && (
              <>
                <Btn onClick={()=>setStep(1)}><ChevronRight size={13}/> رجوع</Btn>
                <button onClick={handleConfirm} disabled={!canProceed || confirmed}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${(!canProceed||confirmed)?"bg-gray-100 text-gray-400 cursor-not-allowed":"bg-purple-600 text-white hover:bg-purple-700 shadow-sm"}`}>
                  <GitMerge size={13}/> تأكيد التحويل للمسودة
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AccExpensesPage({ navigate, setModal, setDetailId, ops, approveOp, rejectOp, bulkApprove }:PageProps) {
  const { getConvertedInvNums, drafts } = useContext(AssetDraftContext);
  const [filters,          setFilters]          = useState<Filters>({branch:"",status:"",match:"",search:""});
  const [expandedId,       setExpandedId]       = useState<string|null>(null);
  const [editingRow,       setEditingRow]       = useState<string|null>(null);
  const [brand,            setBrand]            = useState("");
  const [selectedDay,      setSelectedDay]      = useState("الكل");
  const [verifiedInvoices, setVerifiedInvoices] = useState<Record<string,boolean>>({});
  const [attachModal,      setAttachModal]      = useState<{opId:string; invNum:string; idx:number; total:number}|null>(null);
  const [convertModal,     setConvertModal]     = useState<{opId:string; invNum:string; vendor:string; desc:string; amount:number; branch:string; date:string}|null>(null);
  const convertedInvNums = getConvertedInvNums();

  const EXP_DAY_OPTIONS = [
    { label:"الكل",             val:"الكل"     },
    { label:"اليوم",            val:"today"    },
    { label:"أمس (14 أكت)",    val:"d14"      },
    { label:"13 أكت",          val:"d13"      },
    { label:"12 أكت",          val:"d12"      },
    { label:"11 أكت",          val:"d11"      },
    { label:"الأسبوع الماضي",  val:"lastWeek" },
    { label:"الشهر الماضي",    val:"lastMonth"},
  ];

  const mOps    = ops.filter(o=>o.moduleKey==="expenses");
  const filtered = applyFilters(ops, filters, "expenses");
  const pending  = mOps.filter(o=>o.status==="pending");

  const toggleInvoiceVerify = (key:string) => setVerifiedInvoices(p=>({...p,[key]:!p[key]}));

  // Simulated batch invoices for each operation
  const INVOICES: Record<string, {invNum:string; vendor:string; desc:string; amount:number; date:string; attachCount:number}[]> = {
    default: [
      {invNum:"INV-001", vendor:"شركة الخليج للمواد",   desc:"مواد تنظيف وصيانة",   amount:850,  date:"12 أكت", attachCount:2},
      {invNum:"INV-002", vendor:"مستلزمات المطبخ",       desc:"أدوات خدمة وتغليف",  amount:420,  date:"12 أكت", attachCount:1},
      {invNum:"INV-003", vendor:"خدمات الصيانة السريعة", desc:"إصلاح معدات المطبخ", amount:1200, date:"13 أكت", attachCount:3},
    ],
  };
  // Simulated attachment images (represented as colored placeholder tiles)
  const ATTACH_LABELS = ["صورة الفاتورة الأمامية","صورة الباركود","صورة الختم والتوقيع","صورة المبلغ والإجمالي"];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">موديول المصروفات</h2>
          <p className="text-gray-400 text-sm mt-0.5">{pending.length} بيان معلق — قد يحتوي كل بيان على فواتير متعددة</p>
        </div>
        {pending.length>0 && <Btn variant="success" size="sm" onClick={()=>bulkApprove(pending.map(o=>o.id))}>✓ موافقة على الكل ({pending.length})</Btn>}
      </div>

      {/* KpiCards — operational counts */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="إجمالي البيانات المرفوعة" value={String(mOps.length)} sub="كل الحالات" icon={<FileText size={18} className="text-purple-600"/>} accent="purple"/>
        <KpiCard label="قيد المراجعة" value={String(pending.length)} sub="رُفعت من الفروع" icon={<Clock size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label="تمت الموافقة" value={String(mOps.filter(o=>o.status==="approved"||o.status==="final-approved").length)} sub="موافق + معتمد نهائياً" icon={<CheckCircle2 size={18} className="text-sky-600"/>} accent="blue"/>
        <KpiCard label="مرفوضة" value={String(mOps.filter(o=>o.status==="rejected").length)} sub="تحتاج إعادة رفع" icon={<XCircle size={18} className="text-red-600"/>} accent="red"/>
      </div>

      {/* Filter bar — branch, status, brand, date quick-select */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4" dir="rtl">
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">الفرع</label>
            <select value={filters.branch} onChange={e=>setFilters(p=>({...p,branch:e.target.value==="الكل"?"":e.target.value}))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {["الكل",...BRANCHES].map(b=><option key={b} value={b==="الكل"?"":b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">الحالة</label>
            <select value={filters.status} onChange={e=>setFilters(p=>({...p,status:e.target.value==="الكل"?"":e.target.value}))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {["الكل","pending","approved","rejected","final-approved"].map(s=><option key={s} value={s==="الكل"?"":s}>{STATUS_CFG[s as OpStatus]?.label||s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">العلامة التجارية</label>
            <select value={brand} onChange={e=>setBrand(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {["الكل","برغر خليفة","بيتزا باكو","وسطاوي"].map(b=><option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">التاريخ / الفترة</label>
            <select value={selectedDay} onChange={e=>setSelectedDay(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {EXP_DAY_OPTIONS.map(d=><option key={d.val} value={d.val}>{d.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">بحث / رقم الفاتورة</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Search size={13} className="text-gray-400"/>
              <input value={filters.search} onChange={e=>setFilters(p=>({...p,search:e.target.value}))} placeholder="رقم الفاتورة أو اسم المورد..." className="flex-1 text-sm outline-none bg-transparent"/>
            </div>
          </div>
          <div className="flex items-end">
            {(filters.branch||filters.status||filters.search||selectedDay!=="الكل"||brand!=="الكل"&&brand) && (
              <button onClick={()=>{ setFilters({branch:"",status:"",match:"",search:""}); setBrand(""); setSelectedDay("الكل"); }}
                className="text-xs text-purple-600 hover:underline flex items-center gap-1 pb-2"><RotateCcw size={11}/> مسح الفلاتر</button>
            )}
          </div>
        </div>
      </div>

      {/* Expenses list with batch invoice expansion */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">بيانات المصروفات</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{filtered.length} بيان</span>
            <button onClick={()=>alert("جارٍ تصدير بيانات المصروفات إلى Excel...")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-all">
              <FileText size={11}/> Excel
            </button>
          </div>
        </div>
        {filtered.length===0
          ? <EmptyState icon="✅" title="لا توجد بيانات" desc="لا توجد بيانات تطابق الفلاتر المحددة"/>
          : filtered.map(op=>{
              const invoices = INVOICES[op.id] || INVOICES["default"];
              const isExpanded = expandedId===op.id;
              const isLocked = op.status==="final-approved";
              return (
                <div key={op.id} className="border-b border-gray-100 last:border-0">
                  {/* Row header */}
                  <div className={`px-5 py-4 flex items-center gap-4 hover:bg-gray-50/70 ${isExpanded?"bg-purple-50/20":""}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-800 text-sm">{op.branch}</span>
                        <span className="text-gray-300">·</span>
                        <span className="font-mono text-xs text-purple-600">{op.id}</span>
                        <Badge className="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px]">{invoices.length} فاتورة</Badge>
                        <Badge className={STATUS_CFG[op.status].cls}>{STATUS_CFG[op.status].label}</Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">أُرسل {op.timeAgo}</p>
                    </div>
                    <div className="flex gap-2">
                      <Btn size="sm" onClick={()=>setExpandedId(isExpanded?null:op.id)}>
                        {isExpanded?<ChevronUp size={12}/>:<ChevronDown size={12}/>} الفواتير
                      </Btn>
                      {op.status==="pending" && <>
                        <Btn size="sm" variant="success" onClick={()=>approveOp(op.id)}><ThumbsUp size={12}/></Btn>
                        <Btn size="sm" variant="danger" onClick={()=>{ setDetailId(op.id); setModal("reject"); }}><ThumbsDown size={12}/></Btn>
                      </>}
                    </div>
                  </div>

                  {/* Batch invoice detail */}
                  {isExpanded && (
                    <div className="px-5 pb-4 bg-gray-50/40">
                      <div className="mt-2 mb-2 flex items-center gap-2">
                        <p className="text-xs font-bold text-gray-600">تفاصيل الفواتير المضمنة في هذا البيان:</p>
                        {!isLocked && <button onClick={()=>setEditingRow(editingRow?null:op.id)} className="text-[10px] text-purple-600 hover:underline flex items-center gap-1"><Edit3 size={10}/> {editingRow===op.id?"إيقاف التعديل":"تفعيل التعديل"}</button>}
                      </div>
                      {/* Edit mode: show VAT-aware fields */}
                      {editingRow===op.id && (
                        <div className="mb-3 p-3 bg-purple-50 border border-purple-100 rounded-xl">
                          <p className="text-[11px] font-bold text-purple-700 mb-2 flex items-center gap-1.5"><Edit3 size={11}/> وضع التعديل — عدِّل بيانات الفاتورة والضريبة</p>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            {[
                              {label:"رقم فاتورة المورد", placeholder:"INV-XXXX", mono:true},
                              {label:"اسم المورد",         placeholder:"اسم المورد"},
                              {label:"البيان / الوصف",    placeholder:"وصف المصروف"},
                              {label:"التاريخ",            placeholder:"DD/MM/YYYY"},
                              {label:"الرقم الضريبي للمورد",placeholder:"رقم ضريبي 15 خانة", mono:true},
                            ].map((f,fi)=>(
                              <div key={fi} className={fi===4?"col-span-2":""}>
                                <label className="text-[10px] font-semibold text-gray-500 block mb-1">{f.label}</label>
                                <input placeholder={f.placeholder}
                                  className={`w-full text-sm border border-purple-200 rounded-lg px-3 py-1.5 bg-white focus:border-purple-400 outline-none ${f.mono?"font-mono":""}`}
                                  dir={f.mono?"ltr":"rtl"}/>
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-3 gap-3 mt-2 text-xs">
                            {[
                              {label:"المبلغ قبل الضريبة", cls:"text-gray-800"},
                              {label:"ضريبة القيمة المضافة (15%)", cls:"text-amber-700"},
                              {label:"المبلغ بعد الضريبة", cls:"text-emerald-700 font-bold"},
                            ].map((f,fi)=>(
                              <div key={fi} className={`bg-white rounded-xl border ${fi===2?"border-emerald-200":"border-purple-200"} p-2.5`}>
                                <label className={`text-[10px] font-semibold block mb-1 ${f.cls}`}>{f.label}</label>
                                <input placeholder="0.00" type="number"
                                  className={`w-full text-sm border-0 outline-none font-mono bg-transparent ${f.cls}`}/>
                                <span className="text-[10px] text-gray-400">ر.س</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 flex gap-2">
                            <Btn size="sm" variant="success"><CheckCircle2 size={11}/> حفظ التعديلات</Btn>
                            <Btn size="sm" onClick={()=>setEditingRow(null)}>إلغاء</Btn>
                          </div>
                        </div>
                      )}
                      <table className="w-full border border-gray-100 rounded-xl overflow-hidden text-xs" dir="rtl">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-right">رقم الفاتورة</th>
                            <th className="px-3 py-2 text-right">المورد</th>
                            <th className="px-3 py-2 text-right">البيان</th>
                            <th className="px-3 py-2 text-center">التاريخ</th>
                            <th className="px-3 py-2 text-center">قبل الضريبة</th>
                            <th className="px-3 py-2 text-center bg-amber-50/60 text-amber-700">الضريبة 15%</th>
                            <th className="px-3 py-2 text-center bg-emerald-50/60 text-emerald-700">بعد الضريبة</th>
                            <th className="px-3 py-2 text-center">المرفقات</th>
                            <th className="px-3 py-2 text-center">توثيق</th>
                            <th className="px-3 py-2 text-center bg-purple-50/60 text-purple-700">أصل ثابت</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {invoices.map((inv,k)=>{
                            const vKey = `${op.id}-${inv.invNum}`;
                            const isInvVerified = verifiedInvoices[vKey]||false;
                            const amtBeforeVat = Math.round(inv.amount / 1.15);
                            const vatAmt       = inv.amount - amtBeforeVat;
                            const alreadyConverted = convertedInvNums.has(inv.invNum);
                            return (
                              <tr key={k} className={`hover:bg-gray-50 ${isInvVerified?"bg-emerald-50/40":""} ${alreadyConverted?"bg-purple-50/20":""}`}>
                                <td className="px-3 py-2 font-mono text-purple-700 font-semibold">{inv.invNum}</td>
                                <td className="px-3 py-2 font-medium text-gray-800">{inv.vendor}</td>
                                <td className="px-3 py-2 text-gray-600">{inv.desc}</td>
                                <td className="px-3 py-2 text-center text-gray-500">{inv.date}</td>
                                <td className="px-3 py-2 text-center font-mono text-gray-600">{fmtAmt(amtBeforeVat)} ر.س</td>
                                <td className="px-3 py-2 text-center font-mono text-amber-600 bg-amber-50/20">{fmtAmt(vatAmt)} ر.س</td>
                                <td className="px-3 py-2 text-center font-mono font-bold text-emerald-700 bg-emerald-50/20">{fmtAmt(inv.amount)} ر.س</td>
                                <td className="px-3 py-2 text-center">
                                  <button onClick={()=>setAttachModal({opId:op.id, invNum:inv.invNum, idx:0, total:inv.attachCount})}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all">
                                    <Paperclip size={10}/><span className="font-semibold">{inv.attachCount}</span>
                                  </button>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <button onClick={()=>toggleInvoiceVerify(vKey)}
                                    title={isInvVerified?"موثّق":"اضغط للتوثيق"}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto transition-all ${isInvVerified?"bg-emerald-500 text-white":"border-2 border-dashed border-gray-300 text-gray-300 hover:border-emerald-400 hover:text-emerald-400"}`}>
                                    <CheckSquare size={12}/>
                                  </button>
                                </td>
                                <td className="px-3 py-2 text-center bg-purple-50/10">
                                  {alreadyConverted ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-100 text-purple-700 text-[10px] font-semibold">
                                      <Building2 size={10}/> محوّل
                                    </span>
                                  ) : (
                                    <button
                                      onClick={()=>setConvertModal({opId:op.id, invNum:inv.invNum, vendor:inv.vendor, desc:inv.desc, amount:inv.amount, branch:op.branch, date:inv.date})}
                                      title="تحويل هذه الفاتورة إلى أصل ثابت"
                                      className="group inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border-2 border-dashed border-purple-200 text-purple-400 hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700 transition-all">
                                      <ArrowRightToLine size={11}/>
                                      <span className="text-[10px] font-semibold hidden group-hover:inline">أصل ثابت</span>
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                          <tr>
                            <td colSpan={4} className="px-3 py-2.5 font-bold text-gray-900 text-right">الإجمالي</td>
                            <td className="px-3 py-2.5 text-center font-mono text-gray-600">{fmtAmt(Math.round(invoices.reduce((s,i)=>s+i.amount,0)/1.15))} ر.س</td>
                            <td className="px-3 py-2.5 text-center font-mono text-amber-600 bg-amber-50/20">{fmtAmt(invoices.reduce((s,i)=>s+Math.round(i.amount-i.amount/1.15),0))} ر.س</td>
                            <td className="px-3 py-2.5 text-center font-black font-mono text-emerald-700 bg-emerald-50/20">{fmtAmt(invoices.reduce((s,i)=>s+i.amount,0))} ر.س</td>
                            <td></td>
                            <td className="px-3 py-2.5 text-center text-[10px] text-gray-500">
                              {invoices.filter(inv=>verifiedInvoices[`${op.id}-${inv.invNum}`]).length}/{invoices.length} موثّق
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
        }
      </div>

      {/* ── Pending conversions banner ── */}
      {drafts.filter(d=>d.status==="draft").length>0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 size={16} className="text-purple-600"/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-purple-800">
              {drafts.filter(d=>d.status==="draft").length} فاتورة محوّلة إلى مسودة أصول ثابتة
            </p>
            <p className="text-[11px] text-purple-600 mt-0.5">
              {drafts.filter(d=>d.status==="draft").map(d=>d.invNum).join(" · ")} — انتقل إلى موديول الأصول الثابتة لمراجعتها
            </p>
          </div>
          <button onClick={()=>navigate("acc-assets")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-all flex-shrink-0">
            <Building2 size={12}/> فتح الأصول الثابتة
          </button>
        </div>
      )}

      {/* Attachment Viewer Modal */}
      {attachModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={()=>setAttachModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e=>e.stopPropagation()} dir="rtl">
            <div className="px-5 py-4 bg-gradient-to-l from-blue-600 to-blue-700 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">مرفقات الفاتورة — {attachModal.invNum}</h3>
                <p className="text-blue-200 text-xs mt-0.5">مرفق {attachModal.idx+1} من {attachModal.total}</p>
              </div>
              <button onClick={()=>setAttachModal(null)} className="text-blue-200 hover:text-white"><X size={18}/></button>
            </div>
            {/* Attachment preview area */}
            <div className="p-5">
              <div className="bg-gray-100 rounded-xl h-52 flex flex-col items-center justify-center border-2 border-dashed border-gray-300">
                <Paperclip size={36} className="text-gray-300 mb-3"/>
                <p className="text-sm font-semibold text-gray-600">{ATTACH_LABELS[attachModal.idx % ATTACH_LABELS.length]}</p>
                <p className="text-xs text-gray-400 mt-1">invoice_{attachModal.invNum}_p{attachModal.idx+1}.pdf</p>
                <button className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-all">
                  <Eye size={14}/> عرض الملف الكامل
                </button>
              </div>
              {/* Navigation */}
              <div className="flex items-center justify-between mt-4">
                <button disabled={attachModal.idx===0}
                  onClick={()=>setAttachModal(p=>p?{...p,idx:p.idx-1}:p)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  <ChevronRight size={14}/> السابق
                </button>
                <div className="flex gap-1.5">
                  {Array.from({length:attachModal.total},(_,i)=>(
                    <button key={i} onClick={()=>setAttachModal(p=>p?{...p,idx:i}:p)}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${i===attachModal.idx?"bg-blue-600":"bg-gray-300"}`}/>
                  ))}
                </div>
                <button disabled={attachModal.idx===attachModal.total-1}
                  onClick={()=>setAttachModal(p=>p?{...p,idx:p.idx+1}:p)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  التالي <ChevronLeft size={14}/>
                </button>
              </div>
            </div>
            <div className="px-5 pb-4 flex gap-2 justify-end">
              <Btn size="sm"><Download size={12}/> تحميل</Btn>
              <Btn size="sm" variant="success" onClick={()=>{
                toggleInvoiceVerify(`${attachModal.opId}-${attachModal.invNum}`);
                setAttachModal(null);
              }}><CheckSquare size={12}/> تم التحقق من المرفق</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Asset Modal */}
      {convertModal && (
        <ConvertToAssetModal
          expenseOpId={convertModal.opId}
          invNum={convertModal.invNum}
          vendor={convertModal.vendor}
          desc={convertModal.desc}
          amount={convertModal.amount}
          branch={convertModal.branch}
          date={convertModal.date}
          onClose={()=>setConvertModal(null)}
          onSuccess={()=>setConvertModal(null)}
        />
      )}
    </div>
  );
}

function AccSalesDetail({ navigate, setModal, setDetailId, detailId, ops, approveOp, addCorrectiveOp }:PageProps) {
  const op = ops.find(o=>o.id===detailId) || ops[0];

  const RECON_EMP: Record<string,string> = {
    "1001":"أحمد الشمري","1002":"محمد العبدلي","1003":"خالد النجار",
    "1004":"سعد الغامدي","1005":"عبدالرحمن السيف","1006":"فيصل الحربي",
  };

  const totalSales = op?.amount || 18340;
  const [reconCash,      setReconCash]      = useState(4200);
  const [reconBank,      setReconBank]      = useState(8500);
  const [reconEditMode,  setReconEditMode]  = useState(false);
  const [reconDelivApps, setReconDelivApps] = useState([
    { app:"طلبات",         icon:"🔴", val:980,  orig:980  },
    { app:"هنقرستيشن",     icon:"🟠", val:2800, orig:2800 },
    { app:"جاهز",          icon:"🟡", val:1200, orig:1200 },
    { app:"نينجا (Ninja)", icon:"⚫", val:660,  orig:660  },
  ]);
  type VEmp = { empId:string; empName:string; amount:string };
  const [varEmps, setVarEmps] = useState<VEmp[]>([{ empId:"", empName:"", amount:"" }]);
  const setVarEmpField = (i:number, field:keyof VEmp, val:string) =>
    setVarEmps(p=>p.map((e,j)=>j===i ? {...e,[field]:val, ...(field==="empId"?{empName:RECON_EMP[val]||""}:{}) } : e));

  const totalDelivery   = reconDelivApps.reduce((s,d)=>s+d.val, 0);
  const totalCollection = reconCash + reconBank + totalDelivery;
  const variance        = totalSales - totalCollection;
  const hasVariance     = variance !== 0;
  const assignedTotal   = varEmps.reduce((s,e)=>s+(parseFloat(e.amount)||0), 0);
  const remaining       = variance - assignedTotal;

  const isLocked = op?.status === "final-approved";

  return (
    <div className="space-y-4">
      <Breadcrumb items={[
        { label:"لوحة التحكم", onClick:()=>navigate("acc-dashboard") },
        { label:"المبيعات", onClick:()=>navigate("acc-sales") },
        { label:op?.id||"" }
      ]}/>

      {op && <PipelineBar op={op}/>}
      {isLocked && <LockBanner op={op}/>}
      {op?.isCorrection && op.correctiveRef && (
        <div className="flex items-center gap-3 px-5 py-3 bg-amber-50 border border-amber-200 rounded-xl" dir="rtl">
          <ArrowLeftRight size={14} className="text-amber-600 flex-shrink-0"/>
          <p className="text-sm text-amber-800">
            <span className="font-bold">عملية تعديل — </span>
            ترتبط بالسجل الأصلي:
            <span className="font-mono font-bold text-amber-900 mr-1">{op.correctiveRef}</span>
          </p>
        </div>
      )}

      <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isLocked?"border-slate-200":"border-gray-100"}`}>
        {isLocked && <div className="h-1 bg-gradient-to-l from-emerald-400 to-emerald-600 w-full"/>}
        <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">💰</span>
              <div>
                <h2 className="font-bold text-gray-900 text-xl">تقرير المبيعات اليومي</h2>
                <p className="text-gray-500 text-sm mt-0.5">{op?.branch} · 14 أكتوبر 2025 · نهاية الشفت</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Badge className="bg-blue-50 text-blue-700 border border-blue-200 font-mono">{op?.id}</Badge>
              <Badge className={`${STATUS_CFG[op?.status||"pending"].cls} border`}>
                {isLocked && <Lock size={10}/>}
                {STATUS_CFG[op?.status||"pending"].label}
              </Badge>
              <Badge className="bg-gray-50 text-gray-500 border border-gray-200">مدير الفرع: أحمد الشمري</Badge>
              <Badge className="bg-gray-50 text-gray-500 border border-gray-200">📱 أُرسل قبل ساعة</Badge>
            </div>
          </div>
          <div className={`rounded-xl px-5 py-3 text-center ${isLocked?"bg-emerald-50 border border-emerald-200":op?.status==="approved"?"bg-blue-50":"bg-purple-50"}`}>
            {isLocked ? (
              <><Lock size={22} className="text-emerald-600 mx-auto"/>
              <p className="text-emerald-700 font-bold mt-1 text-sm">معتمد نهائياً</p>
              <p className="text-emerald-500 text-xs">مُرحَّل لـ ERP · مُغلق</p></>
            ) : op?.status==="approved" ? (
              <><CheckCircle2 size={28} className="text-blue-500 mx-auto"/>
              <p className="text-blue-700 font-bold mt-1 text-sm">موافق عليه</p>
              <p className="text-blue-500 text-xs">بانتظار رئيس الحسابات</p></>
            ) : (
              <><p className="text-gray-500 text-xs">إجمالي المبيعات</p>
              <p className="font-bold text-purple-700 text-2xl font-mono mt-0.5">{fmtAmt(totalSales)}<span className="text-sm mr-1">ر.س</span></p>
              {hasVariance && <p className="text-red-500 text-xs mt-0.5 font-medium">⚠ فرق: {fmtAmt(Math.abs(variance))} ر.س</p>}
              {!hasVariance && <p className="text-emerald-600 text-xs mt-0.5 font-medium">✓ التسوية مطابقة</p>}</>
            )}
          </div>
        </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          <Card title="تسوية المبيعات" actions={
            !isLocked && (
              <button onClick={()=>setReconEditMode(m=>!m)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${reconEditMode?"bg-purple-600 text-white border-purple-600":"bg-white text-purple-600 border-purple-200 hover:bg-purple-50"}`}>
                <Edit3 size={11}/> {reconEditMode ? "💾 حفظ التعديلات" : "تعديل الأرقام"}
              </button>
            )
          }>
            <div className="divide-y divide-gray-100" dir="rtl">

              {/* ── إجمالي المبيعات (مقفل — من رفع مدير الفرع) ── */}
              <div className="flex items-center justify-between px-4 py-3.5 bg-indigo-50/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 flex-shrink-0"/>
                  <span className="text-sm font-bold text-indigo-900">إجمالي المبيعات</span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-500 px-1.5 py-0.5 rounded-md">(من رفع مدير الفرع — مقفل)</span>
                </div>
                <span className="font-mono font-black text-indigo-800 text-base">{fmtAmt(totalSales)} ر.س</span>
              </div>

              {/* ── نقدي ── */}
              <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/60">
                <div className="flex items-center gap-2">
                  <span className="text-base">💵</span>
                  <span className="text-sm text-gray-700 font-medium">نقدي (صندوق)</span>
                </div>
                {reconEditMode && !isLocked ? (
                  <input type="number" value={reconCash}
                    onChange={e=>setReconCash(+e.target.value)}
                    className="w-36 text-center font-mono font-semibold border-2 border-purple-300 rounded-xl px-3 py-1.5 text-sm bg-purple-50 focus:outline-none focus:border-purple-500"/>
                ) : (
                  <span className="font-mono font-semibold text-gray-800 text-sm">{fmtAmt(reconCash)} ر.س</span>
                )}
              </div>

              {/* ── بنك / كارت ── */}
              <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/60">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏦</span>
                  <span className="text-sm text-gray-700 font-medium">بنك / كارت (بنك الرياض)</span>
                </div>
                {reconEditMode && !isLocked ? (
                  <input type="number" value={reconBank}
                    onChange={e=>setReconBank(+e.target.value)}
                    className="w-36 text-center font-mono font-semibold border-2 border-purple-300 rounded-xl px-3 py-1.5 text-sm bg-purple-50 focus:outline-none focus:border-purple-500"/>
                ) : (
                  <span className="font-mono font-semibold text-gray-800 text-sm">{fmtAmt(reconBank)} ر.س</span>
                )}
              </div>

              {/* ── تطبيقات التوصيل — header ── */}
              <div className="px-4 py-2 bg-gray-50/80">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">تطبيقات التوصيل</p>
              </div>

              {/* ── كل تطبيق ── */}
              {reconDelivApps.map((d,i)=>{
                const appDiff = d.orig - d.val;
                return (
                  <div key={i} className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50/60 transition-colors ${appDiff>0?"bg-amber-50/40":""}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">{d.icon}</span>
                      <span className="text-sm text-gray-700 font-medium">{d.app}</span>
                      {appDiff > 0 && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-bold">تعديل −{fmtAmt(appDiff)} ر.س</span>
                      )}
                    </div>
                    {reconEditMode && !isLocked ? (
                      <input type="number" value={d.val}
                        onChange={e=>setReconDelivApps(apps=>apps.map((a,j)=>j===i?{...a,val:+e.target.value}:a))}
                        className="w-36 text-center font-mono font-semibold border-2 border-purple-300 rounded-xl px-3 py-1.5 text-sm bg-purple-50 focus:outline-none focus:border-purple-500"/>
                    ) : (
                      <span className={`font-mono font-semibold text-sm ${appDiff>0?"text-amber-700":"text-gray-800"}`}>{fmtAmt(d.val)} ر.س</span>
                    )}
                  </div>
                );
              })}

              {/* ── قسم توزيع الفرق على الموظفين (يظهر فقط عند وجود فرق) ── */}
              {hasVariance && !isLocked && (
                <div className="mx-4 my-3 bg-red-50 border border-red-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-100/60 border-b border-red-200">
                    <AlertTriangle size={14} className="text-red-600 flex-shrink-0"/>
                    <p className="text-sm font-bold text-red-800">
                      تحميل الفرق على موظفين — الفرق: <span className="font-mono">{fmtAmt(variance)} ر.س</span>
                    </p>
                    <span className={`mr-auto text-xs font-bold px-2 py-1 rounded-lg ${remaining<=0?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-700"}`}>
                      {remaining<=0 ? "✓ محمَّل بالكامل" : `متبقي ${fmtAmt(remaining)} ر.س`}
                    </span>
                  </div>
                  <div className="p-4 space-y-2">
                    {varEmps.map((e,i)=>(
                      <div key={i} className="flex items-center gap-2">
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[10px] text-gray-400">رقم الموظف</label>
                          <input placeholder="مثال: 1001" value={e.empId}
                            onChange={ev=>setVarEmpField(i,"empId",ev.target.value)}
                            className="w-24 text-center font-mono border border-red-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-red-400"/>
                        </div>
                        <div className="flex flex-col gap-0.5 flex-1">
                          <label className="text-[10px] text-gray-400">اسم الموظف</label>
                          <div className="h-8 flex items-center px-2 rounded-lg bg-white border border-gray-100 text-xs text-gray-700 font-medium">
                            {e.empName || <span className="text-gray-300">يُعبأ تلقائياً</span>}
                          </div>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[10px] text-gray-400">المبلغ (ر.س)</label>
                          <input placeholder="0.00" type="number" value={e.amount}
                            onChange={ev=>setVarEmpField(i,"amount",ev.target.value)}
                            className="w-28 text-center font-mono border border-red-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-red-400"/>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[10px] text-gray-400 opacity-0">⚡</label>
                          <button title="تعبئة المتبقي تلقائياً"
                            onClick={()=>setVarEmpField(i,"amount",String(Math.max(0, remaining+(parseFloat(e.amount)||0))))}
                            className="px-2 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-[11px] font-bold hover:bg-amber-200 border border-amber-200">
                            ⚡ المتبقي
                          </button>
                        </div>
                        {varEmps.length > 1 && (
                          <div className="flex flex-col gap-0.5">
                            <label className="text-[10px] text-gray-400 opacity-0">×</label>
                            <button onClick={()=>setVarEmps(p=>p.filter((_,j)=>j!==i))}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                              <X size={13}/>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-1">
                      <button onClick={()=>setVarEmps(p=>[...p,{empId:"",empName:"",amount:""}])}
                        className="flex items-center gap-1 text-xs text-red-600 hover:underline font-semibold">
                        <Plus size={11}/> إضافة موظف آخر
                      </button>
                      {remaining <= 0 && (
                        <Btn size="sm" variant="success">
                          <CheckCircle2 size={11}/> تأكيد التحميل
                        </Btn>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── إجمالي التحصيل ── */}
              <div className={`flex items-center justify-between px-4 py-3.5 font-bold border-t-2 ${variance===0?"bg-emerald-50/70 border-emerald-200":"bg-red-50/70 border-red-200"}`}>
                <span className={`text-sm ${variance===0?"text-emerald-800":"text-red-800"}`}>إجمالي التحصيل</span>
                <span className={`font-mono text-base ${variance===0?"text-emerald-700":"text-red-700"}`}>{fmtAmt(totalCollection)} ر.س</span>
              </div>

              {/* ── صف الفرق ── */}
              {variance !== 0 ? (
                <div className="flex items-center justify-between px-4 py-3 bg-red-100 border-t border-red-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={13} className="text-red-600"/>
                    <span className="text-sm font-bold text-red-800">الفرق المطلوب تحميله على الموظفين</span>
                  </div>
                  <span className="font-mono font-black text-red-800 text-base">{fmtAmt(variance)} ر.س</span>
                </div>
              ) : (
                <div className="flex items-center justify-center px-4 py-3 bg-emerald-50">
                  <span className="text-sm text-emerald-700 font-bold flex items-center gap-2">
                    <CheckCircle2 size={14}/> إجمالي التحصيل مطابق لإجمالي المبيعات تماماً
                  </span>
                </div>
              )}

            </div>
          </Card>
          <Card title="سجل دورة حياة السجل" actions={<span className="text-xs text-gray-400 font-mono">{op?.id}</span>}>
            <div className="p-4 space-y-0">
              {op && buildAuditTrail(op).map((event, i, arr)=>(
                <div key={i} className="flex gap-3 relative">
                  {/* Vertical connector line */}
                  {i < arr.length - 1 && (
                    <div className="absolute right-[13px] top-7 bottom-0 w-0.5 bg-gray-100 z-0"/>
                  )}
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 z-10 border ${event.isTerminal ? "border-2 border-emerald-300" : "border-gray-100"} ${event.cls}`}>
                    {event.icon}
                  </span>
                  <div className={`flex-1 pb-4 ${i === arr.length - 1 ? "" : ""}`}>
                    <p className={`text-xs font-semibold leading-tight ${event.isTerminal ? "text-gray-900" : "text-gray-700"}`}>{event.action}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{event.by} · {event.time}</p>
                    {event.isTerminal && (
                      <Badge className={`mt-1.5 text-[10px] ${op?.erpPosted ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                        <Lock size={8}/> حالة نهائية
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {isLocked ? (
            <Card title="حالة السجل الموثَّق">
              <div className="p-4 space-y-3">
                {/* Two distinct states: final-approved vs erp-posted */}
                <div className="grid grid-cols-2 gap-2">
                  <div className={`rounded-xl p-3 text-center border-2 ${isLocked ? "border-emerald-300 bg-emerald-50" : "border-gray-100 bg-gray-50"}`}>
                    <CheckCircle2 size={20} className="text-emerald-600 mx-auto mb-1"/>
                    <p className="text-xs font-bold text-emerald-700">اعتماد نهائي</p>
                    <p className="text-[10px] text-emerald-500 mt-0.5">{op?.finalApprovedAt || "16:42 م"}</p>
                  </div>
                  <div className={`rounded-xl p-3 text-center border-2 ${op?.erpPosted ? "border-indigo-300 bg-indigo-50" : "border-dashed border-gray-200 bg-gray-50"}`}>
                    <ChevronsRight size={20} className={`mx-auto mb-1 ${op?.erpPosted ? "text-indigo-600" : "text-gray-300"}`}/>
                    <p className={`text-xs font-bold ${op?.erpPosted ? "text-indigo-700" : "text-gray-400"}`}>
                      {op?.erpPosted ? "مُرحَّل لـ ERP" : "لم يُرحَّل بعد"}
                    </p>
                    <p className={`text-[10px] mt-0.5 ${op?.erpPosted ? "text-indigo-500" : "text-gray-300"}`}>
                      {op?.erpPosted ? (op?.erpBatchId || "ERP-BATCH") : "في انتظار دفعة الترحيل"}
                    </p>
                  </div>
                </div>
                <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 text-xs">
                  {[
                    { label: "مُنشئ السجل", value: op?.submittedBy || "مدير الفرع" },
                    { label: "راجعه واعتمده", value: op?.approvedBy || "المحاسب المختص" },
                    { label: "الاعتماد النهائي", value: op?.finalApprovedBy || "رئيس الحسابات" },
                    { label: "الترحيل لـ ERP", value: op?.erpPosted ? `✓ ${op.erpBatchId || "تم الترحيل"}` : "⏳ لم يُرحَّل بعد" },
                  ].map((row,i)=>(
                    <div key={i} className="flex justify-between px-3 py-2.5">
                      <span className="text-gray-400">{row.label}</span>
                      <span className={`font-semibold ${row.value.startsWith("✓") ? "text-emerald-600" : row.value.startsWith("⏳") ? "text-amber-500" : "text-gray-700"}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={()=>{
                    if(op && addCorrectiveOp) {
                      addCorrectiveOp(op.id);
                      navigate("acc-sales");
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-50 text-amber-700 font-semibold text-sm hover:bg-amber-100 border border-amber-200">
                  <FileText size={14}/> إنشاء عملية تعديل مرتبطة
                </button>
              </div>
            </Card>
          ) : op?.status==="pending" ? (
            <Card title="الإجراءات">
              <div className="p-4 space-y-2.5">
                <button onClick={()=>{ approveOp(op.id); }} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 shadow-sm">
                  <CheckCircle2 size={15}/> موافقة — إرسال لرئيس الحسابات
                </button>
                <button onClick={()=>{ setDetailId(op.id); setModal("reject"); }} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-700 font-semibold text-sm hover:bg-red-100 border border-red-200">
                  <XCircle size={15}/> رفض — إعادة لمدير الفرع
                </button>
                <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-semibold text-sm hover:bg-blue-100 border border-blue-200">
                  <MessageSquare size={15}/> طلب توضيح
                </button>
              </div>
            </Card>
          ) : op?.status==="approved" ? (
            <Card title="حالة السجل">
              <div className="p-4">
                <div className="flex flex-col items-center gap-2 py-3 text-center">
                  <CheckCircle2 size={32} className="text-blue-500"/>
                  <p className="font-bold text-blue-700 text-sm">تمت الموافقة</p>
                  <p className="text-gray-400 text-xs">بانتظار الاعتماد النهائي من رئيس الحسابات</p>
                </div>
              </div>
            </Card>
          ) : null}
          <Card title="المرفقات (3)">
            <div className="p-4 space-y-2">
              {[{name:"تقرير POS.pdf",type:"PDF",size:"245 KB"},{name:"كشف بنك الرياض.pdf",type:"PDF",size:"182 KB"},{name:"تقرير هنقرستيشن.xlsx",type:"Excel",size:"98 KB"}].map((att,i)=>(
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${att.type==="PDF"?"bg-red-100 text-red-700":"bg-green-100 text-green-700"}`}>{att.type}</span>
                    <div><p className="text-xs font-medium text-gray-700">{att.name}</p><p className="text-[10px] text-gray-400">{att.size}</p></div>
                  </div>
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded hover:bg-gray-200"><Eye size={11} className="text-gray-500"/></button>
                    <button className="p-1.5 rounded hover:bg-gray-200"><Download size={11} className="text-gray-500"/></button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          {!isLocked && (
            <Card title="ملاحظات المحاسب">
              <div className="p-4">
                <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 resize-none mb-2" rows={3} placeholder="أضف ملاحظة..."/>
                <Btn variant="ghost" className="w-full justify-center text-xs">حفظ الملاحظة</Btn>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Rich purchase records for Accountant module ─────────────────────────────
interface PurItem { name:string; ordered:number; received:number; unit:string; price:number; histPrice:number; dailyAvg:number; recommended:number }
interface PurRecord { id:string; branch:string; supplier:string; invNum:string; date:string; status:"pending"|"approved"|"rejected"; match:"exact"|"diff"; amount:number; items:PurItem[] }
const PUR_RECORDS: PurRecord[] = [
  { id:"PUR-001", branch:"فرع الرياض - العليا",       supplier:"شركة الدواجن الوطنية",  invNum:"INV-D001", date:"14 أكت", status:"pending",  match:"diff",  amount:5760,
    items:[
      {name:"دجاج طازج",   ordered:50,  received:48,  unit:"كجم", price:32, histPrice:30, dailyAvg:7,  recommended:49},
      {name:"صدر دجاج",    ordered:30,  received:28,  unit:"كجم", price:45, histPrice:43, dailyAvg:4,  recommended:28},
    ]},
  { id:"PUR-002", branch:"فرع جدة - الحمراء",         supplier:"شركة الدواجن الوطنية",  invNum:"INV-D002", date:"13 أكت", status:"approved", match:"exact", amount:7040,
    items:[
      {name:"دجاج طازج",   ordered:60,  received:60,  unit:"كجم", price:32, histPrice:30, dailyAvg:9,  recommended:63},
      {name:"أجنحة دجاج",  ordered:40,  received:40,  unit:"كجم", price:38, histPrice:36, dailyAvg:5,  recommended:35},
    ]},
  { id:"PUR-003", branch:"فرع مكة - المعابدة",         supplier:"شركة الدواجن الوطنية",  invNum:"INV-D003", date:"12 أكت", status:"pending",  match:"exact", amount:4800,
    items:[
      {name:"دجاج طازج",   ordered:50,  received:50,  unit:"كجم", price:32, histPrice:30, dailyAvg:7,  recommended:49},
      {name:"صدر دجاج",    ordered:20,  received:20,  unit:"كجم", price:45, histPrice:43, dailyAvg:3,  recommended:21},
    ]},
  { id:"PUR-004", branch:"فرع الرياض - السليمانية",   supplier:"مطاحن الملك",            invNum:"INV-M001", date:"14 أكت", status:"pending",  match:"diff",  amount:3240,
    items:[
      {name:"دقيق أبيض",   ordered:100, received:90,  unit:"كجم", price:18, histPrice:18, dailyAvg:14, recommended:98},
      {name:"سكر ناعم",    ordered:50,  received:50,  unit:"كجم", price:14, histPrice:14, dailyAvg:7,  recommended:49},
    ]},
  { id:"PUR-005", branch:"فرع الدمام",                 supplier:"مطاحن الملك",            invNum:"INV-M002", date:"13 أكت", status:"approved", match:"exact", amount:2800,
    items:[
      {name:"دقيق أبيض",   ordered:80,  received:80,  unit:"كجم", price:18, histPrice:18, dailyAvg:11, recommended:77},
      {name:"ملح طعام",    ordered:20,  received:20,  unit:"كجم", price:5,  histPrice:5,  dailyAvg:3,  recommended:21},
    ]},
  { id:"PUR-006", branch:"فرع الدمام",                 supplier:"مزرعة الخير للخضار",    invNum:"INV-V001", date:"14 أكت", status:"pending",  match:"diff",  amount:1950,
    items:[
      {name:"خضار متنوعة", ordered:30,  received:27,  unit:"كجم", price:12, histPrice:11, dailyAvg:4,  recommended:28},
      {name:"طماطم طازجة", ordered:20,  received:20,  unit:"كجم", price:8,  histPrice:8,  dailyAvg:3,  recommended:21},
    ]},
  { id:"PUR-007", branch:"فرع جدة - العزيزية",         supplier:"مزرعة الخير للخضار",    invNum:"INV-V002", date:"13 أكت", status:"approved", match:"exact", amount:2400,
    items:[
      {name:"خيار طازج",   ordered:15,  received:15,  unit:"كجم", price:9,  histPrice:9,  dailyAvg:2,  recommended:14},
      {name:"طماطم طازجة", ordered:25,  received:25,  unit:"كجم", price:8,  histPrice:8,  dailyAvg:3,  recommended:21},
      {name:"خضار متنوعة", ordered:20,  received:20,  unit:"كجم", price:12, histPrice:11, dailyAvg:3,  recommended:21},
    ]},
  { id:"PUR-008", branch:"فرع الرياض - العليا",       supplier:"موزع الأغذية الوطني",   invNum:"INV-N001", date:"14 أكت", status:"pending",  match:"exact", amount:3600,
    items:[
      {name:"بطاطس مجمدة", ordered:80,  received:80,  unit:"كجم", price:7,  histPrice:7,  dailyAvg:11, recommended:77},
      {name:"زيت نباتي",   ordered:40,  received:40,  unit:"لتر", price:20, histPrice:19, dailyAvg:5,  recommended:35},
    ]},
  { id:"PUR-009", branch:"فرع جدة - الحمراء",         supplier:"موزع الأغذية الوطني",   invNum:"INV-N002", date:"12 أكت", status:"approved", match:"exact", amount:4100,
    items:[
      {name:"حليب طازج",   ordered:100, received:100, unit:"لتر", price:8,  histPrice:8,  dailyAvg:15, recommended:105},
      {name:"بطاطس مجمدة", ordered:60,  received:60,  unit:"كجم", price:7,  histPrice:7,  dailyAvg:8,  recommended:56},
    ]},
];

// Keep PURCHASE_DETAIL for backwards compatibility with any remaining references
const PURCHASE_DETAIL = { default: PUR_RECORDS[0] ? { supplier: PUR_RECORDS[0].supplier, invNum: PUR_RECORDS[0].invNum, items: PUR_RECORDS[0].items } : { supplier:"", invNum:"", items:[] } };

// ── Shared purchase reconciliation table (used in both AccPurchases and ProcNewOrders)
function PurItemsTable({ items, verifiedMap, onToggleVerify }: { items:PurItem[]; verifiedMap?:Record<string,boolean>; onToggleVerify?:(key:string)=>void }) {
  return (
    <table className="w-full border border-gray-100 rounded-xl overflow-hidden text-xs" dir="rtl">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-3 py-2 text-right">الصنف</th>
          <th className="px-3 py-2 text-center">الوحدة</th>
          <th className="px-3 py-2 text-center">سعر الوحدة</th>
          <th className="px-3 py-2 text-center bg-sky-50/80 text-sky-700">سعر تاريخي</th>
          <th className="px-3 py-2 text-center">مطلوب</th>
          <th className="px-3 py-2 text-center">مستلم</th>
          <th className="px-3 py-2 text-center bg-amber-50/80 text-amber-700">استهلاك يومي</th>
          <th className="px-3 py-2 text-center bg-amber-50/80 text-amber-700">موصى به</th>
          <th className="px-3 py-2 text-center">الإجمالي</th>
          <th className="px-3 py-2 text-center">الحالة</th>
          {onToggleVerify && <th className="px-3 py-2 text-center text-emerald-700 bg-emerald-50/50">توثيق ✓</th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 bg-white">
        {items.map((row,i)=>{
          const diff      = row.ordered - row.received;
          const total     = row.received * row.price;
          const priceDiff = row.price - row.histPrice;
          const qtyVsRec  = row.received - row.recommended;
          const vKey      = `${row.name}-${i}`;
          const verified  = verifiedMap?.[vKey];
          return (
            <tr key={i} className={diff>0?"bg-red-50/40":verified?"bg-emerald-50/30":""}>
              <td className="px-3 py-2 font-semibold text-gray-800">{row.name}</td>
              <td className="px-3 py-2 text-center text-gray-500">{row.unit}</td>
              <td className={`px-3 py-2 text-center font-mono font-semibold ${priceDiff>2?"text-red-600":priceDiff<-2?"text-emerald-600":"text-gray-800"}`}>
                {row.price} ر.س
                {priceDiff>2  && <div className="text-[9px] text-red-500">↑ أعلى من المعتاد</div>}
                {priceDiff<-2 && <div className="text-[9px] text-emerald-500">↓ أقل من المعتاد</div>}
              </td>
              <td className="px-3 py-2 text-center font-mono text-gray-500 bg-sky-50/20">{row.histPrice} ر.س</td>
              <td className="px-3 py-2 text-center font-mono font-bold text-gray-800">{row.ordered}</td>
              <td className={`px-3 py-2 text-center font-mono font-bold ${diff>0?"text-red-600":"text-gray-800"}`}>{row.received}</td>
              <td className="px-3 py-2 text-center font-mono text-amber-700 bg-amber-50/20">{row.dailyAvg}</td>
              <td className="px-3 py-2 text-center font-mono bg-amber-50/20">
                <span className={`font-semibold ${Math.abs(qtyVsRec)>5?"text-orange-600":"text-gray-700"}`}>{row.recommended}</span>
                {Math.abs(qtyVsRec)>5 && <div className="text-[9px] text-orange-500">{qtyVsRec>0?"زيادة":"نقص"} {Math.abs(qtyVsRec)}</div>}
              </td>
              <td className="px-3 py-2 text-center font-mono font-semibold text-blue-700">{fmtAmt(total)} ر.س</td>
              <td className="px-3 py-2 text-center">
                {diff===0 ? <Badge className="bg-emerald-50 text-emerald-700">مطابق</Badge>
                           : <Badge className="bg-red-50 text-red-700">فرق {diff}</Badge>}
              </td>
              {onToggleVerify && (
                <td className="px-3 py-2 text-center">
                  <button onClick={()=>onToggleVerify(vKey)}
                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center mx-auto transition-all ${verified?"bg-emerald-500 border-emerald-500 text-white":"border-gray-300 hover:border-emerald-400"}`}>
                    {verified && <CheckCircle2 size={12}/>}
                  </button>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
      <tfoot className="bg-gray-50 border-t-2 border-gray-200">
        <tr>
          <td colSpan={onToggleVerify?8:8} className="px-3 py-2 font-bold text-gray-800 text-right">إجمالي الفاتورة</td>
          <td className="px-3 py-2 text-center font-black font-mono text-blue-800">
            {fmtAmt(items.reduce((s,r)=>s+r.received*r.price,0))} ر.س
          </td>
          <td></td>
          {onToggleVerify && <td></td>}
        </tr>
      </tfoot>
    </table>
  );
}

// ════════════════════════════════════════════════════════════
// ACCOUNTANT PURCHASES — Dual-Lens Professional View
// ════════════════════════════════════════════════════════════
function AccPurchases({ navigate, setModal, setDetailId, ops, approveOp, rejectOp, bulkApprove }:PageProps) {
  const [viewMode, setViewMode] = useState<"supplier"|"branch">("supplier");
  const [filterSupplier, setFilterSupplier] = useState("الكل");
  const [filterBranch,   setFilterBranch]   = useState("الكل");
  const [filterStatus,   setFilterStatus]   = useState("الكل");
  const [filterMatch,    setFilterMatch]     = useState("الكل");
  const [search,         setSearch]         = useState("");
  const [expandedId,     setExpandedId]     = useState<string|null>(null);
  const [verifiedRows,    setVerifiedRows]    = useState<Record<string,boolean>>({});
  const [approvedIds,     setApprovedIds]     = useState<Set<string>>(new Set());
  const [editingRecId,    setEditingRecId]    = useState<string|null>(null);
  const [purAttachModal,  setPurAttachModal]  = useState<{recId:string; invNum:string; idx:number; total:number}|null>(null);

  const SUPPLIER_LIST = [...new Set(PUR_RECORDS.map(r=>r.supplier))];
  const BRANCH_LIST   = [...new Set(PUR_RECORDS.map(r=>r.branch))];

  const filtered = PUR_RECORDS.filter(r=>{
    if(filterSupplier!=="الكل" && r.supplier!==filterSupplier) return false;
    if(filterBranch!=="الكل"   && r.branch!==filterBranch)     return false;
    if(filterStatus!=="الكل"   && r.status!==filterStatus)     return false;
    if(filterMatch!=="الكل"    && r.match!==filterMatch)       return false;
    if(search && !r.branch.includes(search)&&!r.supplier.includes(search)&&!r.invNum.includes(search)&&!r.items.some(it=>it.name.includes(search))) return false;
    return true;
  });

  const effectiveFiltered = filtered.map(r=>approvedIds.has(r.id)?{...r,status:"approved" as const}:r);
  const pending    = effectiveFiltered.filter(r=>r.status==="pending");
  const totalVal   = effectiveFiltered.reduce((s,r)=>s+r.amount,0);
  const diffCount  = effectiveFiltered.filter(r=>r.match==="diff").length;
  const hasFilters = filterSupplier!=="الكل"||filterBranch!=="الكل"||filterStatus!=="الكل"||filterMatch!=="الكل"||search;

  const approveRecord = (id:string) => setApprovedIds(p=>new Set([...p,id]));
  const approveAll    = ()          => setApprovedIds(p=>new Set([...p,...pending.map(r=>r.id)]));
  const toggleVerify  = (recId:string, key:string) => setVerifiedRows(p=>({...p,[recId+"-"+key]:!p[recId+"-"+key]}));

  // Supplier groups for supplier-mode
  const supplierGroups = SUPPLIER_LIST.map(sup=>{
    const recs = effectiveFiltered.filter(r=>r.supplier===sup);
    if(!recs.length) return null;
    const branches = [...new Set(recs.map(r=>r.branch))];
    const total    = recs.reduce((s,r)=>s+r.amount,0);
    const pCount   = recs.filter(r=>r.status==="pending").length;
    const dCount   = recs.filter(r=>r.match==="diff").length;
    return { sup, recs, branches, total, pCount, dCount };
  }).filter(Boolean);

  // Branch groups for branch-mode
  const branchGroups = BRANCH_LIST.map(br=>{
    const recs = effectiveFiltered.filter(r=>r.branch===br);
    if(!recs.length) return null;
    const suppliers = [...new Set(recs.map(r=>r.supplier))];
    const total     = recs.reduce((s,r)=>s+r.amount,0);
    const pCount    = recs.filter(r=>r.status==="pending").length;
    return { br, recs, suppliers, total, pCount };
  }).filter(Boolean);

  // Shared expandable product panel
  const renderItemsPanel = (rec: PurRecord) => {
    const isEditing = editingRecId===rec.id;
    const recStatus = effectiveFiltered.find(r=>r.id===rec.id)?.status??rec.status;
    return (
      <div className="px-5 pb-5 bg-gray-50/40 space-y-3">
        {/* Invoice meta bar */}
        <div className="flex items-center gap-4 mt-3 mb-1 p-3 bg-white rounded-xl border border-blue-100">
          <div className="flex-1">
            <p className="text-xs font-bold text-gray-700">المورد: <span className="text-blue-700">{rec.supplier}</span></p>
            <p className="text-xs text-gray-500 mt-0.5">رقم الفاتورة: <span className="font-mono font-semibold text-purple-600">{rec.invNum}</span> · {rec.date}</p>
          </div>
          <div className="text-left">
            <p className="text-xs text-gray-400">الفرع</p>
            <p className="text-xs font-semibold text-gray-700">{rec.branch}</p>
          </div>
          <div className="text-left">
            <p className="text-xs text-gray-400">إجمالي الفاتورة</p>
            <p className="font-mono font-bold text-blue-700">{fmtAmt(rec.amount)} ر.س</p>
          </div>
          {/* Attachment + edit controls */}
          <div className="flex gap-2">
            <button onClick={()=>setPurAttachModal({recId:rec.id, invNum:rec.invNum, idx:0, total:rec.items.length})}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold transition-all">
              <Paperclip size={11}/> المرفقات ({rec.items.length})
            </button>
            <button onClick={()=>setEditingRecId(isEditing?null:rec.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 text-xs font-semibold transition-all">
              <Edit3 size={11}/> {isEditing?"إيقاف التعديل":"تعديل البنود"}
            </button>
          </div>
        </div>

        {/* Simplified editable items table — item / unit / price / qty / total */}
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-100 rounded-xl overflow-hidden text-xs" dir="rtl">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-right font-semibold text-gray-600">اسم الصنف</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600">الوحدة</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600">سعر الوحدة</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600">الكمية</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600">الإجمالي</th>
                <th className="px-3 py-2 text-center font-semibold text-emerald-700 bg-emerald-50/50">توثيق ✓</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rec.items.map((row,i)=>{
                const vKey    = `${row.name}-${i}`;
                const verified = verifiedRows[rec.id+"-"+vKey];
                const total    = row.received * row.price;
                return (
                  <tr key={i} className={`hover:bg-gray-50 ${verified?"bg-emerald-50/30":""}`}>
                    <td className="px-3 py-2.5 font-semibold text-gray-800">
                      {isEditing
                        ? <input defaultValue={row.name} className="w-full border border-purple-200 rounded-lg px-2 py-1 text-xs bg-white focus:border-purple-400 outline-none"/>
                        : row.name
                      }
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-500">{row.unit}</td>
                    <td className="px-3 py-2.5 text-center font-mono">
                      {isEditing
                        ? <input defaultValue={String(row.price)} className="w-20 text-center border border-purple-200 rounded-lg px-2 py-1 text-xs font-mono bg-white focus:border-purple-400 outline-none"/>
                        : <span className="font-bold text-gray-800">{row.price} ر.س</span>
                      }
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono">
                      {isEditing
                        ? <input defaultValue={String(row.received)} className="w-16 text-center border border-purple-200 rounded-lg px-2 py-1 text-xs font-mono bg-white focus:border-purple-400 outline-none"/>
                        : <span className="font-bold text-gray-800">{row.received}</span>
                      }
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono font-semibold text-blue-700">{fmtAmt(total)} ر.س</td>
                    <td className="px-3 py-2.5 text-center">
                      <button onClick={()=>toggleVerify(rec.id, vKey)}
                        className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center mx-auto transition-all ${verified?"bg-emerald-500 border-emerald-500 text-white":"border-gray-300 hover:border-emerald-400"}`}>
                        {verified && <CheckCircle2 size={12}/>}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td colSpan={4} className="px-3 py-2.5 font-bold text-gray-900 text-right">إجمالي الفاتورة</td>
                <td className="px-3 py-2.5 text-center font-black font-mono text-blue-800">{fmtAmt(rec.items.reduce((s,r)=>s+r.received*r.price,0))} ر.س</td>
                <td className="px-3 py-2.5 text-center text-[10px] text-gray-500">
                  {Object.keys(verifiedRows).filter(k=>k.startsWith(rec.id+"-")).length}/{rec.items.length} موثّق
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        {isEditing && (
          <div className="flex gap-2">
            <Btn size="sm" variant="success" onClick={()=>setEditingRecId(null)}><CheckCircle2 size={11}/> حفظ التعديلات</Btn>
            <Btn size="sm" onClick={()=>setEditingRecId(null)}>إلغاء</Btn>
          </div>
        )}
        {recStatus==="pending" && (
          <div className="flex gap-2 pt-1">
            <Btn size="sm" variant="success" onClick={()=>approveRecord(rec.id)}><ThumbsUp size={12}/> موافقة على الفاتورة</Btn>
            <Btn size="sm" variant="danger"><ThumbsDown size={12}/> رفض</Btn>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">موديول المشتريات</h2>
          <p className="text-gray-400 text-sm mt-0.5">مطابقة الفواتير بالمنتجات والموردين — عرض حسب المورد أو حسب الفرع</p>
        </div>
        {pending.length>0 && <Btn variant="success" size="sm" onClick={approveAll}><CheckCircle2 size={12}/> موافقة جماعية ({pending.length})</Btn>}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="إجمالي قيمة المشتريات" value={`${(totalVal/1000).toFixed(1)}K ر.س`} sub="الفترة المحددة" icon={<ShoppingCart size={18} className="text-blue-600"/>} accent="blue"/>
        <KpiCard label="فواتير معلقة" value={String(pending.length)} sub="تنتظر المراجعة" icon={<Clock size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label="فواتير بفروق" value={String(diffCount)} sub="كمية أو سعر" icon={<AlertTriangle size={18} className="text-red-600"/>} accent="red"/>
        <KpiCard label="موردون نشطون" value={String(SUPPLIER_LIST.length)} sub="هذه الفترة" icon={<Truck size={18} className="text-purple-600"/>} accent="purple"/>
      </div>

      {/* View mode tabs */}
      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {([["supplier","🏭 عرض حسب المورد"],["branch","🏪 عرض حسب الفرع"]] as const).map(([mode,label])=>(
            <button key={mode} onClick={()=>{ setViewMode(mode); setExpandedId(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode===mode?"bg-white text-gray-800 shadow-sm":"text-gray-500 hover:text-gray-700"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-3 h-3 rounded bg-amber-200"/>استهلاك يومي
          <div className="w-3 h-3 rounded bg-sky-200 mr-2"/>سعر تاريخي
          <div className="w-3 h-3 rounded bg-emerald-400 mr-2"/>توثيق المحاسب
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">العلامة التجارية / البراند</label>
            <select className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2">
              {["الكل","برغر خليفة","بيتزا باكو","وسطاوي"].map(b=><option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">المورد</label>
            <select value={filterSupplier} onChange={e=>setFilterSupplier(e.target.value)} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2">
              <option>الكل</option>
              {SUPPLIER_LIST.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">الفرع</label>
            <select value={filterBranch} onChange={e=>setFilterBranch(e.target.value)} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2">
              <option>الكل</option>
              {BRANCH_LIST.map(b=><option key={b}>{b}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">الحالة</label>
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2">
              {["الكل","pending","approved","rejected"].map(s=>(
                <option key={s} value={s}>{s==="الكل"?"الكل":s==="pending"?"معلق":s==="approved"?"معتمد":"مرفوض"}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">المطابقة</label>
            <select value={filterMatch} onChange={e=>setFilterMatch(e.target.value)} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2">
              <option>الكل</option>
              <option value="exact">مطابق تاماً</option>
              <option value="diff">به فروق</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">بحث (فرع / مورد / منتج / مطعم)</label>
            <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2 py-2">
              <Search size={11} className="text-gray-400 flex-shrink-0"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث بالاسم أو المورد..." className="flex-1 text-xs outline-none min-w-0"/>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          {hasFilters && (
            <button onClick={()=>{ setFilterSupplier("الكل"); setFilterBranch("الكل"); setFilterStatus("الكل"); setFilterMatch("الكل"); setSearch(""); }}
              className="text-xs text-purple-600 hover:underline flex items-center gap-1"><RotateCcw size={10}/> مسح الفلاتر</button>
          )}
          <button onClick={()=>alert("جارٍ تصدير بيانات المشتريات إلى Excel...")}
            className="mr-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-all">
            <FileText size={11}/> تصدير Excel
          </button>
        </div>
      </div>

      {effectiveFiltered.length===0
        ? <div className="bg-white rounded-xl border border-gray-100 p-12 text-center"><EmptyState icon="🔍" title="لا توجد نتائج" desc="غيّر الفلاتر للحصول على نتائج أخرى"/></div>
        : viewMode==="supplier"
          ? (
            /* ── SUPPLIER MODE: grouped by supplier ── */
            <div className="space-y-4">
              {supplierGroups.map(g=>{
                if(!g) return null;
                return (
                  <div key={g.sup} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Supplier header */}
                    <div className="px-5 py-4 bg-gradient-to-l from-blue-50/30 to-white border-b border-gray-100 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-black text-lg flex-shrink-0">
                        {g.sup.slice(0,1)}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">{g.sup}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{g.recs.length} فاتورة · {g.branches.length} {g.branches.length===1?"فرع":"فروع"}</p>
                      </div>
                      <div className="flex gap-3 items-center">
                        {g.dCount>0 && <Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px]">⚠ {g.dCount} فرق</Badge>}
                        {g.pCount>0 && <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">⏳ {g.pCount} معلق</Badge>}
                        <div className="text-left">
                          <p className="font-mono font-bold text-blue-700 text-base">{fmtAmt(g.total)} ر.س</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">يومياً: {fmtAmt(Math.round(g.total/30))} ر.س</p>
                        </div>
                      </div>
                    </div>
                    {/* Per-branch breakdown header */}
                    <div className="px-5 py-2 bg-gray-50/50 border-b border-gray-100 flex gap-3 flex-wrap">
                      {g.branches.map(br=>{
                        const brRecs = g.recs.filter(r=>r.branch===br);
                        const brTotal = brRecs.reduce((s,r)=>s+r.amount,0);
                        return (
                          <div key={br} className="flex items-center gap-1.5 text-xs">
                            <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0"/>
                            <span className="text-gray-600 font-medium">{br}</span>
                            <span className="font-mono text-blue-600">{fmtAmt(brTotal)} ر.س</span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Invoice rows */}
                    {g.recs.map(rec=>{
                      const recStatus = effectiveFiltered.find(r=>r.id===rec.id)?.status??rec.status;
                      return (
                        <div key={rec.id} className={`border-b border-gray-100 last:border-0 ${rec.match==="diff"?"border-r-4 border-r-red-400":""}`}>
                          <div className={`px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50/60 cursor-pointer ${expandedId===rec.id?"bg-blue-50/20":""}`}
                            onClick={()=>setExpandedId(expandedId===rec.id?null:rec.id)}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm text-gray-800">{rec.branch}</span>
                                <span className="font-mono text-xs text-purple-600">{rec.invNum}</span>
                                <Badge className={`${MATCH_CFG[rec.match].cls} border text-[10px]`}>{MATCH_CFG[rec.match].label}</Badge>
                                <Badge className={`${STATUS_CFG[recStatus].cls} text-[10px]`}>{STATUS_CFG[recStatus].label}</Badge>
                              </div>
                              <p className="text-[11px] text-gray-400 mt-0.5">{rec.items.length} أصناف · {rec.date}</p>
                            </div>
                            <span className="font-mono font-bold text-gray-800">{fmtAmt(rec.amount)} ر.س</span>
                            {expandedId===rec.id?<ChevronUp size={13} className="text-gray-400"/>:<ChevronDown size={13} className="text-gray-400"/>}
                          </div>
                          {expandedId===rec.id && renderItemsPanel(rec)}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )
          : (
            /* ── BRANCH MODE: grouped by branch ── */
            <div className="space-y-4">
              {branchGroups.map(g=>{
                if(!g) return null;
                return (
                  <div key={g.br} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Branch header */}
                    <div className="px-5 py-4 bg-gradient-to-l from-emerald-50/30 to-white border-b border-gray-100 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-base flex-shrink-0">🏪</div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">{g.br}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{g.recs.length} فاتورة · {g.suppliers.length} مورد</p>
                      </div>
                      <div className="flex gap-3 items-center">
                        {g.pCount>0 && <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">⏳ {g.pCount} معلق</Badge>}
                        <div className="text-left">
                          <p className="font-mono font-bold text-emerald-700 text-base">{fmtAmt(g.total)} ر.س</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">إجمالي مشتريات الفرع</p>
                        </div>
                      </div>
                    </div>
                    {/* Supplier breakdown pills */}
                    <div className="px-5 py-2 bg-gray-50/50 border-b border-gray-100 flex gap-2 flex-wrap">
                      {g.suppliers.map(sup=>{
                        const supRecs = g.recs.filter(r=>r.supplier===sup);
                        const supTotal = supRecs.reduce((s,r)=>s+r.amount,0);
                        return (
                          <div key={sup} className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 rounded-lg px-2 py-1">
                            <Truck size={9} className="text-gray-400"/>
                            <span className="text-gray-600">{sup}</span>
                            <span className="font-mono font-semibold text-gray-700">{fmtAmt(supTotal)} ر.س</span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Invoice rows */}
                    {g.recs.map(rec=>{
                      const recStatus = effectiveFiltered.find(r=>r.id===rec.id)?.status??rec.status;
                      return (
                        <div key={rec.id} className={`border-b border-gray-100 last:border-0 ${rec.match==="diff"?"border-r-4 border-r-red-400":""}`}>
                          <div className={`px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50/60 cursor-pointer ${expandedId===rec.id?"bg-emerald-50/20":""}`}
                            onClick={()=>setExpandedId(expandedId===rec.id?null:rec.id)}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm text-gray-800">{rec.supplier}</span>
                                <span className="font-mono text-xs text-purple-600">{rec.invNum}</span>
                                <Badge className={`${MATCH_CFG[rec.match].cls} border text-[10px]`}>{MATCH_CFG[rec.match].label}</Badge>
                                <Badge className={`${STATUS_CFG[recStatus].cls} text-[10px]`}>{STATUS_CFG[recStatus].label}</Badge>
                              </div>
                              <p className="text-[11px] text-gray-400 mt-0.5">{rec.items.length} أصناف · {rec.date} · {rec.items.map(i=>i.name).join("، ")}</p>
                            </div>
                            <span className="font-mono font-bold text-gray-800">{fmtAmt(rec.amount)} ر.س</span>
                            {expandedId===rec.id?<ChevronUp size={13} className="text-gray-400"/>:<ChevronDown size={13} className="text-gray-400"/>}
                          </div>
                          {expandedId===rec.id && renderItemsPanel(rec)}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )
      }

      {/* Attachment viewer modal for purchases */}
      {purAttachModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={()=>setPurAttachModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e=>e.stopPropagation()} dir="rtl">
            <div className="px-5 py-4 bg-gradient-to-l from-blue-600 to-blue-700 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">مرفقات الفاتورة — {purAttachModal.invNum}</h3>
                <p className="text-blue-200 text-xs mt-0.5">مرفق {purAttachModal.idx+1} من {purAttachModal.total}</p>
              </div>
              <button onClick={()=>setPurAttachModal(null)} className="text-blue-200 hover:text-white"><X size={18}/></button>
            </div>
            <div className="p-5">
              <div className="bg-gray-100 rounded-xl h-52 flex flex-col items-center justify-center border-2 border-dashed border-gray-300">
                <Paperclip size={36} className="text-gray-300 mb-3"/>
                <p className="text-sm font-semibold text-gray-600">
                  {["فاتورة المورد الأصلية","صورة إيصال الاستلام","توقيع المستلم","كشف التسليم","شهادة الجودة"][purAttachModal.idx % 5]}
                </p>
                <p className="text-xs text-gray-400 mt-1">purchase_{purAttachModal.invNum}_p{purAttachModal.idx+1}.pdf</p>
                <button className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-all">
                  <Eye size={14}/> عرض الملف الكامل
                </button>
              </div>
              <div className="flex items-center justify-between mt-4">
                <button disabled={purAttachModal.idx===0}
                  onClick={()=>setPurAttachModal(p=>p?{...p,idx:p.idx-1}:p)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  <ChevronRight size={14}/> السابق
                </button>
                <div className="flex gap-1.5">
                  {Array.from({length:purAttachModal.total},(_,i)=>(
                    <button key={i} onClick={()=>setPurAttachModal(p=>p?{...p,idx:i}:p)}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${i===purAttachModal.idx?"bg-blue-600":"bg-gray-300"}`}/>
                  ))}
                </div>
                <button disabled={purAttachModal.idx===purAttachModal.total-1}
                  onClick={()=>setPurAttachModal(p=>p?{...p,idx:p.idx+1}:p)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  التالي <ChevronLeft size={14}/>
                </button>
              </div>
            </div>
            <div className="px-5 pb-4 flex gap-2 justify-end border-t border-gray-100 pt-3">
              <Btn size="sm"><Download size={12}/> تحميل</Btn>
              <Btn size="sm" variant="success" onClick={()=>{
                toggleVerify(purAttachModal.recId, `attach-${purAttachModal.idx}`);
                setPurAttachModal(null);
              }}><CheckSquare size={12}/> تم التحقق من المرفق</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simulated per-branch inventory data: current month vs previous month
const INV_BRANCH_DATA: Record<string, {item:string; cat:string; unit:string; prev:number; curr:number}[]> = {
  "فرع الرياض - العليا": [
    {item:"دجاج طازج",    cat:"بروتين",    unit:"كجم",   prev:50,   curr:48  },
    {item:"بطاطس",        cat:"خضروات",   unit:"كجم",   prev:80,   curr:85  },
    {item:"مشروبات غازية",cat:"مشروبات",  unit:"علبة",  prev:200,  curr:620 }, // anomaly: +210%
    {item:"زيت قلي",      cat:"زيوت",     unit:"لتر",   prev:30,   curr:28  },
    {item:"خبز برجر",     cat:"مخبوزات",  unit:"قطعة",  prev:300,  curr:290 },
  ],
  "فرع جدة - الحمراء": [
    {item:"دجاج طازج",    cat:"بروتين",    unit:"كجم",   prev:40,   curr:38  },
    {item:"بطاطس",        cat:"خضروات",   unit:"كجم",   prev:60,   curr:180 }, // anomaly: +200%
    {item:"ماء معدني",    cat:"مشروبات",  unit:"لتر",   prev:150,  curr:145 },
    {item:"مايونيز",      cat:"صوصات",    unit:"كجم",   prev:15,   curr:12  },
  ],
  "فرع مكة - المعابدة": [
    {item:"دجاج طازج",    cat:"بروتين",    unit:"كجم",   prev:35,   curr:1   }, // anomaly: -97%
    {item:"حليب طازج",    cat:"ألبان",     unit:"لتر",   prev:50,   curr:52  },
    {item:"طماطم",        cat:"خضروات",   unit:"كجم",   prev:20,   curr:18  },
    {item:"عصير برتقال",  cat:"مشروبات",  unit:"لتر",   prev:30,   curr:28  },
  ],
};

function AccInventory({ navigate, ops, approveOp, rejectOp, setModal, setDetailId, bulkApprove }:PageProps) {
  const [expandedBranch, setExpandedBranch] = useState<string|null>(null);
  const [dailyBranch,    setDailyBranch]    = useState<string|null>(null);
  const [invType,        setInvType]        = useState<"monthly"|"daily">("monthly");
  const [flaggedBranches,setFlaggedBranches]= useState<Set<string>>(new Set());
  const [branchConfirmed,setBranchConfirmed]= useState<Set<string>>(new Set());
  const [sentToConfirm,  setSentToConfirm]  = useState<Set<string>>(new Set());

  const toggleFlagged = (b:string) => setFlaggedBranches(p=>{ const s=new Set(p); s.has(b)?s.delete(b):s.add(b); return s; });
  const toggleConfirm = (b:string) => setBranchConfirmed(p=>{ const s=new Set(p); s.has(b)?s.delete(b):s.add(b); return s; });
  const sendConfirm   = (b:string) => setSentToConfirm(p=>new Set([...p,b]));

  /* ── Per-item flagging (monthly: accountant doubts specific items) ── */
  const [flaggedItems, setFlaggedItems] = useState<Record<string,number[]>>({});
  const [sentItemsBranch, setSentItemsBranch] = useState<Set<string>>(new Set());
  const toggleFlagItem = (branch:string, idx:number) =>
    setFlaggedItems(p=>{ const cur=p[branch]||[]; return {...p,[branch]:cur.includes(idx)?cur.filter(i=>i!==idx):[...cur,idx]}; });
  const sendFlaggedItems = (branch:string) => setSentItemsBranch(p=>new Set([...p,branch]));

  /* ── Daily inventory — multi-employee variance assignment (per branch) ── */
  type DVEmp = { empId:string; empName:string; amount:string };
  const INV_EMP: Record<string,string> = {
    "1001":"أحمد الشمري","1002":"محمد العبدلي","1003":"خالد النجار",
    "1004":"سعد الغامدي","1005":"عبدالرحمن السيف","1006":"فيصل الحربي",
  };
  const [dailyVarEmps, setDailyVarEmps] = useState<Record<string,DVEmp[]>>({});
  const getDailyEmps = (b:string): DVEmp[] => dailyVarEmps[b] || [{empId:"",empName:"",amount:""}];
  const setDailyEmps = (b:string, fn:(p:DVEmp[])=>DVEmp[]) =>
    setDailyVarEmps(p=>({...p,[b]:fn(getDailyEmps(b))}));
  const setDailyEmpField = (b:string, i:number, field:keyof DVEmp, val:string) =>
    setDailyEmps(b, p=>p.map((e,j)=>j===i?{...e,[field]:val,...(field==="empId"?{empName:INV_EMP[val]||""}:{})}:e));

  const invOps = ops.filter(o=>o.moduleKey==="inventory");
  const pendingInv = invOps.filter(o=>o.status==="pending");

  const exportExcel = (branch?:string) => { alert(branch?`تحميل Excel: جاري تنزيل جرد ${branch}...`:"تحميل Excel: جاري تنزيل جرد كل المطاعم..."); };

  // Count anomalies across all branches (change > 200% or < -50%)
  const anomalyCount = Object.values(INV_BRANCH_DATA).flat().filter(it=>{
    if(it.prev===0) return false;
    const pct = ((it.curr-it.prev)/it.prev)*100;
    return Math.abs(pct) > 100;
  }).length;

  // Which branches submitted inventory ops
  const branchesWithOps = [...new Set(invOps.map(o=>o.branch))];

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">موديول المخزون</h2>
          <p className="text-gray-400 text-sm mt-0.5">مراجعة الجرد اليومي والشهري لكل فرع — مقارنة ومعادلة مخزون</p>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={()=>exportExcel()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-all">
            <FileText size={12}/> Excel — كل المطاعم
          </button>
          <Btn variant="primary" size="sm" onClick={()=>navigate("acc-inventory-items")}><Package size={13}/> تحديد أصناف الجرد</Btn>
        </div>
      </div>

      {/* Brand/Restaurant search + Daily/Monthly toggle */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4" dir="rtl">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">بحث بالمطعم أو البراند</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Search size={13} className="text-gray-400 flex-shrink-0"/>
              <input placeholder="اسم المطعم أو العلامة التجارية..." className="flex-1 text-sm outline-none"/>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">العلامة التجارية</label>
            <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {["الكل","برغر خليفة","بيتزا باكو","وسطاوي"].map(b=><option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">نوع الجرد</label>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {([["monthly","الجرد الشهري"],["daily","الجرد اليومي"]] as const).map(([val,label])=>(
                <button key={val} onClick={()=>setInvType(val)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${invType===val?"bg-white text-gray-800 shadow-sm":"text-gray-500 hover:text-gray-700"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="بيانات الجرد المرفوعة" value={String(invOps.length)} sub="كل الفروع" icon={<Package size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label="قيد المراجعة" value={String(pendingInv.length)} sub="رُفعت من الفروع" icon={<Clock size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label="تنبيهات شذوذ" value={String(anomalyCount)} sub="تغيير > 100% عن الشهر السابق" icon={<AlertTriangle size={18} className="text-red-600"/>} accent="red"/>
        <KpiCard label="فروع مكتملة" value={String(branchesWithOps.length)} sub={`من أصل ${BRANCHES.length} فروع`} icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
      </div>

      {/* Branch-level inventory rows — Monthly or Daily view */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">
              {invType==="monthly" ? "الجرد الشهري — مقارنة الشهر الحالي بالسابق" : "الجرد اليومي — معادلة الجرد المخزوني"}
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {invType==="monthly"
                ? "موافقة · رفض · تعليم · إرسال تأكيد لمدير الفرع"
                : "رصيد الفتح + مشتريات − مبيعات ± تحويلات − هدر = رصيد الإغلاق"}
            </p>
          </div>
        </div>
        {BRANCHES.slice(0,4).map((branch,bi)=>{
          const branchOp  = invOps.find(o=>o.branch===branch);
          const items     = INV_BRANCH_DATA[branch] || [];
          const isExpanded  = expandedBranch===branch;
          const isDailyOpen = dailyBranch===branch;
          const isFlagged   = flaggedBranches.has(branch);
          const isConfirmed = branchConfirmed.has(branch);
          const isSent      = sentToConfirm.has(branch);
          const branchAnomalies = items.filter(it=>{
            if(it.prev===0) return false;
            return Math.abs(((it.curr-it.prev)/it.prev)*100) > 100;
          });
          return (
            <div key={bi} className="border-b border-gray-100 last:border-0">
              {/* Branch row */}
              <div className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50/70">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 text-sm">{branch}</span>
                    {branchAnomalies.length>0 && (
                      <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold border border-red-200">
                        ⚠ {branchAnomalies.length} شذوذ
                      </span>
                    )}
                    {branchOp && <Badge className={STATUS_CFG[branchOp.status].cls}>{STATUS_CFG[branchOp.status].label}</Badge>}
                    {!branchOp && <Badge className="bg-gray-100 text-gray-500">لم يُرفع بعد</Badge>}
                    {/* Monthly: flagged/confirmed indicators */}
                    {invType==="monthly" && isFlagged && (
                      <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold border border-purple-200 flex items-center gap-0.5">
                        🚩 علّمه المحاسب
                      </span>
                    )}
                    {invType==="monthly" && isConfirmed && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200 flex items-center gap-0.5">
                        ✅ أكّده مدير الفرع
                      </span>
                    )}
                    {invType==="monthly" && isSent && !isConfirmed && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-200">
                        📤 إشعار أُرسل
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{items.length} صنف · أُرسل {branchOp?.timeAgo||"—"}</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <button onClick={()=>exportExcel(branch)}
                    title={`تحميل Excel لـ ${branch}`}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-all flex items-center gap-1">
                    <FileText size={10}/> Excel
                  </button>
                  <Btn size="sm" onClick={()=>setExpandedBranch(isExpanded?null:branch)}>
                    {isExpanded?<ChevronUp size={12}/>:<ChevronDown size={12}/>} الأصناف
                  </Btn>
                  {invType==="daily" && (
                    <Btn size="sm" variant="primary" onClick={()=>setDailyBranch(isDailyOpen?null:branch)}>
                      <RefreshCw size={12}/> معادلة الجرد
                    </Btn>
                  )}
                  {invType==="monthly" && (() => {
                    const bFlagged = flaggedItems[branch]||[];
                    const bSent    = sentItemsBranch.has(branch);
                    return (
                      <>
                        <button onClick={()=>toggleFlagged(branch)}
                          title={isFlagged?"إلغاء التعليم":"تعليم بواسطة المحاسب"}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${isFlagged?"bg-purple-100 text-purple-700 border-purple-300":"bg-gray-50 text-gray-500 border-gray-200 hover:bg-purple-50"}`}>
                          🚩 {isFlagged?"مُعلَّم":"تعليم"}
                        </button>
                        {bFlagged.length>0 && !bSent && (
                          <Btn size="sm" onClick={()=>sendFlaggedItems(branch)}>
                            <Send size={11}/> إرسال تأكيد ({bFlagged.length} أصناف)
                          </Btn>
                        )}
                        {bSent && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded-lg border border-amber-200 font-semibold">
                            📤 أُرسل ({sentItemsBranch.has(branch) ? (flaggedItems[branch]||[]).length : 0} أصناف)
                          </span>
                        )}
                        <button onClick={()=>toggleConfirm(branch)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${isConfirmed?"bg-emerald-100 text-emerald-700 border-emerald-300":"bg-gray-50 text-gray-500 border-gray-200 hover:bg-emerald-50"}`}>
                          <CheckCircle2 size={11}/> {isConfirmed?"أكّده الفرع":"تسجيل تأكيد"}
                        </button>
                      </>
                    );
                  })()}
                  {branchOp?.status==="pending" && <>
                    <Btn size="sm" variant="success" onClick={()=>approveOp(branchOp.id)}><ThumbsUp size={12}/></Btn>
                    <Btn size="sm" variant="danger" onClick={()=>{ setDetailId(branchOp.id); setModal("reject"); }}><ThumbsDown size={12}/></Btn>
                  </>}
                </div>
              </div>

              {/* Inventory items drill-down — month comparison + anomaly detection */}
              {isExpanded && items.length>0 && (
                <div className="px-5 pb-4 bg-gray-50/50">
                  <table className="w-full border border-gray-100 rounded-xl overflow-hidden text-xs mt-2" dir="rtl">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-right">الصنف</th>
                        <th className="px-3 py-2 text-center">الفئة</th>
                        <th className="px-3 py-2 text-center">الشهر السابق</th>
                        <th className="px-3 py-2 text-center">الشهر الحالي</th>
                        <th className="px-3 py-2 text-center">الفرق</th>
                        <th className="px-3 py-2 text-center">الحالة</th>
                        {invType==="monthly" && <th className="px-3 py-2 text-center bg-amber-50/60 text-amber-700">🚩 شك</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {items.map((it,j)=>{
                        const diff   = it.curr - it.prev;
                        const pct    = it.prev>0 ? Math.round((diff/it.prev)*100) : 0;
                        const isAnomaly = Math.abs(pct) > 100;
                        const isFlaggedItem = (flaggedItems[branch]||[]).includes(j);
                        return (
                          <tr key={j} className={`${isAnomaly?"bg-red-50/40":""} ${isFlaggedItem?"bg-amber-50/30":""}`}>
                            <td className="px-3 py-2 font-semibold text-gray-800">{it.item}</td>
                            <td className="px-3 py-2 text-center text-gray-500">{it.cat}</td>
                            <td className="px-3 py-2 text-center font-mono text-gray-500">{it.prev} {it.unit}</td>
                            <td className="px-3 py-2 text-center font-mono font-bold text-gray-800">{it.curr} {it.unit}</td>
                            <td className={`px-3 py-2 text-center font-mono font-bold ${diff>0?"text-emerald-600":diff<0?"text-red-600":"text-gray-400"}`}>
                              {diff>0?"+":""}{diff} ({pct>0?"+":""}{pct}%)
                            </td>
                            <td className="px-3 py-2 text-center">
                              {isAnomaly
                                ? <span className="inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold border border-red-200">⚠ شذوذ محتمل</span>
                                : <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">طبيعي</span>}
                            </td>
                            {invType==="monthly" && (
                              <td className="px-3 py-2 text-center bg-amber-50/20">
                                <button onClick={()=>toggleFlagItem(branch, j)}
                                  title={isFlaggedItem?"إلغاء التعليم":"علّم هذا الصنف للتأكيد"}
                                  className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto transition-all text-sm ${
                                    isFlaggedItem
                                      ? "bg-amber-500 text-white shadow-sm"
                                      : "border-2 border-dashed border-gray-300 text-gray-300 hover:border-amber-400 hover:text-amber-400"
                                  }`}>
                                  🚩
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {branchAnomalies.length>0 && (
                    <div className="mt-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                      <p className="text-xs text-red-700 font-semibold">⚠ تنبيه شذوذ — {branchAnomalies.length} أصناف تجاوزت 100% تغيير عن الشهر السابق. يُوصى بالمراجعة قبل الموافقة.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Daily inventory formula — only in daily mode */}
              {isDailyOpen && invType==="daily" && (() => {
                const DEFICIT = 360;
                const ACTUAL  = 6340;
                const empList = getDailyEmps(branch);
                const assignedTotal = empList.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
                const remaining = DEFICIT - assignedTotal;
                return (
                  <div className="px-5 pb-4 bg-indigo-50/30">
                    <p className="text-[11px] font-bold text-indigo-700 mb-2 pt-2">معادلة الجرد اليومي — {branch}</p>
                    <div className="bg-white rounded-xl border border-indigo-100 p-4" dir="rtl">
                      <div className="space-y-2 text-sm">
                        {[
                          {label:"رصيد الفتح (أمس)",         val:12400, sign:"",  cls:"text-gray-800" },
                          {label:"+ مشتريات اليوم",           val:3200,  sign:"+", cls:"text-emerald-700"},
                          {label:"− مبيعات اليوم",            val:8700,  sign:"−", cls:"text-red-600"  },
                          {label:"+ تحويلات واردة",           val:500,   sign:"+", cls:"text-blue-700"  },
                          {label:"− تحويلات صادرة",           val:700,   sign:"−", cls:"text-orange-600"},
                          {label:"− الهدر والتالف",           val:360,   sign:"−", cls:"text-rose-600"  },
                        ].map((row,k)=>(
                          <div key={k} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                            <span className={`font-medium ${row.cls}`}>{row.label}</span>
                            <span className={`font-mono font-bold ${row.cls}`}>{row.sign}{fmtAmt(Math.abs(row.val))} ر.س</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-2 border-t-2 border-indigo-200 mt-1">
                          <span className="font-bold text-gray-900">= رصيد الإغلاق المحاسبي</span>
                          <span className="font-black text-indigo-700 font-mono">{fmtAmt(12400+3200-8700+500-700-360)} ر.س</span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="font-medium text-gray-700">رصيد الجرد الفعلي</span>
                          <span className="font-mono font-bold text-gray-800">{fmtAmt(ACTUAL)} ر.س</span>
                        </div>
                        <div className="flex items-center justify-between py-1 bg-red-50/60 -mx-2 px-2 rounded-lg">
                          <span className="font-bold text-red-700">عجز مُكتشف</span>
                          <span className="font-black text-red-700 font-mono">−{fmtAmt(DEFICIT)} ر.س</span>
                        </div>
                      </div>

                      {/* Multi-employee variance assignment */}
                      <div className="mt-4 pt-3 border-t border-indigo-100">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-gray-700">تحميل العجز على الموظفين</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${remaining===0?"bg-emerald-100 text-emerald-700":remaining<0?"bg-red-100 text-red-700":"bg-amber-100 text-amber-700"}`}>
                            {remaining===0?"متوازن":remaining>0?`متبقٍّ: ${fmtAmt(remaining)} ر.س`:`زيادة: ${fmtAmt(Math.abs(remaining))} ر.س`}
                          </span>
                        </div>

                        {/* Pre-reported from branch manager (read-only) */}
                        <div className="mb-2 p-2 bg-blue-50 border border-blue-100 rounded-lg">
                          <p className="text-[10px] text-blue-600 font-semibold mb-1">📋 ورد من مدير الفرع</p>
                          <div className="flex items-center justify-between text-xs text-blue-800 bg-white/70 px-2 py-1 rounded-lg">
                            <span>خالد النجار (1003)</span>
                            <span className="font-mono font-bold">−220 ر.س</span>
                          </div>
                        </div>

                        {/* Editable employee rows */}
                        <div className="space-y-2">
                          {empList.map((emp,ei)=>(
                            <div key={ei} className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-rose-700">{ei+1}</div>
                              <input value={emp.empId} onChange={e=>setDailyEmpField(branch,ei,"empId",e.target.value)}
                                placeholder="رقم الموظف"
                                className="w-28 text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-center font-mono"/>
                              <input value={emp.empName} readOnly
                                placeholder="الاسم تلقائياً"
                                className="flex-1 text-xs border border-gray-100 rounded-lg px-2 py-1.5 bg-gray-50 text-gray-600"/>
                              <input value={emp.amount} onChange={e=>setDailyEmpField(branch,ei,"amount",e.target.value)}
                                placeholder="المبلغ"
                                type="number"
                                className="w-24 text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-center font-mono"/>
                              <span className="text-[10px] text-gray-400 flex-shrink-0">ر.س</span>
                              {empList.length>1 && (
                                <button onClick={()=>setDailyEmps(branch,p=>p.filter((_,j)=>j!==ei))}
                                  className="text-gray-300 hover:text-red-400 transition-colors"><X size={12}/></button>
                              )}
                              {ei===empList.length-1 && remaining>0 && (
                                <button onClick={()=>setDailyEmpField(branch,ei,"amount",String(remaining))}
                                  title="تعبئة المتبقي"
                                  className="text-[10px] px-1.5 py-1 bg-rose-100 text-rose-600 rounded font-bold hover:bg-rose-200 flex-shrink-0">⚡</button>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={()=>setDailyEmps(branch,p=>[...p,{empId:"",empName:"",amount:""}])}
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                            <Plus size={11}/> إضافة موظف آخر
                          </button>
                          <div className="flex-1"/>
                          <Btn size="sm" variant="danger"
                            disabled={remaining!==0}
                            className={remaining!==0?"opacity-40 cursor-not-allowed":""}>
                            تأكيد التحميل
                          </Btn>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AccInventoryItems({ navigate }:PageProps) {
  const BRAND_CATALOG: Record<string,{name:string;cat:string;unit:string}[]> = {
    "برغر خليفة": [
      {name:"دجاج طازج",cat:"بروتين",unit:"كجم"},{name:"لحم برجر",cat:"بروتين",unit:"كجم"},
      {name:"خبز برجر",cat:"مخبوزات",unit:"قطعة"},{name:"جبنة شيدر",cat:"ألبان",unit:"شريحة"},
      {name:"طماطم",cat:"خضروات",unit:"كجم"},{name:"خس",cat:"خضروات",unit:"كجم"},
      {name:"بطاطس",cat:"خضروات",unit:"كجم"},{name:"بصل",cat:"خضروات",unit:"كجم"},
      {name:"صوص برجر خاص",cat:"صوصات",unit:"كجم"},{name:"مايونيز",cat:"صوصات",unit:"كجم"},
      {name:"كاتشب",cat:"صوصات",unit:"كجم"},{name:"زيت قلي",cat:"زيوت",unit:"لتر"},
      {name:"مشروبات غازية",cat:"مشروبات",unit:"علبة"},{name:"ماء معدني",cat:"مشروبات",unit:"لتر"},
    ],
    "بيتزا باكو": [
      {name:"عجينة البيتزا",cat:"مخبوزات",unit:"كجم"},{name:"صوص الطماطم",cat:"صوصات",unit:"كجم"},
      {name:"جبنة موزاريلا",cat:"ألبان",unit:"كجم"},{name:"فلفل رومي",cat:"خضروات",unit:"كجم"},
      {name:"مشروم",cat:"خضروات",unit:"كجم"},{name:"دجاج مشوي",cat:"بروتين",unit:"كجم"},
      {name:"لحم مدخن",cat:"بروتين",unit:"كجم"},{name:"زيت زيتون",cat:"زيوت",unit:"لتر"},
      {name:"أوريجانو",cat:"توابل",unit:"كجم"},{name:"ثوم",cat:"خضروات",unit:"كجم"},
      {name:"مشروبات غازية",cat:"مشروبات",unit:"علبة"},{name:"ماء معدني",cat:"مشروبات",unit:"لتر"},
    ],
    "وسطاوي": [
      {name:"أرز بسمتي",cat:"حبوب",unit:"كجم"},{name:"دجاج طازج",cat:"بروتين",unit:"كجم"},
      {name:"لحم ضأن",cat:"بروتين",unit:"كجم"},{name:"بهارات مشوي",cat:"توابل",unit:"كجم"},
      {name:"طماطم",cat:"خضروات",unit:"كجم"},{name:"بصل",cat:"خضروات",unit:"كجم"},
      {name:"ثوم",cat:"خضروات",unit:"كجم"},{name:"زيت نباتي",cat:"زيوت",unit:"لتر"},
      {name:"حليب طازج",cat:"ألبان",unit:"لتر"},{name:"خبز تنور",cat:"مخبوزات",unit:"قطعة"},
      {name:"ليمون",cat:"فواكه",unit:"كجم"},{name:"مشروبات غازية",cat:"مشروبات",unit:"علبة"},
    ],
  };
  const BRAND_BRANCHES: Record<string,string[]> = {
    "برغر خليفة": ["فرع الرياض - العليا","فرع الرياض - النزهة","فرع جدة - الحمراء","فرع الدمام - الكورنيش"],
    "بيتزا باكو": ["فرع الرياض - الصحافة","فرع جدة - العزيزية","فرع مكة - العزيزية"],
    "وسطاوي": ["فرع الرياض - المغرزات","فرع مكة - المعابدة","فرع جدة - الرحاب"],
  };
  const MONTHLY_DIFF: Record<string,Record<string,{prev:number;curr:number;pct:number}>> = {
    "فرع الرياض - العليا":    {"دجاج طازج":{prev:120,curr:89,pct:26},"بطاطس":{prev:80,curr:51,pct:36},"زيت قلي":{prev:40,curr:27,pct:33},"مايونيز":{prev:15,curr:19,pct:27}},
    "فرع الرياض - النزهة":    {"خبز برجر":{prev:500,curr:340,pct:32},"جبنة شيدر":{prev:30,curr:21,pct:30}},
    "فرع جدة - الحمراء":      {"كاتشب":{prev:20,curr:13,pct:35},"صوص برجر خاص":{prev:18,curr:11,pct:39}},
    "فرع الدمام - الكورنيش":  {"لحم برجر":{prev:25,curr:16,pct:36}},
    "فرع الرياض - الصحافة":   {"عجينة البيتزا":{prev:60,curr:39,pct:35},"جبنة موزاريلا":{prev:25,curr:16,pct:36}},
    "فرع جدة - العزيزية":     {"دجاج مشوي":{prev:18,curr:11,pct:39}},
    "فرع مكة - العزيزية":     {"صوص الطماطم":{prev:12,curr:7,pct:42},"مشروم":{prev:10,curr:6,pct:40}},
    "فرع الرياض - المغرزات":  {"أرز بسمتي":{prev:80,curr:52,pct:35},"دجاج طازج":{prev:40,curr:26,pct:35}},
    "فرع مكة - المعابدة":     {"لحم ضأن":{prev:22,curr:13,pct:41}},
    "فرع جدة - الرحاب":       {"خبز تنور":{prev:300,curr:190,pct:37},"بهارات مشوي":{prev:8,curr:5,pct:38}},
  };
  const brands = Object.keys(BRAND_CATALOG);
  const [selBrand, setSelBrand] = useState(brands[0]);
  const [selBranch, setSelBranch] = useState(BRAND_BRANCHES[brands[0]][0]);
  const [catFilter, setCatFilter] = useState("الكل");
  const [saving, setSaving] = useState(false);
  const [savedBranch, setSavedBranch] = useState<string|null>(null);
  const FLAG_PCT = 25;

  const initDailyLists = (): Record<string,string[]> => {
    const r: Record<string,string[]> = {};
    Object.values(BRAND_BRANCHES).flat().forEach(br=>{ r[br]=[]; });
    r["فرع الرياض - العليا"] = ["دجاج طازج","بطاطس","زيت قلي","كاتشب","مشروبات غازية"];
    r["فرع الرياض - النزهة"] = ["خبز برجر","جبنة شيدر","طماطم"];
    r["فرع الرياض - الصحافة"] = ["عجينة البيتزا","جبنة موزاريلا","مشروبات غازية"];
    r["فرع الرياض - المغرزات"] = ["أرز بسمتي","دجاج طازج","خبز تنور"];
    return r;
  };
  const [dailyLists, setDailyLists] = useState<Record<string,string[]>>(initDailyLists);

  const catalog = BRAND_CATALOG[selBrand]||[];
  const cats = ["الكل",...new Set(catalog.map(i=>i.cat))];
  const shown = catFilter==="الكل" ? catalog : catalog.filter(i=>i.cat===catFilter);
  const dailyList = dailyLists[selBranch]||[];
  const branchDiffs = MONTHLY_DIFF[selBranch]||{};
  const isFlagged = (name:string) => !!(branchDiffs[name] && branchDiffs[name].pct >= FLAG_PCT);
  const flaggedNotInDaily = catalog.filter(i=>isFlagged(i.name) && !dailyList.includes(i.name));

  const toggleItem = (name:string) => {
    setSavedBranch(null);
    setDailyLists(p=>({ ...p, [selBranch]: p[selBranch]?.includes(name) ? p[selBranch].filter(x=>x!==name) : [...(p[selBranch]||[]),name] }));
  };
  const addAllFlagged = () => {
    setSavedBranch(null);
    setDailyLists(p=>({ ...p, [selBranch]: [...new Set([...(p[selBranch]||[]),...flaggedNotInDaily.map(i=>i.name)])] }));
  };
  const save = () => {
    setSaving(true);
    setTimeout(()=>{ setSaving(false); setSavedBranch(selBranch); }, 800);
  };

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{label:"لوحة التحكم",onClick:()=>navigate("acc-dashboard")},{label:"المخزون",onClick:()=>navigate("acc-inventory")},{label:"تحديد الأصناف"}]}/>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">تحديد أصناف الجرد اليومي — حسب الفرع</h2>
          <p className="text-gray-400 text-sm mt-0.5">كل فرع له قائمة أصناف مستقلة · الأصناف بفروقات شهرية كبيرة (&gt;25%) تُعلَّم بـ ⚡ للإضافة السريعة</p>
        </div>
        <Btn variant="primary" onClick={save} className={saving?"opacity-70 cursor-not-allowed":""}>
          {saving?<RefreshCw size={13} className="animate-spin"/>:<RefreshCw size={13}/>}
          {saving?"جاري الحفظ...":"حفظ وتحديث الفرع فوراً"}
        </Btn>
      </div>

      {savedBranch && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0"/>
          <div>
            <p className="text-emerald-800 font-semibold text-sm">تم الحفظ والإرسال بنجاح!</p>
            <p className="text-emerald-600 text-xs">تم إرسال {dailyList.length} صنف إلى تطبيق مدير {savedBranch} مع إشعار فوري.</p>
          </div>
          <button onClick={()=>setSavedBranch(null)} className="mr-auto text-emerald-400 hover:text-emerald-600"><X size={14}/></button>
        </div>
      )}

      {/* Brand + Branch selector */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
        <div>
          <p className="text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">العلامة التجارية</p>
          <div className="flex gap-2 flex-wrap">
            {brands.map(b=>(
              <button key={b} onClick={()=>{ setSelBrand(b); setSelBranch(BRAND_BRANCHES[b][0]); setCatFilter("الكل"); setSavedBranch(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${selBrand===b?"border-purple-500 bg-purple-50 text-purple-700":"border-gray-200 bg-white text-gray-600 hover:border-purple-200"}`}>
                {b}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selBrand===b?"bg-purple-100 text-purple-600":"bg-gray-100 text-gray-400"}`}>{BRAND_BRANCHES[b].length} فروع</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">الفرع</p>
          <div className="flex flex-wrap gap-2">
            {BRAND_BRANCHES[selBrand].map(br=>{
              const brDaily = dailyLists[br]||[];
              const brDiffs = MONTHLY_DIFF[br]||{};
              const brFlaggedCount = BRAND_CATALOG[selBrand].filter(i=>brDiffs[i.name]&&brDiffs[i.name].pct>=FLAG_PCT&&!brDaily.includes(i.name)).length;
              return (
                <button key={br} onClick={()=>{ setSelBranch(br); setCatFilter("الكل"); setSavedBranch(null); }}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${selBranch===br?"border-purple-500 bg-purple-50 text-purple-700":"border-gray-200 bg-white text-gray-600 hover:border-purple-200"}`}>
                  <span>{br.replace("فرع ","ف. ")}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${selBranch===br?"bg-purple-100 text-purple-700":"bg-gray-100 text-gray-500"}`}>{brDaily.length} صنف</span>
                  {brFlaggedCount>0 && (
                    <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">{brFlaggedCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Flagged alert */}
      {flaggedNotInDaily.length>0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5"/>
            <div className="flex-1">
              <p className="text-amber-800 font-semibold text-sm">⚡ {flaggedNotInDaily.length} أصناف بفروقات شهرية عالية في {selBranch.replace("فرع ","")}</p>
              <p className="text-amber-600 text-xs mt-0.5">تجاوزت فروقاتها في الجرد الشهري 25% — يُنصح بإضافتها للجرد اليومي لمتابعة أدق</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {flaggedNotInDaily.map(i=>(
                  <button key={i.name} onClick={()=>toggleItem(i.name)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-300 text-amber-800 text-xs font-medium hover:bg-amber-200 transition-all">
                    ⚡ {i.name}
                    <span className="text-amber-600 text-[9px] font-bold">(-{branchDiffs[i.name].pct}%)</span>
                    <Plus size={10} className="text-amber-700"/>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={addAllFlagged}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-all whitespace-nowrap">
              إضافة الكل ⚡
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        {/* Left: catalog */}
        <div className="col-span-2 space-y-3">
          <div className="flex gap-2 flex-wrap">
            {cats.map(c=>(
              <button key={c} onClick={()=>setCatFilter(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${catFilter===c?"bg-purple-600 text-white":"bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
                {c}
              </button>
            ))}
          </div>
          <Card title={`كتالوج ${selBrand} — ${shown.length} صنف`} actions={
            <div className="flex gap-3">
              <button onClick={()=>{ setSavedBranch(null); setDailyLists(p=>({...p,[selBranch]:catalog.map(i=>i.name)})); }} className="text-xs text-purple-600 hover:underline">تحديد الكل</button>
              <button onClick={()=>{ setSavedBranch(null); setDailyLists(p=>({...p,[selBranch]:[]})); }} className="text-xs text-red-500 hover:underline">إلغاء الكل</button>
            </div>
          }>
            <div className="p-4 grid grid-cols-2 gap-2.5">
              {shown.map(item=>{
                const isSelected = dailyList.includes(item.name);
                const flagged = isFlagged(item.name);
                const diffData = branchDiffs[item.name];
                return (
                  <button key={item.name} onClick={()=>toggleItem(item.name)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-right ${isSelected?"border-purple-300 bg-purple-50/70":flagged?"border-amber-300 bg-amber-50/50 hover:border-amber-400":"border-gray-100 bg-white hover:border-gray-200"}`}>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${isSelected?"bg-purple-600":flagged?"bg-amber-400":"bg-gray-100"}`}>
                      {isSelected ? <Check size={12} className="text-white"/> : flagged ? <span className="text-white text-[10px] font-bold">⚡</span> : null}
                    </div>
                    <div className="text-right flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {item.cat} · {item.unit}
                        {flagged && <span className="text-amber-600 font-bold"> · ⚡ فرق {diffData.pct}%</span>}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right: daily list + monthly diff */}
        <div className="space-y-3">
          <Card title={`جرد ${selBranch.replace("فرع ","")}`} actions={<Badge className="bg-purple-100 text-purple-700 font-bold">{dailyList.length} صنف يومياً</Badge>}>
            <div className="p-4">
              {dailyList.length===0
                ? <EmptyState icon="📦" title="لم يتم اختيار أصناف" desc="اختر من الكتالوج على اليسار"/>
                : <div className="space-y-1 mb-3 max-h-52 overflow-y-auto">
                    {dailyList.map((n,i)=>{
                      const flagged = isFlagged(n);
                      return (
                        <div key={n} className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors group ${flagged?"bg-amber-50/70 hover:bg-amber-50":"hover:bg-gray-50"}`}>
                          <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
                          <span className="text-sm text-gray-700 flex-1">{n}</span>
                          {flagged && <span className="text-[10px] text-amber-600 font-semibold">⚡</span>}
                          <button onClick={()=>toggleItem(n)} className="text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"><X size={13}/></button>
                        </div>
                      );
                    })}
                  </div>
              }
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 mb-3">
                <p className="text-[10px] text-blue-600">⚡ مُعلَّم = فروقات شهرية كبيرة · يُرسَل فورياً للموبايل</p>
              </div>
              <Btn variant="primary" className="w-full justify-center" onClick={save}>
                <RefreshCw size={13}/> {saving?"جاري الإرسال...":"تحديث الفرع فوراً"}
              </Btn>
            </div>
          </Card>

          {Object.keys(branchDiffs).length>0 && (
            <Card title="فروقات الجرد الشهري">
              <div className="p-3 space-y-2">
                {Object.entries(branchDiffs).map(([name,d])=>(
                  <div key={name} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700 truncate">{name}</p>
                      <p className="text-[10px] text-gray-400">{d.prev} → {d.curr} {catalog.find(i=>i.name===name)?.unit||""}</p>
                    </div>
                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${d.pct>=35?"bg-red-100 text-red-700":"bg-amber-100 text-amber-700"}`}>-{d.pct}%</div>
                    {dailyList.includes(name)
                      ? <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0"/>
                      : <button onClick={()=>toggleItem(name)} className="text-amber-500 hover:text-amber-700 flex-shrink-0 transition-colors"><Plus size={14}/></button>
                    }
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Shift Setup Helpers & Types ──────────────────────────────────────────────
const SHIFT_NAMES_AR  = ["الأول","الثاني","الثالث","الرابع","الخامس"];
const S_DUR_OPTS      = [4,6,8,10,12];
const sToMins  = (t:string) => { const [h,m]=(t||"00:00").split(":").map(Number); return h*60+(m||0); };
const sAddMins = (t:string, n:number) => { const tot=(sToMins(t)+n+1440)%1440; return `${String(Math.floor(tot/60)).padStart(2,"0")}:${String(tot%60).padStart(2,"0")}`; };
const sFmtT    = (t:string) => { if(!t||!t.includes(":")) return t; const [h,m]=t.split(":").map(Number); const ap=h<12?"ص":"م"; const h12=h===0?12:h>12?h-12:h; return `${h12}:${String(m).padStart(2,"0")} ${ap}`; };
type ShiftSlot      = { name:string; start:string; end:string; durH:number };
type RestShiftCfg   = { restId:string; restName:string; useOverride:boolean; numShifts:number; durH:number; firstStart:string; shifts:ShiftSlot[] };
type BrandShiftState= { id:string; name:string; color:string; numShifts:number; durH:number; firstStart:string; shifts:ShiftSlot[]; rests:RestShiftCfg[]; saved:boolean };
type ShiftEditState = { idx:number; tmpStart:string; tmpDurH:number } | null;
const sGenShifts = (num:number, dur:number, start:string): ShiftSlot[] =>
  Array.from({length:num},(_,i)=>{ const s=sAddMins(start,i*dur*60); return { name:SHIFT_NAMES_AR[i], start:s, end:sAddMins(s,dur*60), durH:dur }; });
const sInitBrand = (b:typeof BRANDS_CATALOG[0]): BrandShiftState => {
  const p:{[k:string]:{numShifts:number;durH:number;firstStart:string}} = {
    reem:{numShifts:3,durH:8,firstStart:"08:00"}, herfy:{numShifts:2,durH:10,firstStart:"07:00"},
    mcd:{numShifts:4,durH:6,firstStart:"06:00"},  broasted:{numShifts:1,durH:8,firstStart:"09:00"},
  };
  const cfg=p[b.id]||{numShifts:2,durH:8,firstStart:"08:00"};
  return { id:b.id, name:b.name, color:b.color, ...cfg, shifts:sGenShifts(cfg.numShifts,cfg.durH,cfg.firstStart),
    rests:b.restaurants.map(r=>({restId:r.id,restName:r.name,useOverride:false,...cfg,shifts:sGenShifts(cfg.numShifts,cfg.durH,cfg.firstStart)})), saved:false };
};

// ─── ShiftRow (module-level, no hooks-in-component violation) ─────────────────
function ShiftRowCmp({ slot,idx,editState,onEditOpen,onEditChange,onEditCommit,onEditCancel }:{
  slot:ShiftSlot; idx:number; editState:ShiftEditState;
  onEditOpen:(idx:number,start:string,dur:number)=>void;
  onEditChange:(start:string,dur:number)=>void;
  onEditCommit:()=>void;
  onEditCancel:()=>void;
}) {
  const isEditing = editState?.idx===idx;
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${isEditing?"bg-purple-50 border-purple-200 shadow-sm":"bg-gray-50 border-gray-100 hover:border-gray-200"}`}>
      <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-[10px] font-black flex items-center justify-center flex-shrink-0">{idx+1}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-700">الشفت {slot.name}</p>
        {!isEditing
          ? <p className="text-[10px] text-gray-400">{sFmtT(slot.start)} ← {sFmtT(slot.end)} · {slot.durH} ساعة</p>
          : <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <div>
                <label className="text-[9px] text-purple-500 font-semibold block mb-0.5">بداية الشفت</label>
                <input type="time" value={editState!.tmpStart} onChange={e=>onEditChange(e.target.value,editState!.tmpDurH)}
                  className="text-xs border border-purple-200 rounded-lg px-2 py-1 w-28 font-mono bg-white"/>
              </div>
              <div>
                <label className="text-[9px] text-purple-500 font-semibold block mb-0.5">مدة (ساعة)</label>
                <select value={editState!.tmpDurH} onChange={e=>onEditChange(editState!.tmpStart,+e.target.value)}
                  className="text-xs border border-purple-200 rounded-lg px-2 py-1 bg-white">
                  {S_DUR_OPTS.map(d=><option key={d} value={d}>{d} ساعة</option>)}
                </select>
              </div>
              <div className="flex gap-1 self-end pb-px">
                <button onClick={onEditCommit} className="px-3 py-1 bg-purple-600 text-white text-[10px] rounded-lg font-bold hover:bg-purple-700">حفظ</button>
                <button onClick={onEditCancel} className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] rounded-lg hover:bg-gray-200">إلغاء</button>
              </div>
            </div>
        }
      </div>
      {!isEditing && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] font-mono bg-white border border-gray-200 px-2 py-1 rounded-lg text-gray-700">{sFmtT(slot.start)}</span>
          <span className="text-gray-300 text-[10px]">→</span>
          <span className="text-[10px] font-mono bg-white border border-gray-200 px-2 py-1 rounded-lg text-gray-700">{sFmtT(slot.end)}</span>
          <button onClick={()=>onEditOpen(idx,slot.start,slot.durH)}
            className="w-7 h-7 rounded-lg border border-gray-200 bg-white text-gray-400 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 flex items-center justify-center transition-all ml-1">
            <Edit3 size={11}/>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── SmartPanel (module-level, pure presentational) ────────────────────────────
function ShiftSmartPanel({ cfg, onNum, onDur, onStart, onGen }:{
  cfg:{numShifts:number;durH:number;firstStart:string};
  onNum:(n:number)=>void; onDur:(d:number)=>void; onStart:(s:string)=>void; onGen:()=>void;
}) {
  return (
    <div className="bg-gradient-to-l from-purple-50 to-blue-50 border border-purple-100 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">⚡</span>
        <p className="text-sm font-bold text-purple-800">الإعداد الذكي للشفتات</p>
        <span className="text-[10px] text-purple-400 mr-auto">يتحدث الجدول تلقائياً عند تغيير القيم</span>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <label className="text-[10px] font-bold text-gray-600 block mb-1.5">عدد الشفتات</label>
          <div className="flex items-center gap-1">
            <button onClick={()=>onNum(Math.max(1,cfg.numShifts-1))} className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-lg font-bold select-none">−</button>
            <span className="w-10 h-8 rounded-lg border border-purple-200 bg-white text-center text-sm font-black text-purple-700 flex items-center justify-center">{cfg.numShifts}</span>
            <button onClick={()=>onNum(Math.min(5,cfg.numShifts+1))} className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 flex items-center justify-center text-lg font-bold select-none">+</button>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-600 block mb-1.5">مدة كل شفت</label>
          <select value={cfg.durH} onChange={e=>onDur(+e.target.value)} className="w-full text-xs border border-gray-200 bg-white rounded-lg px-2 py-2">
            {S_DUR_OPTS.map(d=><option key={d} value={d}>{d} ساعة</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-600 block mb-1.5">بداية الشفت الأول</label>
          <input type="time" value={cfg.firstStart} onChange={e=>onStart(e.target.value)} className="w-full text-xs border border-gray-200 bg-white rounded-lg px-2 py-2 font-mono"/>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400">{cfg.numShifts} شفت × {cfg.durH}س = <span className="font-semibold text-gray-600">{cfg.numShifts*cfg.durH} ساعة/يوم</span> · يبدأ {sFmtT(cfg.firstStart)}</p>
        <button onClick={onGen} className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition-all shadow-sm">
          <RefreshCw size={11}/> إعادة التوليد
        </button>
      </div>
    </div>
  );
}

function AccShifts({ navigate, setModal }:PageProps) {
  const [tab, setTab] = useState<"live"|"setup"|"close"|"history">("live");
  const [closeForm, setCloseForm] = useState({cashInDrawer:"",salesSystem:"",notes:"",branch:"فرع الرياض - العليا"});
  const [closeSent, setCloseSent] = useState(false);

  // ─── Shift Setup state ─────────────────────────────────────────────────────
  const [brandCfgs,  setBrandCfgs]  = useState<BrandShiftState[]>(()=>BRANDS_CATALOG.map(sInitBrand));
  const [selBrandId, setSelBrandId] = useState(BRANDS_CATALOG[0].id);
  const [expandedRest,setExpandedRest] = useState<string|null>(null);
  const [brandEdit,  setBrandEdit]  = useState<ShiftEditState>(null);
  const [restEdits,  setRestEdits]  = useState<Record<string,ShiftEditState>>({});
  const [savedBrand, setSavedBrand] = useState<string|null>(null);
  const [restSearch, setRestSearch] = useState("");

  const selBrand = brandCfgs.find(b=>b.id===selBrandId)!;

  const updBrand = (id:string, patch:Partial<BrandShiftState>) =>
    setBrandCfgs(p=>p.map(b=>b.id===id?{...b,...patch,saved:false}:b));
  const updRest  = (brandId:string, restId:string, patch:Partial<RestShiftCfg>) =>
    setBrandCfgs(p=>p.map(b=>b.id===brandId?{...b,rests:b.rests.map(r=>r.restId===restId?{...r,...patch}:r)}:b));

  const doAutoGen     = (bId:string) => { const b=brandCfgs.find(x=>x.id===bId)!; updBrand(bId,{shifts:sGenShifts(b.numShifts,b.durH,b.firstStart)}); setBrandEdit(null); };
  const doRestAutoGen = (bId:string, rId:string) => { const r=brandCfgs.find(x=>x.id===bId)!.rests.find(x=>x.restId===rId)!; updRest(bId,rId,{shifts:sGenShifts(r.numShifts,r.durH,r.firstStart)}); setRestEdits(p=>({...p,[rId]:null})); };
  const doSave        = (bId:string) => { setBrandCfgs(p=>p.map(b=>b.id===bId?{...b,saved:true}:b)); setSavedBrand(bId); setTimeout(()=>setSavedBrand(null),2200); };

  // Brand-level shift edit handlers
  const brandEditOpen   = (idx:number,s:string,d:number) => setBrandEdit({idx,tmpStart:s,tmpDurH:d});
  const brandEditChange = (s:string,d:number) => setBrandEdit(p=>p?{...p,tmpStart:s,tmpDurH:d}:p);
  const brandEditCommit = () => { if(!brandEdit) return; const {idx,tmpStart,tmpDurH}=brandEdit; updBrand(selBrandId,{shifts:selBrand.shifts.map((x,j)=>j===idx?{...x,start:tmpStart,end:sAddMins(tmpStart,tmpDurH*60),durH:tmpDurH}:x)}); setBrandEdit(null); };

  // Rest-level shift edit handlers
  const restEditOpen   = (rId:string,idx:number,s:string,d:number) => setRestEdits(p=>({...p,[rId]:{idx,tmpStart:s,tmpDurH:d}}));
  const restEditChange = (rId:string,s:string,d:number) => setRestEdits(p=>({...p,[rId]:p[rId]?{...p[rId]!,tmpStart:s,tmpDurH:d}:null}));
  const restEditCommit = (bId:string,rId:string,slots:ShiftSlot[]) => {
    const e=restEdits[rId]; if(!e) return;
    updRest(bId,rId,{shifts:slots.map((x,j)=>j===e.idx?{...x,start:e.tmpStart,end:sAddMins(e.tmpStart,e.tmpDurH*60),durH:e.tmpDurH}:x)});
    setRestEdits(p=>({...p,[rId]:null}));
  };

  const liveShifts = [
    { name:"خالد الشمري", role:"مشرف الشفت", branch:"فرع الرياض - العليا", start:"8:00 ص", duration:"3:22 ساعة", orders:87, sales:12500, status:"active" as const },
    { name:"محمد العتيبي", role:"كاشير رئيسي", branch:"فرع الرياض - العليا", start:"8:00 ص", duration:"3:22 ساعة", orders:87, sales:12500, status:"active" as const },
    { name:"سعد الدوسري", role:"مشرف الشفت", branch:"فرع مكة - المعابدة", start:"6:00 ص", duration:"5:22 ساعة", orders:45, sales:9200, status:"late" as const },
    { name:"فهد القحطاني", role:"كاشير", branch:"فرع جدة - الحمراء", start:"7:00 ص", duration:"4:22 ساعة", orders:63, sales:9200, status:"active" as const },
  ];

  const shiftHistory = [
    {branch:"فرع الرياض - العليا", supervisor:"خالد الشمري", date:"13 أكت", startT:"8:00 ص", endT:"4:00 م", orders:145, sales:22400, cashExpected:8200, cashActual:8150, diff:-50},
    {branch:"فرع جدة - الحمراء",    supervisor:"فهد القحطاني", date:"13 أكت", startT:"7:00 ص", endT:"3:30 م", orders:118, sales:18900, cashExpected:7200, cashActual:7200, diff:0},
    {branch:"فرع مكة - المعابدة",   supervisor:"سعد الدوسري",  date:"13 أكت", startT:"6:00 ص", endT:"2:00 م", orders:92,  sales:14300, cashExpected:5800, cashActual:5920, diff:120},
    {branch:"فرع الرياض - العليا", supervisor:"خالد الشمري", date:"12 أكت", startT:"8:00 ص", endT:"4:00 م", orders:138, sales:21000, cashExpected:7800, cashActual:7800, diff:0},
    {branch:"فرع جدة - الحمراء",    supervisor:"فهد القحطاني", date:"12 أكت", startT:"7:00 ص", endT:"3:30 م", orders:99,  sales:15600, cashExpected:6100, cashActual:6050, diff:-50},
  ];

  const cashIn  = parseFloat(closeForm.cashInDrawer)||0;
  const salesSys = parseFloat(closeForm.salesSystem)||0;
  const cashDiff = cashIn - salesSys;

  const submitClose = () => {
    setCloseSent(true);
    setTimeout(()=>{ setCloseSent(false); setCloseForm({cashInDrawer:"",salesSystem:"",notes:"",branch:"فرع الرياض - العليا"}); setTab("history"); },1800);
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">إدارة الشفتات</h2>
          <p className="text-gray-400 text-sm mt-0.5">الوقت الفعلي · إعداد الشفتات · إغلاق الشفت · السجل التاريخي</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>مباشر — آخر تحديث: الآن
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="شفتات نشطة"      value="4"         sub=""                  icon={<span className="w-2 h-2 rounded-full bg-emerald-500"/>} accent="emerald"/>
        <KpiCard label="شفت متأخر"        value="1"         sub="يحتاج متابعة"      icon={<AlertTriangle size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label="متوسط مدة الشفت" value="4.2 ساعة"  sub="هذا اليوم"         icon={<TrendingUp size={18} className="text-purple-600"/>} accent="purple"/>
        <KpiCard label="إجمالي الطلبات"  value="282"       sub="هذا اليوم"         icon={<ShoppingCart size={18} className="text-blue-600"/>} accent="blue"/>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          {id:"live"    as const, label:"🟢 مباشر"},
          {id:"setup"   as const, label:"⚙️ إعداد الشفتات"},
          {id:"close"   as const, label:"🔒 إغلاق الشفت"},
          {id:"history" as const, label:"📋 السجل التاريخي"},
        ] as {id:"live"|"setup"|"close"|"history";label:string}[]).map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${tab===t.id?"border-purple-600 text-purple-700":"border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: LIVE ─────────────────────────────────────────────────────────── */}
      {tab==="live" && (
        <div className="grid grid-cols-2 gap-4">
          {liveShifts.map((sh,i)=>(
            <div key={i} className={`bg-white rounded-xl border shadow-sm p-4 ${sh.status==="late"?"border-amber-300 bg-amber-50/20":"border-gray-100"}`}>
              {sh.status==="late" && <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold mb-3 bg-amber-100 rounded-lg px-3 py-2"><AlertTriangle size={13}/> انتهى وقت الشفت — لم يُغلق الصندوق بعد</div>}
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-white font-bold text-sm">{sh.name[0]}</div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${sh.status==="late"?"bg-amber-500":"bg-emerald-500"}`}/>
                </div>
                <div className="flex-1"><p className="font-bold text-gray-800 text-sm">{sh.name}</p><p className="text-xs text-gray-500">{sh.role} · {sh.branch}</p></div>
                <Badge className={sh.status==="late"?"bg-amber-100 text-amber-700":"bg-emerald-100 text-emerald-700"}>{sh.status==="late"?"تأخير":"نشط"}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                {[{label:"بداية الشفت",val:sh.start},{label:"المدة",val:sh.duration},{label:"الطلبات",val:String(sh.orders)}].map((s,j)=>(
                  <div key={j} className="bg-gray-50 rounded-lg p-2"><p className="text-[10px] text-gray-400">{s.label}</p><p className="text-sm font-bold text-gray-800">{s.val}</p></div>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-gray-500 text-xs">مبيعات الشفت</span>
                <span className="font-bold text-purple-700">{fmtAmt(sh.sales)} ر.س</span>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setModal("contact")} className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"><Phone size={12}/> تواصل</button>
                <button onClick={()=>setTab("close")} className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"><Lock size={12}/> إغلاق الشفت</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: SETUP ────────────────────────────────────────────────────────── */}
      {tab==="setup" && (
        <div className="space-y-4" dir="rtl">
          {/* Brand selector pills */}
          <div className="flex items-center gap-2 flex-wrap bg-white rounded-xl border border-gray-100 shadow-sm p-3">
            <span className="text-xs font-bold text-gray-500 ml-1">العلامة التجارية:</span>
            {brandCfgs.map(b=>(
              <button key={b.id} onClick={()=>{setSelBrandId(b.id);setExpandedRest(null);setBrandEdit(null);setRestEdits({});setRestSearch("");}}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${selBrandId===b.id?"text-white border-transparent shadow-sm":"bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
                style={selBrandId===b.id?{background:b.color,borderColor:b.color}:{}}>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white" style={{background:b.color}}>{b.name[0]}</span>
                {b.name}
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${selBrandId===b.id?"bg-white/20 text-white":"bg-gray-100 text-gray-500"}`}>{b.numShifts} شفت</span>
                {b.saved && <span className="text-[9px] text-emerald-400">✓</span>}
              </button>
            ))}
          </div>

          {/* Selected brand configuration */}
          {selBrand && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Brand header bar */}
              <div className="px-5 py-3.5 flex items-center justify-between border-b border-gray-100" style={{background:`${selBrand.color}10`}}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black" style={{background:selBrand.color}}>{selBrand.name[0]}</div>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{selBrand.name}</p>
                    <p className="text-[10px] text-gray-400">{selBrand.numShifts} شفت · {selBrand.durH} ساعة/شفت · يبدأ {sFmtT(selBrand.firstStart)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {savedBrand===selBrand.id && <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 size={12}/> تم الحفظ</span>}
                  <button onClick={()=>doSave(selBrand.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-white text-xs font-bold rounded-lg shadow-sm transition-all hover:opacity-90"
                    style={{background:selBrand.color}}>
                    <CheckCircle2 size={11}/> حفظ إعداد العلامة
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Smart auto-gen panel */}
                <ShiftSmartPanel
                  cfg={selBrand}
                  onNum={n=>{ updBrand(selBrand.id,{numShifts:n, shifts:sGenShifts(n,selBrand.durH,selBrand.firstStart)}); setBrandEdit(null); }}
                  onDur={d=>{ updBrand(selBrand.id,{durH:d,     shifts:sGenShifts(selBrand.numShifts,d,selBrand.firstStart)}); setBrandEdit(null); }}
                  onStart={s=>{ updBrand(selBrand.id,{firstStart:s, shifts:sGenShifts(selBrand.numShifts,selBrand.durH,s)}); setBrandEdit(null); }}
                  onGen={()=>doAutoGen(selBrand.id)}
                />

                {/* Generated shifts list */}
                {selBrand.shifts.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-gray-600">جدول شفتات العلامة التجارية</p>
                      <span className="text-[10px] text-gray-400">اضغط ✏️ لتعديل وقت أي شفت بشكل منفرد</span>
                    </div>
                    <div className="space-y-2">
                      {selBrand.shifts.map((sl,i)=>(
                        <ShiftRowCmp key={i} slot={sl} idx={i} editState={brandEdit}
                          onEditOpen={brandEditOpen}
                          onEditChange={brandEditChange}
                          onEditCommit={brandEditCommit}
                          onEditCancel={()=>setBrandEdit(null)}
                        />
                      ))}
                    </div>
                    <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-[10px] text-gray-500 text-center">
                        يغطي الجدول{" "}
                        <span className="font-bold text-gray-700">{selBrand.numShifts*selBrand.durH} ساعة</span> يومياً
                        {" "}·{" "}من{" "}
                        <span className="font-bold text-gray-700">{sFmtT(selBrand.firstStart)}</span>
                        {" "}إلى{" "}
                        <span className="font-bold text-gray-700">{selBrand.shifts.length>0?sFmtT(selBrand.shifts[selBrand.shifts.length-1].end):"—"}</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Per-restaurant overrides */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs font-bold text-gray-600">تخصيص حسب المطعم (اختياري)</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">يمكن تجاوز إعداد العلامة لمطعم محدد</p>
                    </div>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-lg font-semibold">{selBrand.rests.filter(r=>r.useOverride).length} مخصص من {selBrand.rests.length}</span>
                  </div>

                  {/* Restaurant search filter */}
                  {selBrand.rests.length > 2 && (
                    <div className="relative mb-2">
                      <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                      <input
                        value={restSearch}
                        onChange={e=>setRestSearch(e.target.value)}
                        placeholder="بحث باسم المطعم..."
                        className="w-full text-xs border border-gray-200 rounded-xl py-2 pr-8 pl-3 bg-gray-50 focus:bg-white focus:border-purple-300 outline-none transition-all"
                      />
                      {restSearch && (
                        <button onClick={()=>setRestSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          <X size={12}/>
                        </button>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    {selBrand.rests.filter(r=>!restSearch.trim()||r.restName.includes(restSearch)).map(rest=>(
                      <div key={rest.restId} className={`rounded-xl border transition-all ${rest.useOverride?"border-purple-200 bg-purple-50/30":"border-gray-100 bg-white"}`}>
                        {/* Restaurant row header */}
                        <div className="flex items-center gap-3 px-4 py-3">
                          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm flex-shrink-0">🍴</div>
                          <div className="flex-1">
                            <p className="text-xs font-bold text-gray-800">{rest.restName}</p>
                            {rest.useOverride
                              ? <p className="text-[10px] text-purple-600">{rest.numShifts} شفت مخصص · {rest.durH} ساعة · من {sFmtT(rest.firstStart)}</p>
                              : <p className="text-[10px] text-gray-400">يستخدم إعداد العلامة ({selBrand.numShifts} شفت × {selBrand.durH}س)</p>
                            }
                          </div>
                          <div className="flex items-center gap-2">
                            {rest.useOverride && (
                              <button onClick={()=>setExpandedRest(expandedRest===rest.restId?null:rest.restId)}
                                className="text-[10px] text-purple-600 font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-purple-100">
                                {expandedRest===rest.restId?<ChevronUp size={11}/>:<ChevronDown size={11}/>}
                                {expandedRest===rest.restId?"طي":"تفاصيل"}
                              </button>
                            )}
                            <button
                              onClick={()=>{ updRest(selBrand.id,rest.restId,{useOverride:!rest.useOverride}); if(!rest.useOverride) setExpandedRest(rest.restId); else setExpandedRest(null); }}
                              className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${rest.useOverride?"bg-purple-100 text-purple-700 border-purple-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200":"bg-white text-gray-500 border-gray-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200"}`}>
                              {rest.useOverride?"✓ مخصص · إلغاء":"تخصيص"}
                            </button>
                          </div>
                        </div>

                        {/* Restaurant override config (expanded) */}
                        {rest.useOverride && expandedRest===rest.restId && (
                          <div className="px-4 pb-4 space-y-3 border-t border-purple-100 pt-3">
                            <ShiftSmartPanel
                              cfg={rest}
                              onNum={n=>{ updRest(selBrand.id,rest.restId,{numShifts:n, shifts:sGenShifts(n,rest.durH,rest.firstStart)}); setRestEdits(p=>({...p,[rest.restId]:null})); }}
                              onDur={d=>{ updRest(selBrand.id,rest.restId,{durH:d,     shifts:sGenShifts(rest.numShifts,d,rest.firstStart)}); setRestEdits(p=>({...p,[rest.restId]:null})); }}
                              onStart={s=>{ updRest(selBrand.id,rest.restId,{firstStart:s, shifts:sGenShifts(rest.numShifts,rest.durH,s)}); setRestEdits(p=>({...p,[rest.restId]:null})); }}
                              onGen={()=>doRestAutoGen(selBrand.id,rest.restId)}
                            />
                            {rest.shifts.length>0 && (
                              <div className="space-y-2">
                                {rest.shifts.map((sl,i)=>(
                                  <ShiftRowCmp key={i} slot={sl} idx={i} editState={restEdits[rest.restId]??null}
                                    onEditOpen={(idx,s,d)=>restEditOpen(rest.restId,idx,s,d)}
                                    onEditChange={(s,d)=>restEditChange(rest.restId,s,d)}
                                    onEditCommit={()=>restEditCommit(selBrand.id,rest.restId,rest.shifts)}
                                    onEditCancel={()=>setRestEdits(p=>({...p,[rest.restId]:null}))}
                                  />
                                ))}
                              </div>
                            )}
                            {rest.shifts.length===0 && (
                              <p className="text-xs text-gray-400 text-center py-2">اضغط "إنشاء تلقائي" لتوليد الشفتات</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: CLOSE ────────────────────────────────────────────────────────── */}
      {tab==="close" && (
        <div className="max-w-xl mx-auto">
          <Card title="🔒 إغلاق الشفت">
            <div className="p-5 space-y-4">
              {closeSent ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">✅</div>
                  <p className="font-bold text-emerald-700">تم إغلاق الشفت بنجاح</p>
                  <p className="text-sm text-gray-500 mt-1">سيتم توجيهك لسجل الشفتات...</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 block mb-1">الفرع</label>
                    <select value={closeForm.branch} onChange={e=>setCloseForm(p=>({...p,branch:e.target.value}))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                      {BRANCHES.map(b=><option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 block mb-1">النقد الفعلي في الصندوق (ر.س)</label>
                    <input type="number" value={closeForm.cashInDrawer} onChange={e=>setCloseForm(p=>({...p,cashInDrawer:e.target.value}))} placeholder="أدخل المبلغ المعدود..." className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono"/>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 block mb-1">المبيعات النقدية (من النظام) (ر.س)</label>
                    <input type="number" value={closeForm.salesSystem} onChange={e=>setCloseForm(p=>({...p,salesSystem:e.target.value}))} placeholder="من تقرير الكاشير..." className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono"/>
                  </div>
                  {closeForm.cashInDrawer && closeForm.salesSystem && (
                    <div className={`p-3 rounded-xl border ${cashDiff===0?"bg-emerald-50 border-emerald-200":cashDiff>0?"bg-blue-50 border-blue-200":"bg-red-50 border-red-200"}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-700">الفرق (عجز/زيادة)</span>
                        <span className={`font-mono font-black text-lg ${cashDiff===0?"text-emerald-700":cashDiff>0?"text-blue-700":"text-red-700"}`}>{cashDiff>0?"+":""}{fmtAmt(cashDiff)} ر.س {cashDiff===0?"✅":cashDiff>0?"⬆":"⬇"}</span>
                      </div>
                      <p className="text-[11px] mt-1 text-gray-500">{cashDiff===0?"مطابق تاماً":cashDiff>0?"زيادة في الصندوق — تحتاج توثيق":"نقص في الصندوق — يُحمَّل على المشرف"}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 block mb-1">ملاحظات (اختياري)</label>
                    <textarea value={closeForm.notes} onChange={e=>setCloseForm(p=>({...p,notes:e.target.value}))} placeholder="ملاحظات الشفت..." rows={3} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none"/>
                  </div>
                  <Btn variant="success" className="w-full justify-center" onClick={submitClose} disabled={!closeForm.cashInDrawer||!closeForm.salesSystem}><Lock size={14}/> تأكيد إغلاق الشفت</Btn>
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB: HISTORY ──────────────────────────────────────────────────────── */}
      {tab==="history" && (
        <Card title="سجل الشفتات السابقة">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir="rtl">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-xs text-gray-500">
                  <th className="px-4 py-3 text-right">الفرع / المشرف</th>
                  <th className="px-4 py-3 text-center">التاريخ</th>
                  <th className="px-4 py-3 text-center">بداية → نهاية</th>
                  <th className="px-4 py-3 text-center">الطلبات</th>
                  <th className="px-4 py-3 text-center">المبيعات</th>
                  <th className="px-4 py-3 text-center">الفرق</th>
                  <th className="px-4 py-3 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {shiftHistory.map((sh,i)=>(
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60 last:border-0">
                    <td className="px-4 py-3"><p className="font-semibold text-gray-800 text-xs">{sh.branch}</p><p className="text-[10px] text-gray-400">{sh.supervisor}</p></td>
                    <td className="px-4 py-3 text-center text-gray-500 text-xs">{sh.date}</td>
                    <td className="px-4 py-3 text-center font-mono text-xs text-gray-600">{sh.startT} → {sh.endT}</td>
                    <td className="px-4 py-3 text-center font-bold text-gray-800">{sh.orders}</td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-purple-700">{fmtAmt(sh.sales)} ر.س</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-mono font-bold text-sm ${sh.diff===0?"text-emerald-600":sh.diff>0?"text-blue-600":"text-red-600"}`}>{sh.diff>0?"+":""}{sh.diff} ر.س</span>
                    </td>
                    <td className="px-4 py-3 text-center"><Badge className="bg-emerald-50 text-emerald-700">مُغلق</Badge></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50/80 border-t border-gray-200">
                <tr>
                  <td className="px-4 py-2.5 font-bold text-gray-700 text-xs" colSpan={3}>إجمالي الأسبوع</td>
                  <td className="px-4 py-2.5 text-center font-bold text-gray-800">{shiftHistory.reduce((s,sh)=>s+sh.orders,0)}</td>
                  <td className="px-4 py-2.5 text-center font-mono font-black text-purple-700">{fmtAmt(shiftHistory.reduce((s,sh)=>s+sh.sales,0))} ر.س</td>
                  <td colSpan={2}/>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function AccEmployees({ navigate, setModal }:PageProps) {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [empFilter, setEmpFilter] = useState({empNum:"", branch:"", brand:""});
  const employees = [
    { name:"أحمد الشمري", role:"مشرف الشفت", branch:"الرياض - العليا", balance:1250, movements:[
      { date:"14 أكتوبر", desc:"عمولة الشفت الصباحي", type:"credit", amt:500 },
      { date:"14 أكتوبر", desc:"خصم — نقص في الصندوق", type:"debit", amt:150 },
      { date:"13 أكتوبر", desc:"عمولة الشفت المسائي", type:"credit", amt:500 },
      { date:"12 أكتوبر", desc:"سلفة بطلب", type:"debit", amt:500 },
      { date:"11 أكتوبر", desc:"عمولة الشفت الصباحي", type:"credit", amt:500 },
      { date:"10 أكتوبر", desc:"حافز أداء — أفضل مبيعات", type:"credit", amt:400 },
    ]},
    { name:"محمد العتيبي", role:"كاشير رئيسي", branch:"الرياض - العليا", balance:-350, movements:[
      { date:"14 أكتوبر", desc:"خصم — فرق في الصندوق", type:"debit", amt:350 },
      { date:"13 أكتوبر", desc:"عمولة الشفت المسائي", type:"credit", amt:450 },
    ]},
    { name:"سعد الدوسري", role:"مشرف الشفت", branch:"مكة - المعابدة", balance:800, movements:[
      { date:"14 أكتوبر", desc:"عمولة الشفت الصباحي", type:"credit", amt:800 },
    ]},
  ];
  const emp = employees[selectedIdx];
  const totalCredit = emp.movements.filter(m=>m.type==="credit").reduce((s,m)=>s+m.amt,0);
  const totalDebit = emp.movements.filter(m=>m.type==="debit").reduce((s,m)=>s+m.amt,0);

  const filteredEmps = employees.filter(e=>{
    if(empFilter.empNum && !e.name.includes(empFilter.empNum)) return false;
    if(empFilter.branch && empFilter.branch!=="الكل" && !e.branch.includes(empFilter.branch.replace("الكل",""))) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">كشف حساب الموظفين</h2>
          <p className="text-gray-400 text-sm mt-0.5">{filteredEmps.length} موظف {filteredEmps.length!==employees.length?`(من ${employees.length})`:""}</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4" dir="rtl">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">رقم الموظف / الاسم</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Search size={13} className="text-gray-400 flex-shrink-0"/>
              <input value={empFilter.empNum} onChange={e=>setEmpFilter(p=>({...p,empNum:e.target.value}))} placeholder="ابحث باسم أو رقم الموظف..." className="flex-1 text-sm outline-none"/>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">الفرع</label>
            <select value={empFilter.branch} onChange={e=>{ setEmpFilter(p=>({...p,branch:e.target.value})); setSelectedIdx(0); }} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {["الكل",...[...new Set(employees.map(e=>e.branch))]].map(b=><option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">العلامة التجارية</label>
            <select value={empFilter.brand} onChange={e=>setEmpFilter(p=>({...p,brand:e.target.value}))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {["الكل","برغر خليفة","بيتزا باكو","وسطاوي"].map(b=><option key={b}>{b}</option>)}
            </select>
          </div>
        </div>
        {(empFilter.empNum||empFilter.branch||empFilter.brand) && (
          <button onClick={()=>setEmpFilter({empNum:"",branch:"",brand:""})} className="mt-2 text-xs text-purple-600 hover:underline flex items-center gap-1"><RotateCcw size={11}/> مسح الفلاتر</button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-5">
        <Card title={`قائمة الموظفين (${filteredEmps.length})`}>
          <div className="divide-y divide-gray-100">
            {filteredEmps.length===0 && <EmptyState icon="🔍" title="لا نتائج" desc="لا يوجد موظفون يطابقون الفلاتر المحددة"/>}
            {filteredEmps.map((e,i)=>{
              const realIdx = employees.indexOf(e);
              return (
              <button key={i} onClick={()=>setSelectedIdx(realIdx)} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-right ${selectedIdx===realIdx?"bg-purple-50/50":""}`}>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{e.name[0]}</div>
                <div className="flex-1 min-w-0"><p className="font-semibold text-sm text-gray-800">{e.name}</p><p className="text-xs text-gray-400">{e.role} · {e.branch}</p></div>
                <span className={`font-mono font-bold text-sm ${e.balance>=0?"text-emerald-600":"text-red-600"}`}>{e.balance>=0?"+":""}{e.balance} ر.س</span>
              </button>
              );
            })}
          </div>
        </Card>
        <div className="space-y-4">
          <Card title={`كشف حساب: ${emp.name}`} actions={
            <div className="flex gap-2">
              <button onClick={()=>alert("جارٍ تصدير كشف الحساب إلى Excel...")}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-all">
                <FileText size={11}/> Excel
              </button>
              <Btn size="sm"><Download size={12}/> PDF</Btn>
              <button onClick={()=>setModal("contact")} className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-1"><Phone size={11}/> تواصل</button>
            </div>
          }>
            <div className="p-4">
              <div className="bg-gray-50 rounded-xl p-3 mb-4 grid grid-cols-3 gap-3 text-center">
                <div><p className="text-[10px] text-gray-400">الرصيد</p><p className={`font-bold text-base ${emp.balance>=0?"text-emerald-600":"text-red-600"}`}>{emp.balance>=0?"+":""}{emp.balance} ر.س</p></div>
                <div><p className="text-[10px] text-gray-400">إجمالي الدائن</p><p className="font-bold text-emerald-600">+{fmtAmt(totalCredit)} ر.س</p></div>
                <div><p className="text-[10px] text-gray-400">إجمالي المدين</p><p className="font-bold text-red-600">-{fmtAmt(totalDebit)} ر.س</p></div>
              </div>
              <div className="space-y-2">
                {emp.movements.map((m,i)=>(
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${m.type==="credit"?"bg-emerald-50":"bg-red-50"}`}>{m.type==="credit"?"⬆":"⬇"}</div>
                    <div className="flex-1"><p className="text-xs font-medium text-gray-700">{m.desc}</p><p className="text-[10px] text-gray-400">{m.date}</p></div>
                    <span className={`font-mono font-bold text-sm ${m.type==="credit"?"text-emerald-600":"text-red-600"}`}>{m.type==="credit"?"+":"-"}{fmtAmt(m.amt)} ر.س</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AccCash({}: PageProps) {
  const [expandedBranch, setExpandedBranch] = useState<string|null>(null);
  const [searchTerm,     setSearchTerm]     = useState("");
  const [statusFilter,   setStatusFilter]   = useState("");

  const branches = [
    { branch:"فرع الرياض - العليا", custodian:"أحمد الشمري", amount:5000, used:3200,
      txns:[
        {date:"14 أكت", desc:"صيانة طارئة — مكيف",      type:"debit",  amt:450},
        {date:"14 أكت", desc:"مواد تنظيف",               type:"debit",  amt:180},
        {date:"13 أكت", desc:"إيداع عهدة شهر أكتوبر",    type:"credit", amt:5000},
        {date:"12 أكت", desc:"مستلزمات مكتبية",          type:"debit",  amt:95},
        {date:"11 أكت", desc:"إصلاح معدات",              type:"debit",  amt:320},
        {date:"10 أكت", desc:"أدوات خدمة",               type:"debit",  amt:210},
        {date:"10 أكت", desc:"متفرقات",                   type:"debit",  amt:145},
        {date:"09 أكت", desc:"مواد نظافة إضافية",        type:"debit",  amt:800},
        {date:"09 أكت", desc:"قطع غيار",                 type:"debit",  amt:1000},
      ],
      pendingTxns:1
    },
    { branch:"فرع جدة - الحمراء", custodian:"سعد القحطاني", amount:3000, used:2800,
      txns:[
        {date:"14 أكت", desc:"إيداع عهدة شهر أكتوبر",    type:"credit", amt:3000},
        {date:"13 أكت", desc:"صيانة شبكة كهرباء",        type:"debit",  amt:750},
        {date:"12 أكت", desc:"مواد تنظيف وتعقيم",        type:"debit",  amt:420},
        {date:"11 أكت", desc:"مستلزمات المطبخ",           type:"debit",  amt:850},
        {date:"10 أكت", desc:"إصلاح باب طوارئ",          type:"debit",  amt:380},
        {date:"09 أكت", desc:"متفرقات أخرى",             type:"debit",  amt:400},
      ],
      pendingTxns:2
    },
    { branch:"فرع مكة - المعابدة", custodian:"فهد العتيبي", amount:4000, used:1500,
      txns:[
        {date:"14 أكت", desc:"إيداع عهدة شهر أكتوبر",    type:"credit", amt:4000},
        {date:"13 أكت", desc:"مواد تنظيف",               type:"debit",  amt:600},
        {date:"12 أكت", desc:"صيانة مكيفات",             type:"debit",  amt:900},
      ],
      pendingTxns:0
    },
  ];

  const filtered = branches.filter(b=>{
    if(searchTerm && !b.branch.includes(searchTerm) && !b.custodian.includes(searchTerm)) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">إدارة العهد النقدية</h2>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="عدد العهود النشطة" value={String(branches.length)} sub="فروع لديها عهدة مفتوحة" icon={<ArrowLeftRight size={18} className="text-orange-600"/>} accent="orange"/>
        <KpiCard label="طلبات صرف معلقة" value={String(branches.reduce((s,b)=>s+b.pendingTxns,0))} sub="بانتظار المراجعة والموافقة" icon={<Clock size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label="عهود قريبة من النفاد" value={String(branches.filter(b=>b.amount-b.used<500).length)} sub="أقل من 500 ر.س متبقٍ" icon={<AlertTriangle size={18} className="text-red-600"/>} accent="red"/>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4" dir="rtl">
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">بحث — الفرع أو المسؤول أو المطعم</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Search size={13} className="text-gray-400"/>
              <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="اسم الفرع أو المطعم أو أمين الصندوق..." className="flex-1 text-sm outline-none"/>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">العلامة التجارية</label>
            <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {["الكل","برغر خليفة","بيتزا باكو","وسطاوي"].map(b=><option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">حالة العهدة</label>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {["الكل","قريبة من النفاد","طلبات معلقة","نشطة"].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between">
          {(searchTerm||statusFilter) && (
            <button onClick={()=>{ setSearchTerm(""); setStatusFilter(""); }} className="text-xs text-purple-600 hover:underline flex items-center gap-1"><RotateCcw size={11}/> مسح الفلاتر</button>
          )}
          <button onClick={()=>alert("جارٍ تصدير سجل العهد النقدية إلى Excel...")}
            className="mr-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-all">
            <FileText size={11}/> تصدير Excel
          </button>
        </div>
      </div>

      {/* Custodian rows with click-to-expand transaction list */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-gray-50/60 border-b border-gray-100">
          <p className="font-bold text-gray-900 text-sm">كشف العهود النقدية — اضغط على فرع لعرض سجل المعاملات</p>
        </div>
        {filtered.map((b,i)=>{
          const rem    = b.amount - b.used;
          const pct    = Math.round(b.used/b.amount*100);
          const isLow  = rem < 500;
          const isOpen = expandedBranch===b.branch;
          return (
            <div key={i} className="border-b border-gray-100 last:border-0">
              {/* Summary row */}
              <div className={`px-5 py-4 flex items-center gap-4 hover:bg-gray-50/70 ${isOpen?"bg-orange-50/20":""} ${isLow?"border-r-4 border-r-red-400":""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 text-sm">{b.branch}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-gray-500">{b.custodian}</span>
                    {isLow && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold border border-red-200">⚠ قريبة من النفاد</span>}
                    {b.pendingTxns>0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">{b.pendingTxns} طلب معلق</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5 max-w-32">
                      <div className={`h-1.5 rounded-full ${pct>85?"bg-red-400":"bg-orange-400"}`} style={{width:`${pct}%`}}></div>
                    </div>
                    <span className="text-xs text-gray-400">{pct}% مُصرَف</span>
                    <span className={`text-xs font-bold font-mono ${isLow?"text-red-600":"text-emerald-600"}`}>{fmtAmt(rem)} ر.س متبقٍ</span>
                  </div>
                </div>
                <Btn size="sm" onClick={()=>setExpandedBranch(isOpen?null:b.branch)}>
                  {isOpen?<ChevronUp size={12}/>:<ChevronDown size={12}/>} المعاملات
                </Btn>
              </div>

              {/* Transaction drill-down */}
              {isOpen && (
                <div className="px-5 pb-4 bg-gray-50/30">
                  <p className="text-[11px] font-bold text-gray-500 mb-2 pt-2">سجل معاملات العهدة — {b.custodian}</p>
                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-xs" dir="rtl">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-right font-semibold text-gray-600">التاريخ</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-600">البيان</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-600">النوع</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-600">المبلغ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {b.txns.map((t,k)=>(
                          <tr key={k} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-500">{t.date}</td>
                            <td className="px-3 py-2 font-medium text-gray-800">{t.desc}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.type==="credit"?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-700"}`}>
                                {t.type==="credit"?"إيداع":"صرف"}
                              </span>
                            </td>
                            <td className={`px-3 py-2 text-center font-mono font-bold ${t.type==="credit"?"text-emerald-600":"text-red-600"}`}>
                              {t.type==="credit"?"+":"-"}{fmtAmt(t.amt)} ر.س
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                        <tr>
                          <td colSpan={2} className="px-3 py-2 font-bold text-gray-700">الرصيد الحالي</td>
                          <td></td>
                          <td className={`px-3 py-2 text-center font-black font-mono ${isLow?"text-red-600":"text-emerald-700"}`}>{fmtAmt(rem)} ر.س</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// FIXED ASSETS — Mobile ↔ Accountant Coordination + Branch Report
// ════════════════════════════════════════════════════════════
function ExcelImportModal({ assets, setAssets, onClose }:{ assets:any[]; setAssets:(fn:(p:any[])=>any[])=>void; onClose:()=>void }) {
  type ImportRow = {
    rowId:number; name:string; cat:string; branch:string; invNum:string;
    cost:number; usefulLife:number; custodian:string; selected:boolean; branchEditing:boolean;
  };
  const [step, setStep] = useState<1|2|3>(1);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([
    { rowId:1, name:"ثلاجة صناعية سامسونج 800L",   cat:"معدات", branch:"فرع الرياض - العليا",     invNum:"INV-B001", cost:32000, usefulLife:72,  custodian:"مدير الفرع",        selected:true,  branchEditing:false },
    { rowId:2, name:"شاشة كاشير LG 27 بوصة",        cat:"تقنية", branch:"فرع جدة - الحمراء",       invNum:"INV-B002", cost:4500,  usefulLife:48,  custodian:"مدير الفرع",        selected:true,  branchEditing:false },
    { rowId:3, name:"طاولات ستانلس × 6",            cat:"أثاث",  branch:"فرع مكة - المعابدة",      invNum:"INV-B003", cost:9800,  usefulLife:60,  custodian:"مدير الفرع",        selected:true,  branchEditing:false },
    { rowId:4, name:"مولّد كهربائي 50KW",            cat:"معدات", branch:"فرع الدمام - الخبر",      invNum:"INV-B004", cost:68000, usefulLife:120, custodian:"مدير الفرع",        selected:false, branchEditing:false },
    { rowId:5, name:"كاميرات مراقبة × 8",           cat:"تقنية", branch:"فرع الرياض - السليمانية", invNum:"INV-B005", cost:12000, usefulLife:60,  custodian:"مدير الفرع",        selected:true,  branchEditing:false },
    { rowId:6, name:"سيارة توصيل",                   cat:"مركبات",branch:"فرع جدة - العزيزية",      invNum:"INV-B006", cost:95000, usefulLife:60,  custodian:"سائق الفرع",        selected:true,  branchEditing:false },
    { rowId:7, name:"طابعة فواتير إيبسون",           cat:"تقنية", branch:"فرع الرياض - العليا",     invNum:"INV-B007", cost:2200,  usefulLife:36,  custodian:"مدير الفرع",        selected:true,  branchEditing:false },
    { rowId:8, name:"مضخة ماء صناعية",               cat:"معدات", branch:"فرع مكة - المعابدة",      invNum:"INV-B008", cost:7500,  usefulLife:84,  custodian:"مدير الفرع",        selected:false, branchEditing:false },
  ]);
  const [importSent, setImportSent] = useState(false);

  const selectedRows = rows.filter(r=>r.selected);
  const allSelected  = rows.every(r=>r.selected);

  const branchGroups = selectedRows.reduce<Record<string,ImportRow[]>>((acc,r)=>{
    if(!acc[r.branch]) acc[r.branch]=[];
    acc[r.branch].push(r);
    return acc;
  }, {});

  const simulateUpload = (name:string) => {
    setFileName(name);
    setTimeout(()=>setStep(2), 800);
  };

  const confirmImport = () => {
    setAssets(prev=>{
      const newEntries = selectedRows.map((r,i)=>({
        id: `FA-${String(prev.length+i+1).padStart(3,"0")}`,
        name:r.name, cat:r.cat as any, branch:r.branch,
        cost:r.cost, book:r.cost, usefulLife:r.usefulLife,
        case_:"acc_register" as const, status:"pending_branch" as const,
        invNum:r.invNum, submittedBy:"المحاسب — استيراد Excel", date:"اليوم",
        custodian:r.custodian,
        history:[{date:"اليوم", from:"—", to:r.custodian, note:`مستورد من Excel (${fileName}) — أُرسل إشعار للفرع`, by:"المحاسب"}]
      }));
      return [...prev, ...newEntries];
    });
    setImportSent(true);
    setStep(3);
  };

  const ALL_BRANCHES = ["فرع الرياض - العليا","فرع الرياض - السليمانية","فرع جدة - الحمراء","فرع جدة - العزيزية","فرع مكة - المعابدة","فرع الدمام - الخبر"];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose} dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-l from-emerald-700 to-emerald-600 text-white flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2"><Upload size={16}/> استيراد أصول من Excel</h3>
            <p className="text-emerald-200 text-xs mt-0.5">استيراد دفعي لأصول متعددة — يُرسَل لكل فرع إشعار مستقل على الموبايل</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Step indicator */}
            <div className="flex items-center gap-1">
              {([1,2,3] as const).map((s,i)=>(
                <div key={s} className="flex items-center gap-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all ${step>=s?"bg-white text-emerald-700 border-white":"bg-transparent text-emerald-300 border-emerald-400"}`}>{s}</div>
                  {i<2 && <div className={`w-6 h-0.5 ${step>s?"bg-white":"bg-emerald-400/50"}`}/>}
                </div>
              ))}
            </div>
            <button onClick={onClose} className="text-emerald-200 hover:text-white ml-2"><X size={18}/></button>
          </div>
        </div>

        {/* Step labels */}
        <div className="flex border-b border-gray-100 bg-gray-50/60 flex-shrink-0">
          {[{n:1,l:"رفع الملف"},{n:2,l:"مراجعة البيانات"},{n:3,l:"تم الإرسال"}].map(s=>(
            <div key={s.n} className={`flex-1 py-2.5 text-center text-xs font-semibold transition-colors ${step===s.n?"text-emerald-700 border-b-2 border-emerald-600":"text-gray-400"}`}>{s.l}</div>
          ))}
        </div>

        {/* ── STEP 1: Upload ─────────────────── */}
        {step===1 && (
          <div className="p-8 flex flex-col items-center gap-6">
            {/* Drag-drop zone */}
            <div
              onDragOver={e=>{e.preventDefault();setDragging(true);}}
              onDragLeave={()=>setDragging(false)}
              onDrop={e=>{ e.preventDefault(); setDragging(false); const f=e.dataTransfer.files[0]; if(f) simulateUpload(f.name); }}
              className={`w-full border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-all ${dragging?"border-emerald-400 bg-emerald-50":"border-gray-200 bg-gray-50 hover:border-emerald-300 hover:bg-emerald-50/40"}`}
              onClick={()=>simulateUpload("أصول_الفروع_أكتوبر_2025.xlsx")}>
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <Upload size={28} className="text-emerald-600"/>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-800 text-base">اسحب ملف Excel هنا أو اضغط للتصفح</p>
                <p className="text-gray-400 text-sm mt-1">يدعم: .xlsx · .xls · .csv — الحجم الأقصى 10MB</p>
              </div>
              <Btn variant="primary">📂 تصفح الملفات</Btn>
            </div>

            {/* Template download */}
            <div className="w-full bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-lg">📊</div>
                <div>
                  <p className="font-semibold text-blue-900 text-sm">قالب Excel الجاهز</p>
                  <p className="text-blue-600 text-xs mt-0.5">حمّل القالب المطلوب بالأعمدة الصحيحة لضمان الاستيراد السليم</p>
                </div>
              </div>
              <button onClick={()=>alert("جارٍ تحميل قالب Excel...")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200 transition-all">
                <Download size={13}/> تحميل القالب
              </button>
            </div>

            {/* Required columns info */}
            <div className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-700 mb-2">📋 الأعمدة المطلوبة في الملف:</p>
              <div className="grid grid-cols-4 gap-2">
                {["اسم الأصل","الفئة","اسم الفرع","رقم الفاتورة","التكلفة (ر.س)","العمر الافتراضي (شهر)","أمين العهدة","ملاحظات"].map(col=>(
                  <div key={col} className="flex items-center gap-1 text-[11px] text-gray-600"><Check size={10} className="text-emerald-500 flex-shrink-0"/>{col}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Preview table ──────────── */}
        {step===2 && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-emerald-50/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-base">📊</div>
                <div>
                  <p className="font-bold text-gray-800 text-sm" dir="ltr">{fileName||"assets_import.xlsx"}</p>
                  <p className="text-xs text-gray-500">{rows.length} صف مُكتشف · {selectedRows.length} محدد للاستيراد</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={allSelected} onChange={e=>setRows(p=>p.map(r=>({...r,selected:e.target.checked})))} className="rounded"/>
                  تحديد الكل
                </label>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-auto flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-semibold">
                    <th className="px-3 py-2.5 text-center w-8">✔</th>
                    <th className="px-3 py-2.5 text-right">اسم الأصل</th>
                    <th className="px-3 py-2.5 text-center">الفئة</th>
                    <th className="px-3 py-2.5 text-right">الفرع</th>
                    <th className="px-3 py-2.5 text-center">رقم الفاتورة</th>
                    <th className="px-3 py-2.5 text-center">التكلفة</th>
                    <th className="px-3 py-2.5 text-center">العمر (شهر)</th>
                    <th className="px-3 py-2.5 text-center">أمين العهدة</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r=>(
                    <tr key={r.rowId} className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${!r.selected?"opacity-40":""}`}>
                      <td className="px-3 py-2.5 text-center">
                        <input type="checkbox" checked={r.selected}
                          onChange={e=>setRows(p=>p.map(x=>x.rowId===r.rowId?{...x,selected:e.target.checked}:x))}
                          className="rounded"/>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-gray-800">{r.name}</td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge className="bg-purple-50 text-purple-700 border border-purple-100 text-[10px]">{r.cat}</Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        {r.branchEditing ? (
                          <select value={r.branch}
                            onChange={e=>setRows(p=>p.map(x=>x.rowId===r.rowId?{...x,branch:e.target.value,branchEditing:false}:x))}
                            autoFocus className="text-xs border border-emerald-300 rounded-lg px-2 py-1 w-full">
                            {ALL_BRANCHES.map(b=><option key={b}>{b}</option>)}
                          </select>
                        ) : (
                          <button onClick={()=>setRows(p=>p.map(x=>x.rowId===r.rowId?{...x,branchEditing:true}:x))}
                            className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1 group">
                            {r.branch}<Edit2 size={10} className="opacity-0 group-hover:opacity-100"/>
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-xs text-gray-500">{r.invNum}</td>
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-gray-800">{fmtAmt(r.cost)}</td>
                      <td className="px-3 py-2.5 text-center text-gray-600">{r.usefulLife}</td>
                      <td className="px-3 py-2.5 text-center text-xs text-orange-700 font-semibold">{r.custodian}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td colSpan={5} className="px-3 py-3 text-xs font-bold text-gray-600 text-right">إجمالي الأصول المحددة ({selectedRows.length})</td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-emerald-700">{fmtAmt(selectedRows.reduce((s,r)=>s+r.cost,0))}</td>
                    <td colSpan={2}/>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Branch summary + action */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/40 flex-shrink-0">
              <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5"><Smartphone size={12} className="text-emerald-600"/> سيُرسَل إشعار مستقل على الموبايل لكل فرع:</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(branchGroups).map(([branch,brRows])=>(
                  <div key={branch} className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
                    <span className="font-semibold text-emerald-800">{branch}</span>
                    <Badge className="bg-emerald-200 text-emerald-800 text-[9px]">{brRows.length} أصل</Badge>
                    <span className="text-emerald-600 font-mono">{fmtAmt(brRows.reduce((s,r)=>s+r.cost,0))}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 justify-end">
                <Btn onClick={()=>setStep(1)}>← رجوع</Btn>
                <Btn variant="primary" onClick={confirmImport} disabled={selectedRows.length===0}>
                  <Send size={13}/> تأكيد الاستيراد وإرسال الإشعارات ({selectedRows.length} أصل · {Object.keys(branchGroups).length} فروع)
                </Btn>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Success ─────────────────── */}
        {step===3 && (
          <div className="p-8 flex flex-col items-center gap-6 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 size={40} className="text-emerald-500"/>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-xl">تم الاستيراد والإرسال بنجاح!</h3>
              <p className="text-gray-500 text-sm mt-1">تم إضافة {selectedRows.length} أصل وإرسال إشعار لكل فرع على الموبايل</p>
            </div>
            <div className="w-full max-w-lg space-y-2">
              {Object.entries(branchGroups).map(([branch,brRows])=>(
                <div key={branch} className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Smartphone size={14} className="text-emerald-600"/>
                    <span className="font-semibold text-emerald-900 text-sm">{branch}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-200 text-emerald-800 text-[10px]">{brRows.length} أصل</Badge>
                    <span className="font-mono text-emerald-700 font-bold text-sm">{fmtAmt(brRows.reduce((s,r)=>s+r.cost,0))} ر.س</span>
                    <Badge className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px]">📱 إشعار أُرسل</Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 w-full max-w-lg">
              <p className="text-xs text-amber-800 font-semibold flex items-center gap-1.5"><Bell size={12}/> انتظر تأكيد مديري الفروع</p>
              <p className="text-xs text-amber-600 mt-1">سيظهر كل أصل في سجلك بحالة "ينتظر تأكيد الفرع" حتى يقوم مدير الفرع بالتأكيد عبر تطبيق الموبايل.</p>
            </div>
            <Btn variant="primary" onClick={onClose}><CheckCircle2 size={13}/> العودة إلى سجل الأصول</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

function AccAssets({ navigate }: PageProps) {
  const { drafts, discardDraft, confirmDraft } = useContext(AssetDraftContext);
  type AssetStatus = "pending_branch"|"pending_accountant"|"confirmed"|"registered";
  type AssetCat    = "معدات"|"تقنية"|"أثاث"|"مركبات"|"أخرى";
  interface TransferLog { date:string; from:string; to:string; note:string; by:string; }
  interface AssetEntry {
    id:string; name:string; cat:AssetCat; branch:string; cost:number; book:number; usefulLife:number;
    case_:"branch_upload"|"acc_register"; status:AssetStatus; invNum:string;
    submittedBy:string; date:string; custodian:string;
    history:TransferLog[];
  }

  const CAT_ICON: Record<AssetCat,string> = { "معدات":"🔧","تقنية":"💻","أثاث":"🪑","مركبات":"🚗","أخرى":"📦" };
  const CAT_CLR:  Record<AssetCat,string> = { "معدات":"bg-blue-500","تقنية":"bg-purple-500","أثاث":"bg-amber-500","مركبات":"bg-green-500","أخرى":"bg-gray-400" };

  const [assets, setAssets] = useState<AssetEntry[]>([
    { id:"FA-001", name:"ثلاجة عرض كبيرة",    cat:"معدات", branch:"فرع الرياض - العليا",     cost:28000, book:21000, usefulLife:60,  case_:"branch_upload",  status:"pending_accountant", invNum:"INV-A001", submittedBy:"مدير الفرع: خالد العمري", date:"12 أكت", custodian:"خالد العمري",
      history:[{date:"12 أكت", from:"—",       to:"خالد العمري",   note:"تسجيل أولي عبر الموبايل",      by:"مدير الفرع"}] },
    { id:"FA-002", name:"نظام POS متكامل",    cat:"تقنية", branch:"فرع جدة - الحمراء",       cost:15000, book:9000,  usefulLife:36,  case_:"acc_register",   status:"pending_branch",     invNum:"INV-A002", submittedBy:"المحاسب: سارة الزهراني",  date:"11 أكت", custodian:"مدير الفرع — قيد التأكيد",
      history:[{date:"11 أكت", from:"—",       to:"—",             note:"سُجِّل من المحاسب — ينتظر تأكيد الفرع", by:"المحاسب"}] },
    { id:"FA-003", name:"شاشات عرض المنيو",   cat:"تقنية", branch:"فرع مكة - المعابدة",      cost:8500,  book:7083,  usefulLife:48,  case_:"branch_upload",  status:"confirmed",          invNum:"INV-A003", submittedBy:"مدير الفرع: فهد الشمري",  date:"10 أكت", custodian:"فهد الشمري",
      history:[
        {date:"01 سبت", from:"—",              to:"فهد الشمري",    note:"تسجيل أولي",                    by:"مدير الفرع"},
        {date:"10 أكت", from:"فهد الشمري",     to:"فهد الشمري",    note:"تأكيد من المحاسب — مسجّل رسمياً", by:"المحاسب"},
      ]},
    { id:"FA-004", name:"فرن صناعي",           cat:"معدات", branch:"فرع الدمام - الخبر",      cost:45000, book:37500, usefulLife:120, case_:"acc_register",   status:"confirmed",          invNum:"INV-A004", submittedBy:"المحاسب: أحمد الفيصل",    date:"09 أكت", custodian:"ماجد المحيسن",
      history:[
        {date:"01 يون", from:"—",              to:"ناصر البقمي",   note:"استلام أولي",                   by:"مدير الفرع"},
        {date:"15 أغس", from:"ناصر البقمي",    to:"ماجد المحيسن",  note:"نقل عهدة بسبب تغيير المناوبة",   by:"المحاسب"},
        {date:"09 أكت", from:"ماجد المحيسن",   to:"ماجد المحيسن",  note:"تأكيد المحاسب للعهدة",           by:"المحاسب"},
      ]},
    { id:"FA-005", name:"مكيف مركزي",          cat:"معدات", branch:"فرع الرياض - السليمانية", cost:22000, book:18000, usefulLife:96,  case_:"branch_upload",  status:"pending_accountant", invNum:"INV-A005", submittedBy:"مدير الفرع: نواف السالم",  date:"13 أكت", custodian:"نواف السالم",
      history:[{date:"13 أكت", from:"—",       to:"نواف السالم",   note:"تسجيل أولي عبر الموبايل",      by:"مدير الفرع"}] },
    { id:"FA-006", name:"طاولات وكراسي خدمة",  cat:"أثاث", branch:"فرع جدة - الحمراء",       cost:12000, book:10000, usefulLife:60,  case_:"acc_register",   status:"confirmed",          invNum:"INV-A006", submittedBy:"المحاسب: سارة الزهراني",  date:"05 أكت", custodian:"طارق الرشيدي",
      history:[
        {date:"01 مار", from:"—",              to:"طارق الرشيدي",  note:"شراء وتسجيل",                   by:"المحاسب"},
        {date:"05 أكت", from:"طارق الرشيدي",   to:"طارق الرشيدي",  note:"مراجعة سنوية — بدون تغيير",    by:"المحاسب"},
      ]},
  ]);

  const [expandedId,     setExpandedId]    = useState<string|null>(null);
  const [filterStatus,   setFilterStatus]  = useState<"الكل"|AssetStatus>("الكل");
  const [viewMode,       setViewMode]      = useState<"list"|"branch_report">("list");
  const [filterBranch,   setFilterBranch]  = useState("الكل");
  const [assetAttach,    setAssetAttach]   = useState<{assetId:string; name:string}|null>(null);
  const [showAddModal,   setShowAddModal]  = useState(false);
  const [showTransfer,   setShowTransfer]  = useState<string|null>(null);
  const [showImportModal,setShowImportModal] = useState(false);

  // New asset form
  const [newAsset, setNewAsset] = useState({ name:"", cat:"معدات" as AssetCat, branch:"", invNum:"", cost:"", usefulLife:"60", custodian:"", notes:"" });
  const [addSent,  setAddSent]  = useState(false);
  const [transferForm, setTransferForm] = useState({to:"",note:""});

  const [reviewingDraft, setReviewingDraft] = useState<string|null>(null);

  const confirmAsset   = (id:string) => setAssets(p=>p.map(a=>a.id===id?{...a,status:"confirmed" as AssetStatus}:a));

  const confirmDraftToAssets = (draftId:string) => {
    const draft = drafts.find(d=>d.draftId===draftId);
    if(!draft) return;
    const costPerUnit = Math.round(draft.amount / Math.max(draft.qty,1));
    const newEntries: AssetEntry[] = draft.targetBranches.flatMap((br,bi)=>
      Array.from({length:draft.qty},(_,qi)=>({
        id: `FA-${String(assets.length+1+(bi*draft.qty)+qi).padStart(3,"0")}`,
        name: draft.qty>1 ? `${draft.assetName} (${qi+1})` : draft.assetName,
        cat: draft.cat as AssetCat, branch: br,
        cost: costPerUnit, book: costPerUnit, usefulLife: draft.usefulLife,
        case_: "acc_register" as const, status: "pending_branch" as AssetStatus,
        invNum: draft.invNum, submittedBy: "المحاسب — تحويل من مصروف",
        date: "اليوم", custodian: draft.custodian,
        history: [{
          date:"اليوم", from:"—", to: draft.custodian,
          note:`تحويل من فاتورة مصروف ${draft.invNum} (${draft.vendor}) — مصدر: ${draft.expenseBranch}`,
          by:"المحاسب"
        }]
      }))
    );
    setAssets(p=>[...p, ...newEntries]);
    confirmDraft(draftId);
    setReviewingDraft(null);
  };

  const submitNewAsset = () => {
    const id = `FA-${String(assets.length+1).padStart(3,"0")}`;
    setAssets(p=>[...p, {
      id, name:newAsset.name, cat:newAsset.cat, branch:newAsset.branch,
      cost:parseFloat(newAsset.cost)||0, book:parseFloat(newAsset.cost)||0,
      usefulLife:parseInt(newAsset.usefulLife)||60, case_:"acc_register",
      status:"pending_branch", invNum:newAsset.invNum||`INV-${id}`,
      submittedBy:"المحاسب", date:"اليوم", custodian:newAsset.custodian||"قيد التعيين",
      history:[{date:"اليوم", from:"—", to:newAsset.custodian||"—", note:"تسجيل من المحاسب — أُرسل إشعار للفرع", by:"المحاسب"}]
    }]);
    setAddSent(true);
    setTimeout(()=>{ setShowAddModal(false); setAddSent(false); setNewAsset({name:"",cat:"معدات",branch:"",invNum:"",cost:"",usefulLife:"60",custodian:"",notes:""}); },1200);
  };
  const submitTransfer = (id:string) => {
    setAssets(p=>p.map(a=>{
      if(a.id!==id) return a;
      const t:TransferLog = {date:"اليوم", from:a.custodian, to:transferForm.to, note:transferForm.note||"نقل عهدة", by:"المحاسب"};
      return {...a, custodian:transferForm.to, history:[...a.history,t]};
    }));
    setShowTransfer(null);
    setTransferForm({to:"",note:""});
  };

  const pendingAccountant = assets.filter(a=>a.status==="pending_accountant");
  const pendingBranch     = assets.filter(a=>a.status==="pending_branch");
  const confirmed         = assets.filter(a=>a.status==="confirmed");
  const displayedAssets   = (filterStatus==="الكل"?assets:assets.filter(a=>a.status===filterStatus));
  const ASSET_BRANCHES    = [...new Set(assets.map(a=>a.branch))];
  const branchFiltered    = filterBranch==="الكل"?assets:assets.filter(a=>a.branch===filterBranch);
  const activeDrafts      = drafts.filter(d=>d.status==="draft");

  const STATUS_ASSET: Record<AssetStatus,{label:string;cls:string}> = {
    pending_branch:     {label:"ينتظر تأكيد الفرع",   cls:"bg-amber-50 text-amber-700 border border-amber-200"},
    pending_accountant: {label:"ينتظر مراجعة المحاسب", cls:"bg-blue-50 text-blue-700 border border-blue-200"},
    confirmed:          {label:"مؤكد — مكتمل",         cls:"bg-emerald-50 text-emerald-700 border border-emerald-200"},
    registered:         {label:"مسجل",                 cls:"bg-purple-50 text-purple-700 border border-purple-200"},
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">الأصول الثابتة</h2>
          <p className="text-gray-400 text-sm mt-0.5">تسجيل وتتبع الأصول — سجل العهدة والنقل التاريخي بين الموظفين</p>
        </div>
        <div className="flex flex-col gap-2 items-end flex-shrink-0">
          {/* Row 1: view toggle + export */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {([["list","قائمة الأصول"],["branch_report","تقرير الفروع"]] as const).map(([v,l])=>(
                <button key={v} onClick={()=>setViewMode(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode===v?"bg-white text-gray-800 shadow-sm":"text-gray-500 hover:text-gray-700"}`}>
                  {l}
                </button>
              ))}
            </div>
            <button onClick={()=>alert("جارٍ تصدير سجل الأصول الثابتة إلى Excel...")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 border border-gray-200 text-xs font-semibold hover:bg-gray-100 transition-all">
              <FileText size={11}/> تصدير Excel
            </button>
          </div>
          {/* Row 2: import + add */}
          <div className="flex items-center gap-2">
            <button onClick={()=>setShowImportModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm">
              <Upload size={14}/> استيراد من Excel
            </button>
            <button onClick={()=>setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition-all shadow-sm">
              <Plus size={14}/> إضافة أصل جديد
            </button>
          </div>
        </div>
      </div>

      {/* Brand filter bar for assets */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">بحث بالاسم أو المطعم</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Search size={13} className="text-gray-400 flex-shrink-0"/>
              <input placeholder="اسم الأصل أو المطعم أو المسؤول..." className="flex-1 text-sm outline-none"/>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">العلامة التجارية</label>
            <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {["الكل","برغر خليفة","بيتزا باكو","وسطاوي"].map(b=><option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">الفئة</label>
            <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {["الكل","معدات","أجهزة","مركبات","أثاث","تجهيزات"].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── From-Expense Drafts Section ── */}
      {activeDrafts.length>0 && (
        <div className="bg-gradient-to-l from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-purple-100 bg-purple-100/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-200 rounded-xl flex items-center justify-center">
                <GitMerge size={18} className="text-purple-700"/>
              </div>
              <div>
                <h3 className="font-bold text-purple-900 text-base flex items-center gap-2">
                  مسودات محوّلة من المصروفات
                  <span className="bg-purple-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">{activeDrafts.length}</span>
                </h3>
                <p className="text-purple-600 text-xs mt-0.5">راجع بيانات كل مسودة وأكّد إضافتها لسجل الأصول الثابتة</p>
              </div>
            </div>
            <button onClick={()=>navigate("acc-expenses")}
              className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-all">
              <Wallet size={12}/> العودة للمصروفات
            </button>
          </div>

          <div className="divide-y divide-purple-100">
            {activeDrafts.map(draft=>{
              const isReviewing = reviewingDraft===draft.draftId;
              const CAT_ICON_D:Record<AssetCatType,string> = {معدات:"🔧",تقنية:"💻",أثاث:"🪑",مركبات:"🚗",أخرى:"📦"};
              return (
                <div key={draft.draftId} className={`px-5 py-4 ${isReviewing?"bg-white":"hover:bg-purple-50/60"} transition-all`}>
                  {/* Draft row header */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">{CAT_ICON_D[draft.cat]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-800 text-sm">{draft.assetName}</span>
                        <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{draft.cat}</span>
                        <span className="bg-amber-100 text-amber-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">مسودة</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1"><Wallet size={10}/> من: {draft.invNum} · {draft.vendor}</span>
                        <span>·</span>
                        <span className="font-mono font-bold text-purple-700">{fmtAmt(draft.amount)} ر.س</span>
                        <span>·</span>
                        <span>{draft.targetBranches.length} فرع · {draft.qty} وحدة · {draft.usefulLife} شهر</span>
                        <span>·</span>
                        <span>عهدة: {draft.custodian}</span>
                      </div>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {draft.targetBranches.map(b=>(
                          <span key={b} className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full font-semibold">{b}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={()=>setReviewingDraft(isReviewing?null:draft.draftId)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${isReviewing?"bg-purple-100 border-purple-300 text-purple-700":"bg-white border-gray-200 text-gray-600 hover:border-purple-300"}`}>
                        <Eye size={11}/> {isReviewing?"إخفاء":"مراجعة"}
                      </button>
                      <button onClick={()=>discardDraft(draft.draftId)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-red-100 text-red-500 hover:bg-red-50 transition-all">
                        <X size={11}/>
                      </button>
                    </div>
                  </div>

                  {/* Review panel */}
                  {isReviewing && (
                    <div className="mt-4 bg-gray-50 rounded-xl border border-gray-200 p-4">
                      <p className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-1.5"><Eye size={12}/> مراجعة بيانات الأصل قبل الإضافة</p>

                      {/* Two-column detail grid */}
                      <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                        <div className="bg-white rounded-lg border border-gray-100 p-3">
                          <p className="text-[10px] text-gray-400 font-semibold mb-1">بيانات المصروف الأصلي</p>
                          <div className="space-y-1">
                            <div className="flex justify-between"><span className="text-gray-500">الفاتورة:</span> <span className="font-mono font-bold text-purple-700">{draft.invNum}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">المورد:</span> <span className="font-semibold text-gray-800">{draft.vendor}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">المبلغ:</span> <span className="font-mono font-bold text-gray-800">{fmtAmt(draft.amount)} ر.س</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">الفرع المصدر:</span> <span className="font-semibold text-gray-800 text-[10px]">{draft.expenseBranch}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">التاريخ:</span> <span className="font-semibold text-gray-800">{draft.expenseDate}</span></div>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg border border-gray-100 p-3">
                          <p className="text-[10px] text-gray-400 font-semibold mb-1">بيانات الأصل المحوّل</p>
                          <div className="space-y-1">
                            <div className="flex justify-between"><span className="text-gray-500">اسم الأصل:</span> <span className="font-semibold text-gray-800 text-[10px]">{draft.assetName}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">الفئة:</span> <span className="font-semibold text-gray-800">{CAT_ICON_D[draft.cat]} {draft.cat}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">الكمية:</span> <span className="font-semibold text-gray-800">{draft.qty} وحدة × {draft.targetBranches.length} فرع = {draft.qty*draft.targetBranches.length} إجمالاً</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">تكلفة الوحدة:</span> <span className="font-mono font-bold text-purple-700">{fmtAmt(Math.round(draft.amount/Math.max(draft.qty,1)))} ر.س</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">المسؤول:</span> <span className="font-semibold text-gray-800">{draft.custodian}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">العمر:</span> <span className="font-semibold text-gray-800">{draft.usefulLife} شهر</span></div>
                          </div>
                        </div>
                      </div>

                      {/* Target branches */}
                      <div className="mb-4">
                        <p className="text-[10px] font-bold text-gray-500 mb-1.5">الفروع التي ستُضاف إليها الأصول ({draft.targetBranches.length})</p>
                        <div className="flex flex-wrap gap-1.5">
                          {draft.targetBranches.map(b=>(
                            <span key={b} className="text-[11px] px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-semibold">{b}</span>
                          ))}
                        </div>
                      </div>

                      {draft.notes && (
                        <div className="mb-4 bg-yellow-50 border border-yellow-100 rounded-lg p-2.5">
                          <p className="text-[10px] font-bold text-yellow-700">ملاحظات المحاسب:</p>
                          <p className="text-xs text-yellow-800 mt-0.5">{draft.notes}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button onClick={()=>confirmDraftToAssets(draft.draftId)}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-l from-emerald-600 to-emerald-500 text-white rounded-xl text-sm font-bold hover:from-emerald-700 hover:to-emerald-600 transition-all shadow-sm">
                          <CheckCircle2 size={14}/> تأكيد الإضافة — {draft.qty*draft.targetBranches.length} أصل لـ {draft.targetBranches.length} فرع
                        </button>
                        <button onClick={()=>setReviewingDraft(null)}
                          className="px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-500 hover:bg-gray-50 transition-all">
                          إغلاق المراجعة
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="بانتظار مراجعتي"    value={String(pendingAccountant.length)} sub="رُفعت من الفروع"  icon={<Clock size={18} className="text-blue-600"/>}         accent="blue"/>
        <KpiCard label="بانتظار تأكيد الفرع" value={String(pendingBranch.length)}     sub="سجّلها المحاسب"  icon={<Smartphone size={18} className="text-amber-600"/>}    accent="amber"/>
        <KpiCard label="مؤكد ومسجّل"         value={String(confirmed.length)}          sub="تمت الموافقة"    icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label="القيمة الدفترية"     value={`${(assets.reduce((s,a)=>s+a.book,0)/1000).toFixed(0)}K`} sub="ر.س — كل الأصول" icon={<Building2 size={18} className="text-purple-600"/>}   accent="purple"/>
      </div>

      {/* ── BRANCH REPORT VIEW ─────────────────────────────────────── */}
      {viewMode==="branch_report" && (
        <div className="space-y-4">
          {/* Branch filter chips */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-[11px] font-semibold text-gray-500 mb-2">اختر الفرع</p>
            <div className="flex flex-wrap gap-2">
              {["الكل",...ASSET_BRANCHES].map(b=>(
                <button key={b} onClick={()=>setFilterBranch(b)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${filterBranch===b?"bg-indigo-600 text-white border-indigo-600":"bg-white text-gray-600 border-gray-200 hover:border-indigo-300"}`}>
                  {b}
                  <span className={`text-[9px] px-1.5 rounded-full font-bold ${filterBranch===b?"bg-white text-indigo-700":"bg-gray-100 text-gray-600"}`}>
                    {b==="الكل"?assets.length:assets.filter(a=>a.branch===b).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Branch groups */}
          {(filterBranch==="الكل"?ASSET_BRANCHES:[filterBranch]).map(br=>{
            const brAssets = assets.filter(a=>a.branch===br);
            if(!brAssets.length) return null;
            const totalCost = brAssets.reduce((s,a)=>s+a.cost,0);
            const totalBook = brAssets.reduce((s,a)=>s+a.book,0);
            return (
              <div key={br} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 bg-gradient-to-l from-indigo-50 to-blue-50 border-b border-indigo-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-indigo-900 text-sm">{br}</h3>
                    <p className="text-[11px] text-indigo-600 mt-0.5">{brAssets.length} أصل · تكلفة إجمالية: <span className="font-mono font-bold">{fmtAmt(totalCost)} ر.س</span> · دفترية: <span className="font-mono font-bold">{fmtAmt(totalBook)} ر.س</span></p>
                  </div>
                </div>
                <table className="w-full text-xs" dir="rtl">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2.5 text-right font-semibold text-gray-600">الأصل</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-600">الفئة</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-600">التكلفة</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-600">الدفترية</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-orange-700 bg-orange-50/60">تحت عهدة</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-600">الحالة</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-600">سجل النقل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {brAssets.map(a=>{
                      const cfg = STATUS_ASSET[a.status];
                      return (
                        <tr key={a.id} className="hover:bg-gray-50/60">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{CAT_ICON[a.cat]}</span>
                              <div>
                                <p className="font-semibold text-gray-800">{a.name}</p>
                                <p className="text-[10px] text-gray-400 font-mono">{a.id} · {a.invNum}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge className="bg-gray-100 text-gray-600 text-[10px]">{a.cat}</Badge>
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-gray-800">{fmtAmt(a.cost)}</td>
                          <td className="px-4 py-3 text-center font-mono text-gray-600">{fmtAmt(a.book)}</td>
                          <td className="px-4 py-3 text-center bg-orange-50/30">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-orange-800 font-semibold text-[11px]">{a.custodian}</span>
                              {a.history.length>1 && <span className="text-[9px] text-orange-500">{a.history.length} عملية نقل</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge className={`${cfg.cls} text-[10px]`}>{cfg.label}</Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={()=>setExpandedId(expandedId===a.id?null:a.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] hover:bg-indigo-100 transition-all">
                              <Clock size={9}/> التاريخ ({a.history.length})
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {/* History panels */}
                {brAssets.filter(a=>expandedId===a.id).map(a=>(
                  <div key={a.id} className="px-5 pb-4 pt-2 bg-indigo-50/30 border-t border-indigo-100">
                    <p className="text-[11px] font-bold text-indigo-800 mb-2">📋 سجل العهدة والنقل — {a.name}</p>
                    <div className="space-y-2">
                      {a.history.map((h,hi)=>(
                        <div key={hi} className="flex items-start gap-3 text-xs">
                          <div className="w-5 h-5 rounded-full bg-indigo-200 text-indigo-800 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{hi+1}</div>
                          <div className="flex-1 bg-white rounded-lg border border-indigo-100 px-3 py-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-700">{h.date} — {h.by}</span>
                              {h.from!=="—" && <span className="text-[10px] text-gray-400">{h.from} → <span className="text-indigo-700 font-semibold">{h.to}</span></span>}
                            </div>
                            <p className="text-gray-500 mt-0.5">{h.note}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Btn size="sm" onClick={()=>setShowTransfer(a.id)}><ArrowLeftRight size={11}/> نقل عهدة</Btn>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ── LIST VIEW ─────────────────────────────────────────────── */}
      {viewMode==="list" && (
        <div className="space-y-4">
          {/* Workflow explanation */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3" dir="rtl">
              <div className="flex items-center gap-2 mb-1"><Smartphone size={14} className="text-blue-600 flex-shrink-0"/>
                <span className="text-xs font-bold text-blue-800">الحالة 1 — مدير الفرع يرفع عبر الموبايل</span>
              </div>
              <p className="text-[11px] text-blue-600">يرفع مدير الفرع صورة الأصل والفاتورة → يستلمها المحاسب هنا → يراجعها ويسجّلها</p>
            </div>
            <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3" dir="rtl">
              <div className="flex items-center gap-2 mb-1"><Clipboard size={14} className="text-amber-600 flex-shrink-0"/>
                <span className="text-xs font-bold text-amber-800">الحالة 2 — المحاسب يسجّل الفاتورة</span>
              </div>
              <p className="text-[11px] text-amber-600">المحاسب يسجّل الأصل → يُرسل إشعاراً لمدير الفرع → مدير الفرع يؤكد الاستلام</p>
            </div>
          </div>

          {/* Status filter */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">تصفية حسب الحالة</label>
              <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value as "الكل"|AssetStatus)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 min-w-[220px]">
                <option value="الكل">الكل — {assets.length} أصل</option>
                <option value="pending_accountant">ينتظر مراجعة المحاسب ({pendingAccountant.length})</option>
                <option value="pending_branch">ينتظر تأكيد الفرع ({pendingBranch.length})</option>
                <option value="confirmed">مؤكد — مكتمل ({confirmed.length})</option>
              </select>
            </div>
            {filterStatus!=="الكل" && <button onClick={()=>setFilterStatus("الكل")} className="text-xs text-purple-600 hover:underline flex items-center gap-1 mt-4"><RotateCcw size={11}/> مسح</button>}
          </div>

          {/* Assets list */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm">سجل الأصول — اضغط لعرض التفاصيل والتاريخ</h3>
              <span className="text-xs text-gray-400">{displayedAssets.length} أصل</span>
            </div>
            {displayedAssets.map(a=>{
              const isExpanded = expandedId===a.id;
              const cfg        = STATUS_ASSET[a.status];
              return (
                <div key={a.id} className="border-b border-gray-100 last:border-0">
                  <div className={`px-5 py-4 flex items-center gap-4 hover:bg-gray-50/70 cursor-pointer ${isExpanded?"bg-purple-50/20":""}`}
                    onClick={()=>setExpandedId(isExpanded?null:a.id)}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${CAT_CLR[a.cat]}`}>
                      {CAT_ICON[a.cat]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-800 text-sm">{a.name}</span>
                        <Badge className="bg-gray-50 text-gray-600 border border-gray-200 text-[10px]">{a.cat}</Badge>
                        <Badge className={`${cfg.cls} text-[10px]`}>{cfg.label}</Badge>
                        {a.case_==="branch_upload"
                          ? <Badge className="bg-blue-50 text-blue-600 text-[10px]"><Smartphone size={9} className="ml-0.5"/> مُرفوع من الفرع</Badge>
                          : <Badge className="bg-amber-50 text-amber-600 text-[10px]"><Clipboard size={9} className="ml-0.5"/> سجّله المحاسب</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-xs text-gray-400">{a.branch} · {a.date}</p>
                        <span className="text-[10px] text-orange-700 font-semibold">عهدة: {a.custodian}</span>
                        {a.history.length>1 && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold">{a.history.length} نقل</span>}
                      </div>
                    </div>
                    <div className="text-left text-sm">
                      <p className="font-mono font-bold text-gray-800">{fmtAmt(a.cost)} ر.س</p>
                      <p className="text-xs text-gray-400 mt-0.5">دفترية: {fmtAmt(a.book)} ر.س</p>
                    </div>
                    {isExpanded?<ChevronUp size={14} className="text-gray-400"/>:<ChevronDown size={14} className="text-gray-400"/>}
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-5 bg-gray-50/40 space-y-3">
                      <div className="grid grid-cols-4 gap-3 mt-2">
                        <div className="bg-white rounded-xl border border-gray-100 p-3">
                          <p className="text-[10px] font-semibold text-gray-400 mb-1">رقم الفاتورة</p>
                          <p className="text-sm font-bold font-mono text-purple-700">{a.invNum}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 p-3">
                          <p className="text-[10px] font-semibold text-gray-400 mb-1">التكلفة</p>
                          <p className="text-sm font-bold font-mono">{fmtAmt(a.cost)} ر.س</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 p-3">
                          <p className="text-[10px] font-semibold text-gray-400 mb-1">القيمة الدفترية</p>
                          <p className="text-sm font-bold font-mono">{fmtAmt(a.book)} ر.س</p>
                        </div>
                        <div className="bg-white rounded-xl border border-orange-100 p-3 bg-orange-50/30">
                          <p className="text-[10px] font-semibold text-orange-500 mb-1">تحت عهدة</p>
                          <p className="text-sm font-bold text-orange-800">{a.custodian}</p>
                        </div>
                      </div>

                      <button onClick={()=>setAssetAttach({assetId:a.id,name:a.name})}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold border border-blue-200 transition-all">
                        <Paperclip size={11}/> عرض المرفقات (صورة الأصل + الفاتورة)
                      </button>

                      {/* Transfer history */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-gray-700">📋 سجل العهدة والنقل</p>
                          <button onClick={()=>setShowTransfer(a.id)} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                            <ArrowLeftRight size={11}/> نقل عهدة
                          </button>
                        </div>
                        <div className="space-y-2">
                          {a.history.map((h,hi)=>(
                            <div key={hi} className="flex items-start gap-3 text-xs">
                              <div className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${hi===a.history.length-1?"bg-indigo-600 text-white":"bg-gray-200 text-gray-600"}`}>{hi+1}</div>
                              <div className="flex-1 bg-white rounded-lg border border-gray-100 px-3 py-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-gray-700">{h.date} · {h.by}</span>
                                  {h.from!=="—" && <span className="text-[10px] text-gray-400 font-mono">{h.from} → <span className="text-indigo-700 font-semibold">{h.to}</span></span>}
                                </div>
                                <p className="text-gray-500 mt-0.5">{h.note}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Workflow state actions */}
                      {a.status==="pending_accountant" && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                          <Smartphone size={16} className="text-blue-600 mt-0.5 flex-shrink-0"/>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-blue-900">الخطوة: مراجعة وتأكيد التسجيل</p>
                            <p className="text-xs text-blue-600 mt-0.5">رُفع الأصل من الفرع. راجع البيانات والمرفقات ثم أكّد التسجيل الرسمي.</p>
                          </div>
                          <Btn size="sm" variant="success" onClick={()=>confirmAsset(a.id)}><CheckCircle2 size={12}/> تأكيد التسجيل</Btn>
                        </div>
                      )}
                      {a.status==="pending_branch" && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                          <Smartphone size={16} className="text-amber-600 mt-0.5 flex-shrink-0"/>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-amber-900">بانتظار تأكيد الفرع على الموبايل</p>
                            <p className="text-xs text-amber-600 mt-0.5">أُرسل إشعار لمدير الفرع لتأكيد الاستلام الفعلي.</p>
                          </div>
                          <Badge className="bg-amber-100 text-amber-700 text-xs flex-shrink-0">⏳ ينتظر الفرع</Badge>
                        </div>
                      )}
                      {a.status==="confirmed" && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0"/>
                          <p className="text-sm text-emerald-800 font-medium">مكتمل — تم التأكيد من كلا الطرفين. الأصل مسجّل رسمياً.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ADD ASSET MODAL ──────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={()=>setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden" onClick={e=>e.stopPropagation()} dir="rtl">
            <div className="px-6 py-4 bg-gradient-to-l from-purple-700 to-purple-600 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">إضافة أصل ثابت جديد</h3>
                <p className="text-purple-200 text-xs mt-0.5">يُرسَل للفرع تلقائياً لتأكيد الاستلام بعد الحفظ</p>
              </div>
              <button onClick={()=>setShowAddModal(false)} className="text-purple-200 hover:text-white"><X size={18}/></button>
            </div>
            {addSent ? (
              <div className="p-10 flex flex-col items-center justify-center text-center">
                <CheckCircle2 size={48} className="text-emerald-500 mb-3"/>
                <p className="font-bold text-gray-900 text-lg">تم إرسال الإشعار للفرع!</p>
                <p className="text-gray-500 text-sm mt-1">سيتلقى مدير الفرع إشعاراً على تطبيق الموبايل لتأكيد الاستلام</p>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-600 block mb-1">اسم الأصل *</label>
                    <input value={newAsset.name} onChange={e=>setNewAsset(p=>({...p,name:e.target.value}))}
                      placeholder="مثال: ثلاجة عرض — باناسونيك 600L"
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-purple-400 outline-none"/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">الفئة *</label>
                    <select value={newAsset.cat} onChange={e=>setNewAsset(p=>({...p,cat:e.target.value as AssetCat}))}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-purple-400 outline-none">
                      {(["معدات","تقنية","أثاث","مركبات","أخرى"] as AssetCat[]).map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">الفرع *</label>
                    <select value={newAsset.branch} onChange={e=>setNewAsset(p=>({...p,branch:e.target.value}))}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-purple-400 outline-none">
                      <option value="">-- اختر الفرع --</option>
                      {ASSET_BRANCHES.map(b=><option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">رقم الفاتورة</label>
                    <input value={newAsset.invNum} onChange={e=>setNewAsset(p=>({...p,invNum:e.target.value}))}
                      placeholder="INV-XXXX" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-purple-400 outline-none" dir="ltr"/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">التكلفة الإجمالية (ر.س) *</label>
                    <input value={newAsset.cost} onChange={e=>setNewAsset(p=>({...p,cost:e.target.value}))}
                      placeholder="0.00" type="number"
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-purple-400 outline-none text-center font-mono"/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">العمر الافتراضي (شهر)</label>
                    <input value={newAsset.usefulLife} onChange={e=>setNewAsset(p=>({...p,usefulLife:e.target.value}))}
                      type="number" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-purple-400 outline-none text-center font-mono"/>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-600 block mb-1">المسؤول / الموظف (اسم أمين العهدة)</label>
                    <input value={newAsset.custodian} onChange={e=>setNewAsset(p=>({...p,custodian:e.target.value}))}
                      placeholder="اسم مدير الفرع أو الموظف المسؤول"
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-purple-400 outline-none"/>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-600 block mb-1">ملاحظات</label>
                    <textarea value={newAsset.notes} onChange={e=>setNewAsset(p=>({...p,notes:e.target.value}))}
                      rows={2} placeholder="أي ملاحظات إضافية..."
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-purple-400 outline-none resize-none"/>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <Smartphone size={14} className="text-amber-600 flex-shrink-0 mt-0.5"/>
                  <p className="text-xs text-amber-700">بعد الحفظ، سيتلقى مدير الفرع إشعاراً فورياً على تطبيق الموبايل لتأكيد استلام الأصل وإضافته رسمياً لأصول الفرع.</p>
                </div>
                <div className="flex gap-3 justify-end">
                  <Btn onClick={()=>setShowAddModal(false)}>إلغاء</Btn>
                  <Btn variant="primary" onClick={submitNewAsset} disabled={!newAsset.name||!newAsset.branch||!newAsset.cost}>
                    <Send size={13}/> حفظ وإرسال للفرع
                  </Btn>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TRANSFER CUSTODY MODAL ──────────────────────────────── */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={()=>setShowTransfer(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e=>e.stopPropagation()} dir="rtl">
            <div className="px-5 py-4 bg-gradient-to-l from-indigo-700 to-indigo-600 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">نقل عهدة الأصل</h3>
                <p className="text-indigo-200 text-xs mt-0.5">{assets.find(a=>a.id===showTransfer)?.name}</p>
              </div>
              <button onClick={()=>setShowTransfer(null)} className="text-indigo-200 hover:text-white"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-center flex-1">
                  <p className="text-[10px] text-gray-500 mb-0.5">الحالي</p>
                  <p className="font-bold text-gray-800 text-sm">{assets.find(a=>a.id===showTransfer)?.custodian}</p>
                </div>
                <ArrowLeftRight size={16} className="text-indigo-500"/>
                <div className="text-center flex-1">
                  <p className="text-[10px] text-gray-500 mb-0.5">الجديد</p>
                  <p className="font-bold text-indigo-700 text-sm">{transferForm.to||"—"}</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">اسم المسؤول الجديد *</label>
                <input value={transferForm.to} onChange={e=>setTransferForm(p=>({...p,to:e.target.value}))}
                  placeholder="اسم الموظف أو مدير الفرع الجديد"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-indigo-400 outline-none"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">سبب النقل</label>
                <input value={transferForm.note} onChange={e=>setTransferForm(p=>({...p,note:e.target.value}))}
                  placeholder="مثال: نقل الفرع، تغيير المناوبة..."
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-indigo-400 outline-none"/>
              </div>
              <div className="flex gap-3 justify-end">
                <Btn onClick={()=>setShowTransfer(null)}>إلغاء</Btn>
                <Btn variant="primary" onClick={()=>submitTransfer(showTransfer)} disabled={!transferForm.to}>
                  <ArrowLeftRight size={13}/> تأكيد النقل وتوثيقه
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EXCEL IMPORT MODAL ──────────────────────────────────── */}
      {showImportModal && <ExcelImportModal assets={assets} setAssets={setAssets} onClose={()=>setShowImportModal(false)}/>}

      {/* Asset attachment viewer modal */}
      {assetAttach && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6" onClick={()=>setAssetAttach(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e=>e.stopPropagation()} dir="rtl">
            <div className="px-5 py-4 bg-gradient-to-l from-blue-600 to-blue-700 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">مرفقات الأصل — {assetAttach.name}</h3>
                <p className="text-blue-200 text-xs mt-0.5">مرفق 1 من 2</p>
              </div>
              <button onClick={()=>setAssetAttach(null)} className="text-blue-200 hover:text-white"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-3">
              {[
                {name:`صورة_الأصل_${assetAttach.assetId}.jpg`,    type:"صورة", size:"340KB", icon:"🖼"},
                {name:`فاتورة_شراء_${assetAttach.assetId}.pdf`,   type:"PDF",   size:"180KB", icon:"📄"},
              ].map((att,i)=>(
                <div key={i} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer group">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-xl ${att.type==="صورة"?"bg-purple-100":"bg-blue-100"}`}>{att.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate" dir="ltr">{att.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{att.type} · {att.size}</p>
                  </div>
                  <Btn size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity"><Eye size={11}/> عرض</Btn>
                </div>
              ))}
            </div>
            <div className="px-5 pb-4 flex gap-2 justify-end border-t border-gray-100 pt-3">
              <Btn size="sm"><Plus size={11}/> إضافة مرفق</Btn>
              <Btn size="sm" onClick={()=>setAssetAttach(null)}>إغلاق</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// WASTE / DAMAGE MODULE — موديول الهدر والتالف
// ════════════════════════════════════════════════════════════
function AccWaste({}: PageProps) {
  type WasteClass = "هدر"|"تالف";
  type Resp = "موظف"|"مطعم";
  type EmpAlloc = { empId:string; empName:string; amount:string };
  interface WasteProduct {
    name:string; qty:number; unit:string; unitPrice:number;
    class_:WasteClass; resp:Resp; hasImg:boolean;
    empAllocs: EmpAlloc[];
  }
  interface WasteEntry { id:string; branch:string; date:string; status:"pending"|"approved"|"rejected"; products:WasteProduct[] }

  const WASTE_EMP: Record<string,string> = {
    "1001":"أحمد العمري","1002":"سارة الزهراني","1003":"فهد القحطاني",
    "1004":"نورة المطيري","1005":"خالد السالم","1006":"طارق الرشيدي"
  };

  const [filterBranch, setFilterBranch] = useState("الكل");
  const [expandedId,   setExpandedId]   = useState<string|null>(null);
  const [expandedProd, setExpandedProd] = useState<Record<string,number|null>>({});

  const [entries, setEntries] = useState<WasteEntry[]>([
    { id:"WD-001", branch:"فرع الرياض - العليا", date:"14 أكت", status:"pending",
      products:[
        { name:"دجاج طازج",   qty:3,  unit:"كجم",   unitPrice:35, class_:"تالف", resp:"موظف", hasImg:true,
          empAllocs:[{empId:"1001",empName:"أحمد العمري",amount:"75"},{empId:"",empName:"",amount:""}] },
        { name:"زيت قلي",     qty:10, unit:"لتر",   unitPrice:18, class_:"هدر",  resp:"مطعم", hasImg:false,
          empAllocs:[{empId:"",empName:"",amount:""}] },
      ]},
    { id:"WD-002", branch:"فرع جدة - الحمراء", date:"13 أكت", status:"pending",
      products:[
        { name:"خبز برجر",     qty:20, unit:"قطعة", unitPrice:2,  class_:"هدر",  resp:"مطعم", hasImg:false,
          empAllocs:[{empId:"",empName:"",amount:""}] },
        { name:"صوص مايونيز", qty:2,  unit:"كجم",   unitPrice:25, class_:"تالف", resp:"موظف", hasImg:true,
          empAllocs:[{empId:"1003",empName:"فهد القحطاني",amount:"30"},{empId:"1005",empName:"خالد السالم",amount:"20"}] },
        { name:"مشروبات غازية",qty:6,  unit:"علبة", unitPrice:4,  class_:"هدر",  resp:"مطعم", hasImg:false,
          empAllocs:[{empId:"",empName:"",amount:""}] },
      ]},
    { id:"WD-003", branch:"فرع مكة - المعابدة", date:"12 أكت", status:"approved",
      products:[
        { name:"دجاج طازج",   qty:1,  unit:"كجم",   unitPrice:35, class_:"تالف", resp:"موظف", hasImg:true,
          empAllocs:[{empId:"1002",empName:"سارة الزهراني",amount:"35"}] },
      ]},
  ]);

  const updProd = (eid:string, pi:number, fn:(p:WasteProduct)=>WasteProduct) =>
    setEntries(prev=>prev.map(e=>e.id===eid?{...e,products:e.products.map((p,i)=>i===pi?fn(p):p)}:e));

  const toggleClass = (eid:string, pi:number) =>
    updProd(eid,pi,p=>({...p,class_:p.class_==="هدر"?"تالف":"هدر" as WasteClass}));
  const toggleResp = (eid:string, pi:number) =>
    updProd(eid,pi,p=>({...p,resp:p.resp==="موظف"?"مطعم":"موظف" as Resp}));

  const setAllocField = (eid:string, pi:number, ai:number, field:keyof EmpAlloc, val:string) =>
    updProd(eid,pi,p=>({
      ...p,
      empAllocs:p.empAllocs.map((a,k)=>k===ai
        ? {...a,[field]:val,...(field==="empId"?{empName:WASTE_EMP[val]||""}:{})}
        : a
      )
    }));
  const addAlloc = (eid:string, pi:number) =>
    updProd(eid,pi,p=>({...p,empAllocs:[...p.empAllocs,{empId:"",empName:"",amount:""}]}));
  const removeAlloc = (eid:string, pi:number, ai:number) =>
    updProd(eid,pi,p=>({...p,empAllocs:p.empAllocs.filter((_,k)=>k!==ai)}));

  const approve = (id:string) => setEntries(p=>p.map(e=>e.id===id?{...e,status:"approved" as const}:e));
  const reject  = (id:string) => setEntries(p=>p.map(e=>e.id===id?{...e,status:"rejected" as const}:e));

  const pending  = entries.filter(e=>e.status==="pending");
  const approved = entries.filter(e=>e.status==="approved");
  const displayed= filterBranch==="الكل" ? entries : entries.filter(e=>e.branch===filterBranch);
  const displayedPending = displayed.filter(e=>e.status==="pending");
  const WASTE_BRANCHES   = [...new Set(entries.map(e=>e.branch))];

  const totalWasteAmt = entries.flatMap(e=>e.products).reduce((s,p)=>s+p.qty*p.unitPrice,0);
  const empChargedAmt = entries.flatMap(e=>e.products)
    .filter(p=>p.resp==="موظف")
    .flatMap(p=>p.empAllocs)
    .reduce((s,a)=>s+(parseFloat(a.amount)||0),0);

  const approveAllDisplayed = () =>
    setEntries(p=>p.map(e=>(filterBranch==="الكل"||e.branch===filterBranch)?{...e,status:"approved" as const}:e));

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">موديول الهدر والتالف</h2>
          <p className="text-gray-400 text-sm mt-0.5">مراجعة بيانات الهدر — تعديل التصنيف والقيمة المالية وتوزيع التحميل على الموظفين</p>
        </div>
        {displayedPending.length>0 && (
          <Btn variant="success" size="sm" onClick={approveAllDisplayed}>
            <CheckCircle2 size={12}/>
            {filterBranch==="الكل"
              ? `موافقة على الكل (${displayedPending.length})`
              : `موافقة على ${filterBranch} (${displayedPending.length})`}
          </Btn>
        )}
      </div>

      {/* Filters: brand dropdown + Excel + chips */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">بحث بالفرع أو المطعم</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Search size={13} className="text-gray-400 flex-shrink-0"/>
              <input placeholder="اسم الفرع أو المطعم..." className="flex-1 text-sm outline-none"/>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">العلامة التجارية</label>
            <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {["الكل","برغر خليفة","بيتزا باكو","وسطاوي"].map(b=><option key={b}>{b}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={()=>alert("جارٍ تصدير بيانات الهدر والتالف إلى Excel...")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-semibold hover:bg-emerald-100 transition-all">
              <FileText size={13}/> تصدير Excel
            </button>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-gray-500 mb-2">تصفية حسب الفرع</p>
          <div className="flex flex-wrap gap-2">
            {["الكل",...WASTE_BRANCHES].map(b=>{
              const bPend = b==="الكل" ? pending.length : entries.filter(e=>e.branch===b&&e.status==="pending").length;
              return (
                <button key={b} onClick={()=>setFilterBranch(b)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${filterBranch===b?"bg-purple-600 text-white border-purple-600 shadow-sm":"bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600"}`}>
                  {b}
                  {bPend>0 && <span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${filterBranch===b?"bg-white text-purple-700":"bg-amber-500 text-white"}`}>{bPend}</span>}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2">{displayed.length} بيان{filterBranch!=="الكل"?` — ${filterBranch}`:""}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="بانتظار المراجعة"  value={String(pending.length)}  sub="من الفروع"        icon={<Clock size={18} className="text-amber-600"/>}    accent="amber"/>
        <KpiCard label="معتمد"             value={String(approved.length)} sub="هذا الشهر"        icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label="إجمالي الخسائر"    value={`${fmtAmt(totalWasteAmt)} ر.س`} sub="هدر + تالف"   icon={<Trash2 size={18} className="text-rose-600"/>}   accent="red"/>
        <KpiCard label="محمَّل على الموظفين" value={`${fmtAmt(empChargedAmt)} ر.س`} sub="مُعيَّن فعلياً" icon={<Users size={18} className="text-orange-600"/>}  accent="orange"/>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">بيانات الهدر والتالف</h3>
          <span className="text-xs text-gray-400">{displayed.length} بيان — اضغط لعرض المنتجات والتحميل</span>
        </div>
        {displayed.map(entry=>{
          const isExpanded = expandedId===entry.id;
          const entryTotal = entry.products.reduce((s,p)=>s+p.qty*p.unitPrice,0);
          const empTotal   = entry.products.filter(p=>p.resp==="موظف").flatMap(p=>p.empAllocs).reduce((s,a)=>s+(parseFloat(a.amount)||0),0);
          const statusCls  = entry.status==="pending"?"bg-amber-50 text-amber-700 border border-amber-200":entry.status==="approved"?"bg-emerald-50 text-emerald-700 border border-emerald-200":"bg-red-50 text-red-700 border border-red-200";
          const statusLbl  = entry.status==="pending"?"معلق":entry.status==="approved"?"معتمد":"مرفوض";
          return (
            <div key={entry.id} className="border-b border-gray-100 last:border-0">
              <div className={`px-5 py-4 flex items-center gap-4 hover:bg-gray-50/70 cursor-pointer ${isExpanded?"bg-rose-50/20":""}`}
                onClick={()=>setExpandedId(isExpanded?null:entry.id)}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 text-sm">{entry.branch}</span>
                    <span className="font-mono text-xs text-rose-600">{entry.id}</span>
                    <Badge className={`${statusCls} text-[10px]`}>{statusLbl}</Badge>
                    <Badge className="bg-gray-50 text-gray-600 border border-gray-200 text-[10px]">{entry.products.length} منتج</Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-0.5">
                    <p className="text-xs text-gray-400">{entry.date}</p>
                    <span className="text-xs font-mono font-bold text-rose-700">إجمالي: {fmtAmt(entryTotal)} ر.س</span>
                    {empTotal>0 && <span className="text-[10px] text-orange-600 font-semibold">منه على موظفين: {fmtAmt(empTotal)} ر.س</span>}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {entry.status==="pending" && <>
                    <Btn size="sm" variant="success" onClick={e=>{e.stopPropagation();approve(entry.id)}}><ThumbsUp size={12}/></Btn>
                    <Btn size="sm" variant="danger"  onClick={e=>{e.stopPropagation();reject(entry.id)}}><ThumbsDown size={12}/></Btn>
                  </>}
                </div>
                {isExpanded?<ChevronUp size={14} className="text-gray-400 flex-shrink-0"/>:<ChevronDown size={14} className="text-gray-400 flex-shrink-0"/>}
              </div>

              {isExpanded && (
                <div className="px-5 pb-5 bg-gray-50/40 space-y-3">
                  <p className="text-xs font-bold text-gray-600 mt-3">المنتجات المشمولة — يمكن تعديل التصنيف والمسؤولية وتوزيع التحميل المالي:</p>

                  {entry.products.map((prod,pi)=>{
                    const prodValue   = prod.qty * prod.unitPrice;
                    const allocTotal  = prod.empAllocs.reduce((s,a)=>s+(parseFloat(a.amount)||0),0);
                    const remaining   = prodValue - allocTotal;
                    const prodKey     = `${entry.id}-${pi}`;
                    const isAllocOpen = expandedProd[entry.id]===pi;

                    return (
                      <div key={pi} className={`bg-white rounded-xl border overflow-hidden ${prod.resp==="موظف"?"border-orange-100":"border-gray-100"}`}>
                        {/* Product summary row */}
                        <div className="px-4 py-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-800 text-sm">{prod.name}</span>
                              <span className="text-[10px] text-gray-500 font-mono">{prod.qty} {prod.unit} × {fmtAmt(prod.unitPrice)} ر.س</span>
                              <span className="font-mono font-black text-rose-700 text-sm">{fmtAmt(prodValue)} ر.س</span>
                              {prod.hasImg && <button className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px]"><Eye size={9}/> صورة</button>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Class toggle */}
                            {entry.status==="pending"
                              ? <button onClick={()=>toggleClass(entry.id,pi)}
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${prod.class_==="تالف"?"bg-red-50 text-red-700 border-red-200":"bg-amber-50 text-amber-700 border-amber-200"}`}>
                                  {prod.class_==="تالف"?"🔴 تالف":"🟡 هدر"}
                                </button>
                              : <Badge className={prod.class_==="تالف"?"bg-red-50 text-red-700 text-[10px]":"bg-amber-50 text-amber-700 text-[10px]"}>{prod.class_}</Badge>
                            }
                            {/* Resp toggle */}
                            {entry.status==="pending"
                              ? <button onClick={()=>toggleResp(entry.id,pi)}
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${prod.resp==="موظف"?"bg-orange-50 text-orange-700 border-orange-200":"bg-gray-50 text-gray-600 border-gray-200"}`}>
                                  {prod.resp==="موظف"?"👤 موظف":"🏪 مطعم"}
                                </button>
                              : <Badge className={prod.resp==="موظف"?"bg-orange-50 text-orange-700 text-[10px]":"bg-gray-50 text-gray-600 text-[10px]"}>{prod.resp}</Badge>
                            }
                            {/* Expand allocation */}
                            {prod.resp==="موظف" && (
                              <button
                                onClick={()=>setExpandedProd(p=>({...p,[entry.id]:isAllocOpen?null:pi}))}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${isAllocOpen?"bg-orange-100 text-orange-700 border-orange-300":"bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100"}`}>
                                <Users size={10}/> تحميل مالي
                                {prod.empAllocs.some(a=>a.empId) && <span className="bg-orange-500 text-white rounded-full w-3.5 h-3.5 text-[8px] flex items-center justify-center">{prod.empAllocs.filter(a=>a.empId).length}</span>}
                                {isAllocOpen?<ChevronUp size={9}/>:<ChevronDown size={9}/>}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Employee allocation panel */}
                        {prod.resp==="موظف" && isAllocOpen && (
                          <div className="px-4 pb-4 pt-1 bg-orange-50/40 border-t border-orange-100">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[11px] font-bold text-orange-800">توزيع التحميل المالي — قيمة المنتج: <span className="font-mono">{fmtAmt(prodValue)} ر.س</span></p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${remaining===0?"bg-emerald-100 text-emerald-700":remaining<0?"bg-red-100 text-red-700":"bg-amber-100 text-amber-700"}`}>
                                {remaining===0?"✅ مكتمل":remaining>0?`متبقٍّ: ${fmtAmt(remaining)} ر.س`:`زيادة: ${fmtAmt(Math.abs(remaining))} ر.س`}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {prod.empAllocs.map((alloc,ai)=>(
                                <div key={ai} className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-full bg-orange-200 text-orange-800 text-[9px] font-bold flex items-center justify-center flex-shrink-0">{ai+1}</div>
                                  <input value={alloc.empId}
                                    onChange={e=>setAllocField(entry.id,pi,ai,"empId",e.target.value)}
                                    placeholder="رقم الموظف"
                                    className="w-24 text-[11px] border border-orange-200 rounded-lg px-2 py-1.5 text-center font-mono bg-white"/>
                                  <input value={alloc.empName} readOnly
                                    placeholder="الاسم تلقائياً"
                                    className="flex-1 text-[11px] border border-gray-100 rounded-lg px-2 py-1.5 bg-white/70 text-gray-600"/>
                                  <input value={alloc.amount}
                                    onChange={e=>setAllocField(entry.id,pi,ai,"amount",e.target.value)}
                                    placeholder="المبلغ" type="number"
                                    className="w-24 text-[11px] border border-orange-200 rounded-lg px-2 py-1.5 text-center font-mono bg-white"/>
                                  <span className="text-[10px] text-gray-400 flex-shrink-0">ر.س</span>
                                  {prod.empAllocs.length>1 && (
                                    <button onClick={()=>removeAlloc(entry.id,pi,ai)} className="text-gray-300 hover:text-red-400"><X size={12}/></button>
                                  )}
                                  {ai===prod.empAllocs.length-1 && remaining>0 && (
                                    <button onClick={()=>setAllocField(entry.id,pi,ai,"amount",String(remaining))}
                                      title="تعبئة المتبقي" className="px-1.5 py-1 text-[9px] bg-orange-100 text-orange-700 rounded font-bold hover:bg-orange-200 flex-shrink-0">⚡</button>
                                  )}
                                </div>
                              ))}
                            </div>
                            <button onClick={()=>addAlloc(entry.id,pi)}
                              className="mt-2 inline-flex items-center gap-1 text-[11px] text-orange-600 hover:underline">
                              <Plus size={10}/> إضافة موظف آخر
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {entry.status==="pending" && (
                    <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                      <p className="text-[11px] text-blue-700 font-medium">
                        💡 <strong>تالف</strong> = يُحمَّل بالقيمة المالية على الموظف (يمكن توزيعه على أكثر من موظف) · <strong>هدر</strong> = خسارة تشغيلية تُحمَّل على المطعم
                      </p>
                    </div>
                  )}

                  {/* Entry financial summary */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-[10px] text-gray-500 mb-0.5">إجمالي الخسائر</p>
                      <p className="font-mono font-black text-rose-700 text-sm">{fmtAmt(entryTotal)} ر.س</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 mb-0.5">محمَّل على موظفين</p>
                      <p className="font-mono font-black text-orange-700 text-sm">{fmtAmt(empTotal)} ر.س</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 mb-0.5">على المطعم</p>
                      <p className="font-mono font-black text-gray-700 text-sm">{fmtAmt(entryTotal-empTotal)} ر.س</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// REMINDERS SYSTEM — نظام التذكيرات للفروع
// ════════════════════════════════════════════════════════════
function AccReminders({}: PageProps) {
  type ReminderStatus = "not_sent"|"sent"|"responded";
  type ResponseType = "سيرسل لاحقاً"|"لا مشتريات اليوم"|"تم الجرد — قيد الرفع"|"توضيح: لا يوجد هدر اليوم"|null;
  interface MissingReport { id:string; branch:string; reportType:string; moduleKey:string; requiredBy:string; daysMissing:number; urgency:"high"|"medium"|"low"; reminderStatus:ReminderStatus; response:ResponseType }

  const MODULE_LABELS: Record<string,string> = {
    "sales":              "المبيعات",
    "inventory_daily":    "الجرد اليومي",
    "inventory_monthly":  "الجرد الشهري",
    "waste":              "الهدر والتالف",
    "purchases":          "المشتريات",
    "expenses":           "المصروفات",
  };

  const [filterModule, setFilterModule] = useState("الكل");
  const [filterBranch, setFilterBranch] = useState("الكل");
  const [broadcastModal, setBroadcastModal] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState<"all"|string>("all");
  const [broadcastModule, setBroadcastModule] = useState("");
  const [broadcastMsg,    setBroadcastMsg]    = useState("");

  const [reminders, setReminders] = useState<MissingReport[]>([
    { id:"R001", branch:"فرع الرياض - العليا",      reportType:"جرد المخزون اليومي",    moduleKey:"inventory_daily",   requiredBy:"14 أكت",  daysMissing:1, urgency:"high",   reminderStatus:"not_sent", response:null },
    { id:"R002", branch:"فرع جدة - الحمراء",        reportType:"تقرير المبيعات اليومي", moduleKey:"sales",             requiredBy:"14 أكت",  daysMissing:1, urgency:"high",   reminderStatus:"sent",     response:null },
    { id:"R003", branch:"فرع مكة - المعابدة",       reportType:"طلب الشراء الأسبوعي",   moduleKey:"purchases",         requiredBy:"13 أكت",  daysMissing:2, urgency:"medium", reminderStatus:"responded", response:"سيرسل لاحقاً" },
    { id:"R004", branch:"فرع الدمام",               reportType:"تقرير الهدر والتالف",   moduleKey:"waste",             requiredBy:"13 أكت",  daysMissing:2, urgency:"low",    reminderStatus:"responded", response:"توضيح: لا يوجد هدر اليوم" },
    { id:"R005", branch:"فرع الرياض - السليمانية",  reportType:"جرد المخزون اليومي",    moduleKey:"inventory_daily",   requiredBy:"12 أكت",  daysMissing:3, urgency:"high",   reminderStatus:"not_sent", response:null },
    { id:"R006", branch:"فرع جدة - العزيزية",       reportType:"تقرير المشتريات",        moduleKey:"purchases",         requiredBy:"12 أكت",  daysMissing:3, urgency:"medium", reminderStatus:"responded", response:"لا مشتريات اليوم" },
    { id:"R007", branch:"فرع الرياض - السليمانية",  reportType:"الجرد الشهري",           moduleKey:"inventory_monthly", requiredBy:"11 أكت",  daysMissing:4, urgency:"high",   reminderStatus:"not_sent", response:null },
    { id:"R008", branch:"فرع جدة - العزيزية",       reportType:"المصروفات اليومية",      moduleKey:"expenses",          requiredBy:"11 أكت",  daysMissing:4, urgency:"medium", reminderStatus:"sent",     response:null },
  ]);
  const [expandedId, setExpandedId] = useState<string|null>(null);
  const [responseOptions] = useState<ResponseType[]>(["سيرسل لاحقاً","لا مشتريات اليوم","تم الجرد — قيد الرفع","توضيح: لا يوجد هدر اليوم"]);

  const sendReminder = (id:string) => setReminders(p=>p.map(r=>r.id===id?{...r,reminderStatus:"sent" as ReminderStatus}:r));
  const sendAll = () => setReminders(p=>p.map(r=>r.reminderStatus==="not_sent"?{...r,reminderStatus:"sent" as ReminderStatus}:r));

  const displayed = reminders.filter(r=>{
    if(filterModule!=="الكل" && r.moduleKey!==filterModule) return false;
    if(filterBranch!=="الكل" && r.branch!==filterBranch)  return false;
    return true;
  });
  const notSent   = displayed.filter(r=>r.reminderStatus==="not_sent");
  const sent      = displayed.filter(r=>r.reminderStatus==="sent");
  const responded = displayed.filter(r=>r.reminderStatus==="responded");

  const REM_BRANCHES = [...new Set(reminders.map(r=>r.branch))];

  const urgencyBadge = (u:string) =>
    u==="high"  ? "bg-red-50 text-red-700 border border-red-200" :
    u==="medium"? "bg-amber-50 text-amber-700 border border-amber-200" :
                  "bg-gray-50 text-gray-600 border border-gray-200";
  const urgencyLbl = (u:string) => u==="high"?"عاجل":u==="medium"?"متوسط":"منخفض";

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">التذكيرات — بيانات الفروع المفقودة</h2>
          <p className="text-gray-400 text-sm mt-0.5">أرسل تذكيراً مخصصاً لفرع بعينه أو لجميع الفروع — يصل على تطبيق الموبايل</p>
        </div>
        <div className="flex gap-2">
          {notSent.length>0 && (
            <Btn variant="primary" size="sm" onClick={sendAll}>
              <Send size={12}/> إرسال الكل ({notSent.length})
            </Btn>
          )}
          <button onClick={()=>setBroadcastModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold hover:bg-purple-100 transition-all">
            <Bell size={12}/> إرسال مخصص
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="لم تُرسَل بعد" value={String(notSent.length)} sub="تنتظر إجراءً منك" icon={<Bell size={18} className="text-red-600"/>} accent="red"/>
        <KpiCard label="تم الإرسال" value={String(sent.length)} sub="ينتظر رد الفرع" icon={<Send size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label="تم الرد" value={String(responded.length)} sub="استجاب مدير الفرع" icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label="إجمالي المفقود" value={String(reminders.length)} sub="تقارير وبيانات" icon={<AlertTriangle size={18} className="text-purple-600"/>} accent="purple"/>
      </div>

      {/* Filters: Module + Branch search + Brand + Excel */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">الموديول</label>
            <select value={filterModule} onChange={e=>setFilterModule(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option value="الكل">الكل</option>
              {Object.entries(MODULE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">بحث بالفرع أو المطعم</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Search size={13} className="text-gray-400 flex-shrink-0"/>
              <input value={filterBranch==="الكل"?"":filterBranch}
                onChange={e=>setFilterBranch(e.target.value||"الكل")}
                placeholder="اكتب اسم الفرع أو المطعم..." className="flex-1 text-sm outline-none"/>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">العلامة التجارية</label>
            <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {["الكل","برغر خليفة","بيتزا باكو","وسطاوي"].map(b=><option key={b}>{b}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={()=>alert("جارٍ تصدير التذكيرات المفقودة إلى Excel...")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-semibold hover:bg-emerald-100 transition-all w-full justify-center">
              <FileText size={13}/> تصدير Excel
            </button>
          </div>
        </div>
        {(filterModule!=="الكل"||filterBranch!=="الكل") && (
          <button onClick={()=>{setFilterModule("الكل");setFilterBranch("الكل");}} className="text-xs text-purple-600 hover:underline flex items-center gap-1"><RotateCcw size={11}/> مسح الفلاتر</button>
        )}
      </div>

      {/* Broadcast custom reminder modal */}
      {broadcastModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={()=>setBroadcastModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">إرسال تذكير مخصص</h3>
              <button onClick={()=>setBroadcastModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-4" dir="rtl">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">إرسال إلى</label>
                <div className="flex gap-2">
                  <button onClick={()=>setBroadcastTarget("all")}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${broadcastTarget==="all"?"bg-purple-100 text-purple-700 border-purple-300":"bg-gray-50 text-gray-600 border-gray-200"}`}>
                    جميع الفروع
                  </button>
                  <button onClick={()=>setBroadcastTarget("specific")}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${broadcastTarget!=="all"&&broadcastTarget!=="all"?"bg-blue-100 text-blue-700 border-blue-300":"bg-gray-50 text-gray-600 border-gray-200"}`}>
                    فرع محدد
                  </button>
                </div>
                {broadcastTarget==="specific" && (
                  <select onChange={e=>setBroadcastTarget(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mt-2">
                    <option value="">اختر الفرع...</option>
                    {REM_BRANCHES.map(b=><option key={b} value={b}>{b}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">الموديول المطلوب</label>
                <select value={broadcastModule} onChange={e=>setBroadcastModule(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                  <option value="">اختر الموديول...</option>
                  {Object.entries(MODULE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">نص الرسالة</label>
                <textarea value={broadcastMsg} onChange={e=>setBroadcastMsg(e.target.value)} rows={3}
                  placeholder="يرجى رفع بيانات اليوم في أقرب وقت..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none outline-none focus:border-purple-300"/>
              </div>
            </div>
            <div className="px-5 pb-4 flex gap-2">
              <Btn size="sm" variant="primary" onClick={()=>setBroadcastModal(false)}>
                <Send size={11}/> إرسال {broadcastTarget==="all"?"لكل الفروع":"للفرع المحدد"}
              </Btn>
              <Btn size="sm" onClick={()=>setBroadcastModal(false)}>إلغاء</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Reminders table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">البيانات المفقودة من الفروع</h3>
          <span className="text-xs text-gray-400">{displayed.length} بيان مفقود</span>
        </div>
        {displayed.map(r=>{
          const isExpanded = expandedId===r.id;
          return (
            <div key={r.id} className="border-b border-gray-100 last:border-0">
              <div className={`px-5 py-4 flex items-center gap-4 hover:bg-gray-50/70 ${isExpanded?"bg-blue-50/20":""}`}>
                <div className={`w-2 h-10 rounded-full flex-shrink-0 ${r.urgency==="high"?"bg-red-400":r.urgency==="medium"?"bg-amber-400":"bg-gray-300"}`}/>
                <div className="flex-1 cursor-pointer" onClick={()=>setExpandedId(isExpanded?null:r.id)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 text-sm">{r.branch}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-gray-600">{r.reportType}</span>
                    <Badge className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px]">{MODULE_LABELS[r.moduleKey]||r.moduleKey}</Badge>
                    <Badge className={`${urgencyBadge(r.urgency)} text-[10px]`}>{urgencyLbl(r.urgency)}</Badge>
                    {r.daysMissing>1 && <Badge className="bg-red-50 text-red-700 text-[10px]">⏰ {r.daysMissing} أيام متأخر</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-xs text-gray-400">كان مطلوباً: {r.requiredBy}</p>
                    {r.reminderStatus==="sent" && <Badge className="bg-amber-50 text-amber-700 text-[10px]">📤 تم الإرسال</Badge>}
                    {r.reminderStatus==="responded" && r.response && <Badge className="bg-emerald-50 text-emerald-700 text-[10px]">✅ رد: {r.response}</Badge>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {r.reminderStatus==="not_sent" && (
                    <Btn size="sm" variant="primary" onClick={()=>sendReminder(r.id)}>
                      <Send size={11}/> إرسال تذكير
                    </Btn>
                  )}
                  {r.reminderStatus==="sent" && (
                    <Btn size="sm" onClick={()=>sendReminder(r.id)}>
                      <RefreshCw size={11}/> إعادة الإرسال
                    </Btn>
                  )}
                  {r.reminderStatus==="responded" && (
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-3 py-1.5">
                      <CheckCircle2 size={10} className="ml-1"/> استجاب
                    </Badge>
                  )}
                </div>
              </div>
              {/* Expanded: response options preview (simulates mobile response) */}
              {isExpanded && r.reminderStatus==="sent" && (
                <div className="px-5 pb-4 bg-gray-50/40">
                  <p className="text-xs font-bold text-gray-600 mt-2 mb-2 flex items-center gap-1.5">
                    <Smartphone size={12} className="text-gray-500"/> ردود سريعة متاحة لمدير الفرع على الموبايل:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {responseOptions.map(opt=>(
                      <button key={opt} onClick={()=>{
                        setReminders(p=>p.map(rm=>rm.id===r.id?{...rm,reminderStatus:"responded" as ReminderStatus,response:opt}:rm));
                        setExpandedId(null);
                      }} className="text-xs px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all">
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Auto-reminder rules creation */}
      <AutoReminderRules moduleLabels={MODULE_LABELS}/>
    </div>
  );
}

function AutoReminderRules({ moduleLabels }:{ moduleLabels:Record<string,string> }) {
  type Rule = { id:string; module:string; triggerHour:string; repeatHours:string; active:boolean };
  const [rules, setRules] = useState<Rule[]>([
    { id:"AR1", module:"sales",           triggerHour:"22:00", repeatHours:"2", active:true  },
    { id:"AR2", module:"inventory_daily", triggerHour:"20:00", repeatHours:"3", active:true  },
    { id:"AR3", module:"waste",           triggerHour:"21:00", repeatHours:"4", active:false },
    { id:"AR4", module:"expenses",        triggerHour:"23:00", repeatHours:"2", active:true  },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [newRule, setNewRule] = useState({ module:"sales", triggerHour:"20:00", repeatHours:"3" });

  const toggleRule = (id:string) => setRules(p=>p.map(r=>r.id===id?{...r,active:!r.active}:r));
  const addRule = () => {
    setRules(p=>[...p,{ id:`AR${p.length+1}`, ...newRule, active:true }]);
    setShowAdd(false);
    setNewRule({ module:"sales", triggerHour:"20:00", repeatHours:"3" });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-800 text-sm">⚙️ قواعد التذكير التلقائي</h3>
          <p className="text-xs text-gray-400 mt-0.5">يُرسَل تذكير تلقائياً إذا لم يُرفع التقرير بحلول الوقت المحدد</p>
        </div>
        <Btn size="sm" variant="primary" onClick={()=>setShowAdd(s=>!s)}><Plus size={12}/> إضافة قاعدة</Btn>
      </div>
      {showAdd && (
        <div className="px-5 py-4 bg-purple-50/40 border-b border-purple-100">
          <p className="text-xs font-bold text-purple-700 mb-3">➕ قاعدة جديدة</p>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-[10px] font-semibold text-gray-500 block mb-1">الموديول</label>
              <select value={newRule.module} onChange={e=>setNewRule(p=>({...p,module:e.target.value}))} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5">
                {Object.entries(moduleLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 block mb-1">وقت التشغيل</label>
              <input type="time" value={newRule.triggerHour} onChange={e=>setNewRule(p=>({...p,triggerHour:e.target.value}))} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5" dir="ltr"/>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 block mb-1">تكرار كل (ساعات)</label>
              <input type="number" min="1" max="12" value={newRule.repeatHours} onChange={e=>setNewRule(p=>({...p,repeatHours:e.target.value}))} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5"/>
            </div>
          </div>
          <div className="flex gap-2">
            <Btn size="sm" variant="success" onClick={addRule}><CheckCircle2 size={11}/> حفظ</Btn>
            <Btn size="sm" onClick={()=>setShowAdd(false)}>إلغاء</Btn>
          </div>
        </div>
      )}
      <div>
        {rules.map((r,i)=>(
          <div key={r.id} className={`px-5 py-3.5 flex items-center gap-4 border-b border-gray-50 last:border-0 ${!r.active?"opacity-50":""}`}>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
              <Bell size={14} className="text-purple-600"/>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-gray-800">{moduleLabels[r.module]||r.module}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">يُرسَل في {r.triggerHour} · يتكرر كل {r.repeatHours} ساعات إذا لا يوجد رد</p>
            </div>
            <button onClick={()=>toggleRule(r.id)}
              className={`w-11 h-6 rounded-full transition-all flex-shrink-0 relative ${r.active?"bg-purple-500":"bg-gray-300"}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${r.active?"right-0.5":"left-0.5"}`}/>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsPage({}: PageProps) {
  const reports = ["تقرير المبيعات الشهري","تقرير المصروفات","تقرير المشتريات","كشف الحسابات","تقرير المخزون","تقرير الأداء العام"];
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-800">التقارير</h2>
      <div className="grid grid-cols-3 gap-4">
        {reports.map((r,i)=>(
          <button key={i} className="bg-white rounded-xl border border-gray-100 p-5 text-right hover:border-purple-200 hover:bg-purple-50/30 transition-all shadow-sm">
            <div className="text-3xl mb-3">📊</div>
            <p className="font-semibold text-gray-800 text-sm">{r}</p>
            <p className="text-xs text-gray-400 mt-1">أكتوبر 2025</p>
            <div className="flex items-center gap-2 mt-3">
              <Btn size="sm"><Eye size={11}/> عرض</Btn>
              <Btn size="sm"><Download size={11}/> تحميل</Btn>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// HEAD ACCOUNTANT PAGES
// ════════════════════════════════════════════════════════════
function HeadDashboard({ navigate, setModal, setDetailId, ops, finalApproveOp, rejectOp, bulkApprove, markErpPosted }:PageProps) {
  const [tab, setTab] = useState<"approval"|"performance"|"erp">("approval");
  const awaitingHead = ops.filter(o=>o.status==="approved");
  const finalApproved = ops.filter(o=>o.status==="final-approved");
  const rejected = ops.filter(o=>o.status==="rejected");

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800">لوحة رئيس الحسابات 👑</h2>
        <p className="text-gray-400 text-sm mt-0.5">الإشراف على 4 محاسبين · 100 فرع · الاعتماد النهائي وترحيل ERP</p>
      </div>
      <div className="grid grid-cols-5 gap-4">
        <KpiCard label="بانتظار اعتمادي" value={String(awaitingHead.length)} sub="📱 من المحاسبين · م3" icon={<Clock size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label="معتمدة نهائياً" value={String(finalApproved.filter(o=>!o.erpPosted).length)} sub="مُغلقة · تنتظر ERP · م4" icon={<Lock size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label="مُرحَّلة لـ ERP" value={String(finalApproved.filter(o=>o.erpPosted).length)} sub="مُعالَجة · م5" icon={<ChevronsRight size={18} className="text-indigo-600"/>} accent="blue"/>
        <KpiCard label="مرفوضة" value={String(rejected.length)} sub="خارج المسار" icon={<XCircle size={18} className="text-red-600"/>} accent="red"/>
        <KpiCard label="معدل الأداء" value="87%" sub="هذا الشهر" icon={<TrendingUp size={18} className="text-purple-600"/>} accent="purple"/>
      </div>
      {/* Weekly performance chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 text-sm">📈 الأداء الأسبوعي — عمليات مكتملة</h3>
          <span className="text-xs text-gray-400">الأسبوع الماضي مقارنةً بهذا الأسبوع</span>
        </div>
        <div className="flex items-end gap-3 h-28">
          {[
            {day:"الأحد",    thisW:24, lastW:18},
            {day:"الاثنين",  thisW:32, lastW:22},
            {day:"الثلاثاء", thisW:19, lastW:28},
            {day:"الأربعاء", thisW:41, lastW:31},
            {day:"الخميس",  thisW:35, lastW:25},
            {day:"الجمعة",  thisW:12, lastW:9},
            {day:"السبت",   thisW:28, lastW:20},
          ].map((d,i)=>{
            const max = 41;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end gap-0.5 h-20">
                  <div className="flex-1 bg-gray-200 rounded-t" style={{height:`${(d.lastW/max)*100}%`}} title={`الأسبوع الماضي: ${d.lastW}`}/>
                  <div className="flex-1 bg-gradient-to-t from-purple-600 to-purple-400 rounded-t" style={{height:`${(d.thisW/max)*100}%`}} title={`هذا الأسبوع: ${d.thisW}`}/>
                </div>
                <p className="text-[9px] text-gray-400 text-center leading-tight">{d.day}</p>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-500 flex-shrink-0"/><span className="text-[11px] text-gray-600">هذا الأسبوع</span></div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-200 flex-shrink-0"/><span className="text-[11px] text-gray-600">الأسبوع الماضي</span></div>
          <div className="mr-auto text-[11px] text-emerald-600 font-semibold">↑ +18% مقارنة بالأسبوع الماضي</div>
        </div>
      </div>

      <PipelineOverview ops={ops} navigate={navigate}/>
      <ExceptionPanel ops={ops} forRole="head" navigate={navigate}/>
      <ModuleAggregationGrid ops={ops} navigate={navigate}/>
      <div className="flex gap-2 border-b border-gray-200">
        {[{id:"approval" as const,label:"✅ الاعتماد النهائي"},{id:"performance" as const,label:"👥 أداء المحاسبين"},{id:"erp" as const,label:"🔗 الترحيل لـ ERP"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${tab===t.id?"border-purple-600 text-purple-700":"border-transparent text-gray-500 hover:text-gray-700"}`}>{t.label}</button>
        ))}
      </div>
      {tab==="approval" && <HeadApprovalTab ops={ops} finalApproveOp={finalApproveOp} rejectOp={rejectOp} setModal={setModal} setDetailId={setDetailId} bulkApprove={bulkApprove}/>}
      {tab==="performance" && <HeadAccountants navigate={navigate} setModal={setModal} setDetailId={setDetailId} detailId={null} ops={ops} approveOp={()=>{}} rejectOp={()=>{}} finalApproveOp={()=>{}} bulkApprove={()=>{}}/>}
      {tab==="erp" && <HeadERP navigate={navigate} setModal={setModal} setDetailId={setDetailId} detailId={null} ops={ops} approveOp={()=>{}} rejectOp={()=>{}} finalApproveOp={()=>{}} bulkApprove={()=>{}} markErpPosted={markErpPosted}/>}
    </div>
  );
}

function HeadApprovalTab({ ops, finalApproveOp, rejectOp, setModal, setDetailId, bulkApprove }:{
  ops:Op[]; finalApproveOp:(id:string)=>void; rejectOp:(id:string,r:string)=>void;
  setModal:(id:string|null)=>void; setDetailId:(id:string|null)=>void;
  bulkApprove:(ids:string[])=>void;
}) {
  const awaitingHead = ops.filter(o=>o.status==="approved");
  const [expanded, setExpanded] = useState<string|null>("g0");

  // group by accountant (simulated: group 1 = first 3, group 2 = rest)
  const groups = [
    { key:"g0", accountant:"أحمد محمد الشهري", module:"المبيعات والمصروفات", ops:awaitingHead.slice(0,Math.ceil(awaitingHead.length/2)) },
    { key:"g1", accountant:"سارة العمري", module:"المشتريات والمخزون",    ops:awaitingHead.slice(Math.ceil(awaitingHead.length/2)) },
  ].filter(g=>g.ops.length>0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">العمليات مجمعة حسب المحاسب · اعتماد دفعة واحدة أو فردي</p>
        {awaitingHead.length>0 && <Btn variant="success" onClick={()=>bulkApprove(awaitingHead.map(o=>o.id))}>✅ اعتماد الكل ({awaitingHead.length})</Btn>}
      </div>
      {awaitingHead.length===0 && <EmptyState icon="✅" title="تم اعتماد جميع العمليات" desc="لا توجد عمليات بانتظار اعتمادك النهائي"/>}
      {groups.map(g=>(
        <div key={g.key} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100" onClick={()=>setExpanded(expanded===g.key?null:g.key)}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{g.accountant[0]}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-800 text-sm">{g.accountant}</span>
                <Badge className="bg-blue-50 text-blue-700">{g.module}</Badge>
                {g.ops.some(o=>o.match==="diff") && <Badge className="bg-red-50 text-red-700">⚠ يوجد فروق</Badge>}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{g.ops.length} عمليات موافق عليها</p>
            </div>
            <span className="font-mono font-bold text-purple-700">{fmtAmt(g.ops.reduce((s,o)=>s+o.amount,0))} ر.س</span>
            <div className="flex items-center gap-2">
              <Btn size="sm" variant="success" onClick={e=>{ e.stopPropagation(); bulkApprove(g.ops.map(o=>o.id)); }}><CheckCircle2 size={13}/> اعتماد الكل</Btn>
              {expanded===g.key?<ChevronUp size={16} className="text-gray-400"/>:<ChevronDown size={16} className="text-gray-400"/>}
            </div>
          </div>
          {expanded===g.key && (
            <div>
              {g.ops.map(op=>(
                <div key={op.id} className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <span className="font-mono text-xs text-purple-600 font-semibold w-24 flex-shrink-0">{op.id}</span>
                  <span className="text-sm text-gray-700 flex-1">{op.branch}</span>
                  <Badge className={`${MATCH_CFG[op.match].cls} border`}>{MATCH_CFG[op.match].label}</Badge>
                  <Badge className={STATUS_CFG[op.status].cls}>{STATUS_CFG[op.status].label}</Badge>
                  <span className="font-mono font-semibold text-gray-800">{fmtAmt(op.amount)} ر.س</span>
                  <div className="flex gap-1">
                    <button onClick={()=>finalApproveOp(op.id)} className="p-1.5 rounded hover:bg-emerald-50"><CheckCircle2 size={13} className="text-emerald-600"/></button>
                    <button onClick={()=>{ setDetailId(op.id); setModal("reject"); }} className="p-1.5 rounded hover:bg-red-50"><XCircle size={13} className="text-red-500"/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function HeadPending({ navigate, setModal, setDetailId, ops, finalApproveOp, rejectOp, bulkApprove }:PageProps) {
  const [filters, setFilters] = useState<Filters>({branch:"",status:"approved",match:"",search:""});
  const [accFilter, setAccFilter] = useState("الكل");
  const [brandFilter, setBrandFilter] = useState("الكل");
  const [groupBy, setGroupBy] = useState<"flat"|"module"|"accountant">("module");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const HEAD_ACCS = ["أحمد الشهري","سارة العمري","محمد الحربي","فاطمة السالم"];
  const getAcc = (id:string) => HEAD_ACCS[parseInt(id.replace(/\D/g,"").slice(-2)||"0") % HEAD_ACCS.length];
  let filtered = applyFilters(ops, filters).filter(o=>o.status==="approved");
  if(accFilter!=="الكل") filtered = filtered.filter(o=>getAcc(o.id)===accFilter);
  const totalAmt = filtered.reduce((s,o)=>s+o.amount,0);
  const hasFilters = accFilter!=="الكل"||brandFilter!=="الكل"||!!filters.branch||!!filters.match||!!filters.search;

  const toggleGroup = (key:string) => setCollapsedGroups(prev=>{
    const next = new Set(prev);
    if(next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const buildGroups = () => {
    if(groupBy==="flat") return [{ key:"all", label:"جميع العمليات", ops:filtered }];
    const map = new Map<string,Op[]>();
    filtered.forEach(op=>{
      const key = groupBy==="module" ? op.moduleLabel : getAcc(op.id);
      if(!map.has(key)) map.set(key,[]);
      map.get(key)!.push(op);
    });
    return Array.from(map.entries()).map(([key,ops])=>({ key, label:key, ops })).sort((a,b)=>b.ops.length-a.ops.length);
  };

  const groups = buildGroups();

  const OpRow = ({ op }:{ op:Op }) => {
    const accountant = getAcc(op.id);
    return (
      <div key={op.id} className={`px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/60 ${op.match==="diff"?"border-r-4 border-r-red-400":""}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{accountant[0]}</div>
        {groupBy!=="module" && <Badge className="bg-purple-50 text-purple-700 border border-purple-100 text-xs flex-shrink-0">{op.moduleLabel}</Badge>}
        {groupBy!=="accountant" && <Badge className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] flex-shrink-0">{accountant}</Badge>}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-800">{op.branch}</span>
            <span className="text-xs font-mono text-gray-400">{op.id}</span>
            <Badge className={`${MATCH_CFG[op.match].cls} border text-[10px]`}>{MATCH_CFG[op.match].label}</Badge>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">⏰ {op.timeAgo}</p>
        </div>
        <span className="font-mono font-bold text-gray-800 tabular-nums">{fmtAmt(op.amount)} ر.س</span>
        <div className="flex gap-1.5">
          <Btn size="sm" variant="success" onClick={()=>finalApproveOp(op.id)}><CheckCircle2 size={12}/> اعتماد</Btn>
          <Btn size="sm" variant="danger" onClick={()=>{ setDetailId(op.id); setModal("reject"); }}><XCircle size={12}/> رفض</Btn>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">بانتظار الاعتماد النهائي</h2>
          <p className="text-gray-400 text-sm mt-0.5">{filtered.length} عملية وافق عليها المحاسبون · {fmtAmt(totalAmt)} ر.س إجمالياً</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>alert("جارٍ تصدير العمليات المعلقة إلى Excel...")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-all">
            <FileText size={11}/> Excel
          </button>
          {filtered.length>0 && <Btn variant="success" onClick={()=>bulkApprove(filtered.map(o=>o.id))}>✅ اعتماد الكل ({filtered.length})</Btn>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="بانتظار الاعتماد" value={String(filtered.length)} sub="جميع الموديولات" icon={<Clock size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label="الإجمالي" value={`${(totalAmt/1000).toFixed(0)}K`} sub="ر.س" icon={<TrendingUp size={18} className="text-purple-600"/>} accent="purple"/>
        <KpiCard label="يوجد فروقات" value={String(filtered.filter(o=>o.match==="diff").length)} sub="تحتاج مراجعة إضافية" icon={<AlertTriangle size={18} className="text-red-600"/>} accent="red"/>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">المحاسب المراجع</label>
            <select value={accFilter} onChange={e=>setAccFilter(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option>الكل</option>
              {HEAD_ACCS.map(a=><option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">العلامة التجارية</label>
            <select value={brandFilter} onChange={e=>setBrandFilter(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {["الكل","برغر خليفة","بيتزا باكو","وسطاوي"].map(b=><option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">الفرع</label>
            <select value={filters.branch} onChange={e=>setFilters({...filters,branch:e.target.value})} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option value="">الكل</option>
              {BRANCHES.map(b=><option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">المطابقة</label>
            <select value={filters.match} onChange={e=>setFilters({...filters,match:e.target.value})} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option value="">كل المطابقات</option>
              <option value="exact">متطابق تاماً</option>
              <option value="review">يحتاج مراجعة</option>
              <option value="diff">يوجد فرق</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2">
            <Search size={13} className="text-gray-400 flex-shrink-0"/>
            <input value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})} placeholder="بحث بالفرع أو المطعم أو رقم العملية..." className="flex-1 text-sm outline-none"/>
          </div>
          {hasFilters && (
            <button onClick={()=>{ setAccFilter("الكل"); setBrandFilter("الكل"); setFilters({branch:"",status:"approved",match:"",search:""}); }}
              className="text-xs text-purple-600 hover:underline flex items-center gap-1"><RotateCcw size={11}/> مسح الفلاتر</button>
          )}
        </div>
      </div>

      {/* Group by toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-500">تجميع حسب:</span>
        {([["flat","بدون تجميع"],["module","الموديول"],["accountant","المحاسب"]] as [typeof groupBy, string][]).map(([val,lbl])=>(
          <button key={val} onClick={()=>setGroupBy(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${groupBy===val?"bg-purple-100 text-purple-700 border-purple-300":"bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>
            {lbl}
          </button>
        ))}
        {groupBy!=="flat" && (
          <button onClick={()=>setCollapsedGroups(new Set(groups.map(g=>g.key)))} className="text-xs text-gray-400 hover:text-gray-600 mr-2">طي الكل</button>
        )}
        {collapsedGroups.size>0 && (
          <button onClick={()=>setCollapsedGroups(new Set())} className="text-xs text-purple-600 hover:underline">فتح الكل</button>
        )}
      </div>

      {filtered.length===0
        ? <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10"><EmptyState icon="✅" title="لا توجد عمليات" desc="تم اعتماد الكل أو لا تطابق الفلاتر"/></div>
        : groupBy==="flat"
          ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm">العمليات المعلقة</h3>
                <span className="text-xs text-gray-400">{filtered.length} عملية · {fmtAmt(totalAmt)} ر.س</span>
              </div>
              {filtered.map(op=><OpRow key={op.id} op={op}/>)}
            </div>
          )
          : (
            <div className="space-y-3">
              {groups.map(grp=>{
                const grpAmt = grp.ops.reduce((s,o)=>s+o.amount,0);
                const isCollapsed = collapsedGroups.has(grp.key);
                const diffCount = grp.ops.filter(o=>o.match==="diff").length;
                return (
                  <div key={grp.key} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <button onClick={()=>toggleGroup(grp.key)} className="w-full px-5 py-3.5 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between hover:bg-gray-100/60 transition-colors">
                      <div className="flex items-center gap-3">
                        <ChevronRight size={14} className={`text-gray-400 transition-transform ${isCollapsed?"rotate-0":"-rotate-90"}`}/>
                        <span className="font-bold text-gray-900 text-sm">{grp.label}</span>
                        <Badge className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px]">{grp.ops.length} عملية</Badge>
                        {diffCount>0 && <Badge className="bg-red-50 text-red-700 border border-red-100 text-[10px]">⚠️ {diffCount} فروقات</Badge>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-gray-700">{fmtAmt(grpAmt)} ر.س</span>
                        <Btn size="sm" variant="success" onClick={e=>{ e.stopPropagation(); bulkApprove(grp.ops.map(o=>o.id)); }}>
                          <CheckCircle2 size={11}/> اعتماد المجموعة
                        </Btn>
                      </div>
                    </button>
                    {!isCollapsed && grp.ops.map(op=><OpRow key={op.id} op={op}/>)}
                  </div>
                );
              })}
              {/* Running totals footer */}
              <div className="bg-gradient-to-l from-purple-50 to-blue-50 rounded-xl border border-purple-100 p-4 flex items-center justify-between">
                <span className="font-bold text-purple-800 text-sm">إجمالي العمليات المعلقة</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">{filtered.length} عملية في {groups.length} {groupBy==="module"?"موديول":"محاسب"}</span>
                  <span className="font-mono font-bold text-purple-700 text-base">{fmtAmt(totalAmt)} ر.س</span>
                </div>
              </div>
            </div>
          )
      }
    </div>
  );
}

function HeadApproved({ ops }:PageProps) {
  const approved = ops.filter(o=>o.status==="final-approved");
  const erpPostedCount = approved.filter(o=>o.erpPosted).length;
  const pendingErp = approved.filter(o=>!o.erpPosted).length;
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">المعتمدة نهائياً</h2>
          <p className="text-gray-400 text-sm mt-0.5">{approved.length} سجل · {erpPostedCount} مُرحَّل لـ ERP · {pendingErp} في الانتظار</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 size={24} className="text-emerald-600 flex-shrink-0"/>
          <div><p className="font-extrabold text-emerald-700 text-2xl font-mono">{approved.length}</p><p className="text-emerald-600 text-xs">معتمد نهائياً</p></div>
        </div>
        <div className={`border rounded-xl p-4 flex items-center gap-3 ${erpPostedCount > 0 ? "bg-indigo-50 border-indigo-200" : "bg-amber-50 border-amber-200"}`}>
          <ChevronsRight size={24} className={erpPostedCount > 0 ? "text-indigo-600 flex-shrink-0" : "text-amber-500 flex-shrink-0"}/>
          <div>
            <p className={`font-extrabold text-2xl font-mono ${erpPostedCount > 0 ? "text-indigo-700" : "text-amber-600"}`}>{erpPostedCount}</p>
            <p className={`text-xs ${erpPostedCount > 0 ? "text-indigo-600" : "text-amber-500"}`}>مُرحَّل لـ ERP {pendingErp > 0 ? `· ${pendingErp} انتظار` : "· اكتمل"}</p>
          </div>
        </div>
      </div>
      <Card title={`${approved.length} عملية معتمدة نهائياً`}>
        {approved.length===0
          ? <EmptyState icon="📋" title="لا توجد عمليات معتمدة" desc="بعد اعتماد العمليات تظهر هنا"/>
          : approved.map(op=>(
            <div key={op.id} className={`px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 ${op.erpPosted ? "bg-indigo-50/30" : ""}`}>
              <Badge className="bg-purple-50 text-purple-700 border border-purple-100 text-xs font-bold">{op.moduleLabel}</Badge>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-800">{op.branch}</span>
                  <span className="text-xs font-mono text-gray-400">{op.id}</span>
                  {op.isCorrection && <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-xs">تعديل على {op.correctiveRef}</Badge>}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs"><Lock size={9}/> معتمد نهائياً</Badge>
                  {op.erpPosted
                    ? <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs"><ChevronsRight size={9}/> مُرحَّل لـ ERP · {op.erpBatchId || "—"}</Badge>
                    : <Badge className="bg-amber-50 text-amber-600 border border-amber-200 text-xs">⏳ في انتظار الترحيل لـ ERP</Badge>
                  }
                </div>
              </div>
              <span className="font-mono font-extrabold text-gray-800 tabular-nums">{fmtAmt(op.amount)} ر.س</span>
            </div>
          ))
        }
      </Card>
    </div>
  );
}

function HeadRejected({ ops }:PageProps) {
  const rejected = ops.filter(o=>o.status==="rejected");
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-800">المرفوضة</h2>
      <Card title={`${rejected.length} عملية مرفوضة`}>
        {rejected.length===0
          ? <EmptyState icon="📋" title="لا توجد عمليات مرفوضة" desc=""/>
          : rejected.map(op=>(
            <div key={op.id} className="px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 border-r-4 border-r-red-400">
              <Badge className="bg-purple-50 text-purple-700">{op.moduleLabel}</Badge>
              <div className="flex-1">
                <div className="flex items-center gap-2"><span className="font-semibold text-sm text-gray-800">{op.branch}</span><span className="text-xs font-mono text-gray-400">{op.id}</span></div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-red-50 text-red-700">✕ مرفوض</Badge>
                  {op.rejectReason && <span className="text-xs text-red-500">{op.rejectReason}</span>}
                </div>
              </div>
              <span className="font-mono font-bold text-gray-800">{fmtAmt(op.amount)} ر.س</span>
            </div>
          ))
        }
      </Card>
    </div>
  );
}

function HeadModulePage({ moduleKey, navigate, setModal, setDetailId, ops, finalApproveOp, rejectOp, bulkApprove }:PageProps&{moduleKey:string}) {
  const [filters, setFilters] = useState<Filters>({branch:"",status:"",match:"",search:""});
  const [accFilter, setAccFilter] = useState("الكل");
  const [brandFilter, setBrandFilter] = useState("الكل");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]   = useState("");
  const mk = moduleKey as ModuleKey;
  const labels: Record<string,string> = {sales:"المبيعات",expenses:"المصروفات",purchases:"المشتريات",inventory:"المخزون",shifts:"الشفتات",employees:"كشف الحساب",cash:"العهد النقدية",waste:"الهدر والتالف",assets:"الأصول الثابتة"};
  const moduleEmoji: Record<string,string> = {sales:"💰",expenses:"🧾",purchases:"🛒",inventory:"📦",shifts:"🕐",employees:"👥",cash:"💵",waste:"🗑️",assets:"🏢"};
  const label = labels[moduleKey]||moduleKey;
  const HEAD_ACCS = ["أحمد الشهري","سارة العمري","محمد الحربي","فاطمة السالم"];
  const getAcc = (id:string) => HEAD_ACCS[parseInt(id.replace(/\D/g,"").slice(-2)||"0") % HEAD_ACCS.length];
  let filtered = applyFilters(ops, filters, mk).filter(o=>o.status==="approved");
  if(accFilter!=="الكل") filtered = filtered.filter(o=>getAcc(o.id)===accFilter);
  const totalAmt = filtered.reduce((s,o)=>s+o.amount,0);
  const diffCount = filtered.filter(o=>o.match==="diff").length;
  const exactCount = filtered.filter(o=>o.match==="exact").length;
  const hasFilters = accFilter!=="الكل"||brandFilter!=="الكل"||!!filters.branch||!!filters.match||!!filters.search||!!dateFrom||!!dateTo;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <button onClick={()=>navigate("head-dashboard")} className="hover:text-purple-600 transition-colors">لوحة التحكم</button>
        <ChevronRight size={12}/>
        <span className="text-gray-500">الموديولات</span>
        <ChevronRight size={12}/>
        <span className="text-gray-800 font-semibold">{moduleEmoji[moduleKey]||"📋"} {label}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{label} — الاعتماد النهائي</h2>
          <p className="text-gray-400 text-sm mt-0.5">العمليات الموافق عليها من المحاسبين — تنتظر اعتمادك النهائي</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>alert(`جارٍ تصدير عمليات ${label} إلى Excel...`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-all">
            <FileText size={11}/> Excel
          </button>
          {filtered.length>0 && <Btn variant="success" onClick={()=>bulkApprove(filtered.map(o=>o.id))}>✅ اعتماد الكل ({filtered.length})</Btn>}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="بانتظار الاعتماد" value={String(filtered.length)} sub="عملية موافق عليها" icon={<Clock size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label="الإجمالي" value={`${(totalAmt/1000).toFixed(0)}K`} sub="ر.س" icon={<TrendingUp size={18} className="text-purple-600"/>} accent="purple"/>
        <KpiCard label="يوجد فروقات" value={String(diffCount)} sub="تحتاج مراجعة" icon={<AlertTriangle size={18} className="text-red-600"/>} accent="red"/>
        <KpiCard label="متطابقة" value={String(exactCount)} sub="مطابقة تامة" icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">المحاسب المراجع</label>
            <select value={accFilter} onChange={e=>setAccFilter(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option>الكل</option>
              {HEAD_ACCS.map(a=><option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">العلامة التجارية</label>
            <select value={brandFilter} onChange={e=>setBrandFilter(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {["الكل","برغر خليفة","بيتزا باكو","وسطاوي"].map(b=><option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">الفرع</label>
            <select value={filters.branch} onChange={e=>setFilters({...filters,branch:e.target.value})} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option value="">الكل</option>
              {BRANCHES.map(b=><option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">المطابقة</label>
            <select value={filters.match} onChange={e=>setFilters({...filters,match:e.target.value})} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option value="">كل المطابقات</option>
              <option value="exact">متطابق تاماً</option>
              <option value="review">يحتاج مراجعة</option>
              <option value="diff">يوجد فرق</option>
            </select>
          </div>
        </div>
        {/* Date period filter */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">من تاريخ</label>
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" dir="ltr"/>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">إلى تاريخ</label>
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" dir="ltr"/>
          </div>
          <div className="flex items-end gap-2">
            {(dateFrom||dateTo) && (
              <button onClick={()=>{ setDateFrom(""); setDateTo(""); }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 border border-gray-200 rounded-lg px-3 py-2"><RotateCcw size={10}/> مسح التاريخ</button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2">
            <Search size={13} className="text-gray-400 flex-shrink-0"/>
            <input value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})} placeholder="بحث بالفرع أو المطعم أو رقم العملية..." className="flex-1 text-sm outline-none"/>
          </div>
          {hasFilters && (
            <button onClick={()=>{ setAccFilter("الكل"); setBrandFilter("الكل"); setFilters({branch:"",status:"",match:"",search:""}); setDateFrom(""); setDateTo(""); }}
              className="text-xs text-purple-600 hover:underline flex items-center gap-1"><RotateCcw size={11}/> مسح الكل</button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">عمليات {label}</h3>
          <span className="text-xs text-gray-400">{filtered.length} عملية · {fmtAmt(totalAmt)} ر.س</span>
        </div>
        {filtered.length===0
          ? <EmptyState icon="✅" title="لا توجد عمليات" desc="لا توجد عمليات بانتظار الاعتماد في هذا الموديول"/>
          : filtered.map(op=>{
              const accountant = getAcc(op.id);
              return (
                <div key={op.id} className={`px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/60 ${op.match==="diff"?"border-r-4 border-r-red-400":""}`}>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{accountant[0]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-800">{op.branch}</span>
                      <span className="text-xs font-mono text-gray-400">{op.id}</span>
                      <Badge className={`${MATCH_CFG[op.match].cls} border text-[10px]`}>{MATCH_CFG[op.match].label}</Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">راجعه: <span className="text-purple-600 font-medium">{accountant}</span> · <span>⏰ {op.timeAgo}</span></p>
                  </div>
                  <span className="font-mono font-bold text-gray-800 tabular-nums">{fmtAmt(op.amount)} ر.س</span>
                  <div className="flex gap-1.5">
                    <Btn size="sm" variant="success" onClick={()=>finalApproveOp(op.id)}><CheckCircle2 size={12}/> اعتماد</Btn>
                    <Btn size="sm" variant="danger" onClick={()=>{ setDetailId(op.id); setModal("reject"); }}><XCircle size={12}/> رفض</Btn>
                  </div>
                </div>
              );
            })
        }
        {filtered.length>0 && (
          <div className="px-5 py-3 bg-gradient-to-r from-purple-50/80 to-cyan-50/60 border-t border-purple-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-600">الإجمالي الكلي</span>
              <Badge className="bg-purple-100 text-purple-700">{filtered.length} عملية</Badge>
              {diffCount>0 && <Badge className="bg-red-50 text-red-700">{diffCount} فروقات</Badge>}
              {exactCount>0 && <Badge className="bg-emerald-50 text-emerald-700">{exactCount} مطابقة</Badge>}
            </div>
            <span className="font-mono font-black text-xl text-purple-700">{fmtAmt(totalAmt)} ر.س</span>
          </div>
        )}
      </div>
    </div>
  );
}

function HeadAccountants({}: PageProps) {
  const [expandedAcc, setExpandedAcc] = useState<number|null>(null);
  const accountants = [
    { name:"أحمد محمد الشهري", branches:20, reviewed:250, approved:230, pending:5,  rate:92, rating:4.8, avgTime:4.5,  level:"ممتاز",   levelCls:"bg-emerald-100 text-emerald-700" },
    { name:"سارة العمري",      branches:20, reviewed:210, approved:197, pending:2,  rate:94, rating:4.9, avgTime:3.8,  level:"ممتاز",   levelCls:"bg-emerald-100 text-emerald-700" },
    { name:"محمد الحربي",      branches:20, reviewed:185, approved:128, pending:8,  rate:69, rating:3.8, avgTime:8.2,  level:"مقبول",   levelCls:"bg-amber-100 text-amber-700"   },
    { name:"فاطمة السالم",     branches:20, reviewed:290, approved:284, pending:1,  rate:98, rating:5.0, avgTime:2.9,  level:"ممتاز",   levelCls:"bg-emerald-100 text-emerald-700" },
  ];

  const recentMovements = [
    ["اعتماد مبيعات فرع العليا","قبل 12 دقيقة","مبيعات"],
    ["اعتماد مصروفات فرع الحمراء","قبل 28 دقيقة","مصروفات"],
    ["رفض مشتريات — فرق في الكمية","قبل 45 دقيقة","مشتريات"],
    ["اعتماد مخزون فرع المعابدة","قبل ساعة","مخزون"],
    ["طلب توضيح — فرع الدمام","قبل ساعتين","مبيعات"],
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800">أداء المحاسبين</h3>
        <Btn size="sm"><Download size={12}/> تصدير التقرير</Btn>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
          <p className="text-2xl font-extrabold font-mono text-gray-800">{accountants.reduce((s,a)=>s+a.reviewed,0)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">إجمالي العمليات المراجعة</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
          <p className="text-2xl font-extrabold font-mono text-emerald-700">{accountants.reduce((s,a)=>s+a.approved,0)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">معتمدة</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
          <p className="text-2xl font-extrabold font-mono text-amber-600">{accountants.reduce((s,a)=>s+a.pending,0)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">معلقة</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
          <p className="text-2xl font-extrabold font-mono text-purple-700">{(accountants.reduce((s,a)=>s+a.avgTime,0)/accountants.length).toFixed(1)} د</p>
          <p className="text-[11px] text-gray-400 mt-0.5">متوسط وقت المراجعة</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {accountants.map((acc,i)=>(
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-white font-bold">{acc.name[0]}</div>
                <div className="flex-1">
                  <p className="font-bold text-gray-800 text-sm">{acc.name}</p>
                  <p className="text-xs text-gray-400">{acc.branches} فرع مخصص</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${acc.levelCls}`}>{acc.level}</span>
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(s=><Star key={s} size={10} fill={s<=Math.round(acc.rating)?"#F59E0B":"none"} className={s<=Math.round(acc.rating)?"text-amber-400":"text-gray-200"}/>)}
                    <span className="text-[10px] text-gray-500 mr-0.5">{acc.rating}</span>
                  </div>
                </div>
              </div>

              {/* Core stats */}
              <div className="grid grid-cols-4 gap-1.5 text-center mb-3">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-[9px] text-gray-400">المراجَعة</p>
                  <p className="font-bold text-gray-700 text-sm">{acc.reviewed}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-[9px] text-gray-400">معتمدة</p>
                  <p className="font-bold text-emerald-700 text-sm">{acc.approved}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-[9px] text-gray-400">معلقة</p>
                  <p className={`font-bold text-sm ${acc.pending>5?"text-red-600":"text-amber-600"}`}>{acc.pending}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-[9px] text-gray-400">معدل</p>
                  <p className={`font-bold text-sm ${acc.rate>=90?"text-emerald-600":acc.rate>=70?"text-amber-600":"text-red-600"}`}>{acc.rate}%</p>
                </div>
              </div>

              {/* Avg review time */}
              <div className="flex items-center justify-between text-xs bg-blue-50 rounded-lg px-3 py-2 mb-3">
                <span className="text-blue-600 font-medium">⏱ متوسط وقت المراجعة</span>
                <span className="font-bold text-blue-700 font-mono">{acc.avgTime} دقيقة</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
                <div className={`h-1.5 rounded-full ${acc.rate>=90?"bg-emerald-500":acc.rate>=70?"bg-amber-500":"bg-red-500"}`} style={{width:`${acc.rate}%`}}></div>
              </div>

              {/* Toggle detail */}
              <button onClick={()=>setExpandedAcc(expandedAcc===i?null:i)}
                className="w-full flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg border border-gray-200 text-purple-600 hover:bg-purple-50 font-medium transition-colors">
                <Eye size={12}/>
                {expandedAcc===i?"إخفاء التفاصيل":"عرض التفاصيل"}
                {expandedAcc===i?<ChevronUp size={12}/>:<ChevronDown size={12}/>}
              </button>
            </div>

            {/* Expanded detail — recent movements */}
            {expandedAcc===i && (
              <div className="border-t border-gray-100 bg-gray-50/50 p-3">
                <p className="text-[10px] font-bold text-gray-500 mb-2">آخر النشاطات</p>
                <div className="space-y-1.5">
                  {recentMovements.map((mv,j)=>(
                    <div key={j} className="flex items-center gap-2 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0"></span>
                      <span className="text-gray-700 flex-1">{mv[0]}</span>
                      <span className="text-gray-400 text-[10px]">{mv[1]}</span>
                      <span className="text-[10px] bg-white border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">{mv[2]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function HeadERP({ ops, markErpPosted }:PageProps) {
  const [step, setStep] = useState<0|1|2>(0);
  const [tab, setTab] = useState<"export"|"reports">("export");
  // Only show ops that are final-approved but NOT yet ERP-posted
  const pendingErp = ops.filter(o=>o.status==="final-approved" && !o.erpPosted);
  const postedOps = ops.filter(o=>o.erpPosted);
  const finalApproved = ops.filter(o=>o.status==="final-approved");
  const toPost = pendingErp;
  const totalAmt = toPost.reduce((s,o)=>s+o.amount,0);
  const batchId = `ERP-BATCH-20251014-${String(Date.now()).slice(-3)}`;

  // ERP Reports: group posted ops by module
  const reportsByModule = postedOps.reduce<Record<string,{label:string;count:number;total:number;batchIds:string[]}>>((acc,op)=>{
    if(!acc[op.moduleKey]){ acc[op.moduleKey]={label:op.moduleLabel,count:0,total:0,batchIds:[]}; }
    acc[op.moduleKey].count++;
    acc[op.moduleKey].total+=op.amount;
    if(op.erpBatchId && !acc[op.moduleKey].batchIds.includes(op.erpBatchId)) acc[op.moduleKey].batchIds.push(op.erpBatchId);
    return acc;
  }, {});
  const reportRows = Object.values(reportsByModule);

  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-bold text-gray-800">نظام ERP — التصدير والتقارير</h2>
        <p className="text-gray-400 text-sm mt-0.5">ترحيل العمليات المعتمدة نهائياً · تقارير ERP المُستوردة (قراءة فقط)</p></div>
      <div className="flex gap-2 border-b border-gray-200">
        {[
          {id:"export" as const, label:"🔗 التصدير لـ ERP", count:toPost.length},
          {id:"reports" as const, label:"📊 تقارير ERP المُستوردة", count:postedOps.length},
        ].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px flex items-center gap-2
              ${tab===t.id?"border-purple-600 text-purple-700":"border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t.label}
            {t.count>0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab===t.id?"bg-purple-100 text-purple-700":"bg-gray-100 text-gray-500"}`}>{t.count}</span>}
          </button>
        ))}
      </div>
      {tab==="reports" && (
        <div className="space-y-5" dir="rtl">
          {/* Architectural boundary — ERP Reports are reference data, NOT operational records */}
          <div className="rounded-xl overflow-hidden border border-slate-300 shadow-sm">
            <div className="bg-slate-700 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📊</span>
                <div>
                  <p className="font-bold text-white text-sm">طبقة التقارير المرجعية — خارج سير العمل التشغيلي</p>
                  <p className="text-slate-300 text-xs mt-0.5">هذه البيانات استُوردت من نظام ERP بعد معالجتها · المرحلة 6 من دورة الحياة</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-slate-600 text-slate-200 border border-slate-500 text-xs">🔒 قراءة فقط</Badge>
                <Badge className="bg-red-900/40 text-red-300 border border-red-700/50 text-xs">لا تعديل · لا إجراء</Badge>
              </div>
            </div>
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-2.5 flex items-center gap-6 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span> هذه السجلات لا تمثل عمليات تشغيلية نشطة</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span> ASAB يعمل كطبقة تشغيلية قبل ERP · وطبقة تقارير مرجعية بعده</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span> أي تعديل يتطلب فتح سجل تعديل جديد في سير العمل التشغيلي</span>
            </div>
          </div>
          {postedOps.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
              <div className="text-4xl mb-3">📭</div>
              <p className="font-semibold text-gray-700">لا توجد تقارير مستوردة بعد</p>
              <p className="text-gray-400 text-sm mt-1">بعد ترحيل العمليات لـ ERP ومعالجتها، تظهر التقارير هنا</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                  <p className="text-3xl font-extrabold font-mono text-slate-800">{postedOps.length}</p>
                  <p className="text-xs text-slate-500 mt-1">عملية مُعالَجة في ERP</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                  <p className="text-3xl font-extrabold font-mono text-indigo-700">{(postedOps.reduce((s,o)=>s+o.amount,0)/1000).toFixed(1)}K</p>
                  <p className="text-xs text-slate-500 mt-1">ر.س إجمالي المُرحَّل</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                  <p className="text-3xl font-extrabold font-mono text-slate-800">{new Set(postedOps.map(o=>o.erpBatchId)).size}</p>
                  <p className="text-xs text-slate-500 mt-1">دفعة ترحيل</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm">التقرير المالي الموحد — مُستورد من ERP</h3>
                  <Badge className="bg-slate-100 text-slate-600 border border-slate-200 text-xs">🔒 قراءة فقط</Badge>
                </div>
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr className="text-xs text-slate-500 font-semibold text-right">
                      <th className="px-5 py-3">الموديول</th>
                      <th className="px-5 py-3 text-center">المصدر الأصلي</th>
                      <th className="px-5 py-3 text-center">عدد العمليات</th>
                      <th className="px-5 py-3 text-center">الإجمالي</th>
                      <th className="px-5 py-3 text-center">دفعة ERP</th>
                      <th className="px-5 py-3 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportRows.map((r,i)=>{
                      // determine dominant origin for this module's ops
                      const moduleOps = postedOps.filter(o=>o.moduleLabel===r.label);
                      const originCounts = moduleOps.reduce<Record<string,number>>((a,o)=>{ a[o.origin]=(a[o.origin]||0)+1; return a; },{});
                      const dominantOrigin = (Object.entries(originCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || "mobile") as Op["origin"];
                      const originInfo = ORIGIN_CFG[dominantOrigin];
                      return (
                        <tr key={i} className="hover:bg-slate-50/60">
                          <td className="px-5 py-3.5 font-semibold text-sm text-slate-800">{r.label}</td>
                          <td className="px-5 py-3.5 text-center">
                            <Badge className={`${originInfo.cls} border text-[10px]`}>{originInfo.icon} {originInfo.label}</Badge>
                          </td>
                          <td className="px-5 py-3.5 text-center text-slate-600 font-mono font-bold">{r.count}</td>
                          <td className="px-5 py-3.5 text-center font-mono font-extrabold text-slate-800 tabular-nums">{(r.total/1000).toFixed(1)}K ر.س</td>
                          <td className="px-5 py-3.5 text-center">
                            {r.batchIds.map(b=><span key={b} className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded mr-1">{b}</span>)}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <Badge className="bg-slate-100 text-slate-600 border border-slate-300 text-xs">✓ مرجعي</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                    <tr>
                      <td className="px-5 py-3 font-bold text-slate-700 text-sm">الإجمالي الكلي</td>
                      <td></td>
                      <td className="px-5 py-3 text-center font-bold text-slate-700 font-mono">{postedOps.length}</td>
                      <td className="px-5 py-3 text-center font-extrabold text-slate-900 font-mono tabular-nums">{(postedOps.reduce((s,o)=>s+o.amount,0)/1000).toFixed(1)}K ر.س</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="text-xs text-slate-400 text-center py-2" dir="rtl">
                📱 هذه البيانات رُفعت أصلاً من مديري الفروع عبر التطبيق · مرت بمراجعة المحاسبين والاعتماد النهائي · ومُرحَّلة الآن في ERP
              </div>
            </>
          )}
        </div>
      )}
      {tab==="export" && (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-0 mb-6">
          {[{n:1,label:"1. اختيار الفترة",icon:"📅"},{n:2,label:"2. معاينة البيانات",icon:"👁"},{n:3,label:"3. تأكيد الإرسال",icon:"✅"}].map((s,i)=>(
            <div key={i} className="flex items-center flex-1">
              <button onClick={()=>setStep((s.n-1) as 0|1|2)} className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${step===s.n-1?"bg-purple-600 text-white":step>s.n-1?"bg-emerald-100 text-emerald-700":"bg-gray-100 text-gray-400"}`}>
                <span>{step>=s.n?"✓":s.icon}</span>
                <span className="text-xs font-semibold whitespace-nowrap">{s.label}</span>
              </button>
              {i<2 && <div className={`flex-1 h-0.5 mx-1 ${step>i?"bg-emerald-300":"bg-gray-200"}`}></div>}
            </div>
          ))}
        </div>
        {step===0 && (
          <div className="space-y-4">
            {/* ── Advanced export filters per document ── */}
            <div className="grid grid-cols-2 gap-4">

              {/* Module filter */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-bold text-gray-600 mb-3">📦 الموديول</p>
                <div className="space-y-2">
                  {[{k:"all",l:"الكل"},{k:"sales",l:"المبيعات"},{k:"expenses",l:"المصروفات"},{k:"purchases",l:"المشتريات"},{k:"inventory",l:"المخزون"}].map(m=>(
                    <label key={m.k} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="erp-module" defaultChecked={m.k==="all"} className="accent-purple-600"/>
                      <span className="text-sm text-gray-700">{m.l}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {/* Date period filter */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                  <p className="text-xs font-bold text-gray-600 mb-2">📅 الفترة الزمنية</p>
                  <div className="space-y-1.5">
                    {[{k:"day",l:"يوم محدد"},{k:"range",l:"نطاق: من — إلى"},{k:"week",l:"الأسبوع الحالي"},{k:"month",l:"الشهر الحالي"}].map((p,pi)=>(
                      <label key={p.k} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="erp-period" defaultChecked={pi===0} className="accent-purple-600"/>
                        <span className="text-xs text-gray-700">{p.l}</span>
                      </label>
                    ))}
                    <input type="text" defaultValue="14 أكتوبر 2025" className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 mt-1"/>
                  </div>
                </div>

                {/* Restaurant + Branch + Status */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 space-y-2">
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-1.5">🏢 المطعم</p>
                    <div className="flex gap-3">
                      {["الكل (25 مطعم)","مطعم محدد"].map((o,oi)=>(
                        <label key={o} className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name="erp-rest" defaultChecked={oi===0} className="accent-purple-600"/>
                          <span className="text-xs text-gray-700">{o}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-1.5">🏪 الفرع</p>
                    <div className="flex gap-3">
                      {["الكل (100 فرع)","فرع محدد"].map((o,oi)=>(
                        <label key={o} className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name="erp-branch" defaultChecked={oi===0} className="accent-purple-600"/>
                          <span className="text-xs text-gray-700">{o}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-1.5">🔄 الحالة</p>
                    <div className="flex gap-3">
                      {["معتمدة فقط","الكل"].map((o,oi)=>(
                        <label key={o} className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name="erp-status" defaultChecked={oi===0} className="accent-purple-600"/>
                          <span className="text-xs text-gray-700">{o}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 rounded-xl p-4 grid grid-cols-3 gap-3 text-center border border-blue-100">
              <div><p className="text-2xl font-bold text-blue-700 font-mono">{toPost.length}</p><p className="text-xs text-blue-600">تنتظر الترحيل</p></div>
              <div><p className="text-2xl font-bold text-blue-700 font-mono">{(totalAmt/1000).toFixed(1)}K</p><p className="text-xs text-blue-600">ر.س إجمالي</p></div>
              <div><p className="text-2xl font-bold text-blue-700 font-mono">{new Set(toPost.map(o=>o.branch)).size}</p><p className="text-xs text-blue-600">فرع مشارك</p></div>
            </div>
            {finalApproved.length !== toPost.length && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 text-xs text-indigo-700 font-medium" dir="rtl">
                ✓ {finalApproved.length - toPost.length} عملية سبق ترحيلها في دفعات سابقة
              </div>
            )}
            <Btn variant="primary" onClick={()=>setStep(1)} className="justify-center">معاينة البيانات →</Btn>
          </div>
        )}
        {step===1 && (
          <div className="space-y-4">
            <table className="w-full" dir="rtl">
              <thead className="bg-gray-50"><tr className="text-xs text-gray-500 font-semibold">
                <th className="px-4 py-3 text-right">رقم العملية</th><th className="px-4 py-3 text-right">الموديول</th>
                <th className="px-4 py-3 text-right">الفرع</th><th className="px-4 py-3 text-center">المبلغ</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {toPost.length===0
                  ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">لا توجد عمليات معتمدة نهائياً تنتظر الترحيل</td></tr>
                  : toPost.map(op=>(
                    <tr key={op.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-purple-700 font-bold">{op.id}</td>
                      <td className="px-4 py-3 text-sm">{op.moduleLabel}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{op.branch}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold tabular-nums">{fmtAmt(op.amount)} ر.س</td>
                      <td className="px-4 py-3 text-center"><Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs"><Lock size={9}/> معتمد</Badge></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
            <div className="flex gap-3">
              <Btn onClick={()=>setStep(0)}>← رجوع</Btn>
              <Btn variant="primary"
                onClick={()=>{
                  if(toPost.length > 0 && markErpPosted) {
                    markErpPosted(toPost.map(o=>o.id), batchId);
                  }
                  setStep(2);
                }}
                className="flex-1 justify-center">
                تأكيد وإرسال للـ ERP →
              </Btn>
            </div>
          </div>
        )}
        {step===2 && (
          <div className="text-center py-8 space-y-4">
            <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mx-auto border-2 border-indigo-200">
              <ChevronsRight size={36} className="text-indigo-600"/>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">تم الترحيل بنجاح!</h3>
              <p className="text-gray-500 text-sm">تم إرسال {toPost.length} عملية بإجمالي {fmtAmt(totalAmt)} ر.س إلى نظام ERP</p>
              <p className="text-gray-400 text-xs mt-1 font-mono">رقم دفعة الترحيل: {batchId}</p>
              <div className="mt-3 inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2">
                <Lock size={13} className="text-indigo-600"/>
                <span className="text-sm text-indigo-700 font-semibold">السجلات مُرحَّلة ومُغلقة نهائياً</span>
              </div>
            </div>
            <Btn onClick={()=>setStep(0)} className="mx-auto">ترحيل دفعة جديدة</Btn>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ADMIN PAGES
// ════════════════════════════════════════════════════════════
function AdminOverview({ navigate, setModal }:PageProps) {
  const totalRests   = BRANDS_DATA.reduce((s,b)=>s+b.restaurants.length,0);
  const totalBranches = BRANDS_DATA.reduce((s,b)=>s+b.restaurants.reduce((ss,r)=>ss+r.branches.length,0),0);
  const expiringBrands = BRANDS_DATA.filter(b=>b.subStatus==="warning"||b.subStatus==="danger"||b.subStatus==="expired");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">نظرة عامة على النظام</h2>
          <p className="text-gray-400 text-sm mt-0.5">منصة SaaS متعددة المستأجرين — علامات تجارية · مطاعم · مستخدمون</p>
        </div>
        <Btn variant="primary" onClick={()=>setModal("add-user")}><Plus size={14}/> مستخدم جديد</Btn>
      </div>

      {/* Top tier KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="علامات تجارية" value={String(BRANDS_DATA.length)} sub="4 علامات نشطة" icon={<span className="text-xl font-bold text-purple-600">B</span>} accent="purple"/>
        <KpiCard label="مطاعم وفروع"   value={`${totalRests} / ${totalBranches}`} sub="مطعم / فرع" icon={<Home size={18} className="text-blue-600"/>} accent="blue"/>
        <KpiCard label="مستخدمون نشطون" value="7" sub="5 محاسبين · 1 رئيس" icon={<Users size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label="تحتاج تجديد"    value={String(expiringBrands.length)} sub="علامات تجارية" icon={<AlertTriangle size={18} className="text-amber-500"/>} accent="amber"/>
      </div>

      {/* Brand hierarchy overview */}
      <div className="grid grid-cols-2 gap-5">
        <Card title="هيكل العلامات التجارية" actions={<button onClick={()=>navigate("admin-restaurants")} className="text-xs text-purple-600 hover:underline">إدارة كاملة</button>}>
          <div className="divide-y divide-gray-50">
            {BRANDS_DATA.map(b=>{
              const branchCount = b.restaurants.reduce((s,r)=>s+r.branches.length,0);
              const subBadge = b.subStatus==="active"?"bg-emerald-50 text-emerald-600":b.subStatus==="expired"?"bg-red-50 text-red-600":"bg-amber-50 text-amber-600";
              return (
                <div key={b.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50/50 cursor-pointer" onClick={()=>navigate("admin-restaurants")}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{background:b.color}}>{b.abbr}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800">{b.name}</p>
                    <p className="text-xs text-gray-400">{b.restaurants.length} مطاعم · {branchCount} فروع · باقة {b.plan}</p>
                  </div>
                  <Badge className={`text-[10px] ${subBadge}`}>{b.subStatus==="active"?"نشط":b.subStatus==="expired"?"منتهي":"ينتهي قريباً"}</Badge>
                  <ChevronRight size={13} className="text-gray-300"/>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="إجراءات سريعة">
            <div className="p-4 grid grid-cols-3 gap-2.5">
              {[{icon:"👤",label:"مستخدم جديد",     a:()=>setModal("add-user")},
                {icon:"🏪",label:"مطعم جديد",       a:()=>navigate("admin-restaurants")},
                {icon:"👥",label:"توزيع المحاسبين", a:()=>navigate("admin-users")},
                {icon:"💳",label:"الاشتراكات",       a:()=>navigate("admin-subscriptions")},
                {icon:"🔑",label:"الصلاحيات",        a:()=>navigate("admin-permissions")},
                {icon:"📋",label:"سجل النشاطات",    a:()=>navigate("admin-audit")},
              ].map((a,i)=>(
                <button key={i} onClick={a.a} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all">
                  <span className="text-xl">{a.icon}</span>
                  <span className="text-[10px] font-medium text-gray-600 text-center leading-tight">{a.label}</span>
                </button>
              ))}
            </div>
          </Card>

          {expiringBrands.length>0 && (
            <Card title="⚠ تنبيهات الاشتراكات" actions={<button onClick={()=>navigate("admin-subscriptions")} className="text-xs text-purple-600 hover:underline">إدارة</button>}>
              <div className="px-4 pb-3 space-y-2">
                {expiringBrands.map((b,i)=>(
                  <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl border ${b.subStatus==="expired"?"border-red-200 bg-red-50/50":"border-amber-200 bg-amber-50/50"}`}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{background:b.color}}>{b.abbr}</div>
                    <div className="flex-1">
                      <p className="font-semibold text-xs text-gray-800">{b.name}</p>
                      <p className={`text-[10px] ${b.subStatus==="expired"?"text-red-600":"text-amber-600"}`}>{b.subStatus==="expired"?`منتهي منذ ${Math.abs(b.daysLeft)} يوم`:`ينتهي خلال ${b.daysLeft} يوم`}</p>
                    </div>
                    <button onClick={()=>navigate("admin-subscriptions")} className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${b.subStatus==="expired"?"bg-red-600 text-white":"bg-amber-100 text-amber-700 border border-amber-200"}`}>
                      {b.subStatus==="expired"?"تفعيل":"تجديد"}
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminUsers({ navigate, setModal, ops, approveOp, rejectOp, finalApproveOp, bulkApprove, users, setUsers }:PageProps&{
  users: AdminUserData[];
  setUsers:(v:any)=>void;
}) {
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [brandFilter,setBrandFilter]= useState("");
  const [expandedRow,setExpandedRow]= useState<string|null>(null);
  const [usersTab,   setUsersTab]   = useState<"list"|"distribute">("list");

  // ── Distribution data ──
  const [headSel,  setHeadSel]   = useState<string|null>("h1");
  const [accSel,   setAccSel]    = useState<string|null>("acc1");
  type DistAcc = { id:string; name:string; avatar:string; headId:string|null; restaurants:string[] };
  const [distAccs, setDistAccs]  = useState<DistAcc[]>([
    { id:"acc1", name:"أحمد محمد الشهري", avatar:"أ", headId:"h1", restaurants:["مطعم الريم — العليا","مطعم الريم — جدة","هرفي — الرياض"] },
    { id:"acc2", name:"سارة العمري",      avatar:"س", headId:"h1", restaurants:["هرفي — جدة","ماكدونالدز — الرياض"] },
    { id:"acc3", name:"محمد الحربي",      avatar:"م", headId:"h2", restaurants:["هرفي — مكة","ماكدونالدز — الدمام"] },
    { id:"acc4", name:"فاطمة السالم",     avatar:"ف", headId:"h2", restaurants:["بروستد الوطني — الطائف"] },
    { id:"acc5", name:"خلود العتيبي",     avatar:"خ", headId:null,  restaurants:[] },
  ]);
  const distHeads = [
    { id:"h1", name:"خالد العمري",  avatar:"خ", color:"bg-amber-100 text-amber-700" },
    { id:"h2", name:"نورة السعيد",  avatar:"ن", color:"bg-purple-100 text-purple-700" },
  ];
  const ALL_RESTS = [
    "مطعم الريم — العليا","مطعم الريم — جدة",
    "هرفي — الرياض","هرفي — جدة","هرفي — مكة",
    "ماكدونالدز — الرياض","ماكدونالدز — الدمام",
    "بروستد الوطني — الطائف",
  ];
  const assignedRests = distAccs.flatMap(a=>a.restaurants);
  const freeRests     = ALL_RESTS.filter(r=>!assignedRests.includes(r));
  const accsUnderHead = distAccs.filter(a=>a.headId===headSel);
  const selAccData    = distAccs.find(a=>a.id===accSel);
  const selAccRests   = selAccData?.restaurants||[];
  const availableForAcc = freeRests.filter(r=>!selAccRests.includes(r));

  const removeRestFromAcc = (accId:string, rest:string) => setDistAccs(p=>p.map(a=>a.id===accId?{...a,restaurants:a.restaurants.filter(r=>r!==rest)}:a));
  const addRestToAcc = (accId:string, rest:string) => setDistAccs(p=>p.map(a=>a.id===accId?{...a,restaurants:[...a.restaurants,rest]}:a));
  const moveAccToHead = (accId:string, headId:string) => setDistAccs(p=>p.map(a=>a.id===accId?{...a,headId}:a));

  // ── Module distribution ──
  const DIST_MODULES = ["المبيعات","المصروفات","المشتريات","المخزون","الأصول الثابتة","الشفتات","الموظفين","العهد المالية"];
  const [distModeType, setDistModeType] = useState<"restaurant"|"module"|"heads">("restaurant");
  const [modAccSel, setModAccSel] = useState<string>("acc1");
  const [modAccFilter, setModAccFilter] = useState("");
  const [modRestFilter, setModRestFilter] = useState("");
  // Heads assignment (mode 3) state
  const [h3AccSel, setH3AccSel] = useState<string|null>(null);
  const [h3HeadFilter, setH3HeadFilter] = useState("");
  // accModules: accId → restName → modules[]
  const [accModules, setAccModules] = useState<Record<string,Record<string,string[]>>>({
    acc1: {
      "مطعم الريم — العليا": [...DIST_MODULES],
      "مطعم الريم — جدة":   ["المبيعات","المصروفات","المشتريات"],
      "هرفي — الرياض":       ["المبيعات","المصروفات"],
    },
    acc2: {
      "هرفي — جدة":          ["المبيعات","المصروفات","المخزون"],
      "ماكدونالدز — الرياض": ["المبيعات","المصروفات"],
    },
    acc3: {
      "هرفي — مكة":          ["المبيعات","المصروفات","المشتريات","المخزون"],
      "ماكدونالدز — الدمام": ["المبيعات"],
    },
    acc4: {
      "بروستد الوطني — الطائف": ["المبيعات","المصروفات"],
    },
    acc5: {},
  });
  const toggleModuleForRest = (accId:string, rest:string, mod:string) =>
    setAccModules(p => {
      const cur = p[accId]?.[rest] ?? [];
      const next = cur.includes(mod) ? cur.filter(m=>m!==mod) : [...cur, mod];
      return { ...p, [accId]: { ...(p[accId]??{}), [rest]: next } };
    });
  const assignAllModules = (accId:string, rest:string) =>
    setAccModules(p => ({ ...p, [accId]: { ...(p[accId]??{}), [rest]: [...DIST_MODULES] } }));
  const clearRestModules = (accId:string, rest:string) =>
    setAccModules(p => { const n={...(p[accId]??{})}; delete n[rest]; return {...p,[accId]:n}; });

  const roleCls: Record<string,string> = {
    "محاسب":"bg-blue-50 text-blue-700 border-blue-200",
    "رئيس حسابات":"bg-amber-50 text-amber-700 border-amber-200",
    "مدير فرع":"bg-emerald-50 text-emerald-700 border-emerald-200",
    "مدير مشتريات":"bg-purple-50 text-purple-700 border-purple-200",
    "مورد":"bg-orange-50 text-orange-700 border-orange-200",
    "أدمن":"bg-red-50 text-red-700 border-red-200",
  };
  const scopeLabel: Record<string,string> = { all:"كامل", brand:"علامة تجارية", restaurant:"مطعم", branch:"فرع" };
  const scopeCls:   Record<string,string> = { all:"bg-gray-100 text-gray-600", brand:"bg-purple-50 text-purple-600", restaurant:"bg-blue-50 text-blue-600", branch:"bg-emerald-50 text-emerald-600" };

  const allBrands = Array.from(new Set(users.flatMap(u=>u.brands)));
  const shown = users.filter(u=>{
    if(search && !u.name.includes(search) && !u.email.includes(search)) return false;
    if(roleFilter && u.role!==roleFilter) return false;
    if(brandFilter && !u.brands.includes(brandFilter)) return false;
    return true;
  });
  const deleteUser = (email:string) => setUsers((prev:AdminUserData[])=>prev.filter(u=>u.email!==email));

  const byRole: Record<string,number> = {};
  users.forEach(u=>{ byRole[u.role]=(byRole[u.role]||0)+1; });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">إدارة المستخدمين</h2>
          <p className="text-gray-400 text-sm mt-0.5">{users.length} مستخدم — متعدد العلامات التجارية والمطاعم</p>
        </div>
        <Btn variant="primary" onClick={()=>setModal("add-user")}><Plus size={14}/> مستخدم جديد</Btn>
      </div>

      {/* Main tabs */}
      <div className="flex gap-0 border-b border-gray-200">
        {([{id:"list" as const,label:"👤 قائمة المستخدمين"},{id:"distribute" as const,label:"🏢 توزيع المطاعم"}]).map(t=>(
          <button key={t.id} onClick={()=>setUsersTab(t.id)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${usersTab===t.id?"border-purple-600 text-purple-700":"border-transparent text-gray-500 hover:text-gray-700"}`}>{t.label}</button>
        ))}
      </div>

      {/* ── DISTRIBUTION TAB ── */}
      {usersTab==="distribute" && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center"><p className="text-2xl font-extrabold font-mono text-amber-700">{distHeads.length}</p><p className="text-[11px] text-gray-400">رؤساء الحسابات</p></div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center"><p className="text-2xl font-extrabold font-mono text-blue-700">{distAccs.filter(a=>a.headId).length}</p><p className="text-[11px] text-gray-400">محاسبون مُعيَّنون</p></div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center"><p className="text-2xl font-extrabold font-mono text-emerald-700">{assignedRests.length}</p><p className="text-[11px] text-gray-400">مطاعم مُوزَّعة</p></div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center"><p className="text-2xl font-extrabold font-mono text-red-600">{freeRests.length}</p><p className="text-[11px] text-gray-400">مطاعم غير مُوزَّعة</p></div>
          </div>

          {/* ── Distribution Mode Toggle ── */}
          <div className="flex items-center gap-0 bg-gray-100 p-1 rounded-xl w-fit">
            <button onClick={()=>setDistModeType("restaurant")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all ${distModeType==="restaurant"?"bg-white text-purple-700 shadow-sm":"text-gray-500 hover:text-gray-700"}`}>
              🏢 بالمطعم
            </button>
            <button onClick={()=>setDistModeType("module")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all ${distModeType==="module"?"bg-white text-purple-700 shadow-sm":"text-gray-500 hover:text-gray-700"}`}>
              📦 بالموديول
            </button>
            <button onClick={()=>setDistModeType("heads")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all ${distModeType==="heads"?"bg-white text-purple-700 shadow-sm":"text-gray-500 hover:text-gray-700"}`}>
              👥 توزيع المحاسبين على الرؤساء
            </button>
          </div>

          {/* ─ Mode 1: by Restaurant ─ */}
          {distModeType==="restaurant" && <><div className="grid grid-cols-3 gap-4">
            {/* Column 1: رؤساء الحسابات */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
                <p className="font-bold text-amber-800 text-sm">🏅 رؤساء الحسابات</p>
                <p className="text-[11px] text-amber-600 mt-0.5">اختر رئيساً لعرض محاسبيه</p>
              </div>
              <div className="divide-y divide-gray-100">
                {distHeads.map(head=>{
                  const cnt = distAccs.filter(a=>a.headId===head.id).length;
                  const restCnt = distAccs.filter(a=>a.headId===head.id).flatMap(a=>a.restaurants).length;
                  return (
                    <button key={head.id} onClick={()=>{ setHeadSel(head.id); setAccSel(distAccs.find(a=>a.headId===head.id)?.id||null); }}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 text-right transition-colors ${headSel===head.id?"bg-amber-50/60 border-r-2 border-amber-400":"hover:bg-gray-50"}`}>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${head.color}`}>{head.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800">{head.name}</p>
                        <p className="text-[11px] text-gray-400">{cnt} محاسب · {restCnt} مطعم</p>
                      </div>
                      {headSel===head.id && <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"/>}
                    </button>
                  );
                })}
                {/* Unassigned accountants */}
                {distAccs.filter(a=>!a.headId).length>0 && (
                  <button onClick={()=>{ setHeadSel(null); setAccSel(distAccs.find(a=>!a.headId)?.id||null); }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-right transition-colors ${headSel===null?"bg-red-50/60 border-r-2 border-red-400":"hover:bg-gray-50"}`}>
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm flex-shrink-0">⚠️</div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-600">محاسبون غير مُعيَّنين</p>
                      <p className="text-[11px] text-gray-400">{distAccs.filter(a=>!a.headId).length} محاسب</p>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Column 2: المحاسبون */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                <p className="font-bold text-blue-800 text-sm">👨‍💼 المحاسبون</p>
                <p className="text-[11px] text-blue-600 mt-0.5">
                  {headSel ? `تابعون لـ ${distHeads.find(h=>h.id===headSel)?.name}` : "غير مُعيَّنين"}
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {(headSel===null ? distAccs.filter(a=>!a.headId) : distAccs.filter(a=>a.headId===headSel)).map(acc=>(
                  <div key={acc.id}>
                    <button onClick={()=>setAccSel(acc.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 text-right transition-colors ${accSel===acc.id?"bg-blue-50/60 border-r-2 border-blue-400":"hover:bg-gray-50"}`}>
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold flex-shrink-0">{acc.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800 truncate">{acc.name}</p>
                        <p className="text-[11px] text-gray-400">{acc.restaurants.length} مطعم مُخصَّص</p>
                      </div>
                      {accSel===acc.id && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"/>}
                    </button>
                    {accSel===acc.id && headSel===null && (
                      <div className="px-4 pb-3">
                        <p className="text-[11px] text-gray-500 mb-1">نقل إلى رئيس حسابات:</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {distHeads.map(h=>(
                            <button key={h.id} onClick={()=>moveAccToHead(acc.id,h.id)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${h.color} border-current/20 hover:opacity-80`}>
                              + {h.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {(headSel===null ? distAccs.filter(a=>!a.headId) : distAccs.filter(a=>a.headId===headSel)).length===0 && (
                  <div className="px-4 py-6 text-center text-gray-400 text-xs">لا يوجد محاسبون</div>
                )}
              </div>
            </div>

            {/* Column 3: المطاعم */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100">
                <p className="font-bold text-emerald-800 text-sm">🏢 المطاعم</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">
                  {selAccData ? `مخصصة لـ ${selAccData.name}` : "اختر محاسباً"}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {selAccData && (
                  <>
                    {/* Assigned restaurants */}
                    {selAccRests.length===0
                      ? <div className="px-4 py-4 text-center text-xs text-gray-400">لا توجد مطاعم مخصصة</div>
                      : selAccRests.map(rest=>(
                          <div key={rest} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"/>
                            <span className="text-sm text-gray-700 flex-1">{rest}</span>
                            <button onClick={()=>removeRestFromAcc(accSel!,rest)} className="text-red-400 hover:text-red-600 flex-shrink-0 text-xs px-1.5 py-0.5 rounded hover:bg-red-50">✕</button>
                          </div>
                        ))
                    }
                    {/* Available restaurants */}
                    {availableForAcc.length>0 && (
                      <div className="px-4 py-2 bg-gray-50/50">
                        <p className="text-[10px] font-bold text-gray-400 mb-1.5">إضافة مطاعم:</p>
                        {availableForAcc.map(rest=>(
                          <div key={rest} className="flex items-center gap-2.5 py-1.5 hover:bg-white rounded px-1">
                            <div className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0"/>
                            <span className="text-xs text-gray-500 flex-1">{rest}</span>
                            <button onClick={()=>addRestToAcc(accSel!,rest)} className="text-emerald-500 hover:text-emerald-700 flex-shrink-0 text-xs px-1.5 py-0.5 rounded hover:bg-emerald-50 font-bold">+</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {!selAccData && <div className="px-4 py-8 text-center text-gray-400 text-sm">اختر محاسباً من العمود المجاور</div>}
              </div>
            </div>
          </div>

          {/* Distribution summary — Mode 1 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="font-bold text-sm text-gray-700 mb-3">ملخص التوزيع الكامل</p>
            <div className="space-y-2">
              {distHeads.map(head=>(
                <div key={head.id} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${head.color}`}>{head.avatar}</div>
                    <p className="font-bold text-sm text-gray-800">{head.name}</p>
                    <Badge className="bg-amber-50 text-amber-700 border border-amber-200 mr-auto">رئيس حسابات</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mr-9">
                    {distAccs.filter(a=>a.headId===head.id).map(acc=>(
                      <div key={acc.id} className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">{acc.avatar}</div>
                          <p className="text-xs font-semibold text-gray-700">{acc.name}</p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {acc.restaurants.length===0
                            ? <span className="text-[10px] text-gray-400">لا مطاعم</span>
                            : acc.restaurants.map(r=><span key={r} className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 rounded px-1.5 py-0.5">{r.split("—")[0].trim()}</span>)
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          </>}

          {/* ─ Mode 2: by Module ─ */}
          {distModeType==="module" && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-[11px] text-blue-700">
                💡 اختر محاسباً ثم حدّد الموديولات المسموح بها لكل مطعم من مطاعمه المخصصة
              </div>
              <div className="grid grid-cols-3 gap-4">

                {/* Column 1: Accountant list + filter */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                    <p className="font-bold text-blue-800 text-sm">👨‍💼 المحاسبون</p>
                    <div className="flex items-center gap-1.5 mt-2 bg-white border border-blue-200 rounded-lg px-2.5 py-1.5">
                      <Search size={10} className="text-gray-400 flex-shrink-0"/>
                      <input value={modAccFilter} onChange={e=>setModAccFilter(e.target.value)}
                        className="text-[11px] bg-transparent outline-none flex-1 text-gray-600" placeholder="بحث باسم المحاسب..."/>
                      {modAccFilter && <button onClick={()=>setModAccFilter("")}><X size={10} className="text-gray-400"/></button>}
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100 overflow-y-auto flex-1" style={{maxHeight:340}}>
                    {distAccs.filter(a=>!modAccFilter||a.name.includes(modAccFilter)).map(acc=>{
                      const modCount = Object.values(accModules[acc.id]??{}).reduce((s,m)=>s+m.length,0);
                      const restCount = Object.keys(accModules[acc.id]??{}).length;
                      return (
                        <button key={acc.id} onClick={()=>{ setModAccSel(acc.id); setModAccFilter(""); }}
                          className={`w-full flex items-center gap-3 px-4 py-3.5 text-right transition-colors ${modAccSel===acc.id?"bg-blue-50/60 border-r-2 border-blue-500":"hover:bg-gray-50"}`}>
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold flex-shrink-0">{acc.avatar}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-800 truncate">{acc.name}</p>
                            <p className="text-[11px] text-gray-400">{restCount} مطعم · {modCount} صلاحية</p>
                          </div>
                          {modAccSel===acc.id && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"/>}
                        </button>
                      );
                    })}
                    {distAccs.filter(a=>!modAccFilter||a.name.includes(modAccFilter)).length===0 && (
                      <div className="px-4 py-8 text-center text-gray-400 text-xs">لا نتائج</div>
                    )}
                  </div>
                </div>

                {/* Column 2+3 merged: module matrix for selected accountant */}
                <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  {(()=>{
                    const acc = distAccs.find(a=>a.id===modAccSel);
                    if(!acc) return <div className="flex items-center justify-center h-40 text-gray-400 text-sm">اختر محاسباً</div>;
                    const accRests = acc.restaurants;
                    if(accRests.length===0) return (
                      <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
                        <p className="text-sm">لا توجد مطاعم مخصصة لهذا المحاسب</p>
                        <p className="text-xs">قم بتخصيص مطاعم أولاً من الطريقة الأولى</p>
                      </div>
                    );
                    return (
                      <>
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-gray-800 text-sm">مصفوفة الموديولات — {acc.name}</p>
                            <div className="flex items-center gap-2">
                              <button onClick={()=>accRests.forEach(r=>assignAllModules(modAccSel,r))}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700">
                                ✓ تمكين الكل
                              </button>
                              <button onClick={()=>accRests.forEach(r=>clearRestModules(modAccSel,r))}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300">
                                ✕ إلغاء الكل
                              </button>
                            </div>
                          </div>
                          {/* Restaurant filter */}
                          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 max-w-xs">
                            <Search size={10} className="text-gray-400 flex-shrink-0"/>
                            <input value={modRestFilter} onChange={e=>setModRestFilter(e.target.value)}
                              className="text-[11px] bg-transparent outline-none flex-1 text-gray-600" placeholder="فلترة بالمطعم..."/>
                            {modRestFilter && <button onClick={()=>setModRestFilter("")}><X size={10} className="text-gray-400"/></button>}
                          </div>
                        </div>
                        {/* Table: rows=restaurants, cols=modules */}
                        <div className="overflow-auto">
                          <table className="w-full text-right">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-4 py-2.5 text-xs font-bold text-gray-500 text-right min-w-[140px]">المطعم</th>
                                {DIST_MODULES.map(m=>(
                                  <th key={m} className="px-2 py-2.5 text-[10px] font-bold text-gray-400 text-center min-w-[60px]">{m.slice(0,5)}</th>
                                ))}
                                <th className="px-3 py-2.5 text-[10px] font-bold text-gray-400 text-center">الكل</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {accRests.filter(r=>!modRestFilter||r.includes(modRestFilter)).map((rest,ri)=>{
                                const mods = accModules[modAccSel]?.[rest] ?? [];
                                const allChecked = DIST_MODULES.every(m=>mods.includes(m));
                                return (
                                  <tr key={rest} className={`hover:bg-gray-50/50 ${ri%2===1?"bg-gray-50/30":""}`}>
                                    <td className="px-4 py-2.5">
                                      <p className="text-xs font-semibold text-gray-700">{rest.split("—")[0].trim()}</p>
                                      <p className="text-[10px] text-gray-400">{mods.length}/{DIST_MODULES.length} موديول</p>
                                    </td>
                                    {DIST_MODULES.map(m=>{
                                      const checked = mods.includes(m);
                                      return (
                                        <td key={m} className="px-2 py-2.5 text-center">
                                          <button onClick={()=>toggleModuleForRest(modAccSel,rest,m)}
                                            className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all ${checked?"bg-purple-600 text-white shadow-sm":"bg-gray-100 text-gray-400 hover:bg-purple-100 hover:text-purple-600"}`}>
                                            {checked ? <Check size={11}/> : <span className="text-[10px]">—</span>}
                                          </button>
                                        </td>
                                      );
                                    })}
                                    <td className="px-3 py-2.5 text-center">
                                      <button onClick={()=>allChecked?clearRestModules(modAccSel,rest):assignAllModules(modAccSel,rest)}
                                        className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all ${allChecked?"bg-emerald-500 text-white":"bg-gray-200 text-gray-500 hover:bg-emerald-100"}`}>
                                        {allChecked ? <Check size={11}/> : <Plus size={9}/>}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center gap-4 text-[10px] text-gray-400">
                          <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-purple-600 inline-block"/> ممكَّن</span>
                          <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-gray-100 inline-block"/> غير ممكَّن</span>
                          <span className="mr-auto">اضغط أي خانة لتفعيل/إلغاء الموديول</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ─ Mode 3: Accountants → Heads ─ */}
          {distModeType==="heads" && (()=>{
            const unassigned = distAccs.filter(a=>!a.headId);
            return (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-[11px] text-amber-700">
                  💡 اضغط على محاسب لتحديده، ثم اضغط على رئيس الحسابات لتعيينه إليه — أو اضغط ✕ لإلغاء التعيين
                </div>
                <div className="grid grid-cols-5 gap-4">

                  {/* Left col (2/5): All accountants */}
                  <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-gray-800 text-sm">👨‍💼 جميع المحاسبين</p>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">{distAccs.filter(a=>a.headId).length} مُعيَّن</span>
                          {unassigned.length>0 && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">{unassigned.length} غير مُعيَّن</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5">
                        <Search size={10} className="text-gray-400 flex-shrink-0"/>
                        <input value={h3HeadFilter} onChange={e=>setH3HeadFilter(e.target.value)}
                          className="text-[11px] bg-transparent outline-none flex-1 text-gray-600" placeholder="بحث بالاسم..."/>
                        {h3HeadFilter && <button onClick={()=>setH3HeadFilter("")}><X size={10} className="text-gray-400"/></button>}
                      </div>
                    </div>
                    <div className="divide-y divide-gray-50 overflow-y-auto flex-1" style={{maxHeight:400}}>
                      {distAccs.filter(a=>!h3HeadFilter||a.name.includes(h3HeadFilter)).map(acc=>{
                        const head = distHeads.find(h=>h.id===acc.headId);
                        const isSelected = h3AccSel===acc.id;
                        return (
                          <div key={acc.id} onClick={()=>setH3AccSel(isSelected?null:acc.id)}
                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all ${isSelected?"bg-purple-50 border-r-4 border-purple-500":"hover:bg-gray-50"}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${isSelected?"bg-purple-200 text-purple-800 ring-2 ring-purple-400":"bg-blue-100 text-blue-700"}`}>
                              {acc.avatar}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-semibold text-sm truncate ${isSelected?"text-purple-800":"text-gray-800"}`}>{acc.name}</p>
                              {head
                                ? <p className="text-[10px] text-emerald-600 flex items-center gap-1"><Check size={9}/> {head.name}</p>
                                : <p className="text-[10px] text-red-400">⚠ غير مُعيَّن بعد</p>
                              }
                            </div>
                            {acc.headId && (
                              <button onClick={e=>{ e.stopPropagation(); setDistAccs(p=>p.map(a=>a.id===acc.id?{...a,headId:null}:a)); setH3AccSel(null); }}
                                className="w-6 h-6 rounded-full bg-red-100 text-red-500 hover:bg-red-200 flex items-center justify-center flex-shrink-0">
                                <X size={10}/>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {h3AccSel && (
                      <div className="px-4 py-2.5 bg-purple-50 border-t border-purple-200 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"/>
                        <p className="text-[11px] text-purple-700 font-semibold">
                          {distAccs.find(a=>a.id===h3AccSel)?.name} — اختر رئيساً لتعيينه
                        </p>
                        <button onClick={()=>setH3AccSel(null)} className="mr-auto text-[10px] text-purple-500 hover:text-purple-700">إلغاء</button>
                      </div>
                    )}
                  </div>

                  {/* Right col (3/5): Heads panels */}
                  <div className="col-span-3 space-y-3">
                    {distHeads.map(head=>{
                      const headAccs = distAccs.filter(a=>a.headId===head.id);
                      const totalRests = headAccs.flatMap(a=>a.restaurants).length;
                      const canAssign = h3AccSel && distAccs.find(a=>a.id===h3AccSel)?.headId!==head.id;
                      return (
                        <div key={head.id}
                          onClick={()=>{ if(canAssign && h3AccSel){ moveAccToHead(h3AccSel,head.id); setH3AccSel(null); } }}
                          className={`bg-white rounded-xl border-2 shadow-sm overflow-hidden transition-all ${canAssign?"border-purple-400 cursor-pointer hover:border-purple-600 hover:shadow-md":"border-gray-100"}`}>
                          {/* Head header */}
                          <div className={`px-4 py-3 flex items-center gap-3 ${head.id==="h1"?"bg-amber-50":"bg-purple-50"}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${head.color}`}>{head.avatar}</div>
                            <div className="flex-1">
                              <p className="font-bold text-gray-800 text-sm">{head.name}</p>
                              <p className="text-[11px] text-gray-500">رئيس حسابات · {headAccs.length} محاسب · {totalRests} مطعم</p>
                            </div>
                            {canAssign && (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-[11px] font-semibold animate-pulse">
                                <Plus size={11}/> تعيين هنا
                              </div>
                            )}
                          </div>
                          {/* Assigned accountants */}
                          <div className="px-4 py-3">
                            {headAccs.length===0
                              ? <p className="text-xs text-gray-400 text-center py-2">لا محاسبين مُعيَّنين</p>
                              : <div className="flex flex-wrap gap-2">
                                  {headAccs.map(acc=>(
                                    <div key={acc.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
                                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">{acc.avatar}</div>
                                      <div>
                                        <p className="text-xs font-semibold text-gray-700">{acc.name}</p>
                                        <p className="text-[9px] text-gray-400">{acc.restaurants.length} مطعم</p>
                                      </div>
                                      <button onClick={e=>{ e.stopPropagation(); setDistAccs(p=>p.map(a=>a.id===acc.id?{...a,headId:null}:a)); }}
                                        className="w-4 h-4 rounded-full bg-red-100 text-red-400 hover:bg-red-200 flex items-center justify-center mr-1">
                                        <X size={8}/>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                            }
                          </div>
                        </div>
                      );
                    })}

                    {/* Unassigned summary */}
                    {unassigned.length>0 && (
                      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                        <p className="text-xs font-bold text-red-700 mb-2">⚠ محاسبون غير مُعيَّنين ({unassigned.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {unassigned.map(acc=>(
                            <div key={acc.id} className="flex items-center gap-1.5 bg-white border border-red-200 rounded-lg px-2.5 py-1">
                              <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-bold">{acc.avatar}</div>
                              <p className="text-[11px] text-gray-700">{acc.name}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── LIST TAB ── */}
      {usersTab==="list" && (<>
      {/* Role breakdown */}
      <div className="grid grid-cols-6 gap-3">
        {[["محاسب","blue"],["رئيس حسابات","amber"],["مدير فرع","emerald"],["مدير مشتريات","purple"],["مورد","orange"],["أدمن","red"]].map(([r,c])=>(
          <div key={r} className={`bg-white rounded-xl border border-gray-100 p-3 text-center cursor-pointer hover:border-${c}-200 transition-all ${roleFilter===r?`border-${c}-300 bg-${c}-50/40`:""}`}
            onClick={()=>setRoleFilter(roleFilter===r?"":r)}>
            <p className={`text-xl font-bold text-${c}-600`}>{byRole[r]||0}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{r}</p>
          </div>
        ))}
      </div>

      <Card title="قائمة المستخدمين" actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
            <Search size={13} className="text-gray-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث بالاسم..." className="text-xs outline-none text-gray-600 w-28"/>
          </div>
          <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white">
            <option value="">جميع الأدوار</option>
            {["محاسب","رئيس حسابات","مدير فرع","مدير مشتريات","مورد","أدمن"].map(r=><option key={r}>{r}</option>)}
          </select>
          <select value={brandFilter} onChange={e=>setBrandFilter(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white">
            <option value="">جميع العلامات</option>
            {allBrands.map(b=><option key={b}>{b}</option>)}
          </select>
        </div>
      }>
        {shown.length===0
          ? <EmptyState icon="👤" title="لا توجد نتائج" desc="جرب تغيير الفلتر"/>
          : <div className="divide-y divide-gray-100">
              {shown.map((u,i)=>{
                const isExp = expandedRow===u.email;
                return (
                  <div key={i}>
                    <div className={`px-4 py-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer transition-colors ${isExp?"bg-purple-50/30":""}`}
                      onClick={()=>setExpandedRow(isExp?null:u.email)}>
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{u.name[0]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-gray-800">{u.name}</p>
                          <Badge className={`text-[10px] border ${roleCls[u.role]||"bg-gray-50 text-gray-600 border-gray-200"}`}>{u.role}</Badge>
                          <Badge className={`text-[10px] ${scopeCls[u.scope]}`}>{scopeLabel[u.scope]}</Badge>
                          <Badge className={u.status==="active"?"bg-emerald-50 text-emerald-600 text-[10px]":"bg-gray-50 text-gray-400 text-[10px]"}>{u.status==="active"?"نشط":"غير نشط"}</Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{u.email} · {u.phone}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right hidden md:block">
                          <p className="text-[10px] text-gray-400">العلامات التجارية</p>
                          <p className="text-xs font-medium text-gray-600 max-w-[160px] truncate">{u.brands.join("، ")||"—"}</p>
                        </div>
                        <ChevronDown size={14} className={`text-gray-400 transition-transform ${isExp?"rotate-180":""}`}/>
                      </div>
                    </div>

                    {isExp && (
                      <div className="mx-4 mb-3 bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <p className="text-gray-400 font-semibold mb-1">العلامات التجارية</p>
                            <div className="space-y-0.5">
                              {u.brands.length>0 ? u.brands.map(b=>{
                                const bc=BRANDS_CATALOG.find(x=>x.name===b);
                                return <div key={b} className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:bc?.color||"#888"}}/><span>{b}</span></div>;
                              }) : <span className="text-gray-400">—</span>}
                            </div>
                          </div>
                          <div>
                            <p className="text-gray-400 font-semibold mb-1">المطاعم المخصصة</p>
                            <div className="space-y-0.5">
                              {u.restaurants.length>0 ? u.restaurants.map(r=><div key={r}>{r}</div>) : <span className="text-gray-400">{u.scope==="brand"?"جميع مطاعم العلامة":"—"}</span>}
                            </div>
                          </div>
                          <div>
                            <p className="text-gray-400 font-semibold mb-1">الفروع المخصصة</p>
                            <div className="space-y-0.5">
                              {u.branches.length>0 ? u.branches.map(b=><div key={b}>{b}</div>) : <span className="text-gray-400">{u.scope==="restaurant"?"جميع فروع المطعم":"—"}</span>}
                            </div>
                          </div>
                          <div>
                            <p className="text-gray-400 font-semibold mb-1">الموديولات ({u.modules.length})</p>
                            <div className="flex flex-wrap gap-1">
                              {u.modules.map(m=><span key={m} className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px]">{m}</span>)}
                            </div>
                          </div>
                        </div>
                        {u.reportsTo && (
                          <div className="flex items-center gap-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                            <span className="font-semibold">يرفع تقاريره إلى:</span>
                            <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-lg">{u.reportsTo}</span>
                          </div>
                        )}
                        <div className="flex gap-2 pt-2 border-t border-gray-200">
                          <Btn size="sm"><Edit2 size={12}/> تعديل الصلاحيات</Btn>
                          <Btn size="sm" variant="ghost">إعادة تعيين كلمة المرور</Btn>
                          <button onClick={(e)=>{ e.stopPropagation(); deleteUser(u.email); }}
                            className="mr-auto px-3 py-1 rounded-lg text-xs text-red-500 hover:bg-red-50 flex items-center gap-1">
                            <Trash2 size={12}/> حذف
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
        }
      </Card>
      </>)}
    </div>
  );
}

const BRANDS_DATA = [
  { id:"reem", name:"مطاعم الريم", color:"#7C3AED", abbr:"ر", plan:"بلاتيني", planColor:"purple",
    owner:"فيصل الريم", ownerEmail:"faisal@reem.sa",
    modules:["المبيعات","المصروفات","المشتريات","المخزون","الشفتات","كشف الحساب","العهد","الأصول"],
    subStatus:"active" as const, expires:"15 يناير 2027", daysLeft:307,
    restaurants:[
      { id:"r1", name:"الريم — الصحافة",   city:"الرياض", accountants:2, status:"active"    as const, branches:[{name:"الصالة الرئيسية",manager:"أحمد الشمري"},{name:"قسم التوصيل",manager:"سلطان الغامدي"}] },
      { id:"r2", name:"الريم — النسيم",    city:"الرياض", accountants:1, status:"active"    as const, branches:[{name:"الصالة الرئيسية",manager:"فيصل البريك"},{name:"قسم التوصيل",manager:"بندر العتيبي"}] },
      { id:"r3", name:"الريم — العليا",    city:"الرياض", accountants:2, status:"active"    as const, branches:[{name:"الدور الأرضي",manager:"محمد الزهراني"},{name:"الدور الأول",manager:"علي الغامدي"}] },
      { id:"r4", name:"الريم — جدة الكورنيش", city:"جدة", accountants:1, status:"active"   as const, branches:[{name:"الصالة الرئيسية",manager:"خالد المطيري"},{name:"قسم التوصيل",manager:"عمر العسيري"}] },
    ],
  },
  { id:"herfy", name:"مطاعم هرفي", color:"#D97706", abbr:"هـ", plan:"ذهبي", planColor:"amber",
    owner:"طلال الحسين", ownerEmail:"talal@herfy.sa",
    modules:["المبيعات","المصروفات","المشتريات","المخزون","الشفتات","كشف الحساب"],
    subStatus:"warning" as const, expires:"15 مارس 2026", daysLeft:1,
    restaurants:[
      { id:"r5", name:"هرفي الصحافة",   city:"الرياض", accountants:3, status:"active"    as const, branches:[{name:"الصالة الرئيسية",manager:"طارق المنصور"},{name:"قسم التوصيل",manager:"بندر القحطاني"}] },
      { id:"r6", name:"هرفي النسيم",    city:"الرياض", accountants:2, status:"active"    as const, branches:[{name:"الصالة الرئيسية",manager:"وليد الشهري"},{name:"قسم التوصيل",manager:"نواف العمري"}] },
      { id:"r7", name:"هرفي العليا",    city:"الرياض", accountants:1, status:"active"    as const, branches:[{name:"الصالة الرئيسية",manager:"عبدالرحمن الغامدي"},{name:"قسم التوصيل",manager:"صالح الحربي"}] },
      { id:"r8", name:"هرفي جدة الرحاب", city:"جدة",  accountants:1, status:"active"    as const, branches:[{name:"الصالة الرئيسية",manager:"حمد الدوسري"},{name:"قسم التوصيل",manager:"جاسم القرني"}] },
      { id:"r9", name:"هرفي مكة العزيزية", city:"مكة", accountants:1, status:"active"   as const, branches:[{name:"الصالة الرئيسية",manager:"أنس الطيار"},{name:"قسم التوصيل",manager:"ماجد الشريف"}] },
    ],
  },
  { id:"mcd", name:"ماكدونالدز السعودية", color:"#DC2626", abbr:"م", plan:"بلاتيني", planColor:"purple",
    owner:"شركة المطعم العالمي", ownerEmail:"ops@mcd-sa.com",
    modules:["المبيعات","المصروفات","المشتريات","المخزون","الشفتات","كشف الحساب","العهد","الأصول"],
    subStatus:"danger" as const, expires:"21 أبريل 2026", daysLeft:38,
    restaurants:[
      { id:"r10", name:"ماكدونالدز الدبلوماسي", city:"الرياض", accountants:2, status:"active"  as const, branches:[{name:"الصالة الرئيسية",manager:"بدر الحوشان"},{name:"قسم التوصيل",manager:"منصور العنزي"}] },
      { id:"r11", name:"ماكدونالدز النخيل مول", city:"الرياض", accountants:2, status:"active"  as const, branches:[{name:"الصالة الرئيسية",manager:"سعد المالكي"},{name:"قسم التوصيل",manager:"فهد الدوسري"}] },
      { id:"r12", name:"ماكدونالدز هايبر بنده", city:"الرياض", accountants:1, status:"active"  as const, branches:[{name:"الصالة الرئيسية",manager:"وائل العتيبي"},{name:"قسم التوصيل",manager:"رائد الشمري"}] },
      { id:"r13", name:"ماكدونالدز كورنيش الدمام", city:"الدمام", accountants:2, status:"active" as const, branches:[{name:"الصالة الرئيسية",manager:"خالد المطيري"},{name:"قسم التوصيل",manager:"عمر العسيري"}] },
    ],
  },
  { id:"broasted", name:"بروستد الوطني", color:"#059669", abbr:"ب", plan:"فضي", planColor:"emerald",
    owner:"محمد السعيد", ownerEmail:"msaeed@broasted.sa",
    modules:["المبيعات","المصروفات","المشتريات","المخزون"],
    subStatus:"expired" as const, expires:"9 أكتوبر 2025", daysLeft:-156,
    restaurants:[
      { id:"r14", name:"بروستد الوطني الطائف",    city:"الطائف", accountants:1, status:"suspended" as const, branches:[{name:"الصالة الرئيسية",manager:"نايف العتيبي"},{name:"قسم التوصيل",manager:"عبدالله الشريف"}] },
      { id:"r15", name:"بروستد الوطني الهدا",     city:"الطائف", accountants:1, status:"suspended" as const, branches:[{name:"الصالة الرئيسية",manager:"محمد الغامدي"},{name:"قسم التوصيل",manager:"سعد القحطاني"}] },
    ],
  },
];

function AdminRestaurants({}: PageProps) {
  const [expandedBrand, setExpandedBrand]   = useState<string|null>("reem");
  const [expandedRest,  setExpandedRest]    = useState<string|null>(null);
  const [expandedSub,   setExpandedSubR]    = useState<string|null>(null);
  const [showAddBrand,  setShowAddBrand]    = useState(false);
  const [showAddRest,   setShowAddRest]     = useState<string|null>(null);
  const [restTab, setRestTab]               = useState<"structure"|"upload">("structure");
  type UploadKey = "sales"|"materials"|"employees"|"suppliers";
  const [uploadBrand,   setUploadBrand]     = useState<string>("reem");
  const [brandUploads,  setBrandUploads]    = useState<Record<string,Record<UploadKey,boolean>>>({
    reem:     { sales:true,  materials:true,  employees:false, suppliers:false },
    herfy:    { sales:true,  materials:false, employees:false, suppliers:false },
    mcd:      { sales:false, materials:false, employees:false, suppliers:false },
    broasted: { sales:false, materials:false, employees:false, suppliers:false },
  });
  const setUploaded = (brandId:string, key:UploadKey) =>
    setBrandUploads(p=>({...p,[brandId]:{...p[brandId],[key]:true}}));
  const [branchAssets, setBranchAssets] = useState<Record<string,boolean>>({
    "reem_r1_0":true, "reem_r1_1":false,
    "reem_r2_0":false,"reem_r2_1":false,
    "herfy_r5_0":true,"herfy_r5_1":true,
  });
  const setBranchAsset = (key:string) => setBranchAssets(p=>({...p,[key]:true}));
  const [uploadRestFilter,  setUploadRestFilter]  = useState("");
  const [uploadBrandFilter, setUploadBrandFilter] = useState("");

  // Per-restaurant subscription state
  type RestSub = { plan:"فضي"|"ذهبي"|"بلاتيني"; status:"active"|"warning"|"danger"|"expired"; expires:string; daysLeft:number; price:number };
  const [restSubs, setRestSubs] = useState<Record<string,RestSub>>({
    r1: { plan:"بلاتيني", status:"active",   expires:"15 يناير 2027",  daysLeft:307, price:2499 },
    r2: { plan:"بلاتيني", status:"active",   expires:"15 يناير 2027",  daysLeft:307, price:2499 },
    r3: { plan:"بلاتيني", status:"warning",  expires:"20 أبريل 2026",  daysLeft:35,  price:2499 },
    r4: { plan:"ذهبي",    status:"active",   expires:"1 ديسمبر 2026",  daysLeft:260, price:1499 },
    r5: { plan:"ذهبي",    status:"warning",  expires:"15 مارس 2026",   daysLeft:1,   price:1499 },
    r6: { plan:"ذهبي",    status:"active",   expires:"20 سبتمبر 2026", daysLeft:190, price:1499 },
    r7: { plan:"فضي",     status:"danger",   expires:"25 مارس 2026",   daysLeft:10,  price:799  },
    r8: { plan:"فضي",     status:"active",   expires:"1 نوفمبر 2026",  daysLeft:230, price:799  },
    r9: { plan:"فضي",     status:"active",   expires:"1 نوفمبر 2026",  daysLeft:230, price:799  },
    r10:{ plan:"بلاتيني", status:"active",   expires:"10 فبراير 2027", daysLeft:333, price:2499 },
    r11:{ plan:"بلاتيني", status:"active",   expires:"10 فبراير 2027", daysLeft:333, price:2499 },
    r12:{ plan:"بلاتيني", status:"danger",   expires:"21 أبريل 2026",  daysLeft:38,  price:2499 },
    r13:{ plan:"ذهبي",    status:"danger",   expires:"21 أبريل 2026",  daysLeft:38,  price:1499 },
    r14:{ plan:"فضي",     status:"expired",  expires:"9 أكتوبر 2025",  daysLeft:-156,price:799  },
    r15:{ plan:"فضي",     status:"expired",  expires:"9 أكتوبر 2025",  daysLeft:-156,price:799  },
  });
  const renewSub = (id:string) => setRestSubs(p=>({...p,[id]:{...p[id],status:"active",daysLeft:365,expires:"مارس 2027"}}));

  const subClsRest = { active:"bg-emerald-50 text-emerald-700 border-emerald-200", warning:"bg-amber-50 text-amber-700 border-amber-200", danger:"bg-red-50 text-red-700 border-red-200", expired:"bg-red-100 text-red-800 border-red-300" };
  const subLblRest = { active:"نشط", warning:"ينتهي قريباً", danger:"إنذار انتهاء", expired:"منتهي" };
  const planIcon   = { "فضي":"🥈","ذهبي":"🥇","بلاتيني":"💎" };

  const totalRests   = BRANDS_DATA.reduce((s,b)=>s+b.restaurants.length,0);
  const totalBranches = BRANDS_DATA.reduce((s,b)=>s+b.restaurants.reduce((ss,r)=>ss+r.branches.length,0),0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">الهيكل التشغيلي — العلامات والمطاعم والفروع</h2>
          <p className="text-gray-400 text-sm mt-0.5">{BRANDS_DATA.length} علامة تجارية · {totalRests} مطعم · {totalBranches} فرع</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={()=>setShowAddRest("")}><Plus size={14}/> مطعم جديد</Btn>
          <Btn variant="primary" onClick={()=>setShowAddBrand(true)}><Plus size={14}/> علامة تجارية</Btn>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200">
        {[{id:"structure" as const,label:"🏗 الهيكل التشغيلي"},{id:"upload" as const,label:"📤 رفع البيانات"}].map(t=>(
          <button key={t.id} onClick={()=>setRestTab(t.id)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${restTab===t.id?"border-purple-600 text-purple-700":"border-transparent text-gray-500 hover:text-gray-700"}`}>{t.label}</button>
        ))}
      </div>

      {/* ── Upload Tab ── */}
      {restTab==="upload" && (()=>{
        const selBrand = BRANDS_DATA.find(b=>b.id===uploadBrand)!;
        const ups = brandUploads[uploadBrand] ?? { sales:false, materials:false, employees:false, suppliers:false };

        // per-restaurant employee upload state
        const empKey = (rid:string) => `${uploadBrand}_${rid}`;
        const restEmpDone = (rid:string) => brandUploads[empKey(rid)]?.employees ?? false;
        const setRestEmp  = (rid:string) => setUploaded(empKey(rid),"employees");

        type UploadCardProps = { icon:React.ReactNode; iconBg:string; title:string; subtitle:string; cols:string[]; colColor:string; done:boolean; countLabel:string; onUpload:()=>void };
        const UploadCard = ({icon,iconBg,title,subtitle,cols,colColor,done,countLabel,onUpload}:UploadCardProps) => (
          <div className={`bg-white rounded-xl border shadow-sm p-4 ${done?"border-emerald-200":"border-gray-100"}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>{icon}</div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm">{title}</p>
                <p className="text-[11px] text-gray-400">{subtitle}</p>
              </div>
              {done && <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0"/>}
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5 mb-3">
              <p className="text-[10px] font-bold text-gray-400 mb-1.5">الأعمدة المطلوبة:</p>
              <div className="flex flex-wrap gap-1.5">
                {cols.map(c=><span key={c} className={`text-[10px] ${colColor} px-2 py-0.5 rounded-full`}>{c}</span>)}
              </div>
            </div>
            {done
              ? <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold mb-3 bg-emerald-50 rounded-lg px-3 py-2"><CheckCircle2 size={13}/>{countLabel}</div>
              : <div onClick={onUpload} className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-purple-300 hover:bg-purple-50/10 transition-all mb-3">
                  <Upload size={18} className="text-gray-300 mx-auto mb-1"/>
                  <p className="text-xs text-gray-400">اضغط لرفع ملف Excel</p>
                </div>
            }
            <div className="flex gap-2">
              <Btn variant="primary" size="sm" className="flex-1 justify-center" onClick={onUpload}><Upload size={11}/> رفع</Btn>
              <Btn size="sm"><Download size={11}/> نموذج</Btn>
            </div>
          </div>
        );

        return (
          <div className="space-y-6">

            {/* Brand selector + filter */}
            <div className="space-y-2.5">
              {/* Brand search */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 shadow-sm flex-1 max-w-xs">
                  <Search size={11} className="text-gray-400 flex-shrink-0"/>
                  <input value={uploadBrandFilter} onChange={e=>setUploadBrandFilter(e.target.value)}
                    className="text-[11px] text-gray-600 bg-transparent outline-none flex-1" placeholder="بحث باسم العلامة التجارية..."/>
                  {uploadBrandFilter && <button onClick={()=>setUploadBrandFilter("")} className="text-gray-400 hover:text-gray-600"><X size={10}/></button>}
                </div>
                {uploadBrandFilter && (
                  <span className="text-[10px] text-gray-400">
                    {BRANDS_DATA.filter(b=>!uploadBrandFilter||b.name.includes(uploadBrandFilter)).length} علامة
                  </span>
                )}
              </div>
              {/* Brand cards */}
              <div className="flex gap-2 flex-wrap">
              {BRANDS_DATA.filter(b=>!uploadBrandFilter||b.name.includes(uploadBrandFilter)).map(b=>{
                const bUps = brandUploads[b.id] ?? { sales:false, materials:false, employees:false, suppliers:false };
                const done = Object.values(bUps).filter(Boolean).length;
                const total = 2 + b.restaurants.length;
                return (
                  <button key={b.id} onClick={()=>{ setUploadBrand(b.id); setUploadBrandFilter(""); }}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 transition-all ${uploadBrand===b.id?"border-purple-500 bg-purple-50":"border-gray-200 bg-white hover:border-purple-300"}`}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{background:b.color}}>{b.abbr}</div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${uploadBrand===b.id?"text-purple-800":"text-gray-700"}`}>{b.name}</p>
                      <p className="text-[10px] text-gray-400">{done} / {total} ملف مرفوع</p>
                    </div>
                  </button>
                );
              })}
              </div>
            </div>

            {/* ── Section 1: Brand-level shared data ── */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1 h-5 rounded-full" style={{background:selBrand.color}}/>
                <div>
                  <p className="font-bold text-gray-800 text-sm">بيانات مشتركة — {selBrand.name}</p>
                  <p className="text-[11px] text-gray-400">تُرفع مرة واحدة وتنطبق على جميع مطاعم العلامة</p>
                </div>
                <div className="mr-auto flex items-center gap-1.5 text-[10px] font-semibold">
                  <span className={`px-2 py-0.5 rounded-full ${[ups.sales,ups.materials,ups.suppliers].filter(Boolean).length===3?"bg-emerald-100 text-emerald-700":"bg-amber-50 text-amber-700"}`}>
                    {[ups.sales,ups.materials,ups.suppliers].filter(Boolean).length}/3 مكتمل
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <UploadCard
                  icon={<TrendingUp size={16} className="text-purple-600"/>} iconBg="bg-purple-100"
                  title="أصناف المبيعات" subtitle="قائمة المنتجات والأسعار"
                  cols={["رمز الصنف","اسم الصنف","الفئة","وحدة البيع","السعر"]}
                  colColor="bg-purple-50 text-purple-700"
                  done={ups.sales} countLabel="تم الرفع ✓"
                  onUpload={()=>setUploaded(uploadBrand,"sales")}
                />
                <UploadCard
                  icon={<Package size={16} className="text-orange-600"/>} iconBg="bg-orange-100"
                  title="مواد خام المشتريات" subtitle="أصناف المواد الخام"
                  cols={["رمز المادة","اسم المادة","الفئة","وحدة القياس","التكلفة"]}
                  colColor="bg-orange-50 text-orange-700"
                  done={ups.materials} countLabel="تم الرفع ✓"
                  onUpload={()=>setUploaded(uploadBrand,"materials")}
                />
                <UploadCard
                  icon={<Truck size={16} className="text-teal-600"/>} iconBg="bg-teal-100"
                  title="الموردون" subtitle="قائمة موردي العلامة التجارية"
                  cols={["رقم المورد","اسم المورد","الفئة","جهة الاتصال","شروط الدفع"]}
                  colColor="bg-teal-50 text-teal-700"
                  done={ups.suppliers} countLabel="تم الرفع ✓"
                  onUpload={()=>setUploaded(uploadBrand,"suppliers")}
                />
              </div>
            </div>

            {/* ── Section 2: Per-restaurant employees ── */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1 h-5 rounded-full bg-blue-500"/>
                <div className="flex-1">
                  <p className="font-bold text-gray-800 text-sm">موظفو المطاعم — {selBrand.name}</p>
                  <p className="text-[11px] text-gray-400">كل مطعم له قائمة موظفين مستقلة</p>
                </div>
                <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 shadow-sm">
                  <Search size={11} className="text-gray-400 flex-shrink-0"/>
                  <input value={uploadRestFilter} onChange={e=>setUploadRestFilter(e.target.value)}
                    className="text-[11px] text-gray-600 bg-transparent outline-none w-28" placeholder="بحث باسم المطعم..."/>
                  {uploadRestFilter && <button onClick={()=>setUploadRestFilter("")} className="text-gray-400 hover:text-gray-600"><X size={10}/></button>}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="grid grid-cols-5 gap-0 bg-gray-50 border-b border-gray-200 px-4 py-2">
                  <p className="text-[10px] font-bold text-gray-500 col-span-2">المطعم</p>
                  <p className="text-[10px] font-bold text-gray-500 text-center">حالة الرفع</p>
                  <p className="text-[10px] font-bold text-gray-500 text-center">آخر تحديث</p>
                  <p className="text-[10px] font-bold text-gray-500 text-center">إجراء</p>
                </div>
                {selBrand.restaurants.filter(r=>!uploadRestFilter||r.name.includes(uploadRestFilter)).map((rest,ri)=>{
                  const done = restEmpDone(rest.id);
                  const dates = ["14 مارس 2026","1 مارس 2026","20 فبراير 2026","5 فبراير 2026","28 يناير 2026"];
                  return (
                    <div key={rest.id} className="grid grid-cols-5 gap-0 items-center px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <div className="col-span-2 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{background:selBrand.color+"cc"}}>{rest.name[0]}</div>
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{rest.name}</p>
                          <p className="text-[10px] text-gray-400">{rest.city}</p>
                        </div>
                      </div>
                      <div className="text-center">
                        {done
                          ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle2 size={10}/> مرفوع</span>
                          : <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full"><Clock size={10}/> لم يُرفع</span>
                        }
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400">{done?(dates[ri]||"—"):"—"}</p>
                      </div>
                      <div className="text-center flex items-center justify-center gap-1">
                        <button onClick={()=>setRestEmp(rest.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors flex items-center gap-1 ${done?"bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700":"bg-blue-600 text-white hover:bg-blue-700"}`}>
                          <Upload size={10}/>{done?"تحديث":"رفع"}
                        </button>
                        <Btn size="sm"><Download size={10}/></Btn>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Section 3: Per-branch fixed assets ── */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1 h-5 rounded-full bg-emerald-500"/>
                <div className="flex-1">
                  <p className="font-bold text-gray-800 text-sm">الأصول الثابتة — {selBrand.name}</p>
                  <p className="text-[11px] text-gray-400">كل فرع له قائمة أصول ثابتة مستقلة (معدات، أجهزة، مفروشات...)</p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  {selBrand.restaurants.flatMap((r,_)=>r.branches.map((_,bi)=>branchAssets[`${uploadBrand}_${r.id}_${bi}`]??false)).filter(Boolean).length}
                  /{selBrand.restaurants.reduce((s,r)=>s+r.branches.length,0)} فرع
                </span>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="grid grid-cols-6 gap-0 bg-gray-50 border-b border-gray-200 px-4 py-2">
                  <p className="text-[10px] font-bold text-gray-500 col-span-2">المطعم</p>
                  <p className="text-[10px] font-bold text-gray-500 col-span-2">الفرع</p>
                  <p className="text-[10px] font-bold text-gray-500 text-center">حالة الرفع</p>
                  <p className="text-[10px] font-bold text-gray-500 text-center">إجراء</p>
                </div>
                {selBrand.restaurants.filter(r=>!uploadRestFilter||r.name.includes(uploadRestFilter)).flatMap(rest=>
                  rest.branches.map((br,bi)=>{
                    const aKey = `${uploadBrand}_${rest.id}_${bi}`;
                    const done = branchAssets[aKey]??false;
                    return (
                      <div key={aKey} className="grid grid-cols-6 gap-0 items-center px-4 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                        <div className="col-span-2 flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0" style={{background:selBrand.color+"aa"}}>{rest.name[0]}</div>
                          <p className="text-[10px] text-gray-500 truncate">{rest.name}</p>
                        </div>
                        <div className="col-span-2 flex items-center gap-2">
                          <Home size={10} className="text-gray-300 flex-shrink-0"/>
                          <div>
                            <p className="text-xs font-semibold text-gray-700">{br.name}</p>
                            <p className="text-[10px] text-gray-400">{br.manager}</p>
                          </div>
                        </div>
                        <div className="text-center">
                          {done
                            ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle2 size={9}/> مرفوع</span>
                            : <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full"><Clock size={9}/> لم يُرفع</span>
                          }
                        </div>
                        <div className="text-center flex items-center justify-center gap-1">
                          <button onClick={()=>setBranchAsset(aKey)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors flex items-center gap-1 ${done?"bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700":"bg-emerald-600 text-white hover:bg-emerald-700"}`}>
                            <Upload size={9}/>{done?"تحديث":"رفع"}
                          </button>
                          <Btn size="sm"><Download size={9}/></Btn>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── Upload summary ── */}
            <div className="bg-gradient-to-l from-purple-50 to-emerald-50 rounded-xl border border-purple-100 p-4">
              <p className="text-xs font-bold text-purple-800 mb-3">ملخص رفع البيانات — {selBrand.name}</p>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center bg-white rounded-lg p-2.5 border border-purple-100">
                  <p className="text-base font-extrabold text-purple-700">{[ups.sales,ups.materials,ups.suppliers].filter(Boolean).length}/3</p>
                  <p className="text-[10px] text-purple-500 mt-0.5">بيانات مشتركة</p>
                </div>
                <div className="text-center bg-white rounded-lg p-2.5 border border-blue-100">
                  <p className="text-base font-extrabold text-blue-700">{selBrand.restaurants.filter(r=>restEmpDone(r.id)).length}/{selBrand.restaurants.length}</p>
                  <p className="text-[10px] text-blue-500 mt-0.5">موظفو المطاعم</p>
                </div>
                <div className="text-center bg-white rounded-lg p-2.5 border border-emerald-100">
                  <p className="text-base font-extrabold text-emerald-700">
                    {selBrand.restaurants.flatMap((r,_)=>r.branches.map((_,bi)=>branchAssets[`${uploadBrand}_${r.id}_${bi}`]??false)).filter(Boolean).length}
                    /{selBrand.restaurants.reduce((s,r)=>s+r.branches.length,0)}
                  </p>
                  <p className="text-[10px] text-emerald-500 mt-0.5">أصول الفروع</p>
                </div>
                <div className="text-center bg-white rounded-lg p-2.5 border border-gray-100">
                  {(()=>{
                    const sharedDone  = [ups.sales,ups.materials,ups.suppliers].filter(Boolean).length;
                    const empDone     = selBrand.restaurants.filter(r=>restEmpDone(r.id)).length;
                    const allBranches = selBrand.restaurants.reduce((s,r)=>s+r.branches.length,0);
                    const assetsDone  = selBrand.restaurants.flatMap((r,_ri)=>r.branches.map((_b,bi)=>branchAssets[`${uploadBrand}_${r.id}_${bi}`]??false)).filter(Boolean).length;
                    const pct         = Math.round(((sharedDone/3)+(empDone/selBrand.restaurants.length)+(assetsDone/(allBranches||1)))/3*100);
                    const pctCls      = pct===100?"text-emerald-700":pct>=60?"text-amber-600":"text-gray-500";
                    return (<>
                      <p className={`text-base font-extrabold ${pctCls}`}>{pct}%</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">اكتمال الإعداد</p>
                    </>);
                  })()}
                </div>
              </div>
            </div>

          </div>
        );
      })()}

      {restTab==="structure" && (
      <div className="space-y-3">

      {/* Add brand quick form */}
      {showAddBrand && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-purple-800 text-sm">إضافة علامة تجارية جديدة</p>
            <button onClick={()=>setShowAddBrand(false)}><X size={14} className="text-purple-400"/></button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs text-gray-500 block mb-1">اسم العلامة</label><input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="علامة جديدة"/></div>
            <div><label className="text-xs text-gray-500 block mb-1">المالك / المسؤول</label><input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="اسم المالك"/></div>
            <div><label className="text-xs text-gray-500 block mb-1">الباقة</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"><option>فضي</option><option>ذهبي</option><option>بلاتيني</option></select></div>
          </div>
          <div className="flex gap-2 mt-3"><Btn variant="primary" size="sm" onClick={()=>setShowAddBrand(false)}>✓ حفظ</Btn><Btn size="sm" onClick={()=>setShowAddBrand(false)}>إلغاء</Btn></div>
        </div>
      )}

      {/* Brands accordion */}
      <div className="space-y-3">
        {BRANDS_DATA.map(brand=>{
          const isExpanded = expandedBrand===brand.id;
          const restCount  = brand.restaurants.length;
          const branchCount = brand.restaurants.reduce((s,r)=>s+r.branches.length,0);
          const subCls = { active:"bg-emerald-50 text-emerald-700", warning:"bg-amber-50 text-amber-700", danger:"bg-red-50 text-red-700", expired:"bg-red-100 text-red-800" };
          const subLbl = { active:"اشتراك نشط", warning:"ينتهي قريباً", danger:"إنذار انتهاء", expired:"منتهي الاشتراك" };

          return (
            <div key={brand.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${isExpanded?"border-purple-200":"border-gray-100"}`}>
              {/* Brand header */}
              <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={()=>setExpandedBrand(isExpanded?null:brand.id)}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-sm" style={{background:brand.color}}>{brand.abbr}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-800">{brand.name}</p>
                    <Badge className={`text-[10px] bg-purple-50 text-purple-600`}>باقة {brand.plan}</Badge>
                    <Badge className={`text-[10px] ${subCls[brand.subStatus]}`}>{subLbl[brand.subStatus]}</Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{brand.owner} · {brand.ownerEmail}</p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-center hidden md:block"><p className="text-base font-bold text-gray-800">{restCount}</p><p className="text-[10px] text-gray-400">مطعم</p></div>
                  <div className="text-center hidden md:block"><p className="text-base font-bold text-gray-800">{branchCount}</p><p className="text-[10px] text-gray-400">فرع</p></div>
                  <div className="text-center hidden md:block"><p className="text-base font-bold text-gray-800">{brand.modules.length}</p><p className="text-[10px] text-gray-400">موديول</p></div>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${isExpanded?"rotate-180":""}`}/>
                </div>
              </div>

              {/* Restaurants list */}
              {isExpanded && (
                <div className="border-t border-gray-100">
                  {/* Active modules strip */}
                  <div className="px-5 py-2.5 bg-gray-50/60 flex items-center gap-2 border-b border-gray-100">
                    <span className="text-[10px] text-gray-400 font-semibold">الموديولات الفعّالة:</span>
                    {brand.modules.map(m=><span key={m} className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{m}</span>)}
                  </div>

                  {brand.restaurants.map(rest=>{
                    const isRExp = expandedRest===rest.id;
                    const rsub   = restSubs[rest.id];
                    return (
                      <div key={rest.id} className="border-b border-gray-100 last:border-0">

                        {/* ── Restaurant row — click to expand branches ── */}
                        <div className="flex items-center gap-3 px-6 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
                          onClick={()=>setExpandedRest(isRExp?null:rest.id)}>
                          {/* Dot indicator */}
                          <div className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{background:brand.color}}/>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm text-gray-800">{rest.name}</p>
                              <Badge className={rest.status==="active"?"bg-emerald-50 text-emerald-600 text-[10px]":"bg-red-50 text-red-600 text-[10px]"}>{rest.status==="active"?"نشط":"موقوف"}</Badge>
                              {rsub && <Badge className={`text-[10px] border ${subClsRest[rsub.status]}`}>{planIcon[rsub.plan]} {rsub.plan}</Badge>}
                              {rsub && rsub.status!=="active" && <Badge className="bg-gray-50 text-gray-400 text-[10px]">{rsub.daysLeft<0?`منتهي منذ ${Math.abs(rsub.daysLeft)} يوم`:`${rsub.daysLeft} يوم`}</Badge>}
                            </div>
                            <p className="text-[11px] text-gray-400 mt-0.5">{rest.city} · {rest.branches.length} فروع · {rest.accountants} محاسب</p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e=>e.stopPropagation()}>
                            {rsub && (rsub.status==="expired"||rsub.status==="danger") && (
                              <button onClick={()=>renewSub(rest.id)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold ${rsub.status==="expired"?"bg-red-600 text-white":"bg-amber-500 text-white"} transition-colors`}>
                                {rsub.status==="expired"?"تفعيل":"تجديد"}
                              </button>
                            )}
                            <Btn size="sm" variant="ghost"><Edit2 size={11}/></Btn>
                          </div>
                          <ChevronDown size={13} className={`text-gray-300 transition-transform flex-shrink-0 ${isRExp?"rotate-180":""}`}/>
                        </div>

                        {/* ── Branches + subscription — visible on click ── */}
                        {isRExp && (
                          <div className="mx-6 mb-3 space-y-2">
                            {/* Subscription strip */}
                            {rsub && (
                              <div className={`rounded-lg border px-4 py-2.5 flex items-center gap-3 ${rsub.status==="active"?"bg-emerald-50 border-emerald-200":rsub.status==="expired"?"bg-red-50 border-red-200":"bg-amber-50 border-amber-200"}`}>
                                <span className="text-sm">{planIcon[rsub.plan]}</span>
                                <div className="flex-1">
                                  <p className={`font-bold text-xs ${rsub.status==="active"?"text-emerald-800":rsub.status==="expired"?"text-red-800":"text-amber-800"}`}>باقة {rsub.plan} — {subLblRest[rsub.status]}</p>
                                  <p className={`text-[10px] ${rsub.status==="active"?"text-emerald-600":rsub.status==="expired"?"text-red-600":"text-amber-600"}`}>{rsub.status==="expired"?`انتهى: ${rsub.expires}`:`ينتهي: ${rsub.expires}`} · {rsub.price} ر.س/شهر</p>
                                </div>
                                {rsub.status!=="active" && <button onClick={()=>renewSub(rest.id)} className="px-3 py-1 rounded-lg text-[10px] font-semibold bg-white border border-current hover:opacity-80">{rsub.status==="expired"?"تفعيل مجدداً":"تجديد"}</button>}
                                <button className="px-3 py-1 rounded-lg text-[10px] font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50">تغيير الباقة</button>
                              </div>
                            )}
                            {/* Branches table */}
                            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                                <p className="text-[11px] font-bold text-gray-600">الفروع ({rest.branches.length})</p>
                                <button className="text-[10px] text-purple-600 hover:underline flex items-center gap-1"><Plus size={10}/> إضافة فرع</button>
                              </div>
                              <div className="divide-y divide-gray-100">
                                {rest.branches.map((br,bi)=>(
                                  <div key={bi} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/60 transition-colors">
                                    <Home size={12} className="text-gray-300 flex-shrink-0"/>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-gray-700">{br.name}</p>
                                      <p className="text-[10px] text-gray-400">{br.manager}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button className="p-1 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-500"><Edit2 size={10}/></button>
                                      <button className="p-1 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-500"><Users size={10}/></button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                      </div>
                    );
                  })}

                  {/* Add restaurant button */}
                  <div className="px-5 py-3 flex justify-end border-t border-gray-100">
                    <button className="text-xs text-purple-600 hover:underline flex items-center gap-1"><Plus size={11}/> إضافة مطعم لـ {brand.name}</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>
      )}
    </div>
  );
}

function AdminSubscriptions({}: PageProps) {
  const [subs, setSubs] = useState(BRANDS_DATA.map(b=>({...b})));
  const [expandedSub, setExpandedSub] = useState<string|null>(null);
  const statusCls = { active:"border-emerald-200 bg-emerald-50/20",warning:"border-amber-200 bg-amber-50/20",danger:"border-red-200 bg-red-50/20",expired:"border-red-300 bg-red-50/30" };
  const statusBadgeCls = { active:"bg-emerald-50 text-emerald-700",warning:"bg-amber-50 text-amber-700",danger:"bg-red-50 text-red-700",expired:"bg-red-100 text-red-800" };
  const statusLabel = { active:"اشتراك نشط",warning:"ينتهي قريباً",danger:"إنذار انتهاء",expired:"منتهي الاشتراك" };
  const renew = (id:string) => setSubs(p=>p.map(s=>s.id===id?{...s,subStatus:"active" as const,daysLeft:365,expires:"14 مارس 2027"}:s));

  const totalRestaurants = subs.reduce((s,b)=>s+b.restaurants.length,0);
  const totalBranches    = subs.reduce((s,b)=>s+b.restaurants.reduce((ss,r)=>ss+r.branches.length,0),0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">إدارة الاشتراكات</h2>
          <p className="text-gray-400 text-sm mt-0.5">{subs.length} علامة تجارية · {totalRestaurants} مطعم · {totalBranches} فرع</p>
        </div>
        <Btn variant="primary"><Plus size={14}/> اشتراك جديد</Btn>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="اشتراكات نشطة"    value={String(subs.filter(s=>s.subStatus==="active").length)}  sub=""  icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label="تنتهي قريباً"      value={String(subs.filter(s=>s.subStatus==="warning"||s.subStatus==="danger").length)} sub="" icon={<AlertTriangle size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label="منتهية الاشتراك"  value={String(subs.filter(s=>s.subStatus==="expired").length)} sub="" icon={<XCircle size={18} className="text-red-500"/>}          accent="red"/>
        <KpiCard label="إجمالي الفروع"     value={String(totalBranches)} sub=""  icon={<Home size={18} className="text-purple-600"/>}        accent="purple"/>
      </div>

      {/* Per-brand subscription cards */}
      <div className="space-y-3">
        {subs.map((sub)=>{
          const isExp = expandedSub===sub.id;
          const restCount   = sub.restaurants.length;
          const branchCount = sub.restaurants.reduce((s,r)=>s+r.branches.length,0);

          return (
            <div key={sub.id} className={`bg-white rounded-xl border-2 shadow-sm overflow-hidden ${statusCls[sub.subStatus]}`}>
              {/* Main row */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0" style={{background:sub.color}}>{sub.abbr}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-800">{sub.name}</p>
                    <Badge className={`text-[10px] bg-purple-50 text-purple-600`}>باقة {sub.plan}</Badge>
                    <Badge className={`text-[10px] ${statusBadgeCls[sub.subStatus]}`}>{statusLabel[sub.subStatus]}</Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{sub.owner} · {restCount} مطعم · {branchCount} فرع</p>
                </div>

                {/* Expiry bar */}
                <div className="w-40 flex-shrink-0 hidden md:block">
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>تاريخ الانتهاء: {sub.expires}</span>
                    <span className={sub.daysLeft<0?"text-red-600 font-bold":""}>{sub.daysLeft<0?`منتهي ${Math.abs(sub.daysLeft)} يوم`:`${sub.daysLeft} يوم`}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all ${sub.subStatus==="active"?"bg-emerald-500":sub.subStatus==="warning"?"bg-amber-500":"bg-red-500"}`}
                      style={{width:`${Math.max(0,Math.min(100,(sub.daysLeft/365)*100))}%`}}/>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={()=>renew(sub.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${sub.subStatus==="expired"?"bg-red-600 text-white hover:bg-red-700":"bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"}`}>
                    {sub.subStatus==="expired"?"تفعيل":"تجديد"}
                  </button>
                  <button onClick={()=>setExpandedSub(isExp?null:sub.id)}
                    className="p-1.5 rounded-lg hover:bg-gray-100">
                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${isExp?"rotate-180":""}`}/>
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {isExp && (
                <div className="border-t border-gray-200 px-5 py-4 space-y-4 bg-gray-50/50">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-2">الموديولات الفعّالة</p>
                      <div className="flex flex-wrap gap-1">
                        {sub.modules.map(m=><span key={m} className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{m}</span>)}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-2">المطاعم والفروع</p>
                      <div className="space-y-1">
                        {sub.restaurants.map(r=>(
                          <div key={r.id} className="flex items-center justify-between text-xs">
                            <span className="text-gray-700">{r.name}</span>
                            <span className="text-gray-400">{r.branches.length} فروع</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-2">الفوترة</p>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between"><span className="text-gray-400">الباقة:</span><span className="font-medium">باقة {sub.plan}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">عدد الفروع:</span><span className="font-medium">{branchCount} فرع</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">تاريخ الانتهاء:</span><span className={`font-medium ${sub.subStatus==="expired"?"text-red-600":""}`}>{sub.expires}</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Btn size="sm">تعديل الباقة</Btn>
                    <Btn size="sm" variant="ghost">إضافة مطعم</Btn>
                    <Btn size="sm" variant="ghost">تعديل الموديولات</Btn>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ADMIN — COMPANY SUBSCRIPTIONS (B2B Portal)
// ─────────────────────────────────────────────
type CompanyPlan = "Basic"|"Professional"|"Enterprise";
type CompanySub = {
  id:string; name:string; logo:string; contactName:string; contactEmail:string; contactPhone:string;
  plan:CompanyPlan; status:"active"|"warning"|"danger"|"suspended"|"trial";
  brands:number; restaurants:number; branches:number; usedBranches:number;
  users:number; maxUsers:number;
  monthlyRevenue:number; startDate:string; nextBilling:string; daysLeft:number;
  modules:string[]; adminEmail:string; city:string;
};

const COMPANY_PLANS_META = {
  Basic:        { maxBranches:5,  maxUsers:15, price:1990,  color:"bg-gray-100 text-gray-700 border border-gray-200" },
  Professional: { maxBranches:20, maxUsers:50, price:4800,  color:"bg-blue-50 text-blue-700 border border-blue-200"  },
  Enterprise:   { maxBranches:999,maxUsers:999,price:12000, color:"bg-purple-50 text-purple-700 border border-purple-200"},
};

const INITIAL_COMPANIES:CompanySub[] = [
  { id:"C001", name:"مجموعة التاج للمطاعم",   logo:"👑", contactName:"محمد الراشد",   contactEmail:"m.rashed@altaj.com",   contactPhone:"+966 50 111 2222", plan:"Professional", status:"active",    brands:3, restaurants:8,  branches:12, usedBranches:12, users:31, maxUsers:50, monthlyRevenue:4800,  startDate:"يناير 2024", nextBilling:"15 يناير 2026", daysLeft:87, modules:["مبيعات","مصروفات","مشتريات","مخزون","أصول","شفتات"],          adminEmail:"admin@altaj.com",    city:"الرياض"    },
  { id:"C002", name:"شركة النخيل للأغذية",    logo:"🌴", contactName:"فهد العتيبي",    contactEmail:"f.otaibi@nakheel.sa",  contactPhone:"+966 55 222 3333", plan:"Enterprise",   status:"active",    brands:5, restaurants:15, branches:22, usedBranches:20, users:68, maxUsers:999, monthlyRevenue:12000, startDate:"مارس 2023",  nextBilling:"01 مارس 2026",  daysLeft:145,modules:["مبيعات","مصروفات","مشتريات","مخزون","أصول","شفتات","هدر","كشف حساب","عهدة نقدية"],adminEmail:"admin@nakheel.sa",   city:"جدة"       },
  { id:"C003", name:"مجموعة البلد للمطاعم",   logo:"🏛", contactName:"سارة الزهراني",  contactEmail:"s.zahr@balad.com.sa",  contactPhone:"+966 53 333 4444", plan:"Professional", status:"warning",   brands:2, restaurants:5,  branches:7,  usedBranches:7,  users:19, maxUsers:50, monthlyRevenue:4800,  startDate:"فبراير 2024",nextBilling:"10 فبراير 2026",daysLeft:24, modules:["مبيعات","مصروفات","مشتريات","مخزون"],                          adminEmail:"admin@balad.com.sa", city:"الدمام"    },
  { id:"C004", name:"شركة المروج للضيافة",    logo:"🌿", contactName:"عبدالله الحربي", contactEmail:"a.harbi@moroj.sa",     contactPhone:"+966 56 444 5555", plan:"Basic",         status:"danger",    brands:1, restaurants:3,  branches:4,  usedBranches:3,  users:10, maxUsers:15, monthlyRevenue:1990,  startDate:"أكتوبر 2024",nextBilling:"05 أكتوبر 2025",daysLeft:7,  modules:["مبيعات","مصروفات"],                                            adminEmail:"admin@moroj.sa",     city:"المدينة"   },
  { id:"C005", name:"مجموعة الوطني للأكل",    logo:"🇸🇦", contactName:"نورة السلمي",   contactEmail:"noura@watani.sa",      contactPhone:"+966 58 555 6666", plan:"Professional", status:"trial",     brands:2, restaurants:4,  branches:5,  usedBranches:2,  users:8,  maxUsers:50, monthlyRevenue:0,     startDate:"مارس 2026",  nextBilling:"15 أبريل 2026", daysLeft:25, modules:["مبيعات","مصروفات","مشتريات"],                                  adminEmail:"admin@watani.sa",    city:"الرياض"    },
  { id:"C006", name:"شركة العربية للإطعام",   logo:"🍽", contactName:"خالد الدوسري",  contactEmail:"k.dos@arabia-food.sa", contactPhone:"+966 51 666 7777", plan:"Enterprise",   status:"suspended", brands:4, restaurants:10, branches:16, usedBranches:16, users:42, maxUsers:999, monthlyRevenue:0,     startDate:"يونيو 2023",  nextBilling:"—",              daysLeft:0,  modules:["مبيعات","مصروفات","مشتريات","مخزون","أصول"],                   adminEmail:"admin@arabia-food.sa",city:"مكة"      },
];

function AdminCompanies({ navigate }:PageProps) {
  const [companies, setCompanies] = useState<CompanySub[]>(INITIAL_COMPANIES);
  const [filter, setFilter]   = useState<"all"|CompanyPlan|"trial"|"suspended">("all");
  const [search, setSearch]   = useState("");
  const [selected, setSelected] = useState<CompanySub|null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState<{company:CompanySub;targetPlan:CompanyPlan}|null>(null);

  const statusMeta = {
    active:    { label:"نشط",            cls:"bg-emerald-50 text-emerald-700 border border-emerald-200" },
    warning:   { label:"ينتهي قريباً",   cls:"bg-amber-50 text-amber-700 border border-amber-200"      },
    danger:    { label:"إنذار أخير",     cls:"bg-red-50 text-red-700 border border-red-200"             },
    suspended: { label:"موقوف",          cls:"bg-gray-100 text-gray-500 border border-gray-200"         },
    trial:     { label:"تجريبي",         cls:"bg-blue-50 text-blue-700 border border-blue-200"          },
  };

  const shown = companies.filter(c=>{
    const matchFilter = filter==="all"||(filter==="trial"?c.status==="trial":filter==="suspended"?c.status==="suspended":c.plan===filter);
    const matchSearch = !search||c.name.includes(search)||c.contactName.includes(search)||c.city.includes(search);
    return matchFilter&&matchSearch;
  });

  const totalRevenue  = companies.filter(c=>c.status==="active"||c.status==="warning"||c.status==="danger").reduce((s,c)=>s+c.monthlyRevenue,0);
  const totalBranches = companies.reduce((s,c)=>s+c.usedBranches,0);
  const totalUsers    = companies.reduce((s,c)=>s+c.users,0);

  const suspend = (id:string) => setCompanies(p=>p.map(c=>c.id===id?{...c,status:"suspended" as const}:c));
  const activate = (id:string) => setCompanies(p=>p.map(c=>c.id===id?{...c,status:"active" as const,daysLeft:365}:c));
  const doUpgrade = (id:string, plan:CompanyPlan) => {
    setCompanies(p=>p.map(c=>c.id===id?{...c,plan,maxUsers:COMPANY_PLANS_META[plan].maxUsers,monthlyRevenue:COMPANY_PLANS_META[plan].price}:c));
    setShowUpgrade(null);
    if(selected) setSelected(s=>s?{...s,plan,maxUsers:COMPANY_PLANS_META[plan].maxUsers}:s);
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">اشتراكات الشركات — بوابة المجموعات</h2>
          <p className="text-gray-400 text-sm mt-0.5">{companies.length} شركة مسجلة · {companies.filter(c=>c.status==="active"||c.status==="warning").length} نشطة · إيراد شهري {(totalRevenue/1000).toFixed(0)}K ر.س</p>
        </div>
        <button onClick={()=>setShowAdd(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 shadow-sm">
          <Plus size={14}/> إضافة شركة جديدة
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-3">
        <KpiCard label="شركات نشطة"      value={String(companies.filter(c=>["active","warning","danger"].includes(c.status)).length)} sub="من إجمالي الشركات"  icon={<CheckCircle2 size={16} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label="تجريبي"           value={String(companies.filter(c=>c.status==="trial").length)}                                sub="يحتاج تحويل"       icon={<Star size={16} className="text-blue-500"/>}             accent="blue"/>
        <KpiCard label="ينتهي خلال 30 يوم"value={String(companies.filter(c=>c.daysLeft>0&&c.daysLeft<=30).length)}                     sub="شركات تحتاج تجديد" icon={<AlertTriangle size={16} className="text-amber-600"/>}    accent="amber"/>
        <KpiCard label="الإيراد الشهري"   value={`${(totalRevenue/1000).toFixed(0)}K`}                                                 sub="ر.س من الشركات"   icon={<Wallet size={16} className="text-purple-600"/>}         accent="purple"/>
        <KpiCard label="فروع مدارة"       value={String(totalBranches)}                                                                 sub={`${totalUsers} مستخدم`} icon={<Building2 size={16} className="text-cyan-600"/>}    accent="cyan"/>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-48">
            <Search size={13} className="text-gray-400 flex-shrink-0"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث بالشركة أو المسؤول أو المدينة..." className="flex-1 text-sm outline-none"/>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {(["all","Basic","Professional","Enterprise","trial","suspended"] as const).map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter===f?"bg-white text-gray-800 shadow-sm":"text-gray-500 hover:text-gray-700"}`}>
                {f==="all"?"الكل":f==="trial"?"تجريبي":f==="suspended"?"موقوف":f}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400">{shown.length} نتيجة</span>
        </div>
      </div>

      {/* Companies table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">قائمة الشركات المشتركة في بوابة المجموعات</h3>
          <span className="text-xs text-gray-400">{shown.length} شركة</span>
        </div>
        {shown.map(c=>{
          const pm = COMPANY_PLANS_META[c.plan];
          const branchPct = Math.round((c.usedBranches/pm.maxBranches)*100);
          return (
            <div key={c.id} className="px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 cursor-pointer" onClick={()=>setSelected(c)}>
              <div className="flex items-center gap-4">
                {/* Logo + name */}
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-xl flex-shrink-0">{c.logo}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-800 text-sm">{c.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${COMPANY_PLANS_META[c.plan].color}`}>{c.plan}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusMeta[c.status].cls}`}>{statusMeta[c.status].label}</span>
                    {c.status==="danger"&&<span className="text-[10px] text-red-600 font-bold">⚠ {c.daysLeft} يوم فقط</span>}
                  </div>
                  <div className="flex items-center gap-4 mt-0.5">
                    <span className="text-[11px] text-gray-400">{c.contactName} · {c.city}</span>
                    <span className="text-[11px] text-gray-400">{c.brands} علامة · {c.restaurants} مطعم · {c.usedBranches} فرع</span>
                    <span className="text-[11px] text-gray-400">{c.users} مستخدم</span>
                  </div>
                </div>

                {/* Usage + expiry */}
                <div className="w-40 flex-shrink-0 hidden lg:block">
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>الفروع</span><span>{c.usedBranches}/{c.plan==="Enterprise"?"∞":pm.maxBranches}</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full">
                    <div className={`h-1.5 rounded-full ${branchPct>=90?"bg-red-500":branchPct>=70?"bg-amber-500":"bg-emerald-500"}`}
                      style={{width:`${Math.min(100,branchPct)}%`}}/>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">تنتهي: {c.nextBilling}</p>
                </div>

                {/* Revenue + actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {c.monthlyRevenue>0&&(
                    <div className="text-left hidden xl:block">
                      <p className="font-mono font-bold text-gray-800 text-sm">{c.monthlyRevenue.toLocaleString()} ر.س</p>
                      <p className="text-[10px] text-gray-400">سنوياً</p>
                    </div>
                  )}
                  <div className="flex gap-1.5" onClick={e=>e.stopPropagation()}>
                    {(c.status==="suspended"||c.status==="danger") && (
                      <button onClick={()=>activate(c.id)} className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold hover:bg-emerald-100">تفعيل</button>
                    )}
                    {c.status!=="suspended" && (
                      <button onClick={()=>suspend(c.id)} className="px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 text-[11px] font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200">إيقاف</button>
                    )}
                    <button onClick={()=>setSelected(c)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><Eye size={14}/></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Company Detail Panel (slide-in style modal) */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-start" onClick={()=>setSelected(null)}>
          <div className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl" onClick={e=>e.stopPropagation()} dir="rtl">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-lg">{selected.logo}</div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{selected.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${COMPANY_PLANS_META[selected.plan].color}`}>{selected.plan}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusMeta[selected.status].cls}`}>{statusMeta[selected.status].label}</span>
                  </div>
                </div>
              </div>
              <button onClick={()=>setSelected(null)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18}/></button>
            </div>

            <div className="p-6 space-y-6">
              {/* Contact info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-gray-500 mb-2">معلومات التواصل</p>
                  <p className="font-semibold text-gray-800 text-sm">{selected.contactName}</p>
                  <p className="text-xs text-gray-500 mt-0.5" dir="ltr">{selected.contactEmail}</p>
                  <p className="text-xs text-gray-500" dir="ltr">{selected.contactPhone}</p>
                  <p className="text-xs text-gray-500 mt-0.5">المدينة: {selected.city}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-gray-500 mb-2">حساب الأدمن</p>
                  <p className="font-semibold text-gray-800 text-sm">أدمن الشركة</p>
                  <p className="text-xs text-gray-500 mt-0.5" dir="ltr">{selected.adminEmail}</p>
                  <div className="flex gap-1.5 mt-2">
                    <button className="px-2 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold hover:bg-purple-100">إعادة تعيين كلمة المرور</button>
                    <button className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-bold hover:bg-gray-200">تسجيل الدخول باسمهم</button>
                  </div>
                </div>
              </div>

              {/* Usage stats */}
              <div>
                <p className="text-xs font-bold text-gray-500 mb-3">إحصائيات الاستخدام</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label:"الفروع", used:selected.usedBranches, max:selected.plan==="Enterprise"?selected.usedBranches:COMPANY_PLANS_META[selected.plan].maxBranches, color:"bg-blue-500" },
                    { label:"المستخدمون", used:selected.users, max:selected.plan==="Enterprise"?selected.users:selected.maxUsers, color:"bg-purple-500" },
                  ].map((u,i)=>(
                    <div key={i} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex justify-between text-xs font-semibold text-gray-600 mb-2">
                        <span>{u.label}</span><span>{u.used}/{selected.plan==="Enterprise"?"∞":u.max}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full">
                        <div className={`h-2 rounded-full ${u.color}`} style={{width:`${Math.min(100,Math.round((u.used/u.max)*100))}%`}}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modules */}
              <div>
                <p className="text-xs font-bold text-gray-500 mb-2">الوحدات المفعّلة ({selected.modules.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.modules.map(m=>(
                    <span key={m} className="text-xs bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-1 rounded-lg font-medium">✓ {m}</span>
                  ))}
                  {["هدر","كشف حساب","عهدة نقدية"].filter(m=>!selected.modules.includes(m)).map(m=>(
                    <span key={m} className="text-xs bg-gray-100 text-gray-400 px-2.5 py-1 rounded-lg">○ {m}</span>
                  ))}
                </div>
              </div>

              {/* Billing */}
              <div className="bg-gradient-to-l from-purple-50 to-blue-50 border border-purple-100 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 mb-3">معلومات الفوترة</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-gray-400">الخطة</p>
                    <p className="font-bold text-gray-800">{selected.plan}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">القيمة السنوية</p>
                    <p className="font-bold text-purple-700">{selected.monthlyRevenue.toLocaleString()} ر.س</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">التجديد القادم</p>
                    <p className={`font-bold ${selected.daysLeft<=30?"text-red-600":"text-gray-800"}`}>{selected.nextBilling}</p>
                  </div>
                </div>
              </div>

              {/* Upgrade/Actions */}
              <div>
                <p className="text-xs font-bold text-gray-500 mb-3">إجراءات الاشتراك</p>
                <div className="grid grid-cols-3 gap-3">
                  {(["Basic","Professional","Enterprise"] as CompanyPlan[]).map(plan=>(
                    <button key={plan} onClick={()=>plan!==selected.plan&&setShowUpgrade({company:selected,targetPlan:plan})}
                      className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${selected.plan===plan?"border-purple-400 bg-purple-50 text-purple-700":"border-gray-200 bg-white text-gray-600 hover:border-purple-300 hover:bg-purple-50"}`}>
                      {selected.plan===plan&&<div className="text-[10px] font-normal text-purple-500 mb-0.5">الخطة الحالية</div>}
                      {plan}
                      <div className="text-[10px] font-normal text-gray-400 mt-0.5">{COMPANY_PLANS_META[plan].price.toLocaleString()} ر.س/سنة</div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={()=>selected.status==="suspended"?activate(selected.id):suspend(selected.id)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${selected.status==="suspended"?"bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100":"bg-gray-50 border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200"}`}>
                    {selected.status==="suspended"?"✓ تفعيل الحساب":"⊘ إيقاف مؤقت"}
                  </button>
                  <button className="flex-1 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm font-bold hover:bg-blue-100">
                    📧 إرسال تذكير تجديد
                  </button>
                </div>
              </div>

              {/* Structure */}
              <div>
                <p className="text-xs font-bold text-gray-500 mb-2">هيكل المجموعة</p>
                <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-3 gap-3 text-center">
                  <div><p className="text-2xl font-black text-gray-800">{selected.brands}</p><p className="text-[11px] text-gray-400">علامة تجارية</p></div>
                  <div><p className="text-2xl font-black text-gray-800">{selected.restaurants}</p><p className="text-[11px] text-gray-400">مطعم</p></div>
                  <div><p className="text-2xl font-black text-gray-800">{selected.usedBranches}</p><p className="text-[11px] text-gray-400">فرع</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade confirm */}
      {showUpgrade && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" dir="rtl">
            <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4"><CreditCard size={24} className="text-purple-600"/></div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">تأكيد تغيير الخطة</h3>
            <p className="text-gray-500 text-sm mb-4">
              تغيير خطة <span className="font-bold">{showUpgrade.company.name}</span> من <span className="font-bold text-gray-700">{showUpgrade.company.plan}</span> إلى <span className="font-bold text-purple-700">{showUpgrade.targetPlan}</span>؟
            </p>
            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs text-gray-600">
              القيمة الجديدة: <span className="font-bold text-purple-700">{COMPANY_PLANS_META[showUpgrade.targetPlan].price.toLocaleString()} ر.س/سنة</span>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>doUpgrade(showUpgrade.company.id,showUpgrade.targetPlan)} className="flex-1 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold hover:bg-purple-700">تأكيد التغيير</button>
              <button onClick={()=>setShowUpgrade(null)} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Company modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e=>e.stopPropagation()} dir="rtl">
            <div className="px-5 py-4 bg-gradient-to-l from-purple-700 to-purple-600 text-white flex items-center justify-between">
              <div><h3 className="font-bold">إضافة شركة جديدة</h3><p className="text-purple-200 text-xs">منح حساب بوابة المجموعات</p></div>
              <button onClick={()=>setShowAdd(false)} className="text-purple-200 hover:text-white"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-3">
              {[["اسم الشركة","مجموعة ..."],["اسم المسؤول",""],["البريد الإلكتروني (أدمن الشركة)","admin@company.sa"],["رقم الجوال",""]].map(([label,ph])=>(
                <div key={label}>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">{label}</label>
                  <input placeholder={ph} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-purple-400 outline-none"/>
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">الخطة</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Basic","Professional","Enterprise"] as CompanyPlan[]).map(p=>(
                    <button key={p} className="py-2 rounded-xl border-2 border-gray-200 text-xs font-bold hover:border-purple-400 hover:bg-purple-50 text-gray-600 transition-all">
                      {p}<br/><span className="text-[10px] text-gray-400 font-normal">{COMPANY_PLANS_META[p].price.toLocaleString()} ر.س</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                سيتم إنشاء حساب أدمن الشركة وإرسال بيانات الدخول على البريد الإلكتروني تلقائياً.
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <Btn onClick={()=>setShowAdd(false)}>إلغاء</Btn>
                <Btn variant="primary" onClick={()=>{ setShowAdd(false); alert("✅ تم إنشاء حساب الشركة وإرسال بيانات الدخول"); }}><Send size={13}/> إنشاء الحساب</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminReports({}: PageProps) {
  const [adminRepTab,  setAdminRepTab]  = useState<"reports"|"status">("reports");
  const [activeReport, setActiveReport] = useState<string|null>(null);
  const [step,         setStep]         = useState(0);
  const [uploaded,     setUploaded]     = useState(false);
  const [sentReports,  setSentReports]  = useState<Set<string>>(new Set(["pl","sales-channel"]));
  const [statusFilter, setStatusFilter] = useState("pl");
  const [addRestModal, setAddRestModal] = useState(false);

  const PERIOD = "أكتوبر 2025";

  const coreReports = [
    { id:"pl",           label:"قائمة الأرباح والخسائر",   sub:"تحليل مالي متعمق — 3 مستويات",       icon:"📈", tc:"text-purple-700", bc:"bg-purple-50", brd:"border-purple-200" },
    { id:"sales-channel",label:"تحليل قنوات المبيعات",     sub:"تحليل شامل للقنوات مع النسب",        icon:"🛒", tc:"text-emerald-700",bc:"bg-emerald-50",brd:"border-emerald-200" },
    { id:"smart-compare",label:"المقارنات الذكية",          sub:"مقارنات شهرية وبين الفروع",           icon:"📊", tc:"text-blue-700",   bc:"bg-blue-50",  brd:"border-blue-200"   },
  ];
  const specializedReports = [
    { id:"profit-cash",  label:"مقاربة الأرباح مع النقدية",sub:"الفرق بين أموالك وأرباحك",           icon:"💰", tc:"text-amber-700",  bc:"bg-amber-50", brd:"border-amber-200"  },
    { id:"breakeven",    label:"تحليل نقطة التعادل",       sub:"تحليل المخاطر والأمان المالي",       icon:"⚖️", tc:"text-red-700",    bc:"bg-red-50",   brd:"border-red-200"    },
    { id:"op-profit",    label:"الربحية التشغيلية",        sub:"مؤشرات الأداء ومقارنات القطاع",      icon:"🏆", tc:"text-indigo-700", bc:"bg-indigo-50",brd:"border-indigo-200" },
    { id:"menu-eng",     label:"هندسة القوائم",            sub:"مؤشرات الأداء ومقارنات القطاع",      icon:"🍽️", tc:"text-cyan-700",   bc:"bg-cyan-50",  brd:"border-cyan-200"   },
  ];
  const allReports = [...coreReports,...specializedReports];

  const RESTAURANTS = [
    { id:"r1", name:"مطعم الريم — العليا",   owner:"فيصل الريم",             email:"faisal@reem.sa"        },
    { id:"r2", name:"مطعم الريم — جدة",     owner:"فيصل الريم",             email:"faisal@reem.sa"        },
    { id:"r3", name:"هرفي — الرياض",        owner:"طلال الحسين",            email:"talal@herfy.sa"        },
    { id:"r4", name:"هرفي — جدة",          owner:"طلال الحسين",            email:"talal@herfy.sa"        },
    { id:"r5", name:"هرفي — مكة",          owner:"طلال الحسين",            email:"talal@herfy.sa"        },
    { id:"r6", name:"ماكدونالدز — الرياض",  owner:"شركة المطعم العالمي",    email:"ops@mcd-sa.com"        },
    { id:"r7", name:"ماكدونالدز — الدمام",  owner:"شركة المطعم العالمي",    email:"ops@mcd-sa.com"        },
    { id:"r8", name:"بروستد الوطني",        owner:"محمد السعيد",            email:"msaeed@broasted.sa"    },
  ];

  const [repStatus, setRepStatus] = useState<Record<string,Record<string,{sent:boolean;sentDate:string;viewed:boolean;viewedDate:string}>>>({
    "pl":          { r1:{sent:true,sentDate:"1 أكتوبر",viewed:true, viewedDate:"2 أكتوبر"}, r2:{sent:true,sentDate:"1 أكتوبر",viewed:true, viewedDate:"3 أكتوبر"}, r3:{sent:true,sentDate:"1 أكتوبر",viewed:false,viewedDate:""}, r4:{sent:true,sentDate:"1 أكتوبر",viewed:false,viewedDate:""}, r5:{sent:true,sentDate:"1 أكتوبر",viewed:true, viewedDate:"5 أكتوبر"}, r6:{sent:false,sentDate:"",viewed:false,viewedDate:""}, r7:{sent:false,sentDate:"",viewed:false,viewedDate:""}, r8:{sent:false,sentDate:"",viewed:false,viewedDate:""} },
    "sales-channel":{ r1:{sent:true,sentDate:"1 أكتوبر",viewed:true, viewedDate:"2 أكتوبر"}, r2:{sent:true,sentDate:"1 أكتوبر",viewed:false,viewedDate:""}, r3:{sent:false,sentDate:"",viewed:false,viewedDate:""}, r4:{sent:false,sentDate:"",viewed:false,viewedDate:""}, r5:{sent:false,sentDate:"",viewed:false,viewedDate:""}, r6:{sent:false,sentDate:"",viewed:false,viewedDate:""}, r7:{sent:false,sentDate:"",viewed:false,viewedDate:""}, r8:{sent:false,sentDate:"",viewed:false,viewedDate:""} },
  });
  const getStatus = (repId:string, restId:string) => repStatus[repId]?.[restId] || {sent:false,sentDate:"",viewed:false,viewedDate:""};

  const sendReport = (repId:string) => {
    const now = "14 أكتوبر 2025";
    setRepStatus(p=>({ ...p, [repId]:Object.fromEntries(RESTAURANTS.map(r=>[r.id,{sent:true,sentDate:now,viewed:false,viewedDate:""}])) }));
    setSentReports(p=>{ const s=new Set(p); s.add(repId); return s; });
    setStep(3);
  };

  const previewRows: Record<string,{label:string;value:string;type:string;header?:boolean}[]> = {
    "pl":           [{label:"إجمالي الإيرادات",value:"842,500",type:"income",header:true},{label:"   مبيعات المطعم",value:"820,000",type:"income"},{label:"   إيرادات أخرى",value:"22,500",type:"income"},{label:"إجمالي المصروفات",value:"(612,000)",type:"expense",header:true},{label:"   تكلفة المواد",value:"(320,000)",type:"expense"},{label:"   رواتب",value:"(180,000)",type:"expense"},{label:"صافي الربح",value:"230,500",type:"profit",header:true},{label:"هامش الربح",value:"27.4%",type:"profit",header:true}],
    "sales-channel":[{label:"تطبيق المطعم",value:"42%",type:"income",header:false},{label:"طلبات أجرجر",value:"28%",type:"income",header:false},{label:"هنقرستيشن",value:"18%",type:"income",header:false},{label:"كاونتر مباشر",value:"12%",type:"income",header:false},{label:"الإجمالي",value:"842,500 ر.س",type:"profit",header:true},{label:"أعلى قناة ربحية",value:"تطبيق المطعم",type:"profit",header:false}],
    "smart-compare":[{label:"مبيعات أكتوبر",value:"842,500",type:"income",header:false},{label:"مبيعات سبتمبر",value:"791,000",type:"income",header:false},{label:"التغيير",value:"+6.5% ↑",type:"profit",header:false},{label:"مصروفات أكتوبر",value:"612,000",type:"expense",header:false},{label:"مصروفات سبتمبر",value:"589,000",type:"expense",header:false},{label:"صافي التحسن",value:"+14.1% ↑",type:"profit",header:true}],
    "profit-cash":  [{label:"صافي الربح المحاسبي",value:"230,500",type:"profit",header:true},{label:"التدفق النقدي الفعلي",value:"185,000",type:"income",header:true},{label:"الفارق",value:"45,500",type:"expense",header:false},{label:"المخزون غير المحقق",value:"32,000",type:"expense",header:false},{label:"الذمم المدينة",value:"13,500",type:"expense",header:false}],
    "breakeven":    [{label:"إيرادات التعادل",value:"580,000",type:"income",header:true},{label:"المصروفات الثابتة",value:"245,000",type:"expense",header:false},{label:"هامش المساهمة",value:"42.3%",type:"profit",header:false},{label:"هامش الأمان",value:"31.1%",type:"profit",header:true},{label:"أيام التعادل الشهري",value:"17 يوم",type:"income",header:false}],
    "op-profit":    [{label:"ربحية فرع العليا",value:"18.2%",type:"profit",header:false},{label:"ربحية فرع الحمراء",value:"21.5%",type:"profit",header:false},{label:"ربحية فرع مكة",value:"14.8%",type:"income",header:false},{label:"متوسط القطاع",value:"16%",type:"income",header:true},{label:"أعلى من المتوسط",value:"فرعان",type:"profit",header:false}],
    "menu-eng":     [{label:"البنود النجمية ⭐",value:"12 صنف",type:"profit",header:false},{label:"بنود البقرة النقدية 🐄",value:"8 أصناف",type:"income",header:false},{label:"بنود الاستفهام ❓",value:"5 أصناف",type:"expense",header:false},{label:"بنود الكلب 🐕",value:"3 أصناف",type:"expense",header:false},{label:"هامش الربح العلوي",value:"الجمبري المشوي",type:"profit",header:true}],
  };

  const selectedReport = allReports.find(r=>r.id===activeReport);

  // ── 4-step flow for active report ──
  if (activeReport && selectedReport) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <button onClick={()=>{ setActiveReport(null); setStep(0); setUploaded(false); }} className="text-purple-600 hover:underline text-sm flex items-center gap-1"><ChevronUp size={13} className="rotate-90"/> مدير التقارير</button>
          <span className="text-gray-300">/</span>
          <span className="text-gray-600 text-sm font-semibold">{selectedReport.label}</span>
          <Badge className={`${selectedReport.bc} ${selectedReport.tc} border ${selectedReport.brd} mr-auto`}>شهري · {PERIOD}</Badge>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-2xl">{selectedReport.icon}</span>
            <div><p className="font-bold text-gray-800">{selectedReport.label}</p><p className="text-xs text-gray-400">{selectedReport.sub}</p></div>
          </div>
          <div className="flex items-center gap-0 mb-6">
            {[{n:1,label:"تصدير من ERP",icon:"🔗"},{n:2,label:"رفع Excel",icon:"📊"},{n:3,label:"مراجعة",icon:"👁"},{n:4,label:"إرسال لكل المطاعم",icon:"📤"}].map((s,i)=>(
              <div key={i} className="flex items-center flex-1">
                <button onClick={()=>setStep(s.n-1)} className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl transition-all ${step===s.n-1?"bg-purple-600 text-white":step>s.n-1?"bg-emerald-100 text-emerald-700":"bg-gray-100 text-gray-400"}`}>
                  <span className="text-xs">{step>=s.n?"✓":s.icon}</span><span className="text-xs font-semibold whitespace-nowrap">{s.label}</span>
                </button>
                {i<3 && <div className={`flex-1 h-0.5 mx-1 ${step>i?"bg-emerald-300":"bg-gray-200"}`}/>}
              </div>
            ))}
          </div>

          {step===0 && <div className="text-center py-6 space-y-4">
            <div className="text-5xl">{selectedReport.icon}</div>
            <h3 className="font-bold text-gray-800">تصدير {selectedReport.label} من ERP</h3>
            <div className="bg-blue-50 rounded-xl p-4 text-right max-w-sm mx-auto">
              <p className="font-semibold text-blue-800 text-sm mb-2">الخطوات:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs text-blue-700"><li>افتح نظام ERP → التقارير</li><li>اختر {selectedReport.label}</li><li>الفترة: {PERIOD}</li><li>اضغط تصدير Excel</li></ol>
            </div>
            <Btn variant="primary" onClick={()=>setStep(1)} className="mx-auto">انتقل لرفع الملف →</Btn>
          </div>}

          {step===1 && <div className="space-y-4">
            {!uploaded
              ? <div onClick={()=>setUploaded(true)} className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/20 transition-all">
                  <div className="text-5xl mb-3">📊</div>
                  <p className="font-semibold text-gray-700 mb-1">اسحب وأفلت ملف Excel هنا</p>
                  <p className="text-xs text-gray-400 mb-4">xlsx, xls, csv · {PERIOD}</p>
                  <Btn variant="primary" className="mx-auto"><Upload size={14}/> اختيار الملف</Btn>
                </div>
              : <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0"/>
                    <div><p className="font-semibold text-sm text-emerald-800">تم رفع الملف بنجاح</p><p className="text-xs text-emerald-600">{selectedReport.label}_{PERIOD.replace(" ","_")}.xlsx ✓</p></div>
                    <button onClick={()=>setUploaded(false)} className="mr-auto text-emerald-400 hover:text-emerald-600"><X size={14}/></button>
                  </div>
                  <Btn variant="primary" onClick={()=>setStep(2)} className="w-full justify-center">معاينة التقرير →</Btn>
                </div>}
          </div>}

          {step===2 && <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">معاينة: {selectedReport.label} — {PERIOD}</h3>
              <Badge className="bg-blue-50 text-blue-700">للعرض فقط</Badge>
            </div>
            <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-purple-700 text-white px-5 py-3 text-center">
                <p className="font-bold">{selectedReport.icon} {selectedReport.label} — {PERIOD}</p>
                <p className="text-purple-200 text-xs mt-0.5">جميع المطاعم المشتركة · {RESTAURANTS.length} مطاعم</p>
              </div>
              <table className="w-full" dir="rtl"><tbody className="divide-y divide-gray-200">
                {(previewRows[activeReport]||previewRows["pl"]).map((row,i)=>(
                  <tr key={i} className={row.header?"bg-gray-100":"bg-white"}>
                    <td className={`px-5 py-2.5 text-sm ${row.header?"font-bold text-gray-800":"text-gray-600"}`}>{row.label}</td>
                    <td className={`px-5 py-2.5 text-left font-mono text-sm ${row.type==="profit"?"text-emerald-700 font-bold":row.type==="expense"?"text-red-600":"text-gray-800"}`} dir="ltr">{row.value}</td>
                  </tr>
                ))}
              </tbody></table>
            </div>
            <div className="flex gap-3"><Btn onClick={()=>setStep(1)}>← رجوع</Btn><Btn variant="primary" onClick={()=>setStep(3-1+1)} className="flex-1 justify-center">متابعة للإرسال →</Btn></div>
          </div>}

          {step===3 && !sentReports.has(activeReport) && <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">إرسال لجميع المطاعم المشتركة</h3>
              <Badge className="bg-emerald-50 text-emerald-700">{RESTAURANTS.length} مطاعم</Badge>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-amber-700 text-sm">
              <Bell size={14} className="flex-shrink-0"/>
              سيُرسَل تقرير <strong>{selectedReport.label} — {PERIOD}</strong> لجميع أصحاب المطاعم بالبريد الإلكتروني + إشعار داخل التطبيق.
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {RESTAURANTS.map((r)=>(
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white">
                  <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0"/>
                  <div className="flex-1"><p className="text-sm font-medium text-gray-700">{r.name}</p><p className="text-xs text-gray-400">{r.owner} · {r.email}</p></div>
                  <span className="text-xs text-gray-400">إيميل + إشعار</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Btn onClick={()=>setStep(2)}>← رجوع</Btn>
              <button onClick={()=>sendReport(activeReport)} className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 flex items-center justify-center gap-2">
                <Upload size={15}/> إرسال التقرير لجميع المطاعم
              </button>
            </div>
          </div>}

          {(step===3 && sentReports.has(activeReport)) && <div className="text-center py-8 space-y-4">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto border-2 border-emerald-200">
              <CheckCircle2 size={36} className="text-emerald-600"/>
            </div>
            <h3 className="text-xl font-bold text-gray-800">تم الإرسال بنجاح!</h3>
            <p className="text-gray-500 text-sm">تم إرسال <strong>{selectedReport.label} — {PERIOD}</strong> لـ {RESTAURANTS.length} مطاعم</p>
            <div className="flex gap-3 justify-center">
              <Btn onClick={()=>{ setActiveReport(null); setAdminRepTab("status"); setStatusFilter(activeReport!); setStep(0); setUploaded(false); }}>
                <Eye size={13}/> عرض حالة التقارير
              </Btn>
              <Btn variant="primary" onClick={()=>{ setActiveReport(null); setStep(0); setUploaded(false); }}>
                العودة للتقارير
              </Btn>
            </div>
          </div>}
        </div>
      </div>
    );
  }

  // ── Main reports manager grid ──
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">مدير التقارير</h2><p className="text-gray-400 text-sm mt-0.5">تقارير شهرية — ترسَل لكل المطاعم المشتركة</p></div>
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-50 text-purple-700 border border-purple-200">📅 {PERIOD}</Badge>
          <Badge className="bg-gray-50 text-gray-600">{RESTAURANTS.length} مطاعم مشتركة</Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200">
        {[{id:"reports" as const,label:"📋 التقارير"},{id:"status" as const,label:"📊 حالة التقارير"}].map(t=>(
          <button key={t.id} onClick={()=>setAdminRepTab(t.id)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${adminRepTab===t.id?"border-purple-600 text-purple-700":"border-transparent text-gray-500 hover:text-gray-700"}`}>{t.label}</button>
        ))}
      </div>

      {/* ── REPORTS TAB ── */}
      {adminRepTab==="reports" && (
        <div className="space-y-5">
          {/* Summary KPIs */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center"><p className="text-2xl font-extrabold font-mono text-gray-800">{allReports.length}</p><p className="text-[11px] text-gray-400">إجمالي التقارير</p></div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center"><p className="text-2xl font-extrabold font-mono text-emerald-700">{sentReports.size}</p><p className="text-[11px] text-gray-400">تم الإرسال</p></div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center"><p className="text-2xl font-extrabold font-mono text-amber-600">{allReports.length-sentReports.size}</p><p className="text-[11px] text-gray-400">لم تُرسَل بعد</p></div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center"><p className="text-2xl font-extrabold font-mono text-blue-700">{RESTAURANTS.length}</p><p className="text-[11px] text-gray-400">مطعم مشترك</p></div>
          </div>

          {/* Core Reports */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-bold text-gray-800 text-sm">التقارير الأساسية</h3>
              <Badge className="bg-gray-100 text-gray-500">{coreReports.length}</Badge>
            </div>
            <div className="space-y-2">
              {coreReports.map(rep=>{
                const isSent = sentReports.has(rep.id);
                const statusData = repStatus[rep.id];
                const sentCount = statusData ? Object.values(statusData).filter(s=>s.sent).length : 0;
                const viewedCount = statusData ? Object.values(statusData).filter(s=>s.viewed).length : 0;
                return (
                  <div key={rep.id} className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 hover:shadow transition-shadow cursor-pointer ${isSent?"border-emerald-100":"border-gray-100"}`}
                    onClick={()=>{ setActiveReport(rep.id); setStep(0); setUploaded(false); }}>
                    <div className={`w-11 h-11 rounded-xl ${rep.bc} border ${rep.brd} flex items-center justify-center text-xl flex-shrink-0`}>{rep.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${rep.tc}`}>{rep.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{rep.sub}</p>
                    </div>
                    {isSent
                      ? <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-center"><p className="text-sm font-bold text-emerald-700">{sentCount}/{RESTAURANTS.length}</p><p className="text-[10px] text-gray-400">أُرسل</p></div>
                          <div className="text-center"><p className="text-sm font-bold text-blue-700">{viewedCount}/{RESTAURANTS.length}</p><p className="text-[10px] text-gray-400">اطّلع</p></div>
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">✓ مُرسَل</Badge>
                        </div>
                      : <Badge className="bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0">⏳ لم يُرسَل</Badge>
                    }
                    <ChevronDown size={14} className="text-gray-400 rotate-[-90deg] flex-shrink-0"/>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Specialized Reports */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-bold text-gray-800 text-sm">التقارير المتخصصة</h3>
              <Badge className="bg-gray-100 text-gray-500">{specializedReports.length}</Badge>
            </div>
            <div className="space-y-2">
              {specializedReports.map(rep=>{
                const isSent = sentReports.has(rep.id);
                const statusData = repStatus[rep.id];
                const sentCount = statusData ? Object.values(statusData).filter(s=>s.sent).length : 0;
                const viewedCount = statusData ? Object.values(statusData).filter(s=>s.viewed).length : 0;
                return (
                  <div key={rep.id} className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 hover:shadow transition-shadow cursor-pointer ${isSent?"border-emerald-100":"border-gray-100"}`}
                    onClick={()=>{ setActiveReport(rep.id); setStep(0); setUploaded(false); }}>
                    <div className={`w-11 h-11 rounded-xl ${rep.bc} border ${rep.brd} flex items-center justify-center text-xl flex-shrink-0`}>{rep.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${rep.tc}`}>{rep.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{rep.sub}</p>
                    </div>
                    {isSent
                      ? <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-center"><p className="text-sm font-bold text-emerald-700">{sentCount}/{RESTAURANTS.length}</p><p className="text-[10px] text-gray-400">أُرسل</p></div>
                          <div className="text-center"><p className="text-sm font-bold text-blue-700">{viewedCount}/{RESTAURANTS.length}</p><p className="text-[10px] text-gray-400">اطّلع</p></div>
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">✓ مُرسَل</Badge>
                        </div>
                      : <Badge className="bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0">⏳ لم يُرسَل</Badge>
                    }
                    <ChevronDown size={14} className="text-gray-400 rotate-[-90deg] flex-shrink-0"/>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── STATUS TAB ── */}
      {adminRepTab==="status" && (
        <div className="space-y-4">
          {/* Report filter */}
          <div className="flex flex-wrap gap-2">
            {allReports.map(r=>(
              <button key={r.id} onClick={()=>setStatusFilter(r.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${statusFilter===r.id?`${r.bc} ${r.tc} ${r.brd}`:"bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
                <span>{r.icon}</span> {r.label}
              </button>
            ))}
          </div>

          {/* Status summary cards */}
          {(() => {
            const repData = repStatus[statusFilter] || {};
            const sent    = RESTAURANTS.filter(r=>repData[r.id]?.sent).length;
            const notSent = RESTAURANTS.length - sent;
            const viewed  = RESTAURANTS.filter(r=>repData[r.id]?.viewed).length;
            const notView = sent - viewed;
            const selRep  = allReports.find(r=>r.id===statusFilter)!;
            return (
              <>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center"><p className="text-2xl font-extrabold font-mono text-emerald-700">{sent}</p><p className="text-xs text-emerald-600">✅ أُرسل التقرير</p></div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center"><p className="text-2xl font-extrabold font-mono text-red-700">{notSent}</p><p className="text-xs text-red-600">❌ لم يُرسَل بعد</p></div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center"><p className="text-2xl font-extrabold font-mono text-blue-700">{viewed}</p><p className="text-xs text-blue-600">👁 اطّلع صاحب المطعم</p></div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center"><p className="text-2xl font-extrabold font-mono text-amber-700">{notView}</p><p className="text-xs text-amber-600">⏳ لم يطّلع بعد</p></div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                    <span>{selRep?.icon}</span>
                    <p className="font-bold text-sm text-gray-700">{selRep?.label} — {PERIOD}</p>
                    <Badge className={`mr-auto ${sentReports.has(statusFilter)?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-700"}`}>{sentReports.has(statusFilter)?"مُرسَل":"لم يُرسَل بعد"}</Badge>
                  </div>
                  <table className="w-full" dir="rtl">
                    <thead className="bg-gray-50/50">
                      <tr className="text-xs text-gray-500 font-semibold">
                        <th className="px-4 py-3 text-right">المطعم</th>
                        <th className="px-4 py-3 text-right">صاحب المطعم</th>
                        <th className="px-4 py-3 text-center">أُرسل؟</th>
                        <th className="px-4 py-3 text-center">تاريخ الإرسال</th>
                        <th className="px-4 py-3 text-center">اطّلع؟</th>
                        <th className="px-4 py-3 text-center">تاريخ الاطلاع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {RESTAURANTS.map(rest=>{
                        const st = repData[rest.id] || {sent:false,sentDate:"",viewed:false,viewedDate:""};
                        return (
                          <tr key={rest.id} className="hover:bg-gray-50/50">
                            <td className="px-4 py-3 font-semibold text-sm text-gray-800">{rest.name}</td>
                            <td className="px-4 py-3 text-xs text-gray-500">{rest.owner}</td>
                            <td className="px-4 py-3 text-center">
                              {st.sent
                                ? <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs"><CheckCircle2 size={13}/> نعم</span>
                                : <span className="inline-flex items-center gap-1 text-red-500 text-xs"><X size={13}/> لا</span>}
                            </td>
                            <td className="px-4 py-3 text-center text-xs text-gray-500">{st.sentDate||"—"}</td>
                            <td className="px-4 py-3 text-center">
                              {st.viewed
                                ? <span className="inline-flex items-center gap-1 text-blue-700 font-semibold text-xs"><Eye size={13}/> نعم</span>
                                : st.sent
                                  ? <span className="text-amber-600 text-xs font-medium">⏳ لم يطّلع</span>
                                  : <span className="text-gray-300 text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3 text-center text-xs text-gray-500">{st.viewedDate||"—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}

          {!sentReports.has(statusFilter) && (
            <button onClick={()=>{ setAdminRepTab("reports"); setActiveReport(statusFilter); setStep(0); setUploaded(false); }}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-purple-300 text-purple-600 font-semibold text-sm hover:bg-purple-50 flex items-center justify-center gap-2">
              <Upload size={14}/> إرسال هذا التقرير الآن
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AdminAudit({}: PageProps) {
  const logs = [
    {action:"إضافة مستخدم جديد",user:"الأدمن",time:"10:30 ص",icon:"👤",cls:"bg-gray-50"},
    {action:"اعتماد نهائي لـ 45 عملية",user:"خالد العمري — رئيس الحسابات",time:"10:15 ص",icon:"✅",cls:"bg-emerald-50"},
    {action:"تجديد اشتراك مطعم هرفي",user:"الأدمن",time:"9:45 ص",icon:"💳",cls:"bg-gray-50"},
    {action:"رفض عملية EXP-0441",user:"أحمد محمد الشهري",time:"9:30 ص",icon:"❌",cls:"bg-red-50"},
    {action:"تصدير بيانات ERP",user:"خالد العمري",time:"9:00 ص",icon:"🔗",cls:"bg-gray-50"},
    {action:"تحديث أصناف الجرد اليومي",user:"أحمد محمد الشهري",time:"8:45 ص",icon:"📦",cls:"bg-gray-50"},
  ];
  return (
    <div className="space-y-5"><h2 className="text-xl font-bold text-gray-800">سجل النشاطات</h2>
      <Card title="آخر النشاطات">
        <div className="divide-y divide-gray-100">
          {logs.map((log,i)=>(
            <div key={i} className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 ${log.cls}`}>{log.icon}</div>
              <div className="flex-1"><p className="text-sm font-medium text-gray-800">{log.action}</p><p className="text-xs text-gray-400">{log.user}</p></div>
              <span className="text-xs text-gray-400">{log.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function AdminPermissions({}: PageProps) {
  type Permission = "view" | "submit" | "review" | "approve" | "final" | "none";
  const PERM_CYCLE: Permission[] = ["none","view","submit","review","approve","final"];
  const permCls: Record<Permission,string> = {
    view:    "bg-blue-50 text-blue-600 border-blue-200",
    submit:  "bg-cyan-50 text-cyan-600 border-cyan-200",
    review:  "bg-amber-50 text-amber-600 border-amber-200",
    approve: "bg-emerald-50 text-emerald-600 border-emerald-200",
    final:   "bg-purple-50 text-purple-600 border-purple-200",
    none:    "bg-gray-50 text-gray-300 border-gray-100",
  };
  const permLabel: Record<Permission,string> = { view:"عرض", submit:"إدخال", review:"مراجعة", approve:"اعتماد", final:"نهائي", none:"—" };
  const roles = ["محاسب","رئيس حسابات","مدير فرع","مدير مشتريات","مورد","أدمن"];
  const scopeRow: Record<string,string> = {
    "محاسب":"علامة/مطعم محدد","رئيس حسابات":"علامة محددة","مدير فرع":"فرع واحد",
    "مدير مشتريات":"علامات محددة","مورد":"نطاق المورد","أدمن":"كامل",
  };
  const roleBadgeCls: Record<string,string> = {
    "محاسب":"bg-blue-50 text-blue-700","رئيس حسابات":"bg-amber-50 text-amber-700",
    "مدير فرع":"bg-emerald-50 text-emerald-700","مدير مشتريات":"bg-purple-50 text-purple-700",
    "مورد":"bg-orange-50 text-orange-700","أدمن":"bg-red-50 text-red-700",
  };

  const [matrix, setMatrix] = useState<{module:string; perms: Permission[]}[]>([
    { module:"المبيعات",         perms:["review","final","submit","none","none","approve"] },
    { module:"المصروفات",        perms:["review","final","submit","none","none","approve"] },
    { module:"المشتريات",        perms:["review","final","none","approve","submit","approve"] },
    { module:"المخزون",          perms:["review","final","submit","none","none","approve"] },
    { module:"الشفتات",          perms:["view","final","submit","none","none","approve"] },
    { module:"كشف الحساب",       perms:["review","final","view","none","none","approve"] },
    { module:"العهد النقدية",    perms:["review","final","submit","none","none","approve"] },
    { module:"الأصول الثابتة",   perms:["review","final","submit","none","none","approve"] },
    { module:"تصدير ERP",        perms:["none","approve","none","none","none","approve"] },
    { module:"إدارة المستخدمين", perms:["none","none","none","none","none","approve"] },
    { module:"إدارة الاشتراكات", perms:["none","none","none","none","none","approve"] },
  ]);
  const [editMode,  setEditMode]  = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [changes,   setChanges]   = useState(0);

  const cyclePermission = (rowIdx:number, colIdx:number) => {
    if (!editMode) return;
    setMatrix(prev => {
      const next = prev.map((r,i) => i!==rowIdx ? r : {
        ...r,
        perms: r.perms.map((p,j) => {
          if (j!==colIdx) return p;
          const idx = PERM_CYCLE.indexOf(p);
          return PERM_CYCLE[(idx+1)%PERM_CYCLE.length];
        })
      });
      return next;
    });
    setChanges(c=>c+1);
    setSaved(false);
  };

  const saveChanges = () => { setSaved(true); setChanges(0); };
  const resetAll    = () => { setMatrix(prev=>prev); setSaved(false); setChanges(0); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">مصفوفة الصلاحيات</h2>
          <p className="text-gray-400 text-sm mt-0.5">صلاحيات الأدوار — {editMode?"وضع التعديل نشط · اضغط على أي خلية لتغيير الصلاحية":"للتعديل فعّل وضع التحرير"}</p>
        </div>
        <div className="flex items-center gap-2">
          {editMode && changes>0 && (
            <>
              <Badge className="bg-amber-50 text-amber-700 border border-amber-200">{changes} تعديل معلّق</Badge>
              <button onClick={saveChanges} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 size={12}/> حفظ التعديلات
              </button>
            </>
          )}
          {saved && <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">✓ تم الحفظ</Badge>}
          <button onClick={()=>{ setEditMode(!editMode); if(editMode) resetAll(); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${editMode?"bg-red-50 text-red-600 border border-red-200 hover:bg-red-100":"bg-purple-600 text-white hover:bg-purple-700"}`}>
            {editMode?<><X size={12}/> إلغاء التعديل</>:<><Edit2 size={12}/> تعديل الصلاحيات</>}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-gray-500 font-semibold">الصلاحيات:</span>
        {(Object.keys(permCls) as Permission[]).filter(p=>p!=="none").map(p=>(
          <span key={p} className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold ${permCls[p]}`}>{permLabel[p]}</span>
        ))}
        {editMode && <span className="text-[10px] px-2.5 py-1 rounded-full border bg-gray-50 text-gray-500 border-gray-200 font-semibold animate-pulse">اضغط على الخلايا للتعديل ←</span>}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        {editMode && (
          <div className="px-4 py-2.5 bg-purple-50 border-b border-purple-100 flex items-center gap-2">
            <Edit2 size={13} className="text-purple-600"/>
            <p className="text-xs text-purple-700 font-semibold">وضع التعديل نشط — اضغط على أي خلية لتدوير الصلاحية (—→عرض→إدخال→مراجعة→اعتماد→نهائي)</p>
          </div>
        )}
        <table className="w-full text-xs" dir="rtl">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-3 text-right font-semibold text-gray-500 bg-gray-50 w-44">الموديول</th>
              {roles.map(r=>(
                <th key={r} className="px-3 py-3 text-center bg-gray-50 min-w-[110px]">
                  <div className="flex flex-col items-center gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${roleBadgeCls[r]}`}>{r}</span>
                    <span className="text-[9px] text-gray-400 font-normal">{scopeRow[r]}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {matrix.map((row,i)=>(
              <tr key={i} className={`${i%2===0?"":"bg-gray-50/20"} ${editMode?"":"hover:bg-gray-50/50"}`}>
                <td className="px-4 py-2.5 font-semibold text-gray-700">{row.module}</td>
                {row.perms.map((p,j)=>(
                  <td key={j} className="px-3 py-2.5 text-center">
                    <button
                      onClick={()=>cyclePermission(i,j)}
                      disabled={!editMode}
                      className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full border text-[10px] font-semibold min-w-[56px] transition-all ${permCls[p]} ${editMode?"cursor-pointer hover:scale-110 hover:shadow-sm active:scale-95":"cursor-default"}`}>
                      {permLabel[p]}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-amber-700 text-xs">
          <span className="flex-shrink-0 mt-0.5">ℹ️</span>
          <p>اضغط على أي خلية لتدوير مستوى الصلاحية. تسري التغييرات فور حفظها. صلاحيات <strong>الأدمن</strong> لا يُنصح بتخفيضها.</p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-xs font-bold text-blue-700 mb-2">ملاحظة حول نطاق الوصول</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-blue-600">
          <p>• المحاسب: يرى فقط المطاعم والعلامات التجارية المخصصة له في إعدادات حسابه</p>
          <p>• رئيس الحسابات: يرى كل المحاسبين ضمن العلامات التجارية المخصصة له</p>
          <p>• مدير الفرع: يرى فقط فرعه المخصص ولا يتجاوزه</p>
          <p>• مدير المشتريات: يرى طلبات الشراء لجميع الفروع ضمن علاماته التجارية</p>
        </div>
      </div>
    </div>
  );
}

function AdminSettings({}: PageProps) {
  return (
    <div className="space-y-5"><h2 className="text-xl font-bold text-gray-800">إعدادات النظام</h2>
      <div className="grid grid-cols-2 gap-5">
        {[{title:"إعدادات الإشعارات",icon:"🔔",items:["إشعارات الاعتماد","تنبيهات الاشتراك","تقارير الأداء اليومية"]},{title:"إعدادات النسخ الاحتياطي",icon:"💾",items:["نسخ تلقائي يومي","نسخ أسبوعي","تشفير البيانات"]},{title:"إعدادات API",icon:"🔗",items:["اتصال ERP","اتصال بوابة الدفع","واجهة تطبيق الموبايل"]},{title:"إعدادات الأمان",icon:"🔐",items:["المصادقة الثنائية","مدة الجلسة","سياسة كلمة المرور"]}].map((s,i)=>(
          <Card key={i} title={`${s.icon} ${s.title}`}>
            <div className="p-4 space-y-3">
              {s.items.map((item,j)=>(
                <div key={j} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-700">{item}</span>
                  <div className="w-10 h-5 rounded-full bg-purple-600 cursor-pointer relative flex-shrink-0"><div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5"></div></div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// BRANCH MANAGER PAGES
// ════════════════════════════════════════════════════════════
function BranchOverview({ navigate }: PageProps) {
  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-bold text-gray-800">نظرة عامة — فرع الرياض العليا</h2><p className="text-gray-400 text-sm mt-0.5">الاثنين، 14 أكتوبر 2025</p></div>
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="مبيعات اليوم" value="18,340 ر.س" icon={<TrendingUp size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label="الطلبات" value="87" sub="هذا الشفت" icon={<ShoppingCart size={18} className="text-blue-600"/>} accent="blue"/>
        <KpiCard label="الموظفون" value="12" sub="نشطون الآن" icon={<Users size={18} className="text-purple-600"/>} accent="purple"/>
        <KpiCard label="التقارير المطلوبة" value="3" sub="تنتظر الرفع" icon={<AlertTriangle size={18} className="text-amber-600"/>} accent="amber"/>
      </div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2">
          <Card title="التقارير المطلوب رفعها اليوم">
            {[{name:"جرد المخزون اليومي",deadline:"قبل 11 م",urgent:true},{name:"تقرير المبيعات اليومي",deadline:"قبل 10 م",urgent:false},{name:"كشف حساب الصندوق",deadline:"بعد إغلاق الشفت",urgent:false}].map((t,i)=>(
              <div key={i} className={`px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 ${t.urgent?"bg-red-50/30":""}`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.urgent?"bg-red-500":"bg-gray-300"}`}></div>
                <div className="flex-1"><p className="font-semibold text-sm text-gray-800">{t.name}</p></div>
                <span className="text-xs text-gray-500">{t.deadline}</span>
                <Btn size="sm" variant="primary" onClick={()=>navigate("branch-upload")}><Upload size={12}/> رفع</Btn>
              </div>
            ))}
          </Card>
        </div>
        <Card title="الشفت الحالي">
          <div className="p-4 space-y-3">
            <div className="text-center py-2"><p className="text-3xl font-bold text-purple-700">08:00 — الآن</p><p className="text-gray-400 text-xs mt-1">مدة: 3:22 ساعة</p></div>
            <div className="bg-gray-50 rounded-xl p-3 space-y-2">
              {[{l:"المشرف",v:"خالد الشمري"},{l:"الطلبات",v:"87 طلب"},{l:"المبيعات",v:"12,500 ر.س"},{l:"الصندوق",v:"4,200 ر.س"}].map((r,i)=>(
                <div key={i} className="flex justify-between text-sm"><span className="text-gray-500">{r.l}</span><span className="font-semibold">{r.v}</span></div>
              ))}
            </div>
            <Btn variant="danger" className="w-full justify-center">إغلاق الشفت</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

function BranchEmployees({}: PageProps) {
  const emps = [{name:"خالد الشمري",role:"مشرف الشفت",salary:4500,shift:"صباحي",active:true},{name:"محمد العتيبي",role:"كاشير رئيسي",salary:3200,shift:"صباحي",active:true},{name:"سعد الدوسري",role:"كاشير",salary:2800,shift:"مسائي",active:false},{name:"أحمد الغامدي",role:"عامل مطبخ",salary:2500,shift:"صباحي",active:true}];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold text-gray-800">الموظفون</h2><Btn variant="primary" size="sm"><Plus size={13}/> إضافة موظف</Btn></div>
      <Card title="فرع الرياض العليا">
        <table className="w-full" dir="rtl">
          <thead className="bg-gray-50"><tr className="text-xs text-gray-500 font-semibold"><th className="px-4 py-3 text-right">الموظف</th><th className="px-4 py-3 text-right">الدور</th><th className="px-4 py-3 text-center">الراتب</th><th className="px-4 py-3 text-center">الشفت</th><th className="px-4 py-3 text-center">الحالة</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {emps.map((e,i)=>(
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-white font-bold text-xs">{e.name[0]}</div><span className="font-semibold text-sm text-gray-800">{e.name}</span></div></td>
                <td className="px-4 py-3 text-sm text-gray-600">{e.role}</td>
                <td className="px-4 py-3 text-center font-mono text-sm font-semibold">{e.salary.toLocaleString()} ر.س</td>
                <td className="px-4 py-3 text-center"><Badge className="bg-gray-50 text-gray-600">{e.shift}</Badge></td>
                <td className="px-4 py-3 text-center"><Badge className={e.active?"bg-emerald-50 text-emerald-700":"bg-gray-50 text-gray-500"}>{e.active?"نشط":"إجازة"}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function BranchItems({}: PageProps) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-800">الأصناف المحددة للجرد</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2">
        <Bell size={14} className="text-blue-600 flex-shrink-0"/>
        <p className="text-blue-700 text-xs">هذه القائمة تم تحديدها بواسطة المحاسب وتزامنت تلقائياً.</p>
      </div>
      <Card title="الأصناف — 10 أصناف">
        <div className="p-4 grid grid-cols-3 gap-2">
          {["دجاج طازج","حليب طازج","خس","طماطم","بطاطس","زيت قلي","كاتشب","ماء معدني","عصير برتقال","خبز برجر"].map((item,i)=>(
            <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-100 bg-gray-50">
              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
              <span className="text-sm text-gray-700">{item}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function BranchSuppliers({}: PageProps) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-800">الموردون</h2>
      <Card title="الموردون المعتمدون">
        {[{name:"شركة الدواجن الوطنية",cat:"دواجن ولحوم",contact:"محمد العلي",phone:"0501234567"},{name:"مطاحن الملك",cat:"دقيق ومخبوزات",contact:"سعد الدوسري",phone:"0507654321"},{name:"مزرعة الخير",cat:"خضار وفواكه",contact:"فهد الشمري",phone:"0509876543"}].map((s,i)=>(
          <div key={i} className="px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-bold">{s.name[0]}</div>
            <div className="flex-1"><p className="font-semibold text-sm text-gray-800">{s.name}</p><p className="text-xs text-gray-400">{s.cat} · {s.contact}</p></div>
            <span className="text-xs text-emerald-600 flex items-center gap-1"><Phone size={11}/> {s.phone}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function BranchUpload({}: PageProps) {
  const [uploads, setUploads] = useState<Record<string,boolean>>({});
  const reports = [{id:"sales",name:"تقرير المبيعات اليومي",desc:"POS + التطبيقات",required:true},{id:"inventory",name:"جرد المخزون اليومي",desc:"10 أصناف محددة",required:true},{id:"cash",name:"كشف حساب الصندوق",desc:"نقدي + مدفوعات",required:true},{id:"waste",name:"تقرير الهدر والتالف",desc:"الأصناف التالفة",required:false}];
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-800">رفع البيانات اليومية</h2>
      <div className="grid grid-cols-2 gap-4">
        {reports.map(rep=>(
          <div key={rep.id} className={`bg-white rounded-xl border shadow-sm p-4 ${uploads[rep.id]?"border-emerald-200 bg-emerald-50/30":"border-gray-100"}`}>
            <div className="flex items-start justify-between mb-3">
              <div><p className="font-semibold text-sm text-gray-800">{rep.name}</p><p className="text-xs text-gray-400 mt-0.5">{rep.desc}</p></div>
              {rep.required && <Badge className="bg-red-50 text-red-700">مطلوب</Badge>}
            </div>
            {uploads[rep.id]
              ? <div className="flex items-center gap-2 text-emerald-700 text-sm"><CheckCircle2 size={16}/><span className="font-medium">تم الرفع بنجاح</span></div>
              : <div onClick={()=>setUploads(p=>({...p,[rep.id]:true}))} className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/20 transition-all">
                  <Upload size={20} className="text-gray-300 mx-auto mb-1"/><p className="text-xs text-gray-400">اضغط لرفع الملف</p>
                </div>
            }
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// PROCUREMENT PAGES
// ════════════════════════════════════════════════════════════
function ProcOverview({ navigate }:PageProps) {
  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-bold text-gray-800">لوحة تحكم المشتريات</h2><p className="text-gray-400 text-sm mt-0.5">تجميع الطلبات والتنسيق مع الموردين</p></div>
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="طلبات جديدة" value="45" sub="من 40 فرع" icon={<ShoppingCart size={18} className="text-red-600"/>} accent="red"/>
        <KpiCard label="طلبات مجمعة" value="12" sub="جاهزة للإرسال" icon={<Package size={18} className="text-blue-600"/>} accent="blue"/>
        <KpiCard label="أُرسلت للموردين" value="8" sub="" icon={<Truck size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label="قيمة الطلبات" value="148K ر.س" sub="هذا الأسبوع" icon={<TrendingUp size={18} className="text-purple-600"/>} accent="purple"/>
      </div>
      <Card title="الطلبات الجديدة من الفروع" actions={<Btn size="sm" variant="primary" onClick={()=>navigate("proc-new")}><Package size={12}/> تجميع الطلبات</Btn>}>
        {[{branch:"فرع الرياض - العليا",items:4,total:4800,urgency:"عادي"},{branch:"فرع جدة - الحمراء",items:6,total:8200,urgency:"عاجل"},{branch:"فرع مكة - المعابدة",items:3,total:3100,urgency:"عادي"}].map((r,i)=>(
          <div key={i} className={`px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 ${r.urgency==="عاجل"?"border-r-4 border-r-red-400":""}`}>
            <div className="flex-1"><p className="font-semibold text-sm text-gray-800">{r.branch}</p><div className="flex items-center gap-2 mt-1"><span className="text-xs text-gray-400">{r.items} أصناف</span><Badge className={r.urgency==="عاجل"?"bg-red-50 text-red-700":"bg-gray-50 text-gray-600"}>{r.urgency}</Badge></div></div>
            <span className="font-mono font-bold text-gray-800">{fmtAmt(r.total)} ر.س</span>
            <div className="flex gap-1.5"><Btn size="sm"><Eye size={12}/> تفاصيل</Btn><Btn size="sm" variant="primary"><CheckCircle2 size={12}/> اعتماد</Btn></div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── Per-order consumption intelligence data for Procurement Manager
const PROC_ITEMS: Record<string, PurItem[]> = {
  "PO-101": [
    {name:"دجاج طازج",   ordered:50, received:0, unit:"كجم", price:32, histPrice:30, dailyAvg:7,  recommended:49},
    {name:"أجنحة دجاج",  ordered:30, received:0, unit:"كجم", price:38, histPrice:36, dailyAvg:4,  recommended:28},
    {name:"صدر دجاج",    ordered:20, received:0, unit:"كجم", price:45, histPrice:43, dailyAvg:3,  recommended:21},
    {name:"كبدة دجاج",   ordered:10, received:0, unit:"كجم", price:22, histPrice:20, dailyAvg:1,  recommended:7 },
  ],
  "PO-102": [
    {name:"حليب طازج",   ordered:100,received:0, unit:"لتر", price:8,  histPrice:8,  dailyAvg:15, recommended:105},
    {name:"جبن",          ordered:20, received:0, unit:"كجم", price:35, histPrice:33, dailyAvg:3,  recommended:21},
  ],
  "PO-103": [
    {name:"دقيق أبيض",   ordered:80, received:0, unit:"كجم", price:18, histPrice:18, dailyAvg:11, recommended:77},
    {name:"سكر ناعم",    ordered:40, received:0, unit:"كجم", price:14, histPrice:14, dailyAvg:6,  recommended:42},
    {name:"ملح",          ordered:15, received:0, unit:"كجم", price:5,  histPrice:5,  dailyAvg:2,  recommended:14},
  ],
  "PO-104": [
    {name:"دجاج طازج",   ordered:60, received:0, unit:"كجم", price:32, histPrice:30, dailyAvg:9,  recommended:63},
    {name:"أجنحة دجاج",  ordered:40, received:0, unit:"كجم", price:38, histPrice:36, dailyAvg:5,  recommended:35},
    {name:"صدر دجاج",    ordered:35, received:0, unit:"كجم", price:45, histPrice:43, dailyAvg:5,  recommended:35},
    {name:"كبدة دجاج",   ordered:15, received:0, unit:"كجم", price:22, histPrice:20, dailyAvg:2,  recommended:14},
    {name:"مرق دجاج",    ordered:20, received:0, unit:"لتر", price:12, histPrice:11, dailyAvg:3,  recommended:21},
    {name:"توابل مشوي",  ordered:5,  received:0, unit:"كجم", price:45, histPrice:40, dailyAvg:0,  recommended:3 },
  ],
  "PO-105": [
    {name:"خضار متنوعة", ordered:30, received:0, unit:"كجم", price:12, histPrice:11, dailyAvg:4,  recommended:28},
    {name:"طماطم طازجة", ordered:25, received:0, unit:"كجم", price:8,  histPrice:8,  dailyAvg:3,  recommended:21},
    {name:"خيار طازج",   ordered:15, received:0, unit:"كجم", price:9,  histPrice:9,  dailyAvg:2,  recommended:14},
    {name:"بصل",          ordered:20, received:0, unit:"كجم", price:6,  histPrice:6,  dailyAvg:3,  recommended:21},
  ],
  "PO-106": [
    {name:"دقيق أبيض",   ordered:100,received:0, unit:"كجم", price:18, histPrice:18, dailyAvg:14, recommended:98},
    {name:"سكر ناعم",    ordered:50, received:0, unit:"كجم", price:14, histPrice:14, dailyAvg:7,  recommended:49},
    {name:"خميرة",        ordered:10, received:0, unit:"كجم", price:28, histPrice:25, dailyAvg:1,  recommended:7 },
  ],
  "PO-107": [
    {name:"خضار متنوعة", ordered:35, received:0, unit:"كجم", price:12, histPrice:11, dailyAvg:5,  recommended:35},
    {name:"طماطم طازجة", ordered:30, received:0, unit:"كجم", price:8,  histPrice:8,  dailyAvg:4,  recommended:28},
    {name:"فلفل",         ordered:15, received:0, unit:"كجم", price:14, histPrice:13, dailyAvg:2,  recommended:14},
    {name:"بصل",          ordered:25, received:0, unit:"كجم", price:6,  histPrice:6,  dailyAvg:3,  recommended:21},
    {name:"ثوم",           ordered:5,  received:0, unit:"كجم", price:22, histPrice:20, dailyAvg:1,  recommended:7 },
  ],
};

function ProcNewOrders({}: PageProps) {
  const [orders, setOrders] = useState([
    { id:"PO-101", branch:"فرع الرياض - العليا", supplier:"شركة الدواجن الوطنية",  items:4, total:4800, urgency:"عادي", status:"pending" as const, time:"قبل 30 دقيقة" },
    { id:"PO-102", branch:"فرع الرياض - العليا", supplier:"شركة الدواجن الوطنية",  items:2, total:2200, urgency:"عادي", status:"pending" as const, time:"قبل ساعة" },
    { id:"PO-103", branch:"فرع الرياض - العليا", supplier:"مطاحن الملك",             items:3, total:1900, urgency:"عادي", status:"pending" as const, time:"قبل ساعتين" },
    { id:"PO-104", branch:"فرع جدة - الحمراء",   supplier:"شركة الدواجن الوطنية",  items:6, total:8200, urgency:"عاجل", status:"pending" as const, time:"قبل ساعة" },
    { id:"PO-105", branch:"فرع جدة - الحمراء",   supplier:"مزرعة الخير",            items:4, total:5400, urgency:"عاجل", status:"pending" as const, time:"قبل ساعتين" },
    { id:"PO-106", branch:"فرع مكة - المعابدة",  supplier:"مطاحن الملك",            items:3, total:3100, urgency:"عادي", status:"pending" as const, time:"قبل ساعتين" },
    { id:"PO-107", branch:"فرع الدمام",           supplier:"مزرعة الخير",            items:5, total:5600, urgency:"عاجل", status:"pending" as const, time:"قبل 3 ساعات" },
  ]);
  const [groupBy, setGroupBy] = useState<"branch"|"supplier">("branch");
  const [expandedId, setExpandedId] = useState<string|null>(null);

  const approveOne      = (id:string)     => setOrders(p=>p.map(o=>o.id===id?{...o,status:"approved" as const}:o));
  const approveByBranch = (branch:string) => setOrders(p=>p.map(o=>o.branch===branch&&o.status==="pending"?{...o,status:"approved" as const}:o));
  const approveBySupplier = (sup:string)  => setOrders(p=>p.map(o=>o.supplier===sup&&o.status==="pending"?{...o,status:"approved" as const}:o));
  const approveAll      = ()              => setOrders(p=>p.map(o=>({...o,status:"approved" as const})));

  const pending = orders.filter(o=>o.status==="pending");

  // Group orders
  const groupKeys = [...new Set(orders.map(o=>groupBy==="branch"?o.branch:o.supplier))];

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">الطلبات الجديدة</h2>
          <p className="text-gray-400 text-sm mt-0.5">راجع الاستهلاك قبل الاعتماد — اعتمد فردياً أو للفرع/المورد دفعةً واحدة</p>
        </div>
        {pending.length>0 && <Btn variant="primary" size="sm" onClick={approveAll}><Package size={12}/> اعتماد الكل ({pending.length})</Btn>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="طلبات جديدة معلقة" value={String(pending.length)} sub="من الفروع" icon={<ShoppingCart size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label="تم اعتمادها" value={String(orders.filter(o=>o.status==="approved").length)} sub="هذا الجلسة" icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label="الموردون المعنيون" value={String(new Set(pending.map(o=>o.supplier)).size)} sub="يحتاجون موافقة" icon={<Truck size={18} className="text-blue-600"/>} accent="blue"/>
      </div>

      {/* Consumption notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5">
        <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0"/>
        <p className="text-xs text-amber-800">
          <strong>تنبيه:</strong> قبل الاعتماد، اضغط على أي طلب لمراجعة بيانات الاستهلاك اليومي والكمية الموصى بها مقارنةً بما طلبه الفرع.
        </p>
      </div>

      {/* Group by toggle */}
      <div className="flex items-center gap-3" dir="rtl">
        <span className="text-xs font-semibold text-gray-500">تجميع حسب:</span>
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          {(["branch","supplier"] as const).map(g=>(
            <button key={g} onClick={()=>{ setGroupBy(g); setExpandedId(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${groupBy===g?"bg-white text-gray-800 shadow-sm":"text-gray-500 hover:text-gray-700"}`}>
              {g==="branch"?"الفرع":"المورد"}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 mr-auto flex items-center gap-1">
          <ChevronDown size={11}/> اضغط على الطلب لمراجعة بيانات الاستهلاك
        </span>
      </div>

      {/* Grouped orders */}
      <div className="space-y-3">
        {groupKeys.map(groupKey=>{
          const groupOrders = orders.filter(o=>(groupBy==="branch"?o.branch:o.supplier)===groupKey);
          const groupPending = groupOrders.filter(o=>o.status==="pending");
          const groupTotal   = groupOrders.reduce((s,o)=>s+o.total,0);
          return (
            <div key={groupKey} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Group header */}
              <div className="px-5 py-3 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-800 text-sm">{groupKey}</span>
                  <Badge className="bg-blue-50 text-blue-700 text-[10px]">{groupOrders.length} طلب</Badge>
                  {groupPending.length>0 && <Badge className="bg-amber-50 text-amber-700 text-[10px]">{groupPending.length} معلق</Badge>}
                  <span className="font-mono font-bold text-gray-600 text-sm">{fmtAmt(groupTotal)} ر.س</span>
                </div>
                {groupPending.length>1 && (
                  <Btn size="sm" variant="success"
                    onClick={()=>groupBy==="branch"?approveByBranch(groupKey):approveBySupplier(groupKey)}>
                    <CheckCircle2 size={11}/> اعتماد الكل ({groupPending.length} طلب)
                  </Btn>
                )}
              </div>
              {/* Orders in group */}
              {groupOrders.map((r)=>{
                const procItems = PROC_ITEMS[r.id] || [];
                const hasAnomalies = procItems.some(it=>Math.abs(it.ordered-it.recommended)>5||it.price-it.histPrice>2);
                return (
                <div key={r.id} className={`border-b border-gray-100 last:border-0 ${r.urgency==="عاجل"&&r.status==="pending"?"border-r-4 border-r-red-400":""}`}>
                  <div className={`px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 cursor-pointer ${expandedId===r.id?"bg-amber-50/20":""}`}
                    onClick={()=>setExpandedId(expandedId===r.id?null:r.id)}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-purple-600">{r.id}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-600">{groupBy==="branch"?r.supplier:r.branch}</span>
                      <Badge className={r.urgency==="عاجل"?"bg-red-50 text-red-700 text-[10px]":"bg-gray-50 text-gray-600 text-[10px]"}>{r.urgency}</Badge>
                      {hasAnomalies && r.status==="pending" && <Badge className="bg-orange-50 text-orange-700 border border-orange-200 text-[10px]">⚠ تحقق من الاستهلاك</Badge>}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">{r.items} أصناف · {r.time}</p>
                  </div>
                  <span className="font-mono font-bold text-gray-800 text-sm">{fmtAmt(r.total)} ر.س</span>
                  <div className="flex gap-1.5 flex-shrink-0" onClick={e=>e.stopPropagation()}>
                    {r.status==="pending"
                      ? <Btn size="sm" variant="success" onClick={()=>approveOne(r.id)}><CheckCircle2 size={12}/> اعتماد</Btn>
                      : <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">✓ معتمد</Badge>
                    }
                  </div>
                  {expandedId===r.id?<ChevronUp size={13} className="text-gray-400 flex-shrink-0"/>:<ChevronDown size={13} className="text-gray-400 flex-shrink-0"/>}
                  </div>
                  {/* Consumption intelligence expansion panel */}
                  {expandedId===r.id && procItems.length>0 && (
                    <div className="px-5 pb-5 bg-amber-50/10 space-y-3 border-t border-amber-100">
                      <div className="flex items-center gap-2 mt-3 mb-1">
                        <BarChart3 size={13} className="text-amber-600"/>
                        <p className="text-xs font-bold text-amber-900">بيانات الاستهلاك — راجع قبل الاعتماد</p>
                        <span className="text-[10px] text-amber-600 mr-auto">{r.branch} · {r.supplier}</span>
                      </div>
                      {/* Consumption table: مطلوب / استهلاك يومي / موصى به / سعر */}
                      <table className="w-full border border-amber-100 rounded-xl overflow-hidden text-xs" dir="rtl">
                        <thead className="bg-amber-50">
                          <tr>
                            <th className="px-3 py-2 text-right">الصنف</th>
                            <th className="px-3 py-2 text-center">الوحدة</th>
                            <th className="px-3 py-2 text-center font-bold text-gray-800">مطلوب</th>
                            <th className="px-3 py-2 text-center bg-amber-100/60 text-amber-700">استهلاك يومي</th>
                            <th className="px-3 py-2 text-center bg-amber-100/60 text-amber-700">موصى به (7 أيام)</th>
                            <th className="px-3 py-2 text-center bg-sky-50/80 text-sky-700">آخر سعر</th>
                            <th className="px-3 py-2 text-center">السعر الحالي</th>
                            <th className="px-3 py-2 text-center">التقييم</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-50 bg-white">
                          {procItems.map((it,pi)=>{
                            const qtyDiff   = it.ordered - it.recommended;
                            const priceDiff = it.price - it.histPrice;
                            const qtyStatus = Math.abs(qtyDiff)<=5?"ok":qtyDiff>5?"over":"under";
                            return (
                              <tr key={pi} className={qtyStatus==="over"?"bg-orange-50/40":qtyStatus==="under"?"bg-blue-50/30":""}>
                                <td className="px-3 py-2 font-semibold text-gray-800">{it.name}</td>
                                <td className="px-3 py-2 text-center text-gray-500">{it.unit}</td>
                                <td className="px-3 py-2 text-center font-mono font-bold text-gray-800">{it.ordered}</td>
                                <td className="px-3 py-2 text-center font-mono text-amber-700 bg-amber-50/30">{it.dailyAvg}</td>
                                <td className="px-3 py-2 text-center font-mono bg-amber-50/30">
                                  <span className={`font-bold ${qtyStatus==="over"?"text-orange-600":qtyStatus==="under"?"text-blue-600":"text-emerald-600"}`}>{it.recommended}</span>
                                </td>
                                <td className="px-3 py-2 text-center font-mono text-gray-500 bg-sky-50/20">{it.histPrice} ر.س</td>
                                <td className={`px-3 py-2 text-center font-mono font-semibold ${priceDiff>2?"text-red-600":"text-gray-800"}`}>
                                  {it.price} ر.س
                                  {priceDiff>2 && <div className="text-[9px] text-red-500">↑ ارتفع</div>}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {qtyStatus==="ok"
                                    ? <Badge className="bg-emerald-50 text-emerald-700 text-[10px]">✓ مناسب</Badge>
                                    : qtyStatus==="over"
                                      ? <Badge className="bg-orange-50 text-orange-700 border border-orange-200 text-[10px]">↑ أعلى بـ{qtyDiff}</Badge>
                                      : <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px]">↓ أقل بـ{Math.abs(qtyDiff)}</Badge>
                                  }
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {/* Summary alerts */}
                      {procItems.some(it=>it.ordered-it.recommended>5) && (
                        <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-2">
                          <AlertTriangle size={12} className="text-orange-600 flex-shrink-0"/>
                          <p className="text-[11px] text-orange-800">
                            <strong>تحذير:</strong> {procItems.filter(it=>it.ordered-it.recommended>5).map(it=>`${it.name} (مطلوب ${it.ordered} / موصى به ${it.recommended})`).join(" · ")}
                          </p>
                        </div>
                      )}
                      {procItems.some(it=>it.price-it.histPrice>2) && (
                        <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                          <AlertTriangle size={12} className="text-red-500 flex-shrink-0"/>
                          <p className="text-[11px] text-red-700">
                            <strong>سعر مرتفع:</strong> {procItems.filter(it=>it.price-it.histPrice>2).map(it=>`${it.name} (${it.price} بدلاً من ${it.histPrice} ر.س)`).join(" · ")}
                          </p>
                        </div>
                      )}
                      {r.status==="pending" && (
                        <div className="flex gap-2 pt-1">
                          <Btn size="sm" variant="success" onClick={()=>{ approveOne(r.id); setExpandedId(null); }}><CheckCircle2 size={12}/> اعتماد بعد المراجعة</Btn>
                          <Btn size="sm" variant="danger"><ThumbsDown size={12}/> رفض مع ملاحظة</Btn>
                          <Btn size="sm" onClick={()=>setExpandedId(null)}>إغلاق</Btn>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );})}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProcGrouped({}: PageProps) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-800">الطلبات المجمعة</h2>
      <Card title="مجمعة حسب المورد">
        {[{supplier:"شركة الدواجن الوطنية",branches:12,items:3,total:28400},{supplier:"مطاحن الملك",branches:8,items:2,total:14200},{supplier:"مزرعة الخير",branches:15,items:6,total:32100}].map((g,i)=>(
          <div key={i} className="px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
            <div className="flex-1"><p className="font-semibold text-sm text-gray-800">{g.supplier}</p><p className="text-xs text-gray-400 mt-1">{g.branches} فرع · {g.items} أصناف</p></div>
            <span className="font-mono font-bold text-gray-800">{fmtAmt(g.total)} ر.س</span>
            <div className="flex gap-1.5"><Btn size="sm"><Eye size={12}/> تفاصيل</Btn><Btn size="sm" variant="primary"><Truck size={12}/> إرسال للمورد</Btn></div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function ProcSent({}: PageProps) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-800">المرسلة للموردين</h2>
      <Card title="الطلبات المرسلة">
        {[{supplier:"شركة الدواجن الوطنية",sent:"قبل ساعة",status:"مؤكد",total:28400},{supplier:"مطاحن الملك",sent:"أمس",status:"قيد التحضير",total:14200},{supplier:"مزرعة الخير",sent:"قبل يومين",status:"في الطريق",total:32100}].map((o,i)=>(
          <div key={i} className="px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
            <div className="flex-1"><p className="font-semibold text-sm text-gray-800">{o.supplier}</p><p className="text-xs text-gray-400 mt-1">أُرسل {o.sent}</p></div>
            <Badge className={o.status==="مؤكد"?"bg-emerald-50 text-emerald-700":o.status==="في الطريق"?"bg-blue-50 text-blue-700":"bg-amber-50 text-amber-700"}>{o.status}</Badge>
            <span className="font-mono font-bold text-gray-800">{fmtAmt(o.total)} ر.س</span>
            <Btn size="sm"><Eye size={12}/> تتبع</Btn>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SUPPLIER PAGES
// ════════════════════════════════════════════════════════════
function SupOverview({ navigate }:PageProps) {
  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-bold text-gray-800">لوحة تحكم المورد</h2><p className="text-gray-400 text-sm mt-0.5">شركة الدواجن الوطنية</p></div>
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="طلبات جديدة" value="3" sub="تنتظر ردك" icon={<ShoppingCart size={18} className="text-red-600"/>} accent="red"/>
        <KpiCard label="طلبات مقبولة" value="12" sub="هذا الأسبوع" icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label="إجمالي المبيعات" value="285K ر.س" sub="هذا الشهر" icon={<TrendingUp size={18} className="text-purple-600"/>} accent="purple"/>
        <KpiCard label="العملاء النشطون" value="18" sub="مطعم" icon={<Users size={18} className="text-blue-600"/>} accent="blue"/>
      </div>
      <Card title="الطلبات الجديدة — 3" actions={<Badge className="bg-red-50 text-red-700">3 جديدة</Badge>}>
        {[{rest:"مطعم هرفي",items:"دجاج طازج — 200 كجم",deadline:"غداً 8 ص",total:4800},{rest:"ماكدونالدز السعودية",items:"دجاج مجمد — 500 كجم",deadline:"بعد غد",total:10500},{rest:"مطعم الريم",items:"قطع مشكلة — 150 كجم",deadline:"اليوم 6 م",total:3600}].map((o,i)=>(
          <div key={i} className="px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
            <div className="flex-1"><p className="font-semibold text-sm text-gray-800">{o.rest}</p><p className="text-xs text-gray-400 mt-1">{o.items} · التسليم: {o.deadline}</p></div>
            <span className="font-mono font-bold text-gray-800">{fmtAmt(o.total)} ر.س</span>
            <div className="flex gap-1.5">
              <Btn size="sm" variant="success"><CheckCircle2 size={12}/> قبول</Btn>
              <Btn size="sm" variant="danger"><XCircle size={12}/> رفض</Btn>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function SupNewOrders({}: PageProps) {
  const [orders, setOrders] = useState([
    { id:"ORD-5501", rest:"مطعم هرفي", items:[{name:"دجاج طازج",qty:200,unit:"كجم",price:24}], deadline:"غداً 8 ص", status:"pending" as const },
    { id:"ORD-5500", rest:"ماكدونالدز السعودية", items:[{name:"دجاج مجمد",qty:500,unit:"كجم",price:21}], deadline:"بعد غد", status:"pending" as const },
    { id:"ORD-5499", rest:"مطعم الريم", items:[{name:"قطع مشكلة",qty:150,unit:"كجم",price:24}], deadline:"اليوم 6 م", status:"pending" as const },
  ]);
  const accept = (id:string) => setOrders(p=>p.map(o=>o.id===id?{...o,status:"accepted" as const}:o));
  const reject = (id:string) => setOrders(p=>p.map(o=>o.id===id?{...o,status:"rejected" as const}:o));

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-800">الطلبات الجديدة</h2>
      <div className="space-y-4">
        {orders.map(order=>(
          <Card key={order.id} title={`${order.rest} · ${order.id}`} actions={
            order.status==="pending" ? (
              <div className="flex gap-2">
                <Btn size="sm" variant="success" onClick={()=>accept(order.id)}><CheckCircle2 size={12}/> قبول الطلب</Btn>
                <Btn size="sm" variant="danger" onClick={()=>reject(order.id)}><XCircle size={12}/> رفض</Btn>
              </div>
            ) : order.status==="accepted"
              ? <Badge className="bg-emerald-50 text-emerald-700">✓ تم القبول</Badge>
              : <Badge className="bg-red-50 text-red-700">✕ مرفوض</Badge>
          }>
            <div className="p-4">
              <table className="w-full text-sm" dir="rtl">
                <thead className="bg-gray-50"><tr className="text-xs text-gray-500"><th className="px-3 py-2 text-right">الصنف</th><th className="px-3 py-2 text-center">الكمية</th><th className="px-3 py-2 text-center">سعر الوحدة</th><th className="px-3 py-2 text-center">الإجمالي</th></tr></thead>
                <tbody>
                  {order.items.map((item,j)=>(
                    <tr key={j} className="border-t border-gray-100">
                      <td className="px-3 py-2.5 font-medium">{item.name}</td>
                      <td className="px-3 py-2.5 text-center">{item.qty} {item.unit}</td>
                      <td className="px-3 py-2.5 text-center font-mono">{item.price} ر.س</td>
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-purple-700">{fmtAmt(item.qty*item.price)} ر.س</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <span className="text-sm text-gray-500">موعد التسليم: <strong className="text-gray-800">{order.deadline}</strong></span>
                <span className="font-mono font-bold text-lg text-purple-700">{fmtAmt(order.items.reduce((s,i)=>s+i.qty*i.price,0))} ر.س</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// BRANCH SETTINGS PAGE
// ════════════════════════════════════════════════════════════
function BranchSettings({ navigate }:PageProps) {
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    branchName:"فرع الرياض - العليا", manager:"أحمد الشمري",
    phone:"0112456789", address:"الرياض — حي العليا، شارع العروبة",
    openTime:"08:00", closeTime:"23:00", shiftDuration:"8",
    taxNumber:"310012345600003", bankAccount:"SA1234567890123456789012",
    cashLimit:"5000", wasteThreshold:"3", autoReminders:true, requireImages:true
  });
  const save = () => { setSaved(true); setTimeout(()=>setSaved(false),2500); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">إعدادات الفرع</h2>
          <p className="text-gray-400 text-sm mt-0.5">{form.branchName}</p>
        </div>
        <Btn variant="success" onClick={save}><CheckCircle2 size={14}/> {saved?"✅ تم الحفظ":"حفظ الإعدادات"}</Btn>
      </div>
      <div className="grid grid-cols-2 gap-5">
        <Card title="📋 البيانات الأساسية">
          <div className="p-4 space-y-3">
            {[{label:"اسم الفرع",field:"branchName"},{label:"مدير الفرع",field:"manager"},{label:"رقم الهاتف",field:"phone"},{label:"العنوان",field:"address"}].map(({label,field})=>(
              <div key={field}>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">{label}</label>
                <input value={(form as any)[field]} onChange={e=>setForm(p=>({...p,[field]:e.target.value}))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300"/>
              </div>
            ))}
          </div>
        </Card>
        <Card title="⏰ أوقات العمل والشفتات">
          <div className="p-4 space-y-3">
            {[{label:"وقت الفتح",field:"openTime",type:"time"},{label:"وقت الإغلاق",field:"closeTime",type:"time"},{label:"مدة الشفت (ساعات)",field:"shiftDuration",type:"number"}].map(({label,field,type})=>(
              <div key={field}>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">{label}</label>
                <input type={type} value={(form as any)[field]} onChange={e=>setForm(p=>({...p,[field]:e.target.value}))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300"/>
              </div>
            ))}
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-blue-700 font-medium">⏱ ساعات العمل اليومية: <strong>{(parseInt(form.closeTime)-parseInt(form.openTime))} ساعة</strong> · {Math.floor((parseInt(form.closeTime)-parseInt(form.openTime))/parseInt(form.shiftDuration))} شفتات</p>
            </div>
          </div>
        </Card>
        <Card title="💳 البيانات المالية والضريبية">
          <div className="p-4 space-y-3">
            {[{label:"الرقم الضريبي",field:"taxNumber"},{label:"رقم الحساب البنكي (IBAN)",field:"bankAccount"},{label:"سقف العهدة النقدية (ر.س)",field:"cashLimit",type:"number"}].map(({label,field,type})=>(
              <div key={field}>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">{label}</label>
                <input type={type||"text"} value={(form as any)[field]} onChange={e=>setForm(p=>({...p,[field]:e.target.value}))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300 font-mono" dir="ltr"/>
              </div>
            ))}
          </div>
        </Card>
        <Card title="⚙️ خيارات التشغيل">
          <div className="p-4 space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">حد التنبيه للهدر (%)</label>
              <input type="number" value={form.wasteThreshold} onChange={e=>setForm(p=>({...p,wasteThreshold:e.target.value}))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300"/>
            </div>
            <div className="space-y-3">
              {[{label:"إرسال التذكيرات تلقائياً",field:"autoReminders",desc:"إرسال تذكير للمحاسب عند غياب تقرير الفرع"},
                {label:"إلزامية إرفاق الصور",field:"requireImages",desc:"يجب إرفاق صور مع كل عملية مشتريات أو هدر"}].map(({label,field,desc})=>(
                <div key={field} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="pt-0.5">
                    <button onClick={()=>setForm(p=>({...p,[field]:!(p as any)[field]}))}
                      className={`w-10 h-5 rounded-full transition-all ${(form as any)[field]?"bg-purple-500":"bg-gray-300"}`}>
                      <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${(form as any)[field]?"translate-x-5":""}`}/>
                    </button>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">{label}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// PROCUREMENT EXTRA PAGES
// ════════════════════════════════════════════════════════════
function ProcItems({}: PageProps) {
  const [search, setSearch] = useState("");
  const items = [
    {name:"دجاج طازج",unit:"كجم",category:"لحوم ودواجن",supplier:"شركة الدواجن الوطنية",avgPrice:24,lastOrder:"أمس",monthlyUsage:2400,stock:180},
    {name:"دجاج مجمد",unit:"كجم",category:"لحوم ودواجن",supplier:"شركة الدواجن الوطنية",avgPrice:21,lastOrder:"قبل 3 أيام",monthlyUsage:1800,stock:320},
    {name:"طحين قمح",unit:"كيس 50كجم",category:"مواد جافة",supplier:"مطاحن الملك",avgPrice:185,lastOrder:"الأسبوع الماضي",monthlyUsage:40,stock:12},
    {name:"زيت نباتي",unit:"جالون 20ل",category:"مواد جافة",supplier:"مطاحن الملك",avgPrice:95,lastOrder:"قبل 5 أيام",monthlyUsage:60,stock:8},
    {name:"طماطم طازجة",unit:"كرتون 10كجم",category:"خضروات وفواكه",supplier:"مزرعة الخير",avgPrice:45,lastOrder:"اليوم",monthlyUsage:300,stock:25},
    {name:"خس",unit:"كرتون",category:"خضروات وفواكه",supplier:"مزرعة الخير",avgPrice:38,lastOrder:"اليوم",monthlyUsage:120,stock:10},
  ];
  const filtered = items.filter(i=>!search||i.name.includes(search)||i.category.includes(search)||i.supplier.includes(search));
  const totalMonthly = filtered.reduce((s,i)=>s+i.avgPrice*i.monthlyUsage,0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">كتالوج الأصناف</h2><p className="text-gray-400 text-sm mt-0.5">{filtered.length} صنف · تكلفة شهرية إجمالية: {fmtAmt(totalMonthly)} ر.س</p></div>
        <div className="flex gap-2">
          <button onClick={()=>alert("جارٍ تصدير الكتالوج إلى Excel...")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><FileText size={11}/> Excel</button>
          <Btn variant="primary"><Plus size={13}/> إضافة صنف</Btn>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
          <Search size={13} className="text-gray-400 flex-shrink-0"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث بالصنف أو التصنيف أو المورد..." className="flex-1 text-sm outline-none"/>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm" dir="rtl">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-xs text-gray-500">
              <th className="px-4 py-3 text-right">الصنف</th>
              <th className="px-4 py-3 text-center">التصنيف</th>
              <th className="px-4 py-3 text-center">المورد</th>
              <th className="px-4 py-3 text-center">الوحدة</th>
              <th className="px-4 py-3 text-center">متوسط السعر</th>
              <th className="px-4 py-3 text-center">الاستهلاك الشهري</th>
              <th className="px-4 py-3 text-center">المخزون الحالي</th>
              <th className="px-4 py-3 text-center">آخر طلب</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item,i)=>(
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60 last:border-0">
                <td className="px-4 py-3 font-semibold text-gray-800">{item.name}</td>
                <td className="px-4 py-3 text-center"><Badge className="bg-purple-50 text-purple-700 text-[10px]">{item.category}</Badge></td>
                <td className="px-4 py-3 text-center text-gray-500 text-xs">{item.supplier}</td>
                <td className="px-4 py-3 text-center text-gray-600">{item.unit}</td>
                <td className="px-4 py-3 text-center font-mono font-bold text-gray-800">{item.avgPrice} ر.س</td>
                <td className="px-4 py-3 text-center font-mono">{item.monthlyUsage} {item.unit}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`font-bold font-mono ${item.stock<15?"text-red-600":item.stock<25?"text-amber-600":"text-emerald-600"}`}>{item.stock}</span>
                </td>
                <td className="px-4 py-3 text-center text-gray-400 text-xs">{item.lastOrder}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50/80 border-t border-gray-200">
            <tr>
              <td className="px-4 py-2.5 font-bold text-gray-700 text-xs" colSpan={4}>الإجمالي الشهري</td>
              <td colSpan={4} className="px-4 py-2.5 text-left font-mono font-black text-purple-700">{fmtAmt(totalMonthly)} ر.س</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function ProcSuppliers({}: PageProps) {
  const suppliers = [
    {name:"شركة الدواجن الوطنية",category:"لحوم ودواجن",contact:"0553421100",rating:4.8,orders:42,monthlyTotal:148000,onTime:96,status:"نشط"},
    {name:"مطاحن الملك",category:"مواد جافة",contact:"0112345678",rating:4.5,orders:28,monthlyTotal:62000,onTime:91,status:"نشط"},
    {name:"مزرعة الخير",category:"خضروات وفواكه",contact:"0564312200",rating:4.2,orders:35,monthlyTotal:38500,onTime:84,status:"نشط"},
    {name:"مستودعات البحر",category:"مأكولات بحرية",contact:"0126789000",rating:3.8,orders:15,monthlyTotal:22000,onTime:77,status:"موقوف مؤقتاً"},
  ];
  const totalMonthly = suppliers.reduce((s,sup)=>s+sup.monthlyTotal,0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">الموردون</h2><p className="text-gray-400 text-sm mt-0.5">{suppliers.length} مورد · إجمالي شهري: {fmtAmt(totalMonthly)} ر.س</p></div>
        <div className="flex gap-2">
          <button onClick={()=>alert("جارٍ تصدير قائمة الموردين...")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><FileText size={11}/> Excel</button>
          <Btn variant="primary"><Plus size={13}/> إضافة مورد</Btn>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {suppliers.map((sup,i)=>(
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{sup.name[0]}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-800 text-sm">{sup.name}</p>
                  <Badge className={sup.status==="نشط"?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-700"}>{sup.status}</Badge>
                </div>
                <p className="text-xs text-gray-400">{sup.category} · {sup.contact}</p>
              </div>
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map(s=><Star key={s} size={10} fill={s<=Math.round(sup.rating)?"#F59E0B":"none"} className={s<=Math.round(sup.rating)?"text-amber-400":"text-gray-200"}/>)}
                <span className="text-[10px] text-gray-500 mr-1">{sup.rating}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-[9px] text-gray-400">الطلبات</p>
                <p className="font-bold text-gray-800">{sup.orders}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-[9px] text-gray-400">الشهري</p>
                <p className="font-bold text-purple-700 font-mono text-xs">{(sup.monthlyTotal/1000).toFixed(0)}K</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-[9px] text-gray-400">الالتزام</p>
                <p className={`font-bold ${sup.onTime>=90?"text-emerald-600":sup.onTime>=80?"text-amber-600":"text-red-600"}`}>{sup.onTime}%</p>
              </div>
            </div>
            <div className="mt-2.5 flex gap-2">
              <Btn size="sm" variant="primary" className="flex-1"><ShoppingCart size={11}/> طلب جديد</Btn>
              <Btn size="sm" className="flex-1"><Eye size={11}/> السجل</Btn>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">إجمالي الإنفاق الشهري على الموردين</span>
        <span className="font-mono font-black text-xl text-purple-700">{fmtAmt(totalMonthly)} ر.س</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SUPPLIER EXTRA PAGES
// ════════════════════════════════════════════════════════════
function SupAccepted({}: PageProps) {
  const orders = [
    {id:"ORD-5498",rest:"مطعم هرفي",items:"دجاج طازج — 200 كجم",accepted:"اليوم 9:15 ص",deliveryDate:"غداً 8 ص",total:4800,status:"قيد التحضير"},
    {id:"ORD-5495",rest:"ماكدونالدز السعودية",items:"دجاج مجمد — 500 كجم",accepted:"أمس 2:30 م",deliveryDate:"اليوم 6 م",total:10500,status:"في الطريق"},
    {id:"ORD-5491",rest:"مطعم الريم",items:"قطع مشكلة — 150 كجم",accepted:"قبل يومين",deliveryDate:"اليوم 10 ص",total:3600,status:"تم التسليم"},
    {id:"ORD-5488",rest:"فرع النخيل",items:"دجاج طازج — 100 كجم",accepted:"قبل 3 أيام",deliveryDate:"تم",total:2400,status:"تم التسليم"},
  ];
  const totalRunning = orders.reduce((s,o)=>s+o.total,0);
  const statusStyle = (s:string)=> s==="تم التسليم"?"bg-emerald-50 text-emerald-700":s==="في الطريق"?"bg-blue-50 text-blue-700":"bg-amber-50 text-amber-700";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">الطلبات المقبولة</h2><p className="text-gray-400 text-sm mt-0.5">{orders.length} طلب · إجمالي: {fmtAmt(totalRunning)} ر.س</p></div>
        <button onClick={()=>alert("جارٍ تصدير الطلبات المقبولة...")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><FileText size={11}/> Excel</button>
      </div>
      <Card title="سجل الطلبات المقبولة">
        {orders.map((o,i)=>(
          <div key={i} className="px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0"><CheckCircle2 size={16} className="text-emerald-600"/></div>
            <div className="flex-1">
              <div className="flex items-center gap-2"><span className="font-semibold text-sm text-gray-800">{o.rest}</span><span className="font-mono text-xs text-gray-400">{o.id}</span></div>
              <p className="text-xs text-gray-400 mt-0.5">{o.items} · قُبل: {o.accepted}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400">التسليم</p>
              <p className="text-xs font-semibold text-gray-700">{o.deliveryDate}</p>
            </div>
            <Badge className={statusStyle(o.status)}>{o.status}</Badge>
            <span className="font-mono font-bold text-gray-800">{fmtAmt(o.total)} ر.س</span>
          </div>
        ))}
        <div className="px-5 py-3 bg-gray-50/80 border-t border-gray-100 flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-600">الإجمالي</span>
          <span className="font-mono font-black text-purple-700 text-lg">{fmtAmt(totalRunning)} ر.س</span>
        </div>
      </Card>
    </div>
  );
}

function SupRejected({}: PageProps) {
  const [reason, setReason] = useState<string|null>(null);
  const orders = [
    {id:"ORD-5490",rest:"مطعم الكوخ",items:"دجاج طازج — 300 كجم",rejected:"أمس",total:7200,reason:"الكمية تتجاوز طاقتنا الإنتاجية اليومية"},
    {id:"ORD-5486",rest:"فرع الشرقية",items:"قطع مشكلة — 400 كجم",rejected:"قبل يومين",total:9600,reason:"موعد التسليم المطلوب (نفس اليوم) غير ممكن"},
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">الطلبات المرفوضة</h2><p className="text-gray-400 text-sm mt-0.5">{orders.length} طلب مرفوض</p></div>
      </div>
      <Card title="سجل الرفض">
        {orders.map((o,i)=>(
          <div key={i} className="px-5 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0"><XCircle size={16} className="text-red-500"/></div>
              <div className="flex-1">
                <div className="flex items-center gap-2"><span className="font-semibold text-sm text-gray-800">{o.rest}</span><span className="font-mono text-xs text-gray-400">{o.id}</span></div>
                <p className="text-xs text-gray-400 mt-0.5">{o.items} · رُفض: {o.rejected}</p>
              </div>
              <Badge className="bg-red-50 text-red-700">مرفوض</Badge>
              <span className="font-mono font-bold text-gray-800">{fmtAmt(o.total)} ر.س</span>
              <button onClick={()=>setReason(reason===o.id?null:o.id)} className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-1"><Eye size={11}/> السبب</button>
            </div>
            {reason===o.id && (
              <div className="mt-2 mr-12 p-2.5 bg-red-50 rounded-lg border border-red-100">
                <p className="text-xs text-red-700 font-medium">سبب الرفض: <span className="font-bold">{o.reason}</span></p>
              </div>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}

function SupItems({}: PageProps) {
  const items = [
    {name:"دجاج طازج",unit:"كجم",minQty:50,maxQty:1000,price:24,available:true,leadTime:"24 ساعة"},
    {name:"دجاج مجمد",unit:"كجم",minQty:100,maxQty:5000,price:21,available:true,leadTime:"48 ساعة"},
    {name:"قطع مشكلة",unit:"كجم",minQty:50,maxQty:800,price:24,available:true,leadTime:"24 ساعة"},
    {name:"دجاج كامل",unit:"كجم",minQty:30,maxQty:500,price:22,available:false,leadTime:"48 ساعة"},
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">قائمة الأصناف</h2><p className="text-gray-400 text-sm mt-0.5">المنتجات التي يوفرها المورد</p></div>
        <Btn variant="primary"><Plus size={13}/> إضافة صنف</Btn>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm" dir="rtl">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-xs text-gray-500">
              <th className="px-4 py-3 text-right">الصنف</th>
              <th className="px-4 py-3 text-center">الوحدة</th>
              <th className="px-4 py-3 text-center">الحد الأدنى</th>
              <th className="px-4 py-3 text-center">الحد الأقصى</th>
              <th className="px-4 py-3 text-center">السعر (ر.س)</th>
              <th className="px-4 py-3 text-center">مدة التحضير</th>
              <th className="px-4 py-3 text-center">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item,i)=>(
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60 last:border-0">
                <td className="px-4 py-3 font-semibold text-gray-800">{item.name}</td>
                <td className="px-4 py-3 text-center text-gray-600">{item.unit}</td>
                <td className="px-4 py-3 text-center font-mono">{item.minQty}</td>
                <td className="px-4 py-3 text-center font-mono">{item.maxQty}</td>
                <td className="px-4 py-3 text-center font-mono font-bold text-purple-700">{item.price}</td>
                <td className="px-4 py-3 text-center text-gray-500 text-xs">{item.leadTime}</td>
                <td className="px-4 py-3 text-center">
                  <Badge className={item.available?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-700"}>{item.available?"متاح":"غير متاح"}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SupReports({}: PageProps) {
  const months = ["أكتوبر","سبتمبر","أغسطس","يوليو"];
  const [month, setMonth] = useState("أكتوبر");
  const stats = {accepted:12,rejected:2,totalRevenue:285000,avgOrderValue:21923,topClient:"ماكدونالدز السعودية",onTime:94};

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">التقارير</h2><p className="text-gray-400 text-sm mt-0.5">تقارير أداء المورد الشهرية</p></div>
        <div className="flex gap-2">
          <select value={month} onChange={e=>setMonth(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2">
            {months.map(m=><option key={m}>{m}</option>)}
          </select>
          <button onClick={()=>alert("جارٍ تصدير التقرير...")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><FileText size={11}/> Excel</button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="إجمالي الإيرادات" value={`${(stats.totalRevenue/1000).toFixed(0)}K ر.س`} sub={month} icon={<TrendingUp size={18} className="text-purple-600"/>} accent="purple"/>
        <KpiCard label="الطلبات المقبولة" value={String(stats.accepted)} sub="هذا الشهر" icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label="نسبة الالتزام بالتسليم" value={`${stats.onTime}%`} sub="في الوقت المحدد" icon={<Truck size={18} className="text-blue-600"/>} accent="blue"/>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card title={`ملخص ${month}`}>
          <div className="p-4 space-y-3">
            {[
              {label:"طلبات مقبولة",value:stats.accepted,cls:"text-emerald-600"},
              {label:"طلبات مرفوضة",value:stats.rejected,cls:"text-red-600"},
              {label:"متوسط قيمة الطلب",value:`${fmtAmt(stats.avgOrderValue)} ر.س`,cls:"text-purple-700"},
              {label:"أكبر عميل",value:stats.topClient,cls:"text-blue-600"},
            ].map(({label,value,cls})=>(
              <div key={label} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-600">{label}</span>
                <span className={`text-sm font-bold ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="توزيع الإيرادات حسب العميل">
          <div className="p-4 space-y-2.5">
            {[
              {client:"ماكدونالدز السعودية",pct:37,amt:104600},
              {client:"مطعم هرفي",pct:22,amt:62700},
              {client:"مطعم الريم",pct:18,amt:51300},
              {client:"فرع النخيل",pct:14,amt:39900},
              {client:"آخرون",pct:9,amt:26500},
            ].map((c,i)=>(
              <div key={i}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-gray-600">{c.client}</span>
                  <span className="font-bold text-gray-800">{fmtAmt(c.amt)} ر.س</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-cyan-400" style={{width:`${c.pct}%`}}/>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN EXPORT
// ════════════════════════════════════════════════════════════
export function ASABPrototype() {
  const [appState, setAppState] = useState<AppState>({ role:null, page:"", detailId:null, modal:null });
  const [ops, setOps] = useState<Op[]>(INITIAL_OPS);

  const login = (role:RoleId) => setAppState({ role, page:ROLE_PROFILES[role].defaultPage, detailId:null, modal:null });
  const logout = () => setAppState({ role:null, page:"", detailId:null, modal:null });
  const navigate = (page:PageId) => setAppState(s=>({...s, page, modal:null}));
  const setModal = (modal:string|null) => setAppState(s=>({...s, modal}));
  const setDetailId = (detailId:string|null) => setAppState(s=>({...s, detailId}));

  // ─── FINANCIAL STATE MACHINE ─────────────────────────────
  // pending  → approved           (accountant, records actor + time)
  // approved → final-approved     (head accountant, records actor + time)
  // final-approved = IMMUTABLE    (state guard: no further transitions)
  // rejected = IMMUTABLE          (correction requires a NEW linked operation)
  // ERP-posted is a SEPARATE dimension (erpPosted flag, not a status)
  // ─────────────────────────────────────────────────────────
  const now = () => new Date().toLocaleTimeString("ar-SA", { hour:"2-digit", minute:"2-digit" });

  const approveOp = (id:string) => setOps(p=>p.map(o=>
    o.id===id && o.status==="pending"
      ? { ...o, status:"approved" as OpStatus,
          approvedBy: appState.role==="head" ? "رئيس الحسابات" : "المحاسب المختص",
          approvedAt: now() }
      : o
  ));
  const rejectOp = (id:string, reason:string) => setOps(p=>p.map(o=>
    o.id===id && (o.status==="pending" || o.status==="approved")
      ? { ...o, status:"rejected" as OpStatus, rejectReason:reason,
          rejectedBy: appState.role==="head" ? "رئيس الحسابات" : "المحاسب المختص",
          rejectedAt: now() }
      : o
  ));
  const finalApproveOp = (id:string) => setOps(p=>p.map(o=>
    o.id===id && o.status==="approved"
      ? { ...o, status:"final-approved" as OpStatus,
          finalApprovedBy: "رئيس الحسابات",
          finalApprovedAt: now() }
      : o
  ));
  const bulkApprove = (ids:string[]) => {
    const set = new Set(ids);
    const t = now();
    setOps(p=>p.map(o=>{
      if(!set.has(o.id)) return o;
      if(o.status==="pending")  return {...o, status:"approved" as OpStatus, approvedBy:"المحاسب المختص", approvedAt:t};
      if(o.status==="approved") return {...o, status:"final-approved" as OpStatus, finalApprovedBy:"رئيس الحسابات", finalApprovedAt:t};
      return o; // final-approved and rejected are immutable — skip silently
    }));
  };

  // Corrective operation: creates a new linked pending op referencing the original
  const addCorrectiveOp = (refId:string) => {
    const original = ops.find(o=>o.id===refId);
    if(!original) return;
    const newId = `COR-${refId.replace("OPS-","").replace("COR-","")}`;
    const corrective: Op = {
      ...original,
      id: newId,
      status: "pending",
      isCorrection: true,
      correctiveRef: refId,
      timeAgo: "للتو",
      submittedBy: "تعديل بواسطة رئيس الحسابات",
      approvedBy: undefined, approvedAt: undefined,
      finalApprovedBy: undefined, finalApprovedAt: undefined,
      rejectedBy: undefined, rejectedAt: undefined,
      erpPosted: undefined, erpBatchId: undefined, erpPostedAt: undefined,
      rejectReason: undefined,
    };
    setOps(p=>[corrective, ...p]);
  };

  // ERP posting: marks ops as posted with batch ID — separate from final-approval
  const markErpPosted = (ids:string[], batchId:string) => {
    const set = new Set(ids);
    const postedAt = now();
    setOps(p=>p.map(o=>
      set.has(o.id) && o.status==="final-approved" && !o.erpPosted
        ? { ...o, erpPosted:true, erpBatchId:batchId, erpPostedAt:postedAt }
        : o
    ));
  };

  if(!appState.role) return <LoginScreen onLogin={login}/>;

  return (
    <AssetDraftProvider>
      <AppShell
        state={appState} ops={ops}
        approveOp={approveOp} rejectOp={rejectOp} finalApproveOp={finalApproveOp} bulkApprove={bulkApprove}
        addCorrectiveOp={addCorrectiveOp} markErpPosted={markErpPosted}
        navigate={navigate} logout={logout} setModal={setModal} setDetailId={setDetailId}
      />
    </AssetDraftProvider>
  );
}

export default ASABPrototype;
