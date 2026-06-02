import { api } from "./client";
import { setTokens, clearTokens } from "./tokens";
import type { LoginResponse, MeResponse } from "./types";

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>("/auth/login", { email, password });
  setTokens({
    accessToken: res.data.accessToken,
    refreshToken: res.data.refreshToken,
  });
  return res.data;
}

export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch {
    // best effort — server logout failure shouldn't block the client clearing state.
  }
  clearTokens();
}

export async function fetchMe(): Promise<MeResponse> {
  const res = await api.get<MeResponse>("/auth/me");
  return res.data;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await api.post("/auth/change-password", { currentPassword, newPassword });
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post("/auth/forgot-password", { email });
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  await api.post("/auth/reset-password", { token, newPassword });
}
