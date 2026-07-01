# المحاسب (Accountant) — الداشبورد الرئيسي · تحليل كامل كمبونينت-كمبونينت

> النطاق: دور **`accountant`** (المحاسب) في `ASABPrototype.tsx`.
> التصنيف: ✅ **شغّال** (مربوط بالـ API ويعرض/يرسل فعلاً) · ⚠️ **جزئي** (مربوط بس ناقص/فلترة محلية) · 🟥 **استاتيك/موك** (ثابت في الكود) · ❌ **ميت** (زرار بدون action أو محلي بالكامل رغم وجود endpoint).
> الحساب المرجعي: `accountant@asab.sa`.

---

## 0) ملخص تنفيذي — الأنماط الكبيرة (الأهم)

**النمط العام:** **القراءة تشتغل، الكتابة محلية.** كل صفحة بتنده GET وتحطّ النتيجة في `useState` محلي وتعرض منه — لكن **كل الأزرار/الأكشنز (تأكيد، إرسال، موافقة/رفض، حفظ، تحويل، تسوية...) بتعدّل الـ state المحلي بس**، والـ mutation hooks الحقيقية **موجودة في `platform/accountant.ts` بس مش متوصّلة**.

**3 مشاكل معمارية متكررة:**

1. **🐞 Type-mismatch (الأخطر):** `useAccountantOperationsPlatform` بيرجّع **`Operation[]` (array)**، لكن صفحات **المصروفات / تفاصيل المبيعات / المشتريات / المخزون** بتقرأ منه **خصائص object** (`.invoices` / `.reconciliation` / `.dayOptions` / `.purchases` / `.records` / `.branches` / `.employees`). دي دايماً `undefined` → **الـ fallbacks الاستاتيك هي اللي بتظهر دايماً** ونتيجة الـ query بتترمي. يعني الـ query بتضرب السيرفر وترمي الرد.

2. **الكتابة كلها local-only:** ~30 hook mutation جاهز (approve waste, close shift, settlement, convert-to-asset, flag inventory, reconciliation, reminders send/respond, rule CRUD...) **مش متنادي ولا واحد منهم** — الأكشن بيزوّر النجاح (كتير بـ `setTimeout`).

3. **الفلاتر محلية:** كل هوكس القراءة بتقبل `filter` params بس بتتنادى **بدون arguments**، فكل فلاتر/بحث بتشتغل client-side على الصفحة المحمّلة بس (مقبول)، لكن فلاتر «العلامة التجارية» غالباً `["الكل"]` ثابتة وميتة.

**اللي شغّال فعلاً ✅:**
- `ops` (المصدر المشترك) من `GET /accountant/operations` → عليه بتشتغل: قوائم العمليات، KPIs الأساسية، **approve/reject/bulk-approve** (mutations حقيقية على `/operations/*`).
- **قراءات حقيقية بتعبّي state محلي:** الشفتات (live/history)، الموظفين، العهدة النقدية، الأصول، الهدر، التذكيرات، كتالوج المخزون.
- **تصديرات Excel + تحميل التمبلت** (blob downloads).

**⚠️ عدم اتساق في الـ endpoints:** القراءات على `/accountant/*` بينما تصديرات كتير على `/company/me/*`.

### 🔴 مخاطر كراش (لازم guards)
| المكان | السطر | السبب |
|---|---|---|
| `AccInventoryItems` | ~5334 / 5417 | `BRAND_BRANCHES[brands[0]][0]` — لو الكتالوج رجع فاضي `brands[0]=undefined` → **كراش عند أول render** |
| `AccCash` | ~6270 / 6323 | `b.used/b.amount` (NaN لو amount=0) و`b.txns.map` من غير fallback |
| `AccShifts` | ~5786 | `sh.name[0]` لو `name` undefined |
| `AccEmployees` | ~6143 | `e.name[0]` لو `name` undefined |
| `AccWaste` | ~7552/7565 | `entry.products.reduce/.map/.length` لو الصف من غير `products` |
| `PurItemsTable` | ~4378/4423 | `items.map/.reduce` لو الـ caller بعت `undefined` |

