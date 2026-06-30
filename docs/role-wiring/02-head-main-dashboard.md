# مدير الحسابات (Head) — الداشبورد الرئيسي · تحليل كامل كمبونينت-كمبونينت

> النطاق: دور **`head`** (رئيس/مدير الحسابات) في `ASABPrototype.tsx`.
> التصنيف لكل عنصر: ✅ **شغّال** (مربوط بالـ API ويعرض/يرسل فعلاً) · ⚠️ **جزئي** (مربوط بس ناقص حاجة) · 🟥 **استاتيك/موك** (ثابت في الكود، مش من الـ API) · ❌ **مكسور/زرار ميت** (مفيش action أو غلط).
> الحساب المرجعي: `head@asab.sa` (توكن Sanctum صالح، دور head).

---

## 0) ملخص تنفيذي (الأهم)

**أكبر مشكلة معمارية:** كل صفحات الـ head بتعرض العمليات من **مصدر واحد** = الـ prop اسمه `ops`، واللي بيتحمّل مرة واحدة على مستوى التطبيق من:

```
GET /accountant/operations?pageSize=100      ← endpoint المحاسب، مش الـ head!
```

يعني:
- **الهوكس المخصصة للـ head للعمليات بتتنادى بس نتيجتها بتترمي (discarded):**
  `/head/operations/pending` · `/head/operations/final-approved` · `/head/operations/rejected` · `/head/erp/eligible-operations` · `/head/erp/batches`.
  كل صفحة بتستدعي الهوك (فيتفّذ الـ request) لكن العرض بيتعمل من `ops` (فلترة بالـ status على الفرونت).
- ده كمان **خطر صلاحيات:** الـ head بيقرأ من `/accountant/operations` — لو الـ middleware `EnsureAsabRole` بيمنع دور head من مسارات `/accountant/*` هيرجع **403 WRONG_ROLE** والداشبورد كله يفضي.

**اللي شغّال فعلاً (mutations):** الاعتماد/الرفض/الاعتماد النهائي/الجماعي/ترحيل ERP **بتضرب الباك إند** (مع optimistic UI):
`POST /operations/{id}/approve` · `/reject` · `/final-approve` · `POST /operations/bulk-approve` · `POST /erp/batches`.

**التقارير:** صفحة التقارير (`head-reports` = `OwnerReportsPage`) **مفيهاش أي ربط API** — كلها مشتقة من `ops` + ثوابت baseline، وكروت "التقارير الداخلية" أزرارها ميتة. ومسارات `/head/reports/internal` و `/head/reports/owner` **متعمولّها هوكس بس متستدعاش خالص**.

### جدول حالة الهوكس (head)

| الهوك | Endpoint | بيتنادى في | نتيجته مُستخدَمة؟ |
|---|---|---|---|
| `useHeadDashboardPlatform` | `GET /head/dashboard` | HeadDashboard | ⚠️ جزئياً (بس `kpis.performanceRatePct` + `weeklyPerformance`) |
| `useHeadRemindersPlatform` | `GET /head/reminders` | HeadDashboard | ❌ تترمي |
| `useAccountantsPerformancePlatform` | `GET /head/accountants/performance` | HeadAccountants | ✅ مُستخدَمة |
| `usePendingOperations` | `GET /head/operations/pending` | HeadApprovalTab · HeadPending · HeadModulePage | ❌ تترمي |
| `useFinalApprovedOperations` | `GET /head/operations/final-approved` | HeadApproved | ❌ تترمي |
| `useRejectedOperations` | `GET /head/operations/rejected` | HeadRejected | ❌ تترمي |
| `useErpPreflightPlatform` | `GET /head/erp/preflight` | — | ❌ **مش متنادي** |
| `useErpEligibleOperationsPlatform` | `GET /head/erp/eligible-operations` | HeadERP | ❌ تترمي |
| `useErpBatchesPlatform` | `GET /head/erp/batches` | HeadERP | ❌ تترمي |
| `useReportsInternalPlatform` | `GET /head/reports/internal` | — | ❌ **مش متنادي** |
| `useReportsOwnerPlatform` | `GET /head/reports/owner` | — | ❌ **مش متنادي** |
| `usePatchHeadReminderPlatform` | `PATCH /head/reminders/{id}` | — | ❌ **مش متنادي** |
| `useMarkAllHeadRemindersDonePlatform` | `POST /head/reminders/mark-all-done` | — | ❌ **مش متنادي** |
| `useCreateERPBatch` | `POST /erp/batches` | root → `markErpPosted` | ✅ بيضرب (الرد مُتجاهَل) |
| `useApproveOperation` | `POST /operations/{id}/approve` | root → `approveOp` | ✅ بيضرب |
| `useRejectOperation` | `POST /operations/{id}/reject` | root → `rejectOp` | ✅ بيضرب |
| `useFinalApprove` | `POST /operations/{id}/final-approve` | root → `finalApproveOp`/`bulkApprove` | ✅ بيضرب |
| `useBulkApprove` | `POST /operations/bulk-approve` | root → `bulkApprove` | ✅ بيضرب |
| `useExportHeadOperations` | `GET /operations/export` (blob) | كل صفحات العمليات | ✅ بيضرب |
| `useAccountantOperationsPlatform` | `GET /accountant/operations` | **root** (مصدر `ops`) | ✅ مُستخدَمة (لكن endpoint محاسب) |

