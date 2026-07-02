# Backend task — سطح دور مالك البراند (brand-owner)

## الخلفية
دلوقتي (B-A6) بقى ممكن الأدمن يعمل حساب **brand-owner** لما يضيف براند بـ `ownerEmail`،
والمالك بيتبعتله باسورد ويقدر يعمل **login**. لكن **مفيش أي endpoints مصرّح بيها للدور ده**،
فبعد الدخول مش هيلاقي بيانات. الـ task ده لبناء السطح.

`roleKey = brand-owner` · التوكن Sanctum عادي · كل المسارات تحت `/api/v1/brand-owner/*`
ومحمية بـ middleware يتأكد إن اليوزر **مالك للبراند** اللي بيطلبه (scope على براندات المالك بس).

الأظرف: object خام للـ single، `{data,meta}` للـ list، `{error:{code,message,messageAr},requestId}` للخطأ.
الفلوس **هللات integer** (÷100 = ريال). camelCase.

---

## نطاق الوصول
- المالك ممكن يملك **أكتر من براند** (نفس الشركة). كل الـ endpoints بترجّع بيانات برانداته بس.
- لو طلب براند مش بتاعه → **403** `{error:{code:"FORBIDDEN",...}}`.

---

## 1) براندات المالك (context / selector)
`GET /api/v1/brand-owner/brands`
```jsonc
{ "data": [
  { "id":"019f...", "name":"علامة الريم", "abbr":"ر", "color":"#7C3AED",
    "plan":"platinum", "subStatus":"active", "daysLeft":240,
    "restaurantsCount":3, "branchesCount":5, "modules":["sales","expenses"] }
], "meta": { "total": 1 } }
```

## 2) لوحة البراند (KPIs)
`GET /api/v1/brand-owner/brands/{brandId}/dashboard?period=YYYY-MM`
```jsonc
{
  "brandId":"019f...", "period":"2026-07",
  "kpis": {
    "netSales": 12500000,        // هللات
    "expenses": 4200000,
    "netProfit": 8300000,
    "restaurantsActive": 3,
    "branchesActive": 5
  },
  "trend": [ { "period":"2026-02", "netSales":0, "expenses":0 } ],  // آخر 6 شهور
  "topRestaurants": [ { "restaurantId":"019f...", "name":"...", "netSales":0 } ]
}
```

## 3) مطاعم/فروع البراند (read-only)
`GET /api/v1/brand-owner/brands/{brandId}/restaurants`
```jsonc
{ "data":[ { "id":"019f...", "name":"...", "city":"...", "status":"active",
             "branches":[ { "id":"019f...", "name":"...", "manager":"..." } ] } ] }
```

## 4) ملخص العمليات المالية للبراند (read-only)
`GET /api/v1/brand-owner/brands/{brandId}/operations?module=&restaurantId=&from=&to=&page=`
```jsonc
{ "data":[
  { "id":"019f...", "module":"sales", "restaurantName":"...", "amount":0,
    "operationDate":"2026-07-01", "status":"approved" }
], "meta":{ "page":1, "pageSize":20, "total":0, "totalPages":1 } }
```
> المالك **قراءة بس** — مفيش اعتماد/تعديل (ده دور المحاسب/رئيس الحسابات).

## 5) تقارير البراند (اختياري لكن مطلوب لاحقاً)
`GET /api/v1/brand-owner/brands/{brandId}/reports?type=&period=`
+ `GET .../reports/{reportKey}/download?period=` → ملف (blob).

## 6) بروفايل المالك
`GET /api/v1/brand-owner/me` → `{ id, name, email, brands:[...] }`
`POST /api/v1/auth/change-password` (الموجود) — يشتغل للدور ده.

---

## `defaultPage`
الباك بيرجّع `defaultPage = "brand-owner-dashboard"` للدور ده (متأكدين).
الفرونت محتاج يعمل route/slug للـ slug ده. **مرحلة لاحقة عندنا** — مش بلوكر للباك.

## أكواد الحالة
| الحالة | الكود |
|---|---|
| نجاح | 200 |
| براند مش بتاع المالك | 403 `FORBIDDEN` |
| براند مش موجود | 404 |
| بدون توكن / دور غلط | 401 |

## أسئلة للباك
1. المالك بيشوف العمليات **بعد الاعتماد النهائي بس** ولا كل الحالات؟
2. الـ `period` نفس صيغة باقي الموديولات (`"YYYY-MM"`)؟
3. في نموذج صلاحيات per-module للمالك ولا بيشوف كل موديولات البراند؟

**حالة الفرونت:** مفيش شاشات brand-owner لسه؛ هنبنيها بعد ما العقود دي تتأكد وتبقى live.
