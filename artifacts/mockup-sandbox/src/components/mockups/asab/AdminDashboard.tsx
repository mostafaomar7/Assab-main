import "./_group.css";
import { AppLayout } from "./_shared/AppLayout";
import { useState } from "react";
import { Plus, Settings, Search, Edit, Trash2, ToggleLeft, Mail, ChevronRight } from "lucide-react";

interface Restaurant {
  id: string;
  name: string;
  branches: number;
  plan: "أساسية" | "متقدمة" | "مؤسسية";
  price: string;
  expiryDays: number;
  status: "active" | "warning" | "frozen";
}

const restaurants: Restaurant[] = [
  { id: "R01", name: "مطعم البيك", branches: 50, plan: "مؤسسية", price: "10,000 ر.س/شهر", expiryDays: 77, status: "active" },
  { id: "R02", name: "مطعم هرفي", branches: 12, plan: "متقدمة", price: "5,000 ر.س/شهر", expiryDays: 32, status: "warning" },
  { id: "R03", name: "مطعم كودو", branches: 8, plan: "متقدمة", price: "4,500 ر.س/شهر", expiryDays: 95, status: "active" },
  { id: "R04", name: "مطعم ماكدونالدز السعودية", branches: 22, plan: "مؤسسية", price: "10,000 ر.س/شهر", expiryDays: 7, status: "warning" },
  { id: "R05", name: "مطعم بروستد الوطني", branches: 6, plan: "أساسية", price: "2,000 ر.س/شهر", expiryDays: -5, status: "frozen" },
];

const users = [
  { name: "أحمد محمد الشهري", email: "ahmed@asab.sa", role: "محاسب", branches: "الفروع 1-20", modules: "مبيعات، مصروفات", status: "active" as const },
  { name: "سارة العمري", email: "sara@asab.sa", role: "محاسب", branches: "الفروع 21-40", modules: "المشتريات، المخزون", status: "active" as const },
  { name: "فهد الدوسري", email: "fahad@asab.sa", role: "رئيس حسابات", branches: "جميع الفروع", modules: "جميع الموديولات", status: "active" as const },
  { name: "نورة السبيعي", email: "noura@asab.sa", role: "مدير فرع", branches: "فرع الرياض - العليا", modules: "—", status: "active" as const },
  { name: "خالد العتيبي", email: "khalid@asab.sa", role: "محاسب", branches: "الفروع 41-60", modules: "مبيعات فقط", status: "inactive" as const },
];