### حالة الهوكس (accountant) — نظرة سريعة
| الهوك | Endpoint | مُستخدَم؟ |
|---|---|---|
| `useAccountantOperationsPlatform` | `GET /accountant/operations` | ✅ (مصدر `ops`) — لكن في 4 صفحات بيتقري غلط (object vs array) |
| `useAccountantDashboardPlatform` | `GET /accountant/dashboard` | ⚠️ 3 حقول بس |
| `useApprove/Reject/BulkApprove/Operation` | `POST /operations/{id}/approve\|reject`, `/operations/bulk-approve` | ✅ |
| `useExportOperations` | `GET /company/me/operations/export` | ✅ |
| `usePatchAccountantOperationReconciliation` | `PATCH /accountant/operations/{id}/reconciliation` | ❌ مش متنادي |
| `useConvertExpenseToAsset` | `POST /accountant/expense-invoices/{id}/convert-to-asset` | ❌ مش متنادي |
| `usePlatformAssets` / `useExportAssets` | `GET /accountant/assets` / export | ✅ (قراءة/تصدير) |
| `useCreatePlatformAsset` / `useConfirmPlatformAsset` / `useConfirmPlatformAssetDraft` / `useDeletePlatformAssetDraft` / `usePlatformAssetDrafts` | `POST /accountant/assets`, `.../confirm`, drafts | ❌ كلها مش متنادية |
| `useImportAssets` | `POST /company/me/assets/import` | ❌ مش متنادي (الاستيراد موك) |
| `usePlatformInventory` / `usePlatformInventoryCatalog` | `GET /accountant/inventory` / `/inventory/catalog` | ⚠️ inventory بيتقري غلط؛ catalog مُستخدَم |
| `useFlagPlatformInventoryBranch` / `useFlagPlatformInventoryItems` / `useSendInventoryConfirmation` / `useSavePlatformInventoryCatalog` / `useSavePlatformDailyInventoryList` | inventory writes | ❌ كلها مش متنادية |
| `usePlatformWaste` / `useExportWaste` | `GET /accountant/waste` / export | ✅ (قراءة/تصدير) |
| `useApprovePlatformWaste` / `useRejectPlatformWaste` / `useBulkApprovePlatformWaste` / `usePatchPlatformWasteProduct` / `usePutPlatformWasteAllocations` | waste writes | ❌ كلها مش متنادية |
| `usePlatformLiveShifts` / `usePlatformHistoryShifts` | `GET /accountant/shifts/live\|history` | ✅ |
| `useClosePlatformShift` | `POST /accountant/shifts/{id}/close` | ❌ مش متنادي |
| `usePlatformEmployees` / `useExportPayroll` | `GET /accountant/employees` / export | ✅ |
| `usePlatformEmployeeStatement` | `GET /accountant/employees/{id}/statement` | ❌ مش متنادي (بيستخدم `emp.movements` المضمّنة) |
| `useCreatePlatformEmployeeMovement` | `POST .../movements` | ❌ مش متنادي |
| `usePlatformCashCustody` / `useExportCash` | `GET /accountant/cash-custody` / export | ✅ |
| `usePlatformCashTransactions` | `GET /accountant/cash-custody/{id}/transactions` | ❌ مش متنادي (بيستخدم `b.txns` المضمّنة) |
| `useRequestCashSettlement` / `useCreateCashTransaction` | cash writes | ❌ مش متنادية |
| `usePlatformReminders` / `useExportAccReminders` | `GET /reminders` / export | ✅ (قراءة/تصدير) |
| `useSendReminder` / `useBulkSendReminders` / `useRespondToReminder` / `useCreateReminder` | reminder writes | ❌ كلها مش متنادية |
| `usePlatformReminderRules` / `useCreateReminderRule` / `usePatchReminderRule` / `useDeleteReminderRule` / `useToggleReminderRule` | rules CRUD | ❌ كلها مش متنادية (القواعد استاتيك) |

---

## 1) `acc-dashboard` → `AccDashboard`

