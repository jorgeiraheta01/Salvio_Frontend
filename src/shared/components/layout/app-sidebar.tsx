"use client";

import Link from "next/link";
import { Activity, CalendarDays, LayoutDashboard, Package2, Stethoscope } from "lucide-react";

import { useTenant } from "@/shared/components/providers/tenant-provider";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";

const navItems = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { href: "#agenda", label: "Agenda", icon: CalendarDays },
  { href: "#pacientes", label: "Pacientes", icon: Stethoscope },
  { href: "#operacion", label: "Operacion", icon: Activity },
  { href: "#catalogos", label: "Catalogos", icon: Package2 }
];

export function AppSidebar() {
  const tenantId = useTenant();

  return (
    <aside className="flex h-full w-full flex-col border-r bg-white">
      <div className="border-b px-5 py-5">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Tenant activo</p>
        <p className="mt-2 truncate text-lg font-semibold text-foreground">{tenantId}</p>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 text-primary" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <Button asChild variant="outline" className="w-full">
          <Link href="/dashboard">Volver al panel</Link>
        </Button>
      </div>
    </aside>
  );
}
