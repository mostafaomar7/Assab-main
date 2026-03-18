import "./_group.css";
import { useState, useMemo, ReactNode } from "react";
import {
  LayoutDashboard, TrendingUp, Wallet, ShoppingCart, Package, Building2, Clock,
  Users, ArrowLeftRight, BarChart3, Settings, Bell, LogOut, ChevronRight,
  ChevronDown, ChevronUp, CheckCircle2, XCircle, MessageSquare, Eye, Download,
  AlertTriangle, Paperclip, ThumbsUp, ThumbsDown, RefreshCw, Star,
  Upload, ChevronsRight, Phone, Search, Plus, Trash2, Edit2, Edit3, X, FileText,
  Truck, Home, Shield, RotateCcw, Lock, Send, Tag, Smartphone, CheckSquare,
  ZapOff, ChevronLeft, Clipboard
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
    { id:"head-shifts",    label:"الشفتات",                icon:<Clock size={16}/> },
    { id:"head-employees", label:"كشف حساب الموظفين",     icon:<Users size={16}/> },
    { id:"head-cash",      label:"العهد النقدية",          icon:<ArrowLeftRight size={16}/> },
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
                {badge ? <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${(entry as NavItem).badgeColor==="yellow"?"bg-amber-500 text-white":"bg-red-500 text-white"}`}>{badge}</span> : null}
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
    const mk = page.replace("head-","") as ModuleKey;
    return <HeadModulePage moduleKey={mk} {...p}/>;
  }
  if(role==="admin") {
    if(page==="admin-overview")      return <AdminOverview {...p}/>;
    if(page==="admin-users")         return <AdminUsers {...p} users={adminUsers} setUsers={setAdminUsers}/>;
    if(page==="admin-restaurants")   return <AdminRestaurants {...p}/>;
    if(page==="admin-subscriptions") return <AdminSubscriptions {...p}/>;
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
  }
  if(role==="procurement") {
    if(page==="proc-overview") return <ProcOverview {...p}/>;
    if(page==="proc-new")      return <ProcNewOrders {...p}/>;
    if(page==="proc-grouped")  return <ProcGrouped {...p}/>;
    if(page==="proc-sent")     return <ProcSent {...p}/>;
    if(page==="proc-reports")  return <ReportsPage {...p}/>;
    return <SimplePage title={page} icon="🛒" desc=""/>;
  }
  if(role==="supplier") {
    if(page==="sup-overview") return <SupOverview {...p}/>;
    if(page==="sup-new")      return <SupNewOrders {...p}/>;
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
                        <p key={i} className="text-[10px] text-gray-400 py-0.5">{o.id} · {o.branch} · {o.rejectionReason||"—"}</p>
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
  const [showRecon,    setShowRecon]    = useState(false);
  const [editRecon,    setEditRecon]    = useState(false);
  const [reconVarOpen, setReconVarOpen] = useState(false);

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

  // Reconciliation rows — POS / Bank / Delivery
  const [reconRows, setReconRows] = useState([
    { label:"إيرادات POS (نقدي + بنكي)", val:18400, editable:true },
    { label:"إيداعات بنكية موثّقة",        val:17200, editable:true },
    { label:"مبيعات تطبيقات التوصيل",     val:6800,  editable:true },
  ]);
  const posVal   = reconRows[0].val;
  const bankVal  = reconRows[1].val;
  const delivVal = reconRows[2].val;
  const totalSales = posVal + delivVal;
  const bankDiff   = posVal - bankVal; // variance between POS cash and bank deposits

  // Variance assignment employees
  const [varEmployees, setVarEmployees] = useState<{empId:string; empName:string; amount:string}[]>([{empId:"",empName:"",amount:""}]);
  const addVarEmp = () => setVarEmployees(p=>[...p, {empId:"",empName:"",amount:""}]);
  const removeVarEmp = (i:number) => setVarEmployees(p=>p.filter((_,idx)=>idx!==i));
  const MOCK_EMPLOYEES: Record<string,string> = {
    "1001":"أحمد العمري","1002":"سارة الزهراني","1003":"فهد القحطاني","1004":"نورة المطيري","1005":"خالد السالم"
  };

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

      {/* Reconciliation table — POS / Bank / Delivery */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">جدول التسوية — POS / بنك / تطبيقات التوصيل</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">قارن الإيرادات عبر القنوات وعيِّن أي فروق على الموظفين</p>
          </div>
          <div className="flex gap-2">
            <Btn size="sm" onClick={()=>setShowRecon(!showRecon)}>
              {showRecon?<ChevronUp size={12}/>:<ChevronDown size={12}/>} {showRecon?"إخفاء":"عرض"}
            </Btn>
            {showRecon && <button onClick={()=>setEditRecon(!editRecon)} className="text-xs text-purple-600 hover:underline flex items-center gap-1"><Edit3 size={10}/> {editRecon?"حفظ التعديلات":"تعديل الأرقام"}</button>}
          </div>
        </div>
        {showRecon && (
          <div className="p-5 space-y-4">
            <table className="w-full text-sm border border-gray-100 rounded-xl overflow-hidden" dir="rtl">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-right font-semibold text-gray-600">البند</th>
                  <th className="px-4 py-2.5 text-center font-semibold text-gray-600">المبلغ (ر.س)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {reconRows.map((row,ri)=>(
                  <tr key={ri} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{row.label}</td>
                    <td className="px-4 py-3 text-center">
                      {editRecon
                        ? <input defaultValue={String(row.val)} onChange={e=>setReconRows(p=>p.map((r,i)=>i===ri?{...r,val:Number(e.target.value)||r.val}:r))}
                            className="w-28 text-center border border-purple-200 rounded px-2 py-1 font-mono text-sm"/>
                        : <span className="font-mono font-bold text-gray-800">{fmtAmt(row.val)} ر.س</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td className="px-4 py-3 font-bold text-gray-900">إجمالي المبيعات (POS + توصيل)</td>
                  <td className="px-4 py-3 text-center font-black font-mono text-purple-800">{fmtAmt(totalSales)} ر.س</td>
                </tr>
                <tr className={bankDiff!==0?"bg-red-50":""}>
                  <td className="px-4 py-3 font-bold text-gray-700">الفرق (POS − إيداعات بنكية)</td>
                  <td className={`px-4 py-3 text-center font-black font-mono ${bankDiff>0?"text-red-600":bankDiff<0?"text-amber-600":"text-emerald-600"}`}>
                    {bankDiff>0?"+":""}{fmtAmt(Math.abs(bankDiff))} ر.س
                    {bankDiff===0 && " ✓"}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Variance assignment section */}
            {bankDiff!==0 && (
              <div className="border border-red-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-red-50 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-red-800">توزيع الفرق على الموظفين</p>
                    <p className="text-xs text-red-600 mt-0.5">الفرق: {fmtAmt(Math.abs(bankDiff))} ر.س — وزِّعه على موظف أو أكثر</p>
                  </div>
                  <button onClick={()=>setReconVarOpen(!reconVarOpen)} className="text-xs text-red-600 hover:underline flex items-center gap-1">
                    {reconVarOpen?<ChevronUp size={11}/>:<ChevronDown size={11}/>} {reconVarOpen?"إخفاء":"تعيين"}
                  </button>
                </div>
                {reconVarOpen && (
                  <div className="p-4 bg-white space-y-2">
                    {varEmployees.map((emp,ei)=>(
                      <div key={ei} className="flex items-center gap-2">
                        <input value={emp.empId} onChange={e=>{
                          const id=e.target.value;
                          const name=MOCK_EMPLOYEES[id]||"";
                          setVarEmployees(p=>p.map((v,i)=>i===ei?{...v,empId:id,empName:name}:v));
                        }} placeholder="رقم الموظف" className="w-28 text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-center font-mono" dir="ltr"/>
                        <span className={`flex-1 text-sm py-1.5 px-3 rounded-lg border ${emp.empName?"bg-purple-50 text-purple-800 border-purple-200 font-semibold":"bg-gray-50 text-gray-400 border-gray-200"}`}>
                          {emp.empName||"الاسم يظهر تلقائياً"}
                        </span>
                        <input value={emp.amount} onChange={e=>setVarEmployees(p=>p.map((v,i)=>i===ei?{...v,amount:e.target.value}:v))}
                          placeholder="المبلغ المُعيَّن" className="w-32 text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-center font-mono"/>
                        <span className="text-xs text-gray-500">ر.س</span>
                        {varEmployees.length>1 && <button onClick={()=>removeVarEmp(ei)} className="text-gray-400 hover:text-red-500"><X size={14}/></button>}
                      </div>
                    ))}
                    <div className="flex items-center gap-2 pt-1">
                      <button onClick={addVarEmp} className="text-xs text-purple-600 hover:underline flex items-center gap-1"><Plus size={11}/> إضافة موظف آخر</button>
                      <div className="ml-auto flex gap-2">
                        <Btn size="sm" variant="danger"><CheckCircle2 size={11}/> تحميل الفرق</Btn>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dedicated Expenses page ──────────────────────────────────────────────────
function AccExpensesPage({ navigate, setModal, setDetailId, ops, approveOp, rejectOp, bulkApprove }:PageProps) {
  const [filters,          setFilters]          = useState<Filters>({branch:"",status:"",match:"",search:""});
  const [expandedId,       setExpandedId]       = useState<string|null>(null);
  const [editingRow,       setEditingRow]       = useState<string|null>(null);
  const [brand,            setBrand]            = useState("");
  const [selectedDay,      setSelectedDay]      = useState("الكل");
  const [verifiedInvoices, setVerifiedInvoices] = useState<Record<string,boolean>>({});
  const [attachModal,      setAttachModal]      = useState<{opId:string; invNum:string; idx:number; total:number}|null>(null);

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
          <span className="text-xs text-gray-400">{filtered.length} بيان — اضغط أي صف لعرض الفواتير التفصيلية</span>
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
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {invoices.map((inv,k)=>{
                            const vKey = `${op.id}-${inv.invNum}`;
                            const isInvVerified = verifiedInvoices[vKey]||false;
                            const amtBeforeVat = Math.round(inv.amount / 1.15);
                            const vatAmt       = inv.amount - amtBeforeVat;
                            return (
                              <tr key={k} className={`hover:bg-gray-50 ${isInvVerified?"bg-emerald-50/40":""}`}>
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
    </div>
  );
}

function AccSalesDetail({ navigate, setModal, setDetailId, detailId, ops, approveOp, addCorrectiveOp }:PageProps) {
  const op = ops.find(o=>o.id===detailId) || ops[0];
  const [verified, setVerified] = useState<Record<string,boolean>>({});
  const toggleVerify = (name:string) => setVerified(p=>({...p,[name]:!p[name]}));

  const channels = [
    { name:"نقدي",                  icon:"💵", entered:4200,  expected:4200, source:"إيصالات الصندوق" },
    { name:"بنكي (بنك الرياض)",     icon:"🏦", entered:8500,  expected:8500, source:"كشف الحساب البنكي" },
    { name:"هنقرستيشن",             icon:"🟠", entered:2800,  expected:2800, source:"تقرير المنصة" },
    { name:"جاهز",                  icon:"🟡", entered:1200,  expected:1350, source:"تقرير المنصة" },
    { name:"تو يو (ToYou)",          icon:"🔵", entered:980,   expected:980,  source:"تقرير المنصة" },
    { name:"نينجا (Ninja)",          icon:"⚫", entered:660,   expected:660,  source:"تقرير المنصة" },
  ];
  const totalEntered = channels.reduce((s,c)=>s+c.entered,0);
  const totalExpected = channels.reduce((s,c)=>s+c.expected,0);
  const totalDiff = totalEntered-totalExpected;

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
              <p className="font-bold text-purple-700 text-2xl font-mono mt-0.5">{fmtAmt(totalEntered)}<span className="text-sm mr-1">ر.س</span></p>
              {totalDiff!==0 && <p className="text-red-500 text-xs mt-0.5 font-medium">⚠ فرق: {Math.abs(totalDiff)} ر.س</p>}</>
            )}
          </div>
        </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          <Card title="جدول المقارنة والتسوية" actions={
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">6 قنوات تحصيل</span>
              {Object.values(verified).filter(Boolean).length > 0 && (
                <Badge className="bg-emerald-50 text-emerald-700 text-[10px]">
                  <CheckSquare size={10} className="ml-1"/> {Object.values(verified).filter(Boolean).length} موثّق
                </Badge>
              )}
            </div>
          }>
            <table className="w-full" dir="rtl">
              <thead className="bg-gray-50">
                <tr className="text-xs text-gray-500 font-semibold">
                  <th className="px-4 py-3 text-right">قناة التحصيل</th>
                  <th className="px-4 py-3 text-center">المُدخل</th>
                  <th className="px-4 py-3 text-center">المتوقع</th>
                  <th className="px-4 py-3 text-center">الفرق</th>
                  <th className="px-4 py-3 text-center">الحالة</th>
                  <th className="px-4 py-3 text-center">توثيق المحاسب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {channels.map(ch=>{
                  const diff=ch.entered-ch.expected;
                  const isVerified = verified[ch.name] || false;
                  return (
                    <tr key={ch.name} className={`hover:bg-gray-50 ${diff!==0?"bg-red-50/50":""} ${isVerified?"bg-emerald-50/30":""}`}>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-gray-800">{ch.icon} {ch.name}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{ch.source}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-semibold text-gray-800 text-sm">{ch.entered.toLocaleString()} ر.س</td>
                      <td className="px-4 py-3 text-center font-mono text-gray-600 text-sm">{ch.expected.toLocaleString()} ر.س</td>
                      <td className="px-4 py-3 text-center">{diff===0?<span className="text-emerald-600 font-mono text-sm">—</span>:<span className="text-red-600 font-bold font-mono text-sm">{diff} ر.س</span>}</td>
                      <td className="px-4 py-3 text-center">{diff===0?<Badge className="bg-emerald-50 text-emerald-700">✓ متطابق</Badge>:<Badge className="bg-red-50 text-red-700">⚠ فرق</Badge>}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={()=>toggleVerify(ch.name)}
                          title={isVerified?"تم التوثيق — اضغط للإلغاء":"اضغط لتوثيق هذه القناة"}
                          className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-all ${
                            isVerified
                              ? "bg-emerald-500 text-white shadow-sm shadow-emerald-200"
                              : "border-2 border-dashed border-gray-300 text-gray-300 hover:border-emerald-400 hover:text-emerald-400"
                          }`}>
                          <CheckSquare size={14}/>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr className="font-bold">
                  <td className="px-4 py-3 text-gray-700">المجموع</td>
                  <td className="px-4 py-3 text-center font-mono text-purple-700">{fmtAmt(totalEntered)} ر.س</td>
                  <td className="px-4 py-3 text-center font-mono text-gray-600">{fmtAmt(totalExpected)} ر.س</td>
                  <td className="px-4 py-3 text-center font-mono text-red-600">{totalDiff!==0?`${totalDiff} ر.س`:"—"}</td>
                  <td className="px-4 py-3 text-center">{totalDiff===0?<Badge className="bg-emerald-50 text-emerald-700">✓ مطابق</Badge>:<Badge className="bg-red-50 text-red-700">⚠ فرق {Math.abs(totalDiff)} ر.س</Badge>}</td>
                  <td className="px-4 py-3 text-center text-xs text-gray-400">{Object.values(verified).filter(Boolean).length}/{channels.length} موثّق</td>
                </tr>
              </tfoot>
            </table>
            {totalDiff!==0 && (
              <div className="mx-4 mb-4 mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={15} className="text-amber-600 mt-0.5 flex-shrink-0"/>
                  <div>
                    <p className="text-amber-800 font-semibold text-sm">يوجد فرق في قناة جاهز</p>
                    <p className="text-amber-700 text-xs mt-0.5">الفرق: 150 ر.س — يُخصم من حساب المسؤول: محمد العبدلي (مدير الشفت)</p>
                  </div>
                </div>
              </div>
            )}
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
        <div className="grid grid-cols-5 gap-3 mb-3">
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
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">بحث (فرع / مورد / منتج)</label>
            <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2 py-2">
              <Search size={11} className="text-gray-400 flex-shrink-0"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث..." className="flex-1 text-xs outline-none min-w-0"/>
            </div>
          </div>
        </div>
        {hasFilters && (
          <button onClick={()=>{ setFilterSupplier("الكل"); setFilterBranch("الكل"); setFilterStatus("الكل"); setFilterMatch("الكل"); setSearch(""); }}
            className="text-xs text-purple-600 hover:underline flex items-center gap-1"><RotateCcw size={10}/> مسح الفلاتر</button>
        )}
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
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={()=>setPurAttachModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">مرفقات الفاتورة</h3>
                <p className="text-xs text-gray-400 mt-0.5">الفاتورة: <span className="font-mono text-purple-600">{purAttachModal.invNum}</span></p>
              </div>
              <button onClick={()=>setPurAttachModal(null)} className="text-gray-400 hover:text-gray-600 p-1"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-3">
              {Array.from({length: purAttachModal.total}).map((_,idx)=>(
                <div key={idx} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer group">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0"><FileText size={16} className="text-blue-600"/></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">مرفق_فاتورة_{purAttachModal.invNum}_{idx+1}.pdf</p>
                    <p className="text-xs text-gray-400 mt-0.5">PDF · {(120+idx*80)}KB</p>
                  </div>
                  <Btn size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">عرض</Btn>
                </div>
              ))}
            </div>
            <div className="px-5 pb-4 flex gap-2">
              <Btn size="sm"><Plus size={11}/> إرفاق مستند</Btn>
              <Btn size="sm" onClick={()=>setPurAttachModal(null)}>إغلاق</Btn>
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

  const invOps = ops.filter(o=>o.moduleKey==="inventory");
  const pendingInv = invOps.filter(o=>o.status==="pending");

  const exportExcel = () => { /* Simulated Excel export */ alert("تصدير Excel: جاري تنزيل ملف جرد الفروع..."); };

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
          <button onClick={exportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-all">
            <FileText size={12}/> تصدير Excel
          </button>
          <Btn variant="primary" size="sm" onClick={()=>navigate("acc-inventory-items")}><Package size={13}/> تحديد أصناف الجرد</Btn>
        </div>
      </div>

      {/* Daily / Monthly toggle filter */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit" dir="rtl">
        {([["monthly","الجرد الشهري"],["daily","الجرد اليومي"]] as const).map(([val,label])=>(
          <button key={val} onClick={()=>setInvType(val)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${invType===val?"bg-white text-gray-800 shadow-sm":"text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
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
                  <Btn size="sm" onClick={()=>setExpandedBranch(isExpanded?null:branch)}>
                    {isExpanded?<ChevronUp size={12}/>:<ChevronDown size={12}/>} الأصناف
                  </Btn>
                  {invType==="daily" && (
                    <Btn size="sm" variant="primary" onClick={()=>setDailyBranch(isDailyOpen?null:branch)}>
                      <RefreshCw size={12}/> معادلة الجرد
                    </Btn>
                  )}
                  {invType==="monthly" && (
                    <>
                      <button onClick={()=>toggleFlagged(branch)}
                        title={isFlagged?"إلغاء التعليم":"تعليم بواسطة المحاسب"}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${isFlagged?"bg-purple-100 text-purple-700 border-purple-300":"bg-gray-50 text-gray-500 border-gray-200 hover:bg-purple-50"}`}>
                        🚩 {isFlagged?"مُعلَّم":"تعليم"}
                      </button>
                      {!isSent && <Btn size="sm" onClick={()=>sendConfirm(branch)}><Send size={11}/> إرسال للتأكيد</Btn>}
                      <button onClick={()=>toggleConfirm(branch)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${isConfirmed?"bg-emerald-100 text-emerald-700 border-emerald-300":"bg-gray-50 text-gray-500 border-gray-200 hover:bg-emerald-50"}`}>
                        <CheckCircle2 size={11}/> {isConfirmed?"أكّده الفرع":"تسجيل تأكيد"}
                      </button>
                    </>
                  )}
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {items.map((it,j)=>{
                        const diff   = it.curr - it.prev;
                        const pct    = it.prev>0 ? Math.round((diff/it.prev)*100) : 0;
                        const isAnomaly = Math.abs(pct) > 100;
                        return (
                          <tr key={j} className={isAnomaly?"bg-red-50/40":""}>
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
              {isDailyOpen && invType==="daily" && (
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
                        <span className="font-mono font-bold text-gray-800">6,340 ر.س</span>
                      </div>
                      <div className="flex items-center justify-between py-1 bg-red-50/60 -mx-2 px-2 rounded-lg">
                        <span className="font-bold text-red-700">عجز مُكتشف</span>
                        <span className="font-black text-red-700 font-mono">−360 ر.س</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-indigo-100">
                      <p className="text-xs font-semibold text-gray-600 mb-1">تحميل العجز على موظف:</p>
                      <div className="flex items-center gap-2">
                        <input placeholder="رقم الموظف..." className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5" dir="rtl"/>
                        <span className="text-xs text-gray-400 flex-shrink-0">→ الاسم يظهر تلقائياً</span>
                        <Btn size="sm" variant="danger">تحميل</Btn>
                      </div>
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

function AccInventoryItems({ navigate }:PageProps) {
  const allItems = [
    {name:"دجاج طازج",cat:"بروتين",unit:"كجم"},{name:"خبز برجر",cat:"مخبوزات",unit:"قطعة"},
    {name:"جبنة شيدر",cat:"ألبان",unit:"كجم"},{name:"حليب طازج",cat:"ألبان",unit:"لتر"},
    {name:"طماطم",cat:"خضروات",unit:"كجم"},{name:"خس",cat:"خضروات",unit:"كجم"},
    {name:"بطاطس",cat:"خضروات",unit:"كجم"},{name:"بصل",cat:"خضروات",unit:"كجم"},
    {name:"صوص خاص",cat:"صوصات",unit:"كجم"},{name:"زيت قلي",cat:"زيوت",unit:"لتر"},
    {name:"مايونيز",cat:"صوصات",unit:"كجم"},{name:"كاتشب",cat:"صوصات",unit:"كجم"},
    {name:"ماء معدني",cat:"مشروبات",unit:"لتر"},{name:"مشروبات غازية",cat:"مشروبات",unit:"علبة"},
    {name:"عصير برتقال",cat:"مشروبات",unit:"لتر"},
  ];
  const [selected,setSelected] = useState<string[]>(["دجاج طازج","حليب طازج","خس","طماطم","بطاطس","زيت قلي","كاتشب","ماء معدني","عصير برتقال","خبز برجر"]);
  const [catFilter,setCatFilter] = useState("الكل");
  const [saved,setSaved] = useState(false);
  const [saving,setSaving] = useState(false);
  const cats = ["الكل",...new Set(allItems.map(i=>i.cat))];
  const shown = catFilter==="الكل"?allItems:allItems.filter(i=>i.cat===catFilter);
  const toggle = (n:string) => { setSaved(false); setSelected(p=>p.includes(n)?p.filter(x=>x!==n):[...p,n]); };
  const save = () => { setSaving(true); setTimeout(()=>{ setSaving(false); setSaved(true); },800); };

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{label:"لوحة التحكم",onClick:()=>navigate("acc-dashboard")},{label:"المخزون",onClick:()=>navigate("acc-inventory")},{label:"تحديد الأصناف"}]}/>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">تحديد أصناف الجرد اليومي</h2>
          <p className="text-gray-400 text-sm mt-0.5">حدد الأصناف التي يجب على مدير الفرع جردها يومياً — يتزامن فوراً مع تطبيق الموبايل</p></div>
        <Btn variant="primary" onClick={save} className={saving?"opacity-70 cursor-not-allowed":""}>
          {saving?<RefreshCw size={13} className="animate-spin"/>:<RefreshCw size={13}/>}
          {saving?"جاري الحفظ...":"حفظ وتحديث التطبيق فوراً"}
        </Btn>
      </div>
      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0"/>
          <div><p className="text-emerald-800 font-semibold text-sm">تم الحفظ والإرسال بنجاح!</p>
            <p className="text-emerald-600 text-xs">تم إرسال {selected.length} أصناف إلى تطبيق مدير الفرع مع إشعار فوري.</p></div>
          <button onClick={()=>setSaved(false)} className="mr-auto text-emerald-400 hover:text-emerald-600"><X size={14}/></button>
        </div>
      )}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
        <Bell size={14} className="text-amber-600 flex-shrink-0"/>
        <p className="text-amber-700 text-sm">أي تغيير يُحدَّث فوراً في تطبيق مدير الفرع مع إشعار تلقائي.</p>
      </div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {cats.map(c=>(
              <button key={c} onClick={()=>setCatFilter(c)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${catFilter===c?"bg-purple-600 text-white":"bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>{c}</button>
            ))}
          </div>
          <Card title={`الأصناف — ${shown.length}`} actions={
            <div className="flex gap-3">
              <button onClick={()=>{ setSaved(false); setSelected(allItems.map(i=>i.name)); }} className="text-xs text-purple-600 hover:underline">تحديد الكل</button>
              <button onClick={()=>{ setSaved(false); setSelected([]); }} className="text-xs text-red-500 hover:underline">إلغاء الكل</button>
            </div>
          }>
            <div className="p-4 grid grid-cols-2 gap-2.5">
              {shown.map(item=>{
                const isSelected=selected.includes(item.name);
                return (
                  <button key={item.name} onClick={()=>toggle(item.name)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-right ${isSelected?"border-purple-300 bg-purple-50/60":"border-gray-100 bg-white hover:border-gray-200"}`}>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${isSelected?"bg-purple-600":"bg-gray-200"}`}>
                      {isSelected && <span className="text-white text-[10px]">✓</span>}
                    </div>
                    <div className="text-right flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{item.name}</p>
                      <p className="text-[10px] text-gray-400">{item.cat} · {item.unit}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
        <div>
          <Card title="الأصناف المحددة" actions={<Badge className="bg-purple-100 text-purple-700">{selected.length} صنف</Badge>}>
            <div className="p-4">
              {selected.length===0
                ? <EmptyState icon="📦" title="لم يتم اختيار أصناف" desc=""/>
                : <div className="space-y-1.5 mb-4">
                    {selected.map((n,i)=>(
                      <div key={n} className="flex items-center gap-2 py-1">
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
                        <span className="text-sm text-gray-700 flex-1">{n}</span>
                        <button onClick={()=>toggle(n)} className="text-gray-300 hover:text-red-400"><X size={12}/></button>
                      </div>
                    ))}
                  </div>
              }
              <Btn variant="primary" className="w-full justify-center mt-2" onClick={save}>
                <RefreshCw size={13}/> تحديث التطبيق
              </Btn>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AccShifts({ navigate, setModal }:PageProps) {
  const shifts = [
    { name:"خالد الشمري", role:"مشرف الشفت", branch:"فرع الرياض - العليا", start:"8:00 ص", duration:"3:22 ساعة", orders:87, sales:12500, cash:4200, status:"active" as const },
    { name:"محمد العتيبي", role:"كاشير رئيسي", branch:"فرع الرياض - العليا", start:"8:00 ص", duration:"3:22 ساعة", orders:87, sales:12500, cash:null, status:"active" as const },
    { name:"سعد الدوسري", role:"مشرف الشفت", branch:"فرع مكة - المعابدة", start:"6:00 ص", duration:"5:22 ساعة", orders:45, sales:9200, cash:3800, status:"late" as const },
    { name:"فهد القحطاني", role:"كاشير", branch:"فرع جدة - الحمراء", start:"7:00 ص", duration:"4:22 ساعة", orders:63, sales:9200, cash:null, status:"active" as const },
  ];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">الشفتات النشطة — مباشر</h2>
          <p className="text-gray-400 text-sm mt-0.5">الوقت الفعلي لجميع الفروع المخصصة</p></div>
        <span className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>مباشر — آخر تحديث: الآن
        </span>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="شفتات نشطة" value="4" sub="" icon={<span className="w-2 h-2 rounded-full bg-emerald-500"></span>} accent="emerald"/>
        <KpiCard label="شفت متأخر" value="1" sub="يحتاج متابعة" icon={<AlertTriangle size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label="متوسط مدة الشفت" value="4.2 ساعة" sub="هذا اليوم" icon={<TrendingUp size={18} className="text-purple-600"/>} accent="purple"/>
        <KpiCard label="إجمالي الطلبات" value="282" sub="هذا اليوم" icon={<ShoppingCart size={18} className="text-blue-600"/>} accent="blue"/>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {shifts.map((sh,i)=>(
          <div key={i} className={`bg-white rounded-xl border shadow-sm p-4 ${sh.status==="late"?"border-amber-300 bg-amber-50/20":"border-gray-100"}`}>
            {sh.status==="late" && <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold mb-3 bg-amber-100 rounded-lg px-3 py-2"><AlertTriangle size={13}/> انتهى وقت الشفت — لم يُغلق الصندوق بعد</div>}
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-white font-bold text-sm">{sh.name[0]}</div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${sh.status==="late"?"bg-amber-500":"bg-emerald-500"}`}></span>
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
              <button className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"><Eye size={12}/> التفاصيل</button>
            </div>
          </div>
        ))}
      </div>
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
    if(empFilter.empNum && !e.name.includes(empFilter.empNum) && !empFilter.empNum.match(/^\d+$/)) return true;
    if(empFilter.branch && !e.branch.includes(empFilter.branch.replace("الكل",""))) return empFilter.branch==="الكل"||!empFilter.branch;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">كشف حساب الموظفين</h2>
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
            <select value={empFilter.branch} onChange={e=>setEmpFilter(p=>({...p,branch:e.target.value}))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {["الكل",...BRANCHES].map(b=><option key={b}>{b}</option>)}
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
        <Card title={`قائمة الموظفين (${employees.length})`}>
          <div className="divide-y divide-gray-100">
            {employees.map((e,i)=>(
              <button key={i} onClick={()=>setSelectedIdx(i)} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-right ${selectedIdx===i?"bg-purple-50/50":""}`}>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{e.name[0]}</div>
                <div className="flex-1 min-w-0"><p className="font-semibold text-sm text-gray-800">{e.name}</p><p className="text-xs text-gray-400">{e.role} · {e.branch}</p></div>
                <span className={`font-mono font-bold text-sm ${e.balance>=0?"text-emerald-600":"text-red-600"}`}>{e.balance>=0?"+":""}{e.balance} ر.س</span>
              </button>
            ))}
          </div>
        </Card>
        <div className="space-y-4">
          <Card title={`كشف حساب: ${emp.name}`} actions={
            <div className="flex gap-2">
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">بحث — الفرع أو المسؤول</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Search size={13} className="text-gray-400"/>
              <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="اسم الفرع أو اسم أمين الصندوق..." className="flex-1 text-sm outline-none"/>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">حالة العهدة</label>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {["الكل","قريبة من النفاد","طلبات معلقة","نشطة"].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {(searchTerm||statusFilter) && (
          <button onClick={()=>{ setSearchTerm(""); setStatusFilter(""); }} className="mt-2 text-xs text-purple-600 hover:underline flex items-center gap-1"><RotateCcw size={11}/> مسح الفلاتر</button>
        )}
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
// FIXED ASSETS — Mobile ↔ Accountant Coordination Workflow
// ════════════════════════════════════════════════════════════
function AccAssets({}: PageProps) {
  type AssetStatus = "pending_branch"|"pending_accountant"|"confirmed"|"registered";
  interface AssetEntry {
    id:string; name:string; cat:string; branch:string; cost:number; book:number;
    case_:"branch_upload"|"acc_register"; status:AssetStatus; invNum:string; submittedBy:string; date:string;
  }
  const [assets, setAssets] = useState<AssetEntry[]>([
    { id:"FA-001", name:"ثلاجة عرض كبيرة",   cat:"معدات", branch:"الرياض - العليا",  cost:28000, book:21000, case_:"branch_upload",  status:"pending_accountant", invNum:"INV-A001", submittedBy:"مدير الفرع: خالد العمري",  date:"12 أكت" },
    { id:"FA-002", name:"نظام POS متكامل",   cat:"تقنية", branch:"جدة - الحمراء",    cost:15000, book:9000,  case_:"acc_register",   status:"pending_branch",     invNum:"INV-A002", submittedBy:"المحاسب: سارة الزهراني",   date:"11 أكت" },
    { id:"FA-003", name:"شاشات عرض المنيو",  cat:"تقنية", branch:"مكة - المعابدة",   cost:8500,  book:7083,  case_:"branch_upload",  status:"confirmed",          invNum:"INV-A003", submittedBy:"مدير الفرع: فهد الشمري",    date:"10 أكت" },
    { id:"FA-004", name:"فرن صناعي",          cat:"معدات", branch:"الدمام",            cost:45000, book:37500, case_:"acc_register",   status:"confirmed",          invNum:"INV-A004", submittedBy:"المحاسب: أحمد الفيصل",      date:"09 أكت" },
    { id:"FA-005", name:"مكيف مركزي",         cat:"معدات", branch:"الرياض - السليمانية",cost:22000,book:18000, case_:"branch_upload", status:"pending_accountant", invNum:"INV-A005", submittedBy:"مدير الفرع: نواف السالم",    date:"13 أكت" },
  ]);
  const [expandedId,    setExpandedId]   = useState<string|null>(null);
  const [filterStatus,  setFilterStatus] = useState<"الكل"|AssetStatus>("الكل");
  const [assetAttach,   setAssetAttach]  = useState<{assetId:string; name:string}|null>(null);
  const confirmAsset = (id:string) => setAssets(p=>p.map(a=>a.id===id?{...a,status:"confirmed" as AssetStatus}:a));

  const pendingAccountant = assets.filter(a=>a.status==="pending_accountant");
  const pendingBranch     = assets.filter(a=>a.status==="pending_branch");
  const confirmed         = assets.filter(a=>a.status==="confirmed");
  const displayedAssets   = filterStatus==="الكل" ? assets : assets.filter(a=>a.status===filterStatus);

  const STATUS_ASSET: Record<AssetStatus, {label:string; cls:string}> = {
    pending_branch:     { label:"ينتظر تأكيد الفرع",   cls:"bg-amber-50 text-amber-700 border border-amber-200" },
    pending_accountant: { label:"ينتظر مراجعة المحاسب", cls:"bg-blue-50 text-blue-700 border border-blue-200" },
    confirmed:          { label:"مؤكد — مكتمل",         cls:"bg-emerald-50 text-emerald-700 border border-emerald-200" },
    registered:         { label:"مسجل",                 cls:"bg-purple-50 text-purple-700 border border-purple-200" },
  };

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">الأصول الثابتة</h2>
          <p className="text-gray-400 text-sm mt-0.5">تنسيق بين مدير الفرع (موبايل) والمحاسب</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="بانتظار مراجعتي" value={String(pendingAccountant.length)} sub="رُفعت من الفروع" icon={<Clock size={18} className="text-blue-600"/>} accent="blue"/>
        <KpiCard label="بانتظار تأكيد الفرع" value={String(pendingBranch.length)} sub="سجّلها المحاسب" icon={<Smartphone size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label="مكتمل ومؤكد" value={String(confirmed.length)} sub="تمت الموافقة" icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label="القيمة الدفترية" value={`${(assets.reduce((s,a)=>s+a.book,0)/1000).toFixed(0)}K ر.س`} sub="كل الأصول" icon={<Building2 size={18} className="text-purple-600"/>} accent="purple"/>
      </div>

      {/* Workflow explanation */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4" dir="rtl">
          <div className="flex items-center gap-2 mb-2">
            <Smartphone size={16} className="text-blue-600 flex-shrink-0"/>
            <span className="text-sm font-bold text-blue-800">الحالة 1 — مدير الفرع يرفع عبر الموبايل</span>
          </div>
          <p className="text-xs text-blue-600">يرفع مدير الفرع صورة الأصل والفاتورة → يستلمها المحاسب هنا → يراجعها ويسجّلها في النظام</p>
        </div>
        <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4" dir="rtl">
          <div className="flex items-center gap-2 mb-2">
            <Clipboard size={16} className="text-amber-600 flex-shrink-0"/>
            <span className="text-sm font-bold text-amber-800">الحالة 2 — المحاسب يسجّل الفاتورة</span>
          </div>
          <p className="text-xs text-amber-600">المحاسب يسجّل الفاتورة → يُرسل إشعاراً لمدير الفرع على الموبايل → مدير الفرع يؤكد الاستلام</p>
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
        {filterStatus!=="الكل" && (
          <button onClick={()=>setFilterStatus("الكل")} className="text-xs text-purple-600 hover:underline flex items-center gap-1 mt-4"><RotateCcw size={11}/> مسح</button>
        )}
      </div>

      {/* Assets list */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">سجل الأصول — اضغط لعرض التفاصيل</h3>
          <span className="text-xs text-gray-400">{displayedAssets.length} أصل</span>
        </div>
        {displayedAssets.map(a=>{
          const isExpanded = expandedId===a.id;
          const cfg = STATUS_ASSET[a.status];
          return (
            <div key={a.id} className="border-b border-gray-100 last:border-0">
              <div className={`px-5 py-4 flex items-center gap-4 hover:bg-gray-50/70 cursor-pointer ${isExpanded?"bg-purple-50/20":""}`}
                onClick={()=>setExpandedId(isExpanded?null:a.id)}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg flex-shrink-0 ${a.cat==="معدات"?"bg-blue-500":"bg-purple-500"}`}>
                  {a.cat==="معدات"?"🔧":"💻"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 text-sm">{a.name}</span>
                    <Badge className="bg-gray-50 text-gray-600 border border-gray-200 text-[10px]">{a.cat}</Badge>
                    <Badge className={`${cfg.cls} text-[10px]`}>{cfg.label}</Badge>
                    {a.case_==="branch_upload"
                      ? <Badge className="bg-blue-50 text-blue-600 text-[10px]"><Smartphone size={9} className="ml-0.5"/> مُرفوع من الفرع</Badge>
                      : <Badge className="bg-amber-50 text-amber-600 text-[10px]"><Clipboard size={9} className="ml-0.5"/> سجّله المحاسب</Badge>
                    }
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{a.branch} · {a.date} · {a.submittedBy}</p>
                </div>
                <div className="text-left text-sm">
                  <p className="font-mono font-bold text-gray-800">{fmtAmt(a.cost)} ر.س</p>
                  <p className="text-xs text-gray-400 mt-0.5">دفترية: {fmtAmt(a.book)} ر.س</p>
                </div>
                {isExpanded?<ChevronUp size={14} className="text-gray-400"/>:<ChevronDown size={14} className="text-gray-400"/>}
              </div>
              {isExpanded && (
                <div className="px-5 pb-5 bg-gray-50/40 space-y-3">
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    <div className="bg-white rounded-xl border border-gray-100 p-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">رقم الفاتورة</p>
                      <p className="text-sm font-bold font-mono text-purple-700">{a.invNum}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">التكلفة الإجمالية</p>
                      <p className="text-sm font-bold font-mono text-gray-800">{fmtAmt(a.cost)} ر.س</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">القيمة الدفترية</p>
                      <p className="text-sm font-bold font-mono text-gray-800">{fmtAmt(a.book)} ر.س</p>
                    </div>
                  </div>
                  {/* Workflow state-specific actions */}
                  {/* Attachment viewer button */}
                  <button onClick={()=>setAssetAttach({assetId:a.id, name:a.name})}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold border border-blue-200 transition-all">
                    <Paperclip size={11}/> عرض المرفقات (صورة الأصل + الفاتورة)
                  </button>

                  {a.status==="pending_accountant" && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                      <Smartphone size={16} className="text-blue-600 mt-0.5 flex-shrink-0"/>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-blue-900">الخطوة: مراجعة وتأكيد الاستلام</p>
                        <p className="text-xs text-blue-600 mt-0.5">رُفع الأصل والفاتورة من الفرع عبر تطبيق الموبايل. راجع البيانات ثم أكّد التسجيل.</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Btn size="sm" variant="success" onClick={()=>confirmAsset(a.id)}><CheckCircle2 size={12}/> تأكيد التسجيل</Btn>
                      </div>
                    </div>
                  )}
                  {a.status==="pending_branch" && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                      <Smartphone size={16} className="text-amber-600 mt-0.5 flex-shrink-0"/>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-amber-900">بانتظار تأكيد الفرع على الموبايل</p>
                        <p className="text-xs text-amber-600 mt-0.5">سُجّلت الفاتورة من طرف المحاسب. أُرسل إشعار لمدير الفرع لتأكيد الاستلام الفعلي للأصل.</p>
                      </div>
                      <Badge className="bg-amber-100 text-amber-700 text-xs flex-shrink-0">⏳ ينتظر الفرع</Badge>
                    </div>
                  )}
                  {a.status==="confirmed" && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0"/>
                      <p className="text-sm text-emerald-800 font-medium">مكتمل — تم التأكيد من كلا الطرفين. الأصل مسجّل في النظام.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Asset attachment viewer modal */}
      {assetAttach && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={()=>setAssetAttach(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">مرفقات الأصل</h3>
                <p className="text-xs text-gray-400 mt-0.5">{assetAttach.name}</p>
              </div>
              <button onClick={()=>setAssetAttach(null)} className="text-gray-400 hover:text-gray-600 p-1"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-3">
              {[
                {name:`صورة_الأصل_${assetAttach.assetId}.jpg`, type:"صورة", size:"340KB"},
                {name:`فاتورة_شراء_${assetAttach.assetId}.pdf`, type:"PDF", size:"180KB"},
              ].map((att,i)=>(
                <div key={i} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer group">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${att.type==="صورة"?"bg-purple-100":"bg-blue-100"}`}>
                    {att.type==="صورة"
                      ? <span className="text-lg">🖼</span>
                      : <FileText size={16} className="text-blue-600"/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate" dir="ltr">{att.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{att.type} · {att.size}</p>
                  </div>
                  <Btn size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity"><Eye size={11}/> عرض</Btn>
                </div>
              ))}
            </div>
            <div className="px-5 pb-4 flex gap-2">
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
  interface WasteProduct { name:string; qty:number; unit:string; class_:WasteClass; resp:Resp; hasImg:boolean; empId:string; empName:string }
  interface WasteEntry { id:string; branch:string; date:string; status:"pending"|"approved"|"rejected"; products:WasteProduct[] }
  const [filterBranch, setFilterBranch] = useState("الكل");
  const MOCK_EMP_MAP: Record<string,string> = {
    "1001":"أحمد العمري","1002":"سارة الزهراني","1003":"فهد القحطاني","1004":"نورة المطيري","1005":"خالد السالم"
  };
  const [entries, setEntries] = useState<WasteEntry[]>([
    { id:"WD-001", branch:"فرع الرياض - العليا",    date:"14 أكت", status:"pending",
      products:[
        {name:"دجاج طازج",     qty:3,  unit:"كجم",   class_:"تالف", resp:"موظف",  hasImg:true,  empId:"1001", empName:"أحمد العمري"},
        {name:"زيت قلي",       qty:10, unit:"لتر",   class_:"هدر",  resp:"مطعم",  hasImg:false, empId:"",     empName:""},
      ]},
    { id:"WD-002", branch:"فرع جدة - الحمراء",      date:"13 أكت", status:"pending",
      products:[
        {name:"خبز برجر",       qty:20, unit:"قطعة",  class_:"هدر",  resp:"مطعم",  hasImg:false, empId:"",     empName:""},
        {name:"صوص مايونيز",   qty:2,  unit:"كجم",   class_:"تالف", resp:"موظف",  hasImg:true,  empId:"1003", empName:"فهد القحطاني"},
        {name:"مشروبات غازية", qty:6,  unit:"علبة",  class_:"هدر",  resp:"مطعم",  hasImg:false, empId:"",     empName:""},
      ]},
    { id:"WD-003", branch:"فرع مكة - المعابدة",     date:"12 أكت", status:"approved",
      products:[
        {name:"دجاج طازج",     qty:1,  unit:"كجم",   class_:"تالف", resp:"موظف",  hasImg:true,  empId:"1002", empName:"سارة الزهراني"},
      ]},
  ]);
  const [expandedId, setExpandedId] = useState<string|null>(null);
  const toggleClass = (entryId:string, pIdx:number) => {
    setEntries(prev=>prev.map(e=>e.id===entryId?{
      ...e, products:e.products.map((p,i)=>i===pIdx?{...p, class_:p.class_==="هدر"?"تالف":"هدر" as WasteClass}:p)
    }:e));
  };
  const toggleResp = (entryId:string, pIdx:number) => {
    setEntries(prev=>prev.map(e=>e.id===entryId?{
      ...e, products:e.products.map((p,i)=>i===pIdx?{...p, resp:p.resp==="موظف"?"مطعم":"موظف" as Resp}:p)
    }:e));
  };
  const approve = (id:string) => setEntries(p=>p.map(e=>e.id===id?{...e,status:"approved" as const}:e));
  const reject  = (id:string) => setEntries(p=>p.map(e=>e.id===id?{...e,status:"rejected" as const}:e));
  const changeEmp = (entryId:string, pIdx:number, newId:string) => {
    const name = MOCK_EMP_MAP[newId]||"";
    setEntries(prev=>prev.map(e=>e.id===entryId?{
      ...e, products:e.products.map((p,i)=>i===pIdx?{...p,empId:newId,empName:name}:p)
    }:e));
  };

  const pending  = entries.filter(e=>e.status==="pending");
  const approved = entries.filter(e=>e.status==="approved");
  const displayed = filterBranch==="الكل" ? entries : entries.filter(e=>e.branch===filterBranch);

  const WASTE_BRANCHES = [...new Set(entries.map(e=>e.branch))];

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">موديول الهدر والتالف</h2>
          <p className="text-gray-400 text-sm mt-0.5">مراجعة بيانات الهدر — تعديل التصنيف وتحديد المسؤولية والموظف المسؤول</p>
        </div>
        {pending.length>0 && <Btn variant="success" size="sm" onClick={()=>setEntries(p=>p.map(e=>({...e,status:"approved" as const})))}><CheckCircle2 size={12}/> موافقة على الكل ({pending.length})</Btn>}
      </div>

      {/* Branch filter */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
        <div>
          <label className="text-[11px] font-semibold text-gray-500 block mb-1">تصفية حسب الفرع</label>
          <select value={filterBranch} onChange={e=>setFilterBranch(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 min-w-[200px]">
            <option value="الكل">الكل</option>
            {WASTE_BRANCHES.map(b=><option key={b}>{b}</option>)}
          </select>
        </div>
        {filterBranch!=="الكل" && (
          <button onClick={()=>setFilterBranch("الكل")} className="text-xs text-purple-600 hover:underline flex items-center gap-1 mt-4"><RotateCcw size={11}/> مسح</button>
        )}
        <div className="flex-1 text-left">
          <p className="text-xs text-gray-400">{displayed.length} بيان{filterBranch!=="الكل"?` من ${filterBranch}`:""}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="بانتظار المراجعة" value={String(pending.length)} sub="من الفروع" icon={<Clock size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label="معتمد" value={String(approved.length)} sub="هذا الشهر" icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label="بنود هدر اليوم" value={String(entries.reduce((s,e)=>s+e.products.filter(p=>p.class_==="هدر").length,0))} sub="تصنيف هدر" icon={<Trash2 size={18} className="text-blue-600"/>} accent="blue"/>
        <KpiCard label="بنود تالف" value={String(entries.reduce((s,e)=>s+e.products.filter(p=>p.class_==="تالف").length,0))} sub="تصنيف تالف" icon={<AlertTriangle size={18} className="text-red-600"/>} accent="red"/>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">بيانات الهدر والتالف</h3>
          <span className="text-xs text-gray-400">{displayed.length} بيان — اضغط لعرض المنتجات</span>
        </div>
        {displayed.map(entry=>{
          const isExpanded = expandedId===entry.id;
          const statusCls  = entry.status==="pending"?"bg-amber-50 text-amber-700 border border-amber-200":entry.status==="approved"?"bg-emerald-50 text-emerald-700 border border-emerald-200":"bg-red-50 text-red-700 border border-red-200";
          const statusLbl  = entry.status==="pending"?"معلق":entry.status==="approved"?"معتمد":"مرفوض";
          return (
            <div key={entry.id} className="border-b border-gray-100 last:border-0">
              <div className={`px-5 py-4 flex items-center gap-4 hover:bg-gray-50/70 cursor-pointer ${isExpanded?"bg-rose-50/20":""}`}
                onClick={()=>setExpandedId(isExpanded?null:entry.id)}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 text-sm">{entry.branch}</span>
                    <span className="text-gray-300">·</span>
                    <span className="font-mono text-xs text-rose-600">{entry.id}</span>
                    <Badge className={`${statusCls} text-[10px]`}>{statusLbl}</Badge>
                    <Badge className="bg-gray-50 text-gray-600 border border-gray-200 text-[10px]">{entry.products.length} منتج</Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{entry.date}</p>
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
                <div className="px-5 pb-5 bg-gray-50/40">
                  <p className="text-xs font-bold text-gray-600 mt-3 mb-2">
                    المنتجات المشمولة — يمكن تعديل التصنيف والمسؤولية:
                  </p>
                  <table className="w-full border border-gray-100 rounded-xl overflow-hidden text-xs" dir="rtl">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-right">الصنف</th>
                        <th className="px-3 py-2 text-center">الكمية</th>
                        <th className="px-3 py-2 text-center">الوحدة</th>
                        <th className="px-3 py-2 text-center">الصورة</th>
                        <th className="px-3 py-2 text-center">التصنيف</th>
                        <th className="px-3 py-2 text-center">المسؤولية</th>
                        <th className="px-3 py-2 text-center text-orange-700 bg-orange-50/60">تغيير الموظف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {entry.products.map((prod,pi)=>(
                        <tr key={pi} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-semibold text-gray-800">{prod.name}</td>
                          <td className="px-3 py-2 text-center font-mono font-bold text-gray-800">{prod.qty}</td>
                          <td className="px-3 py-2 text-center text-gray-500">{prod.unit}</td>
                          <td className="px-3 py-2 text-center">
                            {prod.hasImg
                              ? <button className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] hover:bg-blue-100 transition-all">
                                  <Eye size={10}/> عرض
                                </button>
                              : <span className="text-gray-300 text-[10px]">لا يوجد</span>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {entry.status==="pending"
                              ? <button onClick={()=>toggleClass(entry.id,pi)}
                                  className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-all ${prod.class_==="تالف"?"bg-red-50 text-red-700 border-red-200 hover:bg-red-100":"bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"}`}>
                                  {prod.class_==="تالف"?"🔴 تالف":"🟡 هدر"}
                                </button>
                              : <Badge className={prod.class_==="تالف"?"bg-red-50 text-red-700":"bg-amber-50 text-amber-700"}>{prod.class_}</Badge>
                            }
                          </td>
                          <td className="px-3 py-2 text-center">
                            {entry.status==="pending"
                              ? <button onClick={()=>toggleResp(entry.id,pi)}
                                  className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-all ${prod.resp==="موظف"?"bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100":"bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"}`}>
                                  {prod.resp==="موظف"?"👤 موظف":"🏪 مطعم"}
                                </button>
                              : <Badge className={prod.resp==="موظف"?"bg-orange-50 text-orange-700":"bg-gray-50 text-gray-600"}>{prod.resp}</Badge>
                            }
                          </td>
                          {/* Employee assignment — change employee */}
                          <td className="px-3 py-2 bg-orange-50/20">
                            <div className="flex items-center gap-1.5">
                              <input
                                value={prod.empId}
                                onChange={e=>changeEmp(entry.id,pi,e.target.value)}
                                placeholder="#موظف"
                                className="w-16 text-center text-[10px] font-mono border border-orange-200 rounded-lg px-1.5 py-1 bg-white focus:border-orange-400 outline-none"
                                dir="ltr"
                              />
                              <span className={`text-[10px] truncate max-w-[80px] ${prod.empName?"text-orange-800 font-semibold":"text-gray-400"}`}>
                                {prod.empName||"—"}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {entry.status==="pending" && (
                    <div className="mt-3 p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                      <p className="text-[11px] text-blue-700 font-medium">
                        💡 التصنيف يحدد الجهة المحاسبة: <strong>تالف</strong> = يُحمَّل للموظف أو المطعم · <strong>هدر</strong> = خسارة تشغيلية مباشرة
                      </p>
                    </div>
                  )}
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

      {/* Module + Branch filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 grid grid-cols-3 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-gray-500 block mb-1">الموديول</label>
          <select value={filterModule} onChange={e=>setFilterModule(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
            <option value="الكل">الكل</option>
            {Object.entries(MODULE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-500 block mb-1">الفرع</label>
          <select value={filterBranch} onChange={e=>setFilterBranch(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
            <option value="الكل">الكل</option>
            {REM_BRANCHES.map(b=><option key={b}>{b}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          {(filterModule!=="الكل"||filterBranch!=="الكل") && (
            <button onClick={()=>{setFilterModule("الكل");setFilterBranch("الكل");}} className="text-xs text-purple-600 hover:underline flex items-center gap-1 pb-2"><RotateCcw size={11}/> مسح الفلاتر</button>
          )}
        </div>
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
  const filtered = applyFilters(ops, filters).filter(o=>o.status==="approved");
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">بانتظار الاعتماد النهائي</h2>
          <p className="text-gray-400 text-sm mt-0.5">{filtered.length} عملية وافق عليها المحاسبون</p></div>
        {filtered.length>0 && <Btn variant="success" onClick={()=>bulkApprove(filtered.map(o=>o.id))}>✅ اعتماد الكل</Btn>}
      </div>
      <FilterBar filters={filters} onChange={setFilters} branches={BRANCHES}/>
      <Card title="العمليات المعلقة">
        {filtered.length===0
          ? <EmptyState icon="✅" title="لا توجد عمليات" desc="تم اعتماد الكل أو لا تطابق الفلاتر"/>
          : filtered.map(op=>(
            <div key={op.id} className="px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
              <Badge className="bg-purple-50 text-purple-700 flex-shrink-0">{op.moduleLabel}</Badge>
              <div className="flex-1">
                <div className="flex items-center gap-2"><span className="font-semibold text-sm text-gray-800">{op.branch}</span><span className="text-xs font-mono text-gray-400">{op.id}</span></div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`${MATCH_CFG[op.match].cls} border`}>{MATCH_CFG[op.match].label}</Badge>
                  <span className="text-xs text-gray-400">⏰ {op.timeAgo}</span>
                </div>
              </div>
              <span className="font-mono font-bold text-gray-800">{fmtAmt(op.amount)} ر.س</span>
              <div className="flex gap-1.5">
                <Btn size="sm" variant="success" onClick={()=>finalApproveOp(op.id)}><CheckCircle2 size={12}/> اعتماد</Btn>
                <Btn size="sm" variant="danger" onClick={()=>{ setDetailId(op.id); setModal("reject"); }}><XCircle size={12}/> رفض</Btn>
              </div>
            </div>
          ))
        }
      </Card>
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
  const mk = moduleKey as ModuleKey;
  const filtered = applyFilters(ops, filters, mk).filter(o=>o.status==="approved");
  const labels: Record<string,string> = {sales:"المبيعات",expenses:"المصروفات",purchases:"المشتريات",inventory:"المخزون",shifts:"الشفتات",employees:"كشف الحساب",cash:"العهد النقدية"};
  const label = labels[moduleKey]||moduleKey;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{label}</h2>
          <p className="text-gray-400 text-sm mt-0.5">العمليات الموافق عليها من المحاسبين — تنتظر اعتمادك النهائي</p></div>
        {filtered.length>0 && <Btn variant="success" onClick={()=>bulkApprove(filtered.map(o=>o.id))}>✅ اعتماد الكل</Btn>}
      </div>
      <FilterBar filters={filters} onChange={setFilters} branches={BRANCHES}/>
      <Card title={`عمليات ${label}`}>
        {filtered.length===0
          ? <EmptyState icon="✅" title="لا توجد عمليات" desc="لا توجد عمليات بانتظار الاعتماد في هذا الموديول"/>
          : filtered.map(op=>(
            <div key={op.id} className="px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
              <div className="flex-1">
                <div className="flex items-center gap-2"><span className="font-semibold text-sm text-gray-800">{op.branch}</span><span className="text-xs font-mono text-gray-400">{op.id}</span></div>
                <div className="flex items-center gap-2 mt-1"><Badge className={`${MATCH_CFG[op.match].cls} border`}>{MATCH_CFG[op.match].label}</Badge><span className="text-xs text-gray-400">⏰ {op.timeAgo}</span></div>
              </div>
              <span className="font-mono font-bold">{fmtAmt(op.amount)} ر.س</span>
              <div className="flex gap-1.5">
                <Btn size="sm" variant="success" onClick={()=>finalApproveOp(op.id)}><CheckCircle2 size={12}/> اعتماد</Btn>
                <Btn size="sm" variant="danger" onClick={()=>{ setDetailId(op.id); setModal("reject"); }}><XCircle size={12}/></Btn>
              </div>
            </div>
          ))
        }
      </Card>
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
    </div>
  );
}

const BRANDS_DATA = [
  { id:"reem",     name:"علامة الريم",         color:"#7C3AED", abbr:"ر", plan:"بلاتيني", planColor:"purple",
    owner:"فيصل الريم", ownerEmail:"faisal@reem.sa",
    modules:["المبيعات","المصروفات","المشتريات","المخزون","الشفتات","كشف الحساب","العهد","الأصول"],
    subStatus:"active" as const, expires:"15 يناير 2027", daysLeft:307,
    restaurants:[
      { id:"r1", name:"مطعم الريم — العليا",  city:"الرياض", accountants:2, status:"active"  as const, branches:[{name:"فرع العليا الرئيسي",manager:"أحمد الشمري"},{name:"فرع النزهة",manager:"سلطان الغامدي"},{name:"فرع الملقا",manager:"فيصل البريك"}] },
      { id:"r2", name:"مطعم الريم — جدة",    city:"جدة",    accountants:1, status:"active"  as const, branches:[{name:"فرع الحمراء",manager:"محمد العتيبي"},{name:"فرع العزيزية",manager:"علي الزهراني"}] },
    ],
  },
  { id:"herfy",    name:"علامة هرفي",           color:"#D97706", abbr:"هـ", plan:"ذهبي", planColor:"amber",
    owner:"طلال الحسين", ownerEmail:"talal@herfy.sa",
    modules:["المبيعات","المصروفات","المشتريات","المخزون","الشفتات","كشف الحساب"],
    subStatus:"warning" as const, expires:"15 مارس 2026", daysLeft:1,
    restaurants:[
      { id:"r3", name:"هرفي — الرياض",  city:"الرياض", accountants:3, status:"active"   as const, branches:[{name:"فرع العليا",manager:"طارق المنصور"},{name:"فرع الإزدهار",manager:"بندر القحطاني"},{name:"فرع السلي",manager:"وليد الشهري"},{name:"فرع الدوبي",manager:"نواف العمري"}] },
      { id:"r4", name:"هرفي — جدة",    city:"جدة",    accountants:1, status:"active"   as const, branches:[{name:"فرع الكورنيش",manager:"عبدالرحمن الغامدي"},{name:"فرع بحرة",manager:"صالح الحربي"}] },
      { id:"r5", name:"هرفي — مكة",    city:"مكة",    accountants:1, status:"active"   as const, branches:[{name:"فرع المعابدة",manager:"حمد الدوسري"},{name:"فرع العزيزية",manager:"جاسم القرني"}] },
    ],
  },
  { id:"mcd",      name:"ماكدونالدز السعودية",  color:"#DC2626", abbr:"م", plan:"بلاتيني", planColor:"purple",
    owner:"شركة المطعم العالمي", ownerEmail:"ops@mcd-sa.com",
    modules:["المبيعات","المصروفات","المشتريات","المخزون","الشفتات","كشف الحساب","العهد","الأصول"],
    subStatus:"danger" as const, expires:"21 أبريل 2026", daysLeft:38,
    restaurants:[
      { id:"r6", name:"ماكدونالدز — الرياض", city:"الرياض", accountants:4, status:"active"   as const, branches:[{name:"فرع الدبلوماسي",manager:"أنس الطيار"},{name:"فرع النخيل مول",manager:"بدر الحوشان"},{name:"فرع هايبر بنده",manager:"منصور العنزي"}] },
      { id:"r7", name:"ماكدونالدز — الدمام", city:"الدمام", accountants:2, status:"active"   as const, branches:[{name:"فرع الكورنيش",manager:"خالد المطيري"},{name:"فرع الدانة مول",manager:"عمر العسيري"}] },
    ],
  },
  { id:"broasted", name:"بروستد الوطني",         color:"#059669", abbr:"ب", plan:"فضي", planColor:"emerald",
    owner:"محمد السعيد", ownerEmail:"msaeed@broasted.sa",
    modules:["المبيعات","المصروفات","المشتريات","المخزون"],
    subStatus:"expired" as const, expires:"9 أكتوبر 2025", daysLeft:-156,
    restaurants:[
      { id:"r8", name:"بروستد الوطني — الطائف", city:"الطائف", accountants:1, status:"suspended" as const, branches:[{name:"فرع المحطة",manager:"نايف العتيبي"},{name:"فرع الشفا",manager:"عبدالله الشريف"}] },
    ],
  },
];

function AdminRestaurants({}: PageProps) {
  const [expandedBrand, setExpandedBrand]   = useState<string|null>("reem");
  const [expandedRest,  setExpandedRest]    = useState<string|null>(null);
  const [showAddBrand,  setShowAddBrand]    = useState(false);
  const [showAddRest,   setShowAddRest]     = useState<string|null>(null);
  const [restTab, setRestTab]               = useState<"structure"|"upload">("structure");
  const [empUploaded, setEmpUploaded]       = useState(false);
  const [itemsUploaded, setItemsUploaded]   = useState(false);

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

      {/* ── Excel Upload Tab ── */}
      {restTab==="upload" && (
        <div className="space-y-5">
          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-extrabold font-mono text-purple-700">25</p>
              <p className="text-xs text-gray-400 mt-0.5">موظف نشط</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-extrabold font-mono text-blue-700">150</p>
              <p className="text-xs text-gray-400 mt-0.5">صنف نشط</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-extrabold font-mono text-emerald-700">12</p>
              <p className="text-xs text-gray-400 mt-0.5">مورد مسجل</p>
            </div>
          </div>

          {/* Upload cards */}
          <div className="grid grid-cols-2 gap-5">

            {/* Employees upload */}
            <div className={`bg-white rounded-xl border shadow-sm p-5 ${empUploaded?"border-emerald-200":"border-gray-100"}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Users size={18} className="text-blue-600"/>
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">رفع أسماء الموظفين</p>
                  <p className="text-xs text-gray-400">ملف Excel بيانات الموظفين</p>
                </div>
              </div>
              {/* Column guide */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-[10px] font-bold text-gray-500 mb-2">الأعمدة المطلوبة في الملف:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {["الاسم","رقم الهوية","الوظيفة","الراتب","تاريخ التعيين"].map(col=>(
                    <div key={col} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"/>
                      <span className="text-xs text-gray-600">{col}</span>
                    </div>
                  ))}
                </div>
              </div>
              {empUploaded
                ? <div className="flex items-center gap-2 text-emerald-700 text-sm mb-3"><CheckCircle2 size={16}/><span className="font-medium">تم الرفع بنجاح — 25 موظف</span></div>
                : <div onClick={()=>setEmpUploaded(true)} className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/20 transition-all mb-3">
                    <FileText size={24} className="text-gray-300 mx-auto mb-2"/>
                    <p className="text-sm font-medium text-gray-500">اضغط لرفع ملف Excel</p>
                    <p className="text-xs text-gray-400 mt-0.5">xlsx, xls — حتى 10 MB</p>
                  </div>
              }
              <div className="flex gap-2">
                <Btn variant="primary" size="sm" className="flex-1 justify-center" onClick={()=>setEmpUploaded(true)}>
                  <Upload size={12}/> رفع الآن
                </Btn>
                <Btn size="sm"><Download size={12}/> نموذج Excel</Btn>
              </div>
            </div>

            {/* Items upload */}
            <div className={`bg-white rounded-xl border shadow-sm p-5 ${itemsUploaded?"border-emerald-200":"border-gray-100"}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Package size={18} className="text-purple-600"/>
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">رفع أسماء الأصناف</p>
                  <p className="text-xs text-gray-400">ملف Excel بيانات الأصناف</p>
                </div>
              </div>
              {/* Column guide */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-[10px] font-bold text-gray-500 mb-2">الأعمدة المطلوبة في الملف:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {["رمز الصنف","اسم الصنف","الفئة","الوحدة"].map(col=>(
                    <div key={col} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0"/>
                      <span className="text-xs text-gray-600">{col}</span>
                    </div>
                  ))}
                </div>
              </div>
              {itemsUploaded
                ? <div className="flex items-center gap-2 text-emerald-700 text-sm mb-3"><CheckCircle2 size={16}/><span className="font-medium">تم الرفع بنجاح — 150 صنف</span></div>
                : <div onClick={()=>setItemsUploaded(true)} className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/20 transition-all mb-3">
                    <Package size={24} className="text-gray-300 mx-auto mb-2"/>
                    <p className="text-sm font-medium text-gray-500">اضغط لرفع ملف Excel</p>
                    <p className="text-xs text-gray-400 mt-0.5">xlsx, xls — حتى 10 MB</p>
                  </div>
              }
              <div className="flex gap-2">
                <Btn variant="primary" size="sm" className="flex-1 justify-center" onClick={()=>setItemsUploaded(true)}>
                  <Upload size={12}/> رفع الآن
                </Btn>
                <Btn size="sm"><Download size={12}/> نموذج Excel</Btn>
              </div>
            </div>
          </div>

          {/* Upload history */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="font-semibold text-sm text-gray-700">سجل الرفع السابق</p>
              <Badge className="bg-gray-50 text-gray-500">آخر 5 رفعات</Badge>
            </div>
            {[
              {file:"employees_oct2025.xlsx",type:"موظفون",count:"25 موظف",date:"14 أكتوبر 2025",user:"أحمد الإداري"},
              {file:"items_oct2025.xlsx",type:"أصناف",count:"148 صنف",date:"14 أكتوبر 2025",user:"أحمد الإداري"},
              {file:"employees_sep2025.xlsx",type:"موظفون",count:"23 موظف",date:"1 سبتمبر 2025",user:"مريم المديرة"},
              {file:"items_sep2025.xlsx",type:"أصناف",count:"140 صنف",date:"1 سبتمبر 2025",user:"مريم المديرة"},
            ].map((r,i)=>(
              <div key={i} className="px-5 py-3 flex items-center gap-4 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <FileText size={14} className="text-gray-400 flex-shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{r.file}</p>
                  <p className="text-xs text-gray-400">{r.user} · {r.date}</p>
                </div>
                <Badge className="bg-blue-50 text-blue-700">{r.type}</Badge>
                <span className="text-xs text-emerald-700 font-semibold">{r.count}</span>
                <button className="text-gray-300 hover:text-blue-500"><Download size={14}/></button>
              </div>
            ))}
          </div>
        </div>
      )}

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
                    return (
                      <div key={rest.id} className="border-b border-gray-50 last:border-0">
                        {/* Restaurant row */}
                        <div className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50/60 cursor-pointer transition-colors"
                          onClick={()=>setExpandedRest(isRExp?null:rest.id)}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{background:brand.color+"99"}}>{rest.name[0]}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm text-gray-800">{rest.name}</p>
                              <Badge className={rest.status==="active"?"bg-emerald-50 text-emerald-600 text-[10px]":"bg-red-50 text-red-600 text-[10px]"}>{rest.status==="active"?"نشط":"موقوف"}</Badge>
                            </div>
                            <p className="text-xs text-gray-400">{rest.city} · {rest.branches.length} فروع · {rest.accountants} محاسب مخصص</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Btn size="sm" variant="ghost" onClick={e=>{e.stopPropagation();}}><Edit2 size={11}/></Btn>
                            <ChevronDown size={13} className={`text-gray-400 transition-transform ${isRExp?"rotate-180":""}`}/>
                          </div>
                        </div>

                        {/* Branches table */}
                        {isRExp && (
                          <div className="mx-6 mb-3 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-100 border-b border-gray-200">
                              <p className="text-xs font-bold text-gray-600">الفروع ({rest.branches.length})</p>
                              <button className="text-xs text-purple-600 hover:underline flex items-center gap-1"><Plus size={11}/> إضافة فرع</button>
                            </div>
                            <table className="w-full text-xs" dir="rtl">
                              <thead><tr className="text-gray-400 font-semibold border-b border-gray-200">
                                <th className="px-4 py-2 text-right">اسم الفرع</th>
                                <th className="px-4 py-2 text-right">مدير الفرع</th>
                                <th className="px-4 py-2 text-center">إجراء</th>
                              </tr></thead>
                              <tbody className="divide-y divide-gray-100">
                                {rest.branches.map((br,bi)=>(
                                  <tr key={bi} className="hover:bg-white/80">
                                    <td className="px-4 py-2.5 font-medium text-gray-700">{br.name}</td>
                                    <td className="px-4 py-2.5 text-gray-500">{br.manager}</td>
                                    <td className="px-4 py-2.5 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <button className="p-1 rounded hover:bg-gray-200"><Edit2 size={11} className="text-gray-400"/></button>
                                        <button className="p-1 rounded hover:bg-gray-200"><Users size={11} className="text-gray-400"/></button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
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

function AdminReports({}: PageProps) {
  const [step, setStep] = useState(0);
  const [uploaded, setUploaded] = useState(false);
  const [reportType, setReportType] = useState<string>("pl");

  const reportTypes = [
    { id:"pl",      label:"قائمة الدخل",       sub:"P&L",               icon:"📈", color:"bg-purple-100 text-purple-700", border:"border-purple-300 bg-purple-50/40" },
    { id:"balance", label:"الميزانية العمومية", sub:"Balance Sheet",     icon:"⚖️", color:"bg-blue-100 text-blue-700",    border:"border-blue-300 bg-blue-50/40"   },
    { id:"cashflow",label:"التدفقات النقدية",  sub:"Cash Flow",         icon:"💧", color:"bg-cyan-100 text-cyan-700",    border:"border-cyan-300 bg-cyan-50/40"   },
    { id:"sales",   label:"تحليل المبيعات",    sub:"Sales Analysis",    icon:"🛒", color:"bg-emerald-100 text-emerald-700",border:"border-emerald-300 bg-emerald-50/40" },
    { id:"expenses",label:"تحليل المصروفات",   sub:"Expense Analysis",  icon:"💸", color:"bg-amber-100 text-amber-700",  border:"border-amber-300 bg-amber-50/40" },
    { id:"compare", label:"مقارنات الأداء",    sub:"Performance Comp.", icon:"📊", color:"bg-indigo-100 text-indigo-700",border:"border-indigo-300 bg-indigo-50/40"},
  ];
  const selectedType = reportTypes.find(r=>r.id===reportType)!;

  const previewRows: Record<string, {label:string;value:string;type:string;header?:boolean}[]> = {
    pl:[
      {label:"إجمالي الإيرادات",value:"842,500",type:"income",header:true},{label:"   مبيعات المطعم",value:"820,000",type:"income"},{label:"   إيرادات أخرى",value:"22,500",type:"income"},
      {label:"إجمالي المصروفات",value:"(612,000)",type:"expense",header:true},{label:"   تكلفة المواد الخام",value:"(320,000)",type:"expense"},{label:"   رواتب الموظفين",value:"(180,000)",type:"expense"},
      {label:"صافي الربح",value:"230,500",type:"profit",header:true},{label:"هامش الربح",value:"27.4%",type:"profit",header:true}
    ],
    balance:[
      {label:"الأصول المتداولة",value:"950,000",type:"income",header:true},{label:"   النقدية وما يعادلها",value:"420,000",type:"income"},{label:"   حسابات القبض",value:"310,000",type:"income"},{label:"   المخزون",value:"220,000",type:"income"},
      {label:"الأصول الثابتة",value:"1,200,000",type:"income",header:true},
      {label:"إجمالي الأصول",value:"2,150,000",type:"profit",header:true},
      {label:"الخصوم",value:"(890,000)",type:"expense",header:true},{label:"حقوق الملكية",value:"1,260,000",type:"profit",header:true},
    ],
    cashflow:[
      {label:"التدفقات التشغيلية",value:"315,000",type:"income",header:true},{label:"   صافي الدخل",value:"230,500",type:"income"},{label:"   الإهلاك",value:"85,000",type:"income"},
      {label:"التدفقات الاستثمارية",value:"(120,000)",type:"expense",header:true},{label:"   شراء أصول",value:"(120,000)",type:"expense"},
      {label:"التدفقات التمويلية",value:"(60,000)",type:"expense",header:true},
      {label:"صافي التدفق النقدي",value:"135,000",type:"profit",header:true},
    ],
    sales:[
      {label:"فرع الرياض - العليا",value:"320,000",type:"income",header:false},{label:"فرع جدة - الحمراء",value:"280,000",type:"income",header:false},{label:"فرع مكة - المعابدة",value:"242,500",type:"income",header:false},
      {label:"إجمالي المبيعات",value:"842,500",type:"profit",header:true},{label:"متوسط المبيعات / فرع",value:"280,833",type:"income",header:true},{label:"أعلى مبيعات",value:"فرع العليا",type:"profit",header:false},
    ],
    expenses:[
      {label:"تكلفة المواد الخام",value:"(320,000)",type:"expense",header:true},{label:"رواتب الموظفين",value:"(180,000)",type:"expense",header:false},{label:"إيجارات",value:"(65,000)",type:"expense",header:false},
      {label:"مصاريف إدارية",value:"(35,000)",type:"expense",header:false},{label:"مصاريف أخرى",value:"(12,000)",type:"expense",header:false},
      {label:"إجمالي المصروفات",value:"(612,000)",type:"expense",header:true},{label:"نسبة من الإيرادات",value:"72.6%",type:"profit",header:true},
    ],
    compare:[
      {label:"المبيعات — أكتوبر",value:"842,500",type:"income",header:false},{label:"المبيعات — سبتمبر",value:"791,000",type:"income",header:false},{label:"التغيير",value:"+6.5% ↑",type:"profit",header:false},
      {label:"المصروفات — أكتوبر",value:"612,000",type:"expense",header:false},{label:"المصروفات — سبتمبر",value:"589,000",type:"expense",header:false},{label:"التغيير",value:"+3.9% ↑",type:"expense",header:false},
      {label:"صافي الربح — أكتوبر",value:"230,500",type:"profit",header:true},{label:"صافي الربح — سبتمبر",value:"202,000",type:"profit",header:false},{label:"التحسن",value:"+14.1% ↑",type:"profit",header:false},
    ],
  };

  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-bold text-gray-800">مدير التقارير</h2><p className="text-gray-400 text-sm mt-0.5">استيراد تقارير ERP ومراجعتها وإرسالها لأصحاب المطاعم</p></div>

      {/* ── Report Type Selector ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-sm font-bold text-gray-700 mb-3">اختر نوع التقرير</p>
        <div className="grid grid-cols-3 gap-2.5">
          {reportTypes.map(rt=>(
            <button key={rt.id} onClick={()=>{ setReportType(rt.id); setStep(0); setUploaded(false); }}
              className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-right ${reportType===rt.id?rt.border:"border-gray-100 bg-white hover:border-gray-200"}`}>
              <span className="text-xl">{rt.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold ${reportType===rt.id?rt.color.split(" ")[1]:"text-gray-700"}`}>{rt.label}</p>
                <p className="text-[10px] text-gray-400">{rt.sub}</p>
              </div>
              {reportType===rt.id && <div className="w-4 h-4 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0"><span className="text-white text-[8px]">✓</span></div>}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-base">{selectedType.icon}</span>
          <span className="font-bold text-gray-800">{selectedType.label}</span>
          <Badge className={selectedType.color}>{selectedType.sub}</Badge>
        </div>
        <div className="flex items-center gap-0 mb-6">
          {[{n:1,label:"1. تصدير من ERP",icon:"🔗"},{n:2,label:"2. رفع Excel",icon:"📊"},{n:3,label:"3. مراجعة",icon:"👁"},{n:4,label:"4. الإرسال",icon:"📤"}].map((s,i)=>(
            <div key={i} className="flex items-center flex-1">
              <button onClick={()=>setStep(s.n-1)} className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl transition-all ${step===s.n-1?"bg-purple-600 text-white":step>s.n-1?"bg-emerald-100 text-emerald-700":"bg-gray-100 text-gray-400"}`}>
                <span>{step>=s.n?"✓":s.icon}</span><span className="text-xs font-semibold whitespace-nowrap">{s.label}</span>
              </button>
              {i<3 && <div className={`flex-1 h-0.5 mx-1 ${step>i?"bg-emerald-300":"bg-gray-200"}`}></div>}
            </div>
          ))}
        </div>
        {step===0 && <div className="text-center py-6 space-y-4">
          <div className="text-5xl">{selectedType.icon}</div>
          <h3 className="font-bold text-gray-800">تصدير {selectedType.label} من نظام ERP</h3>
          <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 text-right max-w-sm mx-auto">
            <p className="font-semibold mb-1">الخطوات في نظام ERP:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs"><li>افتح نظام ERP → التقارير</li><li>اختر {selectedType.label}</li><li>حدد الفترة الزمنية</li><li>اضغط تصدير Excel</li></ol>
          </div>
          <Btn variant="primary" onClick={()=>setStep(1)} className="mx-auto">انتقل لرفع الملف →</Btn>
        </div>}
        {step===1 && <div className="space-y-4">
          {!uploaded
            ? <div onClick={()=>setUploaded(true)} className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/20 transition-all">
                <div className="text-5xl mb-3">📊</div>
                <p className="font-semibold text-gray-700 mb-1">اسحب وأفلت ملف Excel هنا</p>
                <p className="text-xs text-gray-400 mb-4">أو اضغط للاختيار · xlsx, xls, csv</p>
                <Btn variant="primary" className="mx-auto"><Upload size={14}/> اختيار الملف</Btn>
              </div>
            : <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0"/>
                  <div><p className="font-semibold text-sm text-emerald-800">تم رفع الملف بنجاح</p><p className="text-xs text-emerald-600">تقرير_اكتوبر_2025.xlsx ✓</p></div>
                  <button onClick={()=>setUploaded(false)} className="mr-auto text-emerald-400 hover:text-emerald-600"><X size={14}/></button>
                </div>
                <Btn variant="primary" onClick={()=>setStep(2)} className="w-full justify-center">معاينة التقرير →</Btn>
              </div>
          }
        </div>}
        {step===2 && <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-800">معاينة: {selectedType.label}</h3>
            <Badge className="bg-blue-50 text-blue-700">للعرض فقط</Badge>
          </div>
          <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-purple-700 text-white px-5 py-3 text-center">
              <p className="font-bold">{selectedType.icon} {selectedType.label} — أكتوبر 2025</p>
              <p className="text-purple-200 text-xs mt-0.5">مطعم هرفي · جميع الفروع</p>
            </div>
            <table className="w-full" dir="rtl"><tbody className="divide-y divide-gray-200">
              {(previewRows[reportType] || previewRows["pl"]).map((row,i)=>(
                <tr key={i} className={row.header?"bg-gray-100":"bg-white"}>
                  <td className={`px-5 py-2.5 text-sm ${row.header?"font-bold text-gray-800":"text-gray-600"}`}>{row.label}</td>
                  <td className={`px-5 py-2.5 text-left font-mono text-sm ${row.type==="profit"?"text-emerald-700 font-bold":row.type==="expense"?"text-red-600":"text-gray-800"}`} dir="ltr">{row.value}</td>
                </tr>
              ))}
            </tbody></table>
          </div>
          <div className="flex gap-3"><Btn onClick={()=>setStep(1)}>← رجوع</Btn><Btn variant="primary" onClick={()=>setStep(3)} className="flex-1 justify-center">إرسال لأصحاب المطاعم →</Btn></div>
        </div>}
        {step===3 && <div className="space-y-4">
          <h3 className="font-bold text-gray-800">إرسال التقارير</h3>
          <div className="space-y-2">
            {["مطعم هرفي — طلال الحسين","ماكدونالدز السعودية — شركة المطعم العالمي","مطعم الريم — فيصل الريم"].map((r,i)=>(
              <label key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" defaultChecked className="rounded"/>
                <span className="text-sm font-medium text-gray-700">{r}</span>
                <span className="text-xs text-gray-400 mr-auto">البريد الإلكتروني + إشعار</span>
              </label>
            ))}
          </div>
          <div className="flex gap-3">
            <Btn onClick={()=>setStep(2)}>← رجوع</Btn>
            <button onClick={()=>{ setStep(0); setUploaded(false); }} className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700">📤 إرسال التقارير الآن</button>
          </div>
        </div>}
      </div>
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

  const matrix: {module:string; perms: Permission[]}[] = [
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
  ];

  const roleBadgeCls: Record<string,string> = {
    "محاسب":"bg-blue-50 text-blue-700","رئيس حسابات":"bg-amber-50 text-amber-700",
    "مدير فرع":"bg-emerald-50 text-emerald-700","مدير مشتريات":"bg-purple-50 text-purple-700",
    "مورد":"bg-orange-50 text-orange-700","أدمن":"bg-red-50 text-red-700",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">مصفوفة الصلاحيات</h2>
          <p className="text-gray-400 text-sm mt-0.5">صلاحيات الأدوار مع نطاق الوصول لكل علامة تجارية</p>
        </div>
        <div className="flex gap-1.5 flex-wrap justify-end">
          {(Object.keys(permCls) as Permission[]).filter(p=>p!=="none").map(p=>(
            <span key={p} className={`text-[10px] px-2 py-0.5 rounded-full border ${permCls[p]}`}>{permLabel[p]}</span>
          ))}
        </div>
      </div>

      {/* Scope row */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
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
              <tr key={i} className={`hover:bg-gray-50/50 ${i%2===0?"":"bg-gray-50/20"}`}>
                <td className="px-4 py-2.5 font-semibold text-gray-700">{row.module}</td>
                {row.perms.map((p,j)=>(
                  <td key={j} className="px-3 py-2.5 text-center">
                    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full border text-[10px] font-semibold min-w-[52px] ${permCls[p]}`}>
                      {permLabel[p]}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
    <AppShell
      state={appState} ops={ops}
      approveOp={approveOp} rejectOp={rejectOp} finalApproveOp={finalApproveOp} bulkApprove={bulkApprove}
      addCorrectiveOp={addCorrectiveOp} markErpPosted={markErpPosted}
      navigate={navigate} logout={logout} setModal={setModal} setDetailId={setDetailId}
    />
  );
}

export default ASABPrototype;
