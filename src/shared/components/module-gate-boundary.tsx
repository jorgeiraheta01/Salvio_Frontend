"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { listOwnTenantModules, type OwnTenantModule } from "@/modules/tenant/api/tenant.api";

const ROUTE_MODULE_MAP: { prefix: string; moduleKey: string }[] = [
  { prefix: "/agenda", moduleKey: "agenda" },
  { prefix: "/patients", moduleKey: "pacientes" },
  { prefix: "/operacion", moduleKey: "operaciones" },
  { prefix: "/catalogos", moduleKey: "catalogos" }
];

function LockedModuleIllustration() {
  return (
    <svg viewBox="0 0 200 160" className="mx-auto h-36 w-44" aria-hidden="true">
      <ellipse cx="100" cy="140" rx="70" ry="10" className="fill-slate-100" />
      <circle cx="100" cy="72" r="62" className="fill-brand-light" />
      <circle cx="40" cy="34" r="5" className="fill-brand/30" />
      <circle cx="164" cy="46" r="4" className="fill-brand/30" />
      <circle cx="156" cy="112" r="6" className="fill-brand/20" />
      <rect x="52" y="66" width="96" height="66" rx="14" className="fill-white stroke-slate-200" strokeWidth="1.5" />
      <rect x="66" y="82" width="68" height="8" rx="4" className="fill-slate-100" />
      <rect x="66" y="98" width="48" height="8" rx="4" className="fill-slate-100" />
      <rect x="66" y="114" width="56" height="8" rx="4" className="fill-slate-100" />
      <g transform="translate(100 46)">
        <circle r="26" className="fill-brand" />
        <rect x="-13" y="-2" width="26" height="20" rx="4" className="fill-white" />
        <path d="M-8 -2 v-6 a8 8 0 0 1 16 0 v6" className="fill-none stroke-white" strokeWidth="4" strokeLinecap="round" />
        <circle cx="0" cy="8" r="3" className="fill-brand" />
      </g>
    </svg>
  );
}

function ModuleBlockedView({ label }: { label: string }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-panel">
        <LockedModuleIllustration />
        <h1 className="mt-4 text-xl font-bold text-slate-900">{label} no esta disponible</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Este modulo esta desactivado temporalmente para tu clinica. Comunicate con el administrador del proveedor de
          servicio para reactivarlo.
        </p>
      </div>
    </div>
  );
}

export function ModuleGateBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [modules, setModules] = useState<OwnTenantModule[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listOwnTenantModules()
      .then((data) => {
        if (!cancelled) setModules(data);
      })
      .catch(() => {
        // Fail-open: si el chequeo falla (ej. red inestable), no se le corta
        // el acceso a la clinica a su propia operacion por un error nuestro.
        if (!cancelled) setModules([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const match = ROUTE_MODULE_MAP.find((r) => pathname?.startsWith(r.prefix));
  if (match && modules) {
    const mod = modules.find((m) => m.module_key === match.moduleKey);
    if (mod && !mod.enabled) {
      return <ModuleBlockedView label={mod.label} />;
    }
  }

  return <>{children}</>;
}
