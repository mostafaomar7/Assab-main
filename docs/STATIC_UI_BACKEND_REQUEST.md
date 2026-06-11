# ASAB — Static / Unwired UI → Backend Endpoint Request

> **الغرض:** كل عنصر UI (زر / تشيك / توجل / فلتر / فورم) لسه **مش مربوط بـ endpoint** — أي إنه بيعمل
> `setState` محلي بس، أو `alert()`، أو مالوش handler خالص، أو بيبعت body فاضي/ثابت. لكل عنصر هنا
> الـ endpoint المطلوب + الـ request body + الـ response عشان الباك إند يبنيه (أو يأكّد إنه موجود).
>
> اتعمل بعد ما الداتا الاستاتيك للعرض اتشالت — ده اللي **باقي** من تفاعلات مش شغّالة.

## الاتفاقيات (Conventions)
- **Base:** `${VITE_API_BASE_URL}/api/v1`
- **Keys:** camelCase. **العملة:** أعداد صحيحة **halalas** (1 ريال = 100 هللة).
- **Envelope:** قائمة → `{ data: [...], meta: { page, pageSize, total, totalPages } }` · عنصر واحد → object صريح ·
  خطأ → `{ error: { code, message, messageAr, details } }`.
- **المسارات حسب الدور:** أدمن `/admin/*` · أدوار الشركة `/company/me/*` · المورد `/asab/supplier/*`.
- **ملاحظة:** بعض الـ endpoints دي **الـ FE hook بتاعها موجود فعلاً** (يعني غالبًا الباك عامِلها) — بس
  الواجهة مش بتستدعيها. معلَّمة بـ ⚙️. اللي من غير علامة = محتاج تأكيد إنه موجود/يتعمل.

---

## ملخص سريع
| الدور | عدد العمليات الناقصة |
|------|----------------------|
| Admin (لوحة النظام) | 10 |
| Accountant (محاسب) | 11 |
| Head (رئيس حسابات) | 1 |
| Branch (مدير فرع) | 6 |
| Procurement (مشتريات) | 6 |
| Supplier (مورد) | 3 |
| Company Admin (أدمن الشركة) | 1 |
| إعدادات النظام (Admin Settings) | 1 (عقد واحد يغطّي 12 توجل) |

> **مهم:** أدوار (accountant / head / branch / procurement) موجودة في **الداشبوردين** (ASABPrototype للنظام،
> CompanyDashboard لبوابة الشركة). نفس العملية المنطقية = **نفس الـ endpoint** — مش محتاج تتكرر في الباك.

---

# 1) Admin — لوحة النظام (ASABPrototype)

### 1.1 ⚙️ POST `/admin/users` — إنشاء مستخدم
- **يطلقه:** مودال "إضافة مستخدم" → زر الحفظ — `ASABPrototype.tsx:1351` (الـ hook `useCreateAdminUser` موجود ومش مستدعى)
- **Body:** `{ name, email, phone, role, brands:[string], restaurants:[string], branches:[string], modules:[string], reportsTo, scope:"all"|"brand"|"restaurant"|"branch", status:"active"|"inactive" }`
- **Response:** الـ `AdminUserRow` المُنشأ (بـ `id` من السيرفر)

### 1.2 ⚙️ POST `/admin/brands` — إنشاء علامة تجارية
- **يطلقه:** فورم "علامة تجارية جديدة" → حفظ — `ASABPrototype.tsx:10534` (المدخلات uncontrolled حاليًا)
- **Body:** `{ name, owner, plan:"silver"|"gold"|"platinum" }`
- **Response:** العلامة المُنشأة

### 1.3 ⚙️ POST `/admin/brands/{brandId}/restaurants` — إنشاء مطعم
- **يطلقه:** أزرار "مطعم جديد" / "إضافة مطعم" — `ASABPrototype.tsx:10230, 10660` (حاليًا state ميّت بلا مودال)
- **Body:** `{ name, city }`
- **Response:** المطعم المُنشأ

### 1.4 ⚙️ POST `/admin/restaurants/{restaurantId}/branches` — إنشاء فرع
- **يطلقه:** زر "إضافة فرع" لكل مطعم — `ASABPrototype.tsx:10633` (بلا onClick)
- **Body:** `{ name, manager, city }`
- **Response:** الفرع المُنشأ