| العنصر | النوع | السلوك | الحالة | Endpoint |
|---|---|---|---|---|
| `useAccountantDashboardPlatform` → `dashData` | API | مُستخدَم جزئياً (approvalRate, completedBranches, totalBranches بس) | ⚠️ | `GET /accountant/dashboard` |
| عنوان "الاثنين 14 أكتوبر 2025" + "الفروع المخصصة 1–50" | نص | ثابت | 🟥 | — |
| toggle الفترة (اليوم/الأسبوع/الشهر) | زر | `setPeriod` بس — **مفيش refetch بالفترة** | ❌ | — |
| KPI تنتظر مراجعتي / وافقت / معتمدة نهائياً | data | من `ops` | ✅ | `GET /accountant/operations` |
| KPI معدل الموافقة | data | `dashData` مع fallback محلي | ⚠️ | `/accountant/dashboard` |
| "الفروع المكتملة" done/total | data | `dashData ?? 4/8` ثابت | ⚠️ | `/accountant/dashboard` |
| شبكة الموديولات التسعة | data | labels/icons **ثابتة**، العدادات من `ops`؛ waste/assets `key:null` → 0 | ⚠️ | `ops` |
| فلاتر الفرع/الحالة | select | `BRANCHES` ثابت + فلترة محلية | 🟥/⚠️ | — |
| Bulk Approve | زر | `bulkApprove` | ✅ | `POST /operations/bulk-approve` |
| صف عملية: عرض/موافقة/رفض | أزرار | approve حقيقي؛ reject يفتح مودال | ✅/⚠️ | `/operations/{id}/approve\|reject` |

## 2) `acc-{module}` → `AccModulePage`
- `useAccountantOperationsPlatform({moduleKey})` **بتتنادى ونتيجتها بتترمي** (warm-up)؛ العرض من `ops`. KPIs + bulk + approve/reject شغّالين. `FilterBar branches={BRANCHES}` **ثابت**. reject يفتح مودال.

## 3) `acc-sales` → `AccSalesPage`
| العنصر | الحالة | ملاحظة |
|---|---|---|
| صفوف العمليات (من `ops`) + KPIs + bulk + approve/reject | ✅/⚠️ | reject مودال |
| تصدير Excel | ✅ | `GET /company/me/operations/export` |
| فلتر الفرع/الحالة | 🟥 | `BRANCHES` + arrays ثابتة |
| **فلتر البراند + فلتر التاريخ** | ❌ | `brand`/`selectedDay` **مش متمرّرين لـ `applyFilters`** → اختيارهم مبيعملش حاجة |
| كارت ملخص اليوم (ops/done/missing) | 🟥 | أرقام fallback موك ثابتة |

## 4) `AssetDraftProvider` + `ConvertToAssetModal` (مودال المصروفات)
- **موك بالكامل** — context محلي، مفيش أي API رغم وجود `useConvertExpenseToAsset`/`useCreatePlatformAsset`/confirm/discard/drafts.
- زر **Confirm Convert** بيعمل `DRAFT-…-Date.now()` محلي + `setTimeout(1.5s)` يزوّر النجاح.
- **`ALL_BRANCHES_FULL = []`** → شبكة اختيار الفروع (خطوة 2) فاضية/معطّلة.
- الفئات `ASSET_CATS` والأعمار `USEFUL_LIFE_OPTS` ثابتة.

## 5) `acc-expenses` → `AccExpensesPage`
| العنصر | الحالة | ملاحظة |
|---|---|---|
| KPIs + صفوف (من `ops`) + Approve All + approve/reject + تصدير Excel | ✅ | — |
| `expensesApi` (`.dayOptions/.invoices/.attachLabels`) | ⚠️/🟥 | **type-mismatch** → دايماً fallback ثابت |
| جدول الفواتير الفرعي `FALLBACK_INVOICES` | 🟥 | كل الأرقام/الموردين موك |
| "View Assets →" | ❌ | `alert()` بس |
| inputs وضع التعديل (فاتورة/ضريبة) | ❌ | uncontrolled، مش متبطة |
| "Save Changes" (تعديل) | ❌ | **مفيش onClick** |
| verify toggle للفاتورة | ⚠️ | محلي، مش متخزّن |
| تحويل لأصل ثابت | ⚠️ | يفتح `ConvertToAssetModal` (موك) |
| مودال المرفقات: View Full File / Download | ❌ | مفيش onClick |