---

## 1) صفحة `head-dashboard` → `HeadDashboard` (سطر 8050)

| العنصر | النوع | السلوك | الحالة | ملاحظة |
|---|---|---|---|---|
| KPI «بانتظار اعتمادي» | بطاقة | `ops.filter(status==="approved").length` | ⚠️ من `ops` (مش من `/head/dashboard`) | onClick → تبويب approval |
| KPI «معتمدة نهائياً» | بطاقة | `ops.filter(final-approved && !erpPosted)` | ⚠️ من `ops` | onClick → تبويب erp |
| KPI «مُرحَّلة لـ ERP» | بطاقة | `ops.filter(erpPosted)` | ⚠️ من `ops` | — |
| KPI «مرفوضة» | بطاقة | `ops.filter(rejected)` | ⚠️ من `ops` | — |
| KPI «معدل الأداء» | بطاقة | `apiHead.kpis.performanceRatePct ?? 87` | ⚠️ API مع fallback ثابت **87%** | لو API فاضي يفضل 87 |
| رسم «الأداء الأسبوعي» | chart | `apiHead.weeklyPerformance ?? [7 أيام ثابتة]` | 🟥 fallback ثابت كامل | الأرقام 24/32/19… ثابتة لو مفيش API |
| `+18% مقارنة بالأسبوع الماضي` | label | نص ثابت | 🟥 | مش محسوب |
| PipelineOverview / ExceptionPanel / ModuleAggregationGrid | مكوّنات | محسوبة من `ops` | ✅ live من `ops` | منطق على الفرونت |
| 3 تبويبات (اعتماد/أداء/ERP) | tabs | embed للمكوّنات التحتية | ✅ | — |
| `useHeadRemindersPlatform()` | hook | بيتنادى | ❌ نتيجته تترمي | — |

**الخلاصة:** الـ KPIs المفروض تيجي من `GET /head/dashboard` لكنها مشتقة من `ops`. الـ chart والـ +18% ثابتين. لازم نربط `apiHead.kpis` بالكامل و نشيل الـ fallbacks.

---

## 2) تبويب `HeadApprovalTab` (داخل الداشبورد · سطر 8128)

| العنصر | النوع | السلوك | الحالة |
|---|---|---|---|
| التجميع حسب المحاسب | منطق | **«محاكاة»: المجموعة 1 = أول نص، المجموعة 2 = الباقي**، وأسماء `"أحمد محمد الشهري"`/`"سارة العمري"` ثابتة | 🟥 hardcoded |
| «اعتماد الكل» | زر | `bulkApprove(ids)` | ✅ يضرب `/operations/bulk-approve` + final |
| «اعتماد المجموعة» | زر | `bulkApprove(group ids)` | ✅ |
| اعتماد فردي ✓ | زر | `finalApproveOp(id)` | ✅ `/operations/{id}/final-approve` |
| رفض ✗ | زر | `setModal("reject")` ثم `rejectOp` | ✅ `/operations/{id}/reject` |
| `usePendingOperations()` | hook | بيتنادى | ❌ تترمي |

