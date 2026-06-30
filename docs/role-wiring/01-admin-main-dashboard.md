# تحليل دور: System Admin — الداشبورد الرئيسي (ASABPrototype)

> **طريقة التحليل:** API-contract لكل عنصر — كل زرار / فورم / جدول / matrix / توجل / فلتر / KPI مع الـ endpoint (method + path)، الـ request body، والـ response. وللعناصر الناقصة فيه **فورم مقترح كامل + endpoint مقترح**. (مش SRS مجرّد.)
>
> الملف ده بيغطي **دور الأدمن بالكامل** (9 صفحات) من أول الـ overview لآخر صفحة settings — متسابش زرار ولا فورم ولا جدول.

## مفتاح الحالة (State legend)

| الحالة | المعنى |
|---|---|
| **WIRED** | مربوط بهوك حقيقي بيضرب endpoint فعلي (مؤكد من كود الهوك). |
| **STATIC** | داتا ثابتة أو state محلي بس — مفيش API. |
| **NO-FORM** | زرار موجود بس مفيش فورم/فعل حقيقي وراه (أو navigation بس). |
| **(proposed)** | endpoint أو فورم مقترح — لسه مش موجود في الكود/الباك. |

ملاحظات عامة:
- كل المسارات تحت `/api/v1`. الفلوس **integer halalas** (SAR×100). المفاتيح camelCase.
- الهوكس الأساسية في `src/api/queries/platform/admin.ts`؛ بعض الكيانات في `src/api/queries/*.ts`.
- "هوك موجود بس مش متربط" = الباك جاهز، الفرونت بس مش بينده عليه → **إصلاح frontend مش شغل باك**.

---

## ملخص الصفحات التسعة

| # | الصفحة | pageId | الحالة العامة |
|---|---|---|---|
| 1 | AdminOverview | `admin-overview` | مربوطة (قراءة عبر `GET /admin/overview`) — فجوة فعل واحدة (Renew/Activate بينقل بس) |
| 2 | AdminUsers | `admin-users` | **مربوطة بقوة** — CRUD + import + distribution + modules كلها wired |
| 3 | AdminRestaurants | `admin-restaurants` | شجرة مقروءة (`GET /admin/brands`) لكن أغلب الأزرار NO-FORM + باج renew + uploads static |
| 4 | AdminSubscriptions | `admin-subscriptions` | مربوطة (toggle + renew) لكن 3 mutations dead-ended + أزرار edit بدون فعل |
| 5 | AdminCompanies | `admin-companies` | **مربوطة كويس** — list/create/suspend/activate/upgrade — 3 أزرار detail ميتة |
| 6 | AdminReports | `admin-reports` | upload/preview/send كلها **local-state** والهوكس موجودة مش متربطة |
| 7 | AdminAudit | `admin-audit` | list + export wired؛ الفلاتر client-side (server filter متاح مش مستخدم) |
| 8 | AdminPermissions | `admin-permissions` | matrix load + save wired؛ clone محلي (endpoint موجود) + reset no-op |
| 9 | AdminSettings | `admin-settings` | الـ account sub-pages كلها wired؛ الـ4 كروت العلوية **static** (settings endpoint موجود مش مربوط) |

---

## AdminOverview (`admin-overview`)

**Purpose:** صفحة هبوط الأدمن — KPIs متعددة المستأجرين، قائمة هيكل البراندات (قابلة للنقر)، تايلات quick-action، وتنبيهات انتهاء الاشتراك، + زرار "مستخدم جديد" في الهيدر بيفتح wizard من 3 خطوات.

| Element | Type | Behavior | State | Endpoint | Request body | Response | Gap/Proposed |
|---|---|---|---|---|---|---|---|
| عنوان/وصف الهيدر | data | نص ثابت | STATIC | — | — | — | ديكور |
| زرار **"New User"** (هيدر) | button | `setModal("add-user")` يفتح `AddUserModal` | WIRED (غير مباشر) | submit → `POST /admin/users` | شوف submit تحت | `AdminUserRow` | الزرار بيفتح المودال بس |
| KPI **Brands** | KPI | `kpis.brandCount ?? 0` | WIRED | `GET /admin/overview` (`useAdminOverview`) | — (query) | `kpis.brandCount:number` | — |
| KPI **Restaurants & Branches** | KPI | `kpis.restaurantCount` / `kpis.branchCount` | WIRED | `GET /admin/overview` | — | `kpis.restaurantCount`, `kpis.branchCount` | — |
| KPI **Active Users** | KPI | `kpis.activeUserCount ?? 0` | WIRED | `GET /admin/overview` | — | `kpis.activeUserCount:number` | — |
| KPI **Need Renewal** | KPI | `kpis.brandsNeedingRenewal` | WIRED | `GET /admin/overview` | — | `kpis.brandsNeedingRenewal:number` | — |
| **Brand Hierarchy** list (abbr/name/restaurantCount/branchCount/plan/subStatus) | table | `o.brandHierarchy[]`؛ row click → `navigate("admin-restaurants")` | WIRED | `GET /admin/overview` | — | `brandHierarchy: Array<{id;name;abbr?;color?;restaurantCount;branchCount;plan?;subStatus?;daysLeft?}>` | row click navigation بس |
| "Full management" | button | `navigate("admin-restaurants")` | NO-FORM | — | — | — | تنقّل |
| Quick Action — New User | button | `setModal("add-user")` | WIRED (غير مباشر) | `POST /admin/users` | شوف AddUserModal | `AdminUserRow` | يفتح المودال |
| Quick Action — New Restaurant / Assign Accountants / Subscriptions / Permissions / Activity Log | button | `navigate(...)` | NO-FORM | — | — | — | تنقّل بس |
| **Subscription Alerts** (شرطي) | data | فلترة محلية لـ `brandHierarchy` (subStatus ∈ warning/danger/expired) | WIRED (derived) | `GET /admin/overview` | — | من `brandHierarchy[].subStatus`/`.daysLeft` | الفلترة client-side |
| Alerts "Manage" | button | `navigate("admin-subscriptions")` | NO-FORM | — | — | — | تنقّل |
| Per-alert **Renew / Activate** | button | `navigate("admin-subscriptions")` (label بيتغير حسب expired) | NO-FORM | — | — | — | **Gap:** اللابل بيوحي بفعل بس بينقل. المفروض ينفّذ في مكانه (تحت) |

**هوك مؤكد:** `useAdminOverview()` → `GET /admin/overview` (بدون body, `staleTime 15s`). Response `PlatformAdminOverview`:
```
{ kpis:{brandCount,restaurantCount,branchCount,activeUserCount,brandsNeedingRenewal,uptime},
  brandHierarchy:[{id,name,abbr?,color?,restaurantCount,branchCount,plan?,subStatus?,daysLeft?}],
  expiringBrands?:[...], accountantsByRole?:Record<string,number> }
```

**AddUserModal submit** (الكتابة الوحيدة من الصفحة دي): wizard 3 خطوات → `onAdd(...)` → الأب بيحوّل اللابل العربي لـ roleKey ويستدعي `createAdminUserMut.mutate`.

| Element | State | Endpoint | Request body | Response |
|---|---|---|---|---|
| زرار **Add User** (submit) | WIRED | `POST /admin/users` (`useCreateAdminUser`) | `{name, email, phone, role, brands[], restaurants[], branches[], modules[], reportsTo, scope, status}` (role mapped: محاسب→accountant, رئيس حسابات→head, مدير فرع→branch, مدير مشتريات→procurement, مورد→supplier, أدمن→admin) | `AdminUserRow` |

