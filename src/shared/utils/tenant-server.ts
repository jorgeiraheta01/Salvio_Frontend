import { headers } from "next/headers";

import { getDefaultTenant, resolveTenantFromHost } from "@/shared/utils/tenant";

export function getTenantServer(): string {
  const host = headers().get("host");
  const resolved = resolveTenantFromHost(host);
  return resolved || getDefaultTenant();
}
