import { httpRequest } from "@/core/api/http-client";

export type TenantSelf = {
  tenant_id: string;
  name: string;
  country?: string | null;
};

export async function getMyTenant(): Promise<TenantSelf> {
  return httpRequest<TenantSelf>("/api/v1/tenant/me");
}
