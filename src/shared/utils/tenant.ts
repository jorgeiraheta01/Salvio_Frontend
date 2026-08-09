const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const DEFAULT_TENANT = "clinica_demo";
const ROOT_DOMAIN = "salvio.lat";
export const TENANT_HEADER = "x-tenant-id";

/** URL publica de acceso de un tenant, vía su subdominio en el dominio real (wildcard *.salvio.lat). */
export function tenantUrl(tenantId: string): string {
  return `https://${tenantId}.${ROOT_DOMAIN}`;
}

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
