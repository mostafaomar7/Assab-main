import "./_group.css";
import { AppLayout } from "./_shared/AppLayout";
import { useState } from "react";
import { Phone, MessageSquare, Clock, User, AlertTriangle, CheckCircle2, ArrowRight, Search } from "lucide-react";

interface Shift {
  id: string;
  branch: string;
  employee: string;
  role: string;
  phone: string;
  startTime: string;
  duration: string;
  status: "active" | "late" | "ended";
  cashDrawer: number;
  sales: number;
  ordersCount: number;
}

const shifts: Shift[] = [
  { id: "SHF-0881", branch: "فرع الرياض - العليا", employee: "محمد العتيبي", role: "كاشير رئيسي", phone: "0501234567", startTime: "8:00 ص", duration: "3:22 ساعة", status: "active", cashDrawer: 4200, sales: 12500, ordersCount: 87 },
  { id: "SHF-0882", branch: "فرع الرياض - العليا", employee: "خالد الشمري", role: "مشرف الشفت", phone: "0509876543", startTime: "8:00 ص", duration: "3:22 ساعة", status: "active", cashDrawer: 0, sales: 12500, ordersCount: 87 },
  { id: "SHF-0883", branch: "فرع جدة - الحمراء", employee: "فهد القحطاني", role: "كاشير", phone: "0555443322", startTime: "7:00 ص", duration: "4:22 ساعة", status: "active", cashDrawer: 3800, sales: 9200, ordersCount: 63 },
  { id: "SHF-0884", branch: "فرع مكة - المعابدة", employee: "سعد الدوسري", role: "مشرف الشفت", phone: "0562211334", startTime: "6:00 ص", duration: "5:22 ساعة", status: "late", cashDrawer: 1200, sales: 6800, ordersCount: 45 },
  { id: "SHF-0885", branch: "فرع الدمام", employee: "عبدالله الحربي", role: "كاشير", phone: "0534455667", startTime: "6:00 ص", duration: "5:22 ساعة", status: "active", cashDrawer: 5500, sales: 11300, ordersCount: 72 },
  { id: "SHF-0886", branch: "فرع الرياض - النزهة", employee: "تركي المالكي", role: "مشرف الشفت", phone: "0541122334", startTime: "10:00 ص", duration: "1:22 ساعة", status: "active", cashDrawer: 800, sales: 2100, ordersCount: 14 },
  { id: "SHF-0878", branch: "فرع جدة - الروضة", employee: "ناصر الغامدي", role: "كاشير", phone: "0568899001", startTime: "6:00 ص", duration: "انتهى", status: "ended", cashDrawer: 0, sales: 18200, ordersCount: 124 },
];

