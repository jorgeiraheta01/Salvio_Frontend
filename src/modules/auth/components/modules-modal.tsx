"use client";

import { useEffect, useState } from "react";
import { Power, PowerOff } from "lucide-react";

import { ApiError } from "@/core/api/http-client";
import {
  listTenantModules,
  setTenantModule,
  type TenantModule,
  type TenantSummary
} from "@/modules/auth/services/platform-admin.service";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { Skeleton } from "@/shared/components/ui/skeleton";

export function ModulesModal({ tenant, onClose }: { tenant: TenantSummary | null; onClose: () => void }) {
  const [modules, setModules] = useState<TenantModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listTenantModules(tenant.tenant_id)
      .then((data) => {
        if (!cancelled) setModules(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "No se pudieron cargar los modulos.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenant]);

  if (!tenant) return null;

  async function onToggle(moduleKey: string, nextEnabled: boolean) {
    if (!tenant) return;
    setTogglingKey(moduleKey);
    setError(null);
    try {
      const updated = await setTenantModule(tenant.tenant_id, moduleKey, nextEnabled);
      setModules((prev) => prev.map((m) => (m.module_key === updated.module_key ? updated : m)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar el modulo.");
    } finally {
      setTogglingKey(null);
    }
  }

  return (
    <Modal
      open={!!tenant}
      onClose={onClose}
      title="Inactivar modulos"
      description={`${tenant.name} — apaga un modulo especifico sin bloquear toda la clinica.`}
    >
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((k) => (
              <Skeleton key={k} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {modules.map((module) => (
              <div
                key={module.module_key}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">{module.label}</p>
                  <p className="text-xs text-slate-400">{module.enabled ? "Activo" : "Inactivo"}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={module.enabled ? "border-red-200 text-red-700 hover:bg-red-50" : undefined}
                  disabled={togglingKey === module.module_key}
                  onClick={() => onToggle(module.module_key, !module.enabled)}
                >
                  {module.enabled ? <PowerOff className="mr-1.5 h-3.5 w-3.5" /> : <Power className="mr-1.5 h-3.5 w-3.5" />}
                  {togglingKey === module.module_key ? "Actualizando..." : module.enabled ? "Inactivar" : "Activar"}
                </Button>
              </div>
            ))}
          </div>
        )}

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <Button type="button" variant="ghost" className="w-full" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}
