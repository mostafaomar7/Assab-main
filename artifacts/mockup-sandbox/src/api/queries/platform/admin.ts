import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, downloadBlob, type Page } from "../../client";
import { getErrorMessage } from "../../errors";
import type {
  AdminAuditLogEntry,
  AdminBrand,
  AdminBranch,
  AdminBrandUploadStatus,
  AdminBrandUploadType,
  AdminCompany,
  AdminDistribution,
  AdminPermission,
  AdminPermissionsMatrix,
  AdminReportItem,
  AdminRestaurant,
  AdminRestaurantSubscription,
  AdminSettings,
  AdminSubscription,
  AdminUserRow,
  PlatformAdminOverview,
} from "../../types/platform";
import {
  queryKeys,
  type AdminAuditLogsFilter,
  type AdminBranchesFilter,
  type AdminBrandsFilter,
  type AdminCompaniesFilter,
  type AdminSubscriptionsFilter,
  type AdminUsersFilter,
} from "../keys";

// ─── Overview ────────────────────────────────────────────────────────────────
export function useAdminOverview() {
  return useQuery({
    queryKey: queryKeys.platformAdminOverview,
    queryFn: async () => {
      const res = await api.get<PlatformAdminOverview>("/admin/overview");
      return res.data;
    },
    staleTime: 15_000,
  });
}

// ─── Companies ───────────────────────────────────────────────────────────────
export function useAdminCompanies(filter: AdminCompaniesFilter = {}) {
  return useQuery({
    queryKey: queryKeys.platformAdminCompanies(filter),
    queryFn: async () => {
      const res = await api.get<Page<AdminCompany> | AdminCompany[]>(
        "/admin/companies",
        { params: filter },
      );
      const d = res.data as Page<AdminCompany> | AdminCompany[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useAdminCompany(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.platformAdminCompany(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await api.get<AdminCompany>(`/admin/companies/${id}`);
      return res.data;
    },
  });
}

export function useCreateAdminCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<AdminCompany> & {
      name: string;
      contactName: string;
      contactEmail: string;
      contactPhone: string;
      city: string;
      plan: "Basic" | "Professional" | "Enterprise";
      modules: string[];
      adminEmail: string;
    }) => {
      const res = await api.post<AdminCompany>("/admin/companies", body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "companies"] });
      toast.success("تم إنشاء الشركة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUpdateAdminCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<AdminCompany>) => {
      const res = await api.patch<AdminCompany>(
        `/admin/companies/${id}`,
        patch,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "companies"] });
      toast.success("تم تحديث الشركة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeleteAdminCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/companies/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "companies"] });
      toast.success("تم حذف الشركة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useSuspendAdminCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<AdminCompany>(
        `/admin/companies/${id}/suspend`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "companies"] });
      toast.success("تم تعليق الشركة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useActivateAdminCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<AdminCompany>(
        `/admin/companies/${id}/activate`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "companies"] });
      toast.success("تم تفعيل الشركة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUpgradeAdminCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      plan,
    }: {
      id: string;
      plan: "Basic" | "Professional" | "Enterprise";
    }) => {
      const res = await api.post<AdminCompany>(
        `/admin/companies/${id}/upgrade`,
        { plan },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "companies"] });
      toast.success("تم ترقية خطة الشركة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useAdminCompanyModules(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.platformAdminCompanyModules(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await api.get<{ data?: unknown[] } | unknown[]>(
        `/admin/companies/${id}/modules`,
      );
      const d = res.data as { data?: unknown[] } | unknown[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useUpdateAdminCompanyModules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      modules,
    }: {
      id: string;
      modules: Array<{ moduleKey: string; isActive: boolean }> | string[];
    }) => {
      const res = await api.patch(`/admin/companies/${id}/modules`, {
        modules,
      });
      return res.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.platformAdminCompanyModules(vars.id),
      });
      toast.success("تم تحديث وحدات الشركة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useAdminCompanyUsage(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.platformAdminCompanyUsage(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await api.get<Record<string, unknown>>(
        `/admin/companies/${id}/usage`,
      );
      return res.data;
    },
  });
}

