import { headers } from "next/headers";

import { TENANT_HEADER, getDefaultTenant } from "@/shared/utils/tenant";

export function getTenantServer(): string {
  return headers().get(TENANT_HEADER) || getDefaultTenant();
}
