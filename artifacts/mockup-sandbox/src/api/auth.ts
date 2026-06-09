import { api } from "./client";
import { setTokens, clearTokens } from "./tokens";
import type { LoginResponse, MeResponse } from "./types";

// 2FA step-up response — when 2FA is enabled, login returns this instead of tokens.
export interface TwoFactorChallenge {
  requires2fa: true;
  twoFactorToken: string;
}

export type LoginOrChallenge = LoginResponse | TwoFactorChallenge;

export function isTwoFactorChallenge(
  res: LoginOrChallenge,
): res is TwoFactorChallenge {
  return Boolean((res as TwoFactorChallenge).requires2fa);
}

export async function login(
  email: string,
  password: string,
  opts?: { code?: string; rememberMe?: boolean },
): Promise<LoginOrChallenge> {
  const res = await api.post<LoginOrChallenge>("/auth/login", {
    email,
    password,
    ...(opts?.code ? { code: opts.code } : {}),
    ...(opts?.rememberMe ? { rememberMe: true } : {}),
  });
  if (!isTwoFactorChallenge(res.data)) {
    setTokens({
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
    });
  }
  return res.data;
}

// Step 2 of 2FA login — call after receiving { requires2fa, twoFactorToken }.
export async function loginWithTwoFactor(
  twoFactorToken: string,
  code: string,
): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>("/auth/login", {
    twoFactorToken,
    code,
  });
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

export interface ResendForgotPasswordResponse {
  ok: boolean;
  nextResendAvailableAt: string;
}

export async function resendForgotPassword(
  email: string,
): Promise<ResendForgotPasswordResponse> {
  const res = await api.post<ResendForgotPasswordResponse>(
    "/auth/forgot-password/resend",
    { email },
  );
  return res.data;
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  await api.post("/auth/reset-password", { token, newPassword });
}
