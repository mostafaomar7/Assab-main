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

### دليل قاطع — الروت مش متعمله deploy على السيرفر اللايف

طلبات GET **بدون توكن** على السيرفر اللايف (`ivory-snail-183262.hostingersite.com/api/v1`):

| Endpoint | HTTP | الاستنتاج |
|---|---|---|
| `GET /head/reminders` | **404** | المسار **غير مُسجّل** على السيرفر ❌ |
| `GET /head/dashboard` | 500 | المسار **مُسجّل** (يخطئ بدون توكن لكنه موجود) ✅ |
| `GET /head/operations/pending` | 500 | المسار **مُسجّل** ✅ |
| `POST /reminders/broadcast` (جرّبناه GET) | 405 | المسار **مُسجّل** (GET غير مسموح لأنه POST) ✅ |

الفرق بين **404** و**500/405** قاطع: الروتات الموجودة بترجّع 500/405 (متسجّلة)، أما `/head/reminders` بيرجّع **404** = **مش متسجّل على السيرفر اللايف**.

**يعني:** تعديلات B-H1→B-H5 اتعملها deploy فعلاً، لكن **كود روتات `/head/reminders*` الجديد ماوصلش للسيرفر اللايف** (مش متعمله deploy، أو الـ route cache على السيرفر قديم بيستبعد الروتات الجديدة). «confirmed via route:list» كان على بيئة تانية مش على ivory-snail.

**المطلوب من الباك بالظبط:**
1. اعملوا **deploy للكود الجديد** على سيرفر Hostinger (ivory-snail) — مش بس على الـ local.
2. على السيرفر نفسه: `php artisan route:clear` (وامسحوا أي config/route cache).
3. أكّدوا بـ: `curl -i https://ivory-snail-183262.hostingersite.com/api/v1/head/reminders` لازم يرجّع **401** (مش 404).