**حقول المودال:** Full Name (`name`, required) · Email (`email`) · Mobile (`phone`) · Role (6 cards, required) · Brands (multi, required إلا المورد) · Restaurants (multi/single لمدير الفرع) · Branch (radio، مدير فرع بس) · Modules (multi، default `["المبيعات","المصروفات"]`) · Reports To (dropdown، accountant/branch بس — **options ثابتة حالياً**). `scope` auto، `status="active"`.

### Proposed forms / endpoints — AdminOverview

1. **Renew inline** (alert، `subStatus !== expired`): فورم صغير حقل **Months** (`months`:number, required, 1–36, default 12). مقترح: `POST /admin/brands/{brandId}/subscription/renew` body `{months}` → `{brandId,subStatus,daysLeft,expiresAt}` (مرآة لـ per-restaurant renew الموجود).
2. **Activate inline** (`subStatus === expired`): بدون فورم. مقترح: `POST /admin/brands/{brandId}/subscription/activate` body `{}` → `{brandId,subStatus:"active",daysLeft,expiresAt}`.
3. **Reports-To data-driven:** بدل الـ options الثابتة → `GET /admin/users?role=head` (مدعوم بالفعل عبر `useAdminUsers(filter)`)، submit الـ id بدل النص.

---

## AdminUsers (`admin-users`)

**Purpose:** إدارة مستخدمي المنصّة. تابين: (1) **User List** — روستر قابل للبحث/الفلترة + KPI أدوار + صفوف تفصيلية + wizard "مستخدم جديد" + CSV import؛ (2) **Distribute Restaurants** — 3 أوضاع توزيع تربط هرمية المحاسب↔رئيس الحسابات، تعيين المطاعم لكل محاسب، و**matrix صلاحيات الموديولات** لكل مطعم. الداتا عبر `useAdminUsers` (`GET /admin/users`) و`useAdminDistribution` (`GET /admin/distribution`).

### Header & tabs

| Element | Type | Behavior | State | Endpoint | Request body | Response | Gap/Proposed |
|---|---|---|---|---|---|---|---|
| Subtitle "{users.length} users…" | data | `users.length` | WIRED | `GET /admin/users` (`useAdminUsers`, `params:filter`) | `AdminUsersFilter` | `Page<AdminUserRow>` أو `AdminUserRow[]` | — |
| **Import CSV** + file input | button/form | `importUsersMut.mutate(f)` | WIRED | `POST /admin/users/import` (`useImportAdminUsers`, multipart) | field **`file`**: File (CSV) | `{imported:number, skipped:number, errors:[{row,field,message}]}` | — |
| **New User** | button | `setModal("add-user")` | NO-FORM (يفتح المودال) | — | — | — | submit في المودال |
| Tab User List / Distribute | filter/tab | `setUsersTab(...)` | STATIC | — | — | — | view toggle |

### List tab — KPIs, filters, table

| Element | Type | Behavior | State | Endpoint | Request body | Response | Gap/Proposed |
|---|---|---|---|---|---|---|---|
| 6 role KPI cards (`byRole[r]`) | KPI | count client-side؛ click → `roleFilter` | WIRED (derived) / filter | `GET /admin/users` | — | counts من `AdminUserRow[]` | — |
| Search box | filter | client-side name/email | STATIC | — | — | — | مقترح `?search=` |
| Role dropdown | filter | client-side `u.role` | STATIC | — | — | — | مقترح `?role=` |
| Brand dropdown | filter | client-side | STATIC | — | — | — | مقترح `?brand=` |
| User list rows | table | يعرض `shown` (filtered)؛ click → `expandedRow` | WIRED | `GET /admin/users` | — | `AdminUserRow[]` (name,email,phone,role,scope,status,brands[]) | — |
| Empty state | data | لما `shown.length===0` | STATIC | — | — | — | — |
| Expanded: Brands/Restaurants/Branches/Modules | data | من `u.*` | WIRED (data) / STATIC (brand color) | `GET /admin/users` | — | `AdminUserRow` arrays | brand color من ثابت محلي |
| Expanded: **Last Login** | data | array ثابت `i%10` | STATIC | — | — | — | أضف `lastLoginAt:string\|null` لـ `AdminUserRow` |
| Expanded: **Created At** | data | array ثابت `i%10` | STATIC | — | — | — | أضف `createdAt:string` |
| Expanded: Reports to | data | `u.reportsTo` | WIRED | `GET /admin/users` | — | `reportsTo:string` | — |
| Row action **Edit Permissions** | button | لا `onClick` | NO-FORM | — | — | — | **(proposed)** edit modal → `PATCH /admin/users/{id}` (`useUpdateAdminUser` موجود) |
| Row action **Reset Password** | button | لا `onClick` | NO-FORM | — | — | — | **(proposed)** `POST /admin/users/{id}/reset-password` |
| Row action **Delete** | button | optimistic + `deleteUserMut.mutate(id)` | WIRED | `DELETE /admin/users/{id}` (`useDeleteAdminUser`) | path `id` | `204` | — |
| Activate/Deactivate (هوك موجود مش مستخدم) | — | — | — | `POST /admin/users/{id}/activate` / `/deactivate` | path `id` | `AdminUserRow` | status badge read-only حالياً |

### Add-User wizard (`AddUserModal`)

submit → `onAdd` → `createAdminUserMut.mutate({...u, role:roleKey})`.

| Element | Type | State | Body field | ملاحظة |
|---|---|---|---|---|
| Full Name | form | submit | `name:string` (required) | يفتح step 0 |
| Email | form | submit | `email:string` | optional في الـ UI |
| Mobile | form | submit | `phone:string` | **مش في type الهوك** → وسّعه |
| Role (6 cards) | form | submit | `role:string` (mapped) | default محاسب |
| Brands (checkbox) | form | submit | `brands:string[]` | required إلا المورد؛ options ثابتة |
| Restaurants | form | submit | `restaurants:string[]` | options ثابتة |
| Branch (radio) | form | submit | `branches:string[]` | مدير فرع بس |
| Modules (checkbox) | form | submit | `modules:string[]` | default المبيعات+المصروفات |
| Reports To (dropdown) | form | submit | `reportsTo:string` | **options ثابتة (اسمين)** |
| **Add User** (submit) | form submit | WIRED | `POST /admin/users` | `AdminUserRow` |
| Back/Cancel/Next | button | STATIC | — | wizard محلي |

### Distribute tab — KPIs + mode switch

مصدر التاب: `useAdminDistribution()` → `GET /admin/distribution` → `{accountants[]:{id,name,avatar,headId,restaurants[],modulesByRestaurant}, heads[], allRestaurants[]}`.

| Element | Type | State | Endpoint | Response |
|---|---|---|---|---|
| KPI Heads / Assigned Accountants / Assigned Restaurants / Unassigned | KPI | WIRED (derived) | `GET /admin/distribution` | `heads[]`/`accountants[]`/`allRestaurants[]` |
| Mode switch (By Restaurant / By Module / Assign to Heads) | tab | STATIC | — | — |

### Distribute — Mode 1 "By Restaurant"

| Element | Type | State | Endpoint | Request body |
|---|---|---|---|---|
| Heads/Accountants columns | table | WIRED (read) | `GET /admin/distribution` | — |
| "Move to head: +{head}" (unassigned) | button | WIRED | `PATCH /admin/accountants/{accId}/assignments` (`useUpdateAccountantAssignments`) | `{headId?:string\|null, restaurants:string[]}` |
| Restaurants — assigned "✕" remove | matrix/button | WIRED | `PATCH /admin/accountants/{accId}/assignments` | `{headId, restaurants[]}` (بعد الحذف) |
| Restaurants — "+" add | matrix/button | WIRED | `PATCH /admin/accountants/{accId}/assignments` | `{headId, restaurants[]}` (بعد الإضافة) |
| Full Distribution Summary | data | WIRED (read) | `GET /admin/distribution` | — |

