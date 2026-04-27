"use client";

import { createContext, useContext } from "react";

type TenantContextValue = {
  tenant: string;
};

const TenantContext = createContext<TenantContextValue | null>(null);

type TenantProviderProps = {
  children: React.ReactNode;
  tenant: string;
};

export function TenantProvider({ children, tenant }: TenantProviderProps) {
  return <TenantContext.Provider value={{ tenant }}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error("useTenant must be used within TenantProvider.");
  }

  return context.tenant;
}
