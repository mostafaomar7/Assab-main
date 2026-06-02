import { useMutation } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";

interface UpdatePrefsBody {
  language?: "ar" | "en";
  theme?: "light" | "dark";
}

/**
 * Persists the user's language/theme preference via PATCH /company/me/preferences.
 * Safe no-op for the platform `admin` role (no companyId) — the mutation just skips.
 */
export function useLanguagePref() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (prefs: UpdatePrefsBody) => {
      // Platform admin has no /company/me/* surface — skip silently.
      if (!user?.companyId) return prefs;
      await api.patch("/company/me/preferences", prefs);
      return prefs;
    },
  });
}