> `useAssignRestaurant`/`useUnassignRestaurant`/`useMoveToHead` موجودين بس الكومبوننت بيستخدم الـ consolidated `PATCH …/assignments`.

### Distribute — Mode 2 "By Module"

| Element | Type | State | Endpoint | Request body |
|---|---|---|---|---|
| Accountants + search | filter/table | STATIC filter / WIRED data | `GET /admin/distribution` | — |
| "✓ Enable all" / "✕ Clear all" | button | WIRED (loop) | `PUT /admin/accountants/{accId}/restaurants/{restaurant}/modules` (`useSetAccountantRestaurantModules`) | `{modules:string[]}` (كامل / `[]`) |
| Module matrix (rows=restaurants, cols=modules) | matrix | WIRED | cols: `GET /company/me/lookups/modules` (`useLookup`)؛ data: `GET /admin/distribution` | — |
| Matrix cell toggle | toggle | WIRED | `PUT …/restaurants/{restaurant}/modules` | `{modules:string[]}` (بعد التبديل) |
| "الكل" per-row toggle | toggle | WIRED | `PUT …/restaurants/{restaurant}/modules` | `{modules:[all]}` أو `{modules:[]}` |

### Distribute — Mode 3 "Assign Accountants to Heads"

| Element | Type | State | Endpoint | Request body |
|---|---|---|---|---|
| All-accountants list | table | WIRED (read) | `GET /admin/distribution` | — |
| "✕" unassign | button | WIRED | `PATCH /admin/accountants/{accId}/assignments` | `{headId:null, restaurants[]}` |
| Head panels (assign selected) | matrix/button | WIRED | `PATCH /admin/accountants/{accId}/assignments` | `{headId:head.id, restaurants[]}` |
| Head panel chips "✕" | button | WIRED | `PATCH /admin/accountants/{accId}/assignments` | `{headId:null, restaurants[]}` |

### Proposed forms / endpoints — AdminUsers

1. **Edit User modal** (Edit Permissions) — submit `PATCH /admin/users/{id}` (`useUpdateAdminUser` موجود). الحقول: name/email/phone/role/brands/restaurants/branches/modules/reportsTo/status. Response `AdminUserRow`.
2. **Reset Password** — **(proposed)** `POST /admin/users/{id}/reset-password` body `{sendEmail?:boolean}` → `{ok:true, emailSent:boolean, tempPassword?:string}`.
3. **توسيع body الإنشاء** — أضف `phone:string` و`sendLoginEmail:boolean` لـ `POST /admin/users` (المودال بيجمع `phone` بالفعل + checkbox "Send login email").
4. **فلترة server-side** — مرّر `search/role/brand` كـ query لـ `GET /admin/users` (وسّع `AdminUsersFilter`).
5. **حقول `AdminUserRow`** — أضف `lastLoginAt` و`createdAt`.
6. **Reports-To** — من `GET /admin/users?role=head`.

**Endpoints مؤكدة:** `GET/POST /admin/users`, `POST /admin/users/import` (multipart `file`), `DELETE /admin/users/{id}`, `PATCH /admin/users/{id}` (مش مستخدم), `GET /admin/distribution`, `PATCH /admin/accountants/{accId}/assignments` `{headId?,restaurants[]}`, `PUT /admin/accountants/{accId}/restaurants/{restaurant}/modules` `{modules[]}`, `GET /company/me/lookups/modules`.

---

## AdminRestaurants (`admin-restaurants`)

**Purpose:** شجرة العمليات (brands → restaurants → branches) مدفوعة بـ `GET /admin/brands`. تابين: "Structure" (أكورديون + شرائط اشتراك per-restaurant + renew/change-plan) و"Upload Data" (رفع جماعي: shared-data للبراند، employees للمطعم، fixed-assets للفرع). ملاحظة: `useAdminRestaurantSubscriptions()` بتتنده بس **النتيجة بتترمى**، وبانل الاشتراك بيشتغل على seed محلي ثابت.

**مصادر مربوطة:** `useAdminBrands()` → `GET /admin/brands` → `AdminBrand[]` (شجرة كاملة)؛ `useRenewSubscription()` → `POST /admin/subscriptions/{id}/renew` `{months}`.

| Element | Type | Behavior | State | Endpoint | Request body | Response | Gap/Proposed |
|---|---|---|---|---|---|---|---|
| الهيدر + counts | data | من `BRANDS` | WIRED | `GET /admin/brands` | `AdminBrandsFilter` | `AdminBrand[]` (nested) | counts client-side |
| **"New Restaurant"** (هيدر) | button | `setShowAddRest("")` — **مفيش مودال بيظهر** | NO-FORM | — | — | — | محتاج مودال → `POST /admin/brands/{brandId}/restaurants` (`useCreateAdminRestaurant` موجود مش مستخدم) |
| **"New Brand"** (هيدر) | button | يفتح فورم inline | WIRED(UI)/STATIC(submit) | — | — | — | الفورم موجود بس Save static → اربطه بـ `useCreateAdminBrand` |
| Tabs Structure/Upload | tab | `setRestTab` | STATIC | — | — | — | view |
| **Add Brand form** (Name/Owner/Plan) | form | inputs **uncontrolled**؛ Save بيقفل بس | STATIC | — | — | — | اربط بـ `POST /admin/brands` |
| Add Brand "✓ Save" | button | بيقفل بس | STATIC | — | — | — | bind `useCreateAdminBrand.mutate` |
| Add Brand Cancel / X | button | بيقفل | STATIC | — | — | — | UI |
| Brands accordion | table | `BRANDS.map`؛ toggle | WIRED (read) | `GET /admin/brands` | — | `AdminBrand[]` (id,name,abbr,color,plan,subStatus,owner,ownerEmail,modules[],restaurants[]) | read-only |
| Brand stats / badges / modules strip | data | من brand | WIRED (read) | `GET /admin/brands` | — | same | read-only |
| Restaurant row | table | `brand.restaurants.map` | WIRED (read) | `GET /admin/brands` | — | `restaurants[]:{id,name,city,status,branches[],accountants}` | read-only |
| Restaurant status/plan/daysLeft badges | data | status من API؛ plan/daysLeft من **seed محلي** | MIXED | `GET /admin/brands` (status بس) | — | `rest.status` | الباقي من `restSubs` الثابت |
| Restaurant **"Renew/Activate"** | button | `renewSub(rest.id)` → local + `renewSubMut.mutate({id})` | WIRED | `POST /admin/subscriptions/{id}/renew` | `{months}` (undefined) | `AdminSubscription` | **باج:** بيبعت restaurant id لـ subscription endpoint. المفروض `useRenewRestaurantSubscription` |
| Restaurant **Edit** (pencil) | button | لا `onClick` | NO-FORM | — | — | — | مقترح `PATCH /admin/restaurants/{id}` (`useUpdateAdminRestaurant`) |
| Restaurant chevron | button | toggle | STATIC | — | — | — | UI |
| Subscription strip (expanded) | data | من `restSubs` المحلي | STATIC | — | — | — | المفروض من `GET /admin/restaurants/subscriptions` |
| Strip "Reactivate/Renew" | button | `renewSub(rest.id)` | WIRED (نفس الباج) | `POST /admin/subscriptions/{id}/renew` | `{months}` | `AdminSubscription` | استخدم per-restaurant renew |
| Strip **"Change Plan"** | button | لا `onClick` | NO-FORM | — | — | — | مقترح `POST /admin/subscriptions/{id}/change-plan` `{plan}` |
| Branches **"Add Branch"** (+) | button | لا `onClick` | NO-FORM | — | — | — | `POST /admin/restaurants/{restaurantId}/branches` (`useCreateAdminBranch` موجود) |
| Branch row | table | `rest.branches.map` | WIRED (read) | `GET /admin/brands` | — | `branches[]:{name,manager}` | read-only |
| Branch **Edit** (pencil) | button | لا `onClick` | NO-FORM | — | — | — | `PATCH /admin/branches/{id}` (`useUpdateAdminBranch`) |
| Branch **Users** | button | لا `onClick` | NO-FORM | — | — | — | reuse `/admin/users` filter |
| "Add restaurant to {brand}" footer | button | لا `onClick` | NO-FORM | — | — | — | `POST /admin/brands/{brandId}/restaurants` |
| Upload tab — Brand search | filter | client filter | STATIC | — | — | — | client |
| Upload brand selector cards | filter | `setUploadBrand`؛ count من seed | STATIC | — | — | — | من upload-status |
| Shared-data: **Sales Items** upload | button/form | `setUploaded(...,"sales")` boolean بس | STATIC | — | — | — | `POST /admin/brands/{brandId}/upload/sales` (multipart) (`useAdminUploadBrand`) |
| Shared-data: **Purchase Materials** upload | button/form | local | STATIC | — | — | — | `POST /admin/brands/{brandId}/upload/materials` (multipart) |
| Shared-data: **Suppliers** upload | button/form | local | STATIC | — | — | — | `POST /admin/brands/{brandId}/upload/suppliers` (multipart) |
| Upload card **Template** download | button | لا `onClick` | NO-FORM | — | — | — | `GET /admin/upload/templates/{type}` (blob) (`useAdminUploadTemplate`) |
| Per-restaurant Employees search | filter | client | STATIC | — | — | — | client |
| Employees table (status/dates) | table | status من seed؛ dates ثابتة | STATIC | — | — | — | `GET /admin/brands/{brandId}/upload-status` (`useAdminBrandUploadStatus`) |
| Employees **Upload/Update** | button/form | local flip | STATIC | — | — | — | `POST /admin/restaurants/{restaurantId}/upload/employees` (multipart) (`useAdminUploadEmployees`) |
| Employees **Download** template | button | لا `onClick` | NO-FORM | — | — | — | `GET /admin/upload/templates/employees` |
| Per-branch Fixed Assets table | table | seed محلي | STATIC | — | — | — | upload-status per branch |
| Fixed-assets **Upload/Update** | button/form | local | STATIC | — | — | — | `POST /admin/branches/{branchId}/upload/fixed-assets` (multipart) (`useAdminUploadFixedAssets`) |
| Fixed-assets **Download** template | button | لا `onClick` | NO-FORM | — | — | — | `GET /admin/upload/templates/fixed-assets` |
| Upload Summary KPIs | KPI | من seed محلي | STATIC | — | — | — | احسبها من `AdminBrandUploadStatus` |

