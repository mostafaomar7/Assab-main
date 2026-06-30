# Head Dashboard — Backend follow-ups

## B-H7 — مسارات `/head/reminders*` بترجّع 404 (مش live)

إنتوا قلتوا في رد B-H6 إنكم ضفتوا الـ platform surface للتذكيرات:
- `GET /api/v1/head/reminders`
- `POST /api/v1/head/reminders`
- `PATCH /api/v1/head/reminders/{id}`
- `POST /api/v1/head/reminders/mark-all-done`
- `DELETE /api/v1/head/reminders/{id}`

لكن `GET /api/v1/head/reminders` **بيرجّع 404**:

```
GET https://ivory-snail-183262.hostingersite.com/api/v1/head/reminders
→ 404 Not Found
{ "message": "The route api/v1/head/reminders could not be found.",
  "exception": "Symfony\\Component\\HttpKernel\\Exception\\NotFoundHttpException" }
```

**السبب الأرجح:** ده نفس اللي حذّرتوا منه — `route:cache` مش متعمله rebuild بسبب الـ **duplicate-route-name bug**. الروتات الجديدة موجودة في الكود بس مش متسجّلة في الـ route cache، فبتطلّع 404.

**المطلوب:**
1. صلّحوا الـ route loader / الـ duplicate-route-name bug وأعملوا `php artisan route:clear && php artisan route:cache` (أو deploy يعيد بناء الكاش).
2. أكّدوا إن الـ5 روتات دي بقت live بنفس الأسماء/البادئة، وإن الـ middleware بيسمح لدور head.
3. شكل الـ row المتوقّع (head-shaped): `{ id, type, icon, titleAr, titleEn, bodyAr, bodyEn, timeAr, done }` — الفرونت بيقرأ `titleAr/title`, `bodyAr/body`, `done/isDone` بمرونة.

**حالة الفرونت:** مكوّن `HeadReminders` جاهز ومربوط بالمسارات دي؛ دلوقتي بيعرض حالة فاضية بأمان (من غير كسر). أول ما الروتات تبقى live هيشتغل على طول.

> ملاحظة: باقي مسارات الـ B-H (dashboard, operations, erp, reports) شغّالة — دي تعديلات على روتات موجودة. بس روتات التذكيرات الجديدة هي اللي 404 (محتاجة rebuild للـ route cache).
