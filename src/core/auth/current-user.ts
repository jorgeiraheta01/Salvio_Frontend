"use client";

import { useMemo } from "react";

import { parseJwt } from "@/core/auth/jwt";
import { useAuthStore } from "@/modules/auth/store/auth.store";

export type CurrentUser = {
  id: string;
  role: string;
  tenantId: string;
};

export function useCurrentUser(): CurrentUser | null {
  const token = useAuthStore((state) => state.token);

  return useMemo(() => {
    if (!token) {
      return null;
    }
    const payload = parseJwt(token);
    if (!payload?.sub || !payload.role || !payload.tenant_id) {
      return null;
    }
    return { id: payload.sub, role: payload.role, tenantId: payload.tenant_id };
  }, [token]);
}

// The platform owner is not a clinic (tenants are clinics only — ADR-01), so this
// identity lives entirely outside the per-tenant User/JWT shape above: no
// tenant_id, no UserRole, just a `type: "platform_admin"` marker issued by
// POST /api/v1/platform-admin/login.
export type PlatformAdminUser = { id: string };

export function usePlatformAdmin(): PlatformAdminUser | null {
  const token = useAuthStore((state) => state.token);

  return useMemo(() => {
    if (!token) {
      return null;
    }
    const payload = parseJwt(token);
    if (!payload?.sub || payload.type !== "platform_admin") {
      return null;
    }
    return { id: payload.sub };
  }, [token]);
}