### 1.5 ⚙️ PATCH `/admin/restaurants/{id}` · PATCH `/admin/branches/{id}` · POST `/admin/subscriptions/{id}/change-plan`
- **يطلقه:** أزرار التعديل (قلم) و"تغيير الباقة" — `ASABPrototype.tsx:10609, 10644, 10626` (بلا onClick)
- **Body (restaurant/branch):** الحقول المعدّلة · **(change-plan):** `{ plan }`
- **Response:** الكائن بعد التعديل

### 1.6 POST `/admin/brands/{brandId}/uploads/{type}` (multipart) — رفع بيانات العلامة + GET القالب
- **يطلقه:** تبويب "رفع البيانات" — كروت الرفع + زر القالب — `ASABPrototype.tsx:10254, 10279` (بيقلب flag محلي بس، مفيش `<input type=file>`)
- **`type`:** `sales-items` | `raw-materials` | `suppliers` | `employees` (الموظفين على مستوى المطعم: `/admin/restaurants/{restaurantId}/uploads/employees`)
- **Body:** `multipart/form-data` ملف + `{ brandId, restaurantId? }`
- **Response:** `{ uploadId, rowsImported, errors:[{row, message}], status:"done"|"processing" }`
- **القالب:** `GET /admin/uploads/templates/{type}` → ملف xlsx

### 1.7 POST `/admin/reports/{reportKey}/send` — توزيع تقرير على المطاعم
- **يطلقه:** "إرسال التقرير لكل المطاعم" — `ASABPrototype.tsx:11283, 11404` (محلي بس)
- **Body:** `{ period:{from,to}, restaurantIds?:[string], channels:["email","inApp"] }` (لو فاضي → كل المطاعم المشتركة)
- **Response:** `{ reportKey, sentAt, recipients:[{ restaurantId, sent:boolean, sentDate }] }`
- **مكمّل:** POST `/admin/reports/{reportKey}/upload` (multipart) لرفع ملف التقرير قبل الإرسال — `ASABPrototype.tsx:11346`

### 1.8 PATCH `/admin/accountants/{accId}/assignments` — توزيع المطاعم على المحاسبين
- **يطلقه:** نقل محاسب لرئيس / إضافة/إزالة مطعم — `ASABPrototype.tsx:9431-9433, 9616, 9648` (محلي، مفيش زر حفظ)
- **Body:** `{ headId?:string, restaurants:[string] }` — أو granular: `POST/DELETE /admin/accountants/{accId}/restaurants` بـ `{ restaurant }`
- **Response:** `{ id, headId, restaurants:[string] }`

### 1.9 PUT `/admin/accountants/{accId}/restaurants/{restaurant}/modules` — صلاحيات الموديولات لكل مطعم
- **يطلقه:** مصفوفة الموديولات (toggle/تعيين الكل/مسح) — `ASABPrototype.tsx:9467-9476, 9802, 9810` (محلي)
- **Body:** `{ modules:[string] }`
- **Response:** `{ accountantId, restaurant, modules:[string] }`

### 1.10 ⚙️ POST `/admin/permissions/clone` — نسخ صلاحيات دور لدور
- **يطلقه:** مودال "نسخ الصلاحيات" → تأكيد — `ASABPrototype.tsx:11772` (بينسخ في الـ matrix المحلي بس)
- **Body:** `{ fromRole, toRole }`
- **Response:** الـ matrix بعد النسخ
- *(ملاحظة: "حفظ الصلاحيات" نفسه مربوط عبر `useUpdateAdminPermissions`.)*

---

# 2) Accountant — محاسب (في الداشبوردين)

### 2.1 ⚙️ POST `/company/me/assets` — إنشاء أصل ثابت (بمودال إدخال حقيقي)
- **يطلقه:** "أصل جديد" — `ASABPrototype.tsx:6748, 7362` · `CompanyDashboard.tsx:3454` (بيبعت `{name}` ثابت)
- **Body:** `{ name, category, branchId, invNum, priceHalalas, usefulLifeMonths, custodian, notes }`
- **Response:** الأصل المُنشأ

### 2.2 ⚙️ POST `/company/me/assets/import` (multipart) — استيراد أصول Excel
- **يطلقه:** مودال "استيراد Excel" + drop zone — `ASABPrototype.tsx:6417, 6422, 6479` (رفع مُحاكى)
- **Body:** `multipart` ملف → السيرفر يفكّ الصفوف `{ name, category, branch, invNum, cost, usefulLife, custodian }`
- **Response:** `{ imported:[asset], count, errors:[{row,message}] }`

