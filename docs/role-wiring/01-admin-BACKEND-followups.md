# Admin Dashboard — Backend follow-ups (found while wiring batch 1)

أثناء اختبار **دور الـ System Admin** (الداشبورد الرئيسي) لقينا المشاكل دي **من ناحية الباك**. باقي المشاكل اتصلّحت في الفرونت (مذكورة في الآخر للسياق). كل request هنا بحساب `admin@asab.sa` (دور admin، توكن Sanctum صالح).

---

## B1 — `/admin/notifications/preferences` بيرجع 404

إنت قلت قبل كده إن المسار ده موجود (`api.php:255-256`, role: admin)، لكنه **بيرجع 404**:

```
GET https://ivory-snail-183262.hostingersite.com/api/v1/admin/notifications/preferences
→ 404 Not Found
```

**المطلوب:** تأكيد إن الـ route متسجّل فعلاً ويرجّع شكل `NotificationPreferences`:
```jsonc
{
  "channels": {
    "inApp":   { "enabled": true },
    "email":   { "enabled": true, "address": "..." },
    "push":    { "enabled": false },
    "whatsapp":{ "enabled": false, "address": "..." }
  },
  "events": { "operation.created": { "inApp": true, "email": false, "push": false }, ... },
  "quietHours": { "enabled": false, "startsAt": "22:00", "endsAt": "07:00" }
}
```
ونفس الكلام لـ `PATCH /admin/notifications/preferences` (body = `Partial<NotificationPreferences>`).

> الفرونت بينده على المسار ده بالظبط (`useNotificationPreferences` / `useUpdateNotificationPreferences`). صفحة "تفضيلات الإشعارات" بتفضل بتحمّل (loading) بسببه.

---

## B2 — مصدر الموديولات لصفحة توزيع المحاسبين (admin)

ماتريكس **"توزيع المطاعم → حسب الموديول"** (admin) محتاجة قائمة الموديولات. الفرونت كان بينده:

```
GET /api/v1/company/me/lookups/modules → 404 Not Found
```

ده مسار **company-scoped**، وحساب الـ admin الـ `companyId` بتاعه `null` → بيفشل دايماً على صفحة admin.

**حل مؤقت في الفرونت:** بنستخدم قائمة موديولات ثابتة دلوقتي (المبيعات/المصروفات/المشتريات/المخزون/الشفتات/كشف الحساب/العهد النقدية/الأصول الثابتة) عشان نوقف الـ 404 والماتريكس ترجع تشتغل.

**المطلوب منكم (واحد من دول):**
1. توفّروا `GET /admin/lookups/modules` (admin-accessible) يرجّع:
   ```jsonc
   { "data": [ { "value": "sales", "labelAr": "المبيعات", "labelEn": "Sales" }, ... ] }
   ```
2. **و الأهم:** أكّدوا الـ `PUT /admin/accountants/{accId}/restaurants/{restaurant}/modules` بيتوقّع إيه في `modules[]`؟
   - **مفاتيح** (`["sales","expenses",...]`) ولا **أسماء عربية** (`["المبيعات","المصروفات",...]`)؟
   - الفرونت حالياً بيبعت **الأسماء العربية**. لو إنتوا متوقعين المفاتيح، قولوا وإحنا نعمل الـ mapping.

---

## B3 — سجل النشاطات: `action` كود خام بدون label بشري

```
GET /admin/audit-logs → rows = { action: "post.companies", entityType: "companies", actorName: "أمين النظام", occurredAt: "..." }
```

اللي بيتعرض للمستخدم = `post.companies` / `post.subscriptions` (مش مفهوم).

**حل مؤقت في الفرونت:** بنحوّل `post.companies → "إنشاء شركة"` بـ formatter (method + entity).

**المطلوب (تحسين، مش blocker):** ضيفوا حقل بشري جاهز لكل row:
```jsonc
{ "action": "post.companies", "descriptionAr": "إنشاء شركة جديدة", "descriptionEn": "Created a company", ... }
```
عشان منعملش reverse-engineering للأكواد على الفرونت.

---

## B4 — تأكيد شكل `AdminSettings` (توجيلز الإعدادات)

`GET /admin/settings` بيرجّع `{ notifications, backup, api, security }` كـ objects **مبهمة** (`Record<string,unknown>`). توجيلز كروت الإعدادات الـ4 في صفحة admin-settings **مش شغّالة** لأننا مش عارفين أسماء الحقول عشان نربطها ونحفظها بـ `PATCH /admin/settings`.