## 6) `acc-sales-detail` → `AccSalesDetail`
| العنصر | الحالة | ملاحظة |
|---|---|---|
| `detailApi` (`.reconEmployees/.reconciliation/.dayOptions`) | ⚠️/🟥 | **type-mismatch** → recon دايماً 0/فاضي |
| رأس العملية/الحالة/المبلغ + PipelineBar + Audit trail | ✅ | من `ops` |
| التاريخ/مدير الفرع/"أُرسل قبل ساعة" | 🟥 | نصوص ثابتة |
| قيم Cash/Bank/Delivery recon | 🟥 | دايماً 0 (mismatch) |
| "Edit Figures / Save Changes" | ❌ | محلي رغم وجود `usePatchAccountantOperationReconciliation` |
| صفوف موظفي الفرق (اسم auto-fill) | ❌ | lookup فاضي؛ التعيين مش متبعت |
| "Confirm Assignment" / "Request Clarification" / "Save Note" | ❌ | **مفيش onClick** |
| "Create Linked Correction" | ❌ | `addCorrectiveOp` محلي بس (مش متخزّن) |
| Approve — Send to Head / Reject | ✅ | mutations حقيقية |
| المرفقات (3) + عرض/تحميل | 🟥/❌ | array ثابت + أزرار ميتة |

## 7) `PurItemsTable` (مكوّن عرض)
- عرض بحت من `items` prop؛ مفيش هوك. **الـ seeds `PUR_RECORDS=[]`/`PURCHASE_DETAIL` فاضية**. خطر كراش لو `items=undefined`. verify checkbox = callback للـ parent (محلي).

## 8) `acc-purchases` → `AccPurchases`
| العنصر | الحالة | ملاحظة |
|---|---|---|
| مصدر البيانات | ⚠️→🟥 | **type-mismatch** (`.purchases/.records`) → **دايماً `PUR_RECORDS` ثابت**. `ops` مش مستخدم هنا خالص |
| كل الـ KPIs | 🟥 | من static |
| "موافقة جماعية" | ❌ | `approvedIds` محلي بس (مش `bulkApprove`) |
| فلاتر (مورد/فرع/حالة/بحث) | ✅ | client-side على static |
| فلتر البراند | 🟥 | `["الكل"]` |
| تصدير Excel | ✅ | `GET /company/me/operations/export` |
| Approve Invoice / verify | ❌ | `approvedIds`/`verifiedRows` محلي |
| **Reject** | ❌ | **مفيش onClick أصلاً** |
| Save Changes (تعديل) | ❌ | edits تتحذف |
| Request Price Adjustment | 🟥 | `alert()` |
| مرفقات: View/Download/Verified | ❌ | ميتة |

## 9) `acc-inventory` → `AccInventory`
| العنصر | الحالة | ملاحظة |
|---|---|---|
| بيانات الفروع `EFFECTIVE_INV_BRANCH_DATA` | ⚠️→🟥 | **type-mismatch** (`.branches/.byBranch`) → **دايماً `{}` فاضي** (كل فرع 0 أصناف) |
| `INV_EMP` أسماء الموظفين | 🟥 | fallback ثابت |
| KPIs المشتقة من `ops` (المرفوعة/قيد المراجعة/فروع مكتملة) | ✅ | `ops` |
| KPI تنبيهات الشذوذ | ⚠️ | منطق سليم بس داتا فاضية → 0 |
| بحث المطعم/البراند | 🟥 | input بدون value/onChange (ديكور) |
| Daily/Monthly toggle + توسيع + معادلة الجرد | ✅ | UI محلي |
| Excel (كل المطاعم / لكل فرع) | 🟥 | `alert()` |
| "تحديد أصناف الجرد" | ✅ | navigate |
| **flag branch / send confirm / record confirm / flag item** | ❌ | كلها Set محلي رغم وجود `useFlagPlatformInventoryBranch`/`useFlagPlatformInventoryItems`/`useSendInventoryConfirmation` |
| approve/reject op | ✅ | mutations حقيقية |
| أرقام التسوية اليومية (12400/DEFICIT=360...) | 🟥 | **مفبركة بالكامل** |
| "تأكيد التحميل" (فروق الموظفين) | ❌ | **مفيش onClick** |

