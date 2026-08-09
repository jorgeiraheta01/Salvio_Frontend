"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ApiError } from "@/core/api/http-client";
import { usePlatformAdmin } from "@/core/auth/current-user";
import { ClinicDetailPanel } from "@/modules/auth/components/clinic-detail-panel";
import { OwnerShell, type OwnerSection } from "@/modules/auth/components/owner-shell";
import { listTenants, type TenantSummary } from "@/modules/auth/services/platform-admin.service";
import { useAuthStore } from "@/modules/auth/store/auth.store";
import { Skeleton } from "@/shared/components/ui/skeleton";

function ClinicPage({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listTenants()
      .then((all) => {
        const found = all.find((t) => t.tenant_id === tenantId);
        setTenant(found ?? null);
        if (!found) setError("No se encontro esa clinica.");
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la clinica."))
      .finally(() => setLoading(false));
  }, [tenantId]);

  function onSelectSection(section: OwnerSection) {
    router.push(`/onboarding?section=${section}`);
  }

  return (
    <OwnerShell activeSection="clinicas" onSelectSection={onSelectSection}>
      <div className="mx-auto max-w-5xl">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : tenant ? (
          <>
            <h1 className="mb-1 text-2xl font-bold text-slate-900">{tenant.name}</h1>
            <p className="mb-6 text-sm text-slate-400">{tenant.tenant_id}</p>
            <ClinicDetailPanel tenant={tenant} onUpdated={setTenant} />
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm font-medium text-slate-600">{error ?? "No se encontro esa clinica."}</p>
            <button type="button" onClick={() => router.push("/onboarding")} className="mt-3 text-sm font-semibold text-brand">
              Volver a clinicas
            </button>
          </div>
        )}
      </div>
    </OwnerShell>
  );
}

export default function ClinicPageRoute() {
  const params = useParams<{ tenantId: string }>();
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const platformAdmin = usePlatformAdmin();
  const router = useRouter();

  useEffect(() => {
    if (isHydrated && !platformAdmin) {
      router.replace("/onboarding");
    }
  }, [isHydrated, platformAdmin, router]);

  if (!isHydrated || !platformAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <p className="text-sm text-slate-500">Validando sesion...</p>
      </div>
    );
  }

  return <ClinicPage tenantId={decodeURIComponent(params.tenantId)} />;
}
