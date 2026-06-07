# ASAB Backend — Final Completion Request

> **Context for backend team:** The frontend (React + TanStack Query) is **100% wired against the existing endpoint catalog** in `docs/ASAB_FRONTEND_INTEGRATION.md §11` (357 endpoints), plus the 30 endpoints from `docs/MISSING_ENDPOINTS_SPEC.md`. This file is the **final batch** — once these are shipped, every UI surface in the product has a real backend.
>
> **Scope:** 24 net-new endpoints across 4 sections. After these ship, the FE → BE contract is complete.

---

## Section 1 — Close UI gaps (HIGH PRIORITY)

> These 10 are blocking specific UI features today (the UI calls the wrong endpoint or has no endpoint at all). See `docs/PROJECT_ANALYSIS.md` Categories C + E for full context.

### 1.1 Per-restaurant subscription renewal
The admin UI has a "تجديد" button per restaurant in `AdminRestaurants` that currently can't fire — the existing `/admin/subscriptions/{id}/renew` takes a subscription ID, but the UI only has the restaurant ID.

```
POST /api/v1/admin/restaurants/{restaurantId}/subscription/renew
Body: { months?: number }   // default 12
Response: AdminRestaurantSubscription  // existing type
Side-effect: emit subscription.updated on operations.company.{companyId}
```

### 1.2 Brand-level auto-reminder toggle
The "تفعيل التذكير التلقائي" switch in `AdminSubscriptions` lives on the brand row but the existing endpoint takes a subscription ID.

```
POST /api/v1/admin/brands/{brandId}/auto-reminder
Body: { enabled: boolean }
Response: { brandId, enabled, updatedAt }
```

### 1.3 Audit log entry detail (before/after diff)
Clicking a row in `AdminAudit` should open a detail drawer. No detail endpoint exists.

```
GET /api/v1/admin/audit-logs/{id}
Response:
{
  "id": "log_01HZ...",
  "action": "users.update",
  "actorName": "Admin Name",
  "actorRole": "admin",
  "entityType": "user",
  "entityId": "u_...",
  "before": { "...": "..." },
  "after":  { "...": "..." },
  "ip": "1.2.3.4",
  "userAgent": "Mozilla/...",
  "occurredAt": "2026-06-07T10:00:00Z"
}
```

### 1.4 AddCompany — extended creation body
The admin's "إضافة شركة جديدة" modal collects fields the current `POST /admin/companies` doesn't accept.

```
POST /api/v1/admin/companies
Body: {
  "name": "اسم الشركة",
  "contactName": "اسم المسؤول",
  "contactEmail": "user@company.sa",
  "contactPhone": "+9665...",
  "city": "الرياض",
  "plan": "Basic" | "Professional" | "Enterprise",
  "branchesLimitOverride": 25,    // optional
  "billingCycle": "monthly" | "annual",
  "modules": string[]              // optional list of moduleKeys
}
Response: AdminCompany   // existing type, but include adminUserId of the auto-created admin
Side-effects:
- Create company-admin user account
- Send welcome email with one-time password
- Emit invoice.created if billingCycle == "annual"
```

### 1.5 Operation correction — confirm response shape
`POST /operations/{id}/correction` exists but the response shape isn't documented. The FE needs to show the linkage between original and correction.

```
POST /api/v1/operations/{operationId}/correction
Body: { reason, notes?, correctedFields?: Record<string, unknown> }
Response: {
  originalOperationId,
  correctionOperationId,   // new id
  publicId,                 // OPS-####
  status: "pending",
  createdAt
}
```

### 1.6 Conditional approve — canonical path
The spec lists `POST /operations/{id}/conditional-approve` AND the existing `final-approve` has an `isConditional` flag. Pick one and document it. **FE preference:** keep the flag form.

```
POST /api/v1/operations/{operationId}/final-approve
Body: {
  isConditional?: boolean,
  conditionalNote?: string,    // required when isConditional==true
  conditions?: Array<{ id?: string, text: string, dueAt?: string }>
}
Response: Operation
```
If chosen otherwise, delete `conditional-approve` from §11 and the spec to avoid ambiguity.

### 1.7 Brand-upload progress polling (or realtime)
After admin uploads an xlsx for a brand, the UI needs progress indication.

