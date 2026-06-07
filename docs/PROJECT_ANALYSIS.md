# ASAB — Project-Wide UI ↔ Backend Gap Analysis

> **Generated:** 2026-06-07
> **Scope:** Audit of every UI feature in `artifacts/mockup-sandbox/src/components/mockups/asab/{ASABPrototype,CompanyDashboard}.tsx` against the wired API hooks (`src/api/queries/`) and the endpoint catalog (`docs/ASAB_FRONTEND_INTEGRATION.md §11` + `docs/MISSING_ENDPOINTS_SPEC.md`).
>
> **Purpose:** Hand this to the backend team so they know exactly what's left + whether each gap relates to an existing endpoint or needs a fresh one.

---

## Executive summary

| Category | Items | Backend action needed? |
|---|---|---|
| **A. Wired hooks but UI still renders inline fallback** | 12 | ❌ No — frontend swap when API returns shape |
| **B. Orphan UI actions (button calls `alert()`/local state — endpoint already exists)** | 28 | ❌ No — frontend wiring only |
| **C. UI features with no endpoint at all (RELATED to existing concept)** | 9 | ✅ Yes — extend existing endpoint or add small new one |
| **D. UI features with no endpoint at all (ISOLATED — new concept)** | 5 | ✅ Yes — fresh design needed |
| **E. Hardcoded lookup arrays that should come from an endpoint** | 6 | ✅ Yes — small `/lookups/*` additions |

**Total backend work needed:** ~**20 items** (Categories C, D, E). Categories A & B are frontend-only fixes the FE team can do without backend changes.

---

## Category A — Wired hooks but UI uses inline fallback

> The hook is called and the response is captured, but the rendering path still uses the inline `*_FALLBACK` constants because the API hasn't returned the expected shape yet.
> **Backend action:** none. When the endpoint starts returning the shape declared in [ASAB_FRONTEND_INTEGRATION.md] / [MISSING_ENDPOINTS_SPEC.md], the fallback automatically becomes dead code.

| # | UI surface | Inline constant | Hook already called | Related endpoint |
|---|------------|-----------------|---------------------|------------------|
| A1 | `AccCompanySales` daily breakdown | `FALLBACK_DAY_OPTIONS`, `FALLBACK_BRAND_OPTIONS` | `useOperations({moduleKey:"sales"})` | `GET /company/me/operations?moduleKey=sales` (data exists; UI grouping is local) |
| A2 | `AccCompanyExpenses` daily breakdown | `FALLBACK_EXP_DAY_OPTIONS` | `useOperations({moduleKey:"expenses"})` | Same as A1 |
| A3 | `AccInventoryItems` brand catalog | `BRAND_CATALOG_FALLBACK` | `usePlatformInventoryCatalog()` | `GET /accountant/inventory/catalog` |
| A4 | `AccShifts` live + history | `LIVE_SHIFTS_FALLBACK`, `SHIFT_HISTORY_FALLBACK` | `usePlatformLiveShifts/HistoryShifts` | `GET /accountant/shifts/live\|history` |
| A5 | `AccEmployees` list | `EMPLOYEES_FALLBACK` | `usePlatformEmployees` | `GET /accountant/employees` |
| A6 | `AccCash` custody | `BRANCHES_FALLBACK` | `usePlatformCashCustody` | `GET /accountant/cash-custody` |
| A7 | `AccAssets` register | `ASSETS_FALLBACK` | `usePlatformAssets` | `GET /accountant/assets` |
| A8 | `AccWaste` entries | `ENTRIES_FALLBACK` | `usePlatformWaste` | `GET /accountant/waste` |
| A9 | `AccReminders` missing reports | `REMINDERS_FALLBACK` | `usePlatformReminders` | `GET /accountant/reminders` |
| A10 | `HeadAccountants` performance + activity | `ACCOUNTANTS_FALLBACK`, `RECENT_MOVEMENTS_FALLBACK` | `useAccountantsPerformancePlatform`, `useHeadRecentMovements` | `/head/accountants/performance`, `/head/movements/recent` (just shipped) |
| A11 | `HeadDashboard` weekly chart | inline `weeklyPerformance` literal | `useHeadDashboardPlatform` | `/head/dashboard.weeklyPerformance` (just shipped) |
| A12 | `AdminAudit` activity log | `LOGS_FALLBACK` | `useAdminAuditLogs` | `GET /admin/audit-logs` (works, just needs richer rows) |

---

