import "./_group.css";
import { AppLayout } from "./_shared/AppLayout";
import { useState } from "react";
import {
  CheckCircle2, Clock, TrendingUp, Users, BarChart2,
  ThumbsUp, ThumbsDown, MessageSquare, ChevronDown, ChevronUp,
  Star, AlertTriangle, Eye, Upload
} from "lucide-react";

interface AccountantGroup {
  accountantId: string;
  accountantName: string;
  module: string;
  operations: OperationItem[];
  expanded: boolean;
}

interface OperationItem {
  id: string;
  branch: string;
  amount: string;
  matchStatus: "exact" | "review" | "diff";
  timeAgo: string;
}

const initialGroups: AccountantGroup[] = [
  {
    accountantId: "ACC-01",
    accountantName: "أحمد محمد الشهري",
    module: "المبيعات",
    expanded: true,
    operations: [
      { id: "OPS-2401", branch: "فرع الرياض - العليا", amount: "18,340 ر.س", matchStatus: "exact", timeAgo: "قبل ساعة" },
      { id: "OPS-2395", branch: "فرع الرياض - النزهة", amount: "22,100 ر.س", matchStatus: "exact", timeAgo: "قبل ساعتين" },
      { id: "OPS-2388", branch: "فرع جدة - الحمراء", amount: "31,800 ر.س", matchStatus: "review", timeAgo: "قبل 3 ساعات" },
    ],
  },
  {
    accountantId: "ACC-01",
    accountantName: "أحمد محمد الشهري",
    module: "المصروفات",
    expanded: false,
    operations: [
      { id: "EXP-0441", branch: "فرع الرياض - العليا", amount: "1,250 ر.س", matchStatus: "exact", timeAgo: "قبل ساعتين" },
      { id: "EXP-0440", branch: "فرع جدة - الحمراء", amount: "3,400 ر.س", matchStatus: "diff", timeAgo: "قبل 3 ساعات" },
    ],
  },
  {
    accountantId: "ACC-02",
    accountantName: "سارة العمري",
    module: "المشتريات",
    expanded: false,
    operations: [
      { id: "PUR-1101", branch: "فرع الرياض - العليا", amount: "4,800 ر.س", matchStatus: "exact", timeAgo: "قبل ساعة" },
      { id: "PUR-1100", branch: "فرع جدة - الحمراء", amount: "1,050 ر.س", matchStatus: "diff", timeAgo: "قبل 4 ساعات" },
    ],
  },
  {
    accountantId: "ACC-03",
    accountantName: "محمد الحربي",
    module: "المخزون",
    expanded: false,
    operations: [
      { id: "INV-0221", branch: "فرع مكة - المعابدة", amount: "8,500 ر.س", matchStatus: "review", timeAgo: "قبل ساعة" },
    ],
  },
];

const accountantStats = [
  { name: "أحمد محمد الشهري", branches: 20, approved: 38, pending: 5, rate: 88, rating: 4.8 },
  { name: "سارة العمري", branches: 20, approved: 31, pending: 2, rate: 94, rating: 4.9 },
  { name: "محمد الحربي", branches: 20, approved: 18, pending: 8, rate: 69, rating: 3.8 },
  { name: "فاطمة السالم", branches: 20, approved: 42, pending: 1, rate: 98, rating: 5.0 },
];

const matchLabels: Record<string, { label: string; cls: string }> = {
  exact: { label: "✓ متطابق", cls: "bg-emerald-50 text-emerald-700" },
  review: { label: "⚠ يحتاج مراجعة", cls: "bg-amber-50 text-amber-700" },
  diff: { label: "⛔ فرق", cls: "bg-red-50 text-red-700" },
};

type Tab = "approval" | "accountants" | "erp";