## 10) `acc-inventory-items` → `AccInventoryItems`
| العنصر | الحالة | ملاحظة |
|---|---|---|
| `usePlatformInventory()` | ❌ | بتتنادى ونتيجتها **بتترمي** (مفيش destructure) |
| `BRAND_CATALOG` من `usePlatformInventoryCatalog` | ⚠️ | مُستخدَم بس fallback فاضي + **بدون shape guard** |
| `BRAND_BRANCHES` / `MONTHLY_DIFF` | 🟥 | خرائط ثابتة بالكامل |
| **🔴 كراش** | ❌ | `BRAND_BRANCHES[brands[0]][0]` (L5334/5417) يكراش لو الكتالوج فاضي |
| كل toggles الأصناف / تحديد الكل / إضافة الكل / remove | ❌ | `dailyLists` محلي، مش متخزّن |
| "حفظ وتحديث الفرع فوراً" | 🟥 | `setTimeout(800ms)` يزوّر الحفظ رغم وجود `useSavePlatformInventoryCatalog`/`useSavePlatformDailyInventoryList` |
| بانر "تم الحفظ والإرسال للمدير" | 🟥 | مضلّل — مفيش حاجة اتبعتت |

## 11) `acc-shifts` → `AccShifts` (+ `ShiftRowCmp` / `ShiftSmartPanel`)
| العنصر | الحالة | ملاحظة |
|---|---|---|
| `usePlatformLiveShifts` / `usePlatformHistoryShifts` | ✅ | `GET /accountant/shifts/live\|history` (مع guards) |
| KPIs (نشطة/متأخرة/متوسط/طلبات) | ✅ | live-derived |
| رأس "مباشر — آخر تحديث: الآن" | 🟥 | نص ثابت |
| كروت الشفتات الحية + سجل الشفتات | ✅ | live/history |
| "إغلاق الشفت" (لكل كارت) | ❌ | بيبدّل tab بس — مفيش id ولا mutation |
| SETUP: البراندات `BRANDS_CATALOG` + توليد الشفتات + حفظ الإعداد + override | 🟥/❌ | ثابت + محلي بالكامل |
| CLOSE: فرع (`BRANCHES` ثابت)، cash/sales inputs، حساب الفرق | 🟥/⚠️/✅ | حساب الفرق محلي سليم |
| **"تأكيد إغلاق الشفت"** | ❌ | `setTimeout` يزوّر النجاح رغم وجود `useClosePlatformShift` |
| `ShiftRowCmp` "حفظ" / `ShiftSmartPanel` "إعادة التوليد" | ❌ | محلي بالكامل |

## 12) `acc-employees` → `AccEmployees`
| العنصر | الحالة | ملاحظة |
|---|---|---|
| `usePlatformEmployees` → `employees` | ✅ | `GET /accountant/employees` (بدون filter args) |
| العنوان/العدد/القائمة | ✅ | live |
| فلتر رقم/اسم/فرع | ⚠️ | client-side (الهوك مش بياخد الفلتر) |
| فلتر العلامة التجارية | 🟥 | `["الكل"]` وقيمته مش متطبّقة |
| لوحة كشف الحساب (رصيد/حركات) | ⚠️ | من `emp.movements` المضمّنة؛ `usePlatformEmployeeStatement` **مش متنادي**؛ سنة "2025" ثابتة |
| Excel export | ✅ | `GET /company/me/employees/payroll/export` |
| طباعة | ✅ | `window.print()` |
| **PDF** | ❌ | **مفيش onClick** |
| تواصل | ⚠️ | يفتح مودال بس |