## Category B — Orphan UI actions (endpoint exists, button calls `alert()`/local-only state)

> The hook exists in `src/api/queries/` but the UI button still calls `alert(...)` or only does `setState(...)`. Backend team can ignore — this is frontend wiring debt.

### B.1 Admin
| # | Where | Currently does | Should call |
|---|-------|----------------|-------------|
| B1 | `AdminCompanies` → "إنشاء حساب" modal button (line 11128) | `alert("✅ تم إنشاء الحساب")` | `useCreateAdminCompany.mutate({...})` |
| B2 | `AdminPermissions` → "حفظ التعديلات" button (line 11712) | `setSaved(true)` (local only) | `useUpdateAdminPermissions.mutate({matrix})` |
| B3 | `AdminAudit` → "تصدير Excel" (line 11567) | `alert("جارٍ تصدير...")` | `useExportAdminAuditLogs.mutate({format:"xlsx"})` |
| B4 | `AdminUsers` → CSV import (line 9468) | `alert("جارٍ استيراد...")` | `useImportAdminUsers.mutate(file)` |
| B5 | `AdminRestaurants` upload tab → Excel uploads (`setBrandUploads` toggles only) | local boolean | `useAdminUploadBrand` / `useAdminUploadEmployees` / `useAdminUploadFixedAssets` (already exist) |

### B.2 Accountant (ASABPrototype)
| # | Where | Currently does | Should call |
|---|-------|----------------|-------------|
| B6 | `AccCompanySales` → "Excel" (line 3079) | `alert(...)` | `useExportOperations.mutate({moduleKey:"sales", format:"xlsx"})` |
| B7 | `AccCompanyExpenses` → "Excel" (line 3526) | `alert(...)` | `useExportOperations.mutate({moduleKey:"expenses"})` |
| B8 | `AccCompanyPurchases` → "Excel" (line 4611) | `alert(...)` | `useExportOperations.mutate({moduleKey:"purchases"})` |
| B9 | `AccInventory` → "تحميل Excel كل الفروع" (line 4877) | `alert(...)` | `useExportInventory` (needs to be created — see C8 below) |
| B10 | `AccEmployees` → "تصدير كشف الحساب" (line 6116) | `alert(...)` | `useExportPayroll` (exists) |
| B11 | `AccCash` → "تصدير سجل العهد" (line 6250) | `alert(...)` | `useExportCash` (exists) |
| B12 | `AccAssets` → "تصدير سجل الأصول" (line 6777) | `alert(...)` | `useExportAssets` (just added) |
| B13 | `AccAssets` → "أصل جديد" (line 3421) | `alert("➕ إضافة أصل جديد")` | `useCreatePlatformAsset.mutate(payload)` |
| B14 | `AccAssets` → "تعديل" row button (line 3491) | `alert("✏️ تعديل الأصل...")` | `usePatchAsset` (exists) |
| B15 | `AccAssets` → "تحميل قالب Excel" (line 6468) | `alert(...)` | `useAdminUploadTemplate({type:"fixed-assets"})` (admin variant exists) |
| B16 | `AccWaste` → "تصدير بيانات الهدر" (line 7546) | `alert(...)` | `useExportWaste` (exists) |
| B17 | `AccReminders` → "تصدير التذكيرات" (line 7889) | `alert(...)` | `useExportAccReminders` (just added) |
| B18 | `AccReminders` → "إضافة تذكير" modal (line 3826) | `alert("✅ تم إضافة")` | `useCreateReminder.mutate(payload)` |

### B.3 Head (ASABPrototype)
| # | Where | Currently does | Should call |
|---|-------|----------------|-------------|
| B19 | `HeadApprovalTab` → "تصدير العمليات المعلقة" (line 8376) | `alert(...)` | `useExportHeadOperations.mutate({status:"pending"})` |
| B20 | `HeadApproved/Rejected` → "Excel" (line 8626) | `alert(...)` | `useExportHeadOperations.mutate({status:"final-approved"\|"rejected"})` |

