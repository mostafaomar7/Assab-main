import { useCallback, useEffect, useState } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, isApiError } from "../api/errors";
import { queryKeys } from "../api/queries/keys";

// ─── Module-level subscription-expired state ───────────────────────────────────
// A tiny pub/sub so any component (e.g. SubscriptionExpiredBanner) can react
// when the global error handler detects an expired subscription.
let subscriptionExpired = false;
const expirySubscribers = new Set<(v: boolean) => void>();

function setSubscriptionExpired(v: boolean): void {
  if (subscriptionExpired === v) return;
  subscriptionExpired = v;
  expirySubscribers.forEach((cb) => cb(v));
}

export function getSubscriptionExpired(): boolean {
  return subscriptionExpired;
}

export function subscribeSubscriptionExpired(cb: (v: boolean) => void): () => void {
  expirySubscribers.add(cb);
  return () => {
    expirySubscribers.delete(cb);
  };
}

/** Hook so React components can render based on the module-level expiry flag. */
export function useSubscriptionExpired(): boolean {
  const [v, setV] = useState<boolean>(subscriptionExpired);
  useEffect(() => subscribeSubscriptionExpired(setV), []);
  return v;
}

// ─── Confirm-dialog event bridge ───────────────────────────────────────────────
// Rather than depend on a UI library here, the handler dispatches a window
// event that an app-level provider can subscribe to (or use the helper below).
export interface UpgradeDialogPayload {
  title: string;
  message: string;
  href: string;
}

export const UPGRADE_DIALOG_EVENT = "asab:dialog:upgrade-plan";

function openUpgradeDialog(payload: UpgradeDialogPayload): void {
  window.dispatchEvent(
    new CustomEvent<UpgradeDialogPayload>(UPGRADE_DIALOG_EVENT, { detail: payload }),
  );
}

// ─── Routing helpers ───────────────────────────────────────────────────────────
function navigateHash(hash: string): void {
  if (typeof window === "undefined") return;
  window.location.hash = hash.startsWith("#") ? hash.slice(1) : hash;
}

// ─── Error-code routing ────────────────────────────────────────────────────────
const UPGRADE_HREF = "#/preview/asab/CompanyDashboard?page=ca-subscription";

function arMessage(err: ApiError): string {
  return err.messageAr || err.message;
}

/**
 * Routes an ApiError to specific UX (toasts, dialogs, query invalidation, navigation).
 * Returns void; callers may also let the error propagate.
 */
export function routeApiError(err: unknown, queryClient: QueryClient): void {
  if (!isApiError(err)) {
    // Non-ApiError fallback
    const message =
      err instanceof Error ? err.message : "حدث خطأ غير متوقع";
    toast.error(message);
    return;
  }

  switch (err.code) {
    case "QUOTA_EXCEEDED":
    case "QUOTA_WOULD_EXCEED": {
      toast.error(arMessage(err));
      openUpgradeDialog({
        title: "ترقية الباقة",
        message: arMessage(err),
        href: UPGRADE_HREF,
      });
      return;
    }

    case "SUBSCRIPTION_EXPIRED": {
      toast.error(arMessage(err));
      setSubscriptionExpired(true);
      queryClient.invalidateQueries({ queryKey: queryKeys.subscription });
      return;
    }

    case "OP_NOT_PENDING":
    case "OP_ALREADY_FINAL":
    case "INVALID_TRANSITION": {
      toast.error(arMessage(err));
      queryClient.invalidateQueries({ queryKey: ["operations"] });
      queryClient.invalidateQueries({ queryKey: ["platform", "operations"] });
      return;
    }

    case "LAST_ADMIN_CANNOT_DEMOTE":
    case "LAST_ACTIVE_ADMIN": {
      toast.error("لازم admin تاني نشط");
      return;
    }

    case "INVALID_INVITATION":
    case "INVITATION_EXPIRED": {
      toast.error(arMessage(err));
      navigateHash("#/login");
      return;
    }

    case "SHIFT_ALREADY_OPEN": {
      toast.error(arMessage(err));
      queryClient.invalidateQueries({ queryKey: queryKeys.branchActiveShift });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      return;
    }

    case "BRANCH_HAS_OPEN_OPERATIONS": {
      toast.error(arMessage(err), {
        action: {
          label: "عرض العمليات",
          onClick: () => navigateHash("#/preview/asab/CompanyDashboard?page=operations"),
        },
      });
      return;
    }

    case "VALIDATION_ERROR": {
      const details = (err.details ?? {}) as Record<string, unknown>;
      const firstKey = Object.keys(details)[0];
      const firstValue = firstKey ? details[firstKey] : undefined;
      const firstMsg = Array.isArray(firstValue)
        ? String(firstValue[0] ?? "")
        : typeof firstValue === "string"
          ? firstValue
          : "";
      toast.error(firstMsg || arMessage(err));
      return;
    }

    case "NETWORK_ERROR": {
      toast.error("تعذر الاتصال — جاري إعادة المحاولة");
      return;
    }

    default: {
      toast.error(arMessage(err));
    }
  }
}

/**
 * React hook returning a stable `handleApiError(err)` callback that routes
 * known ApiError codes to specific UX (toast, dialog, invalidation, nav).
 */
export function useGlobalErrorHandler(): (err: unknown) => void {
  const queryClient = useQueryClient();
  return useCallback((err: unknown) => routeApiError(err, queryClient), [queryClient]);
}

// Re-export for callers that want to type-narrow themselves.
export { ApiError, isApiError };
