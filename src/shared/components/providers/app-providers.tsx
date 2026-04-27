"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { createQueryClient } from "@/core/api/query-client";
import { useAuthStore } from "@/modules/auth/store/auth.store";
import { TenantProvider } from "@/shared/components/providers/tenant-provider";

type AppProvidersProps = {
  children: React.ReactNode;
  tenant: string;
};

export function AppProviders({ children, tenant }: AppProvidersProps) {
  const initialize = useAuthStore((state) => state.initialize);
  const [queryClient] = useState(createQueryClient);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <TenantProvider tenant={tenant}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </TenantProvider>
  );
}
