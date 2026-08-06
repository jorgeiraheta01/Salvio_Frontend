"use client";

import { useEffect, useState } from "react";

import { AppHeader } from "@/shared/components/layout/app-header";
import { AppSidebar } from "@/shared/components/layout/app-sidebar";
import { ModuleGateBoundary } from "@/shared/components/module-gate-boundary";

const STORAGE_KEY = "salvio_sidebar_collapsed";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setCollapsed(stored === "1");
    } else if (window.innerWidth < 1024) {
      setCollapsed(true);
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <div
      className="grid min-h-screen bg-slate-100 transition-[grid-template-columns] duration-200 print:block print:bg-white"
      style={{ gridTemplateColumns: `${collapsed ? "76px" : "260px"} minmax(0,1fr)` }}
    >
      <div className="print:hidden">
        <AppSidebar collapsed={collapsed} onToggle={toggle} />
      </div>
      <div className="flex min-h-screen min-w-0 flex-col print:block print:min-h-0">
        <div className="print:hidden">
          <AppHeader />
        </div>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6 print:overflow-visible print:p-0">
          <ModuleGateBoundary>{children}</ModuleGateBoundary>
        </main>
      </div>
    </div>
  );
}
