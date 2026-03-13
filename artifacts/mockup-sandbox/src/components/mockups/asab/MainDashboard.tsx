import "./_group.css";
import { AppLayout } from "./_shared/AppLayout";
import { useState } from "react";
import {
  TrendingUp, Wallet, ShoppingCart, Package, Clock, Users, ArrowLeftRight,
  Building2, BarChart3, AlertTriangle, CheckCircle2, XCircle,
  Eye, ThumbsUp, ThumbsDown, MessageSquare, RefreshCw, Filter, Paperclip,
  ChevronRight, Bell
} from "lucide-react";

const moduleCards = [
  { id: "sales", label: "المبيعات", icon: "💰", pending: 14, total: 42, color: "bg-emerald-500", urgent: true },
  { id: "expenses", label: "المصروفات", icon: "💸", pending: 22, total: 67, color: "bg-red-500", urgent: true },
  { id: "purchases", label: "المشتريات", icon: "🛒", pending: 8, total: 31, color: "bg-blue-500", urgent: false },
  { id: "inventory", label: "المخزون", icon: "📦", pending: 5, total: 18, color: "bg-amber-500", urgent: false },
  { id: "fixed-assets", label: "الأصول الثابتة", icon: "🏢", pending: 0, total: 4, color: "bg-purple-500", urgent: false },
  { id: "shifts", label: "إدارة الشفتات", icon: "⏰", pending: 3, total: 12, color: "bg-cyan-500", urgent: false },
  { id: "employees", label: "كشف الموظفين", icon: "👥", pending: 6, total: 25, color: "bg-indigo-500", urgent: false },
  { id: "cash", label: "العهد النقدية", icon: "💼", pending: 2, total: 9, color: "bg-orange-500", urgent: false },
];

type OpStatus = "pending" | "approved" | "rejected" | "final-approved";
type MatchStatus = "exact" | "needs-review" | "qty-diff";

interface Operation {
  id: string;
  branch: string;
  module: string;
  amount: string;
  timeAgo: string;
  matchStatus: MatchStatus;
  attachments: number;
  status: OpStatus;
  diff?: string;
}

const operations: Operation[] = [
  { id: "OPS-2401", branch: "فرع الرياض - العليا", module: "مبيعات", amount: "18,340 ر.س", timeAgo: "قبل ساعة", matchStatus: "exact", attachments: 3, status: "pending" },
  { id: "OPS-2400", branch: "فرع جدة - الحمراء", module: "مصروفات", amount: "12,500 ر.س", timeAgo: "قبل 3 ساعات", matchStatus: "needs-review", attachments: 2, status: "pending" },
  { id: "OPS-2399", branch: "فرع مكة - المعابدة", module: "مشتريات", amount: "8,200 ر.س", timeAgo: "قبل 5 ساعات", matchStatus: "qty-diff", attachments: 4, status: "pending", diff: "فرق في الكمية: 5 كجم" },
  { id: "OPS-2398", branch: "فرع الدمام - الكورنيش", module: "مبيعات", amount: "45,230 ر.س", timeAgo: "قبل 6 ساعات", matchStatus: "exact", attachments: 3, status: "approved" },
  { id: "OPS-2397", branch: "فرع الرياض - النزهة", module: "مصروفات", amount: "3,800 ر.س", timeAgo: "أمس", matchStatus: "needs-review", attachments: 1, status: "rejected" },
];

const matchLabels: Record<MatchStatus, { label: string; cls: string; icon: string }> = {
  exact: { label: "متطابق ✓", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: "🟢" },
  "needs-review": { label: "يحتاج مراجعة", cls: "bg-amber-50 text-amber-700 border border-amber-200", icon: "🟡" },
  "qty-diff": { label: "فرق في الكمية", cls: "bg-red-50 text-red-700 border border-red-200", icon: "🔴" },
};

const opStatusLabels: Record<OpStatus, { label: string; cls: string }> = {
  pending: { label: "معلق", cls: "bg-amber-50 text-amber-700" },
  approved: { label: "موافق عليه", cls: "bg-blue-50 text-blue-700" },
  rejected: { label: "مرفوض", cls: "bg-red-50 text-red-700" },
  "final-approved": { label: "معتمد نهائياً", cls: "bg-emerald-50 text-emerald-700" },
};