### Proposed forms / endpoints — AdminRestaurants

كل دول الهوكس **موجودة** — شغل ربط مش شغل باك:
1. **Add Brand** → `POST /admin/brands` body `{name, owner?, companyId?, abbr?, color?, ownerEmail?, plan, modules?}` → `AdminBrand` (خلّي الـ inputs controlled).
2. **Add Restaurant** → `POST /admin/brands/{brandId}/restaurants` body `{name, city, status?}` → `AdminRestaurant`. الحقول: brandId(select,req), name(req), city(req), status(default active).
3. **Add Branch** → `POST /admin/restaurants/{restaurantId}/branches` body `{name, manager?, managerUserId?, city?, address?, phone?}` → `AdminBranch`.
4. **Edit Restaurant** → `PATCH /admin/restaurants/{id}` body `Partial<AdminRestaurant>`.
5. **Edit Branch** → `PATCH /admin/branches/{id}` body `Partial<AdminBranch>`.
6. **إصلاح renew** → استخدم `useRenewRestaurantSubscription` → `POST /admin/restaurants/{restaurantId}/subscription/renew` body `{months?}`.
7. **Change Plan** → `POST /admin/subscriptions/{id}/change-plan` body `{plan}`.
8. **6 رفعات** → multipart hooks موجودة (`sales/materials/suppliers/employees/fixed-assets` + templates blob + upload-status).

---

## AdminSubscriptions (`admin-subscriptions`)

**Purpose:** إدارة اشتراكات البراندات. مدفوعة بالكامل بـ `GET /admin/subscriptions` (mapped في `useEffect`، مفيش seed). KPIs + كروت per-brand + شريط انتهاء + **auto-reminder toggle** + renew/activate + بانل تفصيلي.

**مصادر/mutations:** `useAdminSubscriptions()` → `GET /admin/subscriptions` → `AdminSubscription[]`؛ `useRenewSubscription()` (`POST …/{id}/renew` `{months}`)؛ `useChangeSubscriptionPlan()`/`useSuspendSubscription()`/`useActivateSubscription()` **معرّفة بس متنادى عليها أبداً** (`void`)؛ `useToggleAutoReminder()` (`POST …/{id}/toggle-auto-reminder` `{enabled}`) **WIRED**.

| Element | Type | Behavior | State | Endpoint | Request body | Response | Gap/Proposed |
|---|---|---|---|---|---|---|---|
| الهيدر + counts | data | derived | WIRED (read) | `GET /admin/subscriptions` | `AdminSubscriptionsFilter` | `AdminSubscription[]` | — |
| **"New Subscription"** | button | لا `onClick` | NO-FORM | — | — | — | مقترح `POST /admin/subscriptions` (مفيش create hook) |
| KPI Active/Expiring/Expired/Branches | KPI | derived | WIRED (derived) | `GET /admin/subscriptions` | — | per row | client-side |
| كروت per-brand | table | `subs.map`؛ expand | WIRED (read) | `GET /admin/subscriptions` | — | mapped `SubCard` | read-only |
| badges/progress bar | data | plan/status/expiresAt/daysLeft | WIRED (read) | `GET /admin/subscriptions` | — | same | read-only |
| **Auto-Reminder toggle** | toggle | local + `toggleReminderMut.mutate({id,enabled})` | **WIRED** | `POST /admin/subscriptions/{id}/toggle-auto-reminder` | `{enabled:boolean}` | `AdminSubscription` | initial من `reminderEnabled` |
| **"Renew/Activate"** | button | local + `renewMut.mutate({id})` | **WIRED** | `POST /admin/subscriptions/{id}/renew` | `{months}` (undefined) | `AdminSubscription` | "Activate" بينده renew مش `useActivateSubscription` |
| chevron expand | button | toggle | STATIC | — | — | — | UI |
| Modules / Restaurants / Billing (expanded) | data | من `sub` | WIRED (read) | `GET /admin/subscriptions` | — | modules[]/restaurants[]/plan | `monthlyPrice` mapped مش معروض |
| **"Edit Plan"** | button | لا `onClick` | NO-FORM | — | — | — | اربط `onChangePlan` → `POST …/{id}/change-plan` `{plan}` |
| **"Add Restaurant"** | button | لا `onClick` | NO-FORM | — | — | — | `POST /admin/brands/{brandId}/restaurants` |
| **"Edit Modules"** | button | لا `onClick` | NO-FORM | — | — | — | `PATCH /admin/companies/{id}/modules` أو endpoint جديد |
| Suspend (منطق موجود، مفيش UI) | button | `onSuspendSub` معرّف مش متنادى | WIRED-unbound | `POST /admin/subscriptions/{id}/suspend` | — (id) | `AdminSubscription` | أضف زرار |
| Activate (منطق موجود، مفيش UI) | button | `onActivateSub` معرّف مش متنادى | WIRED-unbound | `POST /admin/subscriptions/{id}/activate` | — (id) | `AdminSubscription` | اربط "Activate" للـ expired |