export function HeadAccountantDashboard() {
  const [groups, setGroups] = useState(initialGroups);
  const [tab, setTab] = useState<Tab>("approval");
  const [approvedGroups, setApprovedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (idx: number) => {
    setGroups((prev) => prev.map((g, i) => (i === idx ? { ...g, expanded: !g.expanded } : g)));
  };

  const approveAll = (idx: number) => {
    const key = `${groups[idx].accountantId}-${groups[idx].module}`;
    setApprovedGroups((prev) => new Set([...prev, key]));
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "approval", label: "الاعتماد النهائي", icon: "✅" },
    { id: "accountants", label: "أداء المحاسبين", icon: "👥" },
    { id: "erp", label: "الترحيل لـ ERP", icon: "🔗" },
  ];

  return (
    <AppLayout role="head-accountant" userName="فهد الدوسري" activeSection="approval" notificationsCount={28}>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h2 className="font-bold text-gray-800 text-xl">👔 لوحة رئيس الحسابات</h2>
          <p className="text-gray-400 text-sm">الإشراف على 4 محاسبين · 100 فرع · الاعتماد النهائي وترحيل ERP</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: "عمليات وافق عليها المحاسبون", value: "78", sub: "تنتظر اعتمادي النهائي", color: "border-l-amber-500" },
            { label: "اعتمدتها اليوم", value: "45", sub: "تم الترحيل لـ ERP", color: "border-l-emerald-500" },
            { label: "المحاسبون الأربعة", value: "4/4", sub: "نشطون الآن", color: "border-l-blue-500" },
            { label: "عمليات مرفوضة (للمراجعة)", value: "3", sub: "يجب مراجعتها", color: "border-l-red-500" },
            { label: "معدل الأداء العام", value: "87%", sub: "هذا الشهر", color: "border-l-purple-500" },
          ].map((k, i) => (
            <div key={i} className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${k.color}`}>
              <p className="text-gray-500 text-xs">{k.label}</p>
              <p className="text-gray-900 font-bold text-2xl mt-1">{k.value}</p>
              <p className="text-gray-400 text-xs mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 p-1.5 rounded-xl w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-white text-purple-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* APPROVAL TAB — Grouped by accountant + module */}
        {tab === "approval" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">العمليات مجمّعة حسب المحاسب والموديول · يمكنك اعتماد كل مجموعة دفعةً واحدة</p>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
                ✅ اعتماد الكل
              </button>
            </div>
            {groups.map((group, idx) => {
              const groupKey = `${group.accountantId}-${group.module}`;
              const isApproved = approvedGroups.has(groupKey);
              const hasDiff = group.operations.some((o) => o.matchStatus === "diff");
              return (
                <div key={idx} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${hasDiff ? "border-amber-200" : isApproved ? "border-emerald-200" : "border-gray-100"}`}>
                  {/* Group Header */}
                  <div
                    className={`px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors ${isApproved ? "bg-emerald-50" : ""}`}
                    onClick={() => toggleGroup(idx)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-lg flex-shrink-0">
                        {group.accountantId === "ACC-01" ? "👤" : group.accountantId === "ACC-02" ? "👤" : "👤"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800">{group.accountantName}</span>
                          <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full font-medium">{group.module}</span>
                          {hasDiff && <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">⚠ يوجد فروق</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{group.operations.length} عمليات موافق عليها من المحاسب</p>
                      </div>
                    </div>
                    {/* Totals */}
                    <div className="text-left flex-shrink-0 ml-4">
                      <p className="font-bold text-purple-700 font-mono" dir="ltr">
                        {group.operations.reduce((sum, op) => {
                          const num = parseFloat(op.amount.replace(/[^\d.]/g, "").replace(",", ""));
                          return sum + num;
                        }, 0).toLocaleString()} ر.س
                      </p>
                      <p className="text-xs text-gray-400">إجمالي المجموعة</p>
                    </div>
                    {/* Actions */}
                    {!isApproved ? (
                      <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => approveAll(idx)}
                          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                        >
                          <CheckCircle2 size={14} /> اعتماد الكل
                        </button>
                        <button className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200">
                          <ThumbsDown size={14} /> إرجاع للمراجعة
                        </button>
                      </div>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg flex-shrink-0">
                        <CheckCircle2 size={14} /> تم الاعتماد النهائي
                      </span>
                    )}
                    <div className="flex-shrink-0 mr-2">
                      {group.expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </div>
                  {/* Operations */}
                  {group.expanded && (
                    <div className="border-t border-gray-100">
                      {group.operations.map((op) => {
                        const match = matchLabels[op.matchStatus];
                        return (
                          <div key={op.id} className="flex items-center gap-4 px-5 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 ml-14">
                            <span className="font-mono text-xs text-purple-600 font-bold w-24 flex-shrink-0">{op.id}</span>
                            <span className="text-sm text-gray-700 flex-1">{op.branch}</span>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${match.cls}`}>{match.label}</span>
                            <span className="text-xs text-gray-400">⏰ {op.timeAgo}</span>
                            <span className="font-mono font-bold text-gray-800 text-sm" dir="ltr">{op.amount}</span>
                            <div className="flex items-center gap-1.5">
                              <button className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500"><Eye size={13} /></button>
                              {!isApproved && (
                                <>
                                  <button className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-600"><ThumbsUp size={13} /></button>
                                  <button className="p-1.5 rounded-lg hover:bg-red-100 text-red-600"><ThumbsDown size={13} /></button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ACCOUNTANTS PERFORMANCE TAB */}
        {tab === "accountants" && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {accountantStats.map((acc, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{acc.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{acc.branches} فرع مخصص</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star size={12} className="text-amber-400 fill-amber-400" />
                      <span className="font-bold text-amber-600 text-sm">{acc.rating}</span>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>معدل الموافقة</span>
                        <span className="font-bold text-gray-700">{acc.rate}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${acc.rate >= 90 ? "bg-emerald-500" : acc.rate >= 70 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${acc.rate}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <p className="text-xs text-gray-400">موافق عليها</p>
                        <p className="font-bold text-emerald-600 text-lg">{acc.approved}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400">معلقة</p>
                        <p className={`font-bold text-lg ${acc.pending > 5 ? "text-red-600" : "text-amber-600"}`}>{acc.pending}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button className="flex-1 text-xs py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100">عرض العمليات</button>
                    <button className="flex-1 text-xs py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100">تواصل</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ERP EXPORT TAB */}
        {tab === "erp" && (
          <div className="grid grid-cols-3 gap-5">
            <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h3 className="font-bold text-gray-800">🔗 تصدير البيانات إلى نظام ERP</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">📦 الموديول</label>
                  <div className="space-y-2">
                    {["المبيعات", "المصروفات", "المشتريات", "المخزون", "الكل"].map((m, i) => (
                      <label key={m} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input type="radio" name="module" defaultChecked={i === 1} className="accent-purple-600" /> {m}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">📅 الفترة الزمنية</label>
                  <div className="space-y-2">
                    {["يوم محدد: 14 أكتوبر 2025", "الأسبوع الحالي", "الشهر الحالي", "نطاق مخصص"].map((p, i) => (
                      <label key={p} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input type="radio" name="period" defaultChecked={i === 0} className="accent-purple-600" /> {p}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">🏢 المطعم</label>
                  <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600">
                    <option>الكل (25 مطعم)</option>
                    <option>مطعم البيك</option>
                    <option>مطعم هرفي</option>
                    <option>مطعم كودو</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">🔄 الحالة</label>
                  <div className="space-y-2">
                    {["معتمدة فقط (موصى به)", "الكل"].map((s, i) => (
                      <label key={s} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input type="radio" name="status" defaultChecked={i === 0} className="accent-purple-600" /> {s}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <button className="w-full py-3 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700">
                🔍 عرض نتائج التصدير
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h3 className="font-bold text-gray-800">📊 نتائج البحث</h3>
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <p className="text-purple-600 text-xs">تم العثور على</p>
                <p className="font-bold text-purple-700 text-3xl">145</p>
                <p className="text-purple-600 text-xs">عملية جاهزة للتصدير</p>
              </div>
              <div className="space-y-2.5">
                {[
                  { name: "مطعم البيك", count: 45, amount: "125,400" },
                  { name: "مطعم هرفي", count: 38, amount: "98,200" },
                  { name: "مطعم كودو", count: 32, amount: "87,600" },
                  { name: "مطاعم أخرى", count: 30, amount: "114,400" },
                ].map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">🏪 {r.name}</span>
                    <div className="text-left">
                      <span className="text-gray-400 text-xs ml-1">{r.count} عملية</span>
                      <span className="font-mono font-bold text-gray-700" dir="ltr"> {r.amount} ر.س</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">الإجمالي</p>
                  <p className="font-bold text-purple-700 font-mono" dir="ltr">425,600 ر.س</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700">
                    📤 تصدير Excel
                  </button>
                  <button className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                    🔗 ترحيل API
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
