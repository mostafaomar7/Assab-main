# Admin Dashboard — Backend follow-ups (found while wiring batch 1)

أثناء اختبار **دور الـ System Admin** (الداشبورد الرئيسي) لقينا المشاكل دي **من ناحية الباك**. باقي المشاكل اتصلّحت في الفرونت (مذكورة في الآخر للسياق). كل request هنا بحساب `admin@asab.sa` (دور admin، توكن Sanctum صالح).

---

## B1 — ✅ محلولة (الباك سجّل الـ route تحت بادئة admin)

الـ route كان موجود في الـ shared group بس (`/api/v1/notifications/preferences`) ومكانش تحت `/admin`. اتسجّل دلوقتي:
- `GET /admin/notifications/preferences`
- `PATCH /admin/notifications/preferences` (body = `Partial<NotificationPreferences>`)

الفرونت بالفعل بينده على المسار الصح (`useNotificationPreferences` / `useUpdateNotificationPreferences`) فالصفحة هتشتغل من غير تعديل عندنا.

> ⚠️ **caveat مفتوح:** `channels.whatsapp` بيرجع `{ enabled }` بس — **من غير `address`** (مفيش عمود لسه). `email` بيرجع `address`. لو محتاجين حقل رقم واتساب، الباك قال يضيف عمود + migration — **نأكد لهم لو محتاجينه**.

---

## B2 — ✅ محلولة (lookup جديد + بنبعت المفاتيح)

- **B2.1:** الباك ضاف `GET /admin/lookups/modules` (admin-accessible)، كل row فيه `value`+`key` (نفس القيمة) + `labelAr`/`labelEn`/`icon`. الفرونت بقى بيستخدمه (`useAdminModules`) بدل `/company/me/lookups/modules` اللي كان بيرجّع 404.
- **B2.2:** الباك أكّد: نبعت **المفاتيح** (`["sales","expenses",...]`) مش الأسماء العربية. الـ `PUT /admin/accountants/{accId}/restaurants/{restaurant}/modules` بيخزّن `modules[]` كما هي في `module_keys` واللي بتقراها طبقة الـ gating كمفاتيح. الفرونت اتعدّل يبعت `value`/`key` من الـ lookup. **تم.**

> ⚠️ **قيد مفتوح من الباك:** الـ data model بيخزّن قائمة موديولات **واحدة flat لكل محاسب**، مش لكل (محاسب × مطعم). يعني الـ endpoint بيطبّق الموديولات على المحاسب **عبر كل مطاعمه**. الاختلاف per-restaurant مش متخزّن لسه (محتاج schema change). الـ UI عندنا بيوزّع per-restaurant — **محتاجين نتفق:** نخلّي الماتريكس per-accountant بس، ولا نطلب منهم schema change للـ per-restaurant؟

---

## B3 — ✅ محلولة (الباك بيرجّع labels جاهزة)

`GET /admin/audit-logs` و `/{id}` بقوا بيرجّعوا `descriptionAr` + `descriptionEn` جاهزين لكل row. الفرونت بقى بيستخدمهم مباشرة (والـ formatter القديم بقى fallback بس للـ rows القديمة). **تم.**

```jsonc
{ "action": "post.companies", "descriptionAr": "إنشاء شركة", "descriptionEn": "Created company", ... }
```

---

## B4 — ✅ محلولة (أسماء الحقول اتأكدت، الـ12 توجل اتربطوا)

الباك بعت أسماء الحقول النهائية وربطنا الـ12 control عليها (11 boolean + 1 integer). تصحيحات على تخميننا:
- `api.paymentGatewayConnection` (مش `paymentGateway`)
- `api.mobileAppInterface` (مش `mobileApp`)
- `security.twoFactorAuthRequired` (مش `twoFactorRequired`)
- `security.passwordPolicyEnabled` = **boolean** (مش string `"strong"`)
- `security.sessionDurationMinutes` = integer دقائق

```jsonc
{
  "notifications": { "approvalNotifications": true, "subscriptionAlerts": true, "dailyPerformanceReports": false },
  "backup":        { "dailyAutoBackup": true, "weeklyBackup": true, "dataEncryption": true },
  "api":           { "erpConnection": true, "paymentGatewayConnection": false, "mobileAppInterface": true },
  "security":      { "twoFactorAuthRequired": false, "sessionDurationMinutes": 60, "passwordPolicyEnabled": true }
}
```
`PATCH /admin/settings` بياخد deep partial merge → بنبعت section/key واحد في المرة. **تم.**

---

## B5 — ✅ محلولة في الفرونت (مش محتاج منكم حاجة)

`POST /admin/brands` بيتطلب `companyId` (اتأكد بـ422: `The company id field is required`). ضفنا **selector للشركة** في فورم إضافة العلامة (من `GET /admin/companies`) وبنبعت `companyId` دلوقتي. لو عندكم تعليق على الحقل سيبوه؛ غير كده تمام.

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