**الخلاصة:** الأكشنز شغّالة، لكن **التجميع وأسماء المحاسبين وهمية** — لازم تيجي من `/head/operations/pending` (اللي فيه `accountantName`/`accountantId` لكل عملية).

---

## 3) صفحة `head-pending` → `HeadPending` (سطر 8193)

| العنصر | النوع | السلوك | الحالة |
|---|---|---|---|
| قائمة المحاسبين `HEAD_ACCS` | بيانات | 4 أسماء ثابتة + `getAcc(id)` بيحسب المحاسب من **hash لرقم العملية** | 🟥 وهمي بالكامل |
| فلتر «المحاسب المراجع» | select | خياراته من `HEAD_ACCS` الثابتة | 🟥 |
| فلتر «العلامة التجارية» | select | خيار **«الكل» فقط** (مفيش داتا) | 🟥 فاضي |
| فلتر «الفرع» | select | من `BRANCHES` وهي **`[]` فاضية** | 🟥 مفيش خيارات |
| فلتر «المطابقة» | select | قيم ثابتة (exact/review/diff) | ✅ مقبول |
| بحث نصّي | input | `applyFilters` على `ops` | ✅ |
| تجميع (flat/module/accountant) | toggle | على `ops` | ✅ (لكن accountant = وهمي) |
| اعتماد فردي/مجموعة/الكل | أزرار | `finalApproveOp` / `bulkApprove` | ✅ يضرب الباك |
| رفض (قائمة أسباب) | dropdown | `rejectOp(id, reason)` | ✅ |
| **اعتماد مشروط** (textarea + تأكيد) | flow | بينده `finalApproveOp(op.id)` بس **`approvalComment` مش بيتبعت** | ⚠️ التعليق المشروط بيضيع (الـ hook بيدعم `isConditional`/`conditionalNote` لكن مش متمرّر) |
| تصدير Excel | زر | `exportHeadOpsMut` | ✅ `/operations/export` |
| `usePendingOperations()` | hook | بيتنادى | ❌ تترمي |

**ناقص للباك:** `accountantName`/`accountantId` + `brandId/brandName` على كل عملية pending، وقائمة الفروع/البراندات للفلاتر.

---

## 4) صفحة `head-approved` → `HeadApproved` (سطر 8428)

| العنصر | النوع | السلوك | الحالة |
|---|---|---|---|
| قائمة المعتمدة نهائياً | list | `ops.filter(final-approved)` | ⚠️ من `ops` |
| عدّادات ERP-posted/pending | KPI | محسوبة من `ops` | ⚠️ |
| شارة «مُرحَّل لـ ERP · batchId» | badge | `op.erpBatchId` | ⚠️ |
| `useFinalApprovedOperations()` | hook | بيتنادى | ❌ تترمي |
| `exportHeadOpsMut` | var | معرّف بس **مفيش زرار تصدير ظاهر** في الصفحة | ❌ متغير غير مستخدم |

**الخلاصة:** عرض فقط من `ops`؛ لازم يتربط بـ `/head/operations/final-approved`. مفيش أزرار ميتة خطيرة (التصدير غير معروض).

---

## 5) صفحة `head-rejected` → `HeadRejected` (سطر 8485)

| العنصر | النوع | السلوك | الحالة |
|---|---|---|---|
| قائمة المرفوضة | list | `ops.filter(rejected)` | ⚠️ من `ops` |
| سبب الرفض | text | `op.rejectReason` | ⚠️ |
| `useRejectedOperations()` | hook | بيتنادى | ❌ تترمي |
| `exportHeadOpsMut` | var | معرّف وغير معروض | ❌ غير مستخدم |

**الخلاصة:** عرض فقط؛ يتربط بـ `/head/operations/rejected`.

---

