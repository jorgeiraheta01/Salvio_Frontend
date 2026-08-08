"use client";

import { useState } from "react";
import { Search, UserRound } from "lucide-react";

import { useCurrentUser } from "@/core/auth/current-user";
import { useDoctorDirectory } from "@/modules/appointments/doctor-directory";
import { createReferral, searchNetworkDoctors, type NetworkDoctor } from "@/modules/operations/api/operations.api";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Modal } from "@/shared/components/ui/modal";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/shared/utils/cn";

type ReferPatientModalProps = {
  open: boolean;
  patientId: string;
  patientLabel: string;
  onClose: () => void;
  onReferred: () => void;
};

// Referir desde la misma consulta -- el medico ya tiene al paciente frente a
// si, no tiene sentido mandarlo a buscarlo de nuevo en Operacion.
export function ReferPatientModal({ open, patientId, patientLabel, onClose, onReferred }: ReferPatientModalProps) {
  const currentUser = useCurrentUser();
  const { byId: doctorsById } = useDoctorDirectory();
  const [inNetwork, setInNetwork] = useState(true);
  const [doctorQuery, setDoctorQuery] = useState("");
  const [doctorResults, setDoctorResults] = useState<NetworkDoctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<NetworkDoctor | null>(null);
  const [searching, setSearching] = useState(false);
  const [destination, setDestination] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function reset() {
    setInNetwork(true);
    setDoctorQuery("");
    setDoctorResults([]);
    setSelectedDoctor(null);
    setDestination("");
    setReason("");
    setError(null);
    setSuccess(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleDoctorSearch(value: string) {
    setDoctorQuery(value);
    setSelectedDoctor(null);
    if (value.trim().length < 2) {
      setDoctorResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchNetworkDoctors(value.trim());
      setDoctorResults(results);
    } catch {
      setDoctorResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!currentUser) return;
    if (inNetwork && !selectedDoctor) {
      setError("Selecciona un medico de la red.");
      return;
    }
    if (!reason.trim()) {
      setError("Indica el motivo de la referencia.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const doctorName = doctorsById.get(currentUser.id)?.full_name ?? "";
      await createReferral({
        patient_id: patientId,
        tenant_id: currentUser.tenantId,
        referral_type: "cross_tenant",
        destination_area: destination.trim() || selectedDoctor?.specialty || undefined,
        transfer_reason: reason.trim(),
        referred_by: currentUser.id,
        referred_by_name: doctorName,
        target_tenant_id: selectedDoctor?.tenant_id,
        target_doctor_id: selectedDoctor?.id,
        target_doctor_name: selectedDoctor?.full_name
      });
      setSuccess(true);
      onReferred();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la referencia.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Referir a otro medico" description={`Paciente: ${patientLabel}`}>
      {success ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-slate-600">
            Referencia enviada a <strong>{selectedDoctor?.full_name}</strong> ({selectedDoctor?.tenant_name}).
          </p>
          <Button type="button" onClick={handleClose}>
            Cerrar
          </Button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setInNetwork(true)}
              className={cn(
                "flex-1 rounded-custom border px-3 py-2 text-sm font-semibold",
                inNetwork ? "border-brand bg-brand/10 text-brand" : "border-slate-200 text-slate-600"
              )}
            >
              Medico en la red Salvio
            </button>
            <button
              type="button"
              onClick={() => setInNetwork(false)}
              className={cn(
                "flex-1 rounded-custom border px-3 py-2 text-sm font-semibold",
                !inNetwork ? "border-brand bg-brand/10 text-brand" : "border-slate-200 text-slate-600"
              )}
            >
              Medico fuera de la red
            </button>
          </div>

          {inNetwork ? (
            <div className="space-y-1.5">
              <Label>Buscar medico</Label>
              {selectedDoctor ? (
                <div className="flex items-center justify-between rounded-md border bg-slate-50 px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-brand" />
                    <span className="font-medium">{selectedDoctor.full_name}</span>
                    <span className="text-slate-500">
                      {selectedDoctor.specialty ?? "Sin especialidad"} - {selectedDoctor.tenant_name}
                    </span>
                  </div>
                  <button type="button" className="text-xs font-medium text-brand hover:underline" onClick={() => setSelectedDoctor(null)}>
                    Cambiar
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="pl-9"
                    placeholder="Nombre del medico..."
                    value={doctorQuery}
                    onChange={(event) => handleDoctorSearch(event.target.value)}
                    autoComplete="off"
                  />
                  {doctorQuery.trim().length >= 2 ? (
                    <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-white shadow-panel">
                      {searching ? (
                        <p className="px-3 py-2 text-sm text-slate-400">Buscando...</p>
                      ) : doctorResults.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-slate-400">Sin resultados en la red.</p>
                      ) : (
                        doctorResults.map((doctor) => (
                          <button
                            key={doctor.id}
                            type="button"
                            className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-slate-50"
                            onClick={() => {
                              setSelectedDoctor(doctor);
                              setDoctorResults([]);
                            }}
                          >
                            <span className="font-medium">{doctor.full_name}</span>
                            <span className="text-xs text-slate-400">
                              {doctor.specialty ?? "Sin especialidad"} - {doctor.tenant_name}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                Para medicos fuera de la red Salvio, el sistema generara una hoja de referencia en PDF con la informacion que necesita el
                medico receptor. Esta funcion se habilitara proximamente -- por ahora, imprime el expediente del paciente desde su perfil.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label>Especialidad / destino</Label>
            <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Medicina Interna, Cardiologia..." />
          </div>

          <div className="space-y-1.5">
            <Label>Motivo de la referencia</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe el caso y la razon de la referencia..." />
          </div>

          {error ? (
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !inNetwork}>
              {submitting ? "Enviando..." : "Enviar referencia"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