### Proposed forms / endpoints — AdminSubscriptions

1. **New Subscription** — **(proposed)** `POST /admin/subscriptions` body `{brandId, plan, startDate, months, monthlyPrice?(halalas), reminderEnabled?}` → `AdminSubscription`.
2. **Edit Plan** — `POST /admin/subscriptions/{id}/change-plan` `{plan}` (`useChangeSubscriptionPlan` موجود).
3. **Suspend/Activate** — `POST …/{id}/suspend` / `/activate` (المنطق موجود، أضف الأزرار).
4. **Edit Modules** — reuse `PATCH /admin/companies/{id}/modules` أو **(proposed)** `PATCH /admin/subscriptions/{id}/modules` `{modules:string[]}`.
5. **Add Restaurant** — `POST /admin/brands/{brandId}/restaurants`.

---

## AdminCompanies (`admin-companies`)

**Purpose:** عرض اشتراكات شركات بوابة المجموعات. list (`GET /admin/companies`) + KPIs + بحث/فلتر + suspend/activate/upgrade per-company + إنشاء شركة جديدة (بحساب أدمن) + بانل تفصيلي منزلق.

**هوكس:** `useAdminCompanies/useSuspendAdminCompany/useActivateAdminCompany/useUpgradeAdminCompany/useCreateAdminCompany`. كل mutation بتعمل optimistic patch محلي.

| Element | Type | Behavior | State | Endpoint | Request body | Response | Gap/Proposed |
|---|---|---|---|---|---|---|---|
| الهيدر (count/active/revenue) | data | derived | WIRED (read) | `GET /admin/companies` | `AdminCompaniesFilter` | `Page<AdminCompany>`/`AdminCompany[]` | — |
| **"Add New Company"** | button | `setShowAdd(true)` | STATIC (UI) | — | — | — | يفتح فورم مربوط |
| KPI Active/Trial/Expires30/Revenue/Branches | KPI | derived | WIRED (derived) | `GET /admin/companies` | — | — | بعض الحقول defaulted client-side → الباك يرجّعها |
| Search input | filter | client-side | STATIC | — | — | — | مقترح `?search=` |
| Plan filter pills | filter | client-side | STATIC | — | — | — | مقترح `?plan=&status=` |
| Companies table | table | `shown` (filtered) | WIRED (read) | `GET /admin/companies` | — | `AdminCompany[]` (id,name,plan,status,contactName,city,brands,restaurants,usedBranches,users,monthlyRevenue,daysLeft,nextBilling,logo) | حقول كتير defaulted → الباك يوفرها |
| Row **Activate** (suspended) | button | optimistic + `activateMut.mutate(id)` | WIRED | `POST /admin/companies/{id}/activate` | — (id) | `AdminCompany` | — |
| Row **Suspend** | button | optimistic + `suspendMut.mutate(id)` | WIRED | `POST /admin/companies/{id}/suspend` | — (id) | `AdminCompany` | — |
| Row Eye / click | button | `setSelected(c)` | STATIC (UI) | — | — | — | يفتح بانل |
| Detail — Contact Info | data | من selected | WIRED (read) | `GET /admin/companies` (أو `/{id}` `useAdminCompany` مش مستخدم) | — | `AdminCompany` | — |
| Detail — Admin Account | data | `adminEmail` | WIRED (read) | `GET /admin/companies` | — | `adminEmail` | — |
| Detail **"Reset Password"** | button | لا handler | STATIC | — | — | — | **(proposed)** `POST /admin/companies/{id}/admin/reset-password` |
| Detail **"Login as Them"** | button | لا handler | STATIC | — | — | — | **(proposed)** `POST /admin/companies/{id}/impersonate` |
| Detail Usage bars | data | usedBranches/users | WIRED (read) | `GET /admin/companies` (أو `/{id}/usage` مش مستخدم) | — | usage | reuse `useAdminCompanyUsage` |
| Detail Modules chips | data | `selected.modules[]` | WIRED (read) | `GET /admin/companies` | — | `modules` | `useUpdateAdminCompanyModules` موجود مش مستخدم |
| Detail Billing | data | plan/monthlyRevenue/nextBilling/daysLeft | WIRED (read) | `GET /admin/companies` | — | `AdminCompany` | — |
| Detail Plan select (Basic/Pro/Enterprise) | button | `setShowUpgrade(...)` | STATIC (UI) | — | — | — | يفتح upgrade confirm |
| Detail Suspend/Activate toggle | button | activate/suspend | WIRED | `POST /admin/companies/{id}/activate`\|`/suspend` | — | `AdminCompany` | — |
| Detail **"Send Renewal Reminder"** | button | لا handler | STATIC | — | — | — | **(proposed)** `POST /admin/companies/{id}/send-reminder` |
| Upgrade modal **"Confirm Change"** | button | optimistic + `upgradeMut.mutate({id,plan})` | WIRED | `POST /admin/companies/{id}/upgrade` | `{plan:"Basic"\|"Professional"\|"Enterprise"}` | `AdminCompany` | — |
| Upgrade modal Cancel | button | `setShowUpgrade(null)` | STATIC | — | — | — | — |
| **Add Company modal** (Name/ContactName/City/Email/Mobile/Plan) | form | `coForm.*` | WIRED via submit | — | — | — | — |
| Add Company **"Create Account"** | form submit | `submitCompany()` → `createCompanyMut.mutate` | WIRED | `POST /admin/companies` | `{name, contactName, contactEmail:adminEmail, contactPhone:phone, city, plan, modules:[], adminEmail}` | `AdminCompany` | — |
| Add Company Cancel / notice | button/data | `setShowAdd(false)` / نص | STATIC | — | — | — | — |

### Proposed forms / endpoints — AdminCompanies

1. **Reset admin password** — `POST /admin/companies/{id}/admin/reset-password` `{notify:true}` → `{ok,emailedTo,resetAt}`.
2. **Impersonate** — `POST /admin/companies/{id}/impersonate` `{}` → `{token,expiresAt,userId}`.
3. **Send reminder** — `POST /admin/companies/{id}/send-reminder` `{channels:["email","inApp"], message?}` → `{ok,sentAt,channels}`.
4. **فلترة server-side** — `GET /admin/companies?search=&plan=&status=&page=&pageSize=` → `Page<AdminCompany>`.
5. **اكتمال حقول `AdminCompany`** — برجّع: brands, restaurants, usedBranches, maxBranches, users, maxUsers, monthlyRevenue(halalas), daysLeft, nextBilling, startDate, logo, modules[], status, adminEmail, contact*, city (كلها defaulted client-side حالياً).

---

## AdminReports (`admin-reports`)

**Purpose:** مدير التقارير. تابين: **Reports** (كتالوج تقارير Core+Specialized، كل واحد يفتح فلو 4 خطوات: ERP-export → Excel-upload → preview → send-to-all) و**Report Status** (تتبع sent/viewed per-restaurant). الكتالوج من `GET /admin/reports/catalog`؛ قائمة المطاعم flatten من `GET /admin/brands`.

**مهم:** `useSendAdminReport`/`useUploadAdminReport`/`useGenerateAdminReport` موجودين في `admin.ts` بس **مش مستوردين/متنادى عليهم** — upload/preview/send كلها local-state. `PERIOD` ثابت `"أكتوبر 2025"`.

