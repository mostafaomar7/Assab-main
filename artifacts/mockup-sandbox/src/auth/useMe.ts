import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "../api/auth";
import { getTokens } from "../api/tokens";

export const ME_QUERY_KEY = ["auth", "me"] as const;

/**
 * React Query wrapper around /auth/me. Returns null when no token is stored
 * (skips the network call) — useful for components that want the fresh
 * permission map without depending on the AuthContext bootstrap timing.
 */
export function useMe() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: fetchMe,
    enabled: Boolean(getTokens()?.accessToken),
    staleTime: 60_000,
  });
}