## 13) `acc-cash` → `AccCash`
| العنصر | الحالة | ملاحظة |
|---|---|---|
| `usePlatformCashCustody` → `branches` | ✅ | `GET /accountant/cash-custody` (guarded) |
| KPIs (عهود نشطة/طلبات معلقة/قريبة النفاد/تسويات متأخرة) + بانر | ✅ | live |
| بحث | ⚠️ | client-side |
| فلتر العلامة التجارية | ❌ | `["الكل"]` بدون onChange |
| فلتر حالة العهدة | ❌ | `statusFilter` متخزّن بس **مش متطبّق** |
| تصدير Excel | ✅ | `GET /company/me/cash-custody/export` |
| صفوف الفروع | ✅ | live (**🔴 `b.used/b.amount` NaN لو amount=0**) |
| **"طلب تسوية"** | ❌ | `setSettlementReqs` محلي رغم وجود `useRequestCashSettlement` |
| drill-down المعاملات | ⚠️ | من `b.txns` المضمّنة؛ `usePlatformCashTransactions` **مش متنادي** (**🔴 `b.txns.map` بدون fallback**) |

## 14) `ExcelImportModal` (مودال استيراد الأصول)
- **محاكاة كاملة:** الملف **مبيتقراش**؛ `rows` 8 صفوف ثابتة؛ `ALL_BRANCHES=[]` → محرّر الفرع ميت؛ "تأكيد الاستيراد" بيضيف للـ `assets` المحلي بس (مفيش `useImportAssets`). **الوحيد الشغّال:** "تحميل القالب" (`GET /admin/upload/templates/fixed-assets`).

## 15) `acc-assets` → `AccAssets`
| العنصر | الحالة | ملاحظة |
|---|---|---|
| `usePlatformAssets` → seed `assets` | ✅ | `GET /accountant/assets` |
| `usePlatformAssetDrafts` | ❌ | نتيجتها **بتترمي** (بيستخدم `AssetDraftContext`) |
| `useCreatePlatformAsset` | ❌ | مُعرّف بس **مش متنادي** |
| تصدير Excel | ✅ | `GET /company/me/assets/export` |
| بحث / فلتر البراند / فلتر الفئة (العلوي) | 🟥 | بدون binding — ميتة |
| فلاتر الحالة/الفئة/السنة (القائمة) | ⚠️/🟥 | client-side؛ فلتر السنة بخريطة `FA-00x→سنة` ثابتة |
| قسم المسودات (من context) | 🟥 | client بالكامل |
| مسودة discard / "تأكيد الإضافة" | ❌ | context محلي رغم وجود confirm/delete draft hooks |
| "تأكيد التسجيل" (pending) | ❌ | `setAssets` محلي رغم وجود `useConfirmPlatformAsset` |
| "إضافة أصل" → "حفظ وإرسال للفرع" | ❌ | `setAssets` + `setTimeout` مزيّف رغم وجود `useCreatePlatformAsset` |
| "نقل عهدة" → "تأكيد النقل" | ❌ | محلي (مفيش endpoint نقل أصلاً) |
| المرفقات (ملفين ثابتين) + عرض/إضافة مرفق | 🟥/❌ | موك + أزرار ميتة |

## 16) `acc-waste` → `AccWaste`
| العنصر | الحالة | ملاحظة |
|---|---|---|
| `usePlatformWaste` → seed `entries` | ✅ | `GET /accountant/waste` |
| تصدير Excel | ✅ | `GET /company/me/waste/export` |
| KPIs + chips الفروع | ⚠️ | من `entries` (client filter) |
| بحث / فلتر البراند | 🟥 | ديكور / `["الكل"]` |
| "موافقة على الكل" | ❌ | محلي رغم `useBulkApprovePlatformWaste` |
| approve/reject لكل صف | ❌ | `setEntries` محلي رغم `useApprove/RejectPlatformWaste` |
| toggle هدر/تالف + موظف/مطعم | ❌ | محلي رغم `usePatchPlatformWasteProduct` |
| تخصيص موظفين (empId→اسم) | 🟥 | خريطة `WASTE_EMP` **ثابتة**؛ **مفيش زر حفظ** رغم `usePutPlatformWasteAllocations` |
| صور المنتج | ❌ | مفيش onClick |
| مقارنة الهدر بين الفروع | 🟥 | مقام `brSales` **ثابت مفبرك** → النسبة بلا معنى |