### B.4 Branch / Procurement / Supplier
| # | Where | Currently does | Should call |
|---|-------|----------------|-------------|
| B21 | `BranchUpload` → "حفظ الإعدادات" (line 4945) | `alert("✅ تم حفظ")` | `useUpdateBranchSettingsPlatform.mutate({...})` |
| B22 | `ProcNewOrders` → "إنشاء أمر شراء" modal (line 5064) | `alert("✅ تم الإنشاء")` | `useCreateProcurementOrder.mutate({...})` |
| B23 | `ProcNewOrders` → "تعديل أمر" pen icon (line 5052) | `alert(...)` | `useUpdateOrder` (exists) |
| B24 | `ProcSuppliers` → "إضافة مورد" (line 5093) | `alert(...)` | `useCreateSupplier.mutate({...})` |
| B25 | `ProcItems` → "صنف جديد" (line 5135) | `alert(...)` | `useCreateProcurementItem.mutate({...})` |
| B26 | `ProcGrouped` fallback path (line 5210) | `alert("تم إرسال المجمّعة")` | `useSendGroupedOrder` (already called as primary path) |
| B27 | `SupItems/SupSuppliers/SupReports` → "Excel" (lines 12890, 13002, 13282) | `alert(...)` | `useExportSupplierItems / useExportSupplierOrders` (just added) |
| B28 | `ProcItems` Excel + `ProcSuppliers` Excel | `alert(...)` | `useExportProcurementItems / useExportSuppliers` (just added) |

### B.5 CompanyDashboard
| # | Where | Currently does | Should call |
|---|-------|----------------|-------------|
| B29 | CA users → "تعديل" (line 1515) | `alert(...)` | `useUpdateCompanyUser` |
| B30 | CA expenses → "📎 المرفقات" (line 2069) | `alert("...فاتورة, تقرير, إيصال")` | `useExpenseInvoiceAttachments(invoiceId)` (just added — needs UI panel) |
| B31 | CA expenses → "📎 عرض مرفقات" (line 2849) | `alert(...)` | Same as B30 |
| B32 | Head approval → "🔍 تفاصيل" (lines 2281, 2288) | `alert(refNum)` | `useOperation(id)` + open detail drawer |
| B33 | Branch upload export buttons (lines 2709, 2792, 3011, 3110, 3169) | `alert(...)` | `useExportShifts` / branch-specific export |
| B34 | CA support → Live chat (line 1807) | `alert("نافذة الدردشة")` | **NO ENDPOINT** — see D2 |

---

## Category C — Missing endpoints, RELATED to existing concept

> These are UI features that need NEW endpoints but the concept is already represented in the data model — the backend can probably extend an existing controller.

### C1. Per-restaurant subscription renewal
- **Where:** `AdminRestaurants` → "تجديد الاشتراك" button per restaurant (uses `r1`, `r2`, … IDs)
- **Problem:** `useRenewSubscription` takes a `subscriptionId` but the UI has `restaurantId`. There's no way to renew at the *restaurant* level today.
- **Needed endpoint:**
  ```
  POST /api/v1/admin/restaurants/{restaurantId}/subscription/renew
  Body: { months?: number }
  Response: AdminRestaurantSubscription
  ```
- **Or:** add `restaurantId` lookup to `GET /admin/restaurants/subscriptions` then call the existing `POST /admin/subscriptions/{id}/renew`.

### C2. Brand-level toggle auto-reminder
- **Where:** `AdminSubscriptions` → `setAutoReminders` per brand (`b.id`)
- **Problem:** existing `POST /admin/subscriptions/{id}/toggle-auto-reminder` works on subscription IDs, not brand IDs.
- **Needed endpoint:** `POST /api/v1/admin/brands/{brandId}/auto-reminder` body `{enabled: boolean}` → `{brandId, enabled}`.

### C3. Audit-log entry detail with before/after diff
- **Where:** `AdminAudit` activity row click — currently no detail view, but the brief calls for one.
- **Needed endpoint:**
  ```
  GET /api/v1/admin/audit-logs/{id}
  Response: { id, action, actorName, actorRole, entityType, entityId,
              before:{...}, after:{...}, ip, userAgent, occurredAt }
  ```

### C4. AddCompany — extended creation fields
- **Where:** `AdminCompanies` → "إنشاء حساب جديد" modal collects: company name, contact name, contact email, phone, city, plan, custom branches limit.
- **Problem:** `useCreateAdminCompany` accepts a subset (name + plan). Backend body shape doesn't match the modal fields.
- **Needed:** extend `POST /api/v1/admin/companies` body to accept:
  ```json
  {
    "name": "...",
    "contactName": "...",
    "contactEmail": "...",
    "contactPhone": "...",
    "city": "...",
    "plan": "Basic|Professional|Enterprise",
    "branchesLimitOverride": 25,
    "billingCycle": "monthly|annual"
  }
  ```