**Option A (polling):** extend existing `GET /admin/brands/{brandId}/upload-status`:
```
Response: {
  uploads: [{
    type: "sales-items" | "raw-materials" | "suppliers" | "employees" | "fixed-assets",
    status: "queued" | "processing" | "done" | "failed",
    progressPct: 0-100,
    parsedRows: number,
    failedRows: number,
    failureReason?: string,
    startedAt, finishedAt?
  }]
}
```

**Option B (realtime, preferred):** broadcast on existing `operations.company.{companyId}`:
```
Event: brand.upload.progress
Payload: { brandId, type, status, progressPct, parsedRows, failedRows }
```

### 1.8 Inventory bulk Excel export
`AccInventory` has "Excel — كل الفروع" and per-branch buttons with no endpoint.

```
GET /api/v1/company/me/inventory/export?brandId=&branchId=&date=&format=xlsx
Response: binary xlsx, columns:
  Branch | Item | Category | Unit | Expected Qty | Actual Qty
  | Variance Qty | Variance Pct | Variance Value (SAR)
  | Last Counted At | Counted By
```

### 1.9 Reminder broadcast — channel selector
Currently `useSendReminder({id})` is single-channel (in-app). Spec mentions WhatsApp/SMS. Add a channel parameter to both single send and broadcast:

```
POST /api/v1/reminders/{id}/send
Body: { channel: "in-app" | "email" | "whatsapp" | "sms" }
Response: { sent: boolean, channel, deliveredAt? }

POST /api/v1/reminders/broadcast    // (already exists; clarify channel)
Body: { messageAr, messageEn?, audience, branchIds?, channels: Array<"in-app"|"email"|"whatsapp"|"sms"> }
Response: { broadcastId, sentCount, failedCount, perChannel: Record<channel, {sent, failed}> }
```

### 1.10 Admin audit-log filter metadata
Dropdowns in `AdminAudit` are hardcoded — should come from the server.

```
GET /api/v1/admin/audit-logs/filters
Response: {
  "actionTypes": [
    { "value": "users",         "labelAr": "مستخدمين",   "labelEn": "Users" },
    { "value": "approvals",     "labelAr": "اعتمادات",    "labelEn": "Approvals" },
    { "value": "subscriptions", "labelAr": "اشتراكات",    "labelEn": "Subscriptions" },
    { "value": "rejection",     "labelAr": "رفض",         "labelEn": "Rejection" },
    { "value": "export",        "labelAr": "تصدير",       "labelEn": "Export" },
    { "value": "inventory",     "labelAr": "مخزون",       "labelEn": "Inventory" },
    { "value": "permissions",   "labelAr": "صلاحيات",     "labelEn": "Permissions" },
    { "value": "purchases",     "labelAr": "مشتريات",     "labelEn": "Purchases" }
  ]
}
```

---

## Section 2 — New product concepts (MEDIUM PRIORITY)

> Category D from `PROJECT_ANALYSIS.md`. Each is its own small domain. The FE has placeholder UI today (alert()) — when these endpoints ship we'll build the real screens.

### 2.1 Live support chat
Replace the support `alert("سيتم فتح نافذة الدردشة")` with real chat.

```
POST /api/v1/company/me/support/chat/start
Response: { sessionId, agentName?, queuePosition?, estimatedWaitSeconds? }

GET /api/v1/company/me/support/chat/{sessionId}
Response: { sessionId, status: "queued"|"active"|"closed", messages:[{ id, authorType:"user"|"agent", text, sentAt }] }

POST /api/v1/company/me/support/chat/{sessionId}/message
Body: { text }
Response: { id, sentAt }

POST /api/v1/company/me/support/chat/{sessionId}/close
Response: 204

Realtime: private channel chat.session.{sessionId}
Events: message.new { id, authorType, text, sentAt }
        agent.joined { agentName }
        session.closed { closedBy, reason? }
```

### 2.2 Onboarding tour state
Tracks which onboarding steps each user has completed (first login flow per role).

```
GET /api/v1/users/me/onboarding-state
Response: { completedSteps: string[], skipped: boolean, completedAt?: string }

PATCH /api/v1/users/me/onboarding-state
Body: { stepCompleted?: string, skip?: boolean, reset?: boolean }
Response: same shape as GET
```
Step IDs are FE-defined (e.g. `welcome`, `dashboard-tour`, `first-approval`, `notifications-intro`).

### 2.3 Permission matrix versioning
`AdminPermissions` saves the matrix today but has no history.