### 2.3 ⚙️ POST `/company/me/expense-invoices/convert-to-asset-draft` — تحويل مصروف لمسودة أصل
- **يطلقه:** مودال "تحويل لأصل" → تأكيد — `ASABPrototype.tsx:3190` (بيضيف لـ context محلي بس)
- **Body:** `{ expenseOpId, invNum, assetName, category, usefulLifeMonths, targetBranches:[string], custodian, qty, notes }`
- **Response:** `{ draftId, ...draft }`

### 2.4 PATCH `/company/me/assets/{id}` — تعديل / تأكيد تسجيل أصل
- **يطلقه:** زر التعديل (قلم) `CompanyDashboard.tsx:3524` (alert فقط) · "تأكيد التسجيل" `ASABPrototype.tsx:6721, 7258` · نقل عهدة `6761`
- **Body:** `{ status?:"active"|"maintenance"|"disposed"|"confirmed", bookValueHalalas?, branchId?, custodian?, note? }`
- **Response:** الأصل بعد التعديل

### 2.5 PATCH `/company/me/operations/{id}/reconciliation` — حفظ تسوية المبيعات (كاش/بنك/تطبيقات)
- **يطلقه:** "تعديل الأرقام/حفظ" + مدخلات الكاش/البنك/تطبيقات التوصيل — `CompanyDashboard.tsx:1047, 1067-1090` · `ASABPrototype.tsx:3917`
- **Body:** `{ cashHalalas, bankHalalas, deliveryApps:[{ name, amountHalalas }] }`
- **Response:** العملية مع `totalCollectionHalalas`, `varianceHalalas` المعاد حسابهم

### 2.6 POST `/company/me/operations/{id}/variance-allocations` — تحميل الفرق على موظفين
- **يطلقه:** "تأكيد التحميل" — `CompanyDashboard.tsx:1134` (**بلا onClick خالص**)
- **Body:** `{ allocations:[{ employeeId, amountHalalas }] }`
- **Response:** `{ operationId, remainingVarianceHalalas }` (المفروض 0)

### 2.7 PATCH `/company/me/operations/{id}/sales-lines/{rowId}` — تعديل بند مبيعات + ملاحظة محاسب
- **يطلقه:** صف المبيعات القابل للتعديل "حفظ" `ASABPrototype.tsx:3632` · ملاحظة المحاسب "حفظ" `4216` (التكست بيتفقد)
- **Body (بند):** `{ amountBeforeTaxHalalas, vatHalalas, amountAfterTaxHalalas }` · **(ملاحظة):** POST `/company/me/operations/{id}/notes` `{ note }`
- **Response:** الصف/الملاحظة بعد الحفظ

### 2.8 PUT `/company/me/inventory/catalog` — حفظ أصناف الجرد اليومي للفرع + إشعار الفرع
- **يطلقه:** "حفظ وإرسال للفرع" — `ASABPrototype.tsx:5335, 5348` · `CompanyDashboard.tsx:3334, 3347` (بيبعت `[]` فاضي — الكتالوج ثابت)
- **Body:** `{ branchId, items:[{ name, category, unit }] }` (تعريف كامل مش اسم بس)
- **Response:** `{ branchId, items:[...], notifiedBranch:true }`

### 2.9 POST `/company/me/inventory/branches/{branchId}/flag` · `/confirm` · `/flagged-items` — فلاج/تأكيد/إرسال أصناف مشكوكة
- **يطلقه:** توجلات "فلاج الفرع" / "تأكيد الجرد" / 🚩 لكل صنف / "إرسال طلب تأكيد" — `ASABPrototype.tsx:4878-4887, 5050, 5065, 5116`
- **Body:** flag `{ flagged:boolean }` · confirm `{ confirmed:boolean }` · flagged-items `{ itemIndexes:[number], note? }`
- **Response:** `{ branchId, flagged, confirmed, sentToBranch }`
- *(ملاحظة: نسخة CompanyDashboard من دول مربوطة بالفعل عبر hooks؛ نسخة ASABPrototype محلية.)*

