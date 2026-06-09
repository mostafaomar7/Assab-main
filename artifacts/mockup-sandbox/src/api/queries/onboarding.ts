import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../client";
import { getErrorMessage } from "../errors";

// ─── Section 2.2: Onboarding tour state ────────────────────────────────────

export interface OnboardingState {
  completedSteps: string[];
  skipped: boolean;
  completedAt?: string | null;
}

const KEY = ["users", "me", "onboarding-state"] as const;

export function useOnboardingState() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await api.get<OnboardingState>("/users/me/onboarding-state");
      return res.data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useUpdateOnboardingState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: {
      stepCompleted?: string;
      skip?: boolean;
      reset?: boolean;
    }) => {
      const res = await api.patch<OnboardingState>(
        "/users/me/onboarding-state",
        patch,
      );
      return res.data;
    },
    onSuccess: (data) => {
      qc.setQueryData(KEY, data);
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
