"use client";

import { useEffect, useState } from "react";
import { BarChart3, Building2, Database, PanelLeftClose, PanelLeftOpen, Receipt, ShieldCheck } from "lucide-react";

import { useAuthStore } from "@/modules/auth/store/auth.store";
import { Button } from "@/shared/components/ui/button";

export type OwnerSection = "clinicas" | "metricas" | "basedatos" | "facturacion";

const OWNER_NAV_ITEMS: { key: OwnerSection; label: string; icon: typeof Building2 }[] = [
  { key: "clinicas", label: "Clinicas", icon: Building2 },
  { key: "metricas", label: "Metricas por clinica", icon: BarChart3 },
  { key: "basedatos", label: "Base de datos", icon: Database },
  { key: "facturacion", label: "Facturacion", icon: Receipt }
];

const OWNER_SIDEBAR_STORAGE_KEY = "salvio_owner_sidebar_collapsed";

function OwnerSidebar({
  section,
  onSelect,
  collapsed,
  onToggle
}: {
  section: OwnerSection | null;
  onSelect: (section: OwnerSection) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside className="flex h-full w-full flex-col justify-between overflow-hidden border-r border-slate-200 bg-white">
      <div>
        <div className={`flex items-center gap-3 px-4 py-4 lg:px-6 lg:py-6 ${collapsed ? "justify-center px-2 lg:px-2" : ""}`}>
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          {collapsed ? null : (
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Salvio</p>
              <p className="truncate text-sm font-bold text-slate-900">Propietario</p>
            </div>
          )}
        </div>
        <nav className="space-y-1 px-3 pb-3 lg:px-4 lg:pb-6">
          {OWNER_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = section === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelect(item.key)}
                title={collapsed ? item.label : undefined}
                className={`flex w-full items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  collapsed ? "justify-center px-0" : ""
                } ${active ? "bg-brand/10 text-brand" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {collapsed ? null : item.label}
              </button>
            );
          })}
        </nav>
      </div>
      <div className={`p-3 lg:p-4 ${collapsed ? "px-2" : ""}`}>
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? "Expandir menu" : "Colapsar menu"}
          className={`flex w-full items-center rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 ${
            collapsed ? "justify-center px-0" : "justify-center gap-2 px-4"
          }`}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {collapsed ? null : "Colapsar"}
        </button>
      </div>
    </aside>
  );
}

/**
 * Shell compartido del panel del owner (sidebar + boton Salir), usado tanto
 * por el dashboard principal (/onboarding) como por paginas de detalle
 * (ej. /onboarding/clinicas/[tenantId]) para que naveguen sin perder el
 * menu lateral ni el resto del design system.
 */
export function OwnerShell({
  activeSection,
  onSelectSection,
  children
}: {
  activeSection: OwnerSection | null;
  onSelectSection: (section: OwnerSection) => void;
  children: React.ReactNode;
}) {
  const logout = useAuthStore((state) => state.logout);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(OWNER_SIDEBAR_STORAGE_KEY);
    if (stored !== null) {
      setSidebarCollapsed(stored === "1");
    } else if (window.innerWidth < 1024) {
      setSidebarCollapsed(true);
    }
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(OWNER_SIDEBAR_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <div
      className="grid min-h-screen bg-slate-100 transition-[grid-template-columns] duration-200"
      style={{ gridTemplateColumns: `${sidebarCollapsed ? "76px" : "240px"} minmax(0,1fr)` }}
    >
      <OwnerSidebar section={activeSection} onSelect={onSelectSection} collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      <div className="min-w-0 px-4 py-6 lg:px-6 lg:py-10">
        <div className="mx-auto mb-6 flex max-w-6xl items-center justify-end">
          <Button type="button" variant="outline" onClick={() => logout(true)}>
            Salir
          </Button>
        </div>

        {children}
      </div>
    </div>
  );
}