**المطلوب:** ابعتوا **أسماء الحقول الفعلية + أنواعها** لكل قسم، مثال متوقّع:
```jsonc
{
  "notifications": { "approvalNotifications": true, "subscriptionAlerts": true, "dailyPerformanceReports": false },
  "backup":        { "dailyAutoBackup": true, "weeklyBackup": true, "dataEncryption": true },
  "api":           { "erpConnection": true, "paymentGateway": false, "mobileApp": true },
  "security":      { "twoFactorRequired": false, "sessionDurationMinutes": 60, "passwordPolicy": "strong" }
}
```
وأكّدوا إن `PATCH /admin/settings` بياخد `Partial<AdminSettings>` بنفس الحقول دي. أول ما توصلنا الحقول هنربط الـ12 توجل ونحفظهم.

---

## B5 — `POST /admin/brands`: هل `companyId` مطلوب؟

ربطنا فورم "إضافة علامة تجارية" (admin). الفورم بيجمع **الاسم + المالك + الباقة** بس، وبيبعت:
```jsonc
POST /admin/brands  { "name": "...", "owner": "...", "plan": "silver|gold|platinum" }
```
**سؤال:** هل الـ endpoint بيتطلب `companyId` (لربط البراند بشركة)؟
- لو **آه** → محتاجين نضيف selector للشركة في الفورم؛ ابعتوا الـ validation (هل required؟ وإزاي نجيب قايمة الشركات — `GET /admin/companies`؟).
- لو **لأ** (البراند ممكن يتعمل بدون شركة) → تمام، سيبوه.

نفس السؤال لـ `useCreateAdminRestaurant` (`POST /admin/brands/{brandId}/restaurants`) — أكّدنا إنه بياخد `{name, city, status?}` بس؛ لو محتاج حقول تانية required قولوا.

---

## B6 — فلو مدير التقارير (A9/A10/A11): تأكيد العقود قبل ما نربط العرض

ضفنا الهوكس لـ **A9 (preview)** و**A10 (status)** و**A11 (periods)** + الموجود `upload`/`send`. قبل ما نربط شاشات الـ preview/status محتاجين تأكيد 4 حاجات:

1. **رد الـ upload** — `POST /admin/reports/{reportKey}/upload` (multipart `file`) بيرجّع إيه بالظبط؟ محتاجين `uploadId` عشان نمرّره لـ A9. أكّدوا الشكل:
   ```jsonc
   { "uploadId": "...", "parsedRows": 0, "preview": [ ... ]? }
   ```
2. **`type` في A9 preview** — العقد بيقول `type: "number" | "string"`. لكن شاشة الـ preview الحالية بتلوّن الصفوف حسب **income / expense / profit**. أكّدوا: الـ `type` ده **نوع القيمة** (رقم/نص) ولا **تصنيف مالي**؟ لو نوع القيمة بس، هنشيل التلوين المالي (مقبول) — بس أكّدوا.
3. **صيغة `period`** — A11 بترجّع `periods` بأي شكل (`"2025-10"`؟)؟ و A9/A10 بياخدوا `period` بنفس الصيغة؟
4. **`period` في الإرسال** — `POST /admin/reports/{reportKey}/send` — الـ body بياخد `period` كـ **range** `{from,to}` ولا **شهر واحد** `"YYYY-MM"`؟ (الهوك حالياً بيبعت `{from,to}`.)

أول ما توصلنا الإجابات هنربط الفلو كامل (upload → preview → send → status + period selector) في باتش واحد.

---

## للسياق فقط — اتصلّح في الفرونت (مش محتاج منكم حاجة)

| المشكلة | الإصلاح |
|---|---|
| `PUT /admin/permissions` → 422 (`matrix.matrix.module required`) | كان الفرونت بيعمل double-wrap (`{matrix:{matrix:[...]}}`). اتصلّح يبعت `{matrix:[{module,perms}]}` صح. |
| "إضافة مستخدم" — خطوة 2 (البراندات) فاضية فمش بتعدّي | البراندات كانت من ثابت فاضي؛ بقت من `GET /admin/brands`. |
| ماتريكس الموديولات فاضية | بقت من قائمة ثابتة (لحد ما B2 يتحل). |
| سجل النشاطات يعرض كود خام | اتعمل formatter عربي (لحد ما B3 يتحل). |
| "إضافة علامة تجارية" مكانتش بتبعت request | الفورم بقى controlled ومربوط بـ `POST /admin/brands` (مستني تأكيد B5). |
| "إضافة مطعم" مكانتش بتفتح فورm | اتعمل مودال مربوط بـ `POST /admin/brands/{brandId}/restaurants`. |
| "اشتراك جديد" مكانش بيفتح فورم | اتعمل مودال مربوط بـ `POST /admin/subscriptions` (A4). |

**لسه frontend wiring باقي (شغلنا، مش شغلكم):** فلو مدير التقارير (upload→preview→send→status — مستني تأكيد B6)، وتوجيلز الإعدادات (مستنية B4).
