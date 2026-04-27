const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const DEFAULT_TENANT = "clinica_demo";
export const TENANT_HEADER = "x-tenant-id";

export function normalizeTenant(tenant: string): string {
  return tenant.trim().toLowerCase().replace(/-/g, "_");
}

export function getDefaultTenant(): string {
  return DEFAULT_TENANT;
}

export function resolveTenantFromHost(hostname?: string | null): string {
  const resolvedHostname = hostname?.trim().toLowerCase().replace(/:\d+$/, "") ?? "";

  if (!resolvedHostname || LOCAL_HOSTS.has(resolvedHostname)) {
    return getDefaultTenant();
  }

  const [subdomain] = resolvedHostname.split(".");
  if (!subdomain) {
    return getDefaultTenant();
  }

  return normalizeTenant(subdomain);
}