```
GET /api/v1/admin/permissions/history?page=&pageSize=
Response (paginated): {
  data: [{
    id, savedBy: { id, name }, savedAt, changesCount,
    summaryAr: "تم تعديل صلاحيات 3 وحدات"
  }],
  meta: { page, pageSize, total, totalPages }
}

GET /api/v1/admin/permissions/history/{snapshotId}
Response: AdminPermissionsMatrix    // full matrix at that point in time

POST /api/v1/admin/permissions/history/{snapshotId}/restore
Response: AdminPermissionsMatrix    // current matrix after restore
Side-effects: emit module.changed events; logs the restore in audit log
```

### 2.4 Custom report builder (optional v2 feature)
If you have capacity, this is the foundation for self-serve reports.

```
GET /api/v1/reports/builder/fields
Response: {
  dimensions: [{ key, labelAr, labelEn, type: "string"|"date"|"enum"}],
  metrics:    [{ key, labelAr, labelEn, aggregation: "sum"|"count"|"avg" }],
  filters:    [{ key, labelAr, type, options? }]
}

POST /api/v1/reports/builder/preview
Body: { dimensions: [...], metrics: [...], filters: {...}, dateRange: {from, to} }
Response: { rows: [...], totals: {...}, rowCount }   // capped at 1000 rows

POST /api/v1/reports/builder/save
Body: { name, descriptionAr?, definition: <same as preview body> }
Response: { id, name, createdAt }
```
**Defer if scope is tight** — the existing pre-built reports cover 95% of needs.

---

## Section 3 — Operational & enterprise endpoints (PRODUCTION READINESS)

> These weren't surfaced by the UI audit but the system needs them for real production deployment. Decide per tenant tier whether each is needed.

### 3.1 Two-factor authentication (2FA)
For `admin` and `company-admin` roles. The login flow already exists — adding 2FA as a second step.

```
POST /api/v1/auth/2fa/setup        body { method: "totp" | "sms" }
                                    → { secret, qrCodeUrl } (totp) or { sentTo } (sms)
POST /api/v1/auth/2fa/verify       body { code }
                                    → { backupCodes: string[] }
POST /api/v1/auth/2fa/disable      body { code }
                                    → 204
POST /api/v1/auth/login            body extends to accept { code?: string, twoFactorToken?: string }
                                    → if 2fa enabled and code missing: returns
                                       { requires2fa: true, twoFactorToken } (no accessToken yet)
GET  /api/v1/users/me/2fa-status   → { enabled: boolean, method: "totp"|"sms"|null, backupCodesRemaining: number }
```

### 3.2 SSO / SAML (Enterprise plan)
Allow company-admins on Enterprise plan to configure SSO for their employees.

```
GET   /api/v1/company/me/sso         → { enabled, provider: "saml"|"oidc", metadataUrl?, entityId?, x509cert? }
PUT   /api/v1/company/me/sso         body { provider, metadataUrl|metadata, defaultRole }
                                      → same shape
POST  /api/v1/auth/sso/{provider}/callback   (public)
                                      → standard auth response
DELETE /api/v1/company/me/sso        → 204 (disable SSO, fall back to password)
```

### 3.3 API key management (for 3rd-party integrations)
For tenants that want to integrate ASAB with their POS/ERP directly.

```
GET    /api/v1/company/me/api-keys
Response: { data: [{ id, name, prefix, scopes: string[], lastUsedAt?, createdAt, expiresAt? }] }

POST   /api/v1/company/me/api-keys
Body: { name, scopes: string[], expiresInDays?: number }
Response: { id, name, key: "asab_live_xxx...", scopes, expiresAt }   // key returned ONCE

DELETE /api/v1/company/me/api-keys/{id}
Response: 204
```
**Scopes (minimum):** `operations:read`, `operations:write`, `reports:read`, `inventory:read`, `inventory:write`.

### 3.4 GDPR / Saudi PDPL data export
Legal requirement for users to download their data.

```
POST /api/v1/users/me/data-export
Response: { jobId, status: "queued" }

GET /api/v1/users/me/data-export/{jobId}
Response: { jobId, status: "queued"|"processing"|"ready"|"failed", downloadUrl?, expiresAt? }

POST /api/v1/users/me/account-deletion-request
Body: { reason?: string, confirmEmail: string }
Response: { requestId, scheduledFor: string }   // typically T+30 days for cancelable
```

### 3.5 Webhook management (for tenants subscribing to ASAB events)
Let company-admins register webhook endpoints for events like `operation.created`, `invoice.paid`.