// ─── Brands ──────────────────────────────────────────────────────────────────
export function useAdminBrands(filter: AdminBrandsFilter = {}) {
  return useQuery({
    queryKey: queryKeys.platformAdminBrands(filter),
    queryFn: async () => {
      const res = await api.get<Page<AdminBrand> | AdminBrand[]>(
        "/admin/brands",
        { params: filter },
      );
      const d = res.data as Page<AdminBrand> | AdminBrand[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useCreateAdminBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      abbr?: string;
      color?: string;
      ownerEmail?: string;
      plan: string;
      modules: string[];
    }) => {
      const res = await api.post<AdminBrand>("/admin/brands", body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "brands"] });
      toast.success("تم إضافة العلامة التجارية");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUpdateAdminBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<AdminBrand>) => {
      const res = await api.patch<AdminBrand>(`/admin/brands/${id}`, patch);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "brands"] });
      toast.success("تم تحديث العلامة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeleteAdminBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/brands/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "brands"] });
      toast.success("تم حذف العلامة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useCreateAdminRestaurant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      brandId,
      ...body
    }: {
      brandId: string;
      name: string;
      city: string;
      status?: "active" | "suspended";
    }) => {
      const res = await api.post<AdminRestaurant>(
        `/admin/brands/${brandId}/restaurants`,
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "brands"] });
      toast.success("تم إضافة المطعم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Restaurants ─────────────────────────────────────────────────────────────
export function useUpdateAdminRestaurant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<AdminRestaurant>) => {
      const res = await api.patch<AdminRestaurant>(
        `/admin/restaurants/${id}`,
        patch,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "brands"] });
      qc.invalidateQueries({
        queryKey: queryKeys.platformAdminRestaurantSubs,
      });
      toast.success("تم تحديث المطعم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeleteAdminRestaurant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/restaurants/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "brands"] });
      toast.success("تم حذف المطعم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useAdminRestaurantSubscriptions() {
  return useQuery({
    queryKey: queryKeys.platformAdminRestaurantSubs,
    queryFn: async () => {
      const res = await api.get<
        Page<AdminRestaurantSubscription> | AdminRestaurantSubscription[]
      >("/admin/restaurants/subscriptions");
      const d = res.data as
        | Page<AdminRestaurantSubscription>
        | AdminRestaurantSubscription[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

// ─── Branches ────────────────────────────────────────────────────────────────
export function useAdminBranches(filter: AdminBranchesFilter = {}) {
  return useQuery({
    queryKey: queryKeys.platformAdminBranches(filter),
    queryFn: async () => {
      const res = await api.get<Page<AdminBranch> | AdminBranch[]>(
        "/admin/branches",
        { params: filter },
      );
      const d = res.data as Page<AdminBranch> | AdminBranch[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useCreateAdminBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      restaurantId,
      ...body
    }: {
      restaurantId: string;
      name: string;
      manager?: string;
      managerUserId?: string;
      city?: string;
      address?: string;
      phone?: string;
    }) => {
      const res = await api.post<AdminBranch>(
        `/admin/restaurants/${restaurantId}/branches`,
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "branches"] });
      qc.invalidateQueries({ queryKey: ["platform", "admin", "brands"] });
      toast.success("تم إضافة الفرع");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUpdateAdminBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<AdminBranch>) => {
      const res = await api.patch<AdminBranch>(`/admin/branches/${id}`, patch);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "branches"] });
      qc.invalidateQueries({ queryKey: ["platform", "admin", "brands"] });
      toast.success("تم تحديث الفرع");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeleteAdminBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/branches/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "branches"] });
      toast.success("تم حذف الفرع");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Users ───────────────────────────────────────────────────────────────────
export function useAdminUsers(filter: AdminUsersFilter = {}) {
  return useQuery({
    queryKey: queryKeys.platformAdminUsers(filter),
    queryFn: async () => {
      const res = await api.get<Page<AdminUserRow> | AdminUserRow[]>(
        "/admin/users",
        { params: filter },
      );
      const d = res.data as Page<AdminUserRow> | AdminUserRow[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useCreateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<AdminUserRow> & {
      name: string;
      email: string;
      role: string;
      brands?: string[];
      restaurants?: string[];
      branches?: string[];
      modules?: string[];
      reportsTo?: string;
      scope?: "all" | "brand" | "restaurant" | "branch";
      status?: "active" | "inactive";
      sendLoginEmail?: boolean;
    }) => {
      const res = await api.post<AdminUserRow>("/admin/users", body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "users"] });
      toast.success("تم إنشاء المستخدم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useImportAdminUsers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post<{
        imported: number;
        skipped: number;
        errors: Array<{ row: number; field: string; message: string }>;
      }>("/admin/users/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "users"] });
      toast.success(`تم استيراد ${data.imported} مستخدم`);
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUpdateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<AdminUserRow>) => {
      const res = await api.patch<AdminUserRow>(`/admin/users/${id}`, patch);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "users"] });
      toast.success("تم تحديث المستخدم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeleteAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/users/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "users"] });
      toast.success("تم حذف المستخدم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useActivateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<AdminUserRow>(`/admin/users/${id}/activate`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "users"] });
      toast.success("تم تفعيل المستخدم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeactivateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<AdminUserRow>(
        `/admin/users/${id}/deactivate`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "users"] });
      toast.success("تم إيقاف المستخدم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Distribution ────────────────────────────────────────────────────────────
export function useAdminDistribution() {
  return useQuery({
    queryKey: queryKeys.platformAdminDistribution,
    queryFn: async () => {
      const res = await api.get<AdminDistribution>("/admin/distribution");
      return res.data;
    },
  });
}

export function useAssignRestaurant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      accountantId: string;
      restaurantId: string;
    }) => {
      const res = await api.post(
        "/admin/distribution/assign-restaurant",
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.platformAdminDistribution });
      toast.success("تم تعيين المطعم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUnassignRestaurant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      accountantId: string;
      restaurantId: string;
    }) => {
      await api.delete("/admin/distribution/assign-restaurant", { data: body });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.platformAdminDistribution });
      toast.success("تم إلغاء تعيين المطعم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useAssignModules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      accountantId: string;
      restaurantId: string;
      modules: string[];
    }) => {
      const res = await api.post("/admin/distribution/assign-modules", body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.platformAdminDistribution });
      toast.success("تم تعيين الوحدات");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useMoveToHead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { accountantId: string; headId: string }) => {
      const res = await api.post("/admin/distribution/move-to-head", body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.platformAdminDistribution });
      toast.success("تم نقل المحاسب");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Subscriptions ───────────────────────────────────────────────────────────