## 6) صفحات الموديولات `head-{sales,expenses,purchases,inventory,waste,assets,shifts,employees,cash}` → `HeadModulePage` (سطر 8515)

9 صفحات بنفس المكوّن (`moduleKey` مختلف).

| العنصر | النوع | السلوك | الحالة |
|---|---|---|---|
| الفلترة بالموديول | منطق | `applyFilters(ops, filters, mk)` | ✅ من `ops` |
| `HEAD_ACCS` + `getAcc` | بيانات | أسماء ثابتة + hash | 🟥 وهمي |
| فلتر المحاسب | select | من `HEAD_ACCS` | 🟥 |
| فلتر العلامة | select | «الكل» فقط | 🟥 فاضي |
| فلتر الفرع | select | من `BRANCHES = []` | 🟥 فاضي |
| فلتر «من/إلى تاريخ» | date inputs | **`dateFrom`/`dateTo` مش متمرّرين لـ `applyFilters`** → الفلتر ميت (UI بس) | ❌ فلتر تاريخ لا يعمل |
| بحث/مطابقة | inputs | على `ops` | ✅ |
| اعتماد/رفض | أزرار | `finalApproveOp`/`rejectOp` | ✅ يضرب الباك |
| تصدير Excel | زر | `exportHeadOpsMut({moduleKey})` | ✅ |
| `usePendingOperations({moduleKey})` | hook | بيتنادى | ❌ تترمي |

**أهم باج هنا:** فلتر التاريخ معروض وبيتخزن في state لكن **مش بيأثر على النتائج** لأن `applyFilters` ماعندهاش معالجة للتاريخ.

---

## 7) صفحة `head-accountants` → `HeadAccountants` (سطر 8675)

| العنصر | النوع | السلوك | الحالة |
|---|---|---|---|
| قائمة المحاسبين | API | `useAccountantsPerformancePlatform()` → `apiPerf` | ✅ **مربوط فعلاً** |
| 4 KPIs (مراجَعة/معتمدة/معلقة/متوسط الوقت) | summary | `reduce` على `accountants` | ⚠️ **`avg = sum/accountants.length` → NaN لو القائمة فاضية** |
| كروت المحاسبين | cards | بتتوقّع حقول غنية: `name, branches, level, levelCls, rating, reviewed, approved, pending, rate, prevRate, avgTime` | ⚠️ لو الباك مرجّعش الحقول دي → undefined/كسر |
| «آخر النشاطات» | list | `apiPerf.recentMovements` (tuples `[نص, وقت, نوع]`) **مشتركة لكل المحاسبين** (مش per-accountant) | ⚠️ بنية ناقصة |
| «تصدير التقرير» (أعلى) | زر | **مفيش `onClick`** | ❌ زرار ميت |
| مقارنة الأداء (ranking) | bars | من `accountants` | ✅ |

**ناقص للباك:** تأكيد شكل `GET /head/accountants/performance` — لازم يرجّع لكل محاسب: `level/levelCls/rating/rate/prevRate/avgTime/reviewed/approved/pending/branches` + `recentMovements` **لكل محاسب** (مش قائمة واحدة). وعلى الفرونت: حماية القسمة من الصفر + ربط زر التصدير.

---

## 8) صفحة `head-erp` → `HeadERP` (سطر 8819)