function RejectModal({ opId, onClose }: { opId: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-[480px] p-6" dir="rtl">
        <h3 className="font-bold text-gray-800 text-lg mb-1">رفض العملية {opId}</h3>
        <p className="text-gray-500 text-sm mb-4">يجب إدخال سبب الرفض لإعادة العملية إلى مدير الفرع.</p>
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-700 block mb-2">سبب الرفض <span className="text-red-500">*</span></label>
          <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 mb-2">
            <option>اختر السبب...</option>
            <option>بيانات غير مكتملة</option>
            <option>فاتورة مفقودة أو غير واضحة</option>
            <option>تناقض في المبالغ</option>
            <option>فرق في الكميات</option>
            <option>تاريخ غير صحيح</option>
            <option>مورد غير معتمد</option>
            <option>أخرى</option>
          </select>
          <textarea
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 resize-none"
            rows={3}
            placeholder="تفاصيل إضافية (اختياري)..."
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">
            ✕ تأكيد الرفض
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

export function MainDashboard() {
  const [rejectId, setRejectId] = useState<string | null>(null);

  return (
    <AppLayout role="accountant" userName="أحمد محمد" activeSection="dashboard" notificationsCount={12}>
      {rejectId && <RejectModal opId={rejectId} onClose={() => setRejectId(null)} />}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-gray-800 font-bold text-xl">ملخص اليوم — الاثنين 14 أكتوبر 2025</h2>
            <p className="text-gray-400 text-sm mt-0.5">الفروع المخصصة: 1–50 | الموديولات: المبيعات، المصروفات</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              <Filter size={14} /> فلترة
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700">
              <RefreshCw size={14} /> تحديث
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "عمليات جديدة اليوم", value: "45", sub: "من الفروع المخصصة", icon: <BarChart3 size={20} className="text-purple-600" />, bg: "bg-purple-50", border: "border-l-4 border-l-purple-500" },
            { label: "وافقت عليها", value: "32", sub: "تم إرسالها لرئيس الحسابات", icon: <CheckCircle2 size={20} className="text-emerald-600" />, bg: "bg-emerald-50", border: "border-l-4 border-l-emerald-500" },
            { label: "معلقة - تنتظرني", value: "13", sub: "يجب المراجعة", icon: <Clock size={20} className="text-amber-600" />, bg: "bg-amber-50", border: "border-l-4 border-l-amber-500" },
            { label: "معدل الموافقة", value: "71%", sub: "هذا الشهر", icon: <TrendingUp size={20} className="text-blue-600" />, bg: "bg-blue-50", border: "" },
          ].map((k, i) => (
            <div key={i} className={`bg-white rounded-xl p-4 shadow-sm flex items-start gap-3 ${k.border}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${k.bg}`}>{k.icon}</div>
              <div>
                <p className="text-gray-500 text-xs">{k.label}</p>
                <p className="text-gray-900 font-bold text-2xl mt-0.5">{k.value}</p>
                <p className="text-gray-400 text-xs mt-0.5">{k.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-5">
          {/* Module Cards */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">الموديولات التسعة</h3>
              <span className="text-xs text-gray-400">المعلق / الإجمالي</span>
            </div>
            <div className="p-4 grid grid-cols-4 gap-3">
              {moduleCards.map((mod) => (
                <button key={mod.id} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/40 transition-all relative">
                  {mod.urgent && <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-red-500"></span>}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${mod.color}`}>{mod.icon}</div>
                  <span className="text-xs font-medium text-gray-700 text-center leading-tight">{mod.label}</span>
                  <div className="flex items-center gap-1">
                    {mod.pending > 0 && (
                      <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{mod.pending}</span>
                    )}
                    <span className="text-gray-300 text-[10px]">/</span>
                    <span className="text-gray-500 text-[10px]">{mod.total}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Filters Panel */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">فلاتر البحث</h3>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">🏪 الفرع</label>
                <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600">
                  <option>الكل (الفروع 1-50)</option>
                  <option>فرع الرياض - العليا</option>
                  <option>فرع جدة - الحمراء</option>
                  <option>فرع مكة - المعابدة</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">📦 الموديول</label>
                <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600">
                  <option>الكل</option>
                  <option>المبيعات</option>
                  <option>المصروفات</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">📅 التاريخ</label>
                <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600">
                  <option>اليوم</option>
                  <option>أمس</option>
                  <option>هذا الأسبوع</option>
                  <option>هذا الشهر</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">🔄 الحالة</label>
                <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600">
                  <option>الكل</option>
                  <option>معلق</option>
                  <option>موافق عليه</option>
                  <option>مرفوض</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input type="text" placeholder="🔍 بحث..." className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600" />
              </div>
              <button className="w-full py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700">
                تطبيق الفلاتر
              </button>
            </div>
          </div>
        </div>

        {/* Operations List */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">قائمة العمليات المعلقة</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">13 عملية تنتظر مراجعتك</span>
              <button className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-medium hover:bg-emerald-100">
                ✓ موافقة جماعية
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {operations.map((op) => {
              const match = matchLabels[op.matchStatus];
              const statusLabel = opStatusLabels[op.status];
              return (
                <div key={op.id} className={`px-5 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors ${op.matchStatus === "qty-diff" ? "border-r-4 border-r-red-400" : op.matchStatus === "needs-review" ? "border-r-4 border-r-amber-400" : ""}`}>
                  {/* Module badge */}
                  <div className="flex-shrink-0 mt-0.5">
                    <span className="text-sm bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg font-semibold">
                      {op.module}
                    </span>
                  </div>
                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800 text-sm">{op.branch}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-400 font-mono">{op.id}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-400">⏰ {op.timeAgo}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${match.cls}`}>
                        {match.icon} {match.label}
                      </span>
                      {op.diff && (
                        <span className="text-xs text-red-600 font-medium">⚠ {op.diff}</span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Paperclip size={11} /> {op.attachments} مرفقات
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusLabel.cls}`}>
                        {statusLabel.label}
                      </span>
                    </div>
                  </div>
                  {/* Amount */}
                  <div className="flex-shrink-0 text-left">
                    <div className="font-bold text-gray-800 font-mono" dir="ltr">{op.amount}</div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 font-medium">
                      <Eye size={13} /> عرض التفاصيل
                    </button>
                    {op.status === "pending" && (
                      <>
                        <button className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium">
                          <ThumbsUp size={13} /> موافقة
                        </button>
                        <button
                          onClick={() => setRejectId(op.id)}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-medium"
                        >
                          <ThumbsDown size={13} /> رفض
                        </button>
                        <button className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium">
                          <MessageSquare size={13} /> توضيح
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">عرض 5 من 13 عملية معلقة</span>
            <div className="flex items-center gap-2">
              {[1, 2, 3, "...", 8].map((p, i) => (
                <button key={i} className={`w-8 h-8 rounded-lg text-xs font-medium ${p === 1 ? "bg-purple-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}>
                  {p}
                </button>
              ))}
              <button className="flex items-center gap-1 text-xs text-purple-600 hover:underline">التالي <ChevronRight size={12} /></button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