const planColors: Record<string, string> = {
  "أساسية": "bg-gray-100 text-gray-600",
  "متقدمة": "bg-blue-50 text-blue-700",
  "مؤسسية": "bg-purple-50 text-purple-700",
};
const statusConfig: Record<string, { label: string; cls: string; dot: string }> = {
  active: { label: "نشط", cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  warning: { label: "ينتهي قريباً", cls: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  frozen: { label: "مجمد", cls: "bg-red-50 text-red-700", dot: "bg-red-500" },
};

type AdminTab = "overview" | "users" | "subscriptions";

export function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [addUserOpen, setAddUserOpen] = useState(false);

  const tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: "overview", label: "الرئيسية", icon: "📊" },
    { id: "users", label: "المستخدمون", icon: "👥" },
    { id: "subscriptions", label: "الاشتراكات", icon: "💰" },
  ];

  return (
    <AppLayout role="admin" userName="الأدمن" activeSection="admin" notificationsCount={5}>
      {addUserOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-[540px] p-6 space-y-4" dir="rtl">
            <h3 className="font-bold text-gray-800 text-lg">➕ إضافة مستخدم جديد</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">الاسم الكامل *</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700" placeholder="اسم المستخدم..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">البريد الإلكتروني *</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700" placeholder="user@asab.sa" dir="ltr" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">رقم الجوال</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700" placeholder="05XXXXXXXX" dir="ltr" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">الدور *</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
                  <option>اختر الدور...</option>
                  <option>محاسب</option>
                  <option>رئيس حسابات</option>
                  <option>مدير فرع</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">الفروع المخصصة</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
                  <option>الفروع 1-20</option>
                  <option>الفروع 21-40</option>
                  <option>الفروع 41-60</option>
                  <option>الفروع 61-80</option>
                  <option>الفروع 81-100</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-500 block mb-2">الموديولات المتاحة</label>
                <div className="grid grid-cols-4 gap-2">
                  {["المبيعات", "المصروفات", "المشتريات", "المخزون", "الأصول", "الشفتات", "الموظفين", "العهد"].map((m) => (
                    <label key={m} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                      <input type="checkbox" className="rounded" defaultChecked={["المبيعات", "المصروفات"].includes(m)} />
                      {m}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-blue-700 text-xs">📧 سيتم إرسال بيانات الدخول تلقائياً إلى البريد الإلكتروني المدخل</p>
            </div>
            <div className="flex gap-3">
              <button className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 flex items-center justify-center gap-2">
                <Mail size={14} /> إضافة وإرسال بيانات الدخول
              </button>
              <button onClick={() => setAddUserOpen(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        <div>
          <h2 className="font-bold text-gray-800 text-xl">🧠 لوحة الأدمن الرئيسية</h2>
          <p className="text-gray-400 text-sm">إدارة شاملة للنظام — المستخدمون، المطاعم، الاشتراكات، الصلاحيات</p>
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

        {tab === "overview" && (
          <div className="space-y-5">
            {/* System KPIs */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "مطاعم نشطة", value: "25", icon: "🏪", color: "border-l-purple-500", sub: "+2 هذا الشهر" },
                { label: "فروع نشطة", value: "100", icon: "🏢", color: "border-l-blue-500", sub: "+5 هذا الشهر" },
                { label: "مستخدمون نشطون", value: "2,450", icon: "👥", color: "border-l-emerald-500", sub: "+12 هذا الشهر" },
                { label: "وقت التشغيل", value: "99.9%", icon: "⚡", color: "border-l-amber-500", sub: "آخر 30 يوم" },
              ].map((k, i) => (
                <div key={i} className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${k.color}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{k.icon}</span>
                    <div>
                      <p className="text-gray-500 text-xs">{k.label}</p>
                      <p className="font-bold text-gray-900 text-2xl mt-0.5">{k.value}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{k.sub}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-5">
              {/* Users */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800">توزيع المستخدمين</h3>
                  <button onClick={() => setTab("users")} className="text-xs text-purple-600 hover:underline flex items-center gap-1">إدارة <ChevronRight size={12} /></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "محاسبون", value: 20, icon: "💼", cls: "bg-blue-50 text-blue-700" },
                    { label: "رؤساء حسابات", value: 4, icon: "👔", cls: "bg-purple-50 text-purple-700" },
                    { label: "مدراء فروع", value: 75, icon: "🏪", cls: "bg-emerald-50 text-emerald-700" },
                    { label: "أدمن", value: 1, icon: "🔐", cls: "bg-red-50 text-red-700" },
                  ].map((r, i) => (
                    <div key={i} className={`rounded-xl p-4 flex items-center gap-3 ${r.cls}`}>
                      <span className="text-2xl">{r.icon}</span>
                      <div>
                        <p className="text-xs opacity-70">{r.label}</p>
                        <p className="font-bold text-xl">{r.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setAddUserOpen(true)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700">
                    <Plus size={12} /> إضافة مستخدم
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs hover:bg-gray-50">
                    ⚙️ إدارة الصلاحيات
                  </button>
                </div>
              </div>

              {/* Subscription alerts */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800">تنبيهات الاشتراكات</h3>
                  <button onClick={() => setTab("subscriptions")} className="text-xs text-purple-600 hover:underline flex items-center gap-1">عرض الكل <ChevronRight size={12} /></button>
                </div>
                <div className="space-y-3">
                  {restaurants.filter((r) => r.status !== "active" || r.expiryDays < 30).map((r) => (
                    <div key={r.id} className={`flex items-center gap-3 p-3 rounded-xl border ${r.status === "frozen" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                      <span className="text-xl">{r.status === "frozen" ? "❌" : "⚠️"}</span>
                      <div className="flex-1">
                        <p className={`font-semibold text-sm ${r.status === "frozen" ? "text-red-700" : "text-amber-700"}`}>{r.name}</p>
                        <p className={`text-xs ${r.status === "frozen" ? "text-red-600" : "text-amber-600"}`}>
                          {r.status === "frozen" ? `مجمد — منتهي منذ ${Math.abs(r.expiryDays)} أيام` : `ينتهي خلال ${r.expiryDays} يوم`}
                        </p>
                      </div>
                      <button className={`text-xs px-2.5 py-1 rounded-lg font-medium ${r.status === "frozen" ? "bg-red-600 text-white" : "bg-amber-600 text-white"}`}>
                        {r.status === "frozen" ? "تفعيل" : "تجديد"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4">إجراءات سريعة</h3>
              <div className="grid grid-cols-5 gap-3">
                {[
                  { icon: "👤", label: "إضافة محاسب", action: () => setAddUserOpen(true) },
                  { icon: "🏪", label: "إضافة مطعم", action: () => setTab("subscriptions") },
                  { icon: "📊", label: "توزيع المحاسبين", action: () => setTab("users") },
                  { icon: "💰", label: "إدارة الاشتراكات", action: () => setTab("subscriptions") },
                  { icon: "📋", label: "سجل النشاطات", action: () => {} },
                ].map((action, i) => (
                  <button key={i} onClick={action.action} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 transition-all">
                    <span className="text-2xl">{action.icon}</span>
                    <span className="text-xs font-medium text-gray-600 text-center">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "users" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800">إدارة المستخدمين</h3>
                <p className="text-gray-400 text-xs mt-0.5">100 مستخدم في النظام</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                  <Search size={13} className="text-gray-400" />
                  <input className="text-sm text-gray-600 bg-transparent outline-none w-40" placeholder="بحث..." />
                </div>
                <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600">
                  <option>كل الأدوار</option>
                  <option>محاسب</option>
                  <option>رئيس حسابات</option>
                  <option>مدير فرع</option>
                </select>
                <button onClick={() => setAddUserOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700">
                  <Plus size={14} /> إضافة مستخدم
                </button>
              </div>
            </div>
            <table className="w-full" dir="rtl">
              <thead className="bg-gray-50">
                <tr className="text-xs text-gray-500 font-semibold">
                  <th className="px-5 py-3 text-right">المستخدم</th>
                  <th className="px-4 py-3 text-right">الدور</th>
                  <th className="px-4 py-3 text-right">الفروع المخصصة</th>
                  <th className="px-4 py-3 text-right">الموديولات</th>
                  <th className="px-4 py-3 text-center">الحالة</th>
                  <th className="px-4 py-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-base">👤</div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{u.name}</p>
                          <p className="text-xs text-gray-400" dir="ltr">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${u.role === "رئيس حسابات" ? "bg-purple-50 text-purple-700" : u.role === "محاسب" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">{u.branches}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">{u.modules}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${u.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                        {u.status === "active" ? "🟢 نشط" : "⭕ معطل"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><Edit size={14} /></button>
                        <button className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"><ToggleLeft size={14} /></button>
                        <button className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "subscriptions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">إدارة اشتراكات المطاعم (25 مطعم)</h3>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700">
                <Plus size={14} /> إضافة مطعم جديد
              </button>
            </div>
            <div className="space-y-3">
              {restaurants.map((r) => {
                const status = statusConfig[r.status];
                return (
                  <div key={r.id} className={`bg-white rounded-xl border shadow-sm p-5 ${r.status === "frozen" ? "border-red-200" : r.status === "warning" ? "border-amber-200" : "border-gray-100"}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-2xl">🏪</div>
                        <div>
                          <h4 className="font-bold text-gray-800">{r.name}</h4>
                          <p className="text-gray-500 text-sm mt-0.5">{r.branches} فرع نشط</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${planColors[r.plan]}`}>📦 {r.plan}</span>
                            <span className="text-xs text-gray-500">{r.price}</span>
                            <div className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${status.dot}`}></div>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-left">
                        {r.expiryDays > 0 ? (
                          <div className={`text-center px-4 py-2 rounded-xl ${r.expiryDays < 30 ? "bg-amber-50" : "bg-gray-50"}`}>
                            <p className={`text-xs ${r.expiryDays < 30 ? "text-amber-600" : "text-gray-400"}`}>ينتهي خلال</p>
                            <p className={`font-bold text-xl ${r.expiryDays < 30 ? "text-amber-700" : "text-gray-700"}`}>{r.expiryDays} يوم</p>
                          </div>
                        ) : (
                          <div className="text-center px-4 py-2 rounded-xl bg-red-50">
                            <p className="text-xs text-red-500">منتهي منذ</p>
                            <p className="font-bold text-xl text-red-700">{Math.abs(r.expiryDays)} أيام</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                      <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">⚙️ إعدادات</button>
                      <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">💳 الفواتير</button>
                      <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">📊 التقارير</button>
                      {r.status === "warning" && (
                        <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 font-medium">🔄 تجديد الاشتراك</button>
                      )}
                      {r.status === "frozen" && (
                        <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium">▶ إعادة التفعيل</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
