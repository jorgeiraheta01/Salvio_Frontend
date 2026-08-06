import { httpRequest } from "@/core/api/http-client";

export type OwnTenantModule = {
  module_key: string;
  label: string;
  enabled: boolean;
};

export async function listOwnTenantModules(): Promise<OwnTenantModule[]> {
  return httpRequest<OwnTenantModule[]>("/api/v1/tenant/modules");
}