### 2.10 GET `/company/me/inventory/export` — تصدير المخزون Excel
- **يطلقه:** "Excel — كل الفروع" / Excel لكل فرع — `CompanyDashboard.tsx:3140, 3202` (alert فقط)
- **Query:** `{ branchId?, format:"xlsx" }`
- **Response:** ملف، أو `{ jobId }` لو async

### 2.11 ⚙️ POST `/accountant/reminder-rules` + PATCH `/accountant/reminder-rules/{id}` + POST broadcast — قواعد التذكير والبث
- **يطلقه:** "إضافة قاعدة"/توجل القاعدة `ASABPrototype.tsx:8077, 8078` · مودال "بث مخصص → إرسال" `7982` · "إرسال تذكير/الكل" `7855`
- **Body:** rule `{ module, triggerHour, repeatHours, active }` · broadcast `{ target:"all"|branchId, module, message, channels?:[string] }`
- **Response:** القاعدة/`{ ok:true, sentCount }`

---

# 3) Head — رئيس حسابات

### 3.1 GET `/company/me/erp/preview` — معاينة دفعة ERP حسب الفلاتر
- **يطلقه:** radios فلاتر ERP (موديول/فترة/مطعم/فرع/حالة) — `ASABPrototype.tsx:9156-9205` (uncontrolled `defaultChecked`؛ الفلاتر متجاهَلة في الترحيل الفعلي)
- **Query/Body:** `{ moduleKey, period:{type, from?, to?}, restaurantId?, branchId?, status }`
- **Response:** `{ data:[op], meta }` لجدول المعاينة
- *(الترحيل النهائي "تأكيد وإرسال" مربوط عبر `erpBatchMut`؛ الناقص هو ربط الفلاتر بالطلب.)*

---

# 4) Branch — مدير فرع

### 4.1 POST `/company/me/branch/upload` (multipart) — رفع البيانات اليومية للمحاسب
- **يطلقه:** كل مناطق الرفع + "رفع البيانات للمحاسب" — `ASABPrototype.tsx:12242` · `CompanyDashboard.tsx:4665, 4691` (`setSubmitted` بس، مفيش رفع)
- **Body:** `multipart` + `{ reportType:"sales"|"inventory"|"cash"|"waste"|"purchases"|"expenses", date, salesHalalas?, shift?, expensesHalalas?, expenseNote? }` + المرفقات (صورة/PDF مبيعات + فاتورة)
- **Response:** `{ uploadId, reportType, status:"success", createdOperationId, uploadedAt }`

### 4.2 ⚙️ PATCH `/company/me/branch/settings` — حفظ إعدادات الفرع (شاملة)
- **يطلقه:** "حفظ الإعدادات" + توجلات "تذكير تلقائي"/"إلزام صور" — `ASABPrototype.tsx:12916, 12976` · `CompanyDashboard.tsx:4922` (بيبعت `{branchName, managerName}` بس — باقي الحقول بتتفقد)
- **Body:** `{ branchName, manager, phone, address, openTime, closeTime, shiftDuration, taxNumber, bankAccount(IBAN), cashLimitHalalas, wasteThreshold, autoReminders:boolean, requireImages:boolean }`
- **Response:** الإعدادات بعد الحفظ

### 4.3 ⚙️ POST `/company/me/branch/employees` — إضافة موظف فرع
- **يطلقه:** "إضافة موظف" — `ASABPrototype.tsx:12113` (بلا onClick)
- **Body:** `{ name, role, salaryHalalas, shift }`
- **Response:** الموظف المُنشأ

### 4.4 ⚙️ POST `/company/me/branch/purchase-requests` — طلب شراء جديد
- **يطلقه:** مودال "طلب جديد → إرسال" — `CompanyDashboard.tsx:4737` (محلي بـ "صنف جديد" ثابت)
- **Body:** `{ itemName, qty, unit, priority:"normal"|"urgent" }`
- **Response:** `{ publicId, status:"submitted" }`

### 4.5 ⚙️ POST `/company/me/branch/shifts/open` + `/close` — فتح/إغلاق شفت (بقيم الفورم الحقيقية)
- **يطلقه:** "فتح شفت" `CompanyDashboard.tsx:4862` (بيبعت `{registerOpeningHalalas:50000}` ثابت، بيتجاهل الكاشير ومبلغ الفتح) · "إغلاق" `ASABPrototype.tsx:5702`
- **Body:** open `{ cashierId, registerOpeningHalalas }` · close `{ cashInDrawerHalalas, salesSystemHalalas, notes }`
- **Response:** open → الشفت · close → `{ id, varianceHalalas, createdAt }`