| العنصر | النوع | السلوك | الحالة |
|---|---|---|---|
| تبويب «التصدير» / «تقارير ERP» | tabs | محلي | ✅ |
| **قائمة التحقق قبل التصدير** (6 بنود) | checklist | **ثابتة بالكامل** (ok/labels مكتوبة يدوي) | 🟥 المفروض من `/head/erp/preflight` (الهوك موجود ومش متنادي) |
| **سجل دفعات التصدير السابقة** (3 صفوف) | log | **ثابت بالكامل** (ERP-BATCH-2025…) | 🟥 المفروض من `/head/erp/batches` |
| فلاتر الخطوة 0 (موديول/فترة/مطعم/فرع/حالة) | radios | **`defaultChecked` غير متحكَّم — مفيش state ولا تأثير** | 🟥 شكل بس |
| حقل الفترة «14 Oct 2025» | input | نص ثابت | 🟥 |
| إجماليات «تنتظر الترحيل» | KPIs | من `ops` (toPost) | ⚠️ |
| معاينة (خطوة 1) | table | `toPost` من `ops` | ⚠️ |
| «تأكيد وإرسال للـ ERP» | زر | `markErpPosted(ids, batchId)` → `POST /erp/batches` | ⚠️ يضرب الباك بس **`batchId` متولّد على الفرونت** والرد مُتجاهَل |
| تبويب تقارير ERP (جدول موحّد) | table | من `postedOps` (ops) | ⚠️ محلي |
| `useErpEligibleOperationsPlatform` / `useErpBatchesPlatform` | hooks | بيتنادوا | ❌ تترمي |
| `useErpPreflightPlatform` | hook | **مش متنادي** | ❌ |

**الخلاصة:** أكتر صفحة استاتيك في الدور — الـ checklist والـ batches log والفلاتر كلها ثابتة. الإرسال الوحيد الحقيقي هو `POST /erp/batches` بـ `{operationIds}`. لازم نربط preflight + batches + نستخدم `batchId` الراجع من الباك.

---

## 9) صفحة `head-reminders` → **إعادة استخدام `AccReminders`** (سطر 7708)

| العنصر | النوع | السلوك | الحالة |
|---|---|---|---|
| قائمة التذكيرات | API | `usePlatformReminders()` = تذكيرات **المحاسب** (مش `/head/reminders`) | ⚠️ endpoint غلط للدور |
| «إرسال تذكير» / «إرسال للكل» | أزرار | **تعديل state محلي فقط — مفيش API** | 🟥 لا يرسل فعلاً |
| broadcast modal / إنشاء تذكير | modal | `createReminderMut` موجود | ⚠️ يحتاج تأكيد ربط |
| `useHeadRemindersPlatform` / `usePatchHeadReminderPlatform` / `useMarkAllHeadRemindersDonePlatform` | hooks | **مش متنادين** | ❌ |

**الخلاصة:** الـ head بيشوف صفحة تذكيرات المحاسب. الإرسال محلي. مسارات `/head/reminders*` كلها متعمولّها هوكس ومش مستخدمة. لازم نقرر: نوجّه `head-reminders` للهوكس بتاعة الـ head ونربط الإرسال الفعلي.

---

## 10) صفحة `head-reports` → `OwnerReportsPage` (سطر 2462)

| العنصر | النوع | السلوك | الحالة |
|---|---|---|---|
| تبويب «التقارير الداخلية» | tab | — | — |
| 6 كروت تقارير داخلية | cards | عناوين ثابتة | 🟥 |
| أزرار «عرض» / «تحميل» (×6 كروت) | أزرار | **مفيش `onClick`** | ❌ كلها ميتة |
| تبويب «رؤية المالك» | tab | مشتق من `ops.filter(erpPosted)` | ⚠️ من `ops` |
| صافي المركز/التصنيفات/الترتيب | حسابات | من `postedOps` + `SEPT_BASELINE`/`SEPT_NET` ثوابت | 🟥 baseline ثابت |
| commentary التلقائي | نص | مشتق من المقارنة بالثوابت | 🟥 |
| `useReportsInternalPlatform` / `useReportsOwnerPlatform` | hooks | **مش متنادين خالص** | ❌ |

**الخلاصة (مطابق لملاحظتك):** صفحة التقارير **استاتيك بالكامل تقريباً** — مفيش أي استدعاء API، كل أزرار العرض/التحميل ميتة، والمقارنات على ثوابت سبتمبر. مسارا `/head/reports/internal` و `/head/reports/owner` جاهزين بس مش متوصّلين.

---

## 11) متفرقات على مستوى القشرة (shell)

- جرس الإشعارات / الإعدادات: مشتركة مع باقي الأدوار (مش ضمن صفحات الـ head تحديداً) — تتراجع في تحليل منفصل لو حبيت.
- شارات الـ sidebar: `head-pending` badge بيتحسب من `headPendingCount`، و`head-reminders` badge **ثابت = 3**، `head-accountants` بدون badge.

