import "./_group.css";
import { AppLayout } from "./_shared/AppLayout";
import { useState } from "react";
import { ArrowRight, Paperclip, CheckCircle2, XCircle, MessageSquare, ChevronDown, AlertTriangle, Download, Eye } from "lucide-react";

const channels = [
  { name: "نقدي", icon: "💵", entered: 4200, expected: 4200, diff: 0 },
  { name: "بنكي (بنك الرياض)", icon: "🏦", entered: 8500, expected: 8500, diff: 0 },
  { name: "هنقرستيشن", icon: "🟠", entered: 2800, expected: 2800, diff: 0 },
  { name: "جاهز", icon: "🟡", entered: 1200, expected: 1350, diff: -150 },
  { name: "تو يو (ToYou)", icon: "🔵", entered: 980, expected: 980, diff: 0 },
  { name: "نينجا (Ninja)", icon: "⚫", entered: 660, expected: 660, diff: 0 },
];

const totalEntered = channels.reduce((s, c) => s + c.entered, 0);
const totalExpected = channels.reduce((s, c) => s + c.expected, 0);
const totalDiff = totalEntered - totalExpected;

export function SalesOperationDetail() {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approved, setApproved] = useState(false);

  return (
    <AppLayout role="accountant" userName="أحمد محمد" activeSection="sales" notificationsCount={12}>
      <div className="space-y-5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button className="text-purple-600 hover:underline">الرئيسية</button>
          <ArrowRight size={14} className="text-gray-300 rotate-180" />
          <button className="text-purple-600 hover:underline">المبيعات</button>
          <ArrowRight size={14} className="text-gray-300 rotate-180" />
          <span className="text-gray-700 font-semibold">OPS-2401</span>
        </div>

        {/* Header Card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">💰</span>
                <div>
                  <h2 className="font-bold text-gray-800 text-xl">تقرير المبيعات اليومي</h2>
                  <p className="text-gray-500 text-sm mt-0.5">فرع الرياض - العليا · 14 أكتوبر 2025 · نهاية الشفت</p>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">OPS-2401</span>
                <span className="text-xs bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-medium">⏳ ينتظر موافقتك</span>
                <span className="text-xs bg-gray-50 text-gray-500 px-3 py-1 rounded-full">مدير الفرع: أحمد الشمري</span>
                <span className="text-xs bg-gray-50 text-gray-500 px-3 py-1 rounded-full">📱 أُرسل من التطبيق - قبل ساعة</span>
              </div>
            </div>
            {approved ? (
              <div className="bg-emerald-50 rounded-xl px-5 py-3 text-center">
                <CheckCircle2 size={28} className="text-emerald-500 mx-auto" />
                <p className="text-emerald-700 font-bold mt-1">تمت الموافقة</p>
                <p className="text-emerald-500 text-xs">بانتظار رئيس الحسابات</p>
              </div>
            ) : (
              <div className="bg-purple-50 rounded-xl px-5 py-3 text-center">
                <p className="text-gray-500 text-xs">إجمالي المبيعات</p>
                <p className="font-bold text-purple-700 text-2xl font-mono mt-0.5" dir="ltr">{totalEntered.toLocaleString()} ر.س</p>
                {totalDiff !== 0 && (
                  <p className="text-red-500 text-xs mt-0.5 font-medium">⚠ فرق: {Math.abs(totalDiff)} ر.س</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">
          {/* Reconciliation Table */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">جدول المقارنة والتسوية</h3>
              <span className="text-xs text-gray-400">6 قنوات تحصيل</span>
            </div>
            <table className="w-full" dir="rtl">
              <thead className="bg-gray-50">
                <tr className="text-xs text-gray-500 font-semibold">
                  <th className="px-5 py-3 text-right">قناة التحصيل</th>
                  <th className="px-5 py-3 text-center">المبلغ المُدخل</th>
                  <th className="px-5 py-3 text-center">المبلغ المتوقع</th>
                  <th className="px-5 py-3 text-center">الفرق</th>
                  <th className="px-5 py-3 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {channels.map((ch) => (
                  <tr key={ch.name} className={`hover:bg-gray-50 ${ch.diff !== 0 ? "bg-red-50/60" : ""}`}>
                    <td className="px-5 py-3.5 font-medium text-gray-800 flex items-center gap-2 text-sm">
                      <span>{ch.icon}</span> {ch.name}
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono font-semibold text-gray-800" dir="ltr">
                      {ch.entered.toLocaleString()} ر.س
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono text-gray-600" dir="ltr">
                      {ch.expected.toLocaleString()} ر.س
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {ch.diff === 0 ? (
                        <span className="text-emerald-600 font-mono text-sm">—</span>
                      ) : (
                        <span className="text-red-600 font-bold font-mono text-sm" dir="ltr">{ch.diff} ر.س</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {ch.diff === 0 ? (
                        <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-semibold">✓ متطابق</span>
                      ) : (
                        <span className="bg-red-50 text-red-700 text-xs px-2.5 py-1 rounded-full font-semibold">⚠ فرق</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr className="font-bold">
                  <td className="px-5 py-3.5 text-gray-700">المجموع الكلي</td>
                  <td className="px-5 py-3.5 text-center font-mono text-purple-700" dir="ltr">{totalEntered.toLocaleString()} ر.س</td>
                  <td className="px-5 py-3.5 text-center font-mono text-gray-600" dir="ltr">{totalExpected.toLocaleString()} ر.س</td>
                  <td className="px-5 py-3.5 text-center font-mono text-red-600" dir="ltr">
                    {totalDiff !== 0 ? `${totalDiff} ر.س` : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {totalDiff === 0 ? (
                      <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-semibold">✓ مطابق</span>
                    ) : (
                      <span className="bg-red-50 text-red-700 text-xs px-2.5 py-1 rounded-full font-semibold">⚠ فرق {Math.abs(totalDiff)} ر.س</span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>

            {totalDiff !== 0 && (
              <div className="mx-5 mb-5 mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-amber-800 font-semibold text-sm">يوجد فرق في قناة جاهز</p>
                    <p className="text-amber-700 text-xs mt-0.5">الفرق: 150 ر.س — يُخصم من حساب المسؤول: محمد العبدلي (مدير الشفت)</p>
                    <p className="text-amber-600 text-xs mt-1">يجب إدخال سبب الفرق أو مراجعة مع مدير الفرع قبل الموافقة.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Actions */}
            {!approved && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
                <h3 className="font-bold text-gray-800 text-sm">الإجراءات</h3>
                <button
                  onClick={() => setApproved(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors"
                >
                  <CheckCircle2 size={16} /> موافقة — إرسال لرئيس الحسابات
                </button>
                <button
                  onClick={() => setRejectOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-700 font-semibold text-sm hover:bg-red-100 border border-red-200"
                >
                  <XCircle size={16} /> رفض — إعادة لمدير الفرع
                </button>
                <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-semibold text-sm hover:bg-blue-100 border border-blue-200">
                  <MessageSquare size={16} /> طلب توضيح
                </button>
              </div>
            )}

            {/* Attachments */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h3 className="font-bold text-gray-800 text-sm mb-3">المرفقات (3)</h3>
              <div className="space-y-2">
                {[
                  { name: "تقرير POS الرئيسي.pdf", type: "PDF", size: "245 KB" },
                  { name: "كشف بنك الرياض.pdf", type: "PDF", size: "182 KB" },
                  { name: "تقرير هنقرستيشن.xlsx", type: "Excel", size: "98 KB" },
                ].map((att, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${att.type === "PDF" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{att.type}</span>
                      <div>
                        <p className="text-xs font-medium text-gray-700">{att.name}</p>
                        <p className="text-[10px] text-gray-400">{att.size}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-gray-200"><Eye size={12} className="text-gray-500" /></button>
                      <button className="p-1.5 rounded-lg hover:bg-gray-200"><Download size={12} className="text-gray-500" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Log */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h3 className="font-bold text-gray-800 text-sm mb-3">سجل النشاط</h3>
              <div className="space-y-3">
                {[
                  { action: "تم إرسال التقرير", by: "أحمد الشمري (مدير الفرع)", time: "9:15 ص", icon: "📱", color: "bg-blue-50 text-blue-600" },
                  { action: "تم الاستلام", by: "النظام", time: "9:15 ص", icon: "✅", color: "bg-gray-50 text-gray-500" },
                  { action: "قيد المراجعة", by: "أحمد محمد (محاسب)", time: "10:22 ص", icon: "👁", color: "bg-purple-50 text-purple-600" },
                ].map((log, i) => (
                  <div key={i} className="flex gap-3">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${log.color}`}>{log.icon}</span>
                    <div>
                      <p className="text-xs font-medium text-gray-700">{log.action}</p>
                      <p className="text-[10px] text-gray-400">{log.by} · {log.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h3 className="font-bold text-gray-800 text-sm mb-2">ملاحظات المحاسب</h3>
              <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 resize-none" rows={3} placeholder="أضف ملاحظة..." />
              <button className="w-full mt-2 py-2 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200">
                حفظ الملاحظة
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-[480px] p-6" dir="rtl">
            <h3 className="font-bold text-gray-800 text-lg mb-1">رفض العملية OPS-2401</h3>
            <p className="text-gray-500 text-sm mb-4">ستُعاد العملية إلى مدير الفرع مع سبب الرفض.</p>
            <div className="mb-4">
              <label className="text-sm font-semibold text-gray-700 block mb-2">سبب الرفض <span className="text-red-500">*</span></label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 mb-3">
                <option>اختر السبب...</option>
                <option>بيانات غير مكتملة</option>
                <option>فاتورة مفقودة أو غير واضحة</option>
                <option>تناقض في المبالغ</option>
                <option>تقرير POS مفقود</option>
                <option>كشف البنك غير مرفق</option>
                <option>أخرى</option>
              </select>
              <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 resize-none" rows={3} placeholder="تفاصيل إضافية..." />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRejectOpen(false)} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">
                ✕ تأكيد الرفض وإعادة للفرع
              </button>
              <button onClick={() => setRejectOpen(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