### 4.6 PUT `/company/me/branch/shifts/config` — حفظ إعداد الشفتات
- **يطلقه:** "حفظ إعداد العلامة" — `ASABPrototype.tsx:5664, 5821` (محلي `saved:true`)
- **Body:** `{ brandId, numShifts, durationHours, firstStart, shifts:[{start,end}], restaurantOverrides:{...} }`
- **Response:** الإعداد المحفوظ
- **مكمّل (إصلاح):** "الجرد اليومي" `CompanyDashboard.tsx:4782` بيفهرس بالـ **اسم** لكن بيبعت `{itemId}` — لازم الباك يقبل `itemId` صحيح أو الـ FE يتظبّط.

---

# 5) Procurement — مشتريات

### 5.1 ⚙️ POST `/company/me/procurement/orders` — إنشاء أمر شراء (بمودال حقيقي)
- **يطلقه:** "إنشاء" `CompanyDashboard.tsx:5033` (بيبعت `{items:[]}`) · "أمر شراء جديد" `ASABPrototype.tsx` (بلا onClick)
- **Body:** `{ supplierId, brandId, items:[{ itemId, qty }], deadline?, description? }`
- **Response:** الأمر المُنشأ

### 5.2 ⚙️ PATCH `/company/me/procurement/orders/{id}` — تعديل أمر
- **يطلقه:** زر التعديل (قلم) — `CompanyDashboard.tsx:5021` (بيبعت `{id}` بس)
- **Body:** `{ supplierId?, items?:[{itemId, qty}], status? }`
- **Response:** الأمر بعد التعديل

### 5.3 POST `/company/me/procurement/orders/{id}/approve` · `/reject` · `/partial-reject` + bulk
- **يطلقه:** موافقة (فردي/بالفرع/بالمورد/الكل) + رفض جزئي/كامل — `ASABPrototype.tsx:12356-12359, 12586, 12599` (محلي؛ "رفض كامل" بلا onClick)
- **Body:** reject `{ reason, note? }` · partial `{ reason, itemIds:[string], note? }` · bulk `POST /company/me/procurement/orders/approve` `{ orderIds?:[string], branch?, supplier? }`
- **Response:** الأمر/الأوامر بعد التحديث

### 5.4 POST `/company/me/procurement/grouped/{groupId}/send` — إرسال أمر مجمّع للمورد
- **يطلقه:** "إرسال للمورد" / "تفاصيل" — `ASABPrototype.tsx:12686, 12685` (بلا onClick)
- **Body:** `{ }` (المجموعة معرّفة بالـ groupId) — أو `{ supplierId, branchOrderIds:[string] }`
- **Response:** `{ ok:true, sentOrderId }`

### 5.5 ⚙️ POST `/company/me/procurement/suppliers` — إضافة مورد (بمودال حقيقي)
- **يطلقه:** "إضافة مورد" — `ASABPrototype.tsx:13136` · `CompanyDashboard.tsx:5061` (بيبعت `{name}` ثابت)
- **Body:** `{ name, category, contactName, phone, email? }`
- **Response:** المورد المُنشأ

### 5.6 ⚙️ POST `/company/me/procurement/items` — إضافة صنف (بمودال حقيقي)
- **يطلقه:** "صنف جديد" — `ASABPrototype.tsx:13022` · `CompanyDashboard.tsx:5095` (بيبعت `{name}` ثابت)
- **Body:** `{ name, unit, category, defaultPriceHalalas, supplierId? }`
- **Response:** الصنف المُنشأ

---

# 6) Supplier — مورد

### 6.1 POST `/asab/supplier/orders/{id}/accept` · `/reject` — قبول/رفض أمر توريد
- **يطلقه:** "قبول الأمر" / "رفض" — `ASABPrototype.tsx:12858-12859, 12869-12870` (محلي)
- **Body:** accept `{ deliveryDate? }` · reject `{ reason }`
- **Response:** `{ id, status:"accepted"|"rejected" }`

