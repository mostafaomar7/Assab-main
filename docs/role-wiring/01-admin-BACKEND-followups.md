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

## للسياق فقط — اتصلّح في الفرونت (مش محتاج منكم حاجة)

| المشكلة | الإصلاح |
|---|---|
| `PUT /admin/permissions` → 422 (`matrix.matrix.module required`) | كان الفرونت بيعمل double-wrap (`{matrix:{matrix:[...]}}`). اتصلّح يبعت `{matrix:[{module,perms}]}` صح. |
| "إضافة مستخدم" — خطوة 2 (البراندات) فاضية فمش بتعدّي | البراندات كانت من ثابت فاضي؛ بقت من `GET /admin/brands`. |
| ماتريكس الموديولات فاضية | بقت من قائمة ثابتة (لحد ما B2 يتحل). |
| سجل النشاطات يعرض كود خام | اتعمل formatter عربي (لحد ما B3 يتحل). |

**لسه frontend wiring باقي (شغلنا، مش شغلكم):** فورمات "إضافة علامة تجارية / إضافة مطعم / اشتراك جديد"، وفلو مدير التقارير (upload→preview→send→status)، وتوجيلز الإعدادات (مستنية B4).
