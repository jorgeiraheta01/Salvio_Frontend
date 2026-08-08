"use client";

import { useEffect, useState } from "react";
import { Phone, Send } from "lucide-react";

import { useCurrentUser } from "@/core/auth/current-user";
import { NewAppointmentDialog } from "@/modules/appointments/components/new-appointment-dialog";
import { getPatient, type PatientItem } from "@/modules/clinical/api/clinical.api";
import {
  importReferredPatient,
  listIncomingReferrals,
  updateCrossTenantReferralStatus,
  type IncomingReferral
} from "@/modules/operations/api/operations.api";
import { CrossTenantHistoryModal } from "@/modules/operations/components/referrals-tab";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/utils/cn";

const REFERRAL_STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente de agendar",
  accepted: "En control",
  completed: "Dado de alta",
  rejected: "Rechazada"
};

// Resumen para el Resumen/dashboard: quien lo remite, con que telefono
// llamarlo, y un boton directo para agendarle la primera cita -- pensado
// para que recepcion pueda actuar sobre la referencia sin pasar primero por
// Operacion > Referencias. El historial completo queda como enlace
// secundario para cuando el medico si lo necesite.
export function ReferredPatientsSummary({ bare = false }: { bare?: boolean } = {}) {
  const currentUser = useCurrentUser();
  const [items, setItems] = useState<IncomingReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState<{ referralId: string; patient: PatientItem; doctorId: string } | null>(null);

  // El objetivo de este widget es que recepcion pueda contactar y agendar al
  // paciente referido -- una vez agendado, ya cumplio su proposito aqui (el
  // seguimiento continua desde Operacion > Referencias, no desde el Resumen).
  const pendingItems = items.filter((item) => item.status === "pending");

  function load() {
    setLoading(true);
    listIncomingReferrals()
      .then((data) => setItems(data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleScheduleAppointment(item: IncomingReferral) {
    if (!currentUser) return;
    setImportingId(item.referral_id);
    setError(null);
    try {
      const imported = await importReferredPatient(item.referral_id);
      const patient = await getPatient(imported.patient_id);
      setScheduling({ referralId: item.referral_id, patient, doctorId: item.target_doctor_id ?? currentUser.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo importar al paciente referido.");
    } finally {
      setImportingId(null);
    }
  }

  if (loading) {
    const skeleton = (
      <>
        <Skeleton className="h-6 w-56" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-16 w-full" />
        </div>
      </>
    );
    return bare ? skeleton : <div className="rounded-custom border border-slate-100 bg-white p-6 shadow-panel">{skeleton}</div>;
  }

  if (pendingItems.length === 0) {
    if (!bare) return null;
    return <p className="py-6 text-center text-sm text-slate-500">No hay pacientes referidos pendientes de agendar.</p>;
  }

  const content = (
    <>
      {!bare ? (
        <>
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-brand" />
            <h2 className="text-lg font-bold text-slate-900">Pacientes referidos</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {pendingItems.length} paciente{pendingItems.length === 1 ? "" : "s"} de otras clinicas, pendiente
            {pendingItems.length === 1 ? "" : "s"} de contactar y agendar.
          </p>
        </>
      ) : null}

      {error ? (
        <Alert className="mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className={cn("space-y-3", !bare && "mt-4")}>
        {pendingItems.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{item.patient_name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Desde <span className="font-medium text-slate-600">{item.source_tenant_name ?? item.source_tenant_id}</span>
                  {item.referred_by_name ? (
                    <>
                      {" "}
                      · {item.referred_by_name}
                      {item.referred_by_specialty ? ` (${item.referred_by_specialty})` : ""}
                    </>
                  ) : null}
                </p>
                {item.patient_phone ? (
                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-600">
                    <Phone className="h-3 w-3 text-brand" />
                    {item.patient_phone}
                  </p>
                ) : null}
              </div>
              <Badge variant="primary">{REFERRAL_STATUS_LABEL[item.status] ?? item.status}</Badge>
            </div>
            {item.transfer_reason ? (
              <p className="mt-2 line-clamp-2 text-xs text-slate-500">
                <span className="font-medium text-slate-600">Motivo: </span>
                {item.transfer_reason}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                size="sm"
                disabled={importingId === item.referral_id}
                onClick={() => handleScheduleAppointment(item)}
              >
                {importingId === item.referral_id ? "Importando..." : "Agendar cita"}
              </Button>
              <button
                type="button"
                onClick={() => setHistoryId(item.referral_id)}
                className="text-xs font-semibold text-brand hover:underline"
              >
                Ver historial clinico completo
              </button>
            </div>
          </div>
        ))}
      </div>

      {historyId ? <CrossTenantHistoryModal referralId={historyId} onClose={() => setHistoryId(null)} /> : null}

      {currentUser && scheduling ? (
        <NewAppointmentDialog
          open
          tenantId={currentUser.tenantId}
          defaultDoctorId={scheduling.doctorId}
          defaultDate={new Date().toISOString().slice(0, 10)}
          defaultPatient={scheduling.patient}
          onClose={() => setScheduling(null)}
          onCreated={() => {
            const referralId = scheduling.referralId;
            setScheduling(null);
            updateCrossTenantReferralStatus(referralId, "accepted")
              .catch(() => {
                // Best-effort: la cita ya se creo: si esto falla, el paciente
                // solo queda visible una vez mas en la lista, no se pierde nada.
              })
              .finally(load);
          }}
        />
      ) : null}
    </>
  );

  return bare ? content : <div className="rounded-custom border border-slate-100 bg-white p-6 shadow-panel">{content}</div>;
}
