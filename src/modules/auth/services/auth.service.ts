import { httpRequest } from "@/core/api/http-client";

type LoginRequest = {
  tenant_id: string;
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  refresh_token?: string | null;
  requires_2fa?: boolean;
  temp_token?: string | null;
};

export type TwoFAVerifyResponse = {
  access_token: string;
  refresh_token?: string | null;
};

export async function login(email: string, password: string, tenantId: string): Promise<LoginResponse> {
  const payload: LoginRequest = {
    tenant_id: tenantId,
    email,
    password
  };

  return httpRequest<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: payload,
    auth: false
  });
}

// 2FA es obligatorio para platform_admin: login nunca entrega access_token
// directo. "setup_required" es el primer login (o 2FA nunca confirmado) y
// entrega un setup_token de corta duracion solo valido para /2fa/setup*;
// "code_required" es cualquier login posterior y entrega un pending_token
// solo valido para /2fa/verify.
export type PlatformAdminLoginResponse =
  | { status: "setup_required"; setup_token: string }
  | { status: "code_required"; pending_token: string };

export async function platformAdminLogin(email: string, password: string): Promise<PlatformAdminLoginResponse> {
  return httpRequest<PlatformAdminLoginResponse>("/api/v1/platform-admin/login", {
    method: "POST",
    body: { email, password },
    auth: false
  });
}

export type PlatformAdminTotpSetup = { secret: string; qr_base64: string };

export async function platformAdminGetTotpSetup(setupToken: string): Promise<PlatformAdminTotpSetup> {
  return httpRequest<PlatformAdminTotpSetup>("/api/v1/platform-admin/2fa/setup", {
    method: "GET",
    auth: false,
    headers: { Authorization: `Bearer ${setupToken}` }
  });
}

export type PlatformAdminTotpConfirmResponse = { access_token: string; recovery_codes: string[] };

export async function platformAdminConfirmTotpSetup(setupToken: string, code: string): Promise<PlatformAdminTotpConfirmResponse> {
  return httpRequest<PlatformAdminTotpConfirmResponse>("/api/v1/platform-admin/2fa/setup/confirm", {
    method: "POST",
    body: { code },
    auth: false,
    headers: { Authorization: `Bearer ${setupToken}` }
  });
}

export async function platformAdminVerifyTotp(pendingToken: string, code: string): Promise<{ access_token: string }> {
  return httpRequest<{ access_token: string }>("/api/v1/platform-admin/2fa/verify", {
    method: "POST",
    body: { code },
    auth: false,
    headers: { Authorization: `Bearer ${pendingToken}` }
  });
}

export async function verifyTwoFA(otpCode: string, tempToken: string): Promise<TwoFAVerifyResponse> {
  return httpRequest<TwoFAVerifyResponse>("/api/v1/auth/2fa/verify", {
    method: "POST",
    body: { otp_code: otpCode, temp_token: tempToken },
    auth: false
  });
}

export async function logout(refreshToken: string): Promise<void> {
  await httpRequest<{ message: string }>("/api/v1/auth/logout", {
    method: "POST",
    body: { refresh_token: refreshToken }
  });
}

export async function requestPasswordReset(tenantId: string, email: string): Promise<{ message: string }> {
  return httpRequest<{ message: string }>("/api/v1/auth/password-reset/request", {
    method: "POST",
    body: { tenant_id: tenantId, email },
    auth: false
  });
}

export async function confirmPasswordReset(resetToken: string, newPassword: string): Promise<{ message: string }> {
  return httpRequest<{ message: string }>("/api/v1/auth/password-reset/confirm", {
    method: "POST",
    body: { reset_token: resetToken, new_password: newPassword },
    auth: false
  });
}
