import { httpRequest } from "@/core/api/http-client";

type LoginRequest = {
  tenant_id: string;
  email: string;
  password: string;
};

type LoginResponse = {
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