| Element | Type | Behavior | State | Endpoint | Request body | Response | Gap/Proposed |
|---|---|---|---|---|---|---|---|
| الهيدر + Period badge | data | نص + period ثابت | STATIC | — | — | — | مقترح period selector |
| "subscribed restaurants" count | data | `RESTAURANTS.length` | WIRED (read) | `GET /admin/brands` | — | flatten `AdminBrand[]` | — |
| Tabs Reports/Status | tab | `setAdminRepTab` | STATIC | — | — | — | — |
| KPI Total Reports | KPI | `allReports.length` | WIRED (read) | `GET /admin/reports/catalog` | — | `AdminReportItem[]` | — |
| KPI Sent / Not Sent | KPI | من `sentReports` Set محلي | STATIC (local) | — | — | — | محتاج status endpoint |
| KPI Subscribed Restaurants | KPI | `RESTAURANTS.length` | WIRED (read) | `GET /admin/brands` | — | — | — |
| Core/Specialized lists | table | `coreReports`/`specializedReports` (fallback config) | WIRED(catalog)/STATIC(fallback) | `GET /admin/reports/catalog` | — | `AdminReportItem[]` | API flat → مقترح `category` field |
| Report card counts/badge | data | من `repStatus`/`sentReports` المحلي | STATIC (local) | — | — | — | `GET /admin/reports/{key}/status` |
| Report card click | button | يدخل الفلو | STATIC (UI) | — | — | — | — |
| Step nav (1 ERP/2 Upload/3 Review/4 Send) | tab | `setStep` | STATIC | — | — | — | — |
| Step 0 "Go to Upload →" | button | `setStep(1)` | STATIC | — | — | — | — |
| **Step 1 Excel dropzone / Choose File** | form (upload) | `setUploaded(true)` — **مفيش file input ولا رفع** | STATIC (local) | — | — | — | **Gap:** `useUploadAdminReport` موجود مش مستخدم → multipart `POST /admin/reports/{reportKey}/upload` |
| Step 1 uploaded block + remove | data/button | filename وهمي | STATIC (local) | — | — | — | يعكس رد الرفع الحقيقي |
| Step 1 "Preview Report →" | button | `setStep(2)` | STATIC | — | — | — | — |
| **Step 2 Preview table** | table | `previewRows` ثابتة | STATIC | — | — | — | مقترح `GET /admin/reports/{key}/preview?uploadId=` |
| Step 2 Back/Continue | button | `setStep` | STATIC | — | — | — | — |
| Step 3 recipients list | table | `RESTAURANTS.map` | WIRED (read) | `GET /admin/brands` | — | flatten | — |
| **Step 3 "Send to All Restaurants"** | button | `sendReport(id)` محلي — **مفيش API** | STATIC (local) | — | — | — | **Gap:** `useSendAdminReport` موجود مش مستخدم → `POST /admin/reports/{reportKey}/send` |
| Step 3 Back / success buttons | button | `setStep`/nav | STATIC | — | — | — | — |
| Status filter pills | filter | `setStatusFilter` | STATIC (local) | — | — | — | — |
| Status summary cards | KPI | من `repStatus` المحلي | STATIC (local) | — | — | — | `GET /admin/reports/{key}/status` |
| Status matrix table | table | rows من `RESTAURANTS`؛ status محلي | WIRED(restaurants)/STATIC(status) | `GET /admin/brands` | — | `AdminBrand[]` | محتاج status endpoint |
| "Send This Report Now" | button | يفتح الفلو | STATIC (UI) | — | — | — | — |

### Proposed forms / endpoints — AdminReports

1. **Upload Excel** — `POST /admin/reports/{reportKey}/upload` (multipart `file`، +`?period=YYYY-MM`) → `{uploadId, parsedRows, preview:[{label,value,type,header}]}` (`useUploadAdminReport` موجود).
2. **Preview** — `GET /admin/reports/{reportKey}/preview?uploadId=&period=` → `{rows:[{label,value,type,header}]}`.
3. **Send** — `POST /admin/reports/{reportKey}/send` body `{period:{from,to}, restaurantIds?:string[], channels:("email"|"inApp")[], uploadId}` → `{ok, sentCount, recipients[], sentAt}` (`useSendAdminReport` موجود).
4. **Status** — `GET /admin/reports/{reportKey}/status?period=YYYY-MM` → `{reportKey, period, summary:{sent,notSent,viewed,notViewed}, rows:[{restaurantId,restaurantName,owner,email,sent,sentDate,viewed,viewedDate}]}`.
5. **Period selector** + `GET /admin/reports/periods`.
6. **`category:"core"|"specialized"`** على `AdminReportItem`.

---

## AdminAudit (`admin-audit`)

**Purpose:** عارض سجل النشاطات. list عبر `GET /admin/audit-logs` + فلاتر client-side (user/type/date) + Excel export. الأيقونة ثابتة 📋.

| Element | Type | Behavior | State | Endpoint | Request body | Response | Gap/Proposed |
|---|---|---|---|---|---|---|---|
| الهيدر + count | data | إجمالي | WIRED | `GET /admin/audit-logs` (`useAdminAuditLogs`) | — (default `{}`) | `Page<AdminAuditLogEntry>` (action,description,actorName,occurredAt,entityType) | الهوك يدعم filter بس الصفحة مش بتبعت |
| **Export Excel** | button | `exportAuditMut.mutate({format:"xlsx"})` | WIRED | `POST /admin/audit-logs/export` (`useExportAdminAuditLogs`) | `{format:"xlsx"\|"csv", actionType?, userFilter?, dateFrom?, dateTo?}` | blob (xlsx) | بيبعت `{format}` بس — مش بيمرّر الفلاتر |
| Search by User | filter | client-side | STATIC | — | — | — | مقترح `?userFilter=` |
| Activity Type select | filter | client-side؛ options ثابتة | STATIC | — | — | — | source موجود: `GET /admin/audit-logs/filters` (`useAdminAuditLogFilters`) |
| Date select | filter | client-side | STATIC | — | — | — | مقترح `dateFrom/dateTo` |
| Clear Filters | button | reset محلي | NO-FORM | — | — | — | — |
| Activities list + count | data | filtered | WIRED (derived) | `GET /admin/audit-logs` | — | same | — |
| Audit rows | table | `shown` | WIRED | `GET /admin/audit-logs` | — | per row | row click لا يعمل — detail موجود مش مستخدم: `GET /admin/audit-logs/{id}` (`useAdminAuditLogEntry`) |
| Empty state | data | فاضي | NO-FORM | — | — | — | — |

### Proposed forms / endpoints — AdminAudit

كلها endpoints **موجودة مش مستخدمة** (مفيش شغل باك):
- **فلترة server-side** — `GET /admin/audit-logs` params `{userFilter?, actionType?, dateFrom?, dateTo?, page?, pageSize?}`.
- **مصدر الـ dropdown** — `GET /admin/audit-logs/filters` → `{actionTypes:[{value,labelAr,labelEn}]}`.
- **Row diff modal** — `GET /admin/audit-logs/{id}` → `AdminAuditLogDetail {id,action,actorName,actorRole,entityType,entityId,description,before,after,ip,userAgent,occurredAt}`.
- **Export aligned** — مرّر الفلاتر للـ export body؛ + خيار CSV.

---

## AdminPermissions (`admin-permissions`)

**Purpose:** محرر matrix الأدوار × الموديولات. load من `GET /admin/permissions`، edit mode بيدوّر مستوى الصلاحية (none→view→submit→review→approve→final)، clone عمود دور على آخر (محلي)، وحفظ الـ matrix كله عبر `PUT /admin/permissions`.

