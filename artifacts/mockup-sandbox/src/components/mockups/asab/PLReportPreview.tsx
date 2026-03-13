import "./_group.css";
import { AppLayout } from "./_shared/AppLayout";
import { ArrowRight, Download, Send, Eye, Upload, CheckCircle2, TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";

const plData = {
  period: "أكتوبر 2025",
  restaurant: "مطعم البيك",
  branches: 50,
  revenue: {
    label: "الإيرادات",
    items: [
      { name: "مبيعات نقدية", amount: 1_450_000 },
      { name: "مبيعات بنكية", amount: 3_200_000 },
      { name: "هنقرستيشن", amount: 780_000 },
      { name: "جاهز", amount: 420_000 },
      { name: "تو يو", amount: 310_000 },
      { name: "نينجا", amount: 240_000 },
    ],
  },
  expenses: {
    label: "المصروفات التشغيلية",
    items: [
      { name: "رواتب وأجور", amount: 980_000 },
      { name: "إيجارات", amount: 650_000 },
      { name: "مواد خام ومشتريات", amount: 1_820_000 },
      { name: "كهرباء وماء", amount: 120_000 },
      { name: "صيانة", amount: 85_000 },
      { name: "مصروفات إدارية متنوعة", amount: 145_000 },
    ],
  },
};

const totalRevenue = plData.revenue.items.reduce((s, i) => s + i.amount, 0);
const totalExpenses = plData.expenses.items.reduce((s, i) => s + i.amount, 0);
const grossProfit = totalRevenue - totalExpenses;
const profitMargin = ((grossProfit / totalRevenue) * 100).toFixed(1);

function fmt(n: number) {
  return n.toLocaleString("ar-SA") + " ر.س";
}
function pct(n: number, total: number) {
  return ((n / total) * 100).toFixed(1) + "%";
}

export function PLReportPreview() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(2);
  const [sent, setSent] = useState(false);

  const steps = [
    { id: 1, label: "تصدير من ERP", icon: "🔗", done: true },
    { id: 2, label: "رفع Excel", icon: "📤", done: step > 2 },
    { id: 3, label: "مراجعة التقرير", icon: "👁", done: step > 3 },
    { id: 4, label: "إرسال لأصحاب المطاعم", icon: "📧", done: sent },
  ];

  return (
    <AppLayout role="admin" userName="الأدمن" activeSection="reports" notificationsCount={5}>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <span className="text-purple-600 cursor-pointer hover:underline">الرئيسية</span>
            <ArrowRight size={12} className="rotate-180" />
            <span className="text-gray-700 font-semibold">مدير التقارير</span>
          </div>
          <h2 className="font-bold text-gray-800 text-xl">📊 مدير التقارير</h2>
          <p className="text-gray-400 text-sm">استيراد تقارير ERP ومراجعتها وإرسالها لأصحاب المطاعم</p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold cursor-pointer transition-all ${step === s.id ? "bg-purple-600 text-white shadow-lg shadow-purple-200" : s.done ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}
                    onClick={() => setStep(s.id as 1 | 2 | 3 | 4)}
                  >
                    {s.done ? "✓" : s.icon}
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${step === s.id ? "text-purple-700" : s.done ? "text-emerald-600" : "text-gray-400"}`}>
                    {s.id}. {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 ${s.done ? "bg-emerald-400" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 2 — Upload */}
        {step === 2 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-gray-800">📤 رفع ملف Excel من نظام ERP</h3>
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center gap-3 hover:border-purple-300 hover:bg-purple-50/30 transition-all cursor-pointer">
              <span className="text-5xl">📊</span>
              <p className="font-semibold text-gray-700">اسحب وأفلت ملف Excel هنا</p>
              <p className="text-gray-400 text-sm">أو اضغط للاختيار · صيغ مقبولة: .xlsx, .xls, .csv</p>
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700"
              >
                <Upload size={14} /> اختيار الملف
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">📎 الملف الأخير المرفوع: <span className="font-medium text-gray-700">تقرير_اكتوبر_2025.xlsx</span> · <span className="text-emerald-600">✓ تم التحقق</span></p>
            </div>
          </div>
        )}

        {/* Step 3 — P&L Report Preview */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800">قائمة الدخل — عرض للقراءة فقط</h3>
                <p className="text-gray-400 text-sm">{plData.restaurant} · {plData.period} · {plData.branches} فرع</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-1.5 rounded-lg font-medium">
                  👁 للقراءة فقط — لا يمكن التعديل
                </span>
                <button className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                  <Download size={13} /> تنزيل PDF
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex items-center gap-2 text-sm px-5 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700"
                >
                  <Send size={13} /> إرسال للمطاعم
                </button>
              </div>
            </div>

            {/* P&L Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Revenue */}
              <div className="bg-emerald-50 px-5 py-3 border-b border-emerald-100">
                <h4 className="font-bold text-emerald-800">الإيرادات</h4>
              </div>
              <table className="w-full" dir="rtl">
                <thead className="bg-gray-50">
                  <tr className="text-xs text-gray-500 font-semibold">
                    <th className="px-5 py-3 text-right">البند</th>
                    <th className="px-5 py-3 text-center">المبلغ</th>
                    <th className="px-5 py-3 text-center">النسبة من الإيرادات</th>
                    <th className="px-5 py-3 text-center">مؤشر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {plData.revenue.items.map((item) => (
                    <tr key={item.name} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm font-medium text-gray-800">{item.name}</td>
                      <td className="px-5 py-3 text-center font-mono font-semibold text-emerald-700" dir="ltr">{fmt(item.amount)}</td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: pct(item.amount, totalRevenue) }} />
                          </div>
                          <span className="text-xs text-gray-500">{pct(item.amount, totalRevenue)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center"><TrendingUp size={14} className="text-emerald-500 mx-auto" /></td>
                    </tr>
                  ))}
                  <tr className="bg-emerald-50 font-bold border-t-2 border-emerald-200">
                    <td className="px-5 py-3.5 text-emerald-800">إجمالي الإيرادات</td>
                    <td className="px-5 py-3.5 text-center font-mono text-emerald-700 text-lg" dir="ltr">{fmt(totalRevenue)}</td>
                    <td className="px-5 py-3.5 text-center text-emerald-600">100%</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>

              {/* Expenses */}
              <div className="bg-red-50 px-5 py-3 border-b border-red-100 border-t-2 border-t-gray-200">
                <h4 className="font-bold text-red-800">المصروفات التشغيلية</h4>
              </div>
              <table className="w-full" dir="rtl">
                <tbody className="divide-y divide-gray-100">
                  {plData.expenses.items.map((item) => (
                    <tr key={item.name} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm font-medium text-gray-800 w-2/5">{item.name}</td>
                      <td className="px-5 py-3 text-center font-mono font-semibold text-red-600" dir="ltr">{fmt(item.amount)}</td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-400 rounded-full" style={{ width: pct(item.amount, totalRevenue) }} />
                          </div>
                          <span className="text-xs text-gray-500">{pct(item.amount, totalRevenue)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center"><TrendingDown size={14} className="text-red-400 mx-auto" /></td>
                    </tr>
                  ))}
                  <tr className="bg-red-50 font-bold border-t-2 border-red-200">
                    <td className="px-5 py-3.5 text-red-800">إجمالي المصروفات</td>
                    <td className="px-5 py-3.5 text-center font-mono text-red-700 text-lg" dir="ltr">{fmt(totalExpenses)}</td>
                    <td className="px-5 py-3.5 text-center text-red-600">{pct(totalExpenses, totalRevenue)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>

              {/* Net Profit */}
              <div className={`px-5 py-5 border-t-4 ${grossProfit > 0 ? "bg-emerald-50 border-emerald-400" : "bg-red-50 border-red-400"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-bold text-xl ${grossProfit > 0 ? "text-emerald-800" : "text-red-800"}`}>
                      صافي الربح / الخسارة
                    </p>
                    <p className={`text-sm mt-0.5 ${grossProfit > 0 ? "text-emerald-600" : "text-red-600"}`}>
                      هامش الربح: {profitMargin}%
                    </p>
                  </div>
                  <p className={`font-bold text-3xl font-mono ${grossProfit > 0 ? "text-emerald-700" : "text-red-700"}`} dir="ltr">
                    {grossProfit > 0 ? "+" : ""}{fmt(grossProfit)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4 — Send */}
        {step === 4 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h3 className="font-bold text-gray-800">📧 إرسال التقارير لأصحاب المطاعم</h3>
            {sent ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 flex flex-col items-center gap-3">
                <CheckCircle2 size={48} className="text-emerald-500" />
                <h4 className="font-bold text-emerald-800 text-xl">تم الإرسال بنجاح!</h4>
                <p className="text-emerald-600 text-sm">تم إرسال 25 تقرير إلى جميع أصحاب المطاعم عبر البريد الإلكتروني والإشعارات</p>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-blue-700 text-sm font-medium">📊 سيتم إرسال تقارير أكتوبر 2025 لـ 25 صاحب مطعم</p>
                  <p className="text-blue-600 text-xs mt-1">بريد إلكتروني + إشعار في التطبيق + ملف PDF مرفق</p>
                </div>
                <div className="space-y-2.5">
                  {["مطعم البيك — ahmed.albaik@gmail.com", "مطعم هرفي — herfy@herfy.com.sa", "مطعم كودو — info@kudu.com.sa", "مطعم ماكدونالدز السعودية — mcds@mcds.sa", "مطعم بروستد الوطني — bwn@bwn.sa"].map((r, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <input type="checkbox" className="rounded" defaultChecked />
                      <span className="text-sm text-gray-700 flex-1">{r}</span>
                      <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">جاهز</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <input type="radio" name="format" id="pdf" defaultChecked />
                    <label htmlFor="pdf" className="text-sm text-gray-600">PDF</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="format" id="excel" />
                    <label htmlFor="excel" className="text-sm text-gray-600">Excel</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="format" id="both" />
                    <label htmlFor="both" className="text-sm text-gray-600">كلاهما</label>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSent(true)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700"
                  >
                    <Send size={16} /> إرسال جماعي للجميع
                  </button>
                  <button className="flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">
                    إرسال للمحدد فقط
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
