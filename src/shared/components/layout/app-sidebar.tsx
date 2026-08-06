"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { useTenant } from "@/shared/components/providers/tenant-provider";
import { cn } from "@/shared/utils/cn";

const navItems = [
  {
    href: "/dashboard",
    label: "Resumen",
    path: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
  },
  {
    href: "/agenda",
    label: "Agenda",
    path: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
  },
  {
    href: "/patients",
    label: "Pacientes",
    path: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
  },
  {
    href: "/operacion",
    label: "Operacion",
    path: "M13 10V3L4 14h7v7l9-11h-7z"
  },
  {
    href: "/catalogos",
    label: "Catalogos",
    path: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
  }
];

export function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const tenantId = useTenant();
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-full flex-col justify-between overflow-hidden border-r border-slate-200 bg-white" data-purpose="sidebar">
      <div>
        <div className={cn("flex items-center gap-2 p-6", collapsed && "justify-center px-3")}>
          {collapsed ? (
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">
              {tenantId?.slice(0, 1).toUpperCase()}
            </div>
          ) : (
            <div className="min-w-0">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Tenant activo</p>
              <h2 className="truncate text-xl font-extrabold text-slate-900">{tenantId}</h2>
            </div>
          )}
        </div>
        <nav className="mt-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center py-3 text-sm transition-colors",
                  collapsed ? "justify-center px-0" : "px-6",
                  isActive
                    ? "border-r-[3px] border-brand bg-brand-light font-semibold text-brand"
                    : "font-medium text-slate-500 hover:bg-slate-50"
                )}
              >
                <svg className={cn("h-5 w-5 flex-shrink-0", !collapsed && "mr-3")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d={item.path} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                </svg>
                {collapsed ? null : item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className={cn("space-y-2 p-6", collapsed && "px-3")}>
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? "Expandir menu" : "Colapsar menu"}
          className={cn(
            "flex w-full items-center rounded-custom border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50",
            collapsed ? "justify-center px-0" : "justify-center gap-2 px-4"
          )}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {collapsed ? null : "Colapsar"}
        </button>
        {collapsed ? null : (
          <Link
            href="/dashboard"
            className="block w-full rounded-custom border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
          >
            Volver al panel
          </Link>
        )}
      </div>
    </aside>
  );
}