export function useAdminSubscriptions(filter: AdminSubscriptionsFilter = {}) {
  return useQuery({
    queryKey: queryKeys.platformAdminSubscriptions(filter),
    queryFn: async () => {
      const res = await api.get<Page<AdminSubscription> | AdminSubscription[]>(
        "/admin/subscriptions",
        { params: filter },
      );
      const d = res.data as Page<AdminSubscription> | AdminSubscription[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useRenewSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      months,
    }: {
      id: string;
      months?: number;
    }) => {
      const res = await api.post<AdminSubscription>(
        `/admin/subscriptions/${id}/renew`,
        { months },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["platform", "admin", "subscriptions"],
      });
      toast.success("تم تجديد الاشتراك");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useChangeSubscriptionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      plan,
    }: {
      id: string;
      plan: string;
    }) => {
      const res = await api.post<AdminSubscription>(
        `/admin/subscriptions/${id}/change-plan`,
        { plan },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["platform", "admin", "subscriptions"],
      });
      toast.success("تم تغيير الخطة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useToggleAutoReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      enabled,
    }: {
      id: string;
      enabled: boolean;
    }) => {
      const res = await api.post<AdminSubscription>(
        `/admin/subscriptions/${id}/toggle-auto-reminder`,
        { enabled },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["platform", "admin", "subscriptions"],
      });
      toast.success("تم تحديث التذكير التلقائي");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useSuspendSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<AdminSubscription>(
        `/admin/subscriptions/${id}/suspend`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["platform", "admin", "subscriptions"],
      });
      toast.success("تم تعليق الاشتراك");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useActivateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<AdminSubscription>(
        `/admin/subscriptions/${id}/activate`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["platform", "admin", "subscriptions"],
      });
      toast.success("تم تفعيل الاشتراك");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Permissions ─────────────────────────────────────────────────────────────
export function useAdminPermissions() {
  return useQuery({
    queryKey: queryKeys.platformAdminPermissions,
    queryFn: async () => {
      const res = await api.get<AdminPermissionsMatrix>("/admin/permissions");
      return res.data;
    },
  });
}

export function useUpdateAdminPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (matrix: AdminPermissionsMatrix["matrix"]) => {
      const res = await api.put<AdminPermissionsMatrix>(
        "/admin/permissions",
        { matrix },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.platformAdminPermissions });
      toast.success("تم حفظ الصلاحيات");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function usePatchPermissionCell() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      module: string;
      roleKey: string;
      permission: AdminPermission;
    }) => {
      const res = await api.patch("/admin/permissions/cell", body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.platformAdminPermissions });
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useClonePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { fromRole: string; toRole: string }) => {
      const res = await api.post("/admin/permissions/clone", body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.platformAdminPermissions });
      toast.success("تم نسخ الصلاحيات");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Audit ───────────────────────────────────────────────────────────────────