```
GET    /api/v1/company/me/webhooks
Response: { data: [{ id, url, events: string[], secret_prefix, isActive, lastTriggeredAt?, failureCount }] }

POST   /api/v1/company/me/webhooks
Body: { url, events: string[], description? }
Response: { id, url, events, secret, isActive }   // secret returned ONCE

PATCH  /api/v1/company/me/webhooks/{id}
Body: { url?, events?, isActive? }

DELETE /api/v1/company/me/webhooks/{id}
Response: 204

POST   /api/v1/company/me/webhooks/{id}/test
Body: { event: string }
Response: { delivered: boolean, statusCode?, error? }

GET    /api/v1/company/me/webhooks/{id}/deliveries?page=&pageSize=
Response: paginated list of recent delivery attempts with response details
```

### 3.6 Background job monitoring (admin diagnostics)
Admin needs visibility into long-running jobs (ERP batches, large exports, imports).

```
GET /api/v1/admin/jobs?status=&type=&page=&pageSize=
Response (paginated): {
  data: [{
    id, type: "erp.batch"|"asset.import"|"report.export"|"users.import"|"brand.upload",
    status: "queued"|"running"|"done"|"failed"|"retrying",
    companyId?, branchId?, triggeredBy: { userId, name },
    progressPct, attemptCount, lastError?,
    queuedAt, startedAt?, finishedAt?
  }]
}

POST /api/v1/admin/jobs/{id}/retry      → { ok: true, requeuedAt }
POST /api/v1/admin/jobs/{id}/cancel     → { ok: true, cancelledAt }
```

---

## Section 4 — Confirmations & cleanups

These aren't new endpoints — they're contract clarifications that block the FE from being fully type-safe.

### 4.1 Sales-variance assignment — response shape
`POST /operations/{id}/sales-variance/assign` exists but the response isn't documented. Confirm:
```
Response: {
  operationId,
  varianceTotalHalalas,
  allocations: [{ id, employeeId, employeeName, amountHalalas, appliedAt }],
  remainingUnallocatedHalalas
}
```

### 4.2 Daily inventory reconciliation — confirm shape
`POST /accountant/inventory/branches/{id}/daily-variance-allocation` shape per `MISSING_ENDPOINTS_SPEC §9.2` — please confirm response matches the reconciliation snapshot shape.

### 4.3 Resend forgot-password — rate limit window
`POST /auth/forgot-password/resend` returns `nextResendAvailableAt`. Confirm the window (suggested: 60 seconds first retry, exponential up to 5 minutes).

### 4.4 Realtime: confirm new event names
For features in Sections 1-2, the following events would be broadcast on existing channels:
- `brand.upload.progress` on `operations.company.{companyId}`
- `chat.message.new`, `chat.agent.joined`, `chat.session.closed` on `chat.session.{sessionId}` (new channel)
- `permissions.matrix.updated` on `operations.company.{companyId}` (for cross-admin visibility)

Confirm channel + event naming before broadcasting.

---

## Acceptance criteria

A backend ticket can be considered "done" when:
1. The endpoint matches the path, method, body, and response shape above (camelCase, halalas for money).
2. Errors return the standard envelope: `{ error: { code, message, messageAr, details? } }`.
3. Multi-tenant isolation is enforced (company users can only access their own company's data).
4. Pagination uses `?page=&pageSize=` returning `{ data, meta }` where applicable.
5. Realtime events use existing channel naming + `.event.name` format with leading dot in payload.
6. Binary exports return correct `Content-Disposition` with the filename hinted.

---

## Total count

| Section | Items | Type |
|---------|-------|------|
| 1. Close UI gaps | 10 | New endpoints + 1 extension |
| 2. New concepts | 3 (+ 1 optional) | New domains |
| 3. Operational | 6 | Production readiness |
| 4. Confirmations | 4 | Documentation only |
| **Net-new endpoints** | **~22** | + 4 clarifications |

After this batch ships, **every UI surface in the React app has a real backend endpoint** and the FE → BE contract is closed.

---

## What the FE team will do in parallel

While backend works on the above, the FE will build:
- `NotificationPreferencesPage` (hooks already exist)
- Expense invoice attachments panel
- Operation correction button on rejected rows
- Conditional approve modal (Section 1.6)
- Live chat UI (after Section 2.1)
- Permission history drawer (after Section 2.3)
- 2FA setup wizard (after Section 3.1)
- Webhook management page (after Section 3.5)

No further backend work should be needed unless product adds new features beyond the current scope.