const statusConfig: Record<string, { label: string; cls: string; dot: string }> = {
  active: { label: "نشط", cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  late: { label: "تأخير", cls: "bg-amber-50 text-amber-700", dot: "bg-amber-500 animate-pulse" },
  ended: { label: "منتهي", cls: "bg-gray-50 text-gray-500", dot: "bg-gray-300" },
};

function ContactModal({ shift, onClose }: { shift: Shift; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-[400px] p-6" dir="rtl">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center text-2xl">👤</div>
          <div>
            <h3 className="font-bold text-gray-800 text-lg">{shift.employee}</h3>
            <p className="text-gray-500 text-sm">{shift.role} — {shift.branch}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-2 h-2 rounded-full ${statusConfig[shift.status].dot}`}></div>
              <span className={`text-xs font-medium ${statusConfig[shift.status].cls} px-2 py-0.5 rounded-full`}>
                {statusConfig[shift.status].label}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">رقم الجوال</span>
            <span className="font-mono font-bold text-gray-800" dir="ltr">{shift.phone}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">بدء الشفت</span>
            <span className="text-sm text-gray-700">{shift.startTime}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">المدة</span>
            <span className="text-sm text-gray-700">{shift.duration}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">مبيعات الشفت</span>
            <span className="font-bold text-purple-700" dir="ltr">{shift.sales.toLocaleString()} ر.س</span>
          </div>
        </div>
        <div className="flex gap-3 mb-3">
          <a href={`tel:${shift.phone}`} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700">
            <Phone size={16} /> اتصال
          </a>
          <a href={`https://wa.me/966${shift.phone.slice(1)}`} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-50 text-emerald-700 font-semibold text-sm hover:bg-emerald-100 border border-emerald-200">
            <MessageSquare size={16} /> واتساب
          </a>
        </div>
        <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">
          إغلاق
        </button>
      </div>
    </div>
  );
}

export function ShiftsModule() {
  const [contact, setContact] = useState<Shift | null>(null);

  const activeCount = shifts.filter((s) => s.status === "active").length;
  const lateCount = shifts.filter((s) => s.status === "late").length;
  const totalSales = shifts.filter((s) => s.status !== "ended").reduce((s, sh) => s + sh.sales, 0);

  return (
    <AppLayout role="accountant" userName="أحمد محمد" activeSection="shifts" notificationsCount={12}>
      {contact && <ContactModal shift={contact} onClose={() => setContact(null)} />}
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
              <span className="text-purple-600 cursor-pointer hover:underline">الرئيسية</span>
              <ArrowRight size={12} className="rotate-180" />
              <span className="text-gray-700 font-semibold">إدارة الشفتات</span>
            </div>
            <h2 className="font-bold text-gray-800 text-xl">⏰ إدارة الشفتات النشطة</h2>
            <p className="text-gray-400 text-sm">متابعة الشفتات في جميع الفروع المخصصة في الوقت الفعلي</p>
          </div>
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-sm font-semibold">مباشر — آخر تحديث: الآن</span>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "شفتات نشطة الآن", value: `${activeCount}`, icon: "🟢", color: "border-l-emerald-500 bg-emerald-50" },
            { label: "شفتات متأخرة", value: `${lateCount}`, icon: "🟡", color: "border-l-amber-500 bg-amber-50" },
            { label: "إجمالي مبيعات الشفتات", value: `${(totalSales / 1000).toFixed(0)}K ر.س`, icon: "💰", color: "border-l-purple-500 bg-purple-50" },
            { label: "إجمالي الطلبات النشطة", value: `${shifts.filter((s) => s.status !== "ended").reduce((s, sh) => s + sh.ordersCount, 0)}`, icon: "📦", color: "border-l-blue-500 bg-blue-50" },
          ].map((k, i) => (
            <div key={i} className={`bg-white rounded-xl p-4 shadow-sm border-l-4 flex items-center gap-3 ${k.color}`}>
              <span className="text-2xl">{k.icon}</span>
              <div>
                <p className="text-gray-500 text-xs">{k.label}</p>
                <p className="text-gray-900 font-bold text-2xl mt-0.5">{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex-1 max-w-sm">
            <Search size={14} className="text-gray-400" />
            <input className="text-sm text-gray-600 bg-transparent outline-none w-full" placeholder="بحث باسم الموظف أو الفرع..." />
          </div>
          <select className="text-sm border border-gray-200 rounded-xl px-4 py-2.5 text-gray-600 bg-white">
            <option>كل الحالات</option>
            <option>نشط</option>
            <option>تأخير</option>
            <option>منتهي</option>
          </select>
          <select className="text-sm border border-gray-200 rounded-xl px-4 py-2.5 text-gray-600 bg-white">
            <option>كل الفروع (1-50)</option>
            <option>فرع الرياض - العليا</option>
            <option>فرع جدة - الحمراء</option>
            <option>فرع مكة</option>
          </select>
        </div>

        {/* Shifts Grid */}
        <div className="grid grid-cols-2 gap-4">
          {shifts.map((shift) => {
            const cfg = statusConfig[shift.status];
            return (
              <div
                key={shift.id}
                className={`bg-white rounded-xl border shadow-sm p-5 transition-all ${shift.status === "late" ? "border-amber-200 shadow-amber-50" : "border-gray-100 hover:border-purple-200"}`}
              >
                {shift.status === "late" && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                    <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
                    <p className="text-amber-700 text-xs font-medium">انتهى وقت الشفت — لم يُغلق الصندوق بعد</p>
                  </div>
                )}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-xl flex-shrink-0">
                      {shift.role.includes("مشرف") ? "👔" : "💼"}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{shift.employee}</p>
                      <p className="text-xs text-gray-500">{shift.role}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{shift.branch}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${cfg.dot}`}></div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.cls}`}>{cfg.label}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] text-gray-400">بداية الشفت</p>
                    <p className="font-bold text-gray-700 text-sm mt-0.5">{shift.startTime}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] text-gray-400">مدة الشفت</p>
                    <p className="font-bold text-gray-700 text-sm mt-0.5">{shift.duration}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] text-gray-400">الطلبات</p>
                    <p className="font-bold text-gray-700 text-sm mt-0.5">{shift.ordersCount}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-purple-50 rounded-lg px-3 py-2.5 mb-4">
                  <div>
                    <p className="text-xs text-purple-500">مبيعات الشفت</p>
                    <p className="font-bold text-purple-700 font-mono" dir="ltr">{shift.sales.toLocaleString()} ر.س</p>
                  </div>
                  {shift.cashDrawer > 0 && (
                    <div className="text-left">
                      <p className="text-xs text-gray-500">الصندوق النقدي</p>
                      <p className="font-bold text-gray-700 font-mono" dir="ltr">{shift.cashDrawer.toLocaleString()} ر.س</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200">
                    👁 عرض التفاصيل
                  </button>
                  <button
                    onClick={() => setContact(shift)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 border border-emerald-200"
                  >
                    <Phone size={12} /> تواصل مع الموظف
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