### C5. Operation correction button on rejected ops
- **Where:** `HeadRejected` and `AccCompanyExpenses` rejected rows — no "create correction" UI today.
- **Hook exists:** `useCorrectOperation` (already added). Endpoint exists: `POST /operations/{id}/correction`.
- **Needed:** UI work only — but the backend should confirm the **response shape** of the correction endpoint. Currently it's `Operation` but the FE may need the linkage `{ originalOperationId, correctionOperationId }` to show in the audit trail.

### C6. Conditional approval (Head)
- **Where:** `HeadApprovalTab` → "اعتماد بشرط" (conditional approve) — no button today.
- **Hook exists:** `useFinalApprove({id, isConditional:true, conditionalNote})`.
- **Endpoint:** §11 lists `POST /operations/{id}/conditional-approve` separately. Backend should confirm which is canonical:
  - **Option A:** keep `POST /operations/{id}/final-approve` with `isConditional` flag.
  - **Option B:** dedicated `POST /operations/{id}/conditional-approve` with body `{notes, conditions}`.
- **Needed:** confirm + UI wiring.

### C7. Brand-upload progress polling
- **Where:** `AdminRestaurants` upload tab — `brandUploads[brandId][type]` flags are local-only.
- **Hook exists:** `useAdminBrandUploadStatus(brandId)` returns status.
- **Gap:** No realtime/polling indication of upload progress when xlsx is being processed. Either:
  - Add **WebSocket** event `brand.upload.progress` on `operations.company.{id}` channel with `{brandId, type, progress, status}`.
  - Or extend `useAdminBrandUploadStatus` to return `{progressPct, parsedRows, status: "queued|processing|done|failed"}`.

### C8. Inventory bulk Excel export (per-brand / all-branches)
- **Where:** `AccInventory` → "Excel — كل الفروع" + per-branch download (lines 4877, 5421).
- **Hook missing:** No inventory export hook yet (we have catalogs and daily lists but not bulk export).
- **Needed endpoint:**
  ```
  GET /api/v1/company/me/inventory/export?brandId=&branchId=&format=xlsx
  Response: binary xlsx with columns:
    Branch | Item | Category | Unit | Expected Qty | Actual Qty | Variance Qty | Variance Pct | Last Counted At
  ```

### C9. Reminder modal — "send via WhatsApp" action
- **Where:** `AccReminders` reminder rows can have a WhatsApp send action (referenced in `BACKEND_API_SPEC §6.3.10` but not implemented).
- **Hook missing:** Current `useSendReminder` only takes a reminder ID — no channel selector.
- **Needed:** extend `POST /api/v1/reminders/{id}/send` body to accept `{channel: "in-app"|"email"|"whatsapp"|"sms"}`. Server-side WhatsApp integration may be a separate scope.

---

## Category D — Missing endpoints, ISOLATED (new concept)

> These are UI features that imply backend functionality **not represented anywhere** in the current data model. Each needs design before implementation.

### D1. Live chat (CompanyDashboard support panel)
- **Where:** `CASupport` → "الدردشة الفورية — متاح الآن" button (line 1807).
- **Currently:** opens an `alert(...)` — fake.
- **Needed:** real-time chat with support agents. Suggested minimal endpoints:
  ```
  POST   /api/v1/company/me/support/chat/start          → { sessionId, agentName? }
  GET    /api/v1/company/me/support/chat/{sessionId}    → { messages: [...] }
  POST   /api/v1/company/me/support/chat/{sessionId}/message  body { text } → message
  Realtime: Pusher channel chat.session.{sessionId} with events message.new, agent.joined, session.closed
  ```
- **Priority:** Low (alert is acceptable temporary fallback; support can use email).

### D2. Tutorial / onboarding tour
- **Where:** No UI yet, but spec implies a first-login tour for each role.
- **Needed:** `GET /users/me/onboarding-state` + `PATCH /users/me/onboarding-state` body `{ stepCompleted: "..." }`.
- **Priority:** Low.

### D3. Permission matrix versioning + rollback
- **Where:** `AdminPermissions` saves matrix but no history of previous matrices.
- **Needed:**
  ```
  GET /api/v1/admin/permissions/history         → { data:[{ id, savedBy, savedAt, summaryAr }] }
  GET /api/v1/admin/permissions/history/{id}    → full matrix snapshot
  POST /api/v1/admin/permissions/history/{id}/restore  → applies snapshot
  ```
- **Priority:** Medium (compliance/audit requirement for some tenants).