## 17) `acc-reminders` → `AccReminders`
- `usePlatformReminders` → seed `reminders` ✅ (`GET /reminders` — مش accountant-scoped). تصدير Excel ✅.
- **كل الإرسال محلي:** "إرسال الكل"، "إرسال تذكير"/"إعادة"، ردود سريعة، مودال البث ("إرسال" بيقفل المودال بس) — رغم وجود `useSendReminder`/`useBulkSendReminders`/`useRespondToReminder`/`useCreateReminder`.
- فلتر البراند `["الكل"]` ميت. bug في تمييز البث (`target!=="all" && target!=="all"`).

## 18) `AutoReminderRules` (داخل التذكيرات)
- **استاتيك بالكامل:** `rules` seed ثابت (AR1–AR4)، مفيش `usePlatformReminderRules`. "حفظ" (إضافة قاعدة) و toggle التفعيل محليين رغم وجود `useCreateReminderRule`/`useToggleReminderRule`/patch/delete. مفيش UI للحذف/التعديل.

## 19) `acc-reports` → `ReportsPage`
- **استاتيك بالكامل:** `reports` = 6 عناوين ثابتة، مفيش أي هوك. التاريخ "أكتوبر 2025" ثابت. أزرار **"عرض" و"تحميل" مفيش لهم onClick** (ميتة تماماً).

---

## 20) المطلوب — مقسوم

### أ) إصلاحات فرونت (شغلنا)
1. **🐞 إصلاح الـ type-mismatch** في expenses/sales-detail/purchases/inventory: الهوك بيرجّع array مش object — نستخدم الـ array مباشرة أو نطلب من الباك endpoints مخصّصة ترجّع الشكل المتوقّع (فواتير/تسوية/جرد بالفرع). ده أكبر بند.
2. **توصيل الـ mutations الموجودة** (كلها جاهزة، بس مش متنادية): reconciliation PATCH، convert-to-asset، asset create/confirm/draft، inventory flag/confirm/save، waste approve/reject/bulk/patch/allocations، shift close، cash settlement، reminders send/respond + rules CRUD.
3. **🔴 guards ضد الكراش** (AccInventoryItems `brands[0]`, AccCash `b.txns`/`b.amount`, `sh.name[0]`, `e.name[0]`, waste `products`, PurItemsTable `items`).
4. **فلاتر ميتة**: تفعيل brand/date في AccSalesPage، status في AccCash، brand في كل مكان (تعبئة من الداتا زي ما عملنا في الـ head).
5. **أزرار ميتة (مفيش onClick)**: purchases Reject، sales-detail Confirm Assignment/Request Clarification/Save Note، expenses Save Changes، inventory "تأكيد التحميل"، employees PDF، reports عرض/تحميل، مرفقات View/Download.
6. **الاستيراد الحقيقي**: `useImportAssets` بدل محاكاة `ExcelImportModal`.
7. **صفحة التقارير + قواعد التذكير** تتربط بالكامل (دلوقتي static 100%).

### ب) أسئلة/مطلوب من الباك (B-A#)
- **B-A1:** هل `/accountant/operations` هيرجّع الشكل الغني اللي الصفحات متوقعاه (فواتير مصروفات، تسوية مبيعات بالتفصيل، سجلات مشتريات، جرد بالفرع)، ولا نعمل endpoints منفصلة؟ ده بيحدد إصلاح الـ mismatch.
- **B-A2:** تأكيد شكل `GET /accountant/dashboard` (الحقول اللي نبني عليها الـ KPIs بدل الاشتقاق من `ops`).
- **B-A3:** endpoint **نقل عهدة أصل** (transfer custody) — مش موجود في الهوكس.
- **B-A4:** تأكيد `GET /reminders` (accountant-scoped؟) وشكل rules، وبثّ التذكيرات.
- **B-A5:** عدم اتساق السطح: القراءات `/accountant/*` والتصديرات `/company/me/*` — مقصود؟

---

### ملاحظة منهجية
دور المحاسب **قراءته أقوى من كتابته**: العمليات (approve/reject/bulk) والتصديرات والقراءات الأساسية شغّالة، لكن **كل التسويات والموافقات والتأكيدات والحفظ التفصيلي محلية بالكامل** رغم إن كل الـ endpoints والهوكس جاهزة — المطلوب أساساً **توصيل** مش بناء، بعد حسم الـ type-mismatch (B-A1).
