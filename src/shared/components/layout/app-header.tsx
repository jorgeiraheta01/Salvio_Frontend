"use client";

import { Bell, Building2, LogOut } from "lucide-react";

import { useAuthStore } from "@/modules/auth/store/auth.store";
import { useTenant } from "@/shared/components/providers/tenant-provider";
import { Button } from "@/shared/components/ui/button";

export function AppHeader() {
  const logout = useAuthStore((state) => state.logout);
  const tenantId = useTenant();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-5">
      <div>
        <p className="text-sm text-muted-foreground">Operacion clinica</p>
        <div className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground">
          <Building2 className="h-4 w-4 text-primary" />
          {tenantId}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" type="button">
          <Bell className="mr-2 h-4 w-4" />
          Alertas
        </Button>
        <Button variant="outline" size="sm" type="button" onClick={() => logout()}>
          <LogOut className="mr-2 h-4 w-4" />
          Salir
        </Button>
      </div>
    </header>
  );
}
