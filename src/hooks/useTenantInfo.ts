"use client";

import { useCallback, useEffect, useState } from "react";

export type TenantInfo = {
  logo?: string | null;
  nombreClinica: string;
  primaryColor?: string | null;
};

type UseTenantInfoOptions = {
  enabled?: boolean;
};

type UseTenantInfoResult = {
  error: string | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
  tenantData: TenantInfo | null;
};

const TENANT_CACHE_KEY = "salvio.tenant";

function formatClinicName(subdomain: string): string {
  return subdomain
    .split("-")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function getFallbackTenant(subdomain: string): TenantInfo | null {
  if (!subdomain) {
    return null;
  }

  return {
    nombreClinica: formatClinicName(subdomain),
    primaryColor: "#2563EB"
  };
}

function readCachedTenant(subdomain: string): TenantInfo | null {
  if (typeof window === "undefined" || !subdomain) {
    return null;
  }

  const cached = window.sessionStorage.getItem(TENANT_CACHE_KEY);
  if (!cached) {
    return null;
  }

  try {
    const parsed = JSON.parse(cached) as TenantInfo & { subdomain?: string };
    return parsed.subdomain === subdomain
      ? {
          logo: parsed.logo,
          nombreClinica: parsed.nombreClinica,
          primaryColor: parsed.primaryColor
        }
      : null;
  } catch {
    window.sessionStorage.removeItem(TENANT_CACHE_KEY);
    return null;
  }
}

function writeCachedTenant(subdomain: string, tenantData: TenantInfo) {
  if (typeof window === "undefined" || !subdomain) {
    return;
  }

  window.sessionStorage.setItem(
    TENANT_CACHE_KEY,
    JSON.stringify({
      ...tenantData,
      subdomain
    })
  );
}

export function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeout = 5000) {
  const controller = new AbortController();
  const externalSignal = init.signal;
  const timeoutId = window.setTimeout(() => controller.abort(), timeout);

  if (externalSignal) {
    externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  return fetch(input, {
    ...init,
    signal: controller.signal
  }).finally(() => window.clearTimeout(timeoutId));
}

export function useTenantInfo(subdomain: string, options: UseTenantInfoOptions = {}): UseTenantInfoResult {
  const enabled = options.enabled ?? true;
  const [tenantData, setTenantData] = useState<TenantInfo | null>(() => readCachedTenant(subdomain) ?? getFallbackTenant(subdomain));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTenantInfo = useCallback(
    async (signal?: AbortSignal) => {
      void signal;

      if (!subdomain) {
        setTenantData(null);
        setError("No pudimos identificar la clinica desde el subdominio.");
        setIsLoading(false);
        return;
      }

      const cachedTenant = readCachedTenant(subdomain);
      if (cachedTenant) {
        setTenantData(cachedTenant);
        setIsLoading(false);
      } else {
        const fallbackTenant = getFallbackTenant(subdomain);
        setTenantData(fallbackTenant);
        if (fallbackTenant) {
          writeCachedTenant(subdomain, fallbackTenant);
        }
      }

      setIsLoading(false);
      setError(null);
    },
    [subdomain]
  );

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    void fetchTenantInfo(controller.signal);

    return () => controller.abort();
  }, [enabled, fetchTenantInfo]);

  const refetch = useCallback(async () => {
    await fetchTenantInfo();
  }, [fetchTenantInfo]);

  return { tenantData, isLoading, error, refetch };
}