---

## 12) ما هو مطلوب — مقسوم

### أ) إصلاحات فرونت (شغلنا — مش الباك)
1. **ربط مصدر العمليات الصح:** استبدال `useAccountantOperationsPlatform` بهوكس الـ head (`/head/operations/pending|final-approved|rejected`) وعرض نتيجتها فعلاً بدل ترميها — وده يحل أسماء المحاسبين والفروع الوهمية تلقائياً.
2. **HeadDashboard:** ربط كل `apiHead.kpis` + `weeklyPerformance` وشيل الـ fallback الثابت (87% و الأيام السبعة).
3. **HeadModulePage:** تمرير `dateFrom/dateTo` لـ `applyFilters` (الفلتر ميت حالياً).
4. **HeadERP:** ربط `/head/erp/preflight` (الـ checklist) + `/head/erp/batches` (سجل الدفعات) + استخدام `batchId` الراجع؛ وتحويل فلاتر الخطوة 0 لـ controlled state.
5. **HeadAccountants:** ربط زر «تصدير التقرير» + حماية القسمة من الصفر (NaN).
6. **OwnerReportsPage:** ربط `/head/reports/internal` و`/head/reports/owner` + تفعيل أزرار العرض/التحميل (download blob).
7. **head-reminders:** التحويل لهوكس الـ head وربط الإرسال الفعلي (`PATCH /head/reminders/{id}` + `mark-all-done`).
8. **اعتماد مشروط (HeadPending):** تمرير `isConditional`/`conditionalNote` لـ `useFinalApprove` بدل ضياع التعليق.
9. تنظيف متغيرات `exportHeadOpsMut` غير المستخدمة في HeadApproved/HeadRejected (أو إضافة زر التصدير).

### ب) أسئلة/مطلوب من الباك (هضيفها في ملف الـ followups لو وافقت)
- **B-H1 — صلاحية `/accountant/operations` للـ head:** حالياً مصدر العمليات endpoint محاسب؛ نتأكد إن الـ head يقرأ من `/head/operations/*` (وإنها بترجّع لكل عملية: `accountantId/accountantName`, `brandId/brandName`, `branchId/branchName`, `match`, `moduleKey/moduleLabel`, `amountHalalas`, `status`, `erpPosted/erpBatchId`).
- **B-H2 — `GET /head/dashboard`:** تأكيد شكل `kpis` (awaiting/finalApproved/erpPosted/rejected counts + `performanceRatePct`) و`weeklyPerformance: [{day,thisW,lastW}]`.
- **B-H3 — `GET /head/accountants/performance`:** لكل محاسب الحقول الغنية (`level, rating, rate, prevRate, avgTime, reviewed, approved, pending, branches`) + `recentMovements` **per-accountant**.
- **B-H4 — `GET /head/erp/preflight`:** شكل بنود قائمة التحقق `[{ok:boolean, labelAr, labelEn}]`، و`GET /head/erp/batches` شكل صف الدفعة، و`POST /erp/batches` بيرجّع `batchId` نهائي نستخدمه.
- **B-H5 — التقارير:** شكل ردّ `/head/reports/internal` (قائمة تقارير + روابط تنزيل) و`/head/reports/owner` (أرقام المركز المالي + baseline للمقارنة بدل ثابت سبتمبر على الفرونت).
- **B-H6 — التذكيرات:** تأكيد `/head/reminders` (قائمة) + `PATCH /head/reminders/{id}` (إرسال/تحديث) + `POST /head/reminders/mark-all-done`، وهل فيه broadcast/إنشاء تذكير للـ head؟

---

### ملاحظة منهجية
الـ **mutations** (اعتماد/رفض/نهائي/جماعي/ERP) شغّالة وبتضرب الباك مع optimistic UI — دي أقوى نقطة في الدور. الضعف كله في **القراءة/العرض**: العمليات بتتقري من endpoint غلط، وهوكس الـ head للعرض كلها متنادية-ومترمية، والتقارير والـ ERP-checklist والفلاتر استاتيك.