| Element | Type | Behavior | State | Endpoint | Request body | Response | Gap/Proposed |
|---|---|---|---|---|---|---|---|
| الهيدر + pending badge | data | عداد محلي | NO-FORM | — | — | — | محلي |
| **"Save Changes"** | button | `updatePermsMut.mutate({matrix})` | WIRED | `PUT /admin/permissions` (`useUpdateAdminPermissions`) | `{matrix:[{module:string, perms:Permission[]}]}` (Permission = view\|submit\|review\|approve\|final\|none) | `AdminPermissionsMatrix {roles[], matrix[]}` | per-cell endpoint موجود مش مستخدم |
| "Saved" badge | data | flag محلي | NO-FORM | — | — | — | محلي |
| **"Clone Role"** toggle | button | يفتح بانل | NO-FORM | — | — | — | — |
| **Edit/Cancel** toggle | button | toggle؛ cancel → `resetAll()` | NO-FORM | — | — | — | `resetAll` **no-op** — مش بيرجّع الحالة |
| Clone From/To selects | filter/form | options = roles | WIRED (source) | `GET /admin/permissions` | — | `roles:string[]` (fallback ثابت) | — |
| **"Apply Clone"** | button | نسخ عمود **محلي بس** | STATIC | — | — | — | موجود مش مستخدم: `POST /admin/permissions/clone` `{fromRole,toRole}` |
| Clone Cancel | button | يقفل | NO-FORM | — | — | — | — |
| Legend chips | data | ثابت | STATIC | — | — | — | ديكور |
| Matrix headers (role badge+scope) | matrix | من `roles` | WIRED(roles)/STATIC(colors) | `GET /admin/permissions` | — | `roles[]` | scope/colors ثابتة |
| Matrix rows (module + cells) | matrix | من `matrix` API | WIRED | `GET /admin/permissions` (`useAdminPermissions`) | — | `{matrix:[{module, perms:Permission[]}]}` | فاضي لحد ما الـ API يرد |
| Permission cell (cycle) | toggle/matrix | `cyclePermission` محلي لحد Save | STATIC (لحد Save) | — (persist عبر PUT) | — | — | per-cell موجود: `PATCH /admin/permissions/cell` `{module,roleKey,permission}` |
| Edit-mode banners | data | ثابت | STATIC | — | — | — | ديكور |

### Proposed forms / endpoints — AdminPermissions

كلها **endpoints موجودة مش متنادى عليها**:
- **Clone server-side** — `POST /admin/permissions/clone` `{fromRole, toRole}` (`useClonePermissions`).
- **Per-cell save** — `PATCH /admin/permissions/cell` `{module, roleKey, permission}` (`usePatchPermissionCell`).
- **إصلاح Cancel** — أعد seed الـ matrix من `permsApi.matrix` (حالياً no-op).
- **History/Restore** (في settings بس بتشتغل على نفس الـ matrix) — `GET /admin/permissions/history`, `GET …/{id}`, `POST …/{id}/restore`.

---

## AdminSettings (`admin-settings`)

**Purpose:** مركز الإعدادات. بيستدعي `useAdminSettings()` (`GET /admin/settings`) **بس بيتجاهل الداتا**. الـ4 كروت العلوية (Notifications/Backup/API/Security) **static بالكامل** (divs بدون state). كارت "Account Settings" بيوصل لصفحات/مودالات **مربوطة بالكامل**: Change Password, Sessions, 2FA, Notification Preferences, API Keys, Webhooks, Permission History, + language toggle.

| Element | Type | Behavior | State | Endpoint | Request body | Response | Gap/Proposed |
|---|---|---|---|---|---|---|---|
| `useAdminSettings()` load | data | بتتنده بس مش مستخدمة | WIRED (fetch بس) | `GET /admin/settings` | — | `AdminSettings` | اربط الكروت + `PATCH /admin/settings` |
| **4 كروت توجلات** (Notifications/Backup/API/Security، 3 توجلات لكل واحد) | toggle | divs ديكور بدون handler | STATIC | — | — | — | اربط بـ `AdminSettings.*` + `PATCH /admin/settings` (تحت) |
| **Change Password** | button | يفتح `ChangePasswordModal` | NO-FORM (مودال مربوط) | — | — | — | — |
| ↳ ChangePasswordModal (current/new/confirm) | form | validate + `changePassword()` | WIRED | `POST /auth/change-password` | `{currentPassword, newPassword}` | `204`؛ toast | confirm client-side بس |
| **Active Sessions** | button | يفتح مودال | NO-FORM | — | — | — | — |
| ↳ SessionsList | data/table | list | WIRED | `GET /auth/sessions` (`useSessions`) | — | `{data:[{id,device,ip,lastUsedAt,current}]}` | — |
| ↳ Session **Revoke** | button | `revoke.mutate(id)` (disabled للحالية) | WIRED | `DELETE /auth/sessions/{id}` | path `id` | `void`؛ toast | — |
| **Two-Factor Auth** | button | يفتح `TwoFactorSetupWizard` | NO-FORM | — | — | — | — |
| ↳ 2FA status | data | enabled/disable step | WIRED | `GET /users/me/2fa-status` | — | `{enabled,method,backupCodesRemaining}` | — |
| ↳ 2FA method + Continue | form/button | `setupMut.mutateAsync(method)` | WIRED | `POST /auth/2fa/setup` | `{method:"totp"\|"sms"}` | `{secret,qrCodeUrl}` أو `{sentTo}` | — |
| ↳ 2FA verify | form/button | `verifyMut.mutateAsync(code)` | WIRED | `POST /auth/2fa/verify` | `{code}` | `{backupCodes:string[]}` | — |
| ↳ 2FA backup codes + Copy | data/button | clipboard | WIRED (من verify) | — | — | `backupCodes[]` | copy client-side |
| ↳ 2FA disable | form/button | `disableMut.mutateAsync(code)` | WIRED | `POST /auth/2fa/disable` | `{code}` | `void` | OTP أو backup code |
| **Notification Preferences** | button | inline `NotificationPreferencesPage` | NO-FORM | — | — | — | — |
| ↳ prefs load | data | seed `draft` | WIRED | `GET /admin/notifications/preferences` | — | `NotificationPreferences {channels{inApp,email,push,whatsapp}, events, quietHours?}` | — |
| ↳ channel/event/quiet toggles | toggle/matrix | mutate `draft` | WIRED (persist on Save) | — | — | — | محلي لحد Save |
| ↳ **Save Preferences** | button | `updateMut.mutate(draft)` | WIRED | `PATCH /admin/notifications/preferences` | `Partial<NotificationPreferences>` | `NotificationPreferences`؛ toast | — |
| **API Keys** | button | inline `ApiKeysPage` | NO-FORM | — | — | — | — |
| ↳ list | data/table | list | WIRED | `GET /company/me/api-keys` (`useApiKeys`) | — | `{data:[{id,name,prefix,scopes,lastUsedAt,createdAt,expiresAt}]}` | **تحت `/company/me/*`** — ممكن 404 لأدمن المنصّة بدون companyId |
| ↳ New Key (name/scopes/expiresInDays) | form/button | `createMut.mutateAsync(...)` | WIRED | `POST /company/me/api-keys` | `{name, scopes:ApiKeyScope[], expiresInDays?}` | `{id,name,key,scopes,expiresAt?}` (key مرة واحدة) | — |
| ↳ key reveal + Copy / Revoke | data/button | clipboard / `revokeMut.mutate(id)` | WIRED | `DELETE /company/me/api-keys/{id}` | path `id` | `void`؛ toast | — |
| **Webhooks** | button | inline `WebhooksPage` | NO-FORM | — | — | — | — |
| ↳ list | data/table | list | WIRED | `GET /company/me/webhooks` (`useWebhooks`) | — | `{data:[{id,url,events,secret_prefix,isActive,description?,lastTriggeredAt?,failureCount}]}` | snake_case `secret_prefix` |
| ↳ New (url/events/description) | form/button | `createMut.mutateAsync(...)` | WIRED | `POST /company/me/webhooks` | `{url, events:WebhookEvent[], description?}` | `{id,url,events,secret,isActive}` (secret مرة واحدة) | — |
| ↳ Test / Toggle / Delete | button/toggle | mutate | WIRED | `POST /company/me/webhooks/{id}/test` · `PATCH /company/me/webhooks/{id}` · `DELETE /company/me/webhooks/{id}` | `{event?}` · `{url?,events?,isActive?}` · path `id` | delivered/WebhookRow/void | — |
| **Permission History** | button | يفتح `PermissionHistoryDrawer` | NO-FORM | — | — | — | — |
| ↳ history list | data/table | list | WIRED | `GET /admin/permissions/history` | `{page?,pageSize?}` | `{data:[{id,savedBy{id,name},savedAt,changesCount,summaryAr}], meta}` | — |
| ↳ snapshot preview | data/matrix | row click | WIRED | `GET /admin/permissions/history/{id}` | path `id` | `{roles[], matrix[]}` | — |
| ↳ **Restore snapshot** | button | `restoreMut.mutateAsync(id)` | WIRED | `POST /admin/permissions/history/{id}/restore` | path `id` | `void`؛ toast + invalidate | — |
| Language toggle | button | `setLang` + `langPrefMut.mutate({language})` | WIRED (شرطي) | `PATCH /company/me/preferences` (`useLanguagePref`) | `{language:"ar"\|"en", theme?}` | `void`؛ **يتخطى لو `!user.companyId`** | لأدمن المنصّة no-op، اللغة بتتغير محلياً |