export function useAdminAuditLogs(filter: AdminAuditLogsFilter = {}) {
  return useQuery({
    queryKey: queryKeys.platformAdminAuditLogs(filter),
    queryFn: async () => {
      const res = await api.get<Page<AdminAuditLogEntry>>(
        "/admin/audit-logs",
        { params: filter },
      );
      return res.data;
    },
  });
}

// ─── Settings ────────────────────────────────────────────────────────────────
export function useAdminSettings() {
  return useQuery({
    queryKey: queryKeys.platformAdminSettings,
    queryFn: async () => {
      const res = await api.get<AdminSettings>("/admin/settings");
      return res.data;
    },
  });
}

export function useUpdateAdminSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<AdminSettings>) => {
      const res = await api.patch<AdminSettings>("/admin/settings", patch);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.platformAdminSettings });
      toast.success("تم حفظ الإعدادات");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Reports ─────────────────────────────────────────────────────────────────
export function useAdminReportsCatalog() {
  return useQuery({
    queryKey: queryKeys.platformAdminReportsCatalog,
    queryFn: async () => {
      const res = await api.get<
        { data: AdminReportItem[] } | AdminReportItem[]
      >("/admin/reports/catalog");
      const d = res.data as { data?: AdminReportItem[] } | AdminReportItem[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useGenerateAdminReport() {
  return useMutation({
    mutationFn: async (body: {
      reportKey: string;
      period: { from: string; to: string };
      brandIds?: string[];
      restaurantIds?: string[];
      format?: "json" | "pdf" | "xlsx";
    }) => {
      if (body.format === "pdf" || body.format === "xlsx") {
        await downloadBlob(
          "/admin/reports/generate",
          `admin-report-${body.reportKey}.${body.format}`,
          body,
        );
        return null;
      }
      const res = await api.post("/admin/reports/generate", body);
      return res.data;
    },
    onSuccess: () => toast.success("تم توليد التقرير"),
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Bulk uploads (multipart) ────────────────────────────────────────────────
export function useAdminUploadBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      brandId,
      type,
      file,
    }: {
      brandId: string;
      type: Exclude<AdminBrandUploadType, "employees" | "fixed-assets">;
      file: File;
    }) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post<{
        uploadedCount: number;
        errors?: Array<{ row: number; message: string }>;
      }>(`/admin/brands/${brandId}/upload/${type}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.platformAdminBrandUploadStatus(vars.brandId),
      });
      toast.success("تم رفع الملف");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useAdminUploadEmployees() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      restaurantId,
      file,
    }: {
      restaurantId: string;
      file: File;
    }) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post<{
        uploadedCount?: number;
        errors?: Array<{ row: number; message: string }>;
      }>(`/admin/restaurants/${restaurantId}/upload/employees`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["platform", "admin", "brands"],
      });
      toast.success("تم رفع الموظفين");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useAdminUploadFixedAssets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      branchId,
      file,
    }: {
      branchId: string;
      file: File;
    }) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post<{
        assetCount: number;
        branchGroups?: Record<string, number>;
        notifications?: number;
      }>(`/admin/branches/${branchId}/upload/fixed-assets`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "branches"] });
      toast.success("تم رفع الأصول الثابتة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useAdminUploadTemplate() {
  return useMutation({
    mutationFn: async ({
      type,
      filename,
    }: {
      type: AdminBrandUploadType;
      filename?: string;
    }) => {
      await downloadBlob(
        `/admin/upload/templates/${type}`,
        filename ?? `admin-template-${type}.xlsx`,
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useAdminBrandUploadStatus(brandId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.platformAdminBrandUploadStatus(brandId ?? ""),
    enabled: Boolean(brandId),
    queryFn: async () => {
      const res = await api.get<AdminBrandUploadStatus>(
        `/admin/brands/${brandId}/upload-status`,
      );
      return res.data;
    },
  });
}

export function useExportAdminAuditLogs() {
  return useMutation({
    mutationFn: async (
      filter: {
        format?: "xlsx" | "csv";
        actionType?: string;
        userFilter?: string;
        dateFrom?: string;
        dateTo?: string;
      } = {},
    ) => {
      const fmt = filter.format ?? "xlsx";
      await downloadBlob(
        "/admin/audit-logs/export",
        `admin-audit-logs.${fmt}`,
        { ...filter, format: fmt },
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export interface AdminAuditLogFilterOption {
  value: string;
  labelAr: string;
  labelEn: string;
}

export function useAdminAuditLogFilters() {
  return useQuery({
    queryKey: ["platform", "admin", "audit-logs", "filters"] as const,
    queryFn: async () => {
      const res = await api.get<{ actionTypes: AdminAuditLogFilterOption[] }>(
        "/admin/audit-logs/filters",
      );
      return res.data;
    },
    staleTime: 5 * 60_000,
  });
}

// ─── Section 1.1: Per-restaurant subscription renewal ──────────────────────
export function useRenewRestaurantSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      restaurantId,
      months,
    }: { restaurantId: string; months?: number }) => {
      const res = await api.post(
        `/admin/restaurants/${restaurantId}/subscription/renew`,
        months !== undefined ? { months } : {},
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "restaurants"] });
      qc.invalidateQueries({ queryKey: ["platform", "admin", "subscriptions"] });
      toast.success("تم تجديد الاشتراك");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Section 1.2: Brand auto-reminder toggle ───────────────────────────────
export function useToggleBrandAutoReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      brandId,
      enabled,
    }: { brandId: string; enabled: boolean }) => {
      const res = await api.post<{ brandId: string; enabled: boolean; updatedAt: string }>(
        `/admin/brands/${brandId}/auto-reminder`,
        { enabled },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "brands"] });
      qc.invalidateQueries({ queryKey: ["platform", "admin", "subscriptions"] });
      toast.success("تم تحديث تفعيل التذكير التلقائي");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Section 1.3: Audit-log entry detail (before/after diff) ──────────────
export interface AdminAuditLogDetail {
  id: string;
  action: string;
  actorName: string;
  actorRole: string;
  entityType: string;
  entityId: string;
  description?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ip?: string;
  userAgent?: string;
  occurredAt: string;
}

export function useAdminAuditLogEntry(id: string | null | undefined) {
  return useQuery({
    queryKey: ["platform", "admin", "audit-logs", id] as const,
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await api.get<AdminAuditLogDetail>(`/admin/audit-logs/${id}`);
      return res.data;
    },
  });
}

// ─── Section 2.3: Permission matrix versioning ────────────────────────────
export interface PermissionsHistoryRow {
  id: string;
  savedBy: { id: string; name: string };
  savedAt: string;
  changesCount: number;
  summaryAr: string;
}

export interface PermissionsHistoryPage {
  data: PermissionsHistoryRow[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export function useAdminPermissionsHistory(
  filter: { page?: number; pageSize?: number } = {},
) {
  return useQuery({
    queryKey: ["platform", "admin", "permissions", "history", filter] as const,
    queryFn: async () => {
      const res = await api.get<PermissionsHistoryPage>(
        "/admin/permissions/history",
        { params: filter },
      );
      return res.data;
    },
  });
}

export function useAdminPermissionsSnapshot(snapshotId: string | null | undefined) {
  return useQuery({
    queryKey: ["platform", "admin", "permissions", "history", snapshotId] as const,
    enabled: Boolean(snapshotId),
    queryFn: async () => {
      const res = await api.get(`/admin/permissions/history/${snapshotId}`);
      return res.data;
    },
  });
}

export function useRestoreAdminPermissionsSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (snapshotId: string) => {
      const res = await api.post(
        `/admin/permissions/history/${snapshotId}/restore`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "permissions"] });
      toast.success("تم استرجاع المصفوفة من النسخة المختارة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Section 3.6: Background-job monitoring ───────────────────────────────
export type AdminJobStatus = "queued" | "running" | "done" | "failed" | "retrying";
export type AdminJobType =
  | "erp.batch" | "asset.import" | "report.export"
  | "users.import" | "brand.upload";

export interface AdminJob {
  id: string;
  type: AdminJobType | string;
  status: AdminJobStatus | string;
  companyId?: string;
  branchId?: string;
  triggeredBy: { userId: string; name: string };
  progressPct: number;
  attemptCount: number;
  lastError?: string;
  queuedAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export function useAdminJobs(
  filter: {
    status?: string; type?: string;
    page?: number; pageSize?: number;
  } = {},
) {
  return useQuery({
    queryKey: ["platform", "admin", "jobs", filter] as const,
    queryFn: async () => {
      const res = await api.get<{
        data: AdminJob[];
        meta: { page: number; pageSize: number; total: number; totalPages: number };
      }>("/admin/jobs", { params: filter });
      return res.data;
    },
    refetchInterval: 15_000,
  });
}

export function useRetryAdminJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<{ ok: true; requeuedAt: string }>(
        `/admin/jobs/${id}/retry`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "jobs"] });
      toast.success("تم إعادة جدولة المهمة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useCancelAdminJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<{ ok: true; cancelledAt: string }>(
        `/admin/jobs/${id}/cancel`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admin", "jobs"] });
      toast.success("تم إلغاء المهمة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
