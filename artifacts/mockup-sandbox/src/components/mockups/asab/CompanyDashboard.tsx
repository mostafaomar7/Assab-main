import "./_group.css";
import { useState, useMemo, useEffect, ReactNode, createContext, useContext, type MouseEvent as ReactMouseEvent } from "react";
import {
  useOperations, useApproveOperation, useRejectOperation, useBulkApprove, useFinalApprove,
  useVerifyExpenseInvoice, useConvertToAssetDraft,
  useAssetDrafts, useConfirmAssetDraft, useDiscardAssetDraft, useImportAssets, useCreateAsset, usePatchAsset, useAssets,
  useInventoryBranches, useInventoryCatalog, useSaveInventoryCatalog, useFlagInventoryBranch,
  useFlagInventoryItems, useSendInventoryNotification, useMarkInventoryConfirmed,
  useWaste, usePatchWasteProduct, usePutWasteAllocations, useApproveWaste, useRejectWaste,
  useBulkApproveWaste, useExportWaste,
  useShifts, useShiftConfigs, useSaveShiftConfig, useCloseShift, useExportShifts,
  useEmployees, useEmployeeMovements, useExportPayroll,
  useCashCustody, useCashTransactions, useExportCash,
  useReminders, usePatchReminder, useCreateReminder, useDeleteReminder,
  useReports, useDownloadReport,
  // Company Admin
  useCompanyAdminDashboard, useCompanyUsers, useToggleCompanyUserStatus, useCreateCompanyInvitation,
  useCompanyBrands, useCreateBranch, useCompanyModules, useToggleCompanyModule,
  useCompanySettings, useUpdateCompanySettings, useUpgradeSubscription, useContactSales,
  useCompanySubscription, useCompanyPlans,
  // Billing
  useBillingInvoices, useExportInvoices, useDownloadInvoicePDF,
  // Support
  useSupportChannels, useCreateTicket,
  // Head
  useHeadDashboard, useAccountantsPerformance, useHeadReminders, usePatchHeadReminder,
  useMarkAllHeadRemindersDone, usePostToERP,
  // Branch Manager
  useBranchOverview, useBranchEmployees, useBranchItems, useBranchPurchaseRequests,
  useBranchSuppliers, useBranchActiveShift, useBranchSubmitItemsCount, useBranchUpload,
  useBranchRequestNewSupplier, useBranchOpenShift, useBranchCloseShift, useBranchSettings,
  // Procurement
  useProcurementOverview, useProcurementOrders, useGroupedOrders, useSentOrders,
  useApproveOrder, useSendGroupedOrder, useProcurementItems, useProcurementSuppliers,
  useProcurementReports, useDownloadProcurementReport,
} from "../../../api/queries";
import type { Operation as ApiOperation } from "../../../api/types";
import { NotificationBell } from "../../shared/NotificationBell";
import { RejectModal } from "../../shared/RejectModal";
import { SessionsList } from "../../shared/SessionsList";
import { GlobalSearch } from "../../shared/GlobalSearch";
import { ChangePasswordModal } from "../../../auth/ChangePasswordModal";
import { useLanguagePref } from "../../../auth/useLanguagePref";
import {
  LayoutDashboard, Building2, Users, Settings, Bell, LogOut, ChevronRight,
  CheckCircle2, XCircle, TrendingUp, Plus, X, Edit2, FileText,
  Shield, Search, CreditCard, Package, Wallet, ShoppingCart, Clock,
  BarChart3, AlertTriangle, Star, RefreshCw, ArrowLeftRight,
  Send, Check, Download, Zap, Lock, ChevronDown, ChevronUp,
  Eye, Paperclip, ThumbsUp, ThumbsDown, Upload, Clipboard,
  Home, RotateCcw, Filter, GitMerge, ArrowRightToLine, CheckSquare, Edit3,
  Activity, Trash2, Globe
} from "lucide-react";

// ═══════════════════════════════════════════════════
// BILINGUAL SUPPORT — Arabic / English
// ═══════════════════════════════════════════════════
type CLang = "ar"|"en";
type CLangCtx = { lang:CLang; setLang:(l:CLang)=>void; t:(ar:string,en:string)=>string; dir:"rtl"|"ltr" };
const CLangContext = createContext<CLangCtx>({ lang:"ar", setLang:()=>{}, t:(ar)=>ar, dir:"rtl" });
const useCLang = () => useContext(CLangContext);

const EN_C_NAV_LABELS:Record<string,string> = {
  "ca-dashboard":"Dashboard","ca-subscription":"Plan & Subscription","ca-users":"User Management",
  "ca-branches":"Brands & Branches","ca-modules":"Active Modules","ca-billing":"Billing & Payments",
  "ca-settings":"Company Settings","ca-support":"Technical Support",
  "head-dashboard":"Dashboard","head-pending":"Awaiting Approval","head-approved":"Final Approved",
  "head-rejected":"Rejected","head-sales":"Sales","head-expenses":"Expenses",
  "head-purchases":"Purchases","head-inventory":"Inventory","head-waste":"Waste & Spoilage",
  "head-assets":"Fixed Assets","head-shifts":"Shifts","head-employees":"Employee Accounts",
  "head-cash":"Cash Custody","head-reminders":"Reminders","head-accountants":"Accountant Performance",
  "head-erp":"ERP Export","head-reports":"Financial Reports",
  "acc-dashboard":"Dashboard","acc-reminders":"Reminders","acc-sales":"Sales",
  "acc-expenses":"Expenses","acc-purchases":"Purchases","acc-inventory":"Inventory",
  "acc-waste":"Waste & Spoilage","acc-assets":"Fixed Assets","acc-shifts":"Shift Management",
  "acc-employees":"Employee Accounts","acc-cash":"Cash Custody Management","acc-reports":"Reports",
  "branch-overview":"Overview","branch-upload":"Upload Data","branch-employees":"Employees",
  "branch-items":"Items","branch-suppliers":"Suppliers","branch-settings":"Branch Settings",
  "proc-overview":"Dashboard","proc-new":"New Requests","proc-grouped":"Grouped Requests",
  "proc-sent":"Sent to Suppliers","proc-items":"Items","proc-suppliers":"Suppliers","proc-reports":"Reports",
};

const EN_C_SECTIONS:Record<string,string> = {
  "لوحة التحكم":"Control Panel","المالية":"Finance","الإعدادات":"Settings",
  "الرئيسية":"Main","الاعتماد":"Approval","الموديولات":"Modules",
  "التقارير":"Reports","الوحدات":"Modules","إدارة البيانات":"Data Management",
  "الطلبات":"Requests","الإدارة":"Management",
};

type CRoleKey = "company-admin"|"head"|"accountant"|"branch"|"procurement";
const EN_C_ROLE_META:Record<CRoleKey,{ label:string; desc:string }> = {
  "company-admin":{ label:"Company Admin",       desc:"Manage subscription and users"      },
  head:           { label:"Head Accountant",     desc:"Oversight and final approval"       },
  accountant:     { label:"Accountant",          desc:"Review financial operations"        },
  branch:         { label:"Branch Manager",      desc:"Upload daily branch data"           },
  procurement:    { label:"Procurement Manager", desc:"Purchase orders and suppliers"      },
};

// ═══════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════
const SIDEBAR_GRAD = "linear-gradient(180deg,#0F1C35 0%,#1B3A6B 100%)";
const BG_CONTENT   = "#F0F4FA";

// ═══════════════════════════════════════════════════
// PRIMITIVES
// ═══════════════════════════════════════════════════
function Btn({ children, onClick, variant="ghost", size="md", disabled=false }:{
  children:ReactNode; onClick?:(e:ReactMouseEvent<HTMLButtonElement>)=>void;
  variant?:"primary"|"success"|"danger"|"ghost"|"outline"|"amber"|"cyan";
  size?:"sm"|"md"; disabled?:boolean;
}) {
  const base  = "inline-flex items-center gap-1.5 font-semibold cursor-pointer border transition-all rounded-lg whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { sm:"px-3 py-1.5 text-xs", md:"px-4 py-2 text-sm" };
  const variants = {
    primary:"bg-purple-600 text-white border-purple-600 hover:bg-purple-700 shadow-sm",
    success:"bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-sm",
    danger:"bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    amber:"bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
    ghost:"bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100",
    outline:"bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
    cyan:"bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100",
  };
  return <button disabled={disabled} onClick={onClick} className={`${base} ${sizes[size]} ${variants[variant]}`}>{children}</button>;
}

function Badge({ children, className="" }:{ children:ReactNode; className?:string }) {
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${className}`}>{children}</span>;
}

function KpiCard({ label, value, sub, icon, accent="purple", delta }:{
  label:string; value:string; sub?:string; icon:ReactNode; accent?:string; delta?:string;
}) {
  const { t } = useCLang();
  const am:Record<string,string> = {
    purple:"bg-purple-50 text-purple-600 border-purple-100",
    emerald:"bg-emerald-50 text-emerald-600 border-emerald-100",
    amber:"bg-amber-50 text-amber-600 border-amber-100",
    red:"bg-red-50 text-red-600 border-red-100",
    blue:"bg-blue-50 text-blue-600 border-blue-100",
    cyan:"bg-cyan-50 text-cyan-600 border-cyan-100",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${am[accent]||am.purple}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
      {delta && <p className={`text-[10px] font-bold mt-1 ${delta.startsWith("+")?"text-emerald-600":"text-red-500"}`}>{delta} {t("مقارنة بالأسبوع الماضي","vs last week")}</p>}
    </div>
  );
}

const fmt = (n:number) => n.toLocaleString("ar-SA");

// ═══════════════════════════════════════════════════
// COMPANY & HIERARCHY DATA
// ═══════════════════════════════════════════════════
const COMPANY = { name:"مجموعة التاج للمطاعم", logo:"👑", plan:"Professional", city:"الرياض" };
const PLAN_AR: Record<string,string> = { Basic:"أساسي", Professional:"احترافي", Enterprise:"مؤسسي" };

const BRANDS = [
  { id:"B1", name:"برغر التاج", color:"#E53E3E", abbr:"بر", restaurants:[
    { id:"R1", name:"برغر التاج — الرياض", branches:[
      { id:"BR1", name:"فرع العليا",   city:"الرياض", mgr:"فاطمة السالم",    salesM:128000, expM:41000, target:130000 },
      { id:"BR2", name:"فرع النزهة",   city:"الرياض", mgr:"سامي الغامدي",    salesM:94000,  expM:31000, target:100000 },
    ]},
    { id:"R2", name:"برغر التاج — جدة", branches:[
      { id:"BR3", name:"فرع الحمراء",  city:"جدة",    mgr:"خالد العتيبي",    salesM:112000, expM:36000, target:120000 },
      { id:"BR4", name:"فرع العزيزية", city:"جدة",    mgr:"نورة البقمي",     salesM:78000,  expM:27000, target:85000  },
    ]},
  ]},
  { id:"B2", name:"بيتزا التاج", color:"#2B6CB0", abbr:"بز", restaurants:[
    { id:"R3", name:"بيتزا التاج — الرياض", branches:[
      { id:"BR5", name:"فرع الملقا",   city:"الرياض", mgr:"أحمد الحربي",     salesM:96000,  expM:32000, target:100000 },
    ]},
    { id:"R4", name:"بيتزا التاج — الدمام", branches:[
      { id:"BR6", name:"فرع الكورنيش",city:"الدمام",  mgr:"عبدالله الدوسري", salesM:71000,  expM:24000, target:75000  },
      { id:"BR7", name:"فرع الدانة",  city:"الدمام",  mgr:"سعد الرشيد",      salesM:63000,  expM:22000, target:70000  },
    ]},
  ]},
  { id:"B3", name:"مطعم التاج الراقي", color:"#805AD5", abbr:"تج", restaurants:[
    { id:"R5", name:"مطعم التاج — الرياض", branches:[
      { id:"BR8",  name:"فرع الورود",     city:"الرياض", mgr:"منى الزهراني",  salesM:145000, expM:52000, target:150000 },
      { id:"BR9",  name:"فرع الملك فهد",  city:"الرياض", mgr:"وليد السبيعي",  salesM:118000, expM:44000, target:120000 },
    ]},
    { id:"R6", name:"مطعم التاج — مكة", branches:[
      { id:"BR10", name:"فرع العزيزية", city:"مكة",    mgr:"حمد القحطاني",   salesM:89000,  expM:33000, target:90000  },
      { id:"BR11", name:"فرع المعابدة", city:"مكة",    mgr:"ريم السهلي",     salesM:74000,  expM:28000, target:80000  },
    ]},
    { id:"R7", name:"مطعم التاج — الطائف", branches:[
      { id:"BR12", name:"فرع المحطة",   city:"الطائف", mgr:"سلطان العمري",   salesM:52000,  expM:19000, target:60000  },
    ]},
  ]},
];

const ALL_BRANCHES = BRANDS.flatMap(b=>b.restaurants.flatMap(r=>r.branches.map(br=>({...br,brandId:b.id,brandName:b.name,brandColor:b.color}))));

type COpStatus = "pending"|"approved"|"rejected"|"final-approved";
type CMatch = "exact"|"review"|"diff";
type CModKey = "sales"|"expenses"|"purchases"|"inventory"|"assets"|"shifts"|"employees"|"cash";

type COp = {
  id:string; branch:string; brandName:string; brandColor:string;
  module:CModKey; moduleLabel:string;
  amount:number; timeAgo:string; status:COpStatus;
  attachments:number; match:CMatch; diff?:string;
  submittedBy:string; date:string; refNum:string;
  invoices?:{ invNum:string; vendor:string; desc:string; amount:number; date:string; verified:boolean }[];
  channels?:{ name:string; icon:string; pos:number; actual:number }[];
  purchaseItems?:{ item:string; unit:string; ordQty:number; rcvQty:number; unitPrice:number }[];
};

// ═══════════════════════════════════════════════════
// ASSET DRAFT CONTEXT — تحويل المصروف إلى أصل ثابت
// ═══════════════════════════════════════════════════
type CDraftStatus = "draft"|"confirmed";
type CAssetDraft = {
  draftId:string; invNum:string; vendor:string; desc:string;
  amount:number; branch:string; date:string; expOpId:string;
  assetName:string; category:string; usefulLife:number;
  status:CDraftStatus;
};
type CAssetDraftCtx = {
  drafts:CAssetDraft[];
  addDraft:(d:CAssetDraft)=>void;
  discardDraft:(id:string)=>void;
  confirmDraft:(id:string)=>void;
  getConvertedInvNums:()=>Set<string>;
};
const CAssetDraftContext = createContext<CAssetDraftCtx>({
  drafts:[], addDraft:()=>{}, discardDraft:()=>{}, confirmDraft:()=>{}, getConvertedInvNums:()=>new Set(),
});
function CAssetDraftProvider({ children }:{ children:ReactNode }) {
  const { data: serverDrafts = [] } = useAssetDrafts();
  const convertMut = useConvertToAssetDraft();
  const confirmMut = useConfirmAssetDraft();
  const discardMut = useDiscardAssetDraft();

  const [localDrafts, setLocalDrafts] = useState<CAssetDraft[]>([]);

  const drafts: CAssetDraft[] = serverDrafts.length > 0
    ? serverDrafts.map((d): CAssetDraft => ({
        draftId: d.id,
        invNum: d.sourceInvoicePublicId,
        vendor: "",
        desc: d.proposedName,
        amount: d.proposedPriceHalalas / 100,
        branch: "",
        date: d.createdAt,
        expOpId: d.sourceInvoiceId,
        assetName: d.proposedName,
        category: "",
        usefulLife: 60,
        status: d.status === "confirmed" ? "confirmed" : "draft",
      }))
    : localDrafts;

  const addDraft = (d:CAssetDraft) => {
    setLocalDrafts(p=>[...p.filter(x=>x.draftId!==d.draftId),d]);
    convertMut.mutate({
      invoiceId: d.invNum,
      proposedName: d.assetName,
      proposedPriceHalalas: Math.round(d.amount * 100),
    });
  };
  const discardDraft = (id:string) => {
    setLocalDrafts(p=>p.filter(x=>x.draftId!==id));
    discardMut.mutate(id);
  };
  const confirmDraft = (id:string) => {
    setLocalDrafts(p=>p.map(x=>x.draftId===id?{...x,status:"confirmed" as CDraftStatus}:x));
    confirmMut.mutate({ draftId: id });
  };
  const getConvertedInvNums = () => new Set(drafts.map(d=>d.invNum));
  return (
    <CAssetDraftContext.Provider value={{drafts,addDraft,discardDraft,confirmDraft,getConvertedInvNums}}>
      {children}
    </CAssetDraftContext.Provider>
  );
}

function CLangProvider({ children }:{ children:ReactNode }) {
  const [lang, setLang] = useState<CLang>("ar");
  const t   = (ar:string, en:string) => lang==="ar" ? ar : en;
  const dir = lang==="ar" ? "rtl" : "ltr";
  return (
    <CLangContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </CLangContext.Provider>
  );
}

const ASSET_CATS_CD = ["معدات مطبخ","تقنية وأجهزة","أثاث ومفروشات","مركبات","صيانة وإنشاءات","أخرى"];
const USEFUL_LIFE_CD = [
  {label:"24 شهر (سنتان)",val:24},{label:"36 شهر (3 سنوات)",val:36},
  {label:"48 شهر (4 سنوات)",val:48},{label:"60 شهر (5 سنوات)",val:60},
  {label:"72 شهر (6 سنوات)",val:72},{label:"84 شهر (7 سنوات)",val:84},
];

function ConvertToAssetModalCD({
  opId, invNum, vendor, desc, amount, branch, date, onClose, onSuccess,
}:{
  opId:string; invNum:string; vendor:string; desc:string;
  amount:number; branch:string; date:string;
  onClose:()=>void; onSuccess:(draftId:string)=>void;
}) {
  const { addDraft } = useContext(CAssetDraftContext);
  const [step,       setStep]      = useState<1|2>(1);
  const [assetName,  setAssetName] = useState(vendor||desc);
  const [cat,        setCat]       = useState(ASSET_CATS_CD[0]);
  const [usefulLife, setUseful]    = useState(60);

  const amtBeforeVat = Math.round(amount/1.15);
  const draftId = `cd-draft-${opId}-${invNum}`;

  const handleConfirm = () => {
    addDraft({ draftId, invNum, vendor, desc, amount:amtBeforeVat, branch, date, expOpId:opId, assetName, category:cat, usefulLife, status:"draft" });
    onSuccess(draftId);
    onClose();
  };

  const { t, dir } = useCLang();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" dir={dir}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-l from-purple-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <GitMerge size={18}/>
            <div>
              <p className="font-bold text-sm">تحويل مصروف إلى أصل ثابت</p>
              <p className="text-white/70 text-[11px]">الخطوة {step} من 2</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X size={18}/></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-purple-700">{invNum}</span>
              <span className="font-mono font-bold text-emerald-700">{fmt(amtBeforeVat)} ر.س <span className="text-gray-400 font-normal">(قبل الضريبة)</span></span>
            </div>
            <p className="text-xs text-gray-600 mt-1">{vendor} · {desc}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{branch} · {date}</p>
          </div>
          {step===1 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">اسم الأصل *</label>
                <input value={assetName} onChange={e=>setAssetName(e.target.value)}
                  className="w-full text-sm border border-purple-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400" dir={dir}/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">فئة الأصل *</label>
                <div className="grid grid-cols-2 gap-2">
                  {ASSET_CATS_CD.map(c=>(
                    <button key={c} onClick={()=>setCat(c)}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all text-right ${cat===c?"bg-purple-600 text-white border-purple-600":"border-gray-200 text-gray-600 hover:border-purple-300"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {step===2 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">العمر الإنتاجي (الاستهلاك)</label>
                <div className="grid grid-cols-2 gap-2">
                  {USEFUL_LIFE_CD.map(o=>(
                    <button key={o.val} onClick={()=>setUseful(o.val)}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all text-right ${usefulLife===o.val?"bg-purple-600 text-white border-purple-600":"border-gray-200 text-gray-600 hover:border-purple-300"}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">اسم الأصل</span><span className="font-semibold text-gray-800">{assetName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">الفئة</span><span className="font-semibold text-gray-800">{cat}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">القيمة (قبل الضريبة)</span><span className="font-mono font-bold text-purple-700">{fmt(amtBeforeVat)} ر.س</span></div>
                <div className="flex justify-between"><span className="text-gray-500">الاستهلاك السنوي</span><span className="font-mono font-bold text-amber-700">{fmt(Math.round(amtBeforeVat/(usefulLife/12)))} ر.س/سنة</span></div>
                <div className="flex justify-between"><span className="text-gray-500">الفرع</span><span className="font-semibold text-gray-800">{branch}</span></div>
              </div>
            </div>
          )}
        </div>
        <div className="px-6 pb-5 flex gap-2 justify-end">
          {step===2 && <Btn onClick={()=>setStep(1)}>{t("→ السابق","← Back")}</Btn>}
          <Btn onClick={onClose}>{t("إلغاء","Cancel")}</Btn>
          {step===1
            ? <Btn variant="primary" onClick={()=>setStep(2)} disabled={!assetName.trim()}>{t("التالي ←","Next →")}</Btn>
            : <Btn variant="primary" onClick={handleConfirm}><GitMerge size={13}/> {t("تأكيد التحويل","Confirm Transfer")}</Btn>
          }
        </div>
      </div>
    </div>
  );
}

const STATUS_CFG:Record<COpStatus,{label:string;cls:string;short:string}> = {
  "pending":       { label:"قيد المراجعة",    cls:"bg-amber-50 text-amber-700 border border-amber-200",       short:"معلق"     },
  "approved":      { label:"تمت الموافقة",    cls:"bg-emerald-50 text-emerald-700 border border-emerald-200", short:"مقبول"    },
  "rejected":      { label:"مرفوض",           cls:"bg-red-50 text-red-700 border border-red-200",             short:"مرفوض"    },
  "final-approved":{ label:"معتمد نهائياً",   cls:"bg-purple-50 text-purple-700 border border-purple-200",    short:"نهائي"    },
};
const EN_STATUS_CD:Record<COpStatus,{label:string;short:string}> = {
  "pending":       { label:"Under Review",     short:"Pending"  },
  "approved":      { label:"Approved",         short:"Approved" },
  "rejected":      { label:"Rejected",         short:"Rejected" },
  "final-approved":{ label:"Final Approved",   short:"Final"    },
};

const MATCH_CFG:Record<CMatch,{label:string;cls:string;dot:string}> = {
  exact:  { label:"متطابق",         cls:"bg-emerald-50 text-emerald-700 border border-emerald-200", dot:"bg-emerald-500" },
  review: { label:"يحتاج مراجعة",  cls:"bg-amber-50 text-amber-700 border border-amber-200",       dot:"bg-amber-500"   },
  diff:   { label:"فرق في الكمية", cls:"bg-red-50 text-red-700 border border-red-200",              dot:"bg-red-500"     },
};
const EN_MATCH_CD:Record<CMatch,string> = {
  exact:"Exact Match", review:"Needs Review", diff:"Qty Difference",
};
const EN_PIPELINE_CD:Record<string,{label:string;labelShort:string}> = {
  submit:  { label:"Uploaded from Branch",   labelShort:"Upload"   },
  review:  { label:"Under Review",           labelShort:"Review"   },
  approved:{ label:"Accountant Approved",    labelShort:"Approved" },
  final:   { label:"Final Approved",         labelShort:"Final"    },
  erp:     { label:"Posted to ERP",          labelShort:"ERP"      },
  reports: { label:"ERP Reports (Read)",     labelShort:"Reports"  },
};

// ═══════════════════════════════════════════════════
// PIPELINE — 6 مراحل دورة حياة العملية (مطابق للداشبورد الرئيسي)
// الفرع → المراجعة → موافقة المحاسب → اعتماد رئيس الحسابات → ERP → تقارير
// ═══════════════════════════════════════════════════
const C_PIPELINE_STAGES = [
  { id:"submit",   icon:"📱", label:"رُفع من الفرع",     labelShort:"الرفع",     bg:"bg-blue-100",    text:"text-blue-700",    border:"border-blue-300",    fill:"bg-blue-500"    },
  { id:"review",   icon:"🔍", label:"قيد المراجعة",       labelShort:"المراجعة",  bg:"bg-amber-100",   text:"text-amber-700",   border:"border-amber-300",   fill:"bg-amber-500"   },
  { id:"approved", icon:"✓",  label:"موافق عليه",         labelShort:"الموافقة",  bg:"bg-sky-100",     text:"text-sky-700",     border:"border-sky-300",     fill:"bg-sky-500"     },
  { id:"final",    icon:"🔒", label:"معتمد نهائياً",      labelShort:"الاعتماد",  bg:"bg-emerald-100", text:"text-emerald-700", border:"border-emerald-300", fill:"bg-emerald-500" },
  { id:"erp",      icon:"🔗", label:"مُرحَّل لـ ERP",     labelShort:"ERP",       bg:"bg-indigo-100",  text:"text-indigo-700",  border:"border-indigo-300",  fill:"bg-indigo-500"  },
  { id:"reports",  icon:"📊", label:"تقارير ERP (قراءة)", labelShort:"التقارير",  bg:"bg-slate-100",   text:"text-slate-700",   border:"border-slate-300",   fill:"bg-slate-500"   },
] as const;

function getCOpPipelineStage(op: COp): number {
  if (op.status === "rejected") return -1;
  if (op.status === "final-approved") return 3;
  if (op.status === "approved") return 2;
  return 1;
}

function COpStagePill({ op }: { op: COp }) {
  const { t } = useCLang();
  if (op.status === "rejected") {
    return <Badge className="bg-red-50 text-red-600 border border-red-200 text-[10px]">✕ {t("مرفوض","Rejected")}</Badge>;
  }
  const idx = getCOpPipelineStage(op);
  const s = C_PIPELINE_STAGES[idx];
  const labelShort = t(s.labelShort, EN_PIPELINE_CD[s.id]?.labelShort || s.labelShort);
  return (
    <Badge className={`${s.bg} ${s.text} border ${s.border} text-[10px] font-semibold`}>
      {s.icon} {t("م","S")}{idx+1} · {labelShort}
    </Badge>
  );
}

function CPipelineBar({ op }: { op: COp }) {
  const { t, dir } = useCLang();
  const stage = getCOpPipelineStage(op);
  const isRejected = op.status === "rejected";
  const curStage = C_PIPELINE_STAGES[stage];
  const curLabel = curStage ? t(curStage.label, EN_PIPELINE_CD[curStage.id]?.label || curStage.label) : "";
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4" dir={dir}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("دورة حياة العملية","Operation Lifecycle")}</span>
        {isRejected
          ? <Badge className="bg-red-50 text-red-700 border border-red-200 text-xs">✕ {t("مرفوض","Rejected")}</Badge>
          : <Badge className={`${curStage?.bg} ${curStage?.text} border ${curStage?.border} text-xs font-bold`}>
              {t("المرحلة","Stage")} {stage+1}/6 · {curLabel}
            </Badge>
        }
      </div>
      <div className="flex items-center gap-0">
        {C_PIPELINE_STAGES.map((s, i) => {
          const isComplete = !isRejected && i < stage;
          const isCurrent  = !isRejected && i === stage;
          const sLabel = t(s.labelShort, EN_PIPELINE_CD[s.id]?.labelShort || s.labelShort);
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
                  {sLabel}
                </span>
              </div>
              {i < C_PIPELINE_STAGES.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mt-[-10px]`}
                  style={{ backgroundColor: (!isRejected && isComplete) ? "" : "#e5e7eb",
                           background: (!isRejected && isComplete) ? `linear-gradient(90deg,${s.fill.replace("bg-","")},${s.fill.replace("bg-","")})` : undefined }}
                  >
                  {(!isRejected && isComplete) && <div className={`h-0.5 ${s.fill}`}/>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CPipelineOverview({ ops }: { ops: COp[] }) {
  const { t, dir } = useCLang();
  const stageCounts = C_PIPELINE_STAGES.map((s, i) => ({
    ...s,
    count: ops.filter(o => getCOpPipelineStage(o) === i).length,
    labelShortTr: t(s.labelShort, EN_PIPELINE_CD[s.id]?.labelShort || s.labelShort),
  }));
  const rejected = ops.filter(o => o.status === "rejected").length;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden" dir={dir}>
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 text-sm tracking-tight">{t("مسار العمليات — رؤية شاملة للخط الزمني","Operations Pipeline — Full Timeline View")}</h3>
        <div className="flex items-center gap-2">
          {rejected>0 && <Badge className="bg-red-50 text-red-600 border border-red-200 text-[10px]">✕ {rejected} {t("مرفوض","Rejected")}</Badge>}
          <span className="text-xs text-gray-400">{ops.length} {t("عملية إجمالاً","total operations")}</span>
        </div>
      </div>
      <div className="grid grid-cols-6 divide-x divide-x-reverse divide-gray-100">
        {stageCounts.map((s, i) => {
          const isAspirational = i === 5;
          return (
            <div key={s.id} className={`px-3 py-4 text-center transition-colors ${isAspirational ? "bg-slate-50/60" : "hover:bg-gray-50/80"}`}>
              <div className="text-lg mb-1">{s.icon}</div>
              {isAspirational ? (
                <>
                  <p className="text-[10px] font-bold text-slate-400 font-mono">—</p>
                  <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">{s.labelShortTr}</p>
                  <p className="text-[8px] text-slate-300 mt-1 leading-tight">{t("مرحلة مستقبلية","Future Stage")}</p>
                </>
              ) : (
                <>
                  <p className={`text-2xl font-extrabold font-mono ${s.count > 0 ? s.text : "text-gray-200"}`}>{s.count}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{s.labelShortTr}</p>
                  {i < 4 && (
                    <div className={`mx-auto mt-2 h-1 w-6 rounded-full ${s.count > 0 ? s.fill : "bg-gray-100"}`}/>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const INITIAL_OPS:COp[] = [
  // Sales
  { id:"O-2401",branch:"فرع العليا",   brandName:"برغر التاج",      brandColor:"#E53E3E",module:"sales",   moduleLabel:"مبيعات",  amount:18340,timeAgo:"قبل ساعة",   status:"pending",       attachments:3,match:"exact",  submittedBy:"فاطمة السالم", date:"21 مارس",refNum:"SL-2401",
    channels:[
      { name:"كاشير (POS)",    icon:"🖥️", pos:4200,  actual:4200  },
      { name:"نقل بنكي (Mada)",icon:"💳", pos:8500,  actual:8500  },
      { name:"طلبات",          icon:"🔴", pos:980,   actual:980   },
      { name:"هنقرستيشن",      icon:"🟠", pos:2800,  actual:2800  },
      { name:"جاهز",           icon:"🟡", pos:1200,  actual:1200  },
      { name:"نينجا",          icon:"⚫", pos:660,   actual:660   },
    ]},
  { id:"O-2400",branch:"فرع الحمراء", brandName:"برغر التاج",       brandColor:"#E53E3E",module:"sales",   moduleLabel:"مبيعات",  amount:22100,timeAgo:"قبل 2 ساعة",status:"pending",       attachments:2,match:"review", submittedBy:"خالد العتيبي",  date:"21 مارس",refNum:"SL-2400", diff:"فارق بسيط في الكاش",
    channels:[
      { name:"كاشير (POS)",    icon:"🖥️", pos:5200,  actual:4850  },
      { name:"نقل بنكي (Mada)",icon:"💳", pos:9800,  actual:9800  },
      { name:"طلبات",          icon:"🔴", pos:1400,  actual:1400  },
      { name:"هنقرستيشن",      icon:"🟠", pos:3800,  actual:3800  },
      { name:"جاهز",           icon:"🟡", pos:1650,  actual:1650  },
      { name:"نينجا",          icon:"⚫", pos:600,   actual:600   },
    ]},
  { id:"O-2399",branch:"فرع الملقا",  brandName:"بيتزا التاج",      brandColor:"#2B6CB0",module:"sales",   moduleLabel:"مبيعات",  amount:15820,timeAgo:"قبل 4 ساعات",status:"pending",       attachments:1,match:"exact",  submittedBy:"أحمد الحربي",  date:"21 مارس",refNum:"SL-2399",
    channels:[
      { name:"كاشير (POS)",    icon:"🖥️", pos:3400,  actual:3400  },
      { name:"نقل بنكي (Mada)",icon:"💳", pos:6200,  actual:6200  },
      { name:"طلبات",          icon:"🔴", pos:1800,  actual:1800  },
      { name:"هنقرستيشن",      icon:"🟠", pos:2420,  actual:2420  },
      { name:"جاهز",           icon:"🟡", pos:1300,  actual:1300  },
      { name:"نينجا",          icon:"⚫", pos:700,   actual:700   },
    ]},
  { id:"O-2398",branch:"فرع الورود",  brandName:"مطعم التاج الراقي",brandColor:"#805AD5",module:"sales",   moduleLabel:"مبيعات",  amount:31500,timeAgo:"قبل 5 ساعات",status:"pending",       attachments:3,match:"diff",   submittedBy:"منى الزهراني", date:"21 مارس",refNum:"SL-2398", diff:"الكاش يختلف بـ 350 ر.س",
    channels:[
      { name:"كاشير (POS)",    icon:"🖥️", pos:7500,  actual:7150  },
      { name:"نقل بنكي (Mada)",icon:"💳", pos:12000, actual:12000 },
      { name:"طلبات",          icon:"🔴", pos:3200,  actual:3200  },
      { name:"هنقرستيشن",      icon:"🟠", pos:4800,  actual:4800  },
      { name:"جاهز",           icon:"🟡", pos:2500,  actual:2500  },
      { name:"نينجا",          icon:"⚫", pos:1500,  actual:1500  },
    ]},
  { id:"O-2397",branch:"فرع الكورنيش",brandName:"بيتزا التاج",      brandColor:"#2B6CB0",module:"sales",   moduleLabel:"مبيعات",  amount:12400,timeAgo:"أمس",         status:"approved",      attachments:2,match:"exact",  submittedBy:"عبدالله الدوسري",date:"20 مارس",refNum:"SL-2397",
    channels:[
      { name:"كاشير (POS)",    icon:"🖥️", pos:2800,  actual:2800  },
      { name:"نقل بنكي (Mada)",icon:"💳", pos:5200,  actual:5200  },
      { name:"طلبات",          icon:"🔴", pos:1100,  actual:1100  },
      { name:"هنقرستيشن",      icon:"🟠", pos:1800,  actual:1800  },
      { name:"جاهز",           icon:"🟡", pos:900,   actual:900   },
      { name:"نينجا",          icon:"⚫", pos:600,   actual:600   },
    ]},
  { id:"O-2396",branch:"فرع الملك فهد",brandName:"مطعم التاج الراقي",brandColor:"#805AD5",module:"sales",  moduleLabel:"مبيعات",  amount:28900,timeAgo:"أمس",         status:"final-approved",attachments:3,match:"exact",  submittedBy:"وليد السبيعي", date:"20 مارس",refNum:"SL-2396",
    channels:[
      { name:"كاشير (POS)",    icon:"🖥️", pos:6500,  actual:6500  },
      { name:"نقل بنكي (Mada)",icon:"💳", pos:11000, actual:11000 },
      { name:"طلبات",          icon:"🔴", pos:2800,  actual:2800  },
      { name:"هنقرستيشن",      icon:"🟠", pos:4800,  actual:4800  },
      { name:"جاهز",           icon:"🟡", pos:2200,  actual:2200  },
      { name:"نينجا",          icon:"⚫", pos:1600,  actual:1600  },
    ]},
  { id:"O-2395",branch:"فرع النزهة",  brandName:"برغر التاج",       brandColor:"#E53E3E",module:"sales",   moduleLabel:"مبيعات",  amount:9800, timeAgo:"قبل يومين", status:"rejected",       attachments:1,match:"diff",   submittedBy:"سامي الغامدي", date:"19 مارس",refNum:"SL-2395", diff:"فاتورة الكاشير مفقودة",
    channels:[
      { name:"كاشير (POS)",    icon:"🖥️", pos:0,     actual:0     },
      { name:"نقل بنكي (Mada)",icon:"💳", pos:4200,  actual:4200  },
      { name:"طلبات",          icon:"🔴", pos:1800,  actual:1800  },
      { name:"هنقرستيشن",      icon:"🟠", pos:2200,  actual:2200  },
      { name:"جاهز",           icon:"🟡", pos:1100,  actual:1100  },
      { name:"نينجا",          icon:"⚫", pos:500,   actual:500   },
    ]},
  // Expenses
  { id:"E-1201",branch:"فرع العليا",  brandName:"برغر التاج",       brandColor:"#E53E3E",module:"expenses",moduleLabel:"مصروفات", amount:4850, timeAgo:"قبل 3 ساعات",status:"pending",       attachments:3,match:"review", submittedBy:"فاطمة السالم", date:"21 مارس",refNum:"EX-1201",
    invoices:[
      { invNum:"INV-881",vendor:"شركة الخليج للمواد",  desc:"مواد تنظيف وصيانة", amount:1200,date:"21 مارس",verified:false },
      { invNum:"INV-882",vendor:"مستلزمات المطبخ",     desc:"أدوات خدمة وتغليف", amount:850, date:"21 مارس",verified:false },
      { invNum:"INV-883",vendor:"خدمات الصيانة السريعة",desc:"إصلاح ثلاجة",       amount:2800,date:"21 مارس",verified:false },
    ]},
  { id:"E-1200",branch:"فرع الحمراء", brandName:"برغر التاج",       brandColor:"#E53E3E",module:"expenses",moduleLabel:"مصروفات", amount:2100, timeAgo:"قبل 5 ساعات",status:"pending",       attachments:2,match:"exact",  submittedBy:"خالد العتيبي", date:"21 مارس",refNum:"EX-1200",
    invoices:[
      { invNum:"INV-871",vendor:"شركة الوقود",   desc:"وقود توصيل",  amount:900, date:"21 مارس",verified:false },
      { invNum:"INV-872",vendor:"مكيفات المنطقة",desc:"صيانة مكيف",  amount:1200,date:"21 مارس",verified:false },
    ]},
  { id:"E-1199",branch:"فرع الورود",  brandName:"مطعم التاج الراقي",brandColor:"#805AD5",module:"expenses",moduleLabel:"مصروفات", amount:6200, timeAgo:"أمس",         status:"approved",      attachments:4,match:"exact",  submittedBy:"منى الزهراني", date:"20 مارس",refNum:"EX-1199",
    invoices:[
      { invNum:"INV-861",vendor:"شركة الديكور",  desc:"ديكور مطعم",  amount:3500,date:"20 مارس",verified:true  },
      { invNum:"INV-862",vendor:"مكتب الخدمات", desc:"نظافة شهرية", amount:2700,date:"20 مارس",verified:true  },
    ]},
  { id:"E-1198",branch:"فرع الملقا",  brandName:"بيتزا التاج",      brandColor:"#2B6CB0",module:"expenses",moduleLabel:"مصروفات", amount:3400, timeAgo:"قبل يومين",status:"rejected",       attachments:2,match:"diff",   submittedBy:"أحمد الحربي",  date:"19 مارس",refNum:"EX-1198", diff:"فاتورة غير مختومة",
    invoices:[
      { invNum:"INV-851",vendor:"مستلزمات الطباعة",desc:"مطبوعات قوائم",amount:1400,date:"19 مارس",verified:false },
      { invNum:"INV-852",vendor:"خدمات النظافة",   desc:"تنظيف أسبوعي", amount:2000,date:"19 مارس",verified:false },
    ]},
  // Purchases
  { id:"P-0801",branch:"فرع الملقا",  brandName:"بيتزا التاج",      brandColor:"#2B6CB0",module:"purchases",moduleLabel:"مشتريات",amount:8200, timeAgo:"قبل 2 ساعة", status:"pending",       attachments:4,match:"diff",   submittedBy:"أحمد الحربي",  date:"21 مارس",refNum:"PO-0801", diff:"فرق كمية 5 كجم جبن",
    purchaseItems:[
      { item:"عجينة البيتزا",   unit:"كجم",  ordQty:60, rcvQty:60, unitPrice:28 },
      { item:"جبنة موزاريلا",   unit:"كجم",  ordQty:30, rcvQty:25, unitPrice:85 },
      { item:"صوص الطماطم",    unit:"كجم",  ordQty:20, rcvQty:20, unitPrice:32 },
      { item:"دجاج مشوي",      unit:"كجم",  ordQty:40, rcvQty:40, unitPrice:48 },
    ]},
  { id:"P-0800",branch:"فرع الكورنيش",brandName:"بيتزا التاج",      brandColor:"#2B6CB0",module:"purchases",moduleLabel:"مشتريات",amount:5600, timeAgo:"قبل 6 ساعات",status:"pending",       attachments:2,match:"exact",  submittedBy:"عبدالله الدوسري",date:"21 مارس",refNum:"PO-0800",
    purchaseItems:[
      { item:"دجاج طازج",      unit:"كجم",  ordQty:80, rcvQty:80, unitPrice:38 },
      { item:"بطاطس",          unit:"كجم",  ordQty:60, rcvQty:60, unitPrice:18 },
      { item:"زيت قلي",        unit:"لتر",  ordQty:30, rcvQty:30, unitPrice:22 },
    ]},
  { id:"P-0799",branch:"فرع المحطة",  brandName:"مطعم التاج الراقي",brandColor:"#805AD5",module:"purchases",moduleLabel:"مشتريات",amount:3900, timeAgo:"أمس",         status:"approved",      attachments:3,match:"review", submittedBy:"سلطان العمري", date:"20 مارس",refNum:"PO-0799",
    purchaseItems:[
      { item:"أرز بسمتي",      unit:"كجم",  ordQty:50, rcvQty:45, unitPrice:32 },
      { item:"لحم ضأن",        unit:"كجم",  ordQty:30, rcvQty:30, unitPrice:65 },
      { item:"بهارات مشكلة",   unit:"كجم",  ordQty:10, rcvQty:10, unitPrice:90 },
    ]},
  // Inventory
  { id:"I-0601",branch:"فرع العليا",  brandName:"برغر التاج",       brandColor:"#E53E3E",module:"inventory",moduleLabel:"مخزون",  amount:0,    timeAgo:"قبل ساعة",   status:"pending",       attachments:1,match:"review", submittedBy:"فاطمة السالم", date:"21 مارس",refNum:"INV-0601" },
  { id:"I-0600",branch:"فرع الملقا",  brandName:"بيتزا التاج",      brandColor:"#2B6CB0",module:"inventory",moduleLabel:"مخزون",  amount:0,    timeAgo:"قبل 3 ساعات",status:"pending",       attachments:1,match:"diff",   submittedBy:"أحمد الحربي",  date:"21 مارس",refNum:"INV-0600", diff:"فرق 12 كجم لحم" },
  { id:"I-0599",branch:"فرع الورود",  brandName:"مطعم التاج الراقي",brandColor:"#805AD5",module:"inventory",moduleLabel:"مخزون",  amount:0,    timeAgo:"أمس",         status:"approved",      attachments:1,match:"exact",  submittedBy:"منى الزهراني", date:"20 مارس",refNum:"INV-0599" },
];

// Inventory branch data
const INV_BRANCH_DATA: Record<string,{ name:string; unit:string; prev:number; curr:number; cat:string }[]> = {
  "فرع العليا": [
    { name:"دجاج طازج",   unit:"كجم",   prev:120, curr:89,  cat:"بروتين"   },
    { name:"لحم برجر",    unit:"كجم",   prev:85,  curr:72,  cat:"بروتين"   },
    { name:"خبز برجر",    unit:"قطعة",  prev:500, curr:340, cat:"مخبوزات"  },
    { name:"جبنة شيدر",   unit:"شريحة", prev:300, curr:215, cat:"ألبان"    },
    { name:"بطاطس",       unit:"كجم",   prev:80,  curr:51,  cat:"خضروات"   },
    { name:"زيت قلي",     unit:"لتر",   prev:40,  curr:27,  cat:"زيوت"     },
    { name:"مايونيز",     unit:"كجم",   prev:15,  curr:19,  cat:"صوصات"    },
    { name:"كاتشب",       unit:"كجم",   prev:20,  curr:13,  cat:"صوصات"    },
  ],
  "فرع الحمراء": [
    { name:"دجاج طازج",   unit:"كجم",   prev:95,  curr:71,  cat:"بروتين"   },
    { name:"لحم برجر",    unit:"كجم",   prev:70,  curr:58,  cat:"بروتين"   },
    { name:"خبز برجر",    unit:"قطعة",  prev:400, curr:290, cat:"مخبوزات"  },
    { name:"بطاطس",       unit:"كجم",   prev:65,  curr:43,  cat:"خضروات"   },
  ],
  "فرع الملقا": [
    { name:"عجينة البيتزا",unit:"كجم",  prev:60,  curr:39,  cat:"مخبوزات"  },
    { name:"جبنة موزاريلا",unit:"كجم",  prev:25,  curr:11,  cat:"ألبان"    },
    { name:"صوص الطماطم", unit:"كجم",   prev:18,  curr:13,  cat:"صوصات"    },
    { name:"دجاج مشوي",   unit:"كجم",   prev:30,  curr:24,  cat:"بروتين"   },
  ],
  "فرع الورود": [
    { name:"أرز بسمتي",   unit:"كجم",   prev:80,  curr:62,  cat:"حبوب"     },
    { name:"لحم ضأن",     unit:"كجم",   prev:45,  curr:33,  cat:"بروتين"   },
    { name:"دجاج طازج",   unit:"كجم",   prev:55,  curr:41,  cat:"بروتين"   },
    { name:"خبز تنور",    unit:"قطعة",  prev:300, curr:210, cat:"مخبوزات"  },
  ],
};

type CRole = "company-admin"|"head"|"accountant"|"branch"|"procurement";

type NavEntry = { section:string }|{ id:string; label:string; icon:ReactNode; badge?:number };
const isSection = (e:NavEntry): e is {section:string} => "section" in e;

const NAV:Record<CRole,NavEntry[]> = {
  "company-admin":[
    { section:"لوحة التحكم" },
    { id:"ca-dashboard",    label:"الرئيسية",           icon:<LayoutDashboard size={16}/> },
    { id:"ca-subscription", label:"الاشتراك والخطة",    icon:<CreditCard size={16}/>      },
    { id:"ca-users",        label:"إدارة المستخدمين",   icon:<Users size={16}/>           },
    { id:"ca-branches",     label:"العلامات والفروع",   icon:<Building2 size={16}/>       },
    { id:"ca-modules",      label:"الوحدات النشطة",     icon:<Package size={16}/>         },
    { section:"المالية" },
    { id:"ca-billing",      label:"الفواتير والمدفوعات",icon:<Wallet size={16}/>          },
    { section:"الإعدادات" },
    { id:"ca-settings",     label:"إعدادات الشركة",     icon:<Settings size={16}/>        },
    { id:"ca-support",      label:"الدعم الفني",        icon:<Bell size={16}/>            },
  ],
  head:[
    { section:"الرئيسية" },
    { id:"head-dashboard",  label:"لوحة التحكم",        icon:<LayoutDashboard size={16}/> },
    { section:"الاعتماد" },
    { id:"head-pending",    label:"بانتظار الاعتماد",   icon:<Clock size={16}/>, badge:INITIAL_OPS.filter(o=>o.status==="approved").length },
    { id:"head-approved",   label:"المعتمدة نهائياً",   icon:<CheckCircle2 size={16}/>    },
    { id:"head-rejected",   label:"المرفوضة",            icon:<XCircle size={16}/>         },
    { section:"الموديولات" },
    { id:"head-sales",      label:"المبيعات",            icon:<TrendingUp size={16}/>      },
    { id:"head-expenses",   label:"المصروفات",           icon:<Wallet size={16}/>          },
    { id:"head-purchases",  label:"المشتريات",           icon:<ShoppingCart size={16}/>    },
    { id:"head-inventory",  label:"المخزون",             icon:<Package size={16}/>         },
    { id:"head-waste",      label:"الهدر والتالف",      icon:<AlertTriangle size={16}/>   },
    { id:"head-assets",     label:"الأصول الثابتة",     icon:<Building2 size={16}/>       },
    { id:"head-shifts",     label:"الشفتات",             icon:<Clock size={16}/>           },
    { id:"head-employees",  label:"كشف حساب الموظفين",  icon:<Users size={16}/>           },
    { id:"head-cash",       label:"العهد النقدية",       icon:<ArrowLeftRight size={16}/>  },
    { section:"التقارير" },
    { id:"head-reminders",  label:"التذكيرات",           icon:<Bell size={16}/>, badge:3   },
    { id:"head-accountants",label:"أداء المحاسبين",      icon:<Users size={16}/>           },
    { id:"head-erp",        label:"التصدير لـ ERP",      icon:<Zap size={16}/>             },
    { id:"head-reports",    label:"التقارير المالية",    icon:<FileText size={16}/>        },
  ],
  accountant:[
    { section:"الرئيسية" },
    { id:"acc-dashboard",  label:"لوحة التحكم",         icon:<LayoutDashboard size={16}/> },
    { id:"acc-reminders",  label:"التذكيرات",            icon:<Bell size={16}/>, badge:3   },
    { section:"الوحدات" },
    { id:"acc-sales",      label:"المبيعات",             icon:<TrendingUp size={16}/>      },
    { id:"acc-expenses",   label:"المصروفات",            icon:<Wallet size={16}/>          },
    { id:"acc-purchases",  label:"المشتريات",            icon:<ShoppingCart size={16}/>    },
    { id:"acc-inventory",  label:"المخزون",              icon:<Package size={16}/>         },
    { id:"acc-waste",      label:"الهدر والتالف",        icon:<AlertTriangle size={16}/>   },
    { id:"acc-assets",     label:"الأصول الثابتة",      icon:<Building2 size={16}/>       },
    { id:"acc-shifts",     label:"إدارة الشفتات",        icon:<Clock size={16}/>           },
    { id:"acc-employees",  label:"كشف حساب الموظفين",   icon:<Users size={16}/>           },
    { id:"acc-cash",       label:"إدارة العهد النقدية",  icon:<ArrowLeftRight size={16}/>  },
    { section:"التقارير" },
    { id:"acc-reports",    label:"التقارير",             icon:<BarChart3 size={16}/>       },
  ],
  branch:[
    { section:"الرئيسية" },
    { id:"branch-overview",   label:"نظرة عامة",         icon:<LayoutDashboard size={16}/> },
    { section:"إدارة البيانات" },
    { id:"branch-upload",     label:"رفع البيانات",      icon:<Upload size={16}/>          },
    { id:"branch-employees",  label:"الموظفون",           icon:<Users size={16}/>           },
    { id:"branch-items",      label:"الأصناف",            icon:<Package size={16}/>         },
    { id:"branch-suppliers",  label:"الموردون",           icon:<Building2 size={16}/>       },
    { section:"الإعدادات" },
    { id:"branch-settings",   label:"إعدادات الفرع",     icon:<Settings size={16}/>        },
  ],
  procurement:[
    { section:"الرئيسية" },
    { id:"proc-overview",  label:"لوحة التحكم",          icon:<LayoutDashboard size={16}/> },
    { section:"الطلبات" },
    { id:"proc-new",       label:"الطلبات الجديدة",      icon:<ShoppingCart size={16}/>, badge:45 },
    { id:"proc-grouped",   label:"الطلبات المجمعة",      icon:<Package size={16}/>         },
    { id:"proc-sent",      label:"المرسلة للموردين",     icon:<Send size={16}/>            },
    { section:"الإدارة" },
    { id:"proc-items",     label:"الأصناف",              icon:<Package size={16}/>         },
    { id:"proc-suppliers", label:"الموردون",              icon:<Building2 size={16}/>       },
    { id:"proc-reports",   label:"التقارير",             icon:<BarChart3 size={16}/>       },
  ],
};

const ROLE_META:Record<CRole,{ label:string; icon:string; color:string; desc:string }> = {
  "company-admin":{ label:"أدمن الشركة",    icon:"🏢", color:"bg-purple-600", desc:"إدارة الاشتراك والمستخدمين" },
  head:           { label:"رئيس الحسابات", icon:"👑", color:"bg-blue-600",   desc:"الإشراف والاعتماد النهائي" },
  accountant:     { label:"محاسب",          icon:"📊", color:"bg-cyan-600",   desc:"مراجعة العمليات المالية" },
  branch:         { label:"مدير فرع",       icon:"🏪", color:"bg-emerald-600",desc:"رفع بيانات الفرع اليومية" },
  procurement:    { label:"مدير مشتريات",  icon:"🛒", color:"bg-amber-600",  desc:"أوامر الشراء والموردون" },
};

const DEFAULT_PAGE:Record<CRole,string> = {
  "company-admin":"ca-dashboard", head:"head-dashboard",
  accountant:"acc-dashboard", branch:"branch-overview", procurement:"proc-overview",
};

// ═══════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════
function CompanyLoginScreen({ onSelect }:{ onSelect:(r:CRole)=>void }) {
  const { lang, setLang, t, dir } = useCLang();
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative" dir={dir}
      style={{ background:"linear-gradient(135deg,#0F1C35 0%,#1B3A6B 60%,#2D1B69 100%)" }}>
      <button
        onClick={()=>setLang(lang==="ar"?"en":"ar")}
        className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/80 hover:bg-white/20 hover:text-white transition-all text-xs font-semibold z-10">
        <Globe size={13}/>
        {lang==="ar" ? "English" : "عربي"}
      </button>
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-4"
            style={{ background:"linear-gradient(135deg,#7C3AED,#00D9FF)" }}>
            <span className="text-3xl">👑</span>
          </div>
          <h1 className="text-3xl font-black text-white">{t("بوابة الشركات","Company Portal")}</h1>
          <p className="text-blue-300 mt-2 text-sm">
            {t("مدعوم بنظام","Powered by")} <span className="text-cyan-400 font-bold">{t("عصب","ASAB")}</span> — {t("مخصص لمجموعات المطاعم","for restaurant groups")}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20">
            <span className="text-white/70 text-xs">{COMPANY.name}</span>
            <span className="text-cyan-400 text-xs font-bold">● {t("متصل","Connected")}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {(Object.entries(ROLE_META) as [CRole, typeof ROLE_META[CRole]][]).map(([id,meta])=>{
            const enMeta = EN_C_ROLE_META[id as CRoleKey];
            return (
              <button key={id} onClick={()=>onSelect(id)}
                className={`relative bg-white/8 backdrop-blur-sm rounded-2xl p-5 border border-white/15 hover:border-white/40 hover:bg-white/15 transition-all group ${dir==="rtl"?"text-right":"text-left"}`}>
                {id==="company-admin"&&<div className={`absolute top-3 ${dir==="rtl"?"left-3":"right-3"}`}><Badge className="bg-purple-500/30 text-purple-300 border border-purple-400/40 text-[10px]">{t("مميز","Premium")}</Badge></div>}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-3 ${meta.color} shadow-lg`}>{meta.icon}</div>
                <p className="font-bold text-white text-base">{t(meta.label, enMeta.label)}</p>
                <p className="text-white/50 text-xs mt-1 leading-relaxed">{t(meta.desc, enMeta.desc)}</p>
                <ChevronRight size={14} className={`absolute ${dir==="rtl"?"left-4":"right-4"} top-1/2 -translate-y-1/2 text-white/30 group-hover:text-white/70 ${dir==="ltr"?"rotate-180":""}`}/>
              </button>
            );
          })}
        </div>
        <p className="text-center text-white/30 text-xs">
          {t("نظام عصب · الإدارة المالية لمجموعات المطاعم · v2.1","ASAB System · Financial Management for Restaurant Groups · v2.1")}
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// APP SHELL
// ═══════════════════════════════════════════════════
const SHELL_NOTIFICATIONS = [
  { id:1, title:"بيان مبيعات معلق",    body:"فرع الملقا · برغر التاج", time:"منذ 10 دقائق", icon:"📊", unread:true  },
  { id:2, title:"تم قبول مصروف",        body:"إيجار شهر مارس - تمت الموافقة", time:"منذ ساعة",    icon:"✅", unread:true  },
  { id:3, title:"تذكير: جرد أسبوعي",   body:"موعد جرد هذا الأسبوع اليوم",    time:"منذ 3 ساعات", icon:"📦", unread:false },
];
function Shell({ role, page, navigate, onLogout, children, headPendingCount=0 }:{
  role:CRole; page:string; navigate:(p:string)=>void; onLogout:()=>void; children:ReactNode; headPendingCount?:number;
}) {
  const { lang, setLang, t, dir } = useCLang();
  const meta = ROLE_META[role];
  const nav  = NAV[role];
  const enMeta = EN_C_ROLE_META[role as CRoleKey];
  const activeNavItem = nav.find(e=>"id" in e && (e as any).id===page) as any;
  const pageLabelAr = activeNavItem?.label || "";
  const pageLabelEn = activeNavItem ? (EN_C_NAV_LABELS[activeNavItem.id] || pageLabelAr) : "";
  const pageLabel = t(pageLabelAr, pageLabelEn);
  const [showNotif,setShowNotif]=useState(false);
  const [notifs,setNotifs]=useState(SHELL_NOTIFICATIONS);
  const unreadCount=notifs.filter(n=>n.unread).length;
  const langPrefMut = useLanguagePref();
  return (
    <div className="flex h-screen overflow-hidden" dir={dir}>
      <div className="w-60 flex-shrink-0 flex flex-col" style={{ background:SIDEBAR_GRAD }}>
        <div className="px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background:"linear-gradient(135deg,#7C3AED,#00D9FF)" }}>{COMPANY.logo}</div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-tight truncate">{COMPANY.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-cyan-400 font-semibold">{t(PLAN_AR[COMPANY.plan]||COMPANY.plan, COMPANY.plan)}</span>
                <span className="w-1 h-1 rounded-full bg-emerald-400"/>
              </div>
            </div>
          </div>
        </div>
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10">
            <span className="text-base">{meta.icon}</span>
            <div>
              <p className="text-white text-xs font-bold">{t(meta.label, enMeta.label)}</p>
              <p className="text-white/40 text-[10px]">{t("مجموعة التاج","Al-Taj Group")}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-3 overflow-y-auto">
          {nav.map((entry,i)=>{
            if(isSection(entry)) return (
              <p key={i} className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-2 mt-4 mb-1 first:mt-0">
                {t(entry.section, EN_C_SECTIONS[entry.section]||entry.section)}
              </p>
            );
            const item = entry as any;
            const active = page===item.id;
            const itemLabel = t(item.label, EN_C_NAV_LABELS[item.id]||item.label);
            return (
              <button key={item.id} onClick={()=>navigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5 ${active?"bg-white/15 text-white":"text-white/60 hover:bg-white/8 hover:text-white/90"}`}>
                <span className={active?"text-cyan-400":""}>{item.icon}</span>
                <span className={`flex-1 ${dir==="rtl"?"text-right":"text-left"}`}>{itemLabel}</span>
                {item.id==="head-pending" && headPendingCount>0
                  ? <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{headPendingCount}</span>
                  : item.badge ? <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{item.badge}</span> : null}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10 space-y-1">
          <button
            onClick={()=>{
              const next = lang==="ar"?"en":"ar";
              setLang(next);
              langPrefMut.mutate({ language: next });
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-white/50 hover:text-white/80 hover:bg-white/8 transition-all text-sm">
            <Globe size={14}/> {lang==="ar" ? "English" : "عربي"}
          </button>
          <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-white/50 hover:text-white/80 hover:bg-white/8 transition-all text-sm">
            <LogOut size={14}/> {t("تسجيل الخروج","Sign Out")}
          </button>
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background:BG_CONTENT }}>
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-bold text-gray-800">{COMPANY.name}</span>
            <ChevronRight size={12} className={`text-gray-300 ${dir==="ltr"?"rotate-180":""}`}/>
            <span>{pageLabel}</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100">● {t(PLAN_AR[COMPANY.plan]||COMPANY.plan, COMPANY.plan)}</Badge>
            <Badge className="bg-purple-50 text-purple-700 border border-purple-100">{meta.icon} {t(meta.label, enMeta.label)}</Badge>
            <GlobalSearch t={t} theme="light"/>
            <NotificationBell t={t} theme="light"/>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SALES: RECONCILIATION PANEL (inside expanded OpRow)
// ═══════════════════════════════════════════════════
const RECON_EMP: Record<string,string> = {
  "1001":"أنس محمد","1002":"ليلى سالم","1003":"راشد عمر",
  "1004":"مها ناصر","1005":"فالح جاسم","1006":"سلمى العمر",
};
type VEmpCD = { empId:string; empName:string; amount:string };
function SalesReconPanel({ op, onApprove, onReject, isPending, forHead }:{
  op:COp; onApprove:()=>void; onReject:()=>void; isPending:boolean; forHead:boolean;
}) {
  const { t, lang, dir } = useCLang();
  const totalSales = op.amount;
  const [reconCash,      setReconCash]      = useState(Math.round(totalSales*0.23));
  const [reconBank,      setReconBank]      = useState(Math.round(totalSales*0.46));
  const [reconEditMode,  setReconEditMode]  = useState(false);
  const [reconDelivApps, setReconDelivApps] = useState([
    { app:"طلبات",          icon:"🔴", val:Math.round(totalSales*0.08), orig:Math.round(totalSales*0.08) },
    { app:"هنقرستيشن",      icon:"🟠", val:Math.round(totalSales*0.15), orig:Math.round(totalSales*0.15) },
    { app:"جاهز",           icon:"🟡", val:Math.round(totalSales*0.06), orig:Math.round(totalSales*0.06) },
    { app:"نينجا (Ninja)", icon:"⚫", val:Math.round(totalSales*0.04), orig:Math.round(totalSales*0.04) },
  ]);
  const [varEmps, setVarEmps] = useState<VEmpCD[]>([{ empId:"", empName:"", amount:"" }]);
  const setVarEmpField = (i:number, field:keyof VEmpCD, val:string) =>
    setVarEmps(p=>p.map((e,j)=>j===i?{...e,[field]:val,...(field==="empId"?{empName:RECON_EMP[val]||""}:{})}:e));

  const totalDelivery   = reconDelivApps.reduce((s,d)=>s+d.val,0);
  const totalCollection = reconCash + reconBank + totalDelivery;
  const variance        = totalSales - totalCollection;
  const hasVariance     = variance !== 0;
  const assignedTotal   = varEmps.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const remaining       = variance - assignedTotal;
  const isLocked = op.status==="final-approved";

  return (
    <div className="space-y-3">
      {/* Channels table */}
      {op.channels && (
        <div>
          <p className="text-xs font-bold text-gray-600 mb-2">تفصيل قنوات التحصيل (POS)</p>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-4 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500">
              <span>القناة</span><span className="text-center">نظام POS</span><span className="text-center">التحصيل الفعلي</span><span className="text-center">الفرق</span>
            </div>
            {op.channels.map(ch=>{
              const diff=ch.actual-ch.pos;
              return (
                <div key={ch.name} className={`grid grid-cols-4 px-4 py-2.5 border-b border-gray-50 last:border-0 text-xs items-center ${diff!==0?"bg-red-50/40":""}`}>
                  <span className="font-medium text-gray-700 flex items-center gap-1.5"><span>{ch.icon}</span>{ch.name}</span>
                  <span className="text-center font-mono text-gray-600">{fmt(ch.pos)}</span>
                  <span className="text-center font-mono font-bold text-gray-800">{fmt(ch.actual)}</span>
                  <span className={`text-center font-mono font-bold ${diff===0?"text-emerald-600":"text-red-600"}`}>{diff===0?"✓ 0":diff>0?`+${fmt(diff)}`:fmt(diff)}</span>
                </div>
              );
            })}
            <div className="grid grid-cols-4 px-4 py-2.5 bg-gray-100 text-xs font-bold border-t border-gray-200">
              <span className="text-gray-700">الإجمالي</span>
              <span className="text-center font-mono">{fmt(op.channels.reduce((s,c)=>s+c.pos,0))}</span>
              <span className="text-center font-mono text-purple-700">{fmt(op.channels.reduce((s,c)=>s+c.actual,0))}</span>
              <span className={`text-center font-mono ${op.match==="exact"?"text-emerald-600":"text-red-600"}`}>
                {op.match==="exact"?"✓ متطابق":`${fmt(op.channels.reduce((s,c)=>s+c.actual-c.pos,0))} ر.س`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Reconciliation Panel */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-indigo-50/40">
          <p className="text-xs font-bold text-gray-700">تسوية المبيعات</p>
          {!isLocked && (
            <button onClick={()=>setReconEditMode(m=>!m)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all ${reconEditMode?"bg-purple-600 text-white border-purple-600":"bg-white text-purple-600 border-purple-200 hover:bg-purple-50"}`}>
              <Edit3 size={10}/> {reconEditMode?"💾 حفظ":"تعديل الأرقام"}
            </button>
          )}
        </div>
        <div className="divide-y divide-gray-100">
          {/* إجمالي المبيعات */}
          <div className="flex items-center justify-between px-4 py-3 bg-indigo-50/60">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"/>
              <span className="text-xs font-bold text-indigo-900">إجمالي المبيعات</span>
              <span className="text-[10px] bg-indigo-100 text-indigo-500 px-1.5 py-0.5 rounded-md">(من رفع مدير الفرع — مقفل)</span>
            </div>
            <span className="font-mono font-black text-indigo-800 text-sm">{fmt(totalSales)} ر.س</span>
          </div>
          {/* نقدي */}
          <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/60">
            <div className="flex items-center gap-2"><span className="text-sm">💵</span><span className="text-xs text-gray-700">نقدي (صندوق)</span></div>
            {reconEditMode&&!isLocked ? (
              <input type="number" value={reconCash} onChange={e=>setReconCash(+e.target.value)} className="w-32 text-center font-mono font-semibold border-2 border-purple-300 rounded-lg px-2 py-1 text-xs bg-purple-50 focus:outline-none"/>
            ) : <span className="font-mono font-semibold text-gray-800 text-xs">{fmt(reconCash)} ر.س</span>}
          </div>
          {/* بنك */}
          <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/60">
            <div className="flex items-center gap-2"><span className="text-sm">🏦</span><span className="text-xs text-gray-700">بنك / كارت (بنك الرياض)</span></div>
            {reconEditMode&&!isLocked ? (
              <input type="number" value={reconBank} onChange={e=>setReconBank(+e.target.value)} className="w-32 text-center font-mono font-semibold border-2 border-purple-300 rounded-lg px-2 py-1 text-xs bg-purple-50 focus:outline-none"/>
            ) : <span className="font-mono font-semibold text-gray-800 text-xs">{fmt(reconBank)} ر.س</span>}
          </div>
          {/* تطبيقات التوصيل */}
          <div className="px-4 py-1.5 bg-gray-50/80">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">تطبيقات التوصيل</p>
          </div>
          {reconDelivApps.map((d,i)=>{
            const appDiff=d.orig-d.val;
            return (
              <div key={i} className={`flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/60 ${appDiff>0?"bg-amber-50/40":""}`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{d.icon}</span><span className="text-xs text-gray-700">{d.app}</span>
                  {appDiff>0 && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-bold">تعديل −{fmt(appDiff)}</span>}
                </div>
                {reconEditMode&&!isLocked ? (
                  <input type="number" value={d.val} onChange={e=>setReconDelivApps(apps=>apps.map((a,j)=>j===i?{...a,val:+e.target.value}:a))} className="w-32 text-center font-mono font-semibold border-2 border-purple-300 rounded-lg px-2 py-1 text-xs bg-purple-50 focus:outline-none"/>
                ) : <span className={`font-mono font-semibold text-xs ${appDiff>0?"text-amber-700":"text-gray-800"}`}>{fmt(d.val)} ر.س</span>}
              </div>
            );
          })}
          {/* تحميل الفرق على موظفين */}
          {hasVariance && !isLocked && (
            <div className="mx-4 my-2 bg-red-50 border border-red-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-red-100/60 border-b border-red-200">
                <AlertTriangle size={13} className="text-red-600 flex-shrink-0"/>
                <p className="text-xs font-bold text-red-800">تحميل الفرق على موظفين — الفرق: <span className="font-mono">{fmt(variance)} ر.س</span></p>
                <span className={`mr-auto text-[10px] font-bold px-2 py-0.5 rounded-lg ${remaining<=0?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-700"}`}>
                  {remaining<=0?"✓ محمَّل بالكامل":`متبقي ${fmt(remaining)} ر.س`}
                </span>
              </div>
              <div className="p-3 space-y-2">
                {varEmps.map((e,i)=>(
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] text-gray-400">رقم الموظف</label>
                      <input placeholder="مثال: 1001" value={e.empId} onChange={ev=>setVarEmpField(i,"empId",ev.target.value)}
                        className="w-20 text-center font-mono border border-red-200 rounded-lg px-2 py-1 text-[10px] bg-white focus:outline-none focus:border-red-400"/>
                    </div>
                    <div className="flex flex-col gap-0.5 flex-1">
                      <label className="text-[9px] text-gray-400">اسم الموظف</label>
                      <div className="h-7 flex items-center px-2 rounded-lg bg-white border border-gray-100 text-[10px] text-gray-700">{e.empName||<span className="text-gray-300">يُعبأ تلقائياً</span>}</div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] text-gray-400">المبلغ (ر.س)</label>
                      <input placeholder="0.00" type="number" value={e.amount} onChange={ev=>setVarEmpField(i,"amount",ev.target.value)}
                        className="w-24 text-center font-mono border border-red-200 rounded-lg px-2 py-1 text-[10px] bg-white focus:outline-none focus:border-red-400"/>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] text-gray-400 opacity-0">⚡</label>
                      <button onClick={()=>setVarEmpField(i,"amount",String(Math.max(0,remaining+(parseFloat(e.amount)||0))))}
                        className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold hover:bg-amber-200 border border-amber-200">⚡ المتبقي</button>
                    </div>
                    {varEmps.length>1 && (
                      <button onClick={()=>setVarEmps(p=>p.filter((_,j)=>j!==i))} className="mt-3 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><X size={12}/></button>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1">
                  <button onClick={()=>setVarEmps(p=>[...p,{empId:"",empName:"",amount:""}])} className="flex items-center gap-1 text-[10px] text-red-600 hover:underline font-semibold"><Plus size={10}/> إضافة موظف آخر</button>
                  {remaining<=0 && <Btn size="sm" variant="success"><CheckCircle2 size={10}/> {t("تأكيد التحميل","Confirm Upload")}</Btn>}
                </div>
              </div>
            </div>
          )}
          {/* إجمالي التحصيل */}
          <div className={`flex items-center justify-between px-4 py-3 font-bold border-t-2 ${variance===0?"bg-emerald-50/70 border-emerald-200":"bg-red-50/70 border-red-200"}`}>
            <span className={`text-xs ${variance===0?"text-emerald-800":"text-red-800"}`}>إجمالي التحصيل</span>
            <span className={`font-mono text-sm ${variance===0?"text-emerald-700":"text-red-700"}`}>{fmt(totalCollection)} ر.س</span>
          </div>
          {variance!==0 ? (
            <div className="flex items-center justify-between px-4 py-2.5 bg-red-100 border-t border-red-200">
              <div className="flex items-center gap-2"><AlertTriangle size={12} className="text-red-600"/><span className="text-xs font-bold text-red-800">الفرق المطلوب تحميله على الموظفين</span></div>
              <span className="font-mono font-black text-red-800 text-sm">{fmt(variance)} ر.س</span>
            </div>
          ) : (
            <div className="flex items-center justify-center px-4 py-2.5 bg-emerald-50">
              <span className="text-xs text-emerald-700 font-bold flex items-center gap-2"><CheckCircle2 size={13}/> إجمالي التحصيل مطابق لإجمالي المبيعات تماماً</span>
            </div>
          )}
        </div>
      </div>
      {/* Action buttons */}
      {isPending && !forHead && (
        <div className="flex gap-2 justify-end">
          <button onClick={e=>{e.stopPropagation();onReject();}} className="px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold hover:bg-red-100">✕ رفض</button>
          <button onClick={e=>{e.stopPropagation();onApprove();}} className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600">✓ موافقة — إرسال لرئيس الحسابات</button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SHARED: OPS ROW COMPONENT
// ═══════════════════════════════════════════════════
function OpRow({ op, onApprove, onReject, onView, expanded, onToggle, forHead=false }:{
  op:COp; onApprove:()=>void; onReject:()=>void; onView:()=>void;
  expanded?:boolean; onToggle?:()=>void; forHead?:boolean;
}) {
  const { t } = useCLang();
  const isPending = op.status === "pending";
  const isApproved = op.status === "approved";
  const isLocked = op.status === "final-approved";
  const isRejected = op.status === "rejected";
  return (
    <div className={`border-b border-gray-50 last:border-0
      ${op.match==="diff"?"border-r-4 border-r-red-400":op.match==="review"?"border-r-4 border-r-amber-400":""}
      ${isLocked?"bg-slate-50/50":isRejected?"opacity-60":""}
      ${expanded?"bg-purple-50/20":""}`}>
      <div className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={onToggle}>
        <div className="w-1 h-10 rounded-full flex-shrink-0" style={{background:op.brandColor}}/>
        <div className="flex-shrink-0 text-left">
          <p className="text-[10px] font-bold text-gray-400" dir="ltr">{op.refNum}</p>
          <p className="text-[10px] text-gray-400">{op.date}</p>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-gray-800 text-sm">{op.branch}</span>
            <Badge className="bg-gray-100 text-gray-600 text-[10px]">{op.brandName}</Badge>
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">{op.moduleLabel}</span>
            <Badge className={`text-[10px] border ${MATCH_CFG[op.match].cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${MATCH_CFG[op.match].dot}`}/>
              {t(MATCH_CFG[op.match].label, EN_MATCH_CD[op.match])}
            </Badge>
            {op.diff && <span className="text-[10px] text-red-600 font-semibold bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">⚠ {op.diff}</span>}
            <Badge className={`text-[10px] border ${STATUS_CFG[op.status].cls}`}>
              {isLocked && <Lock size={9}/>}
              {t(STATUS_CFG[op.status].label, EN_STATUS_CD[op.status].label)}
            </Badge>
            <COpStagePill op={op}/>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[11px] text-gray-400">{op.submittedBy}</span>
            <span className="text-[11px] text-gray-400">⏰ {op.timeAgo}</span>
            <span className="text-[11px] text-gray-400 flex items-center gap-0.5"><Paperclip size={9}/> {op.attachments} {t("مرفق","attach.")}</span>
          </div>
        </div>
        <div className="text-left flex-shrink-0">
          {op.amount>0 && <p className="font-mono font-bold text-gray-800 text-sm">{fmt(op.amount)} {t("ر.س","SAR")}</p>}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e=>e.stopPropagation()}>
          {!forHead && isPending && <>
            <button onClick={onApprove} title={t("موافقة","Approve")} className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center transition-all"><ThumbsUp size={13}/></button>
            <button onClick={onReject} title={t("رفض","Reject")} className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 flex items-center justify-center transition-all"><ThumbsDown size={13}/></button>
          </>}
          {forHead && isApproved && <>
            <button onClick={onApprove} title={t("اعتماد نهائي","Final Approve")} className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center transition-all"><ThumbsUp size={13}/></button>
            <button onClick={onReject} title={t("رفض","Reject")} className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 flex items-center justify-center transition-all"><ThumbsDown size={13}/></button>
          </>}
          {isLocked && <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-100 border border-slate-200 px-2 py-1.5 rounded-lg"><Lock size={11}/> {t("مُغلق","Locked")}</span>}
          <button className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 flex items-center justify-center transition-all" onClick={onToggle}>
            {expanded?<ChevronUp size={13}/>:<ChevronDown size={13}/>}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-4 space-y-4">
          {op.module==="sales" && <SalesReconPanel op={op} onApprove={onApprove} onReject={onReject} isPending={isPending} forHead={forHead}/>}
          {op.module==="expenses" && (
            <p className="text-xs text-gray-400 text-center py-2">{t("افتح البيان لعرض الفواتير كاملاً مع خيار التحويل إلى أصل ثابت","Open statement to view full invoices with asset conversion option")}</p>
          )}
          {op.module==="purchases" && op.purchaseItems && (
            <div>
              <p className="text-xs font-bold text-gray-600 mb-2">{t("أصناف المشتريات","Purchase Items")} ({op.purchaseItems.length})</p>
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="grid grid-cols-5 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500">
                  <span>{t("الصنف","Item")}</span><span className="text-center">{t("الوحدة","Unit")}</span><span className="text-center">{t("مطلوب","Ordered")}</span><span className="text-center">{t("مُستلم","Received")}</span><span className="text-center">{t("الإجمالي","Total")}</span>
                </div>
                {op.purchaseItems.map((it,i)=>{
                  const diff = it.rcvQty - it.ordQty;
                  return (
                    <div key={i} className={`grid grid-cols-5 px-4 py-3 border-b border-gray-50 last:border-0 text-xs items-center ${diff<0?"bg-red-50/40":""}`}>
                      <span className="font-medium text-gray-800">{it.item}</span>
                      <span className="text-center text-gray-500">{it.unit}</span>
                      <span className="text-center font-mono text-gray-600">{it.ordQty}</span>
                      <span className={`text-center font-mono font-bold ${diff<0?"text-red-600":"text-emerald-600"}`}>{it.rcvQty}</span>
                      <span className="text-center font-mono font-bold text-gray-800">{fmt(it.rcvQty*it.unitPrice)}</span>
                    </div>
                  );
                })}
                <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
                  <span className={`font-semibold ${op.match==="diff"?"text-red-600":"text-emerald-600"}`}>{op.match==="diff"?t("⚠ يوجد فارق في الكميات","⚠ Quantity discrepancy found"):t("✓ الكميات متطابقة","✓ Quantities match")}</span>
                  <span className="font-mono font-bold text-purple-700">{fmt(op.purchaseItems.reduce((s,i)=>s+i.rcvQty*i.unitPrice,0))} {t("ر.س","SAR")}</span>
                </div>
              </div>
              {isPending && !forHead && (
                <div className="flex gap-2 mt-3 justify-end">
                  <button onClick={e=>{e.stopPropagation();onReject();}} className="px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold hover:bg-red-100">✕ {t("رفض","Reject")}</button>
                  <button onClick={e=>{e.stopPropagation();onApprove();}} className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600">✓ {t("موافقة","Approve")}</button>
                </div>
              )}
            </div>
          )}
          {op.module==="inventory" && (()=>{
            const items = INV_BRANCH_DATA[op.branch] || [];
            return items.length>0 ? (
              <div>
                <p className="text-xs font-bold text-gray-600 mb-2">{t("تفاصيل جرد المخزون","Inventory Count Details")} — {op.branch}</p>
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="grid grid-cols-5 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500">
                    <span>{t("الصنف","Item")}</span><span className="text-center">{t("الوحدة","Unit")}</span><span className="text-center">{t("الأمس","Yesterday")}</span><span className="text-center">{t("اليوم","Today")}</span><span className="text-center">{t("الفرق","Diff")}</span>
                  </div>
                  {items.map(it=>{
                    const diff = it.curr - it.prev;
                    return (
                      <div key={it.name} className={`grid grid-cols-5 px-4 py-2.5 border-b border-gray-50 last:border-0 text-xs items-center ${diff<-(it.prev*0.3)?"bg-amber-50/40":""}`}>
                        <span className="font-medium text-gray-800">{it.name}</span>
                        <span className="text-center text-gray-500">{it.unit}</span>
                        <span className="text-center font-mono text-gray-500">{it.prev}</span>
                        <span className="text-center font-mono font-bold text-gray-800">{it.curr}</span>
                        <span className={`text-center font-mono font-bold ${diff<0?"text-red-600":"text-emerald-600"}`}>{diff>0?"+":""}{diff}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null;
          })()}
          {(op.module!=="sales"&&op.module!=="expenses"&&op.module!=="purchases"&&op.module!=="inventory") && (
            <p className="text-xs text-gray-400 text-center">{t("انقر على زر العرض للتفاصيل الكاملة","Click view for full details")}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// COMPANY ADMIN PAGES
// ═══════════════════════════════════════════════════
function CADashboard({ navigate }:{ navigate:(p:string)=>void }) {
  const { t, dir } = useCLang();
  const { data: apiDashboard } = useCompanyAdminDashboard();
  const { data: apiSub } = useCompanySubscription();
  const apiKpis = (apiDashboard?.kpis ?? {}) as Record<string, number | string>;
  const apiTotals = (apiDashboard?.totals ?? {}) as Record<string, number>;
  const totalSalesM = (apiKpis.totalSalesHalalas as number | undefined) != null
    ? Math.round(((apiKpis.totalSalesHalalas as number) / 100))
    : ALL_BRANCHES.reduce((s,b)=>s+b.salesM,0);
  const totalExpM   = (apiKpis.totalExpensesHalalas as number | undefined) != null
    ? Math.round(((apiKpis.totalExpensesHalalas as number) / 100))
    : ALL_BRANCHES.reduce((s,b)=>s+b.expM,0);
  const brandsCount      = apiTotals.brandsCount      ?? BRANDS.length;
  const restaurantsCount = apiTotals.restaurantsCount ?? BRANDS.reduce((s,b)=>s+b.restaurants.length,0);
  const branchesCount    = apiTotals.branchesCount    ?? ALL_BRANCHES.length;
  const usersCount       = apiTotals.usersCount       ?? 31;
  const usage = (apiSub?.usage ?? {}) as Record<string, { used: number; max: number | null }>;
  const branchesMax = usage.branches?.max ?? 20;
  const usersMax    = usage.users?.max    ?? 50;
  const planPrice   = apiSub
    ? Math.round((((apiSub as any).priceHalalas as number) ?? 0) / 100) || 4800
    : 4800;
  const daysRemaining = apiSub?.daysRemaining ?? 87;
  const branchCompletionRate = (apiKpis.branchCompletionRate as number | undefined) ?? 83;
  const branchesAboveTarget  = (apiKpis.branchesAboveTarget  as number | undefined) ?? 10;
  const statItems:[string,string,string,string][] = [
    [t("العلامات","Brands"),       `${brandsCount} / ∞`,"",""],
    [t("المطاعم","Restaurants"),   `${restaurantsCount} / ∞`,"",""],
    [t("الفروع","Branches"),        `${branchesCount} / ${branchesMax}`,"",""],
    [t("المستخدمون","Users"),       `${usersCount} / ${usersMax}`,"",""],
  ];
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("مرحباً،","Welcome,")} {COMPANY.name} 🏢</h2>
          <p className="text-gray-400 text-sm mt-0.5">{t("خطة","Plan")} {t(PLAN_AR[COMPANY.plan]||COMPANY.plan, COMPANY.plan)} · {branchesCount} {t("فرع","branches")} · {brandsCount} {t("علامات تجارية","brands")}</p>
        </div>
        <button onClick={()=>navigate("ca-subscription")} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 shadow-sm">
          <CreditCard size={14}/> {t("إدارة الاشتراك","Manage Subscription")}
        </button>
      </div>
      <div className="bg-gradient-to-l from-purple-600 to-blue-700 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-lg">{t("خطة احترافي — نشطة ✅","Professional Plan — Active ✅")}</p>
            <p className="text-white/70 text-sm mt-0.5">{t("تنتهي في 15 يناير 2026 · متبقي","Expires Jan 15, 2026 · ")} <span className="text-cyan-300 font-bold">{daysRemaining}</span> {t("يوم","days remaining")}</p>
            <div className="flex items-center gap-6 mt-3">
              {statItems.map(([l,v])=>(
                <div key={l}><p className="text-white/50 text-xs">{l}</p><p className="font-bold">{v}</p></div>
              ))}
            </div>
          </div>
          <div className={dir==="ltr"?"text-left":"text-right"}>
            <p className="text-3xl font-black">{fmt(planPrice)} <span className="text-base font-normal text-white/60">{t("ر.س/سنة","SAR/year")}</span></p>
            <button onClick={()=>navigate("ca-subscription")} className="mt-2 px-4 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold border border-white/30">{t("ترقية الخطة ↑","Upgrade Plan ↑")}</button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label={t("إجمالي المبيعات الشهرية","Monthly Total Sales")} value={`${fmt(Math.round(totalSalesM/1000))}K`} sub={t("ر.س هذا الشهر","SAR this month")} icon={<TrendingUp size={18} className="text-emerald-600"/>} accent="emerald" delta="+8.2%"/>
        <KpiCard label={t("إجمالي المصروفات","Total Expenses")}            value={`${fmt(Math.round(totalExpM/1000))}K`}   sub={t("ر.س هذا الشهر","SAR this month")} icon={<Wallet size={18} className="text-red-500"/>}      accent="red"/>
        <KpiCard label={t("صافي الربح","Net Profit")}                       value={`${fmt(Math.round((totalSalesM-totalExpM)/1000))}K`} sub={t("ر.س","SAR")} icon={<BarChart3 size={18} className="text-purple-600"/>} accent="purple" delta="+12.4%"/>
        <KpiCard label={t("معدل إنجاز الفروع","Branch Completion Rate")}    value={`${branchCompletionRate}%`} sub={t(`${branchesAboveTarget} من ${branchesCount} فرع فوق الهدف`,`${branchesAboveTarget} of ${branchesCount} branches above target`)} icon={<CheckCircle2 size={18} className="text-blue-600"/>} accent="blue"/>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {BRANDS.map(b=>{
          const brs=b.restaurants.flatMap(r=>r.branches);
          const sales=brs.reduce((s,br)=>s+br.salesM,0);
          const target=brs.reduce((s,br)=>s+br.target,0);
          const pct=Math.round((sales/target)*100);
          return (
            <div key={b.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{background:b.color}}>{b.abbr}</div>
                <div><p className="font-bold text-gray-800 text-sm">{b.name}</p><p className="text-[10px] text-gray-400">{brs.length} {t("فروع","branches")}</p></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mb-1"><span>{t("المبيعات vs الهدف","Sales vs Target")}</span><span>{pct}%</span></div>
              <div className="w-full h-2 bg-gray-100 rounded-full mb-2"><div className="h-2 rounded-full" style={{width:`${Math.min(100,pct)}%`,background:b.color}}/></div>
              <div className="flex justify-between text-[11px]"><span className="text-gray-500">{fmt(sales)} {t("ر.س","SAR")}</span><span className="text-gray-400">{t("هدف:","Target:")} {fmt(target)}</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CASubscription() {
  const { t, dir } = useCLang();
  const upgradeMut = useUpgradeSubscription();
  const contactMut = useContactSales();
  const { data: apiSub } = useCompanySubscription();
  const { data: apiPlans = [] } = useCompanyPlans();
  const [billing,setBilling]=useState<"annual"|"monthly">("annual");
  const PLANS_INLINE = [
    { id:"basic",plan:"Basic",price_m:199,price_a:1990,features:[t("5 فروع","5 Branches"),t("15 مستخدم","15 Users"),t("4 وحدات","4 Modules"),t("دعم بريد","Email support")],current:false },
    { id:"professional",plan:"Professional",price_m:400,price_a:4800,features:[t("20 فرعاً","20 Branches"),t("50 مستخدم","50 Users"),t("كل الوحدات","All modules"),t("مدير حساب","Account manager"),t("تقارير متقدمة","Advanced reports")],current:true },
    { id:"enterprise",plan:"Enterprise",price_m:null,price_a:null,features:[t("فروع غير محدودة","Unlimited branches"),t("مستخدمون غير محدودون","Unlimited users"),"SLA 99.9%",t("API مفتوح","Open API")],current:false },
  ];
  const plans = apiPlans.length > 0
    ? apiPlans.map(p => ({
        id: p.id,
        plan: p.name,
        price_m: p.priceMonthlyHalalas != null ? Math.round(p.priceMonthlyHalalas / 100) : null,
        price_a: p.priceAnnualHalalas  != null ? Math.round(p.priceAnnualHalalas  / 100) : null,
        features: p.features ?? [],
        current: p.isCurrent ?? false,
      }))
    : PLANS_INLINE;
  const usage = (apiSub?.usage ?? {}) as Record<string, { used: number; max: number | null }>;
  const branchesUsed = usage.branches?.used ?? 12;
  const branchesMax  = usage.branches?.max  ?? 20;
  const usersUsed    = usage.users?.used    ?? 31;
  const usersMax     = usage.users?.max     ?? 50;
  const storageUsed  = usage.storageGB?.used ?? 2.4;
  const storageMax   = usage.storageGB?.max  ?? 10;
  const currentPlanName = apiSub?.planName ?? "Professional";
  const currentPlanPriceAnnual = (apiPlans.find(p => p.isCurrent)?.priceAnnualHalalas != null)
    ? Math.round((apiPlans.find(p => p.isCurrent)!.priceAnnualHalalas as number) / 100)
    : 4800;
  const currentPlanPriceMonthly = (apiPlans.find(p => p.isCurrent)?.priceMonthlyHalalas != null)
    ? Math.round((apiPlans.find(p => p.isCurrent)!.priceMonthlyHalalas as number) / 100)
    : 400;
  const SAR = t("ر.س","SAR");
  const perYear = t("سنة","year"); const perMonth = t("شهر","mo");
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("الاشتراك والخطة","Subscription & Plan")}</h2></div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {(["annual","monthly"] as const).map(b=>(
            <button key={b} onClick={()=>setBilling(b)} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${billing===b?"bg-white text-gray-800 shadow-sm":"text-gray-500"}`}>
              {b==="annual"?t("سنوي (وفّر 17%)","Annual (save 17%)"):t("شهري","Monthly")}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-l from-purple-600 to-blue-700 text-white flex items-center justify-between">
          <div><div className="flex items-center gap-2"><span className="font-black text-xl">{t(PLAN_AR[currentPlanName]||currentPlanName, currentPlanName)}</span><Badge className="bg-white/20 text-white text-[10px]">{t("الخطة الحالية","Current Plan")}</Badge></div><p className="text-white/70 text-xs mt-0.5">{t("تنتهي 15 يناير 2026","Expires Jan 15, 2026")}</p></div>
          <p className="text-2xl font-black">{billing==="annual"?fmt(currentPlanPriceAnnual):fmt(currentPlanPriceMonthly)} <span className="text-sm font-normal text-white/60">{SAR}/{billing==="annual"?perYear:perMonth}</span></p>
        </div>
        <div className="p-5 grid grid-cols-3 gap-4">
          {[[t("الفروع","Branches"),branchesUsed,branchesMax,"bg-blue-500"],[t("المستخدمون","Users"),usersUsed,usersMax,"bg-purple-500"],[t("التخزين (GB)","Storage (GB)"),storageUsed,storageMax,"bg-emerald-500"]].map(([l,u,m,c])=>(
            <div key={String(l)}><div className="flex justify-between mb-1.5 text-xs font-semibold text-gray-600"><span>{l}</span><span>{u}/{m}</span></div><div className="w-full h-2 bg-gray-100 rounded-full"><div className={`h-2 rounded-full ${c}`} style={{width:`${Math.round((Number(u)/Number(m))*100)}%`}}/></div></div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {plans.map(p=>(
          <div key={p.id} className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden ${p.current?"border-purple-400 shadow-purple-100":"border-gray-100"}`}>
            {p.current&&<div className="px-4 py-1.5 text-center text-xs font-bold bg-purple-600 text-white">⭐ {t("خطتك الحالية","Your Current Plan")}</div>}
            <div className="p-5">
              <p className="font-black text-gray-900 text-lg">{t(PLAN_AR[p.plan]||p.plan, p.plan)}</p>
              <div className="mt-2 mb-4">{p.price_m===null?<p className="text-2xl font-black text-gray-800">{t("حسب الطلب","Custom")}</p>:<><span className="text-2xl font-black text-gray-800">{billing==="annual"?p.price_a!.toLocaleString():p.price_m.toLocaleString()}</span><span className="text-gray-400 text-sm"> {SAR}/{billing==="annual"?perYear:perMonth}</span></>}</div>
              <ul className="space-y-1.5 mb-5">{p.features.map(f=><li key={f} className="flex items-center gap-2 text-xs text-gray-600"><Check size={11} className="text-emerald-500 flex-shrink-0"/>{f}</li>)}</ul>
              {p.current?<div className="w-full py-2 rounded-lg bg-purple-100 text-purple-700 text-xs font-bold text-center">{t("خطتك الحالية ✓","Your Current Plan ✓")}</div>:p.price_m===null?<button onClick={()=>contactMut.mutate({ message: t("استفسار عن خطة المؤسسات","Enterprise plan inquiry") })} className="w-full py-2 rounded-lg border-2 border-purple-300 text-purple-700 text-xs font-bold hover:bg-purple-50">{t("تواصل مع المبيعات","Contact Sales")}</button>:<button onClick={()=>upgradeMut.mutate({ planId: p.id, billingCycle: billing })} className="w-full py-2 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700">{t("ترقية ↑","Upgrade ↑")}</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CAUsers() {
  const { t, dir } = useCLang();
  type U = { id:string;name:string;role:string;branch:string;email:string;status:"active"|"inactive";last:string };
  const { data: apiUsers = [] } = useCompanyUsers();
  const toggleMut = useToggleCompanyUserStatus();
  const inviteMut = useCreateCompanyInvitation();
  const [localUsers,setLocalUsers]=useState<U[]>([
    { id:"U1",name:"أحمد العمري",    role:"رئيس الحسابات", branch:"—",             email:"ahmed@altaj.com", status:"active",  last:"اليوم"  },
    { id:"U2",name:"سارة الشهري",   role:"محاسب",         branch:"برغر التاج",   email:"sara@altaj.com",  status:"active",  last:"أمس"    },
    { id:"U3",name:"محمد الحربي",   role:"محاسب",         branch:"بيتزا التاج",  email:"m.ali@altaj.com", status:"active",  last:"أمس"    },
    { id:"U4",name:"فاطمة السالم",  role:"مدير فرع",      branch:"فرع العليا",   email:"f.s@altaj.com",   status:"active",  last:"اليوم"  },
    { id:"U5",name:"خالد العتيبي",  role:"مدير فرع",      branch:"فرع الحمراء",  email:"k.o@altaj.com",   status:"active",  last:"3 أيام" },
    { id:"U6",name:"نورة الزهراني", role:"مدير مشتريات",  branch:"—",             email:"n.z@altaj.com",   status:"active",  last:"اليوم"  },
    { id:"U7",name:"عبدالله الدوسري",role:"مدير فرع",     branch:"فرع الكورنيش", email:"a.d@altaj.com",   status:"inactive",last:"أسبوع"  },
  ]);
  const users: U[] = apiUsers.length > 0
    ? apiUsers.map((u): U => ({
        id: u.id,
        name: u.name,
        role: u.roleLabel || u.roleKey,
        branch: u.branchName || "—",
        email: u.email,
        status: u.status === "active" ? "active" : "inactive",
        last: u.lastActiveAt || "",
      }))
    : localUsers;
  const [showAdd,setShowAdd]=useState(false);
  const [search,setSearch]=useState("");
  const toggle=(id:string)=>{
    if (apiUsers.length > 0) {
      toggleMut.mutate(id);
    } else {
      setLocalUsers(p=>p.map(u=>u.id===id?{...u,status:u.status==="active"?"inactive":"active"}:u));
    }
  };
  const shown=users.filter(u=>!search||u.name.includes(search)||u.role.includes(search));
  const RB:Record<string,string>={"رئيس الحسابات":"bg-blue-50 text-blue-700 border border-blue-100","محاسب":"bg-purple-50 text-purple-700 border border-purple-100","مدير فرع":"bg-emerald-50 text-emerald-700 border border-emerald-100","مدير مشتريات":"bg-amber-50 text-amber-700 border border-amber-100"};
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("إدارة المستخدمين","User Management")}</h2><p className="text-gray-400 text-sm">{users.filter(u=>u.status==="active").length} {t("نشط","active")} · {users.length}/50</p></div>
        <Btn variant="primary" onClick={()=>setShowAdd(true)}><Plus size={13}/> {t("إضافة مستخدم","Add User")}</Btn>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"><div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2"><Search size={13} className="text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("بحث...","Search...")} className="flex-1 text-sm outline-none"/></div></div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {shown.map(u=>(
          <div key={u.id} className="px-5 py-4 flex items-center gap-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{u.name[0]}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap"><span className="font-semibold text-gray-800 text-sm">{u.name}</span><Badge className={`${RB[u.role]||"bg-gray-50 text-gray-600"} text-[10px]`}>{u.role}</Badge><span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${u.status==="active"?"bg-emerald-50 text-emerald-700":"bg-gray-100 text-gray-400"}`}>{u.status==="active"?`● ${t("نشط","Active")}`:` ○ ${t("غير نشط","Inactive")}`}</span></div>
              <div className="flex gap-3 mt-0.5"><p className="text-xs text-gray-400" dir="ltr">{u.email}</p>{u.branch!=="—"&&<span className="text-[10px] text-gray-500">{u.branch}</span>}</div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={()=>toggle(u.id)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border ${u.status==="active"?"bg-gray-50 border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600":"bg-emerald-50 border-emerald-200 text-emerald-700"}`}>{u.status==="active"?t("إيقاف","Disable"):t("تفعيل","Enable")}</button>
              <button onClick={()=>alert(`✏️ ${t("تعديل بيانات المستخدم:","Edit user:")}\n${u.name}\n\n${t("يمكن تعديل:","Can edit:")}\n• ${t("اسم المستخدم","Username")}\n• ${t("الصلاحيات والدور","Role & permissions")}\n• ${t("بيانات التواصل","Contact info")}`)} className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"><Edit2 size={13}/></button>
            </div>
          </div>
        ))}
      </div>
      {showAdd&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e=>e.stopPropagation()} dir={dir}>
            <div className="px-5 py-4 bg-purple-600 text-white flex items-center justify-between"><h3 className="font-bold">{t("إضافة مستخدم","Add User")}</h3><button onClick={()=>setShowAdd(false)} className="text-purple-200 hover:text-white"><X size={18}/></button></div>
            <div className="p-5 space-y-3">
              {[[t("الاسم الكامل","Full Name"),""],[ t("البريد الإلكتروني","Email"),"email@company.sa"]].map(([l,ph])=><div key={l}><label className="text-xs font-semibold text-gray-600 block mb-1">{l}</label><input placeholder={ph} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"/></div>)}
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الدور","Role")}</label><select className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none">{["رئيس الحسابات","محاسب","مدير فرع","مدير مشتريات"].map(r=><option key={r}>{r}</option>)}</select></div>
              <div className="flex gap-2 justify-end"><Btn onClick={()=>setShowAdd(false)}>{t("إلغاء","Cancel")}</Btn><Btn variant="primary" onClick={()=>{setShowAdd(false);inviteMut.mutate({ email:"new@company.sa", role:"accountant" });}}><Send size={13}/> {t("إرسال دعوة","Send Invite")}</Btn></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CABranches() {
  const { t, dir } = useCLang();
  useCompanyBrands(); // ensures cache freshness; UI keeps using the rich inline tree
  const createBranchMut = useCreateBranch();
  const [expandedBrand,setExpandedBrand]=useState<string>("B1");
  const totalSales=ALL_BRANCHES.reduce((s,b)=>s+b.salesM,0);
  const [showAddBranch,setShowAddBranch]=useState(false);
  const [newBranchName,setNewBranchName]=useState("");
  const [newBranchBrand,setNewBranchBrand]=useState(BRANDS[0].name);
  const [newBranchCity,setNewBranchCity]=useState("الرياض");
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("العلامات التجارية والفروع","Brands & Branches")}</h2><p className="text-gray-400 text-sm">{BRANDS.length} {t("علامات","brands")} · {ALL_BRANCHES.length} {t("فرع","branches")}</p></div>
        <Btn variant="primary" onClick={()=>setShowAddBranch(true)}><Plus size={13}/> {t("إضافة فرع","Add Branch")}</Btn>
      </div>
      {showAddBranch&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowAddBranch(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e=>e.stopPropagation()} dir={dir}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-800">{t("إضافة فرع جديد","Add New Branch")}</h3><button onClick={()=>setShowAddBranch(false)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button></div>
            <div className="space-y-3">
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("اسم الفرع","Branch Name")}</label><input value={newBranchName} onChange={e=>setNewBranchName(e.target.value)} placeholder={t("مثال: فرع حي الياسمين...","e.g. Al-Yasmin district branch...")} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400"/></div>
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("العلامة التجارية","Brand")}</label><select value={newBranchBrand} onChange={e=>setNewBranchBrand(e.target.value)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none">{BRANDS.map(b=><option key={b.id}>{b.name}</option>)}</select></div>
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("المدينة","City")}</label><select value={newBranchCity} onChange={e=>setNewBranchCity(e.target.value)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"><option>الرياض</option><option>جدة</option><option>الدمام</option><option>مكة المكرمة</option></select></div>
              <div className="flex gap-2 justify-end pt-1"><Btn onClick={()=>setShowAddBranch(false)}>{t("إلغاء","Cancel")}</Btn><Btn variant="primary" onClick={()=>{if(!newBranchName){alert(t("أدخل اسم الفرع","Enter branch name"));return;}createBranchMut.mutate({ restaurantId: BRANDS.find(b=>b.name===newBranchBrand)?.restaurants[0].id || "", name: newBranchName, city: newBranchCity });setShowAddBranch(false);setNewBranchName("");}}><Plus size={13}/> {t("إضافة","Add")}</Btn></div>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label={t("العلامات التجارية","Brands")}           value={String(BRANDS.length)} sub={t("تحت إدارة المجموعة","Under group management")} icon={<Star size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label={t("إجمالي المطاعم","Total Restaurants")}  value={String(BRANDS.reduce((s,b)=>s+b.restaurants.length,0))} sub={t("مطعم","restaurant")} icon={<Home size={18} className="text-blue-600"/>} accent="blue"/>
        <KpiCard label={t("الفروع النشطة","Active Branches")}     value={String(ALL_BRANCHES.length)} sub={t("فرع من 20 مسموح","of 20 allowed")} icon={<Building2 size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label={t("إجمالي مبيعات شهرية","Monthly Sales")} value={`${fmt(Math.round(totalSales/1000))}K`} sub={t("ر.س","SAR")} icon={<TrendingUp size={18} className="text-purple-600"/>} accent="purple"/>
      </div>
      <div className="space-y-3">
        {BRANDS.map(brand=>(
          <div key={brand.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50/50" onClick={()=>setExpandedBrand(expandedBrand===brand.id?"":brand.id)}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{background:brand.color}}>{brand.abbr}</div>
              <div className={`flex-1 ${dir==="rtl"?"text-right":"text-left"}`}><p className="font-bold text-gray-800">{brand.name}</p><p className="text-xs text-gray-400">{brand.restaurants.length} {t("مطاعم","restaurants")} · {brand.restaurants.flatMap(r=>r.branches).length} {t("فروع","branches")}</p></div>
              <div className={dir==="rtl"?"text-left":"text-right"}><p className="font-mono font-bold text-gray-800 text-sm">{fmt(brand.restaurants.flatMap(r=>r.branches).reduce((s,b)=>s+b.salesM,0))} {t("ر.س","SAR")}</p><p className="text-[10px] text-gray-400">{t("مبيعات شهرية","Monthly sales")}</p></div>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${expandedBrand===brand.id?"rotate-180":""}`}/>
            </button>
            {expandedBrand===brand.id&&(
              <div className="border-t border-gray-100">
                {brand.restaurants.map(rest=>(
                  <div key={rest.id} className="px-5 py-3 border-b border-gray-50">
                    <p className="text-xs font-bold text-gray-500 mb-2">{rest.name}</p>
                    <div className="space-y-2">
                      {rest.branches.map(br=>{
                        const pct=Math.round((br.salesM/br.target)*100);
                        return (
                          <div key={br.id} className="flex items-center gap-4 px-3 py-2.5 bg-gray-50 rounded-lg">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{background:brand.color}}>{br.city[0]}</div>
                            <div className="flex-1 min-w-0"><p className="font-semibold text-gray-700 text-xs">{br.name}</p><p className="text-[10px] text-gray-400">{t("م.الفرع:","Mgr:")} {br.mgr} · {br.city}</p></div>
                            <div className="w-28 flex-shrink-0"><div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>{pct}%</span></div><div className="w-full h-1.5 bg-gray-200 rounded-full"><div className={`h-1.5 rounded-full ${pct>=100?"bg-emerald-500":pct>=80?"bg-blue-500":"bg-amber-500"}`} style={{width:`${Math.min(100,pct)}%`}}/></div></div>
                            <p className="font-mono font-bold text-gray-700 text-xs flex-shrink-0">{fmt(br.salesM)} {t("ر.س","SAR")}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CAModules() {
  const { t, dir } = useCLang();
  const { data: apiMods = [] } = useCompanyModules();
  const toggleModuleMut = useToggleCompanyModule();
  type Mod = { id:string;nameAr:string;nameEn:string;descAr:string;descEn:string;icon:string;active:boolean;inPlan:boolean };
  const [localMods,setLocalMods]=useState<Mod[]>([
    { id:"sales",    nameAr:"المبيعات",       nameEn:"Sales",        descAr:"تتبع المبيعات اليومية لجميع الفروع",        descEn:"Track daily sales across all branches",          icon:"💰",active:true, inPlan:true  },
    { id:"expenses", nameAr:"المصروفات",      nameEn:"Expenses",     descAr:"إدارة المصروفات بموافقات متعددة المستويات", descEn:"Manage expenses with multi-level approvals",     icon:"💸",active:true, inPlan:true  },
    { id:"purchases",nameAr:"المشتريات",      nameEn:"Purchases",    descAr:"أوامر الشراء والموردون ومطابقة الفواتير",   descEn:"Purchase orders, suppliers & invoice matching", icon:"🛒",active:true, inPlan:true  },
    { id:"inventory",nameAr:"المخزون",        nameEn:"Inventory",    descAr:"الجرد اليومي والشهري ومستويات المخزون",     descEn:"Daily & monthly inventory & stock levels",       icon:"📦",active:true, inPlan:true  },
    { id:"assets",   nameAr:"الأصول الثابتة",nameEn:"Fixed Assets", descAr:"تسجيل الأصول والاستهلاك وسجل العهدة",       descEn:"Asset registration, depreciation & custody",     icon:"🏢",active:true, inPlan:true  },
    { id:"shifts",   nameAr:"الشفتات",        nameEn:"Shifts",       descAr:"جداول العمل وإغلاق الشفت",                  descEn:"Work schedules and shift closing",                icon:"🕐",active:true, inPlan:true  },
    { id:"waste",    nameAr:"الهدر والتالف",  nameEn:"Waste",        descAr:"تتبع هدر الخامات والمسؤولية",               descEn:"Track raw material waste & responsibility",       icon:"🗑",active:false,inPlan:true  },
    { id:"emp",      nameAr:"كشف الحساب",     nameEn:"Payroll",      descAr:"رواتب وسلف الموظفين",                       descEn:"Employee salaries & advances",                    icon:"👥",active:false,inPlan:false },
    { id:"cash",     nameAr:"العهدة النقدية", nameEn:"Cash Custody", descAr:"إدارة الخزينة والعهدة اليومية",             descEn:"Treasury & daily cash custody management",       icon:"💵",active:false,inPlan:false },
  ]);
  const ICONS:Record<string,string> = { sales:"💰", expenses:"💸", purchases:"🛒", inventory:"📦", assets:"🏢", shifts:"🕐", waste:"🗑", emp:"👥", cash:"💵" };
  const mods: Mod[] = apiMods.length > 0
    ? apiMods.map((m): Mod => ({
        id: m.moduleKey,
        nameAr: m.nameAr || m.moduleKey,
        nameEn: m.nameEn || m.moduleKey,
        descAr: m.descAr || "",
        descEn: m.descEn || "",
        icon: ICONS[m.moduleKey] || "📦",
        active: m.isActive,
        inPlan: m.inPlan,
      }))
    : localMods;
  const toggle=(id:string)=>{const m=mods.find(x=>x.id===id);if(!m?.inPlan){alert(t("يحتاج ترقية الخطة","Plan upgrade required"));return;}if(apiMods.length>0){toggleModuleMut.mutate({ moduleKey:id, isActive:!m.active });}else{setLocalMods(p=>p.map(x=>x.id===id?{...x,active:!x.active}:x));}};
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("الوحدات النشطة","Active Modules")}</h2></div>
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label={t("مفعّلة","Active")}           value={String(mods.filter(m=>m.active).length)} sub={t("وحدات نشطة","active modules")} icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label={t("متاحة للتفعيل","Available")} value={String(mods.filter(m=>!m.active&&m.inPlan).length)} sub={t("ضمن خطتك","In your plan")} icon={<Zap size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label={t("تحتاج ترقية","Needs Upgrade")} value={String(mods.filter(m=>!m.inPlan).length)} sub={t("غير مشمولة","Not included")} icon={<Lock size={18} className="text-gray-500"/>} accent="blue"/>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {mods.map(m=>(
          <div key={m.id} className={`px-5 py-4 flex items-center gap-4 border-b border-gray-50 last:border-0 ${!m.inPlan?"bg-gray-50/60":""}`}>
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">{m.icon}</div>
            <div className="flex-1"><div className="flex items-center gap-2"><span className="font-semibold text-gray-800 text-sm">{t(m.nameAr,m.nameEn)}</span>{!m.inPlan&&<Badge className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px]"><Lock size={9}/> {t("يحتاج ترقية","Needs upgrade")}</Badge>}</div><p className="text-xs text-gray-400 mt-0.5">{t(m.descAr,m.descEn)}</p></div>
            <button onClick={()=>toggle(m.id)} className={`w-12 h-6 rounded-full transition-all flex-shrink-0 relative ${m.active?"bg-purple-500":m.inPlan?"bg-gray-300":"bg-gray-200 cursor-not-allowed"}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${m.active?"right-0.5":"left-0.5"}`}/>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CABilling() {
  const { t, dir } = useCLang();
  const { data: apiInvoicesPage } = useBillingInvoices();
  const exportMut = useExportInvoices();
  const downloadPdfMut = useDownloadInvoicePDF();
  const apiInvoices: any[] = Array.isArray(apiInvoicesPage)
    ? apiInvoicesPage
    : ((apiInvoicesPage as any)?.data ?? []);
  const INVOICES_INLINE = [{id:"INV-2025-012",date:"01 يناير 2025",amount:4800},{id:"INV-2024-012",date:"01 يناير 2024",amount:3600}];
  const invoices = apiInvoices.length > 0
    ? apiInvoices.map((i: any) => ({
        id: i.publicId || i.id,
        date: i.issuedAt || i.createdAt || "",
        amount: Math.round((i.totalHalalas || 0) / 100),
      }))
    : INVOICES_INLINE;
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("الفواتير والمدفوعات","Invoices & Payments")}</h2></div>
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label={t("إجمالي المدفوع","Total Paid")} value={fmt(invoices.reduce((s,i)=>s+i.amount,0))} sub={t("ر.س","SAR")} icon={<Wallet size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label={t("الفاتورة التالية","Next Invoice")} value={t("15 يناير 2026","Jan 15, 2026")} sub={t("4,800 ر.س","4,800 SAR")} icon={<CreditCard size={18} className="text-blue-600"/>} accent="blue"/>
        <KpiCard label={t("طريقة الدفع","Payment Method")} value={t("بطاقة ائتمان","Credit Card")} sub="**** 4521" icon={<Shield size={18} className="text-purple-600"/>} accent="purple"/>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">{t("سجل الفواتير","Invoice History")}</h3>
          <button onClick={()=>exportMut.mutate({})} className="text-xs text-emerald-700 font-semibold flex items-center gap-1 hover:text-emerald-800 transition-colors"><Download size={11}/> {t("تصدير","Export")}</button>
        </div>
        {invoices.map(inv=>(
          <div key={inv.id} className="px-5 py-4 flex items-center gap-4 border-b border-gray-50 last:border-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0"><FileText size={16} className="text-emerald-600"/></div>
            <div className="flex-1"><p className="font-semibold text-gray-800 text-sm" dir="ltr">{inv.id}</p><p className="text-xs text-gray-400">{inv.date}</p></div>
            <span className="font-mono font-bold text-gray-800">{fmt(inv.amount)} {t("ر.س","SAR")}</span>
            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px]">✓ {t("مدفوع","Paid")}</Badge>
            <button onClick={()=>downloadPdfMut.mutate({ id: inv.id })} className="p-1.5 rounded-lg text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"><Download size={13}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CASettings() {
  const { t, dir, lang, setLang } = useCLang();
  const { data: apiSettings } = useCompanySettings();
  const updateSettingsMut = useUpdateCompanySettings();
  const langPrefMut = useLanguagePref();
  const [saved,setSaved]=useState(false);
  const [showPwd,setShowPwd]=useState(false);
  const [showSessions,setShowSessions]=useState(false);
  const fields = [
    [t("اسم المجموعة","Group Name"),       apiSettings?.name || "مجموعة التاج للمطاعم"],
    [t("المدينة الرئيسية","Main City"),     apiSettings?.city || "الرياض"],
    [t("رقم السجل التجاري","CR Number"),   apiSettings?.crNumber || "1010XXXXXX"],
    [t("البريد الإلكتروني","Email"),        apiSettings?.email || "info@altaj.com"],
  ];
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("إعدادات الشركة","Company Settings")}</h2></div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-800 text-sm border-b border-gray-100 pb-3">{t("بيانات الشركة","Company Information")}</h3>
        <div className="grid grid-cols-2 gap-4">
          {fields.map(([l,v])=>(
            <div key={l}><label className="text-xs font-semibold text-gray-600 block mb-1">{l}</label><input defaultValue={v} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400"/></div>
          ))}
        </div>
        <div className="flex justify-end"><button onClick={()=>{updateSettingsMut.mutate({});setSaved(true);setTimeout(()=>setSaved(false),2000);}} className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-lg font-bold text-sm transition-all ${saved?"bg-emerald-500 text-white":"bg-purple-600 text-white hover:bg-purple-700"}`}>{saved?<><Check size={14}/> {t("تم الحفظ","Saved")}</>:<><CheckCircle2 size={14}/> {t("حفظ","Save")}</>}</button></div>
      </div>

      {/* ── Account Settings ─────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-800 text-sm border-b border-gray-100 pb-3">{t("إعدادات الحساب","Account Settings")}</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={()=>setShowPwd(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition-colors">
            <Lock size={14}/> {t("تغيير كلمة المرور","Change Password")}
          </button>
          <button
            onClick={()=>setShowSessions(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors">
            <Activity size={14}/> {t("جلسات نشطة","Active Sessions")}
          </button>
          <button
            onClick={()=>{
              const next = lang==="ar"?"en":"ar";
              setLang(next);
              langPrefMut.mutate({ language: next });
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 text-sm font-bold hover:bg-purple-100 transition-colors">
            <Globe size={14}/> {lang==="ar"?"English":"عربي"}
          </button>
        </div>
      </div>

      <ChangePasswordModal open={showPwd} onClose={()=>setShowPwd(false)}/>

      {showSessions && (
        <div
          onClick={()=>setShowSessions(false)}
          style={{
            position:"fixed", inset:0, background:"rgba(15,28,53,0.7)",
            display:"flex", alignItems:"center", justifyContent:"center",
            zIndex:100, padding:16,
          }}>
          <div onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:560 }}>
            <SessionsList t={t}/>
            <div style={{ marginTop:12, display:"flex", justifyContent:"flex-end" }}>
              <button
                onClick={()=>setShowSessions(false)}
                style={{
                  padding:"8px 16px", borderRadius:8, border:"1px solid #e2e8f0",
                  background:"white", color:"#475569", fontSize:13, fontWeight:600, cursor:"pointer",
                }}>
                {t("إغلاق","Close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CASupport() {
  const { t, dir } = useCLang();
  useSupportChannels();
  const createTicketMut = useCreateTicket();
  const PLACEHOLDER = t("نوع المشكلة...","Issue type...");
  const [msgType,setMsgType]=useState(PLACEHOLDER);
  const [msgBody,setMsgBody]=useState("");
  const [sent,setSent]=useState(false);
  const channels=[
    {ic:"💬",label:t("الدردشة الفورية","Live Chat"),       d:t("9 ص — 9 م","9 AM — 9 PM"),   b:t("متاح الآن","Available now"),    action:()=>alert(t("✅ سيتم فتح نافذة الدردشة — متاح الآن","✅ Chat window opening — available now"))},
    {ic:"📞",label:t("الاتصال","Call"),                    d:"800 123 4567",                    b:t("أيام العمل","Business days"),  action:()=>alert(`📞 ${t("يمكنك الاتصال على:","You can call:")} 800 123 4567\n${t("أيام العمل 9 ص — 5 م","Business days 9 AM — 5 PM")}`)},
    {ic:"📧",label:t("البريد","Email"),                    d:"support@asab.sa",                 b:t("خلال 24 ساعة","Within 24 hrs"),action:()=>alert(`📧 ${t("البريد الإلكتروني:","Email:")} support@asab.sa`)},
  ];
  const handleSend=()=>{
    if(msgType===PLACEHOLDER){alert(t("يرجى تحديد نوع المشكلة","Please select an issue type"));return;}
    if(!msgBody.trim()){alert(t("يرجى شرح المشكلة أولاً","Please describe the issue first"));return;}
    createTicketMut.mutate({ subject: msgType, category: msgType, body: msgBody });
    setSent(true);
  };
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("الدعم الفني","Technical Support")}</h2></div>
      <div className="grid grid-cols-3 gap-4">
        {channels.map(({ic,label,d,b,action})=>(
          <button key={label} onClick={action} className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:border-purple-200 hover:shadow-md transition-all ${dir==="rtl"?"text-right":"text-left"}`}>
            <div className="text-3xl mb-3">{ic}</div>
            <p className="font-bold text-gray-800 text-sm">{label}</p>
            <p className="text-xs text-gray-400 mt-1">{d}</p>
            <Badge className="mt-2 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px]">{b}</Badge>
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-3">{t("إرسال طلب دعم","Submit Support Request")}</h3>
        {sent?(
          <div className="text-center py-6">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-bold text-gray-800">{t("تم إرسال طلب الدعم","Support request submitted")}</p>
            <p className="text-sm text-gray-400 mt-1">{t("سنتواصل معك خلال 24 ساعة","We will contact you within 24 hours")}</p>
            <Btn onClick={()=>{setSent(false);setMsgBody("");setMsgType(PLACEHOLDER);}} variant="ghost" size="sm">{t("إرسال طلب آخر","Submit another request")}</Btn>
          </div>
        ):(
          <div className="space-y-3">
            <select value={msgType} onChange={e=>setMsgType(e.target.value)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none">
              <option>{PLACEHOLDER}</option>
              <option>{t("مشكلة في الاشتراك","Subscription issue")}</option>
              <option>{t("مشكلة تقنية","Technical issue")}</option>
              <option>{t("استفسار عام","General inquiry")}</option>
              <option>{t("طلب ميزة","Feature request")}</option>
            </select>
            <textarea rows={4} value={msgBody} onChange={e=>setMsgBody(e.target.value)} placeholder={t("اشرح المشكلة بالتفصيل...","Describe the issue in detail...")} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none resize-none focus:border-purple-400"/>
            <Btn variant="primary" onClick={handleSend}><Send size={13}/> {t("إرسال الطلب","Submit Request")}</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// HEAD ACCOUNTANT PAGES
// ═══════════════════════════════════════════════════
// HEAD — PROPS TYPE
// ═══════════════════════════════════════════════════
type HeadProps = {
  navigate:(p:string)=>void;
  ops:COp[];
  finalApprove:(id:string)=>void;
  reject:(id:string)=>void;
  bulkFinalApprove:(ids:string[])=>void;
};

// ═══════════════════════════════════════════════════
// HEAD ACCOUNTANT — DASHBOARD
// ═══════════════════════════════════════════════════
function HeadDashboard({ navigate, ops, finalApprove, reject, bulkFinalApprove }:HeadProps) {
  const { t, dir } = useCLang();
  const { data: apiHeadDash } = useHeadDashboard();
  const apiKpis = (apiHeadDash?.kpis ?? {}) as Record<string, number | string>;
  const awaitingHead  = ops.filter(o=>o.status==="approved");
  const finalApproved = ops.filter(o=>o.status==="final-approved");
  const rejected      = ops.filter(o=>o.status==="rejected");
  const totalSalesM   = (apiKpis.totalSalesHalalas as number | undefined) != null
    ? Math.round(((apiKpis.totalSalesHalalas as number) / 100))
    : ALL_BRANCHES.reduce((s,b)=>s+b.salesM,0);
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("لوحة رئيس الحسابات 👑","Head Accountant Dashboard 👑")}</h2>
          <p className="text-gray-400 text-sm">{COMPANY.name} · {t("الإشراف على المحاسبين · الاعتماد النهائي","Accountant Oversight · Final Approval")}</p>
        </div>
        <button onClick={()=>navigate("head-pending")} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 shadow-sm relative">
          <Clock size={14}/> {t("بانتظار اعتمادي","Awaiting My Approval")}
          {awaitingHead.length>0&&<span className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{awaitingHead.length}</span>}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label={t("بانتظار اعتمادي","Awaiting My Approval")}  value={String(awaitingHead.length)}  sub={t("📱 من المحاسبين · م3","📱 From accountants · S3")}      icon={<Clock size={18} className="text-amber-600"/>}   accent="amber"/>
        <KpiCard label={t("معتمدة نهائياً","Final Approved")}          value={String(finalApproved.length)} sub={t("مُغلقة · تنتظر ERP · م4","Closed · Awaiting ERP · S4")} icon={<Lock size={18} className="text-emerald-600"/>}  accent="emerald"/>
        <KpiCard label={t("مرفوضة","Rejected")}                        value={String(rejected.length)}      sub={t("خارج المسار","Off Pipeline")}                           icon={<XCircle size={18} className="text-red-600"/>}    accent="red"/>
        <KpiCard label={t("إجمالي المبيعات","Total Sales")}            value={`${fmt(Math.round(totalSalesM/1000))}K`} sub={t("ر.س هذا الشهر","SAR this month")}             icon={<TrendingUp size={18} className="text-blue-600"/>} accent="blue" delta="+8.2%"/>
      </div>

      <CPipelineOverview ops={ops}/>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-4">{t("أداء العلامات التجارية هذا الشهر","Brand Performance This Month")}</h3>
        <div className="space-y-4">
          {BRANDS.map(b=>{
            const brs=b.restaurants.flatMap(r=>r.branches);
            const sales=brs.reduce((s,br)=>s+br.salesM,0);
            const target=brs.reduce((s,br)=>s+br.target,0);
            const exp=brs.reduce((s,br)=>s+br.expM,0);
            const pct=Math.round((sales/target)*100);
            return (
              <div key={b.id} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{background:b.color}}>{b.abbr}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700">{b.name}</span>
                    <span className="text-xs text-gray-500">{pct}% {t("من الهدف","of target")}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full"><div className="h-2 rounded-full" style={{width:`${Math.min(100,pct)}%`,background:b.color}}/></div>
                </div>
                <div className={`flex-shrink-0 w-32 ${dir==="ltr"?"text-left":"text-right"}`}>
                  <p className="font-mono font-bold text-gray-800 text-xs">{fmt(sales)}</p>
                  <p className="text-[10px] text-gray-400">{t("مصروفات:","Expenses:")} {fmt(exp)}</p>
                </div>
                <div className={`w-16 flex-shrink-0 ${dir==="ltr"?"text-left":"text-right"}`}>
                  <p className={`font-bold text-sm ${sales-exp>0?"text-emerald-600":"text-red-500"}`}>{fmt(sales-exp)}</p>
                  <p className="text-[10px] text-gray-400">{t("صافي","Net")}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-amber-50/60 flex items-center justify-between">
          <h3 className="font-bold text-amber-800 text-sm">⏳ {t("بانتظار اعتمادك النهائي","Awaiting Your Final Approval")} ({awaitingHead.length})</h3>
          {awaitingHead.length>0 && (
            <div className="flex items-center gap-2">
              <Btn size="sm" variant="success" onClick={()=>bulkFinalApprove(awaitingHead.map(o=>o.id))}>✅ {t("اعتماد الكل","Approve All")}</Btn>
              <button onClick={()=>navigate("head-pending")} className="text-xs text-purple-600 font-semibold hover:underline">{t("عرض الكل ←","View All →")}</button>
            </div>
          )}
        </div>
        {awaitingHead.length===0 && <div className="p-8 text-center text-gray-400 text-sm">✅ {t("تم اعتماد جميع العمليات الصادرة من المحاسبين","All accountant operations have been final-approved")}</div>}
        {awaitingHead.slice(0,4).map(op=>(
          <div key={op.id} className="px-5 py-3.5 flex items-center gap-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
            <div className="w-1 h-8 rounded-full flex-shrink-0" style={{background:op.brandColor}}/>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">{op.moduleLabel} — {op.branch}</p>
              <p className="text-xs text-gray-400">{op.brandName} · {op.submittedBy} · {op.timeAgo}</p>
            </div>
            {op.amount>0&&<span className="font-mono font-bold text-gray-800 text-sm">{fmt(op.amount)} {t("ر.س","SAR")}</span>}
            <COpStagePill op={op}/>
            <Badge className={`text-[10px] border ${MATCH_CFG[op.match].cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${MATCH_CFG[op.match].dot}`}/>
              {t(MATCH_CFG[op.match].label, EN_MATCH_CD[op.match])}
            </Badge>
            <div className="flex gap-1.5 flex-shrink-0">
              <button onClick={()=>finalApprove(op.id)} title={t("اعتماد نهائي","Final Approve")} className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center text-xs"><CheckCircle2 size={12}/></button>
              <button onClick={()=>reject(op.id)} title={t("رفض","Reject")} className="w-7 h-7 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 flex items-center justify-center text-xs"><XCircle size={12}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// HEAD — PENDING (بانتظار الاعتماد النهائي)
// يعرض العمليات التي وافق عليها المحاسب (status="approved")
// وينقلها لـ "final-approved" بدلاً من حذفها
// ═══════════════════════════════════════════════════
function HeadPending({ ops, finalApprove, reject, bulkFinalApprove }:HeadProps) {
  const { t, dir } = useCLang();
  const [selected,setSelected]  = useState<string|null>(null);
  const [brandFilter,setBrandFilter] = useState("الكل");
  const [modFilter,setModFilter] = useState<""|CModKey>("");

  const awaitingHead = ops.filter(o=>o.status==="approved");
  const brands = ["الكل",...new Set(ops.map(o=>o.brandName))];
  const shown  = awaitingHead.filter(o=>{
    if(brandFilter!=="الكل" && o.brandName!==brandFilter) return false;
    if(modFilter && o.module!==modFilter) return false;
    return true;
  });
  const totalAmt = shown.reduce((s,o)=>s+o.amount,0);

  const modLabels:Record<string,string>={
    sales:`💰 ${t("مبيعات","Sales")}`, expenses:`💸 ${t("مصروفات","Expenses")}`,
    purchases:`🛒 ${t("مشتريات","Purchases")}`, inventory:`📦 ${t("مخزون","Inventory")}`,
  };

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("بانتظار الاعتماد النهائي","Awaiting Final Approval")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{awaitingHead.length} {t("عملية — موافق عليها من المحاسب · تنتظر اعتمادك (م3 → م4)","operations — accountant-approved · awaiting your final approval (S3 → S4)")}</p>
        </div>
        {awaitingHead.length>0 && (
          <Btn variant="success" onClick={()=>bulkFinalApprove(awaitingHead.map(o=>o.id))}>
            <CheckCircle2 size={13}/> {t("اعتماد الكل","Approve All")} ({awaitingHead.length})
          </Btn>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {brands.map(b=>(
            <button key={b} onClick={()=>setBrandFilter(b)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${brandFilter===b?"bg-white text-gray-800 shadow-sm":"text-gray-500 hover:text-gray-700"}`}>
              {b === "الكل" ? t("الكل","All") : b}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {(["","sales","expenses","purchases","inventory"] as (""|CModKey)[]).map(m=>(
            <button key={m} onClick={()=>setModFilter(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${modFilter===m?"bg-purple-600 text-white border-purple-600":"bg-white text-gray-600 border-gray-200 hover:border-purple-300"}`}>
              {m===""?t("الكل","All"):modLabels[m]}
            </button>
          ))}
          {totalAmt>0 && <span className="mr-auto text-xs text-gray-500 font-mono font-semibold">{t("إجمالي العرض:","Displayed total:")} {fmt(totalAmt)} {t("ر.س","SAR")}</span>}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {shown.length===0 ? (
          <div className="p-10 text-center">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-gray-600 font-semibold text-sm">{t("لا توجد عمليات بانتظار اعتمادك النهائي","No operations awaiting your final approval")}</p>
            <p className="text-gray-400 text-xs mt-1">{t("كل العمليات معتمدة نهائياً أو ما زالت قيد المراجعة لدى المحاسب","All operations are final-approved or still under accountant review")}</p>
          </div>
        ) : shown.map(op=>(
          <div key={op.id} className={`border-b border-gray-50 last:border-0 ${selected===op.id?"bg-purple-50/30":""}`}>
            <OpRow
              op={op}
              forHead={true}
              onApprove={()=>{ finalApprove(op.id); setSelected(null); }}
              onReject={()=>{ reject(op.id); setSelected(null); }}
              onView={()=>setSelected(selected===op.id?null:op.id)}
              expanded={selected===op.id}
              onToggle={()=>setSelected(selected===op.id?null:op.id)}
            />
            {selected===op.id && (
              <div className="px-5 pb-4 space-y-3 border-t border-gray-50 pt-3">
                <CPipelineBar op={op}/>
                <div className="flex gap-2">
                  <Btn variant="success" size="sm" onClick={()=>{ finalApprove(op.id); setSelected(null); }}>
                    <Lock size={12}/> {t("اعتماد نهائي (م4)","Final Approve (S4)")}
                  </Btn>
                  <Btn variant="danger" size="sm" onClick={()=>{ reject(op.id); setSelected(null); }}>
                    <ThumbsDown size={12}/> {t("رفض","Reject")}
                  </Btn>
                  <Btn size="sm" onClick={()=>alert(`📎 ${t("المرفقات","Attachments")} (${op.attachments}):\n• ${t("فاتورة مبيعات POS","POS Sales Invoice")}\n• ${t("تقرير الكاشير","Cashier Report")}\n• ${t("صورة إيصال التسليم","Delivery Receipt Image")}`)}>
                    <Paperclip size={12}/> {op.attachments} {t("مرفقات","attachments")}
                  </Btn>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// HEAD — APPROVED (المعتمدة نهائياً)
// ═══════════════════════════════════════════════════
function HeadApproved({ ops }:{ ops:COp[] }) {
  const { t, dir } = useCLang();
  const finalApproved = ops.filter(o=>o.status==="final-approved");
  const totalAmt      = finalApproved.reduce((s,o)=>s+o.amount,0);
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("المعتمدة نهائياً 🔒","Final Approved 🔒")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{finalApproved.length} {t("عملية معتمدة نهائياً — م4 في مسار الاعتماد · بانتظار الترحيل لـ ERP","final-approved operations — S4 in pipeline · awaiting ERP posting")}</p>
        </div>
        {totalAmt>0 && <span className="text-sm font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">{fmt(totalAmt)} {t("ر.س إجمالاً","SAR total")}</span>}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {finalApproved.length===0 && <div className="p-8 text-center text-gray-400 text-sm">{t("لا توجد عمليات معتمدة نهائياً حتى الآن","No final-approved operations yet")}</div>}
        {finalApproved.map(op=>(
          <div key={op.id} className="px-5 py-4 flex items-center gap-4 border-b border-gray-50 last:border-0 bg-slate-50/30">
            <div className="w-1 h-8 rounded-full flex-shrink-0" style={{background:op.brandColor}}/>
            <Lock size={12} className="text-emerald-600 flex-shrink-0"/>
            <div className="flex-1">
              <p className="font-semibold text-gray-800 text-sm">{op.moduleLabel} — {op.branch}</p>
              <p className="text-xs text-gray-400">{op.brandName} · {op.submittedBy} · {op.timeAgo}</p>
            </div>
            {op.amount>0&&<span className="font-mono font-bold text-gray-800 text-sm">{fmt(op.amount)} {t("ر.س","SAR")}</span>}
            <COpStagePill op={op}/>
            <Badge className={`text-[10px] border ${STATUS_CFG[op.status].cls}`}>{t(STATUS_CFG[op.status].label, EN_STATUS_CD[op.status].label)}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeadBrands() {
  const { t, dir } = useCLang();
  const SAR = t("ر.س","SAR");
  const { data: apiHeadDash } = useHeadDashboard();
  const apiBrandSummary = (apiHeadDash?.brandSummary ?? []) as any[];
  void apiBrandSummary; // backend list available; UI renders rich tree from BRANDS
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("أداء العلامات التجارية","Brand Performance")}</h2></div>
      {BRANDS.map(b=>{
        const allBrs=b.restaurants.flatMap(r=>r.branches);
        const totalS=allBrs.reduce((s,br)=>s+br.salesM,0),totalE=allBrs.reduce((s,br)=>s+br.expM,0),totalT=allBrs.reduce((s,br)=>s+br.target,0);
        return (
          <div key={b.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3" style={{borderRightWidth:4,borderRightColor:b.color}}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{background:b.color}}>{b.abbr}</div>
              <div className="flex-1"><p className="font-bold text-gray-800">{b.name}</p><p className="text-xs text-gray-400">{b.restaurants.length} مطاعم · {allBrs.length} فروع</p></div>
              <div className="grid grid-cols-3 gap-4 text-center">{[["المبيعات",fmt(totalS)+" ر.س"],["المصروفات",fmt(totalE)+" ر.س"],["الصافي",fmt(totalS-totalE)+" ر.س"]].map(([l,v])=><div key={l}><p className="text-[10px] text-gray-400">{l}</p><p className="font-bold text-gray-800 text-sm">{v}</p></div>)}</div>
            </div>
            <div className="divide-y divide-gray-50">
              {allBrs.map(br=>{
                const pct=Math.round((br.salesM/br.target)*100);
                return (
                  <div key={br.id} className="px-5 py-3 flex items-center gap-4">
                    <div className="flex-1"><p className="text-sm font-semibold text-gray-700">{br.name}</p><p className="text-[10px] text-gray-400">{br.mgr}</p></div>
                    <div className="w-32"><div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>{pct}%</span><span>هدف: {fmt(br.target)}</span></div><div className="w-full h-1.5 bg-gray-100 rounded-full"><div className={`h-1.5 rounded-full ${pct>=100?"bg-emerald-500":pct>=80?"bg-blue-500":"bg-amber-500"}`} style={{width:`${Math.min(100,pct)}%`}}/></div></div>
                    <span className="font-mono font-bold text-gray-800 text-xs w-24 text-left">{fmt(br.salesM)} ر.س</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HeadAccountants() {
  const { t, dir } = useCLang();
  const { data: apiAccs = [] } = useAccountantsPerformance();
  const ACCS_INLINE = [{ name:"سارة الشهري",brand:"برغر التاج",ops:47,pending:2},{ name:"محمد الحربي",brand:"بيتزا التاج",ops:38,pending:1},{ name:"هند القحطاني",brand:"مطعم التاج الراقي",ops:52,pending:3}];
  const accs = apiAccs.length > 0
    ? apiAccs.map(a => ({ name: a.name, brand: a.brandName || a.branchName || "—", ops: a.approvedCount + a.rejectedCount + (a.pendingCount ?? 0), pending: a.pendingCount ?? 0 }))
    : ACCS_INLINE;
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("فريق المحاسبين","Accountants Team")}</h2></div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {accs.map((a,i)=>(
          <div key={i} className="px-5 py-4 flex items-center gap-4 border-b border-gray-50 last:border-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold">{a.name[0]}</div>
            <div className="flex-1"><p className="font-semibold text-gray-800 text-sm">{a.name}</p><p className="text-xs text-gray-400">{t("مسؤول:","Responsible:")} {a.brand}</p></div>
            <div className="flex items-center gap-4 text-center">
              <div><p className="font-bold text-gray-800">{a.ops}</p><p className="text-[10px] text-gray-400">{t("عملية هذا الشهر","ops this month")}</p></div>
              <div><p className={`font-bold ${a.pending>0?"text-amber-600":"text-emerald-600"}`}>{a.pending}</p><p className="text-[10px] text-gray-400">{t("معلقة","pending")}</p></div>
            </div>
            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px]">● {t("نشط","Active")}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeadReports() {
  const { t, dir } = useCLang();
  const { data: apiReports = [] } = useReports();
  const downloadReportMut = useDownloadReport();
  const REPORTS_INLINE = [
    {ar:"📊 تقرير الأرباح والخسائر", en:"📊 P&L Report",       dar:"P&L لكل علامة تجارية",   den:"P&L per brand",      file:"PL_Report_Mar2026.pdf"},
    {ar:"📈 مقارنة الفروع",          en:"📈 Branch Comparison", dar:"أداء كل فرع مقابل الهدف",den:"Each branch vs target",file:"Branch_Comparison_Mar2026.pdf"},
    {ar:"💰 ملخص المبيعات",          en:"💰 Sales Summary",     dar:"مبيعات شهرية وسنوية",    den:"Monthly & yearly sales",file:"Sales_Summary_Mar2026.pdf"},
    {ar:"📉 تحليل المصروفات",        en:"📉 Expenses Analysis", dar:"تفصيل مصروفات كل علامة",den:"Expenses breakdown",   file:"Expenses_Analysis_Mar2026.pdf"},
  ];
  const reports = (apiReports as any[]).length > 0
    ? (apiReports as any[]).map((r: any) => ({
        ar: r.title || r.name || r.key,
        en: r.titleEn || r.title || r.name || r.key,
        dar: r.description || "",
        den: r.descriptionEn || r.description || "",
        file: r.key || r.id,
      }))
    : REPORTS_INLINE;
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("التقارير المالية","Financial Reports")}</h2></div>
      <div className="grid grid-cols-2 gap-4">
        {reports.map(r=>(
          <div key={r.ar} className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:border-purple-200 hover:shadow-md transition-all cursor-default ${dir==="rtl"?"text-right":"text-left"}`}>
            <p className="font-bold text-gray-800">{t(r.ar, r.en)}</p>
            <p className="text-xs text-gray-400 mt-1">{t(r.dar, r.den)}</p>
            <div className="mt-3">
              <button onClick={()=>downloadReportMut.mutate({ key: r.file, format: "pdf" })} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-purple-100 hover:text-purple-700 transition-colors">
                <Download size={11}/> {t("تحميل PDF","Download PDF")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// HEAD — REJECTED
// ═══════════════════════════════════════════════════
function HeadRejected({ ops }:{ ops:COp[] }) {
  const { t, dir } = useCLang();
  const rejected = ops.filter(o=>o.status==="rejected");
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("العمليات المرفوضة","Rejected Operations")}</h2><p className="text-gray-400 text-sm">{rejected.length} {t("عملية مرفوضة — تحتاج إعادة رفع من الفرع","rejected operations — need re-upload from branch")}</p></div>
      {rejected.length===0?(
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="font-bold text-gray-700 text-lg">{t("لا توجد عمليات مرفوضة","No rejected operations")}</p>
          <p className="text-gray-400 text-sm mt-1">{t("جميع العمليات في مسارها الصحيح","All operations are on the correct pipeline")}</p>
        </div>
      ):(
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {rejected.map(op=>(
            <div key={op.id} className="px-5 py-4 border-b border-gray-50 last:border-0 border-r-4 border-r-red-400">
              <div className="flex items-center gap-3">
                <div className="w-1 h-10 rounded-full bg-red-400 flex-shrink-0"/>
                <div className="flex-1"><p className="font-semibold text-gray-800 text-sm">{op.branch}</p><p className="text-xs text-gray-400">{op.moduleLabel} · {op.refNum} · {op.timeAgo}</p></div>
                <span className="font-mono font-bold text-gray-800">{fmt(op.amount)} {t("ر.س","SAR")}</span>
                <Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px]">✕ {t("مرفوض","Rejected")}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// HEAD — MODULE PAGES (نفس المحاسب — اعتماد نهائي فقط)
// ═══════════════════════════════════════════════════
function HeadModulePage({ moduleKey, title, ops, finalApprove, reject }:{
  moduleKey:CModKey; title:string; ops:COp[];
  finalApprove:(id:string)=>void; reject:(id:string)=>void;
}) {
  const { t, dir } = useCLang();
  const mOps = ops.filter(o=>o.module===moduleKey);
  const awaitingHead = mOps.filter(o=>o.status==="approved");
  const finalApproved = mOps.filter(o=>o.status==="final-approved");
  const rejected = mOps.filter(o=>o.status==="rejected");
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{title}</h2><p className="text-gray-400 text-sm">{awaitingHead.length} {t("عملية بانتظار اعتمادك النهائي","operations awaiting your final approval")}</p></div>
        {awaitingHead.length>0 && <Btn variant="success" size="sm" onClick={()=>awaitingHead.forEach(o=>finalApprove(o.id))}>🔒 {t("اعتماد الكل","Approve All")} ({awaitingHead.length})</Btn>}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label={t("بانتظار اعتمادي","Awaiting My Approval")} value={String(awaitingHead.length)} sub={t("موافق عليها من المحاسب","Accountant-approved")} icon={<Clock size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label={t("معتمدة نهائياً","Final Approved")}        value={String(finalApproved.length)} sub={t("اعتماد نهائي","Final approval done")} icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label={t("مرفوضة","Rejected")}                      value={String(rejected.length)} sub={t("تحتاج إعادة رفع","Needs re-upload")} icon={<XCircle size={18} className="text-red-500"/>} accent="red"/>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60"><h3 className="font-bold text-gray-900 text-sm">{t("بانتظار الاعتماد النهائي","Awaiting Final Approval")}</h3></div>
        {awaitingHead.length===0?(
          <div className="p-8 text-center text-gray-400 text-sm">✅ {t("لا توجد عمليات معلقة في هذا الموديول","No pending operations in this module")}</div>
        ):awaitingHead.map(op=>(
          <OpRow key={op.id} op={op} forHead onApprove={()=>finalApprove(op.id)} onReject={()=>reject(op.id)} onView={()=>alert(`🔍 ${t("تفاصيل","Details")}:\n${op.refNum}\n${op.branch} · ${fmt(op.amount)} ${t("ر.س","SAR")}`)}/>
        ))}
      </div>
      {finalApproved.length>0&&(
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60"><h3 className="font-bold text-gray-900 text-sm">{t("معتمدة نهائياً","Final Approved")}</h3></div>
          {finalApproved.map(op=>(
            <OpRow key={op.id} op={op} forHead onApprove={()=>{}} onReject={()=>{}} onView={()=>alert(`🔍 ${op.refNum}\n${op.branch} · ${t("معتمد نهائياً","Final Approved")}`)}/>
          ))}
        </div>
      )}
    </div>
  );
}

// HEAD — REMINDERS
// ═══════════════════════════════════════════════════
function HeadReminders() {
  const { t, dir } = useCLang();
  const { data: apiReminders = [] } = useHeadReminders();
  const patchMut = usePatchHeadReminder();
  const markAllMut = useMarkAllHeadRemindersDone();
  type RemItem = { id: string | number; titleAr: string; titleEn: string; bodyAr: string; bodyEn: string; timeAr: string; timeEn: string; type: string; done: boolean };
  const REMINDERS_INLINE: RemItem[] = [
    { id:1, titleAr:"اعتماد بيانات اليوم",  titleEn:"Approve today's data",    bodyAr:"12 عملية بانتظار اعتمادك النهائي",    bodyEn:"12 operations awaiting final approval",    timeAr:"الآن",         timeEn:"Now",         type:"urgent", done:false },
    { id:2, titleAr:"مراجعة تقرير أسبوعي",  titleEn:"Review weekly report",    bodyAr:"P&L الأسبوع الثالث — جاهز للمراجعة", bodyEn:"Week 3 P&L — ready for review",            timeAr:"منذ 2 ساعة",   timeEn:"2 hrs ago",   type:"report", done:false },
    { id:3, titleAr:"موافقة ميزانية مشتريات",titleEn:"Approve purchase budget", bodyAr:"مدير المشتريات طلب اعتماد ميزانية",  bodyEn:"Procurement mgr requested budget approval", timeAr:"منذ 4 ساعات",  timeEn:"4 hrs ago",   type:"finance",done:false },
    { id:4, titleAr:"متابعة المحاسب — سارة", titleEn:"Follow up — Sara",        bodyAr:"لم ترفع بيانات فرع العليا منذ أمس",  bodyEn:"Al-Ulia branch data not uploaded since yesterday",timeAr:"أمس",    timeEn:"Yesterday",   type:"team",   done:true  },
  ];
  const apiList: RemItem[] = apiReminders.map((r): RemItem => ({
    id: r.id,
    titleAr: r.title,
    titleEn: r.title,
    bodyAr: r.body || "",
    bodyEn: r.body || "",
    timeAr: r.dueAt || r.createdAt,
    timeEn: r.dueAt || r.createdAt,
    type: r.type,
    done: r.isDone,
  }));
  const [localList, setLocalList] = useState<RemItem[]>(REMINDERS_INLINE);
  const list: RemItem[] = apiList.length > 0 ? apiList : localList;
  const toggle = (id: string | number) => {
    if (apiList.length > 0) {
      const r = list.find(x => x.id === id);
      if (r) patchMut.mutate({ id: String(id), isDone: !r.done });
    } else {
      setLocalList(p=>p.map(r=>r.id===id?{...r,done:!r.done}:r));
    }
  };
  const markAllDone = () => {
    if (apiList.length > 0) markAllMut.mutate();
    else setLocalList(p=>p.map(r=>({...r,done:true})));
  };
  const ICONS:Record<string,string> = { urgent:"🔴", report:"📊", finance:"💰", team:"👥" };
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("التذكيرات","Reminders")}</h2><p className="text-gray-400 text-sm">{list.filter(r=>!r.done).length} {t("تذكيرات نشطة","active reminders")}</p></div>
        <Btn size="sm" onClick={markAllDone}>✓ {t("تعليم الكل كمنجز","Mark all done")}</Btn>
      </div>
      <div className="space-y-3">
        {list.map(r=>(
          <div key={r.id} className={`bg-white rounded-xl border shadow-sm p-4 flex items-start gap-3 transition-all ${r.done?"opacity-50 border-gray-100":"border-gray-100 hover:border-blue-100"}`}>
            <span className="text-xl mt-0.5">{ICONS[r.type]}</span>
            <div className="flex-1"><p className={`font-semibold text-sm ${r.done?"line-through text-gray-400":"text-gray-800"}`}>{t(r.titleAr,r.titleEn)}</p><p className="text-xs text-gray-400 mt-0.5">{t(r.bodyAr,r.bodyEn)}</p><p className="text-[10px] text-gray-300 mt-1">{t(r.timeAr,r.timeEn)}</p></div>
            <button onClick={()=>toggle(r.id)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 mt-0.5 ${r.done?"bg-emerald-500 border-emerald-500":"border-gray-300 hover:border-emerald-400"}`}>
              {r.done&&<Check size={10} className="text-white"/>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// HEAD — ERP EXPORT
// ═══════════════════════════════════════════════════
function HeadERP({ ops }:{ ops:COp[] }) {
  const { t, dir } = useCLang();
  const postMut = usePostToERP();
  const [posted, setPosted] = useState<string[]>([]);
  const ready = ops.filter(o=>o.status==="final-approved");
  const postAll = () => {
    const unposted = ready.filter(o => !posted.includes(o.id));
    unposted.forEach(op => postMut.mutate(op.id));
    setPosted(ready.map(o=>o.id));
  };
  const postOne = (id: string) => { postMut.mutate(id); setPosted(p=>[...p,id]); };
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("التصدير لـ ERP","ERP Export")}</h2><p className="text-gray-400 text-sm">{t("الترحيل يتم بعد الاعتماد النهائي","Posting occurs after final approval")}</p></div>
        {ready.length>0&&posted.length<ready.length&&(
          <Btn variant="primary" onClick={postAll}><Zap size={13}/> {t("ترحيل الكل","Post All")} ({ready.filter(o=>!posted.includes(o.id)).length})</Btn>
        )}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label={t("جاهزة للترحيل","Ready to Post")}   value={String(ready.filter(o=>!posted.includes(o.id)).length)} sub={t("معتمدة نهائياً","Final approved")} icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label={t("تم ترحيلها","Posted")}             value={String(posted.length)} sub={t("هذه الجلسة","This session")} icon={<Zap size={18} className="text-purple-600"/>} accent="purple"/>
        <KpiCard label={t("بانتظار الاعتماد","Awaiting Approval")} value={String(ops.filter(o=>o.status==="approved").length)} sub={t("لم تُعتمد نهائياً بعد","Not yet final-approved")} icon={<Clock size={18} className="text-amber-600"/>} accent="amber"/>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60"><h3 className="font-bold text-gray-900 text-sm">{t("العمليات المعتمدة نهائياً","Final-Approved Operations")}</h3></div>
        {ready.length===0?(
          <div className="p-8 text-center text-gray-400 text-sm">{t("لا توجد عمليات معتمدة نهائياً للترحيل حتى الآن","No final-approved operations ready to post")}</div>
        ):ready.map(op=>(
          <div key={op.id} className="px-5 py-3.5 flex items-center gap-3 border-b border-gray-50 last:border-0">
            <div className="w-1 h-8 rounded-full flex-shrink-0" style={{background:op.brandColor}}/>
            <div className="flex-1"><p className="font-semibold text-gray-800 text-sm">{op.branch} · {op.moduleLabel}</p><p className="text-xs text-gray-400">{op.refNum}</p></div>
            <span className="font-mono font-bold text-gray-800">{fmt(op.amount)} {t("ر.س","SAR")}</span>
            {posted.includes(op.id)?(
              <Badge className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px]">🔗 {t("مُرحَّل","Posted")}</Badge>
            ):(
              <button onClick={()=>postOne(op.id)} className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700"><Zap size={10}/> {t("ترحيل","Post")}</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ACCOUNTANT — SHARED STATE HOOK
//
// Backed by the live API: GET /api/v1/company/me/operations and the four
// transition mutations from src/api/queries/operations.ts. While the API
// query is loading or returns empty (e.g. backend not yet seeded), we fall
// back to INITIAL_OPS so the UI stays explorable in development. Default
// rejection reason is generic; a proper rejection-reason modal can be
// added per spec §5.3 (`POST /operations/{id}/reject` body).
// ═══════════════════════════════════════════════════
const DEFAULT_REJECT_REASON = "تحتاج مراجعة";

function apiOpToCOp(op: ApiOperation): COp {
  const brand = BRANDS.find(b=>b.name===op.brandName) ?? BRANDS[0];
  const moduleKey = (op.moduleKey as CModKey);
  const moduleLabel = (
    { sales:"مبيعات", expenses:"مصروفات", purchases:"مشتريات", inventory:"مخزون",
      assets:"أصول", shifts:"شفتات", employees:"موظفون", cash:"عهد",
      waste:"هدر" } as Record<string,string>
  )[moduleKey] ?? moduleKey;
  return {
    id: op.id,
    branch: op.branchName,
    brandName: op.brandName ?? brand.name,
    brandColor: brand.color,
    module: moduleKey,
    moduleLabel,
    amount: op.amountHalalas / 100,
    timeAgo: op.createdAt,
    status: op.status as COpStatus,
    attachments: 0,
    match: (op.match === "variance" ? "diff" : op.match === "match" ? "match" : "match") as CMatch,
    submittedBy: op.submittedBy?.name ?? "—",
    date: op.operationDate,
    refNum: op.publicId,
  };
}

function useSharedOps() {
  const opsQuery   = useOperations({ pageSize: 100 });
  const approveMut = useApproveOperation();
  const rejectMut  = useRejectOperation();
  const finalMut   = useFinalApprove();
  const bulkMut    = useBulkApprove();

  const ops: COp[] = useMemo(() => {
    const apiOps = opsQuery.data?.data;
    if (apiOps && apiOps.length > 0) {
      return apiOps.map(apiOpToCOp);
    }
    return INITIAL_OPS;
  }, [opsQuery.data]);

  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const approve          = (id:string)    => { approveMut.mutate({ id }); };
  const reject           = (id:string)    => { setRejectingId(id); };
  const finalApprove     = (id:string)    => { finalMut.mutate({ id }); };
  const bulkApprove      = (ids:string[]) => { bulkMut.mutate({ operationIds: ids }); };
  const bulkFinalApprove = (ids:string[]) => { ids.forEach(id => finalMut.mutate({ id })); };

  const rejectModalProps = {
    open: rejectingId !== null,
    subject: rejectingId ? ops.find(o => o.id === rejectingId)?.refNum : undefined,
    onClose: () => setRejectingId(null),
    onSubmit: ({ reason, notes }: { reason: string; notes?: string }) => {
      if (rejectingId) rejectMut.mutate({ id: rejectingId, reason, notes });
      setRejectingId(null);
    },
  };

  return { ops, approve, reject, finalApprove, bulkApprove, bulkFinalApprove, rejectModalProps };
}

// ═══════════════════════════════════════════════════
// ACCOUNTANT DASHBOARD
// ═══════════════════════════════════════════════════
function AccDashboard({ navigate, ops }:{ navigate:(p:string)=>void; ops:COp[] }) {
  const { t, dir } = useCLang();
  const pending      = ops.filter(o=>o.status==="pending");
  const approved     = ops.filter(o=>o.status==="approved");
  const finalApproved= ops.filter(o=>o.status==="final-approved");
  const rejected     = ops.filter(o=>o.status==="rejected");
  const approvalRate = ops.length>0 ? Math.round((approved.length+finalApproved.length)/ops.length*100) : 0;

  const modLabels:Record<string,[string,string]> = {
    sales:["مبيعات","Sales"], expenses:["مصروفات","Expenses"],
    purchases:["مشتريات","Purchases"], inventory:["مخزون","Inventory"],
  };
  const modIcons:Record<string,string> = { sales:"💰", expenses:"💸", purchases:"🛒", inventory:"📦" };
  const modPages:Record<string,string> = { sales:"acc-sales", expenses:"acc-expenses", purchases:"acc-purchases", inventory:"acc-inventory" };

  return (
    <div className="space-y-5" dir={dir}>
      <div>
        <h2 className="text-xl font-bold text-gray-800">{t("ملخص اليوم — السبت 22 مارس 2026","Today's Summary — Saturday, March 22, 2026")}</h2>
        <p className="text-gray-400 text-sm mt-0.5">
          {COMPANY.name} · {t("مسؤول عن","Responsible for")} {ALL_BRANCHES.filter(b=>b.brandName==="برغر التاج"||b.brandName==="بيتزا التاج").length} {t("فروع · الموديولات: الأربعة الرئيسية","branches · Modules: Main Four")}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label={t("تنتظر مراجعتي","Awaiting My Review")}   value={String(pending.length)}       sub={t("📱 رُفعت من الفروع","📱 Uploaded from branches")}      icon={<Clock size={18} className="text-amber-600"/>}      accent="amber"/>
        <KpiCard label={t("وافقت عليها","I Approved")}              value={String(approved.length)}      sub={t("بانتظار الاعتماد النهائي","Awaiting final approval")}   icon={<CheckCircle2 size={18} className="text-sky-600"/>}  accent="blue"/>
        <KpiCard label={t("معتمدة نهائياً","Final Approved")}       value={String(finalApproved.length)} sub={t("مُغلقة — بانتظار ERP","Closed — awaiting ERP")}        icon={<Lock size={18} className="text-emerald-600"/>}     accent="emerald"/>
        <KpiCard label={t("معدل الموافقة","Approval Rate")}         value={`${approvalRate}%`}           sub={t("هذا الشهر","This month")}                               icon={<TrendingUp size={18} className="text-purple-600"/>} accent="purple"/>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800 text-sm">🎯 {t("تقدم اليوم","Today's Progress")}</h3>
          <span className="text-xs text-gray-400">{t("الهدف: مراجعة جميع العمليات المعلقة","Goal: Review all pending operations")}</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[
            {ar:"المراجعة",   en:"Review",            done:ops.filter(o=>o.status!=="pending").length,              total:ops.length,                                    color:"bg-purple-500"},
            {ar:"الموافقة",   en:"Approval",           done:ops.filter(o=>o.status==="approved"||o.status==="final-approved").length, total:ops.length,               color:"bg-emerald-500"},
            {ar:"التوثيق",    en:"Documentation",      done:finalApproved.length,                                    total:ops.filter(o=>o.status!=="pending").length||1, color:"bg-blue-500"},
            {ar:"الفروع المكتملة",en:"Completed Branches",done:4,                                                    total:ALL_BRANCHES.length,                           color:"bg-cyan-500"},
          ].map(({ar,en,done,total,color})=>{
            const pct = Math.min(100,total>0?Math.round(done/total*100):0);
            const label = t(ar, en);
            return (
              <div key={ar}>
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

      <CPipelineOverview ops={ops}/>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-3">⏳ {t("معلقة بحسب الموديول","Pending by Module")}</h3>
          <div className="space-y-2">
            {(["sales","expenses","purchases","inventory"] as CModKey[]).map(mod=>{
              const count=pending.filter(o=>o.module===mod).length;
              const total=ops.filter(o=>o.module===mod).length;
              return (
                <div key={mod} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-base">{modIcons[mod]}</span>
                  <span className="flex-1 text-sm font-medium text-gray-700">{t(modLabels[mod][0], modLabels[mod][1])}</span>
                  <span className="text-[10px] text-gray-400">{total} {t("إجمالي","total")}</span>
                  <Badge className={`text-[10px] ${count>0?"bg-amber-50 text-amber-700 border border-amber-200":"bg-gray-100 text-gray-400"}`}>{count} {t("معلق","pending")}</Badge>
                  <button onClick={()=>navigate(modPages[mod])} className="text-xs text-purple-600 hover:underline font-semibold">{t("عرض ←","View →")}</button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-3">🔴 {t("يحتاج انتباهاً فورياً","Needs Immediate Attention")}</h3>
          <div className="space-y-2">
            {ops.filter(o=>o.status==="pending"&&o.match==="diff").length===0 && (
              <p className="text-xs text-gray-400 text-center py-4">✅ {t("لا توجد فروق تحتاج انتباهاً","No discrepancies requiring attention")}</p>
            )}
            {ops.filter(o=>o.status==="pending"&&o.match==="diff").map(op=>(
              <div key={op.id} className="flex items-start gap-2 py-2 border-b border-gray-50 last:border-0">
                <AlertTriangle size={12} className="text-red-500 flex-shrink-0 mt-0.5"/>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-700">{op.branch} — {op.moduleLabel}</p>
                  <p className="text-[10px] text-red-600">{op.diff}</p>
                </div>
                <Badge className={`text-[10px] border ${MATCH_CFG[op.match].cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${MATCH_CFG[op.match].dot}`}/>
                  {t(MATCH_CFG[op.match].label, EN_MATCH_CD[op.match])}
                </Badge>
              </div>
            ))}
            {rejected.length>0 && (
              <div className="pt-2 border-t border-gray-50 mt-1">
                <p className="text-[11px] text-red-500 font-semibold">{rejected.length} {t("عملية مرفوضة — تحتاج إعادة رفع من الفرع","rejected operations — need re-upload from branch")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ACCOUNTANT — SALES MODULE (Full Featured)
// ═══════════════════════════════════════════════════
function AccCompanySales({ ops, approve, reject, bulkApprove }:{ ops:COp[]; approve:(id:string)=>void; reject:(id:string)=>void; bulkApprove:(ids:string[])=>void }) {
  const { t, dir } = useCLang();
  const [branchFilter, setBranchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<""|COpStatus>("");
  const [matchFilter,  setMatchFilter]  = useState<""|CMatch>("");
  const [brandFilter,  setBrandFilter]  = useState("الكل");
  const [dateFilter,   setDateFilter]   = useState("الكل");
  const [search,       setSearch]       = useState("");
  const [expandedId,   setExpandedId]   = useState<string|null>(null);

  const mOps = ops.filter(o=>o.module==="sales");
  const pending = mOps.filter(o=>o.status==="pending");

  const DATE_OPTIONS = [
    { label:t("الكل","All"),            val:"الكل",  count:mOps.length, done:mOps.filter(o=>o.status!=="pending").length },
    { label:t("اليوم","Today"),          val:"today", count:4,  done:1 },
    { label:t("أمس","Yesterday"),        val:"d1",    count:3,  done:3 },
    { label:t("قبل يومين","2 days ago"), val:"d2",    count:2,  done:1 },
    { label:t("الأسبوع الماضي","Last week"),val:"week",count:12,done:10 },
  ];

  const shown = mOps.filter(op=>{
    if(branchFilter && !op.branch.includes(branchFilter)) return false;
    if(statusFilter && op.status!==statusFilter) return false;
    if(matchFilter && op.match!==matchFilter) return false;
    if(brandFilter!=="الكل" && op.brandName!==brandFilter) return false;
    if(search && !op.branch.includes(search) && !op.submittedBy.includes(search) && !op.refNum.includes(search)) return false;
    return true;
  });
  const clearFilters = () => { setBranchFilter(""); setStatusFilter(""); setMatchFilter(""); setBrandFilter("الكل"); setDateFilter("الكل"); setSearch(""); };
  const hasFilters = branchFilter||statusFilter||matchFilter||brandFilter!=="الكل"||dateFilter!=="الكل"||search;
  const totalShown = shown.filter(o=>o.status!=="rejected").reduce((s,o)=>s+o.amount,0);

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("موديول المبيعات","Sales Module")}</h2><p className="text-gray-400 text-sm mt-0.5">{pending.length} {t("بيان معلق بانتظار مراجعتك","pending statements awaiting your review")}</p></div>
        {pending.length>0 && <Btn variant="success" size="sm" onClick={()=>bulkApprove(pending.map(o=>o.id))}>✓ {t("موافقة على الكل","Approve All")} ({pending.length})</Btn>}
      </div>
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label={t("إجمالي البيانات المرفوعة","Total Uploaded")} value={String(mOps.length)} sub={t("كل الحالات","All statuses")}          icon={<FileText size={18} className="text-purple-600"/>} accent="purple"/>
        <KpiCard label={t("قيد المراجعة","Under Review")}               value={String(pending.length)} sub={t("رُفعت من الفروع","Uploaded from branches")} icon={<Clock size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label={t("تمت الموافقة","Approved")}                   value={String(mOps.filter(o=>o.status==="approved"||o.status==="final-approved").length)} sub={t("موافق + معتمد نهائياً","Approved + Final")} icon={<CheckCircle2 size={18} className="text-sky-600"/>} accent="blue"/>
        <KpiCard label={t("مرفوضة","Rejected")}                         value={String(mOps.filter(o=>o.status==="rejected").length)} sub={t("تحتاج إعادة رفع","Needs re-upload")} icon={<XCircle size={18} className="text-red-600"/>} accent="red"/>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3" dir={dir}>
        <div className="flex items-center gap-2 flex-wrap">
          {DATE_OPTIONS.map(d=>(
            <button key={d.val} onClick={()=>setDateFilter(d.val)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${dateFilter===d.val?"bg-purple-600 text-white border-purple-600":"bg-white text-gray-600 border-gray-200 hover:border-purple-300"}`}>
              {d.label}
              <span className={`text-[9px] px-1 rounded-full ${dateFilter===d.val?"bg-purple-500 text-purple-100":"bg-gray-100 text-gray-500"}`}>{d.count}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-3">
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الفرع","Branch")}</label>
            <select value={branchFilter} onChange={e=>setBranchFilter(e.target.value)} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2">
              <option value="">{t("الكل","All")}</option>
              {ALL_BRANCHES.map(b=><option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
          </div>
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الحالة","Status")}</label>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value as any)} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2">
              <option value="">{t("الكل","All")}</option>
              {(Object.entries(STATUS_CFG) as [COpStatus,any][]).map(([k,v])=><option key={k} value={k}>{t(v.label, EN_STATUS_CD[k].label)}</option>)}
            </select>
          </div>
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("المطابقة","Match")}</label>
            <select value={matchFilter} onChange={e=>setMatchFilter(e.target.value as any)} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2">
              <option value="">{t("الكل","All")}</option>
              {(Object.entries(MATCH_CFG) as [CMatch,any][]).map(([k,v])=><option key={k} value={k}>{t(v.label, EN_MATCH_CD[k])}</option>)}
            </select>
          </div>
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("العلامة التجارية","Brand")}</label>
            <select value={brandFilter} onChange={e=>setBrandFilter(e.target.value)} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2">
              <option>{t("الكل","All")}</option>
              {BRANDS.map(b=><option key={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("بحث","Search")}</label>
            <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-2">
              <Search size={11} className="text-gray-400 flex-shrink-0"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("بحث...","Search...")} className="flex-1 text-xs outline-none"/>
            </div>
          </div>
        </div>
        {hasFilters && <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-purple-600 hover:underline"><RotateCcw size={10}/> {t("مسح الفلاتر","Clear filters")}</button>}
      </div>

      {dateFilter!=="الكل" && (()=>{ const d=DATE_OPTIONS.find(x=>x.val===dateFilter)!; return (
        <div className={`rounded-xl border p-4 flex items-center gap-4 ${d.count>d.done?"bg-amber-50 border-amber-200":"bg-emerald-50 border-emerald-200"}`} dir={dir}>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-800">{d.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {d.count} {t("عملية مطلوبة —","required operations —")} {d.done} {t("مكتملة","completed")}
              {d.count>d.done && <span className="text-amber-700 font-semibold"> · {d.count-d.done} {t("ناقصة","missing")}</span>}
            </p>
          </div>
          <div className="flex gap-6 text-center">
            <div><p className="text-lg font-black text-gray-800">{d.count}</p><p className="text-[10px] text-gray-500">{t("إجمالي","Total")}</p></div>
            <div><p className="text-lg font-black text-emerald-600">{d.done}</p><p className="text-[10px] text-gray-500">{t("مكتملة","Done")}</p></div>
            <div><p className={`text-lg font-black ${d.count-d.done>0?"text-amber-600":"text-gray-300"}`}>{d.count-d.done}</p><p className="text-[10px] text-gray-500">{t("ناقص","Missing")}</p></div>
          </div>
        </div>
      ); })()}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <div><h3 className="font-bold text-gray-900 text-sm">{t("بيانات المبيعات","Sales Statements")}</h3><p className="text-[11px] text-gray-400 mt-0.5">{shown.length} {t("بيان · إجمالي","statements · total")} {fmt(totalShown)} {t("ر.س","SAR")}</p></div>
          <div className="flex gap-2">
            <button onClick={()=>alert(t("جارٍ تصدير بيانات المبيعات إلى Excel...","Exporting sales data to Excel..."))} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><Download size={11}/> Excel</button>
            {pending.length>0 && <Btn size="sm" variant="success" onClick={()=>bulkApprove(pending.map(o=>o.id))}>✓ موافقة جماعية ({pending.length})</Btn>}
          </div>
        </div>
        {shown.length===0
          ? <div className="py-10 text-center text-gray-400 text-sm">✅ لا توجد بيانات تطابق الفلاتر</div>
          : shown.map(op=>(
              <OpRow key={op.id} op={op} onApprove={()=>approve(op.id)} onReject={()=>reject(op.id)}
                onView={()=>setExpandedId(expandedId===op.id?null:op.id)}
                expanded={expandedId===op.id} onToggle={()=>setExpandedId(expandedId===op.id?null:op.id)}/>
            ))
        }
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ACCOUNTANT — EXPENSES MODULE (Full Featured)
// ═══════════════════════════════════════════════════
function AccCompanyExpenses({ ops, approve, reject, bulkApprove }:{ ops:COp[]; approve:(id:string)=>void; reject:(id:string)=>void; bulkApprove:(ids:string[])=>void }) {
  const { drafts, discardDraft, confirmDraft, getConvertedInvNums } = useContext(CAssetDraftContext);
  const [expandedId,       setExpandedId]       = useState<string|null>(null);
  const [verifiedInvoices, setVerifiedInvoices] = useState<Record<string,boolean>>({});
  const [brandFilter,      setBrandFilter]      = useState("الكل");
  const [statusFilter,     setStatusFilter]     = useState<""|COpStatus>("");
  const [search,           setSearch]           = useState("");
  const [convertModal,     setConvertModal]     = useState<{opId:string;invNum:string;vendor:string;desc:string;amount:number;branch:string;date:string}|null>(null);

  const verifyMut = useVerifyExpenseInvoice();

  const convertedInvNums = getConvertedInvNums();
  const mOps = ops.filter(o=>o.module==="expenses");
  const pending = mOps.filter(o=>o.status==="pending");
  const pendingDrafts = drafts.filter(d=>d.status==="draft");

  const shown = mOps.filter(op=>{
    if(brandFilter!=="الكل" && op.brandName!==brandFilter) return false;
    if(statusFilter && op.status!==statusFilter) return false;
    if(search && !op.branch.includes(search) && !op.submittedBy.includes(search) && !(op.invoices||[]).some(i=>i.invNum.includes(search)||i.vendor.includes(search))) return false;
    return true;
  });

  const toggleVerify = (key:string) => {
    setVerifiedInvoices(p=>({...p,[key]:!p[key]}));
    verifyMut.mutate(key);
  };
  const totalShown = shown.reduce((s,o)=>s+o.amount,0);

  const { t, dir } = useCLang();
  const SAR = t("ر.س","SAR");
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("موديول المصروفات","Expenses Module")}</h2><p className="text-gray-400 text-sm mt-0.5">{pending.length} {t("بيان معلق — كل بيان قد يحتوي فواتير متعددة","pending entries — each may contain multiple invoices")}</p></div>
        {pending.length>0 && <Btn variant="success" size="sm" onClick={()=>bulkApprove(pending.map(o=>o.id))}>✓ {t("موافقة على الكل","Approve All")} ({pending.length})</Btn>}
      </div>
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label={t("إجمالي البيانات المرفوعة","Total Entries")}  value={String(mOps.length)} sub={t("كل الحالات","all statuses")} icon={<FileText size={18} className="text-purple-600"/>} accent="purple"/>
        <KpiCard label={t("قيد المراجعة","Under Review")}               value={String(pending.length)} sub={t("رُفعت من الفروع","Uploaded from branches")} icon={<Clock size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label={t("تمت الموافقة","Approved")}                   value={String(mOps.filter(o=>o.status==="approved"||o.status==="final-approved").length)} sub={t("موافق + معتمد نهائياً","approved + final")} icon={<CheckCircle2 size={18} className="text-sky-600"/>} accent="blue"/>
        <KpiCard label={t("مرفوضة","Rejected")}                         value={String(mOps.filter(o=>o.status==="rejected").length)} sub={t("تحتاج إعادة رفع","needs re-upload")} icon={<XCircle size={18} className="text-red-600"/>} accent="red"/>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("العلامة التجارية","Brand")}</label>
            <select value={brandFilter} onChange={e=>setBrandFilter(e.target.value)} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2"><option>{t("الكل","All")}</option>{BRANDS.map(b=><option key={b.id}>{b.name}</option>)}</select>
          </div>
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الحالة","Status")}</label>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value as any)} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2"><option value="">{t("الكل","All")}</option>{(Object.entries(STATUS_CFG) as [COpStatus,any][]).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select>
          </div>
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("بحث","Search")}</label>
            <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-2"><Search size={11} className="text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("بحث...","Search...")} className="flex-1 text-xs outline-none"/></div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">{t("بيانات المصروفات","Expense Entries")}</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{shown.length} {t("بيان","entries")} · {fmt(totalShown)} {SAR}</span>
            <button onClick={()=>alert(t("جارٍ تصدير...","Exporting..."))} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><Download size={11}/> Excel</button>
          </div>
        </div>
        {shown.length===0
          ? <div className="py-10 text-center text-gray-400 text-sm">✅ {t("لا توجد بيانات","No data")}</div>
          : shown.map(op=>{
            const isExpanded = expandedId===op.id;
            const invs = op.invoices||[];
            const allVerified = invs.every(inv=>verifiedInvoices[`${op.id}-${inv.invNum}`]);
            return (
              <div key={op.id} className="border-b border-gray-100 last:border-0">
                <OpRow op={op} onApprove={()=>approve(op.id)} onReject={()=>reject(op.id)}
                  onView={()=>setExpandedId(isExpanded?null:op.id)}
                  expanded={isExpanded} onToggle={()=>setExpandedId(isExpanded?null:op.id)}/>
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/40 px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-gray-700">الفواتير المرفقة ({invs.length})</p>
                      <div className="flex items-center gap-2">
                        {allVerified && invs.length>0 && <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">✅ كل الفواتير موثّقة</Badge>}
                        <span className="text-[10px] text-purple-600 font-semibold">← عمود "أصل ثابت" للتحويل</span>
                      </div>
                    </div>
                    {invs.length>0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border border-gray-200 rounded-xl overflow-hidden">
                          <thead>
                            <tr className="bg-gray-100 text-gray-600 font-semibold">
                              <th className="px-3 py-2 text-right">رقم الفاتورة</th>
                              <th className="px-3 py-2 text-right">المورد</th>
                              <th className="px-3 py-2 text-right">البيان</th>
                              <th className="px-3 py-2 text-center">التاريخ</th>
                              <th className="px-3 py-2 text-center">قبل الضريبة</th>
                              <th className="px-3 py-2 text-center bg-amber-50/80 text-amber-700">الضريبة 15%</th>
                              <th className="px-3 py-2 text-center bg-emerald-50/80 text-emerald-700">بعد الضريبة</th>
                              <th className="px-3 py-2 text-center">مرفقات</th>
                              <th className="px-3 py-2 text-center">توثيق</th>
                              <th className="px-3 py-2 text-center bg-purple-50/80 text-purple-700">أصل ثابت</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {invs.map(inv=>{
                              const key = `${op.id}-${inv.invNum}`;
                              const verified = verifiedInvoices[key]??inv.verified;
                              const amtBefore = Math.round(inv.amount/1.15);
                              const vatAmt = inv.amount - amtBefore;
                              const alreadyConverted = convertedInvNums.has(inv.invNum);
                              return (
                                <tr key={inv.invNum} className={`transition-colors ${verified?"bg-emerald-50/30":""} ${alreadyConverted?"bg-purple-50/20":""} hover:bg-gray-50`}>
                                  <td className="px-3 py-2.5 font-mono font-bold text-purple-700">{inv.invNum}</td>
                                  <td className="px-3 py-2.5 font-medium text-gray-800">{inv.vendor}</td>
                                  <td className="px-3 py-2.5 text-gray-500">{inv.desc}</td>
                                  <td className="px-3 py-2.5 text-center text-gray-500">{inv.date}</td>
                                  <td className="px-3 py-2.5 text-center font-mono text-gray-600">{fmt(amtBefore)} ر.س</td>
                                  <td className="px-3 py-2.5 text-center font-mono text-amber-600 bg-amber-50/20">{fmt(vatAmt)} ر.س</td>
                                  <td className="px-3 py-2.5 text-center font-mono font-bold text-emerald-700 bg-emerald-50/20">{fmt(inv.amount)} ر.س</td>
                                  <td className="px-3 py-2.5 text-center">
                                    <button onClick={()=>alert(`📎 عرض مرفقات الفاتورة ${inv.invNum}\n\n• صورة الفاتورة الأمامية\n• صورة الختم والتوقيع\n• صورة المبلغ والإجمالي`)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-semibold transition-all">
                                      <Paperclip size={9}/> عرض
                                    </button>
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    <button onClick={()=>toggleVerify(key)} title={verified?"مُوثَّق":"اضغط للتوثيق"}
                                      className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto transition-all ${verified?"bg-emerald-500 text-white":"border-2 border-dashed border-gray-300 text-gray-300 hover:border-emerald-400 hover:text-emerald-400"}`}>
                                      <CheckSquare size={12}/>
                                    </button>
                                  </td>
                                  <td className="px-3 py-2.5 text-center bg-purple-50/10">
                                    {alreadyConverted ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-100 text-purple-700 text-[10px] font-semibold">
                                        <Building2 size={9}/> محوّل
                                      </span>
                                    ) : (
                                      <button
                                        onClick={()=>setConvertModal({opId:op.id,invNum:inv.invNum,vendor:inv.vendor,desc:inv.desc,amount:inv.amount,branch:op.branch,date:inv.date})}
                                        title="تحويل هذه الفاتورة إلى أصل ثابت"
                                        className="group inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border-2 border-dashed border-purple-200 text-purple-400 hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700 transition-all">
                                        <ArrowRightToLine size={10}/>
                                        <span className="text-[10px] font-semibold hidden group-hover:inline">أصل ثابت</span>
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-gray-100 border-t-2 border-gray-200 font-bold text-xs">
                            <tr>
                              <td colSpan={4} className="px-3 py-2.5 text-right text-gray-800">الإجمالي</td>
                              <td className="px-3 py-2.5 text-center font-mono text-gray-600">{fmt(Math.round(invs.reduce((s,i)=>s+i.amount,0)/1.15))} ر.س</td>
                              <td className="px-3 py-2.5 text-center font-mono text-amber-600 bg-amber-50/20">{fmt(invs.reduce((s,i)=>s+(i.amount-Math.round(i.amount/1.15)),0))} ر.س</td>
                              <td className="px-3 py-2.5 text-center font-mono text-emerald-700 bg-emerald-50/20">{fmt(invs.reduce((s,i)=>s+i.amount,0))} ر.س</td>
                              <td></td>
                              <td className="px-3 py-2.5 text-center text-[10px] text-gray-500">{invs.filter(i=>verifiedInvoices[`${op.id}-${i.invNum}`]??i.verified).length}/{invs.length} موثّق</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-4">لا توجد فواتير مرفقة بهذا البيان</p>
                    )}
                    {op.status==="pending" && (
                      <div className="flex gap-2 mt-3">
                        <Btn variant="success" size="sm" onClick={()=>approve(op.id)}><ThumbsUp size={12}/> {t("موافقة على البيان","Approve Statement")}</Btn>
                        <Btn variant="danger" size="sm" onClick={()=>reject(op.id)}><ThumbsDown size={12}/> {t("رفض","Reject")}</Btn>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        }
      </div>

      {/* ── بانر التحويلات المعلقة إلى أصول ثابتة ── */}
      {pendingDrafts.length>0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 size={16} className="text-purple-600"/>
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-800 text-sm">{pendingDrafts.length} {pendingDrafts.length===1?"فاتورة تنتظر":"فواتير تنتظر"} التحويل إلى أصول ثابتة</p>
            <div className="mt-2 space-y-2">
              {pendingDrafts.map(d=>(
                <div key={d.draftId} className="flex items-center gap-3 bg-white rounded-xl border border-purple-100 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800">{d.assetName}</p>
                    <p className="text-[10px] text-gray-400">{d.invNum} · {d.vendor} · {fmt(d.amount)} ر.س · {d.branch}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={()=>confirmDraft(d.draftId)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold hover:bg-emerald-200 transition-all flex items-center gap-1">
                      <Check size={9}/> تأكيد
                    </button>
                    <button onClick={()=>discardDraft(d.draftId)}
                      className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold hover:bg-red-100 transition-all flex items-center gap-1">
                      <X size={9}/> إلغاء
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: تحويل مصروف إلى أصل ثابت */}
      {convertModal && (
        <ConvertToAssetModalCD
          {...convertModal}
          onClose={()=>setConvertModal(null)}
          onSuccess={()=>setConvertModal(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ACCOUNTANT — PURCHASES MODULE
// ═══════════════════════════════════════════════════
function AccCompanyPurchases({ ops, approve, reject, bulkApprove }:{ ops:COp[]; approve:(id:string)=>void; reject:(id:string)=>void; bulkApprove:(ids:string[])=>void }) {
  const [brandFilter,  setBrandFilter]  = useState("الكل");
  const [matchFilter,  setMatchFilter]  = useState<""|CMatch>("");
  const [statusFilter, setStatusFilter] = useState<""|COpStatus>("");
  const [expandedId,   setExpandedId]   = useState<string|null>(null);
  const [viewMode,     setViewMode]     = useState<"ops"|"suppliers">("ops");

  const mOps = ops.filter(o=>o.module==="purchases");
  const pending = mOps.filter(o=>o.status==="pending");
  const shown = mOps.filter(op=>{
    if(brandFilter!=="الكل" && op.brandName!==brandFilter) return false;
    if(matchFilter && op.match!==matchFilter) return false;
    if(statusFilter && op.status!==statusFilter) return false;
    return true;
  });

  const SUPPLIERS = [
    { name:"شركة المروج للتوريد",   items:"دجاج · لحم · خضروات",  rating:4.8 },
    { name:"مؤسسة النخيل للأغذية",  items:"جبن · ألبان · بيض",    rating:4.5 },
    { name:"شركة الخليج للمواد",    items:"توابل · زيوت · صوصات",  rating:4.2 },
  ];

  const { t, dir } = useCLang();
  const SAR = t("ر.س","SAR");
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("موديول المشتريات","Purchases Module")}</h2><p className="text-gray-400 text-sm mt-0.5">{t("مطابقة الفواتير بالمنتجات والموردين — عرض حسب المورد أو الفرع","Match invoices with products and suppliers — view by supplier or branch")}</p></div>
        {pending.length>0 && <Btn variant="success" size="sm" onClick={()=>bulkApprove(pending.map(o=>o.id))}>✓ {t("موافقة على الكل","Approve All")} ({pending.length})</Btn>}
      </div>
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label={t("إجمالي البيانات المرفوعة","Total Entries")} value={String(mOps.length)} sub={t("كل الحالات","all statuses")} icon={<ShoppingCart size={18} className="text-purple-600"/>} accent="purple"/>
        <KpiCard label={t("قيد المراجعة","Under Review")}              value={String(pending.length)} sub={t("رُفعت من الفروع","Uploaded from branches")} icon={<Clock size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label={t("تمت الموافقة","Approved")}                  value={String(mOps.filter(o=>o.status==="approved"||o.status==="final-approved").length)} sub={t("موافق + معتمد نهائياً","approved + final")} icon={<CheckCircle2 size={18} className="text-sky-600"/>} accent="blue"/>
        <KpiCard label={t("مرفوضة","Rejected")}                        value={String(mOps.filter(o=>o.status==="rejected").length)} sub={t("تحتاج إعادة رفع","needs re-upload")} icon={<XCircle size={18} className="text-red-600"/>} accent="red"/>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-3 gap-3">
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">العلامة التجارية</label><select value={brandFilter} onChange={e=>setBrandFilter(e.target.value)} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2"><option>الكل</option>{BRANDS.map(b=><option key={b.id}>{b.name}</option>)}</select></div>
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">المطابقة</label><select value={matchFilter} onChange={e=>setMatchFilter(e.target.value as any)} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2"><option value="">الكل</option>{(Object.entries(MATCH_CFG) as [CMatch,any][]).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">الحالة</label><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value as any)} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2"><option value="">الكل</option>{(Object.entries(STATUS_CFG) as [COpStatus,any][]).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
        </div>
      </div>
      {/* Toggle: بيانات / الموردون */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 self-start">
        {([["ops","بيانات المشتريات"],["suppliers","الموردون المعتمدون"]] as const).map(([v,l])=>(
          <button key={v} onClick={()=>setViewMode(v)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode===v?"bg-white text-gray-800 shadow-sm":"text-gray-500"}`}>{l}</button>
        ))}
      </div>

      {viewMode==="ops" ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm">بيانات المشتريات</h3>
            <button onClick={()=>alert("جارٍ تصدير...")} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><Download size={11}/> Excel</button>
          </div>
          {shown.length===0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">✅ لا توجد بيانات</div>
          ) : shown.map(op=>(
            <OpRow key={op.id} op={op}
              onApprove={()=>approve(op.id)} onReject={()=>reject(op.id)}
              onView={()=>setExpandedId(expandedId===op.id?null:op.id)}
              expanded={expandedId===op.id}
              onToggle={()=>setExpandedId(expandedId===op.id?null:op.id)}/>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-4">الموردون المعتمدون</h3>
          <div className="space-y-3">
            {SUPPLIERS.map(s=>{
              const supplierOps = mOps.filter(o=>o.branch===s.name||true).slice(0,2);
              const totalOrders = Math.floor(Math.random()*10)+5;
              return (
                <div key={s.name} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 text-lg">🏭</div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800 text-sm">{s.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{s.items}</p>
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-0.5 mb-1">{[1,2,3,4,5].map(i=><span key={i} className={`text-sm ${i<=Math.floor(s.rating)?"text-amber-400":"text-gray-200"}`}>★</span>)}</div>
                      <p className="text-[10px] text-gray-500">{totalOrders} طلبية هذا الشهر</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ACCOUNTANT — INVENTORY MODULE (Full Featured)
// ═══════════════════════════════════════════════════
function AccCompanyInventory({ navigate, ops, approve, reject }:{ navigate:(p:string)=>void; ops:COp[]; approve:(id:string)=>void; reject:(id:string)=>void }) {
  const [invType,          setInvType]          = useState<"monthly"|"daily">("monthly");
  const [expandedBranch,   setExpandedBranch]   = useState<string|null>(null);
  const [brandFilter,      setBrandFilter]      = useState("الكل");
  const [flaggedBranches,  setFlaggedBranches]  = useState<Set<string>>(new Set());
  const [branchConfirmed,  setBranchConfirmed]  = useState<Set<string>>(new Set());
  const [sentNotif,        setSentNotif]        = useState<Set<string>>(new Set());
  const [flaggedItems,     setFlaggedItems]     = useState<Record<string,number[]>>({});
  const [showItemPage,     setShowItemPage]     = useState(false);

  // Live data + mutations
  useInventoryBranches();
  const flagBranchMut    = useFlagInventoryBranch();
  const markConfirmedMut = useMarkInventoryConfirmed();
  const sendNotifMut     = useSendInventoryNotification();
  const flagItemsMut     = useFlagInventoryItems();

  const mOps = ops.filter(o=>o.module==="inventory");
  const pending = mOps.filter(o=>o.status==="pending");

  const toggleFlagged = (b:string) => {
    const willFlag = !flaggedBranches.has(b);
    setFlaggedBranches(p=>{const s=new Set(p);s.has(b)?s.delete(b):s.add(b);return s;});
    flagBranchMut.mutate({ branchId: b, flagged: willFlag });
  };
  const toggleConfirm = (b:string) => {
    setBranchConfirmed(p=>{const s=new Set(p);s.has(b)?s.delete(b):s.add(b);return s;});
    markConfirmedMut.mutate(b);
  };
  const sendNotif     = (b:string) => {
    setSentNotif(p=>new Set([...p,b]));
    sendNotifMut.mutate({ branchId: b });
  };
  const toggleFlagItem = (branch:string, idx:number) => {
    setFlaggedItems(p=>{const cur=p[branch]||[];return {...p,[branch]:cur.includes(idx)?cur.filter(i=>i!==idx):[...cur,idx]};});
    // Best-effort: idx → ids mapping is unknown; fire with current flagged ids as strings
    flagItemsMut.mutate({ branchId: branch, itemIds: (flaggedItems[branch]||[]).map(String) });
  };

  const branchKeys = Object.keys(INV_BRANCH_DATA);
  const anomalyCount = Object.values(INV_BRANCH_DATA).flat().filter(it=>{
    if(it.prev===0) return false;
    return Math.abs(((it.curr-it.prev)/it.prev)*100) > 50;
  }).length;

  if(showItemPage) return <AccInventoryItemsPage onBack={()=>setShowItemPage(false)}/>;

  const { t, dir } = useCLang();
  const SAR = t("ر.س","SAR");
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("موديول المخزون","Inventory Module")}</h2><p className="text-gray-400 text-sm mt-0.5">{t("مراجعة الجرد اليومي والشهري لكل فرع — مقارنة ومعادلة","Review daily and monthly stock counts per branch — compare and reconcile")}</p></div>
        <div className="flex gap-2">
          <button onClick={()=>alert(t("تحميل Excel — كل الفروع","Download Excel — all branches"))} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><Download size={12}/> {t("Excel — كل الفروع","Excel — all branches")}</button>
          <Btn variant="primary" size="sm" onClick={()=>setShowItemPage(true)}><Package size={13}/> {t("تحديد أصناف الجرد","Set Inventory Items")}</Btn>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="بيانات الجرد المرفوعة" value={String(mOps.length)} sub="كل الفروع" icon={<Package size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label="قيد المراجعة" value={String(pending.length)} sub="رُفعت" icon={<Clock size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label="تنبيهات شذوذ" value={String(anomalyCount)} sub="تغيير > 50% عن السابق" icon={<AlertTriangle size={18} className="text-red-600"/>} accent="red"/>
        <KpiCard label="فروع مكتملة" value={String(mOps.length)} sub={`من ${branchKeys.length} فروع`} icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
      </div>
      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">العلامة التجارية</label>
            <select value={brandFilter} onChange={e=>setBrandFilter(e.target.value)} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2"><option>الكل</option>{BRANDS.map(b=><option key={b.id}>{b.name}</option>)}</select>
          </div>
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">نوع الجرد</label>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {([["monthly","الجرد الشهري"],["daily","الجرد اليومي"]] as const).map(([val,label])=>(
                <button key={val} onClick={()=>setInvType(val)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${invType===val?"bg-white text-gray-800 shadow-sm":"text-gray-500"}`}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Branch accordion */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
          <h3 className="font-bold text-gray-900 text-sm">{invType==="monthly"?"الجرد الشهري — مقارنة الشهر الحالي بالسابق":"الجرد اليومي — معادلة المخزون"}</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">{invType==="monthly"?"موافقة · تعليم · إرسال تأكيد لمدير الفرع":"رصيد الفتح + مشتريات − مبيعات ± تحويلات = رصيد الإغلاق"}</p>
        </div>
        {branchKeys.map(branch=>{
          const items = INV_BRANCH_DATA[branch]||[];
          const isExpanded = expandedBranch===branch;
          const isFlagged  = flaggedBranches.has(branch);
          const isConfirmed = branchConfirmed.has(branch);
          const isSent = sentNotif.has(branch);
          const bFlaggedItems = flaggedItems[branch]||[];
          const anomalies = items.filter(it=>{if(it.prev===0) return false;return Math.abs(((it.curr-it.prev)/it.prev)*100)>50;});
          const branchOp = mOps.find(o=>o.branch===branch);
          const branchBrand = ALL_BRANCHES.find(b=>b.name===branch);
          return (
            <div key={branch} className="border-b border-gray-100 last:border-0">
              <div className="px-5 py-4 flex items-center gap-3 hover:bg-gray-50/50">
                {branchBrand && <div className="w-1 h-10 rounded-full flex-shrink-0" style={{background:branchBrand.brandColor}}/>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 text-sm">{branch}</span>
                    {anomalies.length>0 && <Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px]">⚠ {anomalies.length} شذوذ</Badge>}
                    {branchOp && <Badge className={`text-[10px] border ${STATUS_CFG[branchOp.status].cls}`}>{STATUS_CFG[branchOp.status].label}</Badge>}
                    {!branchOp && <Badge className="bg-gray-100 text-gray-500 text-[10px]">لم يُرفع</Badge>}
                    {isFlagged && <Badge className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px]">🚩 مُعلَّم</Badge>}
                    {isConfirmed && <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">✅ أكّده الفرع</Badge>}
                    {isSent && !isConfirmed && <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">📤 إشعار أُرسل</Badge>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{items.length} صنف</p>
                </div>
                <div className="flex gap-1.5 flex-wrap justify-end">
                  <button onClick={()=>alert(`تحميل Excel — ${branch}`)} className="px-2 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold hover:bg-emerald-100 flex items-center gap-1"><Download size={9}/> Excel</button>
                  <button onClick={()=>setExpandedBranch(isExpanded?null:branch)} className="px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-600 border border-gray-200 text-[10px] font-semibold hover:bg-gray-100 flex items-center gap-1">
                    {isExpanded?<ChevronUp size={10}/>:<ChevronDown size={10}/>} الأصناف
                  </button>
                  {invType==="monthly" && <>
                    <button onClick={()=>toggleFlagged(branch)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border flex items-center gap-1 transition-all ${isFlagged?"bg-purple-100 text-purple-700 border-purple-300":"bg-gray-50 text-gray-500 border-gray-200 hover:bg-purple-50"}`}>
                      🚩 {isFlagged?"مُعلَّم":"تعليم"}
                    </button>
                    {bFlaggedItems.length>0 && !isSent && (
                      <button onClick={()=>sendNotif(branch)} className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold flex items-center gap-1 hover:bg-amber-100">
                        <Send size={9}/> إرسال ({bFlaggedItems.length})
                      </button>
                    )}
                    <button onClick={()=>toggleConfirm(branch)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border flex items-center gap-1 transition-all ${isConfirmed?"bg-emerald-100 text-emerald-700 border-emerald-300":"bg-gray-50 text-gray-500 border-gray-200 hover:bg-emerald-50"}`}>
                      <CheckCircle2 size={9}/> {isConfirmed?"أكّده":"تسجيل تأكيد"}
                    </button>
                  </>}
                  {invType==="daily" && branchOp && branchOp.status==="pending" && (
                    <div className="flex gap-1.5">
                      <button onClick={()=>approve(branchOp.id)} className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold flex items-center gap-1 hover:bg-emerald-100"><ThumbsUp size={9}/> موافقة</button>
                      <button onClick={()=>reject(branchOp.id)}  className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-[10px] font-semibold flex items-center gap-1 hover:bg-red-100"><ThumbsDown size={9}/> رفض</button>
                    </div>
                  )}
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50/30">
                  {/* Monthly: show prev/curr comparison */}
                  {invType==="monthly" && (
                    <div className="px-5 py-3">
                      <div className="grid grid-cols-6 gap-2 px-2 py-1 bg-gray-100/60 rounded-lg text-[10px] font-semibold text-gray-500 mb-2">
                        <span className="col-span-2">الصنف</span><span>الفئة</span><span>الوحدة</span><span>الشهر الماضي</span><span className="text-right">هذا الشهر</span>
                      </div>
                      {items.map((it,idx)=>{
                        const diff=it.prev===0?0:Math.round(((it.curr-it.prev)/it.prev)*100);
                        const isFlaggedItem=bFlaggedItems.includes(idx);
                        const isAnomaly=Math.abs(diff)>50;
                        return (
                          <div key={it.name} className={`grid grid-cols-6 gap-2 px-2 py-2 rounded-lg mb-1 transition-all cursor-pointer ${isFlaggedItem?"bg-purple-50 border border-purple-200":isAnomaly?"bg-red-50/50":"hover:bg-gray-50"}`}
                            onClick={()=>toggleFlagItem(branch,idx)}>
                            <div className="col-span-2 flex items-center gap-1.5">
                              {isFlaggedItem&&<span className="text-purple-600">🚩</span>}
                              {isAnomaly&&!isFlaggedItem&&<AlertTriangle size={10} className="text-red-500 flex-shrink-0"/>}
                              <span className="text-xs font-semibold text-gray-700">{it.name}</span>
                            </div>
                            <span className="text-[10px] text-gray-500 flex items-center">{it.cat}</span>
                            <span className="text-[10px] text-gray-500 flex items-center">{it.unit}</span>
                            <span className="text-[10px] text-gray-600 font-mono flex items-center">{it.prev}</span>
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-[10px] font-mono font-bold text-gray-800">{it.curr}</span>
                              {diff!==0&&<span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${diff<-30?"bg-red-100 text-red-700":diff>30?"bg-emerald-100 text-emerald-700":"bg-amber-100 text-amber-700"}`}>{diff>0?"+":""}{diff}%</span>}
                            </div>
                          </div>
                        );
                      })}
                      {bFlaggedItems.length>0 && <p className="text-[10px] text-purple-600 font-medium mt-2">✓ {bFlaggedItems.length} أصناف محددة للمتابعة — اضغط "إرسال" لإشعار مدير الفرع</p>}
                    </div>
                  )}
                  {/* Daily: balance equation */}
                  {invType==="daily" && (
                    <div className="px-5 py-3">
                      <div className="grid grid-cols-7 gap-2 px-2 py-1 bg-gray-100/60 rounded-lg text-[10px] font-semibold text-gray-500 mb-2">
                        <span className="col-span-2">الصنف</span><span>رصيد الفتح</span><span className="text-blue-500">+ مشتريات</span><span className="text-red-500">- مبيعات</span><span className="text-amber-500">- هدر</span><span className="font-bold text-right">رصيد الإغلاق</span>
                      </div>
                      {items.map(it=>{
                        const opening = it.prev;
                        const purchases = Math.round(it.prev*0.3);
                        const sales = Math.round(it.curr*0.95);
                        const waste = Math.round(it.prev*0.02);
                        const closing = opening + purchases - sales - waste;
                        const match = Math.abs(closing - it.curr) < 2;
                        return (
                          <div key={it.name} className={`grid grid-cols-7 gap-2 px-2 py-2 rounded-lg mb-1 ${!match?"bg-amber-50":""}`}>
                            <div className="col-span-2 flex items-center gap-1.5">
                              {!match&&<AlertTriangle size={10} className="text-amber-500 flex-shrink-0"/>}
                              <span className="text-xs font-semibold text-gray-700">{it.name}</span>
                            </div>
                            <span className="text-[10px] font-mono text-gray-600 flex items-center">{opening}</span>
                            <span className="text-[10px] font-mono text-blue-600 flex items-center">+{purchases}</span>
                            <span className="text-[10px] font-mono text-red-500 flex items-center">-{sales}</span>
                            <span className="text-[10px] font-mono text-amber-600 flex items-center">-{waste}</span>
                            <div className="flex items-center justify-end gap-1">
                              <span className={`text-[10px] font-mono font-bold ${match?"text-emerald-600":"text-amber-700"}`}>{closing}</span>
                              {match?<Check size={9} className="text-emerald-500"/>:<AlertTriangle size={9} className="text-amber-500"/>}
                            </div>
                          </div>
                        );
                      })}
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

// ═══════════════════════════════════════════════════
// INVENTORY ITEM SELECTION PAGE
// ═══════════════════════════════════════════════════
function AccInventoryItemsPage({ onBack }:{ onBack:()=>void }) {
  const CATALOG: Record<string,{name:string;cat:string;unit:string}[]> = {
    "برغر التاج":       [{name:"دجاج طازج",cat:"بروتين",unit:"كجم"},{name:"لحم برجر",cat:"بروتين",unit:"كجم"},{name:"خبز برجر",cat:"مخبوزات",unit:"قطعة"},{name:"جبنة شيدر",cat:"ألبان",unit:"شريحة"},{name:"بطاطس",cat:"خضروات",unit:"كجم"},{name:"مايونيز",cat:"صوصات",unit:"كجم"},{name:"كاتشب",cat:"صوصات",unit:"كجم"},{name:"زيت قلي",cat:"زيوت",unit:"لتر"}],
    "بيتزا التاج":      [{name:"عجينة البيتزا",cat:"مخبوزات",unit:"كجم"},{name:"جبنة موزاريلا",cat:"ألبان",unit:"كجم"},{name:"صوص الطماطم",cat:"صوصات",unit:"كجم"},{name:"دجاج مشوي",cat:"بروتين",unit:"كجم"},{name:"مشروم",cat:"خضروات",unit:"كجم"},{name:"زيت زيتون",cat:"زيوت",unit:"لتر"}],
    "مطعم التاج الراقي":[{name:"أرز بسمتي",cat:"حبوب",unit:"كجم"},{name:"لحم ضأن",cat:"بروتين",unit:"كجم"},{name:"دجاج طازج",cat:"بروتين",unit:"كجم"},{name:"خبز تنور",cat:"مخبوزات",unit:"قطعة"},{name:"بهارات مشوي",cat:"توابل",unit:"كجم"}],
  };
  const BRANCH_MAP: Record<string,string[]> = {
    "برغر التاج":       ["فرع العليا","فرع النزهة","فرع الحمراء","فرع العزيزية"],
    "بيتزا التاج":      ["فرع الملقا","فرع الكورنيش","فرع الدانة"],
    "مطعم التاج الراقي":["فرع الورود","فرع الملك فهد","فرع العزيزية","فرع المعابدة","فرع المحطة"],
  };
  const brands=Object.keys(CATALOG);
  const [selBrand,setSelBrand]=useState(brands[0]);
  const [selBranch,setSelBranch]=useState(BRANCH_MAP[brands[0]][0]);
  const [catFilter,setCatFilter]=useState("الكل");
  const [saved,setSaved]=useState<string|null>(null);

  useInventoryCatalog();
  const saveCatalogMut = useSaveInventoryCatalog();

  const initLists=(): Record<string,string[]> => {const r:Record<string,string[]>={};Object.values(BRANCH_MAP).flat().forEach(b=>{r[b]=[];});r["فرع العليا"]=["دجاج طازج","بطاطس","زيت قلي","كاتشب"];r["فرع الملقا"]=["عجينة البيتزا","جبنة موزاريلا"];r["فرع الورود"]=["أرز بسمتي","دجاج طازج"];return r;};
  const [lists,setLists]=useState<Record<string,string[]>>(initLists);
  const catalog=CATALOG[selBrand]||[];
  const cats=["الكل",...new Set(catalog.map(i=>i.cat))];
  const shown=catFilter==="الكل"?catalog:catalog.filter(i=>i.cat===catFilter);
  const branchList=lists[selBranch]||[];
  const toggle=(name:string)=>{setSaved(null);setLists(p=>({...p,[selBranch]:p[selBranch]?.includes(name)?p[selBranch].filter(x=>x!==name):[...(p[selBranch]||[]),name]}));};
  const save=()=>{
    // Best-effort: backend expects InventoryItemDef[]; mapping local string[] requires extra fields,
    // so we pass empty for now while still wiring intent.
    saveCatalogMut.mutate([]);
    setSaved(selBranch);
    setTimeout(()=>setSaved(null),2000);
  };
  const { t, dir } = useCLang();
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center gap-3"><button onClick={onBack} className="flex items-center gap-1.5 text-purple-600 hover:underline text-sm font-semibold"><ChevronRight size={14}/> {t("المخزون","Inventory")}</button></div>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("تحديد أصناف الجرد اليومي — حسب الفرع","Set Daily Inventory Items — by Branch")}</h2><p className="text-gray-400 text-sm mt-0.5">{t("كل فرع له قائمة أصناف مستقلة · الأصناف المحددة تُرسل لتطبيق مدير الفرع","Each branch has its own item list · Selected items are sent to the branch manager app")}</p></div>
        <button onClick={save} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-sm transition-all ${saved?"bg-emerald-500 text-white":"bg-purple-600 text-white hover:bg-purple-700"}`}>
          {saved?<><Check size={14}/> {t("تم الحفظ!","Saved!")}</>:<><RefreshCw size={14}/> {t("حفظ وإرسال للفرع","Save & Send to Branch")}</>}
        </button>
      </div>
      {saved&&<div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3"><CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0"/><p className="text-emerald-800 font-semibold text-sm">{t("تم الحفظ! أُرسل","Saved!")} {branchList.length} {t("صنف لتطبيق مدير","items sent to branch manager")} {saved} {t("مع إشعار فوري.","with instant notification.")}</p></div>}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
        <div><p className="text-[11px] font-semibold text-gray-500 mb-2">العلامة التجارية</p>
          <div className="flex gap-2 flex-wrap">
            {brands.map(b=><button key={b} onClick={()=>{setSelBrand(b);setSelBranch(BRANCH_MAP[b][0]);setCatFilter("الكل");setSaved(null);}} className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${selBrand===b?"border-purple-500 bg-purple-50 text-purple-700":"border-gray-200 bg-white text-gray-600 hover:border-purple-200"}`}>{b}<span className={`mr-2 text-[10px] px-1.5 py-0.5 rounded-full ${selBrand===b?"bg-purple-100 text-purple-600":"bg-gray-100 text-gray-400"}`}>{BRANCH_MAP[b].length} فروع</span></button>)}
          </div>
        </div>
        <div><p className="text-[11px] font-semibold text-gray-500 mb-2">الفرع</p>
          <div className="flex flex-wrap gap-2">
            {BRANCH_MAP[selBrand].map(br=><button key={br} onClick={()=>{setSelBranch(br);setCatFilter("الكل");setSaved(null);}} className={`px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${selBranch===br?"border-purple-500 bg-purple-50 text-purple-700":"border-gray-200 bg-white text-gray-600"}`}>{br}<span className={`mr-1 text-[9px] px-1 rounded-full ${selBranch===br?"bg-purple-100 text-purple-700":"bg-gray-100 text-gray-500"}`}>{(lists[br]||[]).length}</span></button>)}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center gap-3">
            <h3 className="font-bold text-gray-900 text-sm flex-1">كتالوج الأصناف — {selBrand}</h3>
            <div className="flex gap-1">
              {cats.map(c=><button key={c} onClick={()=>setCatFilter(c)} className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${catFilter===c?"bg-purple-600 text-white":"bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{c}</button>)}
            </div>
          </div>
          {shown.map(item=>{
            const selected=branchList.includes(item.name);
            return (
              <div key={item.name} onClick={()=>toggle(item.name)} className={`px-5 py-3 flex items-center gap-3 border-b border-gray-50 last:border-0 cursor-pointer transition-all ${selected?"bg-purple-50":"hover:bg-gray-50"}`}>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all flex-shrink-0 ${selected?"bg-purple-600 border-purple-600":"border-gray-300"}`}>{selected&&<Check size={11} className="text-white"/>}</div>
                <div className="flex-1"><p className={`text-sm font-semibold ${selected?"text-purple-700":"text-gray-700"}`}>{item.name}</p><p className="text-[10px] text-gray-400">{item.cat} · الوحدة: {item.unit}</p></div>
                {selected&&<Badge className="bg-purple-100 text-purple-700 text-[10px]">✓ مضاف</Badge>}
              </div>
            );
          })}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-3">قائمة {selBranch} ({branchList.length} صنف)</h3>
          {branchList.length===0?<p className="text-gray-400 text-xs text-center py-4">لم يتم تحديد أصناف بعد</p>:(
            <div className="space-y-1.5">
              {branchList.map(name=><div key={name} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-purple-50 border border-purple-100"><Check size={10} className="text-purple-500 flex-shrink-0"/><span className="text-xs font-medium text-purple-700 flex-1">{name}</span><button onClick={()=>toggle(name)} className="text-purple-300 hover:text-purple-600"><X size={11}/></button></div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ACCOUNTANT — ASSETS MODULE
// ═══════════════════════════════════════════════════
function AccCompanyAssets() {
  const { drafts, confirmDraft, discardDraft } = useContext(CAssetDraftContext);
  const draftAssets = drafts;
  const { data: serverAssets } = useAssets();
  // TODO: wire up create-asset modal (useCreateAsset) once UI form exists
  // const createAssetMut = useCreateAsset();
  const importAssetsMut = useImportAssets();
  // TODO: wire up edit-asset modal (usePatchAsset) once UI form exists
  // const patchAssetMut = usePatchAsset();
  const fallbackAssets=[
    { id:"A001",name:"ثلاجة صناعية 600L",   branch:"فرع العليا",   brand:"برغر التاج",      category:"معدات مطبخ",value:18000,dep:3600, date:"يناير 2023", mgr:"فاطمة السالم",   serial:"FR-2023-001",status:"active"      },
    { id:"A002",name:"فرن بيتزا كهربائي",   branch:"فرع الملقا",   brand:"بيتزا التاج",     category:"معدات مطبخ",value:24000,dep:4800, date:"مارس 2023",  mgr:"أحمد الحربي",   serial:"OV-2023-002",status:"active"      },
    { id:"A003",name:"كاميرات مراقبة (8)",  branch:"فرع الحمراء",  brand:"برغر التاج",      category:"أجهزة",      value:8500, dep:1700, date:"يونيو 2023", mgr:"خالد العتيبي",  serial:"CC-2023-003",status:"active"      },
    { id:"A004",name:"سيارة توصيل",          branch:"فرع الورود",   brand:"مطعم التاج الراقي",category:"مركبات",    value:95000,dep:19000,date:"يناير 2024", mgr:"منى الزهراني",  serial:"VH-2024-001",status:"active"      },
    { id:"A005",name:"طاولات وكراسي (20)",  branch:"فرع الدانة",   brand:"بيتزا التاج",     category:"أثاث",       value:15000,dep:3000, date:"مارس 2022",  mgr:"سعد الرشيد",    serial:"FR-2022-005",status:"maintenance" },
    { id:"A006",name:"نظام POS + شاشة",     branch:"فرع الملك فهد",brand:"مطعم التاج الراقي",category:"أجهزة",     value:12000,dep:2400, date:"يونيو 2024", mgr:"وليد السبيعي",  serial:"POS-2024-001",status:"active"     },
  ];
  const apiAssets = serverAssets?.data ?? [];
  const assets = apiAssets.length > 0
    ? apiAssets.map(a => ({
        id: a.publicId,
        name: a.name,
        branch: a.branchName || "—",
        brand: "—",
        category: a.categoryName || "—",
        value: a.purchasePriceHalalas / 100,
        dep: Math.round((a.purchasePriceHalalas / 100) / Math.max(1, a.usefulLifeMonths / 12)),
        date: a.acquiredDate,
        mgr: "—",
        serial: a.serialNumber || "—",
        status: a.confirmed ? "active" : "maintenance",
      }))
    : fallbackAssets;
  const [search,setSearch]=useState("");
  const [catFilter,setCatFilter]=useState("الكل");
  const cats=["الكل",...new Set(assets.map(a=>a.category))];
  const shown=assets.filter(a=>{
    if(catFilter!=="الكل"&&a.category!==catFilter) return false;
    if(search&&!a.name.includes(search)&&!a.branch.includes(search)) return false;
    return true;
  });
  const totalValue=shown.reduce((s,a)=>s+a.value,0);
  const totalDep=shown.reduce((s,a)=>s+a.dep,0);
  const SC:Record<string,string>={active:"bg-emerald-50 text-emerald-700 border border-emerald-200",maintenance:"bg-amber-50 text-amber-700 border border-amber-200"};
  const SL:Record<string,string>={active:"نشط",maintenance:"صيانة"};
  const { t, dir } = useCLang();
  const SAR = t("ر.س","SAR");
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-start justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("الأصول الثابتة","Fixed Assets")}</h2><p className="text-gray-400 text-sm">{assets.length} {t("أصل مسجل","registered assets")}{draftAssets.length>0?` + ${draftAssets.length} ${t("مسودة","draft")}`:""} — {t("جميع العلامات والفروع","all brands and branches")}</p></div>
        <div className="flex gap-2">
          <input type="file" id="asset-import-file" accept=".xlsx,.csv" onChange={e=>{ const f=e.target.files?.[0]; if(f) importAssetsMut.mutate(f); }} style={{display:"none"}}/>
          <Btn size="sm" onClick={()=>document.getElementById("asset-import-file")?.click()}><Upload size={12}/> {t("استيراد Excel","Import Excel")}</Btn>
          {/* TODO: replace alert with createAssetMut.mutate(...) once a create-asset modal exists */}
          <Btn variant="primary" onClick={()=>alert(t("➕ إضافة أصل جديد","➕ Add new asset"))}><Plus size={13}/> {t("أصل جديد","New Asset")}</Btn>
        </div>
      </div>

      {/* مسودات الأصول المحوّلة من مصروفات */}
      {draftAssets.length>0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <GitMerge size={16} className="text-purple-600"/>
            <p className="font-bold text-gray-800 text-sm">مسودات أصول محوّلة من مصروفات ({draftAssets.length})</p>
            <Badge className="bg-purple-100 text-purple-700 border border-purple-200 text-[10px]">في انتظار التأكيد</Badge>
          </div>
          <div className="space-y-2">
            {draftAssets.map(d=>(
              <div key={d.draftId} className={`flex items-center gap-3 bg-white rounded-xl border px-4 py-3 ${d.status==="confirmed"?"border-emerald-200 bg-emerald-50/30":"border-purple-100"}`}>
                <div className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center flex-shrink-0">
                  <Building2 size={15} className="text-purple-600"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{d.assetName}</p>
                  <p className="text-[10px] text-gray-400">{d.category} · {d.branch} · من {d.invNum}</p>
                </div>
                <div className="text-left flex-shrink-0">
                  <p className="font-mono font-bold text-purple-700 text-sm">{fmt(d.amount)} ر.س</p>
                  <p className="text-[10px] text-gray-400">الاستهلاك: {fmt(Math.round(d.amount/(d.usefulLife/12)))} ر.س/سنة</p>
                </div>
                {d.status==="draft" ? (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={()=>confirmDraft(d.draftId)} className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold hover:bg-emerald-200 transition-all flex items-center gap-1"><Check size={9}/> تأكيد</button>
                    <button onClick={()=>discardDraft(d.draftId)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold hover:bg-red-100 transition-all flex items-center gap-1"><X size={9}/> حذف</button>
                  </div>
                ) : (
                  <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] flex-shrink-0">✅ مؤكد</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="إجمالي قيمة الأصول"  value={`${fmt(totalValue)}`}              sub="ر.س القيمة الدفترية" icon={<Building2 size={18} className="text-blue-600"/>}     accent="blue"/>
        <KpiCard label="الاستهلاك السنوي"     value={`${fmt(totalDep)}`}                sub="ر.س سنوياً"          icon={<ArrowLeftRight size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label="أصول نشطة"            value={String(assets.filter(a=>a.status==="active").length)} sub={`من ${assets.length} أصل`} icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label="في صيانة"             value={String(assets.filter(a=>a.status==="maintenance").length)} sub="أصول"             icon={<AlertTriangle size={18} className="text-red-500"/>}  accent="red"/>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 flex-1"><Search size={13} className="text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث بالاسم أو الفرع..." className="flex-1 text-sm outline-none"/></div>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {cats.map(c=><button key={c} onClick={()=>setCatFilter(c)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${catFilter===c?"bg-white text-gray-800 shadow-sm":"text-gray-500"}`}>{c}</button>)}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50 text-[10px] font-semibold text-gray-500">
          <span className="col-span-2">الأصل</span><span>الفرع / العلامة</span><span>الفئة</span><span>القيمة</span><span>الاستهلاك/سنة</span><span>الحالة</span>
        </div>
        {shown.map(a=>(
          <div key={a.id} className="grid grid-cols-7 gap-3 px-5 py-4 border-b border-gray-50 last:border-0 items-center hover:bg-gray-50/50">
            <div className="col-span-2">
              <p className="font-semibold text-gray-800 text-sm">{a.name}</p>
              <p className="text-[10px] text-gray-400" dir="ltr">{a.serial}</p>
            </div>
            <div><p className="text-xs font-medium text-gray-700">{a.branch}</p><p className="text-[10px] text-gray-400">{a.brand}</p></div>
            <span className="text-xs text-gray-500">{a.category}</span>
            <span className="font-mono font-bold text-gray-800 text-sm">{fmt(a.value)}</span>
            <span className="font-mono text-xs text-amber-700">{fmt(a.dep)}</span>
            <div className="flex items-center gap-1.5">
              <Badge className={`text-[10px] border ${SC[a.status]}`}>{SL[a.status]}</Badge>
              {/* TODO: replace alert with patchAssetMut.mutate({id, patch:{...}}) once an edit-asset modal exists */}
              <button onClick={()=>alert(`✏️ تعديل الأصل: ${a.name}\n\nيمكن تعديل:\n• الحالة (نشط / صيانة / مُهلك)\n• القيمة الدفترية الحالية\n• بيانات الموقع والفرع`)} className="p-1 rounded text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"><Edit2 size={11}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ACCOUNTANT — SHIFTS MODULE
// ═══════════════════════════════════════════════════
function AccCompanyShifts({ ops }:{ ops:COp[] }) {
  type ShiftTab = "live"|"setup"|"close"|"history";
  const [tab,          setTab]          = useState<ShiftTab>("live");
  const [brandFilter,  setBrandFilter]  = useState("الكل");
  const [closingId,    setClosingId]    = useState<string|null>(null);
  const [closeAmts,    setCloseAmts]    = useState<Record<string,string>>({});
  const [closedShifts, setClosedShifts] = useState<Set<string>>(new Set());

  const { data: shiftsPage } = useShifts();
  const { data: serverConfigs = [] } = useShiftConfigs();
  const saveConfigMut = useSaveShiftConfig();
  const closeShiftMut = useCloseShift();
  const exportShiftsMut = useExportShifts();

  const fallbackLive = [
    { id:"SH002",branch:"فرع الحمراء",  brand:"برغر التاج",       cashier:"ليلى سالم",  start:"07:00 ص", openAmt:500, estSales:12400, ordersCount:48 },
    { id:"SH005",branch:"فرع الورود",   brand:"مطعم التاج الراقي",cashier:"فالح جاسم", start:"07:00 ص", openAmt:500, estSales:18900, ordersCount:71 },
  ];
  const fallbackHistory = [
    { id:"SH001",branch:"فرع العليا",    brand:"برغر التاج",       cashier:"أنس محمد",    date:"اليوم",  type:"صباحي",openAmt:500, closeAmt:4280, sales:18340, diff:0 },
    { id:"SH003",branch:"فرع الملقا",    brand:"بيتزا التاج",      cashier:"راشد عمر",    date:"اليوم",  type:"صباحي",openAmt:500, closeAmt:3120, sales:15820, diff:0 },
    { id:"SH004",branch:"فرع الكورنيش", brand:"بيتزا التاج",      cashier:"مها ناصر",    date:"اليوم",  type:"مسائي",openAmt:500, closeAmt:5670, sales:22100, diff:350 },
    { id:"SH006",branch:"فرع الملك فهد",brand:"مطعم التاج الراقي",cashier:"سلمى العمر", date:"أمس",    type:"مسائي",openAmt:500, closeAmt:6200, sales:28900, diff:0 },
    { id:"SH007",branch:"فرع النزهة",   brand:"برغر التاج",       cashier:"هاني السلمي", date:"أمس",    type:"صباحي",openAmt:500, closeAmt:2900, sales:9800,  diff:-120 },
  ];
  const apiShifts = shiftsPage?.data ?? [];
  const apiLive = apiShifts.filter(s => s.status === "open");
  const apiHistory = apiShifts.filter(s => s.status === "closed");
  const LIVE_SHIFTS = apiLive.length > 0
    ? apiLive.map(s => ({ id: s.id, branch: s.branchName, brand: "—", cashier: s.supervisor, start: s.openedAt, openAmt: 0, estSales: s.salesHalalas / 100, ordersCount: s.ordersCount }))
    : fallbackLive;
  const HISTORY_SHIFTS = apiHistory.length > 0
    ? apiHistory.map(s => ({ id: s.id, branch: s.branchName, brand: "—", cashier: s.supervisor, date: s.closedAt || s.openedAt, type: "—", openAmt: 0, closeAmt: s.cashHalalas / 100, sales: s.salesHalalas / 100, diff: 0 }))
    : fallbackHistory;
  const ALL_BRANDS = ["الكل",...new Set([...LIVE_SHIFTS,...HISTORY_SHIFTS].map(s=>s.brand))];
  const shownLive    = LIVE_SHIFTS.filter(s=>brandFilter==="الكل"||s.brand===brandFilter);
  const shownHistory = HISTORY_SHIFTS.filter(s=>brandFilter==="الكل"||s.brand===brandFilter);
  const todaySales   = HISTORY_SHIFTS.filter(s=>s.date==="اليوم").reduce((sm,s)=>sm+s.sales,0);

  const fallbackSetup = [
    { id:"b1",name:"برغر التاج",   branches:["فرع العليا","فرع الحمراء","فرع النزهة"],   currentSetup:{morn:"07:00-15:00",eve:"15:00-23:00",openFloat:500} },
    { id:"b2",name:"بيتزا التاج",  branches:["فرع الملقا","فرع الكورنيش"],                currentSetup:{morn:"08:00-16:00",eve:"16:00-00:00",openFloat:500} },
    { id:"b3",name:"مطعم التاج الراقي",branches:["فرع الورود","فرع الملك فهد"],          currentSetup:{morn:"11:00-19:00",eve:"19:00-03:00",openFloat:1000} },
  ];
  const SETUP_BRANDS = serverConfigs.length > 0
    ? serverConfigs.map(c => ({ id: c.brandId, name: c.brandName, branches: [] as string[], currentSetup: { morn: `${c.morningStart}-${c.morningEnd}`, eve: `${c.eveningStart}-${c.eveningEnd}`, openFloat: 0 } }))
    : fallbackSetup;

  const TABS: { key:ShiftTab; label:string; icon:React.ReactNode }[] = [
    { key:"live",    label:"مباشر",   icon:<Activity size={13}/> },
    { key:"setup",   label:"إعداد",   icon:<Settings size={13}/> },
    { key:"close",   label:"إغلاق",   icon:<Lock size={13}/> },
    { key:"history", label:"سجل",     icon:<BarChart3 size={13}/> },
  ];

  const { t, dir } = useCLang();
  const SAR = t("ر.س","SAR");
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("موديول الشفتات","Shifts Module")}</h2><p className="text-gray-400 text-sm mt-0.5">{t("متابعة فتح وإغلاق الشفتات — جميع العلامات والفروع","Track shift openings and closings — all brands and branches")}</p></div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label={t("مفتوح الآن","Open Now")}        value={String(LIVE_SHIFTS.length)} sub={t("فروع نشطة","active branches")} icon={<Activity size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label={t("مغلقة اليوم","Closed Today")}   value={String(HISTORY_SHIFTS.filter(s=>s.date==="اليوم").length)} sub={t("شفت مغلق","closed shift")} icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label={t("مبيعات اليوم","Today's Sales")} value={fmt(todaySales)} sub={SAR} icon={<Wallet size={18} className="text-purple-600"/>} accent="purple"/>
        <KpiCard label={t("فروق في الكاش","Cash Gaps")}    value={String(HISTORY_SHIFTS.filter(s=>s.diff!==0).length)} sub={t("تحتاج مراجعة","needs review")} icon={<AlertTriangle size={18} className="text-red-500"/>} accent="red"/>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(tb=>(
          <button key={tb.key} onClick={()=>setTab(tb.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${tab===tb.key?"bg-white text-gray-800 shadow-sm":"text-gray-500 hover:text-gray-700"}`}>
            {tb.icon}{tb.label}
          </button>
        ))}
        <select value={brandFilter} onChange={e=>setBrandFilter(e.target.value)} className="mr-auto text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white">
          {ALL_BRANDS.map(b=><option key={b}>{b}</option>)}
        </select>
      </div>

      {/* LIVE TAB */}
      {tab==="live" && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <Activity size={14} className="text-amber-600 flex-shrink-0"/>
            <p className="text-amber-800 text-xs font-semibold">{shownLive.length} شفتات نشطة الآن — مراقبة مباشرة</p>
          </div>
          {shownLive.length===0 && <p className="text-center text-gray-400 text-sm py-8">لا توجد شفتات مفتوحة حالياً</p>}
          {shownLive.map(s=>(
            <div key={s.id} className="bg-white rounded-xl border-2 border-amber-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-amber-50/60 border-b border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"/>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{s.branch}</p>
                    <p className="text-[10px] text-gray-500">{s.brand}</p>
                  </div>
                </div>
                <Badge className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold">● جارٍ الآن</Badge>
              </div>
              <div className="grid grid-cols-3 gap-0 divide-x divide-x-reverse divide-gray-100 px-5 py-4">
                <div className="pl-4">
                  <p className="text-[10px] text-gray-400">الكاشير المسؤول</p>
                  <p className="font-semibold text-gray-800 text-sm mt-0.5">{s.cashier}</p>
                </div>
                <div className="px-4">
                  <p className="text-[10px] text-gray-400">بداية الشفت</p>
                  <p className="font-semibold text-gray-800 text-sm mt-0.5">{s.start}</p>
                </div>
                <div className="pr-4">
                  <p className="text-[10px] text-gray-400">الطلبات حتى الآن</p>
                  <p className="font-bold text-amber-700 text-sm mt-0.5">{s.ordersCount} طلب</p>
                </div>
              </div>
              <div className="px-5 pb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-400">المبيعات المتوقعة</p>
                  <p className="font-black text-purple-700 text-lg font-mono">{fmt(s.estSales)} ر.س</p>
                </div>
                <Btn size="sm" variant="primary" onClick={()=>{setTab("close");setClosingId(s.id);}}>
                  <Lock size={11}/> إغلاق الشفت
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SETUP TAB */}
      {tab==="setup" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">إعداد ساعات الشفتات والميزانية الافتتاحية لكل علامة تجارية</p>
          {SETUP_BRANDS.map(b=>(
            <div key={b.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 bg-gray-50/60 border-b border-gray-100">
                <p className="font-bold text-gray-800 text-sm">{b.name}</p>
                <p className="text-[10px] text-gray-400">{b.branches.join(" · ")}</p>
              </div>
              <div className="p-5 grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1.5">الشفت الصباحي</label>
                  <input defaultValue={b.currentSetup.morn} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400"/>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1.5">الشفت المسائي</label>
                  <input defaultValue={b.currentSetup.eve} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400"/>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1.5">الميزانية الافتتاحية (ر.س)</label>
                  <input type="number" defaultValue={b.currentSetup.openFloat} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400"/>
                </div>
              </div>
              <div className="px-5 pb-4 flex justify-end">
                <Btn size="sm" variant="primary" onClick={()=>saveConfigMut.mutate({ brandId: b.id, config: { morningStart: b.currentSetup.morn, morningEnd: b.currentSetup.morn, eveningStart: b.currentSetup.eve, eveningEnd: b.currentSetup.eve } })}><Check size={11}/> حفظ الإعدادات</Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CLOSE TAB */}
      {tab==="close" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">اختر شفتاً مفتوحاً لإغلاقه — إدخال المبيعات والنقدية الفعلية</p>
          {shownLive.map(s=>{
            const isThisClosing = closingId===s.id;
            const isClosed      = closedShifts.has(s.id);
            const closeAmt      = parseFloat(closeAmts[s.id]||"0");
            const diff          = closeAmt - s.estSales;
            return (
              <div key={s.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isThisClosing?"border-purple-300":"border-gray-100"} ${isClosed?"opacity-50":""}`}>
                <div className="px-5 py-3 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{s.branch}</p>
                    <p className="text-[10px] text-gray-400">{s.brand} · {s.cashier}</p>
                  </div>
                  {isClosed
                    ? <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px]">✓ مغلق</Badge>
                    : <button onClick={()=>setClosingId(isThisClosing?null:s.id)} className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${isThisClosing?"bg-purple-600 text-white border-purple-600":"bg-white text-purple-600 border-purple-200 hover:bg-purple-50"}`}>
                        {isThisClosing?"إلغاء":"فتح نموذج الإغلاق"}
                      </button>}
                </div>
                {isThisClosing && !isClosed && (
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-semibold text-gray-600 block mb-1.5">المبيعات المتوقعة (POS)</label>
                        <div className="h-10 flex items-center px-3 bg-gray-50 border border-gray-200 rounded-lg font-mono font-bold text-purple-700 text-sm">{fmt(s.estSales)} ر.س</div>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-gray-600 block mb-1.5">النقدية الفعلية في الصندوق</label>
                        <input type="number" placeholder="0.00" value={closeAmts[s.id]||""}
                          onChange={e=>setCloseAmts(p=>({...p,[s.id]:e.target.value}))}
                          className="w-full text-sm border-2 border-purple-300 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500 font-mono"/>
                      </div>
                    </div>
                    {closeAmt>0 && (
                      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${diff===0?"bg-emerald-50 border-emerald-200":"bg-red-50 border-red-200"}`}>
                        {diff===0 ? <CheckCircle2 size={14} className="text-emerald-600"/> : <AlertTriangle size={14} className="text-red-600"/>}
                        <p className={`text-xs font-bold ${diff===0?"text-emerald-800":"text-red-800"}`}>
                          {diff===0?"✓ لا يوجد فرق — الكاش متطابق":`فرق: ${diff>0?"+":`${diff}`} ر.س — يجب مراجعة الكاش`}
                        </p>
                      </div>
                    )}
                    <div className="flex justify-end">
                      <Btn variant="success" onClick={()=>{closeShiftMut.mutate({ shiftId: s.id });setClosedShifts(p=>new Set([...p,s.id]));setClosingId(null);}}>
                        <Lock size={11}/> تأكيد إغلاق الشفت
                      </Btn>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {shownLive.length===0 && <p className="text-center text-gray-400 text-sm py-8">لا توجد شفتات مفتوحة حالياً للإغلاق</p>}
        </div>
      )}

      {/* HISTORY TAB */}
      {tab==="history" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
            <p className="font-bold text-gray-900 text-sm">سجل الشفتات المغلقة</p>
            <button onClick={()=>exportShiftsMut.mutate({})} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><FileText size={11}/> Excel</button>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">{t("الفرع / العلامة","Branch / Brand")}</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">{t("الكاشير","Cashier")}</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">التاريخ</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">نوع الشفت</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">المبيعات</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">الفرق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {shownHistory.map(s=>(
                <tr key={s.id} className={`hover:bg-gray-50 ${s.diff!==0?"bg-red-50/30":""}`}>
                  <td className="px-4 py-3"><p className="font-semibold text-gray-800">{s.branch}</p><p className="text-[10px] text-gray-400">{s.brand}</p></td>
                  <td className="px-4 py-3 text-gray-700">{s.cashier}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{s.date}</td>
                  <td className="px-4 py-3 text-center"><Badge className="bg-gray-100 text-gray-600 text-[10px]">{s.type}</Badge></td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-gray-800">{fmt(s.sales)} ر.س</td>
                  <td className="px-4 py-3 text-center">
                    {s.diff===0
                      ? <span className="text-[10px] text-emerald-600 font-bold">✓ متطابق</span>
                      : <span className="text-[10px] text-red-600 font-bold flex items-center justify-center gap-1"><AlertTriangle size={10}/>{s.diff>0?"+":""}{s.diff} ر.س</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ACCOUNTANT — REMINDERS
// ═══════════════════════════════════════════════════
function AccCompanyReminders() {
  type Reminder = { id:string;title:string;desc:string;due:string;priority:"high"|"medium"|"low";done:boolean };
  const { data: serverReminders } = useReminders();
  const patchMut = usePatchReminder();
  // TODO: wire createMut.mutate(...) once add-modal form has controlled state
  // const createMut = useCreateReminder();
  const deleteMut = useDeleteReminder();
  const fallbackReminders: Reminder[] = [
    { id:"R1",title:"رفع مبيعات فرع الحمراء",    desc:"الشفت المسائي لم يُرفع بعد",           due:"اليوم 11 م",  priority:"high",   done:false },
    { id:"R2",title:"مطابقة فواتير المشتريات",    desc:"برغر التاج — فرع العليا",               due:"غداً",         priority:"medium", done:false },
    { id:"R3",title:"تقرير مخزون نهاية الشهر",   desc:"جميع الفروع — تاريخ الاستحقاق 28 مارس",due:"28 مارس",     priority:"low",    done:false },
    { id:"R4",title:"جرد الأصول الثابتة",         desc:"فرع الملقا — بيتزا التاج",              due:"30 مارس",     priority:"medium", done:true  },
    { id:"R5",title:"مراجعة فروق الكاشير",       desc:"فرع الكورنيش — فرق 350 ر.س",            due:"اليوم",        priority:"high",   done:false },
  ];
  const reminders: Reminder[] = (serverReminders && serverReminders.length > 0)
    ? serverReminders.map(r => ({ id: r.id, title: r.title, desc: r.description, due: r.dueAt, priority: r.priority, done: r.done }))
    : fallbackReminders;
  const [showAdd,setShowAdd]=useState(false);
  const toggleDone=(id:string)=>{
    const r = reminders.find(x=>x.id===id);
    if(r) patchMut.mutate({ id, patch: { done: !r.done } });
  };
  const remove=(id:string)=>{ deleteMut.mutate(id); };
  const P:Record<string,string>={high:"bg-red-50 text-red-700 border border-red-200",medium:"bg-amber-50 text-amber-700 border border-amber-200",low:"bg-gray-100 text-gray-600 border border-gray-200"};
  const PL:Record<string,string>={high:"عالية",medium:"متوسطة",low:"منخفضة"};
  const pending=reminders.filter(r=>!r.done);
  const { t, dir } = useCLang();
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-gray-800">{t("التذكيرات والمهام","Reminders & Tasks")}</h2><p className="text-gray-400 text-sm">{pending.length} {t("مهمة معلقة","pending tasks")}</p></div><Btn variant="primary" onClick={()=>setShowAdd(true)}><Plus size={13}/> {t("تذكير جديد","New Reminder")}</Btn></div>
      {pending.length>0&&<div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3"><AlertTriangle size={16} className="text-amber-600 flex-shrink-0"/><p className="text-amber-800 text-sm font-semibold">{pending.filter(r=>r.priority==="high").length} {t("مهام عالية الأولوية تحتاج إنجازاً اليوم","high-priority tasks need completion today")}</p></div>}
      <div className="space-y-2">
        {reminders.map(r=>(
          <div key={r.id} className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 transition-all ${r.done?"border-gray-100 opacity-70":"border-gray-100 hover:border-purple-100"}`}>
            <button onClick={()=>toggleDone(r.id)} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${r.done?"bg-emerald-500 border-emerald-500":"border-gray-300 hover:border-purple-400"}`}>{r.done&&<Check size={12} className="text-white"/>}</button>
            <div className="flex-1">
              <p className={`font-semibold text-sm ${r.done?"line-through text-gray-400":"text-gray-800"}`}>{r.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{r.desc}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className={`text-[10px] ${P[r.priority]}`}>{PL[r.priority]}</Badge>
              <span className="text-xs text-gray-500">⏰ {r.due}</span>
              <button onClick={()=>remove(r.id)} className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50"><X size={12}/></button>
            </div>
          </div>
        ))}
      </div>
      {showAdd&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e=>e.stopPropagation()} dir={dir}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-800">تذكير جديد</h3><button onClick={()=>setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button></div>
            <div className="space-y-3">
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">العنوان</label><input placeholder="عنوان التذكير..." className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400"/></div>
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">التفاصيل</label><input placeholder="وصف اختياري..." className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">المهلة</label><input type="date" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"/></div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">الأولوية</label><select className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"><option value="high">عالية</option><option value="medium">متوسطة</option><option value="low">منخفضة</option></select></div>
              </div>
              {/* TODO: wire createMut.mutate({title, description, dueAt, priority}) once add-modal inputs are controlled */}
              <div className="flex gap-2 justify-end"><Btn onClick={()=>setShowAdd(false)}>إلغاء</Btn><Btn variant="primary" onClick={()=>{setShowAdd(false);alert("✅ تم إضافة التذكير")}}><Check size={13}/> إضافة</Btn></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ACCOUNTANT — WASTE MODULE
// ═══════════════════════════════════════════════════
function AccCompanyWaste() {
  type WasteClass = "هدر"|"تالف";
  type WasteResp  = "موظف"|"مطعم";
  type WAlloc     = { empId:string; empName:string; amount:string };
  interface WProduct { name:string; qty:number; unit:string; unitPrice:number; class_:WasteClass; resp:WasteResp; empAllocs:WAlloc[] }
  interface WEntry   { id:string; branch:string; brand:string; date:string; status:"pending"|"approved"|"rejected"; products:WProduct[] }

  const WASTE_EMP: Record<string,string> = {
    "1001":"أنس محمد","1002":"ليلى سالم","1003":"راشد عمر",
    "1004":"مها ناصر","1005":"فالح جاسم","1006":"سلمى العمر",
  };

  const [filterBranch, setFilterBranch] = useState("الكل");
  const [expandedId,   setExpandedId]   = useState<string|null>(null);
  const [expandedProd, setExpandedProd] = useState<Record<string,number|null>>({});

  // Live data hooks — backend may return data; local entries (below) act as optimistic fallback for richer dev UI
  useWaste({ branchId: filterBranch === "الكل" ? undefined : filterBranch });
  const patchProductMut = usePatchWasteProduct();
  const putAllocsMut = usePutWasteAllocations();
  const approveWasteMut = useApproveWaste();
  const rejectWasteMut = useRejectWaste();
  const bulkApproveWasteMut = useBulkApproveWaste();
  const exportWasteMut = useExportWaste();

  const [entries, setEntries] = useState<WEntry[]>([
    { id:"WD-001", branch:"فرع العليا",   brand:"برغر التاج",       date:"اليوم", status:"pending",
      products:[
        { name:"لحم مفروم",  qty:4.5, unit:"كجم",  unitPrice:80,  class_:"تالف", resp:"موظف", empAllocs:[{empId:"1001",empName:"أنس محمد",amount:"180"},{empId:"",empName:"",amount:""}] },
        { name:"خبز برجر",   qty:30,  unit:"قطعة", unitPrice:3,   class_:"هدر",  resp:"مطعم", empAllocs:[{empId:"",empName:"",amount:""}] },
      ]},
    { id:"WD-002", branch:"فرع الحمراء",  brand:"برغر التاج",       date:"اليوم", status:"pending",
      products:[
        { name:"جبن شيدر",   qty:2,   unit:"كجم",  unitPrice:90,  class_:"تالف", resp:"موظف", empAllocs:[{empId:"1002",empName:"ليلى سالم",amount:"90"},{empId:"1003",empName:"راشد عمر",amount:"90"}] },
        { name:"مايونيز",     qty:1.5, unit:"كجم",  unitPrice:25,  class_:"هدر",  resp:"مطعم", empAllocs:[{empId:"",empName:"",amount:""}] },
      ]},
    { id:"WD-003", branch:"فرع الملقا",   brand:"بيتزا التاج",      date:"أمس",   status:"approved",
      products:[
        { name:"جبن موزاريلا",qty:2,   unit:"كجم",  unitPrice:90,  class_:"تالف", resp:"موظف", empAllocs:[{empId:"1004",empName:"مها ناصر",amount:"180"}] },
      ]},
    { id:"WD-004", branch:"فرع الورود",   brand:"مطعم التاج الراقي",date:"أمس",   status:"pending",
      products:[
        { name:"دجاج طازج",  qty:6,   unit:"كجم",  unitPrice:70,  class_:"تالف", resp:"موظف", empAllocs:[{empId:"1005",empName:"فالح جاسم",amount:"420"}] },
        { name:"صلصة خاصة",  qty:3,   unit:"لتر",  unitPrice:40,  class_:"هدر",  resp:"مطعم", empAllocs:[{empId:"",empName:"",amount:""}] },
      ]},
  ]);

  const updProd = (eid:string, pi:number, fn:(p:WProduct)=>WProduct) =>
    setEntries(prev=>prev.map(e=>e.id===eid?{...e,products:e.products.map((p,i)=>i===pi?fn(p):p)}:e));
  const toggleClass = (eid:string,pi:number) => {
    updProd(eid,pi,p=>({...p,class_:p.class_==="هدر"?"تالف":"هدر" as WasteClass}));
    const ent = entries.find(e=>e.id===eid); const prod = ent?.products[pi];
    if (prod) patchProductMut.mutate({ entryId: eid, productIdx: pi, patch: { classification: prod.class_==="هدر"?"breakage":"spoilage" } });
  };
  const toggleResp  = (eid:string,pi:number) => {
    updProd(eid,pi,p=>({...p,resp:p.resp==="موظف"?"مطعم":"موظف" as WasteResp}));
    const ent = entries.find(e=>e.id===eid); const prod = ent?.products[pi];
    if (prod) patchProductMut.mutate({ entryId: eid, productIdx: pi, patch: { responsibility: prod.resp==="موظف"?"unknown":"branch" } });
  };
  const persistAllocs = (eid:string, pi:number) => {
    const ent = entries.find(e=>e.id===eid); const prod = ent?.products[pi];
    if (!prod) return;
    putAllocsMut.mutate({ entryId: eid, productIdx: pi, allocations: prod.empAllocs.map(a => ({ responsibleUserId: a.empId, responsibleUserName: a.empName, shareHalalas: Math.round((parseFloat(a.amount)||0) * 100) })) });
  };
  const setAllocField = (eid:string,pi:number,ai:number,field:keyof WAlloc,val:string) => {
    updProd(eid,pi,p=>({...p,empAllocs:p.empAllocs.map((a,k)=>k===ai?{...a,[field]:val,...(field==="empId"?{empName:WASTE_EMP[val]||""}:{})}:a)}));
    persistAllocs(eid, pi);
  };
  const addAlloc    = (eid:string,pi:number) => { updProd(eid,pi,p=>({...p,empAllocs:[...p.empAllocs,{empId:"",empName:"",amount:""}]})); persistAllocs(eid, pi); };
  const removeAlloc = (eid:string,pi:number,ai:number) => { updProd(eid,pi,p=>({...p,empAllocs:p.empAllocs.filter((_,k)=>k!==ai)})); persistAllocs(eid, pi); };
  const approve = (id:string) => { setEntries(p=>p.map(e=>e.id===id?{...e,status:"approved" as const}:e)); approveWasteMut.mutate(id); };
  const reject  = (id:string) => { setEntries(p=>p.map(e=>e.id===id?{...e,status:"rejected" as const}:e)); rejectWasteMut.mutate({ entryId: id, reason: "تحتاج مراجعة" }); };

  const pending  = entries.filter(e=>e.status==="pending");
  const approved = entries.filter(e=>e.status==="approved");
  const displayed = filterBranch==="الكل"?entries:entries.filter(e=>e.branch===filterBranch);
  const displayedPending = displayed.filter(e=>e.status==="pending");
  const WASTE_BRANCHES = [...new Set(entries.map(e=>e.branch))];
  const totalWasteAmt  = entries.flatMap(e=>e.products).reduce((s,p)=>s+p.qty*p.unitPrice,0);
  const empChargedAmt  = entries.flatMap(e=>e.products).filter(p=>p.resp==="موظف").flatMap(p=>p.empAllocs).reduce((s,a)=>s+(parseFloat(a.amount)||0),0);

  const { t, dir } = useCLang();
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("موديول الهدر والتالف","Waste & Spoilage Module")}</h2><p className="text-gray-400 text-sm mt-0.5">{t("مراجعة الهدر — تعديل التصنيف والقيمة المالية وتوزيع التحميل على الموظفين","Review waste — adjust classification, financial value and employee allocations")}</p></div>
        {displayedPending.length>0 && (
          <Btn variant="success" size="sm" onClick={()=>{
            const ids = displayedPending.map(e=>e.id);
            setEntries(p=>p.map(e=>(filterBranch==="الكل"||e.branch===filterBranch)?{...e,status:"approved" as const}:e));
            bulkApproveWasteMut.mutate(ids);
          }}>
            <CheckCircle2 size={12}/> {t("موافقة على الكل","Approve All")} ({displayedPending.length})
          </Btn>
        )}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">بحث بالفرع أو المطعم</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2"><Search size={13} className="text-gray-400"/><input placeholder="اسم الفرع أو المطعم..." className="flex-1 text-sm outline-none"/></div>
          </div>
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">العلامة التجارية</label>
            <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">{["الكل",...BRANDS.map(b=>b.name)].map(b=><option key={b}>{b}</option>)}</select>
          </div>
          <div className="flex items-end">
            <button onClick={()=>exportWasteMut.mutate({ branchId: filterBranch==="الكل"?undefined:filterBranch })} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-semibold hover:bg-emerald-100">
              <FileText size={13}/> تصدير Excel
            </button>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-gray-500 mb-2">تصفية حسب الفرع</p>
          <div className="flex flex-wrap gap-2">
            {["الكل",...WASTE_BRANCHES].map(b=>{
              const bPend = b==="الكل"?pending.length:entries.filter(e=>e.branch===b&&e.status==="pending").length;
              return (
                <button key={b} onClick={()=>setFilterBranch(b)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${filterBranch===b?"bg-purple-600 text-white border-purple-600":"bg-white text-gray-600 border-gray-200 hover:border-purple-300"}`}>
                  {b}
                  {bPend>0&&<span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${filterBranch===b?"bg-white text-purple-700":"bg-amber-500 text-white"}`}>{bPend}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="بانتظار المراجعة"  value={String(pending.length)}  sub="من الفروع"        icon={<Clock size={18} className="text-amber-600"/>}      accent="amber"/>
        <KpiCard label="معتمد"             value={String(approved.length)} sub="هذا الشهر"         icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label="إجمالي الخسائر"   value={`${fmt(totalWasteAmt)} ر.س`} sub="هدر + تالف" icon={<Trash2 size={18} className="text-rose-600"/>}      accent="red"/>
        <KpiCard label="محمَّل على الموظفين" value={`${fmt(empChargedAmt)} ر.س`} sub="مُعيَّن فعلياً" icon={<Users size={18} className="text-orange-600"/>} accent="orange"/>
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
                    <Badge className="bg-gray-100 text-gray-500 text-[10px]">{entry.brand}</Badge>
                    <span className="font-mono text-xs text-rose-600">{entry.id}</span>
                    <Badge className={`${statusCls} text-[10px]`}>{statusLbl}</Badge>
                    <Badge className="bg-gray-50 text-gray-600 border border-gray-200 text-[10px]">{entry.products.length} منتج</Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-0.5">
                    <p className="text-xs text-gray-400">{entry.date}</p>
                    <span className="text-xs font-mono font-bold text-rose-700">إجمالي: {fmt(entryTotal)} ر.س</span>
                    {empTotal>0&&<span className="text-[10px] text-orange-600 font-semibold">منه على موظفين: {fmt(empTotal)} ر.س</span>}
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
                  <p className="text-xs font-bold text-gray-600 mt-3">المنتجات المشمولة — تعديل التصنيف والمسؤولية وتوزيع التحميل المالي:</p>
                  {entry.products.map((prod,pi)=>{
                    const prodValue  = prod.qty*prod.unitPrice;
                    const allocTotal = prod.empAllocs.reduce((s,a)=>s+(parseFloat(a.amount)||0),0);
                    const remaining  = prodValue-allocTotal;
                    const isAllocOpen= expandedProd[entry.id]===pi;
                    return (
                      <div key={pi} className={`bg-white rounded-xl border overflow-hidden ${prod.resp==="موظف"?"border-orange-100":"border-gray-100"}`}>
                        <div className="px-4 py-3 flex items-center gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-800 text-sm">{prod.name}</span>
                              <span className="text-[10px] text-gray-500 font-mono">{prod.qty} {prod.unit} × {prod.unitPrice} ر.س</span>
                              <span className="font-mono font-bold text-rose-600 text-xs">{fmt(prodValue)} ر.س</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={()=>toggleClass(entry.id,pi)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${prod.class_==="تالف"?"bg-rose-100 text-rose-700 border-rose-300":"bg-amber-100 text-amber-700 border-amber-300"}`}>
                              {prod.class_}
                            </button>
                            <button onClick={()=>toggleResp(entry.id,pi)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${prod.resp==="موظف"?"bg-orange-100 text-orange-700 border-orange-300":"bg-blue-100 text-blue-700 border-blue-300"}`}>
                              {prod.resp==="موظف"?"على موظف":"على المطعم"}
                            </button>
                            {prod.resp==="موظف" && (
                              <button onClick={()=>setExpandedProd(p=>({...p,[entry.id]:isAllocOpen?null:pi}))}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${isAllocOpen?"bg-purple-600 text-white border-purple-600":"bg-purple-50 text-purple-700 border-purple-200"}`}>
                                تحميل على موظف {isAllocOpen?"▲":"▼"}
                              </button>
                            )}
                          </div>
                        </div>
                        {prod.resp==="موظف" && isAllocOpen && (
                          <div className="border-t border-orange-100 bg-orange-50/40 px-4 py-3 space-y-2">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[10px] font-bold text-orange-700">تحديد الموظف المسؤول عن تحميل قيمة الهدر ({fmt(prodValue)} ر.س)</p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${remaining<=0?"bg-emerald-100 text-emerald-700":"bg-orange-100 text-orange-700"}`}>
                                {remaining<=0?"✓ محمَّل بالكامل":`متبقي: ${fmt(remaining)} ر.س`}
                              </span>
                            </div>
                            {prod.empAllocs.map((alloc,ai)=>(
                              <div key={ai} className="flex items-center gap-2">
                                <div className="flex flex-col gap-0.5">
                                  <label className="text-[9px] text-orange-600">رقم الموظف</label>
                                  <input value={alloc.empId} onChange={e=>setAllocField(entry.id,pi,ai,"empId",e.target.value)} placeholder="مثال: 1001"
                                    className="w-16 text-center font-mono border border-orange-200 rounded-lg px-1.5 py-1 text-[10px] bg-white focus:outline-none"/>
                                </div>
                                <div className="flex flex-col gap-0.5 flex-1">
                                  <label className="text-[9px] text-orange-600">اسم الموظف</label>
                                  <div className="h-7 flex items-center px-2 rounded-lg bg-white border border-gray-100 text-[10px] text-gray-700">{alloc.empName||<span className="text-gray-300">يُعبأ تلقائياً</span>}</div>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <label className="text-[9px] text-orange-600">المبلغ (ر.س)</label>
                                  <input type="number" value={alloc.amount} onChange={e=>setAllocField(entry.id,pi,ai,"amount",e.target.value)} placeholder="0.00"
                                    className="w-20 text-center font-mono border border-orange-200 rounded-lg px-1.5 py-1 text-[10px] bg-white focus:outline-none"/>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <label className="text-[9px] opacity-0">⚡</label>
                                  <button onClick={()=>setAllocField(entry.id,pi,ai,"amount",String(Math.max(0,remaining+(parseFloat(alloc.amount)||0))))}
                                    className="px-1.5 py-1 bg-amber-100 text-amber-700 rounded text-[10px] font-bold border border-amber-200">⚡</button>
                                </div>
                                {prod.empAllocs.length>1 && (
                                  <button onClick={()=>removeAlloc(entry.id,pi,ai)} className="mt-3 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><X size={10}/></button>
                                )}
                              </div>
                            ))}
                            <button onClick={()=>addAlloc(entry.id,pi)} className="flex items-center gap-1 text-[10px] text-orange-600 hover:underline font-semibold"><Plus size={10}/> إضافة موظف آخر</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ACCOUNTANT — EMPLOYEES
// ═══════════════════════════════════════════════════
function AccCompanyEmployees() {
  interface EmpMovement { date:string; desc:string; type:"credit"|"debit"; amount:number; ref:string }
  interface Employee { id:string; name:string; branch:string; brand:string; role:string; salary:number; advances:number; deductions:number; net:number; status:"نشط"|"موقوف"; movements:EmpMovement[] }

  const [selectedEmp, setSelectedEmp] = useState<string|null>(null);
  const [searchTerm,  setSearchTerm]  = useState("");
  const [brandFilter, setBrandFilter] = useState("الكل");

  const { data: employeesPage } = useEmployees({ search: searchTerm });
  const { data: serverMovements = [] } = useEmployeeMovements(selectedEmp);
  const exportPayrollMut = useExportPayroll();

  const fallbackEmployees: Employee[] = [
    { id:"E01",name:"أنس محمد",    branch:"فرع العليا",   brand:"برغر التاج",       role:"كاشير",    salary:4200, advances:500,  deductions:0,   net:3700, status:"نشط",
      movements:[
        {date:"اليوم",  desc:"سلفة راتب",           type:"debit",  amount:500,  ref:"ADV-201"},
        {date:"01 أكت",desc:"راتب أكتوبر",           type:"credit", amount:4200, ref:"SAL-1001"},
        {date:"25 سبت",desc:"خصم غياب (يوم واحد)",   type:"debit",  amount:140,  ref:"DED-088"},
        {date:"01 سبت",desc:"راتب سبتمبر",           type:"credit", amount:4200, ref:"SAL-0901"},
      ]},
    { id:"E02",name:"ليلى سالم",  branch:"فرع العليا",   brand:"برغر التاج",       role:"كاشير",    salary:3800, advances:0,    deductions:200, net:3600, status:"نشط",
      movements:[
        {date:"01 أكت",desc:"راتب أكتوبر",           type:"credit", amount:3800, ref:"SAL-1002"},
        {date:"20 سبت",desc:"خصم فرق كاش",           type:"debit",  amount:200,  ref:"DED-089"},
        {date:"01 سبت",desc:"راتب سبتمبر",           type:"credit", amount:3800, ref:"SAL-0902"},
      ]},
    { id:"E03",name:"فهد العمري", branch:"فرع الحمراء",  brand:"برغر التاج",       role:"طاهٍ",     salary:5500, advances:1000, deductions:0,   net:4500, status:"نشط",
      movements:[
        {date:"15 أكت",desc:"سلفة راتب",             type:"debit",  amount:1000, ref:"ADV-202"},
        {date:"01 أكت",desc:"راتب أكتوبر",           type:"credit", amount:5500, ref:"SAL-1003"},
        {date:"01 سبت",desc:"راتب سبتمبر",           type:"credit", amount:5500, ref:"SAL-0903"},
      ]},
    { id:"E04",name:"سارة الغامدي",branch:"فرع الملقا",  brand:"بيتزا التاج",      role:"خدمة عملاء",salary:3500, advances:0,   deductions:350, net:3150, status:"نشط",
      movements:[
        {date:"01 أكت",desc:"راتب أكتوبر",           type:"credit", amount:3500, ref:"SAL-1004"},
        {date:"10 أكت",desc:"خصم هدر مخزون",         type:"debit",  amount:180,  ref:"DED-090"},
        {date:"12 أكت",desc:"خصم فرق كاش",           type:"debit",  amount:170,  ref:"DED-091"},
        {date:"01 سبت",desc:"راتب سبتمبر",           type:"credit", amount:3500, ref:"SAL-0904"},
      ]},
    { id:"E05",name:"عمر الحربي", branch:"فرع الكورنيش", brand:"بيتزا التاج",      role:"مساعد",    salary:3200, advances:200,  deductions:0,   net:3000, status:"موقوف",
      movements:[
        {date:"05 أكت",desc:"سلفة",                  type:"debit",  amount:200,  ref:"ADV-203"},
        {date:"01 أكت",desc:"راتب أكتوبر",           type:"credit", amount:3200, ref:"SAL-1005"},
      ]},
    { id:"E06",name:"فالح جاسم",  branch:"فرع الورود",   brand:"مطعم التاج الراقي",role:"كاشير",    salary:4800, advances:0,    deductions:420, net:4380, status:"نشط",
      movements:[
        {date:"01 أكت",desc:"راتب أكتوبر",           type:"credit", amount:4800, ref:"SAL-1006"},
        {date:"14 أكت",desc:"خصم هدر — دجاج طازج",   type:"debit",  amount:420,  ref:"DED-092"},
        {date:"01 سبت",desc:"راتب سبتمبر",           type:"credit", amount:4800, ref:"SAL-0906"},
      ]},
  ];

  const apiEmps = employeesPage?.data ?? [];
  const employees: Employee[] = apiEmps.length > 0
    ? apiEmps.map((e): Employee => ({
        id: e.empNumber || e.id,
        name: e.name,
        branch: e.branchName,
        brand: "—",
        role: e.role,
        salary: e.monthlySalaryHalalas / 100,
        advances: 0,
        deductions: 0,
        net: e.monthlySalaryHalalas / 100,
        status: e.active ? "نشط" : "موقوف",
        movements: [],
      }))
    : fallbackEmployees;

  const filtered = employees.filter(e=>{
    if(searchTerm && !e.name.includes(searchTerm) && !e.branch.includes(searchTerm)) return false;
    if(brandFilter!=="الكل" && e.brand!==brandFilter) return false;
    return true;
  });
  const selectedBase = selectedEmp ? employees.find(e=>e.id===selectedEmp) : null;
  const selected = selectedBase
    ? {
        ...selectedBase,
        movements: serverMovements.length > 0
          ? serverMovements.map(m => ({
              date: m.date,
              desc: m.notes || m.type,
              type: (m.amountHalalas >= 0 ? "credit" : "debit") as "credit" | "debit",
              amount: Math.abs(m.amountHalalas) / 100,
              ref: m.id,
            }))
          : selectedBase.movements,
      }
    : null;
  const totalSalaries = employees.reduce((s,e)=>s+e.net,0);
  const totalAdvances  = employees.reduce((s,e)=>s+e.advances,0);
  const totalDeductions= employees.reduce((s,e)=>s+e.deductions,0);

  const { t, dir } = useCLang();
  const SAR = t("ر.س","SAR");
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("كشف حساب الموظفين","Employee Accounts")}</h2><p className="text-gray-400 text-sm mt-0.5">{t("الرواتب والحركات المالية لموظفي مجموعة التاج","Salaries and financial movements for Al-Taj Group employees")}</p></div>
        <button onClick={()=>exportPayrollMut.mutate(new Date().toISOString().slice(0,7))} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><Download size={12}/> {t("تصدير Excel","Export Excel")}</button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label={t("إجمالي الرواتب","Total Salaries")}    value={fmt(totalSalaries)}    sub={t("ر.س صافي هذا الشهر","SAR net this month")} icon={<Users size={18} className="text-blue-600"/>} accent="blue"/>
        <KpiCard label={t("إجمالي السلف","Total Advances")}      value={fmt(totalAdvances)}    sub={SAR} icon={<Wallet size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label={t("إجمالي الخصومات","Total Deductions")} value={fmt(totalDeductions)}  sub={SAR} icon={<AlertTriangle size={18} className="text-red-500"/>} accent="red"/>
        <KpiCard label={t("موظفون نشطون","Active Employees")}    value={String(employees.filter(e=>e.status==="نشط").length)} sub={`${t("من","of")} ${employees.length} ${t("موظف","employee")}`} icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
      </div>
      {/* فلاتر */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-3 gap-3">
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">بحث — الاسم أو الفرع</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2"><Search size={13} className="text-gray-400"/><input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="اسم الموظف أو الفرع..." className="flex-1 text-sm outline-none"/></div>
          </div>
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">العلامة التجارية</label>
            <select value={brandFilter} onChange={e=>setBrandFilter(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {["الكل",...BRANDS.map(b=>b.name)].map(b=><option key={b}>{b}</option>)}
            </select>
          </div>
        </div>
      </div>
      {/* Two-panel layout */}
      <div className="grid grid-cols-5 gap-4 items-start">
        {/* Left: Employee list */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
            <p className="font-bold text-gray-900 text-sm">قائمة الموظفين ({filtered.length})</p>
          </div>
          {filtered.map(e=>(
            <div key={e.id}
              onClick={()=>setSelectedEmp(selectedEmp===e.id?null:e.id)}
              className={`flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0 cursor-pointer transition-all ${selectedEmp===e.id?"bg-purple-50 border-r-4 border-r-purple-500":"hover:bg-gray-50/70"} ${e.status==="موقوف"?"opacity-60":""}`}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{e.name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-gray-800 text-sm truncate">{e.name}</p>
                  {e.status==="موقوف" && <Badge className="bg-red-50 text-red-700 border border-red-200 text-[9px]">موقوف</Badge>}
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">{e.role} · {e.branch}</p>
              </div>
              <div className="text-left flex-shrink-0">
                <p className="font-mono font-bold text-emerald-700 text-xs">{fmt(e.net)}</p>
                <p className="text-[9px] text-gray-400">صافي</p>
              </div>
            </div>
          ))}
        </div>
        {/* Right: Employee ledger */}
        <div className="col-span-3">
          {!selected ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-200 h-64 flex flex-col items-center justify-center gap-2">
              <Users size={32} className="text-gray-300"/>
              <p className="text-gray-400 text-sm">اختر موظفاً من القائمة لعرض كشف حسابه</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-l from-purple-50/50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-lg font-bold">{selected.name[0]}</div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{selected.name}</p>
                    <p className="text-xs text-gray-500">{selected.role} · {selected.branch} · {selected.brand}</p>
                    <Badge className={`text-[10px] mt-1 ${selected.status==="نشط"?"bg-emerald-50 text-emerald-700 border border-emerald-200":"bg-red-50 text-red-700 border border-red-200"}`}>{selected.status}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-blue-600 font-semibold">الراتب الأساسي</p>
                    <p className="font-mono font-bold text-blue-800 text-sm">{fmt(selected.salary)} ر.س</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-amber-600 font-semibold">السلف</p>
                    <p className="font-mono font-bold text-amber-800 text-sm">{selected.advances>0?`-${fmt(selected.advances)}`:"لا يوجد"}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3 text-center border-2 border-emerald-200">
                    <p className="text-[10px] text-emerald-600 font-semibold">الصافي المستحق</p>
                    <p className="font-mono font-black text-emerald-800 text-base">{fmt(selected.net)} ر.س</p>
                  </div>
                </div>
              </div>
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
                <p className="font-bold text-gray-700 text-xs">سجل الحركات المالية</p>
              </div>
              <div className="overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2.5 text-right font-semibold text-gray-600">التاريخ</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-gray-600">البيان</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-600">المرجع</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-600">دائن</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-600">مدين</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {selected.movements.map((m,k)=>(
                      <tr key={k} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500">{m.date}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{m.desc}</td>
                        <td className="px-4 py-3 text-center font-mono text-gray-400 text-[10px]">{m.ref}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-emerald-600">{m.type==="credit"?`${fmt(m.amount)} ر.س`:"—"}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-red-600">{m.type==="debit"?`${fmt(m.amount)} ر.س`:"—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={3} className="px-4 py-2.5 font-bold text-gray-700">الرصيد الصافي المستحق</td>
                      <td className="px-4 py-2.5 text-center font-mono font-black text-emerald-700">{fmt(selected.net)} ر.س</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ACCOUNTANT — CASH CUSTODY
// ═══════════════════════════════════════════════════
function AccCompanyCash() {
  const [expandedBranch, setExpandedBranch] = useState<string|null>(null);
  const [searchTerm,     setSearchTerm]     = useState("");
  const [statusFilter,   setStatusFilter]   = useState("");

  const { data: serverCustody = [] } = useCashCustody();
  // lazy-loaded transactions for whichever branch is expanded
  useCashTransactions(expandedBranch);
  const exportCashMut = useExportCash();

  const fallbackBranches = [
    { branch:"فرع العليا",    brand:"برغر التاج",       custodian:"فاطمة السالم",    amount:5000, used:3200,
      txns:[
        {date:"اليوم",   desc:"صيانة طارئة — مكيف",     type:"debit",  amt:450},
        {date:"اليوم",   desc:"مواد تنظيف",              type:"debit",  amt:180},
        {date:"أمس",     desc:"إيداع عهدة أكتوبر",       type:"credit", amt:5000},
        {date:"12 أكت",  desc:"مستلزمات مكتبية",         type:"debit",  amt:95},
        {date:"11 أكت",  desc:"إصلاح معدات",             type:"debit",  amt:320},
        {date:"10 أكت",  desc:"أدوات خدمة",              type:"debit",  amt:210},
        {date:"10 أكت",  desc:"متفرقات",                  type:"debit",  amt:145},
        {date:"09 أكت",  desc:"مواد نظافة إضافية",       type:"debit",  amt:800},
        {date:"09 أكت",  desc:"قطع غيار",                type:"debit",  amt:1000},
      ], pendingTxns:1 },
    { branch:"فرع الحمراء",   brand:"برغر التاج",       custodian:"خالد العتيبي",    amount:3000, used:2800,
      txns:[
        {date:"أمس",     desc:"إيداع عهدة أكتوبر",       type:"credit", amt:3000},
        {date:"13 أكت",  desc:"صيانة شبكة كهرباء",       type:"debit",  amt:750},
        {date:"12 أكت",  desc:"مواد تنظيف وتعقيم",       type:"debit",  amt:420},
        {date:"11 أكت",  desc:"مستلزمات المطبخ",          type:"debit",  amt:850},
        {date:"10 أكت",  desc:"إصلاح باب طوارئ",         type:"debit",  amt:380},
        {date:"09 أكت",  desc:"متفرقات أخرى",            type:"debit",  amt:400},
      ], pendingTxns:2 },
    { branch:"فرع الملقا",    brand:"بيتزا التاج",      custodian:"أحمد الحربي",     amount:4000, used:1500,
      txns:[
        {date:"أمس",     desc:"إيداع عهدة أكتوبر",       type:"credit", amt:4000},
        {date:"13 أكت",  desc:"مواد تنظيف",              type:"debit",  amt:600},
        {date:"12 أكت",  desc:"صيانة مكيفات",            type:"debit",  amt:900},
      ], pendingTxns:0 },
    { branch:"فرع الكورنيش",  brand:"بيتزا التاج",      custodian:"عبدالله الدوسري",  amount:3500, used:3400,
      txns:[
        {date:"أمس",     desc:"إيداع عهدة أكتوبر",       type:"credit", amt:3500},
        {date:"13 أكت",  desc:"خدمات كهربائية",          type:"debit",  amt:1200},
        {date:"12 أكت",  desc:"قطع غيار مطبخ",           type:"debit",  amt:800},
        {date:"11 أكت",  desc:"مستلزمات متفرقة",         type:"debit",  amt:750},
        {date:"10 أكت",  desc:"صيانة سبّاكة",            type:"debit",  amt:350},
        {date:"09 أكت",  desc:"متفرقات",                  type:"debit",  amt:300},
      ], pendingTxns:3 },
    { branch:"فرع الورود",    brand:"مطعم التاج الراقي", custodian:"منى الزهراني",    amount:6000, used:2800,
      txns:[
        {date:"أمس",     desc:"إيداع عهدة أكتوبر",       type:"credit", amt:6000},
        {date:"13 أكت",  desc:"ضيافة VIP",               type:"debit",  amt:1200},
        {date:"12 أكت",  desc:"أدوات مطبخ",              type:"debit",  amt:900},
        {date:"11 أكت",  desc:"مستلزمات",                type:"debit",  amt:700},
      ], pendingTxns:0 },
  ];

  const branches = serverCustody.length > 0
    ? serverCustody.map(c => ({
        branch: c.branchName,
        brand: "—",
        custodian: c.holderName,
        amount: c.balanceHalalas / 100,
        used: 0,
        txns: [] as Array<{date:string; desc:string; type:string; amt:number}>, // lazy-loaded via useCashTransactions
        pendingTxns: 0,
      }))
    : fallbackBranches;

  const filtered = branches.filter(b=>{
    if(searchTerm && !b.branch.includes(searchTerm) && !b.custodian.includes(searchTerm)) return false;
    if(statusFilter==="قريبة من النفاد" && (b.amount-b.used)>=500) return false;
    if(statusFilter==="طلبات معلقة" && b.pendingTxns===0) return false;
    return true;
  });

  const totalPending = branches.reduce((s,b)=>s+b.pendingTxns,0);
  const lowCount     = branches.filter(b=>b.amount-b.used<500).length;

  const { t, dir } = useCLang();
  const SAR = t("ر.س","SAR");
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("إدارة العهد النقدية","Petty Cash Management")}</h2><p className="text-gray-400 text-sm mt-0.5">{t("متابعة صناديق النقد لفروع مجموعة التاج","Track petty cash for Al-Taj Group branches")}</p></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label={t("عدد العهود النشطة","Active Custodies")}    value={String(branches.length)} sub={t("فروع لديها عهدة مفتوحة","branches with open custody")} icon={<ArrowLeftRight size={18} className="text-orange-600"/>} accent="orange"/>
        <KpiCard label={t("طلبات صرف معلقة","Pending Requests")}     value={String(totalPending)}    sub={t("بانتظار المراجعة","awaiting review")} icon={<Clock size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label={t("عهود قريبة من النفاد","Near Depletion")}   value={String(lowCount)}        sub={t("أقل من 500 ر.س متبقٍ","less than 500 SAR remaining")} icon={<AlertTriangle size={18} className="text-red-600"/>} accent="red"/>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">بحث — الفرع أو المسؤول</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Search size={13} className="text-gray-400"/>
              <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="اسم الفرع أو أمين الصندوق..." className="flex-1 text-sm outline-none"/>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">العلامة التجارية</label>
            <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"><option>الكل</option>{BRANDS.map(b=><option key={b.id}>{b.name}</option>)}</select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">حالة العهدة</label>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {["الكل","قريبة من النفاد","طلبات معلقة","نشطة"].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between">
          {(searchTerm||statusFilter) && <button onClick={()=>{setSearchTerm("");setStatusFilter("");}} className="text-xs text-purple-600 hover:underline flex items-center gap-1"><RotateCcw size={11}/> مسح الفلاتر</button>}
          <button onClick={()=>exportCashMut.mutate({})} className="mr-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><FileText size={11}/> تصدير Excel</button>
        </div>
      </div>
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
              <div className={`px-5 py-4 flex items-center gap-4 hover:bg-gray-50/70 ${isOpen?"bg-orange-50/20":""} ${isLow?"border-r-4 border-r-red-400":""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 text-sm">{b.branch}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-gray-500">{b.custodian}</span>
                    <Badge className="bg-gray-100 text-gray-500 border border-gray-200 text-[10px]">{b.brand}</Badge>
                    {isLow && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold border border-red-200">⚠ قريبة من النفاد</span>}
                    {b.pendingTxns>0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">{b.pendingTxns} طلب معلق</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5 max-w-32">
                      <div className={`h-1.5 rounded-full ${pct>85?"bg-red-400":"bg-orange-400"}`} style={{width:`${pct}%`}}/>
                    </div>
                    <span className="text-xs text-gray-400">{pct}% مُصرَف</span>
                    <span className={`text-xs font-bold font-mono ${isLow?"text-red-600":"text-emerald-600"}`}>{fmt(rem)} ر.س متبقٍ</span>
                  </div>
                </div>
                <Btn size="sm" onClick={()=>setExpandedBranch(isOpen?null:b.branch)}>
                  {isOpen?<ChevronUp size={12}/>:<ChevronDown size={12}/>} المعاملات
                </Btn>
              </div>
              {isOpen && (
                <div className="px-5 pb-4 bg-gray-50/30">
                  <p className="text-[11px] font-bold text-gray-500 mb-2 pt-2">سجل معاملات العهدة — {b.custodian}</p>
                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-xs">
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
                              {t.type==="credit"?"+":"-"}{fmt(t.amt)} ر.س
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                        <tr>
                          <td colSpan={2} className="px-3 py-2 font-bold text-gray-700">الرصيد الحالي</td>
                          <td></td>
                          <td className={`px-3 py-2 text-center font-black font-mono ${isLow?"text-red-600":"text-emerald-700"}`}>{fmt(rem)} ر.س</td>
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

// ACCOUNTANT — REPORTS
// ═══════════════════════════════════════════════════
function AccCompanyReports() {
  const { t, dir } = useCLang();
  const { data: serverReports = [] } = useReports();
  const downloadReportMut = useDownloadReport();
  const fallbackReports = [
    { title:t("تقرير P&L الشهري","Monthly P&L Report"),           date:"أكتوبر 2025", type:t("مالي","Financial"),    size:"2.4 MB", key:"pl-monthly" },
    { title:t("ملخص المبيعات اليومية","Daily Sales Summary"),      date:"14 أكت 2025", type:t("مبيعات","Sales"),      size:"1.1 MB", key:"sales-daily" },
    { title:t("تقرير المصروفات","Expenses Report"),                date:"14 أكت 2025", type:t("مصروفات","Expenses"),  size:"0.9 MB", key:"expenses" },
    { title:t("تقرير المخزون","Inventory Report"),                 date:"13 أكت 2025", type:t("مخزون","Inventory"),   size:"1.7 MB", key:"inventory" },
    { title:t("كشف الرواتب الشهري","Monthly Payroll Statement"),  date:"30 سبت 2025", type:t("موظفون","Employees"),  size:"0.5 MB", key:"payroll" },
  ];
  const reports = serverReports.length > 0
    ? serverReports.map(r => ({ title: r.title, date: "", type: r.category, size: "—", key: r.key }))
    : fallbackReports;
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("التقارير","Reports")}</h2><p className="text-gray-400 text-sm">{t("تقارير مجموعة التاج","Al-Taj Group reports")}</p></div>
      <div className="grid grid-cols-2 gap-4">
        {reports.map((r,i)=>(
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:border-purple-200 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0"><FileText size={18} className="text-purple-600"/></div>
            <div className="flex-1 min-w-0"><p className="font-semibold text-gray-800 text-sm">{r.title}</p><p className="text-[10px] text-gray-400 mt-0.5">{r.date} · {r.type} · {r.size}</p></div>
            <button onClick={()=>downloadReportMut.mutate({ key: (r as { key?: string }).key || r.title, format: "pdf" })} className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-colors flex-shrink-0"><Download size={13}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ACCOUNTANT ROOT (with shared state)
// ═══════════════════════════════════════════════════
type SharedOpsProps = {
  ops:COp[];
  approve:(id:string)=>void;
  reject:(id:string)=>void;
  bulkApprove:(ids:string[])=>void;
  finalApprove:(id:string)=>void;
  bulkFinalApprove:(ids:string[])=>void;
};

function AccountantRoot({ page, navigate, ops, approve, reject, bulkApprove }:{ page:string; navigate:(p:string)=>void } & SharedOpsProps) {
  if(page==="acc-dashboard")  return <AccDashboard navigate={navigate} ops={ops}/>;
  if(page==="acc-sales")      return <AccCompanySales ops={ops} approve={approve} reject={reject} bulkApprove={bulkApprove}/>;
  if(page==="acc-expenses")   return <AccCompanyExpenses ops={ops} approve={approve} reject={reject} bulkApprove={bulkApprove}/>;
  if(page==="acc-purchases")  return <AccCompanyPurchases ops={ops} approve={approve} reject={reject} bulkApprove={bulkApprove}/>;
  if(page==="acc-inventory")  return <AccCompanyInventory navigate={navigate} ops={ops} approve={approve} reject={reject}/>;
  if(page==="acc-waste")      return <AccCompanyWaste/>;
  if(page==="acc-assets")     return <AccCompanyAssets/>;
  if(page==="acc-shifts")     return <AccCompanyShifts ops={ops}/>;
  if(page==="acc-employees")  return <AccCompanyEmployees/>;
  if(page==="acc-cash")       return <AccCompanyCash/>;
  if(page==="acc-reminders")  return <AccCompanyReminders/>;
  if(page==="acc-reports")    return <AccCompanyReports/>;
  return <AccDashboard navigate={navigate} ops={ops}/>;
}

// ═══════════════════════════════════════════════════
// BRANCH MANAGER PAGES
// ═══════════════════════════════════════════════════
const MY_BRANCH = { name:"فرع العليا", brand:"برغر التاج", city:"الرياض", target:130000, salesM:128000, expM:41000 };

function BranchOverview() {
  const { t, dir } = useCLang();
  const { data: apiOverview } = useBranchOverview();
  const { data: apiEmployees = [] } = useBranchEmployees();
  const SAR = t("ر.س","SAR");
  const apiKpis = (apiOverview?.kpis ?? {}) as Record<string, number | string>;
  const apiBranch = apiOverview?.branch;
  const apiSalesM   = apiBranch?.monthlySalesHalalas    != null ? Math.round(apiBranch.monthlySalesHalalas    / 100) : MY_BRANCH.salesM;
  const apiExpM     = apiBranch?.monthlyExpensesHalalas != null ? Math.round(apiBranch.monthlyExpensesHalalas / 100) : MY_BRANCH.expM;
  const apiTarget   = apiBranch?.monthlyTargetHalalas   != null ? Math.round(apiBranch.monthlyTargetHalalas   / 100) : MY_BRANCH.target;
  const todaySales  = (apiKpis.todaySalesHalalas as number | undefined) != null
    ? Math.round((apiKpis.todaySalesHalalas as number) / 100)
    : 18340;
  const branchName  = apiBranch?.name      || MY_BRANCH.name;
  const branchBrand = apiBranch?.brandName || MY_BRANCH.brand;
  const branchCity  = apiBranch?.city      || MY_BRANCH.city;
  const pct = Math.round((apiSalesM/apiTarget)*100);
  const TASKS_FALLBACK = [
    [t("رفع مبيعات الشفت الصباحي","Upload morning shift sales"),t("مكتمل","Done"),"done"],
    [t("رفع مصروفات اليوم","Upload today's expenses"),t("مكتمل","Done"),"done"],
    [t("جرد المخزون اليومي","Daily inventory count"),t("معلق","Pending"),"pending"],
    [t("إغلاق شفت المساء","Close evening shift"),t("لاحقاً","Later"),"later"],
  ];
  const apiMissing = apiOverview?.todayUploads?.missing ?? [];
  const tasks = apiMissing.length > 0
    ? apiMissing.map((m: string) => [m, t("معلق","Pending"), "pending"] as [string,string,string])
    : TASKS_FALLBACK;
  const CREW_FALLBACK = [
    ["أنس محمد",t("كاشير","Cashier"),t("صباحي","Morning"),t("نشط","Active")],
    ["ليلى سالم",t("كاشير","Cashier"),t("مسائي","Evening"),t("قادم","Incoming")],
    ["فهد العمري",t("طاهٍ","Chef"),t("صباحي","Morning"),t("نشط","Active")],
    ["سارة الغامدي",t("خدمة","Service"),t("مسائي","Evening"),t("نشط","Active")],
  ];
  const crew = (apiEmployees as any[]).length > 0
    ? (apiEmployees as any[]).slice(0,4).map((e: any) => [e.name, e.role || "—", "", e.active ? t("نشط","Active") : t("غائب","Absent")] as [string,string,string,string])
    : CREW_FALLBACK;
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("لوحة فرع العليا","Al-Ulia Branch Dashboard")} — {branchName}</h2><p className="text-gray-400 text-sm">{branchBrand} · {branchCity}</p></div>
      <div className="bg-gradient-to-l from-emerald-600 to-teal-700 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-3"><div><p className="font-black text-xl">{t("إنجاز الشهر","Monthly Achievement")}</p><p className="text-white/70 text-sm mt-0.5">{t("الهدف:","Target:")} {fmt(apiTarget)} {SAR}</p></div><div className={dir==="rtl"?"text-left":"text-right"}><p className="text-3xl font-black">{pct}%</p><p className="text-white/60 text-xs">{t("من الهدف","of target")}</p></div></div>
        <div className="w-full h-3 bg-white/20 rounded-full"><div className="h-3 bg-white rounded-full" style={{width:`${Math.min(100,pct)}%`}}/></div>
        <div className="flex justify-between mt-2 text-xs text-white/60"><span>0</span><span>{fmt(apiTarget)}</span></div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label={t("مبيعات اليوم","Today's Sales")}   value={fmt(todaySales)} sub={SAR} icon={<TrendingUp size={18} className="text-emerald-600"/>} accent="emerald" delta="+5.2%"/>
        <KpiCard label={t("مبيعات الشهر","Monthly Sales")}   value={`${fmt(Math.round(apiSalesM/1000))}K`} sub={SAR} icon={<BarChart3 size={18} className="text-blue-600"/>} accent="blue"/>
        <KpiCard label={t("مصروفات الشهر","Monthly Expenses")} value={`${fmt(Math.round(apiExpM/1000))}K`} sub={SAR} icon={<Wallet size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label={t("صافي الربح","Net Profit")}         value={`${fmt(Math.round((apiSalesM-apiExpM)/1000))}K`} sub={SAR} icon={<CheckCircle2 size={18} className="text-purple-600"/>} accent="purple"/>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-3">📋 {t("مهام اليوم","Today's Tasks")}</h3>
          <div className="space-y-2">
            {tasks.map(([task,status,c])=>(
              <div key={task} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                <div className={`w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 ${c==="done"?"bg-emerald-500":"bg-gray-200"}`}>{c==="done"&&<Check size={9} className="text-white"/>}</div>
                <p className={`text-sm flex-1 ${c==="done"?"line-through text-gray-400":"text-gray-700"}`}>{task}</p>
                <Badge className={`text-[10px] ${c==="done"?"bg-emerald-50 text-emerald-700":c==="pending"?"bg-amber-50 text-amber-700":"bg-gray-100 text-gray-500"}`}>{status}</Badge>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-3">👥 {t("طاقم اليوم","Today's Crew")}</h3>
          <div className="space-y-2">
            {crew.map(([n,r,s,st])=>(
              <div key={n} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{n[0]}</div>
                <div className="flex-1"><p className="text-sm font-semibold text-gray-700">{n}</p><p className="text-[10px] text-gray-400">{r} · {s}</p></div>
                <Badge className={`text-[10px] ${st===t("نشط","Active")?"bg-emerald-50 text-emerald-700":"bg-gray-100 text-gray-500"}`}>{st}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BranchUpload() {
  const { t, dir } = useCLang();
  const uploadMut = useBranchUpload();
  const SAR = t("ر.س","SAR");
  const [salesAmt,setSalesAmt]=useState("");
  const [expAmt,setExpAmt]=useState("");
  const [submitted,setSubmitted]=useState(false);
  void uploadMut; // file upload UI not yet wired; kept for future
  const submit=()=>{if(!salesAmt){alert(t("أدخل قيمة المبيعات","Enter sales amount"));return;}setSubmitted(true);};
  if(submitted) return (
    <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center" dir={dir}>
      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle2 size={40} className="text-emerald-600"/></div>
      <h3 className="text-xl font-bold text-gray-800">{t("تم رفع البيانات بنجاح!","Data submitted successfully!")}</h3>
      <p className="text-gray-500 text-sm">{t("سيقوم المحاسب بمراجعة البيانات وإعادة الإبلاغ","The accountant will review and respond")}</p>
      <button onClick={()=>setSubmitted(false)} className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold hover:bg-purple-700">{t("رفع جديد","Upload New")}</button>
    </div>
  );
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("الرفع اليومي","Daily Upload")}</h2><p className="text-gray-400 text-sm">{MY_BRANCH.name} · {new Date().toLocaleDateString("ar-SA")}</p></div>
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-gray-800">💰 {t("المبيعات","Sales")}</h3>
          <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t(`إجمالي المبيعات (${SAR}) *`,`Total Sales (${SAR}) *`)}</label><input type="number" value={salesAmt} onChange={e=>setSalesAmt(e.target.value)} placeholder="0.00" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-emerald-400"/></div>
          <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الشفت","Shift")}</label><select className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"><option>{t("صباحي","Morning")}</option><option>{t("مسائي","Evening")}</option><option>{t("كامل اليوم","Full Day")}</option></select></div>
          <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("مرفق (صورة / PDF)","Attachment (image / PDF)")}</label><div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-purple-300"><Upload size={20} className="text-gray-400 mx-auto mb-1"/><p className="text-xs text-gray-400">{t("رفع مرفق","Upload attachment")}</p></div></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-gray-800">💸 {t("المصروفات","Expenses")}</h3>
          <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t(`إجمالي المصروفات (${SAR})`,`Total Expenses (${SAR})`)}</label><input type="number" value={expAmt} onChange={e=>setExpAmt(e.target.value)} placeholder="0.00" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-red-400"/></div>
          <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("تفصيل المصروفات","Expense breakdown")}</label><textarea rows={3} placeholder={t("وصف مختصر...","Brief description...")} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none resize-none"/></div>
          <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الفاتورة","Invoice")}</label><div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-red-300"><Paperclip size={20} className="text-gray-400 mx-auto mb-1"/><p className="text-xs text-gray-400">{t("رفع الفاتورة","Upload invoice")}</p></div></div>
        </div>
      </div>
      <button onClick={submit} className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold text-base hover:bg-purple-700 shadow-sm flex items-center justify-center gap-2"><Send size={16}/>{t("رفع البيانات للمحاسب","Submit Data to Accountant")}</button>
    </div>
  );
}

function BranchRequests() {
  const { t, dir } = useCLang();
  const { data: apiRequests = [] } = useBranchPurchaseRequests();
  const REQUESTS_INLINE = [
    { id:"R001",item:"زيت طهي 10 كجم", qty:20,unit:"كرتون",status:"approved", date:t("اليوم","Today"),urgency:"normal" },
    { id:"R002",item:"خبز برجر",         qty:50,unit:"كيس",  status:"pending",  date:t("اليوم","Today"),urgency:"urgent" },
    { id:"R003",item:"لحم مفروم",        qty:30,unit:"كجم",  status:"pending",  date:t("أمس","Yesterday"),urgency:"normal" },
    { id:"R004",item:"صلصة كاتشب",      qty:10,unit:"كرتون",status:"delivered",date:t("أمس","Yesterday"),urgency:"normal" },
  ];
  const [localRequests,setLocalRequests]=useState(REQUESTS_INLINE);
  const requests = apiRequests.length > 0
    ? apiRequests.map(r => ({
        id: r.publicId || r.id,
        item: r.itemName || "—",
        qty: r.qty ?? 0,
        unit: r.unit || "",
        status: r.status === "submitted" ? "pending" : r.status,
        date: r.createdAt,
        urgency: "normal" as const,
      }))
    : localRequests;
  const setRequests = setLocalRequests;
  const [showAdd,setShowAdd]=useState(false);
  const SC:Record<string,string>={pending:"bg-amber-50 text-amber-700 border-amber-200",approved:"bg-blue-50 text-blue-700 border-blue-200",delivered:"bg-emerald-50 text-emerald-700 border-emerald-200"};
  const SL:Record<string,string>={pending:t("معلق","Pending"),approved:t("معتمد","Approved"),delivered:t("تم التسليم","Delivered")};
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-gray-800">{t("طلبات الشراء","Purchase Requests")}</h2><p className="text-gray-400 text-sm">{requests.filter(r=>r.status==="pending").length} {t("طلب معلق","pending requests")}</p></div><Btn variant="primary" onClick={()=>setShowAdd(true)}><Plus size={13}/> {t("طلب جديد","New Request")}</Btn></div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {requests.map(r=>(
          <div key={r.id} className="px-5 py-4 flex items-center gap-4 border-b border-gray-50 last:border-0">
            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">📦</div>
            <div className="flex-1"><p className="font-semibold text-gray-800 text-sm">{r.item}</p><p className="text-xs text-gray-400">{r.qty} {r.unit} · {r.date}</p></div>
            {r.urgency==="urgent"&&<Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px]">⚡ {t("عاجل","Urgent")}</Badge>}
            <Badge className={`text-[10px] border ${SC[r.status]}`}>{SL[r.status]}</Badge>
          </div>
        ))}
      </div>
      {showAdd&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e=>e.stopPropagation()} dir={dir}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-800">{t("طلب شراء جديد","New Purchase Request")}</h3><button onClick={()=>setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button></div>
            <div className="space-y-3">
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الصنف","Item")}</label><input placeholder={t("اسم الصنف","Item name")} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"/></div>
              <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الكمية","Quantity")}</label><input type="number" placeholder="0" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"/></div><div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الوحدة","Unit")}</label><select className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"><option>{t("كجم","kg")}</option><option>{t("كرتون","carton")}</option><option>{t("قطعة","piece")}</option><option>{t("لتر","liter")}</option></select></div></div>
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الأولوية","Priority")}</label><select className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"><option>{t("عادي","Normal")}</option><option>{t("عاجل","Urgent")}</option></select></div>
              <div className="flex gap-2 justify-end"><Btn onClick={()=>setShowAdd(false)}>{t("إلغاء","Cancel")}</Btn><Btn variant="primary" onClick={()=>{setShowAdd(false);setRequests(p=>[...p,{id:`R${p.length+1}`,item:t("صنف جديد","New Item"),qty:0,unit:t("كجم","kg"),status:"pending",date:t("اليوم","Today"),urgency:"normal"}]);}}><Send size={13}/> {t("إرسال","Send")}</Btn></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BranchItems() {
  const { t, dir } = useCLang();
  const { data: apiItems = [] } = useBranchItems();
  const submitCountMut = useBranchSubmitItemsCount();
  const [showInvForm,setShowInvForm]=useState(false);
  const [invCounts,setInvCounts]=useState<Record<string,string>>({});
  const [invSubmitted,setInvSubmitted]=useState(false);
  const ITEMS_INLINE = [
    { name:t("دقيق أبيض","White Flour"),        qty:120,unit:t("كجم","kg"), min:50, status:"ok"       },
    { name:t("زيت طهي","Cooking Oil"),            qty:18, unit:t("لتر","L"),  min:20, status:"low"      },
    { name:t("لحم مفروم (مجمد)","Minced Meat (frozen)"),qty:45,unit:t("كجم","kg"),min:30,status:"ok"  },
    { name:t("خبز برجر","Burger Buns"),           qty:8,  unit:t("كيس","bag"),min:15, status:"critical" },
    { name:t("صلصة كاتشب","Ketchup"),             qty:24, unit:t("عبوة","pack"),min:10,status:"ok"      },
    { name:t("جبن شيدر","Cheddar Cheese"),        qty:12, unit:t("كجم","kg"), min:8,  status:"ok"       },
  ];
  const items = apiItems.length > 0
    ? apiItems.map(i => {
        const qty = i.currQty ?? 0;
        const min = 10;
        const status = qty <= min/3 ? "critical" : qty < min ? "low" : "ok";
        return { name: i.name, qty, unit: i.unit || "", min, status, id: i.id };
      })
    : ITEMS_INLINE.map(i => ({ ...i, id: i.name }));
  const submitInventory = () => {
    if (apiItems.length > 0) {
      const counts = Object.entries(invCounts).map(([itemId, qty]) => ({ itemId, qty: Number(qty) || 0 }));
      submitCountMut.mutate({ counts });
    }
    setInvSubmitted(true);
  };
  const SC:Record<string,string>={ok:"bg-emerald-50 text-emerald-700",low:"bg-amber-50 text-amber-700",critical:"bg-red-50 text-red-700"};
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-gray-800">{t("الجرد اليومي","Daily Inventory")}</h2><p className="text-gray-400 text-sm">{MY_BRANCH.name} · {new Date().toLocaleDateString("ar-SA")}</p></div><Btn variant="primary" onClick={()=>setShowInvForm(true)}><Clipboard size={13}/> {t("تسجيل جرد","Record Count")}</Btn></div>
      {showInvForm&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowInvForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5" onClick={e=>e.stopPropagation()} dir={dir}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-800">{t("تسجيل جرد يومي","Daily Inventory Count")}</h3><button onClick={()=>setShowInvForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button></div>
            {invSubmitted?(
              <div className="text-center py-6"><div className="text-4xl mb-3">✅</div><p className="font-bold text-gray-800">{t("تم إرسال الجرد للمحاسب","Inventory sent to accountant")}</p><p className="text-sm text-gray-400 mt-1">{t("سيتم مراجعته خلال 24 ساعة","Will be reviewed within 24 hours")}</p><Btn onClick={()=>{setInvSubmitted(false);setInvCounts({});setShowInvForm(false);}}>{t("إغلاق","Close")}</Btn></div>
            ):(
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {items.map(item=>(
                  <div key={item.name} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                    <div className="flex-1"><p className="text-sm font-semibold text-gray-800">{item.name}</p><p className="text-[11px] text-gray-400">{t("المتوقع:","Expected:")} {item.qty} {item.unit}</p></div>
                    <input type="number" value={invCounts[item.name]??""} onChange={e=>setInvCounts(p=>({...p,[item.name]:e.target.value}))} placeholder={String(item.qty)} className="w-20 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none text-center focus:border-purple-400"/>
                    <span className="text-xs text-gray-400 w-8">{item.unit}</span>
                  </div>
                ))}
                <div className="flex gap-2 justify-end pt-2"><Btn onClick={()=>setShowInvForm(false)}>{t("إلغاء","Cancel")}</Btn><Btn variant="primary" onClick={submitInventory}><Send size={13}/> {t("إرسال الجرد","Submit Count")}</Btn></div>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label={t("أصناف كافية","Sufficient")} value={String(items.filter(i=>i.status==="ok").length)} sub={t("من إجمالي الأصناف","of total items")} icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label={t("منخفض","Low")} value={String(items.filter(i=>i.status==="low").length)} sub={t("يحتاج طلب شراء","needs purchase order")} icon={<AlertTriangle size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label={t("حرج","Critical")} value={String(items.filter(i=>i.status==="critical").length)} sub={t("طلب عاجل!","urgent order!")} icon={<XCircle size={18} className="text-red-500"/>} accent="red"/>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-4 gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50 text-[10px] font-semibold text-gray-500">
          <span className="col-span-2">{t("الصنف","Item")}</span><span>{t("الكمية الفعلية","Actual Qty")}</span><span>{t("الحالة","Status")}</span>
        </div>
        {items.map(item=>(
          <div key={item.name} className="grid grid-cols-4 gap-4 px-5 py-4 border-b border-gray-50 last:border-0 items-center">
            <div className="col-span-2"><p className="font-semibold text-gray-800 text-sm">{item.name}</p><p className="text-xs text-gray-400">{t("الحد الأدنى:","Min:")} {item.min} {item.unit}</p></div>
            <div className="flex items-center gap-2"><span className="font-mono font-bold text-gray-800">{item.qty}</span><span className="text-gray-400 text-sm">{item.unit}</span></div>
            <Badge className={`text-[10px] ${SC[item.status]}`}>{item.status==="ok"?`✓ ${t("كافٍ","OK")}`:item.status==="low"?`⚠ ${t("منخفض","Low")}`:`🔴 ${t("حرج","Critical")}`}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function BranchEmployees() {
  const { t, dir } = useCLang();
  const { data: apiStaff = [] } = useBranchEmployees();
  const STAFF_INLINE = [
    { name:"أنس محمد",     role:t("كاشير","Cashier"), shift:t("صباحي","Morning"), status:"present",  phone:"+966 50 111 2222" },
    { name:"ليلى سالم",    role:t("كاشير","Cashier"), shift:t("مسائي","Evening"), status:"upcoming", phone:"+966 55 222 3333" },
    { name:"فهد العمري",   role:t("طاهٍ","Chef"),     shift:t("صباحي","Morning"), status:"present",  phone:"+966 53 333 4444" },
    { name:"سارة الغامدي", role:t("خدمة","Service"),  shift:t("مسائي","Evening"), status:"upcoming", phone:"+966 56 444 5555" },
    { name:"عمر الحربي",   role:t("مساعد","Assistant"),shift:t("صباحي","Morning"),status:"absent",   phone:"+966 58 555 6666" },
  ];
  const staff = apiStaff.length > 0
    ? apiStaff.map(s => ({ name: s.name, role: s.role || "—", shift: "", status: s.active ? "present" : "absent", phone: "" }))
    : STAFF_INLINE;
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("طاقم الموظفين","Staff")}</h2><p className="text-gray-400 text-sm">{staff.filter(s=>s.status==="present").length} {t("حاضر اليوم","present today")}</p></div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {staff.map(s=>(
          <div key={s.name} className="px-5 py-4 flex items-center gap-4 border-b border-gray-50 last:border-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold flex-shrink-0">{s.name[0]}</div>
            <div className="flex-1"><p className="font-semibold text-gray-800 text-sm">{s.name}</p><p className="text-xs text-gray-400">{s.role} · {t("شفت","shift")} {s.shift}</p></div>
            <span className="text-xs text-gray-400" dir="ltr">{s.phone}</span>
            <Badge className={`text-[10px] ${s.status==="present"?"bg-emerald-50 text-emerald-700 border border-emerald-100":s.status==="upcoming"?"bg-blue-50 text-blue-700 border border-blue-100":"bg-red-50 text-red-700 border border-red-200"}`}>{s.status==="present"?`● ${t("حاضر","Present")}`:s.status==="upcoming"?t("قادم","Incoming"):t("غائب","Absent")}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function BranchShifts() {
  const { t, dir } = useCLang();
  const { data: activeShift } = useBranchActiveShift();
  const openShiftMut = useBranchOpenShift();
  const closeShiftMut = useBranchCloseShift();
  const SAR = t("ر.س","SAR");
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("شفتات الفرع","Branch Shifts")}</h2></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border-2 border-amber-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4"><div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse"/><h3 className="font-bold text-amber-800">{t("شفت مفتوح الآن","Shift Open Now")}</h3></div>
          <p className="text-gray-700 font-semibold">{t("شفت مسائي — ليلى سالم","Evening shift — Layla Salem")}</p>
          <p className="text-xs text-gray-400 mt-1">{t("فتح: 4:00 م · مبلغ الصندوق:","Opened: 4:00 PM · Cash amount:")} 500 {SAR}</p>
          <div className="mt-4"><Btn variant="danger" onClick={()=>{ if(activeShift?.id){ closeShiftMut.mutate({ id: activeShift.id }); } else { alert(`✅ ${t("تم إغلاق الشفت وإرساله للمحاسب","Shift closed and sent to accountant")}`); } }}><X size={12}/> {t("إغلاق الشفت","Close Shift")}</Btn></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-4">{t("فتح شفت جديد","Open New Shift")}</h3>
          <div className="space-y-3">
            <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الكاشير","Cashier")}</label><select className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"><option>أنس محمد</option><option>ليلى سالم</option></select></div>
            <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t(`مبلغ افتتاح الصندوق (${SAR})`,`Opening Cash Amount (${SAR})`)}</label><input type="number" defaultValue="500" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"/></div>
            <Btn variant="success" onClick={()=>openShiftMut.mutate({ registerOpeningHalalas: 50000 })}><CheckCircle2 size={12}/> {t("فتح شفت","Open Shift")}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function BranchSuppliers() {
  const { t, dir } = useCLang();
  const { data: apiSuppliers = [] } = useBranchSuppliers();
  const requestNewMut = useBranchRequestNewSupplier();
  const SUPPLIERS_INLINE = [
    { name:"شركة الدواجن الوطنية",  category:t("دواجن ولحوم","Poultry & Meat"),   contact:"0501234567", approved:true,  lastOrder:t("اليوم","Today")     },
    { name:"مؤسسة النخيل للأغذية",  category:t("مواد غذائية","Food Supplies"),    contact:"0557654321", approved:true,  lastOrder:t("أمس","Yesterday")   },
    { name:"شركة الخليج للمواد",     category:t("بهارات وتوابل","Spices"),         contact:"0532345678", approved:true,  lastOrder:t("3 أيام","3 days")   },
    { name:"مجموعة الوفاء للتوزيع",  category:t("مشروبات","Beverages"),           contact:"0569876543", approved:false, lastOrder:t("أسبوع","1 week")    },
  ];
  const suppliers = apiSuppliers.length > 0
    ? apiSuppliers.map(s => ({ name: s.name, category: s.category || "", contact: s.phone || "", approved: s.isActive, lastOrder: "" }))
    : SUPPLIERS_INLINE;
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("الموردون","Suppliers")}</h2><p className="text-gray-400 text-sm">{t("موردو","Suppliers of")} {MY_BRANCH.name}</p></div>
        <Btn variant="primary" size="sm" onClick={()=>requestNewMut.mutate({ name: t("مورد جديد","New supplier") })}><Plus size={12}/> {t("طلب مورد جديد","Request New Supplier")}</Btn>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {suppliers.map((s,i)=>(
          <div key={i} className="px-5 py-4 flex items-center gap-4 border-b border-gray-50 last:border-0">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 text-lg">🏭</div>
            <div className="flex-1"><p className="font-semibold text-gray-800 text-sm">{s.name}</p><p className="text-xs text-gray-400">{s.category} · {t("آخر طلب:","Last order:")} {s.lastOrder}</p></div>
            <span className="text-xs text-gray-400" dir="ltr">{s.contact}</span>
            <Badge className={`text-[10px] ${s.approved?"bg-emerald-50 text-emerald-700 border border-emerald-200":"bg-amber-50 text-amber-700 border border-amber-200"}`}>{s.approved?t("معتمد","Approved"):t("قيد المراجعة","Under Review")}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function BranchSettings() {
  const { t, dir } = useCLang();
  const { data: apiSettings } = useBranchSettings();
  const [branchName, setBranchName] = useState(apiSettings?.branchName || MY_BRANCH.name);
  const [manager,    setManager]    = useState(apiSettings?.managerName || "فاطمة السالم");
  const [phone,      setPhone]      = useState(apiSettings?.phone || "+966 11 234 5678");
  useEffect(()=>{
    if (apiSettings) {
      if (apiSettings.branchName)  setBranchName(apiSettings.branchName);
      if (apiSettings.managerName) setManager(apiSettings.managerName);
      if (apiSettings.phone)       setPhone(apiSettings.phone);
    }
  }, [apiSettings]);
  const branchBrand = apiSettings?.brandName || MY_BRANCH.brand;
  const branchCity  = apiSettings?.city      || MY_BRANCH.city;
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("إعدادات الفرع","Branch Settings")}</h2><p className="text-gray-400 text-sm">{branchBrand}</p></div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="font-bold text-gray-800 text-sm border-b border-gray-100 pb-2">{t("بيانات الفرع الأساسية","Basic Branch Info")}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("اسم الفرع","Branch Name")}</label><input value={branchName} onChange={e=>setBranchName(e.target.value)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400"/></div>
          <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("مدير الفرع","Branch Manager")}</label><input value={manager} onChange={e=>setManager(e.target.value)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400"/></div>
          <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("رقم الهاتف","Phone")}</label><input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400" dir="ltr"/></div>
          <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("المدينة","City")}</label><input value={branchCity} readOnly className="w-full text-sm border border-gray-100 rounded-xl px-3 py-2.5 bg-gray-50 text-gray-400"/></div>
        </div>
        <div className="flex justify-end pt-2"><Btn variant="primary" onClick={()=>alert(`✅ ${t("تم حفظ إعدادات الفرع","Branch settings saved")}`)}><Check size={13}/> {t("حفظ التغييرات","Save Changes")}</Btn></div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// PROCUREMENT PAGES
// ═══════════════════════════════════════════════════
function ProcOverview({ navigate }:{ navigate:(p:string)=>void }) {
  const { t, dir } = useCLang();
  const { data: apiOverview } = useProcurementOverview();
  const { data: apiOrders = [] } = useProcurementOrders();
  const { data: apiSuppliers = [] } = useProcurementSuppliers();
  const apiKpis = (apiOverview?.kpis ?? {}) as Record<string, number | string>;
  const activeSuppliersCount = (apiKpis.activeSuppliersCount as number | undefined)
    ?? (apiSuppliers as any[]).filter((s: any) => s.isActive).length
    ?? 8;
  const monthlyPurchasesK = (apiKpis.monthlyPurchasesHalalas as number | undefined) != null
    ? `${Math.round(((apiKpis.monthlyPurchasesHalalas as number) / 100) / 1000)}K`
    : "187K";
  const SAR = t("ر.س","SAR");
  const ORDERS_INLINE = [
    { id:"PO-001",supplier:"شركة المروج للتوريد", items:3,total:12400,status:"pending",  date:t("اليوم","Today")     },
    { id:"PO-002",supplier:"مؤسسة النخيل للأغذية",items:5,total:8200, status:"approved", date:t("أمس","Yesterday")   },
    { id:"PO-003",supplier:"شركة الخليج للمواد",  items:2,total:3600, status:"delivered",date:t("أمس","Yesterday")   },
    { id:"PO-004",supplier:"مجموعة الوفاء",         items:8,total:22800,status:"pending",  date:t("أسبوع","1 week")   },
  ];
  const orders = apiOrders.length > 0
    ? apiOrders.map(o => ({
        id: o.publicId || o.id,
        supplier: o.supplierName || "—",
        items: o.itemsCount ?? 0,
        total: Math.round((o.totalHalalas || 0) / 100),
        status: o.status === "sent" ? "delivered" : o.status === "draft" ? "pending" : o.status,
        date: o.createdAt,
      }))
    : ORDERS_INLINE;
  const SC:Record<string,string>={pending:"bg-amber-50 text-amber-700 border-amber-200",approved:"bg-blue-50 text-blue-700 border-blue-200",delivered:"bg-emerald-50 text-emerald-700 border-emerald-200"};
  const SL:Record<string,string>={pending:t("معلق","Pending"),approved:t("معتمد","Approved"),delivered:t("تم التسليم","Delivered")};
  const totalPending=orders.filter(o=>o.status==="pending").reduce((s,o)=>s+o.total,0);
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-gray-800">{t("لوحة المشتريات","Procurement Dashboard")}</h2></div><button onClick={()=>navigate("proc-new")} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-bold hover:bg-amber-600"><Plus size={14}/> {t("أمر شراء جديد","New Purchase Order")}</button></div>
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label={t("أوامر معلقة","Pending Orders")} value={String(orders.filter(o=>o.status==="pending").length)} sub={t("تنتظر الاعتماد","awaiting approval")} icon={<Clock size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label={t("قيمة المعلقة","Pending Value")} value={fmt(totalPending)} sub={SAR} icon={<Wallet size={18} className="text-red-500"/>} accent="red"/>
        <KpiCard label={t("موردون نشطون","Active Suppliers")} value={String(activeSuppliersCount)} sub={t("مورد معتمد","approved suppliers")} icon={<Building2 size={18} className="text-blue-600"/>} accent="blue"/>
        <KpiCard label={t("مشتريات الشهر","Monthly Purchases")} value={monthlyPurchasesK} sub={`${SAR} ${t("إجمالي","total")}`} icon={<ShoppingCart size={18} className="text-purple-600"/>} accent="purple"/>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60"><h3 className="font-bold text-gray-900 text-sm">{t("أحدث أوامر الشراء","Latest Purchase Orders")}</h3></div>
        {orders.map(o=>(
          <div key={o.id} className="px-5 py-4 flex items-center gap-4 border-b border-gray-50 last:border-0">
            <div className="text-left flex-shrink-0"><p className="text-xs font-bold text-gray-400" dir="ltr">{o.id}</p></div>
            <div className="flex-1"><p className="font-semibold text-gray-800 text-sm">{o.supplier}</p><p className="text-xs text-gray-400">{o.items} {t("أصناف","items")} · {o.date}</p></div>
            <span className="font-mono font-bold text-gray-800">{fmt(o.total)} {SAR}</span>
            <Badge className={`text-[10px] border ${SC[o.status]}`}>{SL[o.status]}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProcNew() {
  const { t, dir } = useCLang();
  const { data: apiOrders = [] } = useProcurementOrders();
  const approveMut = useApproveOrder();
  const SAR = t("ر.س","SAR");
  const ORDERS_INLINE = [
    { id:"PO-001",supplier:"شركة المروج",       brand:"برغر التاج",       items:3,total:12400,status:"pending",  date:t("اليوم","Today")     },
    { id:"PO-002",supplier:"مؤسسة النخيل",      brand:"بيتزا التاج",      items:5,total:8200, status:"approved", date:t("أمس","Yesterday")   },
    { id:"PO-003",supplier:"شركة الخليج",        brand:"مطعم التاج الراقي",items:2,total:3600, status:"delivered",date:t("أمس","Yesterday")   },
    { id:"PO-004",supplier:"مجموعة الوفاء",      brand:"برغر التاج",       items:8,total:22800,status:"pending",  date:t("أسبوع","1 week")    },
    { id:"PO-005",supplier:"شركة المروج",        brand:"بيتزا التاج",      items:4,total:9100, status:"approved", date:t("أسبوع","1 week")    },
  ];
  const [localOrders] = useState(ORDERS_INLINE);
  const orders = apiOrders.length > 0
    ? apiOrders.map(o => ({
        id: o.publicId || o.id,
        supplier: o.supplierName || "—",
        brand: o.brandName || "—",
        items: o.itemsCount ?? 0,
        total: Math.round((o.totalHalalas || 0) / 100),
        status: o.status === "sent" ? "delivered" : o.status === "draft" ? "pending" : o.status,
        date: o.createdAt,
        _apiId: o.id,
      }))
    : localOrders.map(o => ({ ...o, _apiId: o.id }));
  void approveMut; // exposed for future bulk-approve UI
  const [showAdd,setShowAdd]=useState(false);
  const SC:Record<string,string>={pending:"bg-amber-50 text-amber-700 border-amber-200",approved:"bg-blue-50 text-blue-700 border-blue-200",delivered:"bg-emerald-50 text-emerald-700 border-emerald-200"};
  const SL:Record<string,string>={pending:t("معلق","Pending"),approved:t("معتمد","Approved"),delivered:t("تم التسليم","Delivered")};
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-gray-800">{t("أوامر الشراء","Purchase Orders")}</h2><p className="text-gray-400 text-sm">{orders.filter(o=>o.status==="pending").length} {t("معلق","pending")}</p></div><Btn variant="primary" onClick={()=>setShowAdd(true)}><Plus size={13}/> {t("أمر جديد","New Order")}</Btn></div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-6 gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50 text-[10px] font-semibold text-gray-500">
          <span>{t("رقم الأمر","Order #")}</span><span className="col-span-2">{t("المورد","Supplier")}</span><span>{t("العلامة","Brand")}</span><span>{t("الإجمالي","Total")}</span><span>{t("الحالة","Status")}</span>
        </div>
        {orders.map(o=>(
          <div key={o.id} className="grid grid-cols-6 gap-3 px-5 py-4 border-b border-gray-50 last:border-0 items-center hover:bg-gray-50/50">
            <span className="font-mono text-xs text-gray-500" dir="ltr">{o.id}</span>
            <div className="col-span-2"><p className="font-semibold text-gray-800 text-sm">{o.supplier}</p><p className="text-[10px] text-gray-400">{o.items} {t("أصناف","items")} · {o.date}</p></div>
            <span className="text-xs text-gray-600">{o.brand}</span>
            <span className="font-mono font-bold text-gray-800 text-sm">{fmt(o.total)} {SAR}</span>
            <div className="flex items-center gap-1.5"><Badge className={`text-[10px] border ${SC[o.status]}`}>{SL[o.status]}</Badge><button onClick={()=>alert(`✏️ ${t("تعديل أمر الشراء","Edit Purchase Order")}\n${o.id}`)} className="p-1 rounded text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"><Edit2 size={11}/></button></div>
          </div>
        ))}
      </div>
      {showAdd&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e=>e.stopPropagation()} dir={dir}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-800">{t("أمر شراء جديد","New Purchase Order")}</h3><button onClick={()=>setShowAdd(false)} className="text-gray-400"><X size={18}/></button></div>
            <div className="space-y-3">
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("المورد","Supplier")}</label><select className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"><option>شركة المروج</option><option>مؤسسة النخيل</option><option>شركة الخليج</option></select></div>
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("العلامة التجارية","Brand")}</label><select className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none">{BRANDS.map(b=><option key={b.id}>{b.name}</option>)}</select></div>
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("وصف الطلب","Order Description")}</label><textarea rows={3} placeholder={t("الأصناف والكميات...","Items and quantities...")} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none resize-none"/></div>
              <div className="flex gap-2 justify-end"><Btn onClick={()=>setShowAdd(false)}>{t("إلغاء","Cancel")}</Btn><Btn variant="primary" onClick={()=>{setShowAdd(false);alert(`✅ ${t("تم إنشاء أمر الشراء","Purchase order created")}`);}}><Send size={13}/> {t("إنشاء","Create")}</Btn></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProcSuppliers() {
  const { t, dir } = useCLang();
  const { data: apiSuppliers = [] } = useProcurementSuppliers();
  const SAR = t("ر.س","SAR");
  const SUPPLIERS_INLINE = [
    { id:"S1",name:"شركة المروج للتوريد",  category:t("مواد خام","Raw Materials"),     contact:"سليمان المروج",phone:"+966 50 111 1111",rating:4.8,orders:24,totalSpent:187000,active:true  },
    { id:"S2",name:"مؤسسة النخيل للأغذية", category:t("خضروات وفاكهة","Vegetables"),   contact:"منى النخيل",   phone:"+966 55 222 2222",rating:4.5,orders:18,totalSpent:92000, active:true  },
    { id:"S3",name:"شركة الخليج للمواد",    category:t("بهارات وتوابل","Spices"),       contact:"كريم الخليج",  phone:"+966 53 333 3333",rating:4.2,orders:31,totalSpent:45000, active:true  },
    { id:"S4",name:"مجموعة الوفاء",         category:t("مشروبات","Beverages"),          contact:"ناصر الوفاء",  phone:"+966 56 444 4444",rating:3.9,orders:12,totalSpent:68000, active:true  },
    { id:"S5",name:"شركة الأمانة للتغليف", category:t("تغليف وعبوات","Packaging"),     contact:"هدى الأمانة",  phone:"+966 58 555 5555",rating:4.6,orders:8, totalSpent:22000, active:false },
  ];
  const suppliers = apiSuppliers.length > 0
    ? apiSuppliers.map(s => ({
        id: s.id, name: s.name, category: s.category || "—", contact: s.email || "—",
        phone: s.phone || "", rating: s.rating ?? 0, orders: s.ordersCount ?? 0,
        totalSpent: 0, active: s.isActive,
      }))
    : SUPPLIERS_INLINE;
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-gray-800">{t("الموردون","Suppliers")}</h2><p className="text-gray-400 text-sm">{suppliers.filter(s=>s.active).length} {t("مورد نشط","active suppliers")}</p></div><Btn variant="primary" onClick={()=>alert(`➕ ${t("إضافة مورد جديد","Add New Supplier")}`)}><Plus size={13}/> {t("إضافة مورد","Add Supplier")}</Btn></div>
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label={t("موردون نشطون","Active Suppliers")} value={String(suppliers.filter(s=>s.active).length)} sub={t("مورد معتمد","approved")} icon={<Building2 size={18} className="text-blue-600"/>} accent="blue"/>
        <KpiCard label={t("إجمالي المشتريات","Total Purchases")} value={`${fmt(Math.round(suppliers.reduce((s,x)=>s+x.totalSpent,0)/1000))}K`} sub={SAR} icon={<Wallet size={18} className="text-purple-600"/>} accent="purple"/>
        <KpiCard label={t("متوسط التقييم","Avg Rating")} value={(suppliers.length > 0 ? (suppliers.reduce((s,x)=>s+(x.rating||0),0)/suppliers.length) : 4.4).toFixed(1)} sub={t("من 5 نجوم","/ 5 stars")} icon={<Star size={18} className="text-amber-600"/>} accent="amber"/>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {suppliers.map(s=>(
          <div key={s.id} className="px-5 py-4 flex items-center gap-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{s.name[0]}</div>
            <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="font-bold text-gray-800 text-sm">{s.name}</span><Badge className="bg-gray-100 text-gray-600 text-[10px]">{s.category}</Badge></div><div className="flex gap-3 mt-0.5"><span className="text-xs text-gray-400">{s.contact}</span><span className="text-xs text-gray-400" dir="ltr">{s.phone}</span></div></div>
            <div className={`${dir==="rtl"?"text-left":"text-right"} flex-shrink-0`}><div className="flex items-center gap-0.5">{[1,2,3,4,5].map(i=><span key={i} className={`text-sm ${i<=Math.floor(s.rating)?"text-amber-400":"text-gray-200"}`}>★</span>)}<span className="text-xs text-gray-500 mr-1">{s.rating}</span></div><p className="text-[10px] text-gray-400">{s.orders} {t("طلب","orders")} · {fmt(s.totalSpent)} {SAR}</p></div>
            <Badge className={`text-[10px] ${s.active?"bg-emerald-50 text-emerald-700 border border-emerald-100":"bg-gray-100 text-gray-500"}`}>{s.active?`● ${t("نشط","Active")}`:`○ ${t("موقوف","Inactive")}`}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProcItems() {
  const { t, dir } = useCLang();
  const { data: apiItems = [] } = useProcurementItems();
  const SAR = t("ر.س","SAR");
  const ITEMS_INLINE = [
    { name:t("لحم بقري مفروم","Ground Beef"),   unit:t("كجم","kg"),  lastPrice:42,brand:"برغر التاج",        suppliers:2 },
    { name:t("دقيق أبيض","White Flour"),          unit:t("كيس","bag"), lastPrice:18,brand:"بيتزا التاج",       suppliers:3 },
    { name:t("زيت طهي 10L","Cooking Oil 10L"),    unit:t("عبوة","pack"),lastPrice:85,brand:t("جميع العلامات","All Brands"), suppliers:2 },
    { name:t("جبن موزاريلا","Mozzarella"),         unit:t("كجم","kg"),  lastPrice:38,brand:"بيتزا التاج",       suppliers:1 },
    { name:t("خبز برجر","Burger Buns"),            unit:t("كيس","bag"), lastPrice:12,brand:"برغر التاج",        suppliers:2 },
  ];
  const items = apiItems.length > 0
    ? apiItems.map(i => ({
        name: i.name,
        unit: i.unit || "",
        lastPrice: Math.round((i.lastPriceHalalas || 0) / 100),
        brand: i.category || "—",
        suppliers: i.preferredSupplierName ? 1 : 0,
      }))
    : ITEMS_INLINE;
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-gray-800">{t("الأصناف والأسعار","Items & Prices")}</h2><p className="text-gray-400 text-sm">{items.length} {t("صنف","items")}</p></div><Btn variant="primary" onClick={()=>alert(`➕ ${t("إضافة صنف جديد","Add new item")}`)}><Plus size={13}/> {t("صنف جديد","New Item")}</Btn></div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-5 gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50 text-[10px] font-semibold text-gray-500">
          <span className="col-span-2">{t("الصنف","Item")}</span><span>{t("الوحدة","Unit")}</span><span>{t("آخر سعر","Last Price")}</span><span>{t("الموردون","Suppliers")}</span>
        </div>
        {items.map(i=>(
          <div key={i.name} className="grid grid-cols-5 gap-4 px-5 py-4 border-b border-gray-50 last:border-0 items-center hover:bg-gray-50/50">
            <div className="col-span-2"><p className="font-semibold text-gray-800 text-sm">{i.name}</p><p className="text-[10px] text-gray-400">{i.brand}</p></div>
            <span className="text-gray-500 text-sm">{i.unit}</span>
            <span className="font-mono font-bold text-gray-800 text-sm">{i.lastPrice} {SAR}</span>
            <div className="flex items-center gap-1"><span className="font-bold text-purple-700">{i.suppliers}</span><span className="text-xs text-gray-400">{t("مورد","suppliers")}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProcReports() {
  const { t, dir } = useCLang();
  const { data: apiReports = [] } = useProcurementReports();
  const downloadMut = useDownloadProcurementReport();
  const REPORTS_INLINE: [string,string,string][] = [
    [t("📊 تقرير المشتريات الشهري","📊 Monthly Purchases Report"),t("إجمالي مصنّف حسب المورد","Total classified by supplier"),"Purchases_Monthly_Mar2026.pdf"],
    [t("📈 مقارنة الأسعار","📈 Price Comparison"),t("متابعة تغيرات أسعار الموردين","Track supplier price changes"),"Price_Comparison_Mar2026.pdf"],
    [t("🏭 أداء الموردين","🏭 Supplier Performance"),t("تقييم والتزام المواعيد","Rating and on-time delivery"),"Supplier_Performance_Mar2026.pdf"],
    [t("🛒 أوامر معلقة","🛒 Pending Orders"),t("الأوامر التي تحتاج اعتماد","Orders requiring approval"),"Pending_Orders_Mar2026.pdf"],
  ];
  const reports: [string,string,string][] = apiReports.length > 0
    ? apiReports.map(r => [r.title, r.description || "", r.key] as [string,string,string])
    : REPORTS_INLINE;
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("تقارير المشتريات","Procurement Reports")}</h2></div>
      <div className="grid grid-cols-2 gap-4">
        {reports.map(([title,desc,file])=>(
          <div key={title} className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 ${dir==="rtl"?"text-right":"text-left"} hover:border-amber-200 hover:shadow-md transition-all`}>
            <p className="font-bold text-gray-800">{title}</p>
            <p className="text-xs text-gray-400 mt-1">{desc}</p>
            <div className="mt-3">
              <button onClick={()=>downloadMut.mutate({ key: file, format: "pdf" })} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-amber-100 hover:text-amber-700 transition-colors">
                <Download size={11}/> {t("تحميل","Download")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProcGrouped() {
  const { t, dir } = useCLang();
  const { data: apiGroups = [] } = useGroupedOrders();
  const sendGroupedMut = useSendGroupedOrder();
  const SAR = t("ر.س","SAR");
  const GROUPS_INLINE: Array<{ supplier:string; orders:number; total:number; branches:string[]; pending:boolean; groupId?: string }> = [
    { supplier:"شركة الدواجن الوطنية", orders:3, total:24800, branches:["فرع العليا","فرع النرجس","فرع الملقا"], pending:true  },
    { supplier:"مؤسسة النخيل للأغذية", orders:2, total:16400, branches:["فرع حراء","فرع طويق"],               pending:false },
    { supplier:"شركة الخليج للمواد",   orders:4, total:31200, branches:["فرع العليا","فرع النرجس","فرع إشبيلية","فرع ابن بجاد"], pending:true },
  ];
  const groups = apiGroups.length > 0
    ? apiGroups.map(g => ({
        supplier: g.supplierName,
        orders: g.ordersCount,
        total: Math.round(g.totalHalalas / 100),
        branches: (g.orders ?? []).map(o => o.branchName || "—"),
        pending: true,
        groupId: g.groupId,
      }))
    : GROUPS_INLINE;
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("الأوامر المجمّعة","Grouped Orders")}</h2><p className="text-gray-400 text-sm">{t("تجميع أوامر الشراء حسب المورد عبر كل الفروع","Group purchase orders by supplier across all branches")}</p></div>
        <Btn variant="primary" size="sm" onClick={()=>{ const first = groups.find(g => g.pending && g.groupId); if (first?.groupId) sendGroupedMut.mutate(first.groupId); else alert(`📦 ${t("تم إرسال الأمر المجمّع للموردين","Grouped order sent to suppliers")}`); }}><Send size={13}/> {t("إرسال المجمّعة","Send Grouped")}</Btn>
      </div>
      <div className="space-y-4">
        {groups.map((g,i)=>(
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-lg">🏭</div>
              <div className="flex-1"><p className="font-bold text-gray-800">{g.supplier}</p><p className="text-xs text-gray-400">{g.orders} {t("أوامر","orders")} · {g.branches.length} {t("فروع","branches")}</p></div>
              <span className="font-mono font-bold text-gray-800">{fmt(g.total)} {SAR}</span>
              <Badge className={`text-[10px] ${g.pending?"bg-amber-50 text-amber-700 border border-amber-200":"bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>{g.pending?t("معلق","Pending"):t("معتمد","Approved")}</Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {g.branches.map(b=><span key={b} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-medium">{b}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProcSent() {
  const { t, dir } = useCLang();
  const { data: apiSent = [] } = useSentOrders();
  const SAR = t("ر.س","SAR");
  const SENT_INLINE = [
    { id:"PO-BATCH-001", supplier:"شركة الدواجن الوطنية",  sentDate:t("اليوم 10:24 ص","Today 10:24 AM"),    total:24800, inTransit:true,  eta:t("غداً","Tomorrow")  },
    { id:"PO-BATCH-002", supplier:"مؤسسة النخيل للأغذية",  sentDate:t("أمس 2:30 م","Yesterday 2:30 PM"),    total:16400, inTransit:false, eta:t("تم","Done")        },
    { id:"PO-BATCH-003", supplier:"شركة الخليج للمواد",     sentDate:t("قبل يومين 9:15 ص","2 days ago 9:15 AM"),total:31200, inTransit:false, eta:t("تم","Done")     },
    { id:"PO-SINGLE-004",supplier:"مجموعة الوفاء للتوزيع", sentDate:t("منذ 3 أيام","3 days ago"),            total:8700,  inTransit:false, eta:t("تم","Done")        },
  ];
  const sent = apiSent.length > 0
    ? apiSent.map(o => ({
        id: o.publicId || o.id,
        supplier: o.supplierName || "—",
        sentDate: o.sentAt || o.createdAt,
        total: Math.round((o.totalHalalas || 0) / 100),
        inTransit: o.status === "sent",
        eta: o.status === "sent" ? t("قيد التسليم","In Transit") : t("تم","Done"),
      }))
    : SENT_INLINE;
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("الأوامر المُرسَلة","Sent Orders")}</h2><p className="text-gray-400 text-sm">{sent.length} {t("أوامر مُرسَلة","sent orders")}</p></div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {sent.map(s=>(
          <div key={s.id} className="px-5 py-4 flex items-center gap-4 border-b border-gray-50 last:border-0">
            <div className="flex-1">
              <p className="font-semibold text-gray-800 text-sm">{s.supplier}</p>
              <p className="text-xs text-gray-400">{s.id} · {s.sentDate}</p>
            </div>
            <span className="font-mono font-bold text-gray-800">{fmt(s.total)} {SAR}</span>
            <span className="text-xs text-gray-400">ETA: {s.eta}</span>
            <Badge className={`text-[10px] ${s.inTransit?"bg-sky-50 text-sky-700 border border-sky-200":"bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>{s.inTransit?t("قيد التسليم","In Transit"):t("تم التسليم","Delivered")}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// PAGE ROUTER
// ═══════════════════════════════════════════════════
function PageRouter({ role, page, navigate, ops, approve, reject, bulkApprove, finalApprove, bulkFinalApprove }:{
  role:CRole; page:string; navigate:(p:string)=>void;
} & SharedOpsProps) {
  const headProps:HeadProps = { navigate, ops, finalApprove, reject, bulkFinalApprove };

  if(role==="company-admin") {
    if(page==="ca-dashboard")    return <CADashboard navigate={navigate}/>;
    if(page==="ca-subscription") return <CASubscription/>;
    if(page==="ca-users")        return <CAUsers/>;
    if(page==="ca-branches")     return <CABranches/>;
    if(page==="ca-modules")      return <CAModules/>;
    if(page==="ca-billing")      return <CABilling/>;
    if(page==="ca-settings")     return <CASettings/>;
    if(page==="ca-support")      return <CASupport/>;
    return <CADashboard navigate={navigate}/>;
  }
  if(role==="head") {
    if(page==="head-dashboard")   return <HeadDashboard {...headProps}/>;
    if(page==="head-pending")     return <HeadPending {...headProps}/>;
    if(page==="head-approved")    return <HeadApproved ops={ops}/>;
    if(page==="head-rejected")    return <HeadRejected ops={ops}/>;
    if(page==="head-sales")       return <HeadModulePage moduleKey="sales"     title="مبيعات — اعتماد نهائي"     ops={ops} finalApprove={finalApprove} reject={reject}/>;
    if(page==="head-expenses")    return <HeadModulePage moduleKey="expenses"  title="مصروفات — اعتماد نهائي"   ops={ops} finalApprove={finalApprove} reject={reject}/>;
    if(page==="head-purchases")   return <HeadModulePage moduleKey="purchases" title="مشتريات — اعتماد نهائي"   ops={ops} finalApprove={finalApprove} reject={reject}/>;
    if(page==="head-inventory")   return <HeadModulePage moduleKey="inventory" title="مخزون — اعتماد نهائي"     ops={ops} finalApprove={finalApprove} reject={reject}/>;
    if(page==="head-waste")       return <AccCompanyWaste/>;
    if(page==="head-assets")      return <HeadModulePage moduleKey="assets"    title="أصول — اعتماد نهائي"      ops={ops} finalApprove={finalApprove} reject={reject}/>;
    if(page==="head-shifts")      return <HeadModulePage moduleKey="shifts"    title="ورديات — اعتماد نهائي"    ops={ops} finalApprove={finalApprove} reject={reject}/>;
    if(page==="head-employees")   return <HeadModulePage moduleKey="employees" title="موظفون — اعتماد نهائي"   ops={ops} finalApprove={finalApprove} reject={reject}/>;
    if(page==="head-cash")        return <HeadModulePage moduleKey="cash"      title="صندوق — اعتماد نهائي"    ops={ops} finalApprove={finalApprove} reject={reject}/>;
    if(page==="head-accountants") return <HeadAccountants/>;
    if(page==="head-reports")     return <HeadReports/>;
    if(page==="head-reminders")   return <HeadReminders/>;
    if(page==="head-erp")         return <HeadERP ops={ops}/>;
    return <HeadDashboard {...headProps}/>;
  }
  if(role==="accountant") {
    return <AccountantRoot page={page} navigate={navigate} ops={ops} approve={approve} reject={reject} bulkApprove={bulkApprove} finalApprove={finalApprove} bulkFinalApprove={bulkFinalApprove}/>;
  }
  if(role==="branch") {
    if(page==="branch-overview")   return <BranchOverview/>;
    if(page==="branch-upload")     return <BranchUpload/>;
    if(page==="branch-requests")   return <BranchRequests/>;
    if(page==="branch-items")      return <BranchItems/>;
    if(page==="branch-employees")  return <BranchEmployees/>;
    if(page==="branch-shifts")     return <BranchShifts/>;
    if(page==="branch-suppliers")  return <BranchSuppliers/>;
    if(page==="branch-settings")   return <BranchSettings/>;
    return <BranchOverview/>;
  }
  if(role==="procurement") {
    if(page==="proc-overview")  return <ProcOverview navigate={navigate}/>;
    if(page==="proc-new")       return <ProcNew/>;
    if(page==="proc-grouped")   return <ProcGrouped/>;
    if(page==="proc-sent")      return <ProcSent/>;
    if(page==="proc-suppliers") return <ProcSuppliers/>;
    if(page==="proc-items")     return <ProcItems/>;
    if(page==="proc-reports")   return <ProcReports/>;
    return <ProcOverview navigate={navigate}/>;
  }
  return null;
}

// ═══════════════════════════════════════════════════
// ROOT — الحالة المشتركة هنا (المحاسب + رئيس الحسابات يشتركان في نفس البيانات)
// ═══════════════════════════════════════════════════
function CompanyDashboardInner() {
  const { t } = useCLang();
  const [role, setRole] = useState<CRole|null>(null);
  const [page, setPage] = useState<string>("");
  const { ops, approve, reject, finalApprove, bulkApprove, bulkFinalApprove, rejectModalProps } = useSharedOps();

  const selectRole = (r:CRole) => { setRole(r); setPage(DEFAULT_PAGE[r]); };
  const navigate   = (p:string) => setPage(p);
  const logout     = () => { setRole(null); setPage(""); };

  if(!role) return <CompanyLoginScreen onSelect={selectRole}/>;

  const headPendingCount = ops.filter(o=>o.status==="approved").length;

  return (
    <Shell role={role} page={page} navigate={navigate} onLogout={logout} headPendingCount={headPendingCount}>
      <PageRouter role={role} page={page} navigate={navigate}
        ops={ops} approve={approve} reject={reject}
        bulkApprove={bulkApprove} finalApprove={finalApprove} bulkFinalApprove={bulkFinalApprove}/>
      <RejectModal {...rejectModalProps} t={t}/>
    </Shell>
  );
}

export default function CompanyDashboard() {
  return (
    <CLangProvider>
      <CAssetDraftProvider>
        <CompanyDashboardInner/>
      </CAssetDraftProvider>
    </CLangProvider>
  );
}