### Proposed forms / endpoints — AdminSettings

البلوك الوحيد **STATIC** هو الـ**4 كروت العلوية**. `GET /admin/settings` بتتنده بالفعل و`useUpdateAdminSettings()` → `PATCH /admin/settings` موجود — فمحتاجة **ربط بس**:
- **اربط الـ4 كروت** بـ `AdminSettings` + persist عبر `PATCH /admin/settings` body `Partial<AdminSettings>`. الشكل المقترح:
  - `notifications:{approval, subscriptionAlerts, dailyPerformanceReports}`
  - `backup:{dailyAuto, weekly, encryption}`
  - `integrations:{erp, paymentGateway, mobileApp}`
  - `security:{twoFactorRequired, sessionDurationMinutes, passwordPolicy:"basic"|"strong"}`
- **تنبيه `/company/me/*`:** API Keys + Webhooks + language PATCH كلها على `/company/me/*` — ممكن 404 لأدمن منصّة بدون `companyId`. مقترح: إمّا `/admin/api-keys` و`/admin/webhooks`، أو إخفاء الأزرار دي لما `!user.companyId`.

---

# ملخص تنفيذي للباك إند

## أ) Endpoints جديدة مطلوبة (مش موجودة دلوقتي)

| # | Endpoint | الصفحة | Body | Response |
|---|---|---|---|---|
| 1 | `POST /admin/brands/{brandId}/subscription/renew` | Overview/Restaurants | `{months}` | `{brandId,subStatus,daysLeft,expiresAt}` |
| 2 | `POST /admin/brands/{brandId}/subscription/activate` | Overview | `{}` | `{brandId,subStatus:"active",daysLeft,expiresAt}` |
| 3 | `POST /admin/users/{id}/reset-password` | Users | `{sendEmail?}` | `{ok,emailSent,tempPassword?}` |
| 4 | `POST /admin/subscriptions` (create) | Subscriptions | `{brandId,plan,startDate,months,monthlyPrice?,reminderEnabled?}` | `AdminSubscription` |
| 5 | `PATCH /admin/subscriptions/{id}/modules` (اختياري) | Subscriptions | `{modules:string[]}` | `AdminSubscription` |
| 6 | `POST /admin/companies/{id}/admin/reset-password` | Companies | `{notify?}` | `{ok,emailedTo,resetAt}` |
| 7 | `POST /admin/companies/{id}/impersonate` | Companies | `{}` | `{token,expiresAt,userId}` |
| 8 | `POST /admin/companies/{id}/send-reminder` | Companies | `{channels[],message?}` | `{ok,sentAt,channels}` |
| 9 | `GET /admin/reports/{reportKey}/preview?uploadId=&period=` | Reports | — | `{rows:[{label,value,type,header}]}` |
| 10 | `GET /admin/reports/{reportKey}/status?period=` | Reports | — | `{summary{sent,notSent,viewed,notViewed}, rows[]}` |
| 11 | `GET /admin/reports/periods` (اختياري) | Reports | — | `{periods:["YYYY-MM"]}` |

> ملاحظة: `POST /admin/reports/{reportKey}/upload` و`/send` ليهم **هوكس موجودة** بالفعل (`useUploadAdminReport`/`useSendAdminReport`) — أكّد إنهم متعملين على الباك بنفس الشكل.

## ب) تعديلات على responses موجودة (حقول ناقصة)

- **`AdminCompany`** — رجّع: brands, restaurants, usedBranches, maxBranches, users, maxUsers, monthlyRevenue(halalas), daysLeft, nextBilling, startDate, logo, modules[], status("active"|"warning"|"danger"|"suspended"|"trial"), adminEmail, contact*, city.
- **`AdminUserRow`** — أضف `lastLoginAt:string|null`, `createdAt:string`، + دعم `phone`/`sendLoginEmail` في body الإنشاء.
- **`AdminReportItem`** — أضف `category:"core"|"specialized"`.
- **server-side filters** — `GET /admin/users`, `GET /admin/companies`, `GET /admin/audit-logs` يقبلوا query params للفلترة (دلوقتي client-side).
- **Notification Preferences لأدوار company** — مطلوب `/company/me/notifications/preferences` (موجود لـ admin بس).

## ج) فجوات frontend — الهوك/الـ endpoint موجود بس الفرونت مش بينده (إصلاح frontend مش باك)

| الصفحة | الفجوة |
|---|---|
| Restaurants | باج: `renewSub` بيبعت **restaurant id** لـ `POST /admin/subscriptions/{id}/renew` — استخدم `useRenewRestaurantSubscription`. |
| Restaurants | `useAdminRestaurantSubscriptions()` بتتنده والنتيجة **بتترمى**؛ بانل الاشتراك على seed ثابت. |
| Restaurants | كل أزرار Add/Edit (brand/restaurant/branch) NO-FORM رغم وجود الهوكس؛ الـ Add Brand inputs uncontrolled. |
| Restaurants | 6 رفعات + templates + upload-status هوكس موجودة، الأزرار static. |
| Subscriptions | `onChangePlan`/`onSuspendSub`/`onActivateSub` معرّفين بس **`void`** — مفيش UI بينده عليهم. |
| Reports | upload (step1) + preview (step2) + send (step3) كلها local-state؛ `useUploadAdminReport`/`useSendAdminReport` موجودين مش مستوردين. |
| Audit | الفلاتر client-side؛ `useAdminAuditLogs(filter)`/`useAdminAuditLogFilters`/`useAdminAuditLogEntry` موجودين مش مستخدمين؛ export مش بيمرّر الفلاتر. |
| Permissions | Clone محلي (`useClonePermissions` موجود)؛ per-cell (`usePatchPermissionCell`) مش مستخدم؛ `resetAll` no-op. |
| Settings | الـ4 كروت العلوية static؛ `useAdminSettings`/`useUpdateAdminSettings` موجودين مش مربوطين بالكروت. |
| Overview | Renew/Activate في الـ alerts بينقل بس بدل ما ينفّذ. |

---

*انتهى تحليل دور الأدمن (9 صفحات). الخطوة الجاية: نفس التحليل للدور التاني (head / accountant / branch / procurement / supplier).*