### 6.2 POST `/asab/supplier/items` — إضافة صنف للكتالوج
- **يطلقه:** "إضافة صنف" — `ASABPrototype.tsx:13363` (بلا onClick)
- **Body:** `{ name, unit, minQty, maxQty, priceHalalas, available:boolean, leadTimeDays }`
- **Response:** الصنف المُنشأ

### 6.3 PATCH `/asab/supplier/items/{id}` — تعديل صنف/إتاحته
- **يطلقه:** تعديل صنف الكتالوج (لو فيه toggle إتاحة)
- **Body:** `{ priceHalalas?, available?:boolean, minQty?, maxQty? }`
- **Response:** الصنف بعد التعديل

---

# 7) Company Admin — أدمن الشركة

### 7.1 ⚙️ PATCH `/company/me/settings` — حفظ بيانات الشركة
- **يطلقه:** فورم بيانات الشركة "حفظ" — `CompanyDashboard.tsx:1746, 1749` (مدخلات `defaultValue` uncontrolled؛ `updateSettingsMut.mutate({})` بـ object فاضي)
- **Body:** `{ name, city, crNumber, email }`
- **Response:** الإعدادات بعد الحفظ

---

# 8) إعدادات النظام (Admin Settings) — عقد واحد يغطّي 12 توجل

كل توجلات "إعدادات النظام" (الإشعارات/النسخ الاحتياطي/API/الأمان) **ديكورية** — `<div>` بلا `onClick`،
ثابتة على شكل "مفعّل". `ASABPrototype.tsx:11957-11972`. الـ hooks موجودة (`useAdminSettings` GET،
`useUpdateAdminSettings` PATCH) لكن الواجهة بترمي النتيجة. محتاج **تثبيت الـ schema** (دلوقتي `Record<string,unknown>`):

### ⚙️ GET `/admin/settings` → 200
```json
{
  "notifications": { "approvalNotifications": true, "subscriptionAlerts": true, "dailyPerformanceReports": false },
  "backup":        { "dailyAutoBackup": true, "weeklyBackup": false, "dataEncryption": true },
  "api":           { "erpConnection": false, "paymentGatewayConnection": false, "mobileAppInterface": true },
  "security":      { "twoFactorAuthRequired": false, "sessionDurationMinutes": 480, "passwordPolicyEnabled": true }
}
```
### ⚙️ PATCH `/admin/settings`
- **Body:** `Partial<AdminSettings>` (deep-merge لكل bucket) — مثال: `{ "backup": { "weeklyBackup": true } }`
- **Response:** الكائن الكامل بعد التحديث
- **ملاحظات:** `sessionDurationMinutes` رقم مش toggle (الـ UI المفروض input رقمي). توجل "2FA" هنا
  مكرّر مع معالج 2FA الحقيقي — يفضّل يكون read-only مشتق من حالة 2FA الفعلية.

---

## مُستثنى (مربوط بالفعل — مش محتاج شغل)
موافقة/رفض/اعتماد نهائي العمليات، ترحيل ERP (تأكيد وإرسال)، كل تصديرات Excel، حذف مستخدم + استيراد CSV،
تجديد/تعليق/تفعيل/تغيير باقة الاشتراكات، إنشاء شركة، حفظ مصفوفة الصلاحيات، تفضيل اللغة، toggle وحدات الشركة،
تفعيل/إيقاف مستخدم، الدعوات، ترقية الاشتراك، الهدر، تصدير الرواتب/العهد، التنزيلات — كلها بتستدعي mutations حقيقية.

## ملاحظات تنفيذية للباك
1. **Stub bodies:** أزرار كتير بتستدعي mutation بـ body ثابت/فاضي (`{name:"جديد"}`, `{items:[]}`) لأن مفيش
   مودال إدخال. دي محتاجة **(أ)** الـ endpoint يقبل الـ body الكامل أعلاه، و**(ب)** الـ FE يبني مودال — الجزء (ب) شغل واجهة.
2. **رفع الملفات** (admin uploads, branch daily upload, asset import, report upload) كلها `multipart/form-data`
   ومحتاجة معالجة async مع `{ uploadId/jobId, status }` + (اختياري) WebSocket تقدّم.
3. **تطابق الـ prefix:** أكّد إن أدوار الشركة كلها تحت `/company/me/*` (بعض المقترحات استخدمت `/accountant/*` /
   `/head/*` — وحّدها على `/company/me/*` المطابق للـ hooks الموجودة).