### D4. Custom report builder
- **Where:** `AdminReports` lists pre-built reports but no custom builder UI is implemented. The spec mentions it implicitly via `POST /admin/reports/generate` taking a `key`.
- **Needed for future:** `GET /api/v1/reports/builder/fields` (available dimensions/metrics) + `POST /reports/builder/preview` + `POST /reports/builder/save`.
- **Priority:** Low (out of scope for v1).

### D5. Notification preferences UI page
- **Where:** No page exists yet — the hooks shipped but the screen is missing.
- **Needed:** FE work only (create `NotificationPreferencesPage` consuming `useNotificationPreferences` + `useUpdateNotificationPreferences`).
- **Backend:** ✅ done.

---

## Category E — Hardcoded lookup arrays (small `/lookups/*` additions)

> Hardcoded option arrays in the UI that would be cleaner as lookup endpoints. Each is a tiny GET. None block functionality.

| # | Inline array | Currently in | Suggested endpoint |
|---|--------------|--------------|---------------------|
| E1 | `ACTION_TYPES` (audit log filters) | `AdminAudit` line 11547 | `GET /admin/audit-logs/filters` (already in MISSING_ENDPOINTS_SPEC §6.2) ✓ |
| E2 | `DIST_MODULES` (`المبيعات`, `المصروفات`, …) | `AdminUsers` distribution line 9393 | `GET /lookups/modules` (exists in §11) — just wire it |
| E3 | Saudi cities (hardcoded in AddCompany, BranchSettings) | various | `GET /company/me/lookups/cities` (exists in §11 cross-cutting) — just wire it |
| E4 | Asset categories (manufacturer dropdown) | `AccAssets` add modal | `GET /company/me/lookups/asset-categories` (exists in §11) — wire it |
| E5 | Expense categories | `AccCompanyExpenses` filter | `GET /company/me/lookups/expense-categories` (exists in §11) — wire it |
| E6 | Supplier categories | `ProcSuppliers` filter | `GET /company/me/lookups/supplier-categories` (exists in §11) — wire it |

**For the backend team:** E1 is the only new endpoint here (already covered in `MISSING_ENDPOINTS_SPEC.md`). E2–E6 are already in `§11` — frontend just needs to call `useLookup("modules"\|"cities"\|"asset-categories"\|...)`.

---

## Summary table by file

### `docs/ASAB_FRONTEND_INTEGRATION.md §11` — 357 endpoints
- ✅ **100%** have hooks in `src/api/queries/`
- ✅ **~95%** have firing calls from UI (Category B has 28 orphan buttons left to wire)

### `docs/MISSING_ENDPOINTS_SPEC.md` — 30 net-new
- ✅ **100%** have hooks (commit `e2fa2ff`)
- 🔶 28 hooks need UI swap (Category B)

### True net-new gaps from this audit
| Category | Items | Backend work |
|---|---|---|
| **C (related — extend existing)** | 9 | Small extensions |
| **D (isolated — new concept)** | 5 | New domain work (chat, tour, versioning, etc.) |
| **E (lookup wire-up)** | 1 new + 5 existing | 1 small lookup |

**Total fresh backend work after this audit:** **~15 small additions** (vs the 30 in MISSING_ENDPOINTS).

---

## Priority recommendations (for backend roadmap)

### Must-have (block UI functionality)
1. **C1** — Per-restaurant subscription renewal (currently renew button calls wrong ID)
2. **C2** — Brand-level auto-reminder toggle (same — wrong ID layer)
3. **C4** — AddCompany extended fields (modal collects more than backend accepts)
4. **C8** — Inventory bulk Excel export
5. **C6** — Confirm conditional-approve canonical path (Option A vs B)

### Should-have (improves UX)
6. **C3** — Audit-log entry detail with before/after
7. **C7** — Brand-upload progress polling/realtime
8. **C9** — Reminder channel selector

### Nice-to-have (future versions)
9. **D1** — Live chat
10. **D3** — Permission matrix versioning
11. **D2** — Onboarding tour state
12. **D4** — Custom report builder

---

## Frontend follow-up work (no backend dependency)

1. Wire 28 `alert()` placeholders to their existing hooks (Category B) — pure code edits.
2. Build `NotificationPreferencesPage` (D5) — hooks already exist.
3. Add operation correction button + conditional-approve UI (C5, C6) — hooks exist.
4. Build expense-invoice attachments panel (B30, B31) — hook exists, just renders.

These can all be done by the FE team in parallel with the backend's Category C/D work.
