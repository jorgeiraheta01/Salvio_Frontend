"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { useCurrentUser } from "@/core/auth/current-user";
import { useDoctorDirectory } from "@/modules/appointments/doctor-directory";
import type { PatientItem } from "@/modules/clinical/api/clinical.api";
import {
  createInterconsult,
  createReferral,
  getReferralDetail,
  type Referral,
  type ReferralDetail
} from "@/modules/operations/api/operations.api";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Modal } from "@/shared/components/ui/modal";
import { PatientPicker } from "@/shared/components/ui/patient-picker";
import { Select } from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";

const REFERRAL_TYPE_LABEL: Record<string, string> = {
  internal: "Interconsulta interna",
  internal_transfer: "Traslado interno",
  cross_tenant: "Referencia externa",
  public: "Red publica"
};

export function ReferralsTab() {
  const currentUser = useCurrentUser();
  const { byId: doctorsById } = useDoctorDirectory();
  const [modalOpen, setModalOpen] = useState(false);
  const [interconsultModalOpen, setInterconsultModalOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [createdThisSession, setCreatedThisSession] = useState<(Referral & { patientName: string })[]>([]);
  const doctorName = currentUser ? doctorsById.get(currentUser.id)?.full_name ?? "" : "";

  return (
    <div className="space-y-4">
      <p className="rounded-custom border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
        El backend no expone un listado de referencias por tenant (solo crear y consultar una por id) — aqui se muestran unicamente las que
        creaste en esta sesion.
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setInterconsultModalOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nueva interconsulta
        </Button>
        <Button type="button" onClick={() => setModalOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nueva referencia
        </Button>
      </div>

      {createdThisSession.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-slate-500">Sin referencias creadas en esta sesion.</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {createdThisSession.map((referral) => (
            <Card key={referral.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{referral.patientName}</p>
                  <p className="text-xs text-slate-500">
                    {REFERRAL_TYPE_LABEL[referral.referral_type] ?? referral.referral_type}
                    {referral.destination_area ? ` - ${referral.destination_area}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="primary">{referral.status}</Badge>
                  <Button type="button" size="sm" variant="outline" onClick={() => setDetailId(referral.id)}>
                    Ver detalle
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {currentUser ? (
        <NewReferralModal
          open={modalOpen}
          tenantId={currentUser.tenantId}
          doctorId={currentUser.id}
          onClose={() => setModalOpen(false)}
          onCreated={(referral, patient) => {
            setCreatedThisSession((prev) => [{ ...referral, patientName: `${patient.first_name} ${patient.last_name}` }, ...prev]);
            setModalOpen(false);
          }}
        />
      ) : null}

      {currentUser ? (
        <NewInterconsultModal
          open={interconsultModalOpen}
          tenantId={currentUser.tenantId}
          doctorId={currentUser.id}
          doctorName={doctorName}
          onClose={() => setInterconsultModalOpen(false)}
          onCreated={() => setInterconsultModalOpen(false)}
        />
      ) : null}

      {detailId ? <ReferralDetailModal referralId={detailId} onClose={() => setDetailId(null)} /> : null}
    </div>
  );
}

function ReferralDetailModal({ referralId, onClose }: { referralId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<ReferralDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setDetail(await getReferralDetail(referralId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el detalle.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referralId]);

  return (
    <Modal open onClose={onClose} title="Detalle de referencia" description="Informacion registrada para esta referencia.">
      {error ? (
        <Alert>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button type="button" size="sm" variant="outline" onClick={load}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : loading || !detail ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="space-y-2 text-sm text-slate-700">
          <p>
            <strong>Tipo:</strong> {REFERRAL_TYPE_LABEL[detail.referral_type] ?? detail.referral_type}
          </p>
          <p>
            <strong>Destino:</strong> {detail.destination_area ?? "N/D"}
          </p>
          <p>
            <strong>Motivo:</strong> {detail.transfer_reason ?? "N/D"}
          </p>
          <p>
            <strong>Estado:</strong> {detail.status}
          </p>
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <Button type="button" variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}

function NewInterconsultModal({
  open,
  tenantId,
  doctorId,
  doctorName,
  onClose,
  onCreated
}: {
  open: boolean;
  tenantId: string;
  doctorId: string;
  doctorName: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [patient, setPatient] = useState<PatientItem | null>(null);
  const [specialty, setSpecialty] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!patient) {
      setError("Selecciona un paciente.");
      return;
    }
    if (!specialty.trim()) {
      setError("Indica la especialidad consultante.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createInterconsult({
        patient_id: patient.id,
        tenant_id: tenantId,
        requesting_doctor: doctorId,
        requesting_doctor_name: doctorName || "Medico",
        consulting_specialty: specialty.trim(),
        reason: reason.trim() || undefined
      });
      onCreated();
      setPatient(null);
      setSpecialty("");
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la interconsulta.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva interconsulta" description="Solicitar la opinion de otra especialidad para un paciente.">
      <form className="space-y-4" onSubmit={submit}>
        <PatientPicker value={patient} onChange={setPatient} />
        <div className="space-y-1.5">
          <Label>Especialidad consultante</Label>
          <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Cardiologia, Psiquiatria..." />
        </div>
        <div className="space-y-1.5">
          <Label>Motivo</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        {error ? (
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function NewReferralModal({
  open,
  tenantId,
  doctorId,
  onClose,
  onCreated
}: {
  open: boolean;
  tenantId: string;
  doctorId: string;
  onClose: () => void;
  onCreated: (referral: Referral, patient: PatientItem) => void;
}) {
  const [patient, setPatient] = useState<PatientItem | null>(null);
  const [referralType, setReferralType] = useState("internal");
  const [destination, setDestination] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!patient) {
      setError("Selecciona un paciente.");
      return;
    }
    if (!destination.trim()) {
      setError("Indica el destino de la referencia.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const referral = await createReferral({
        patient_id: patient.id,
        tenant_id: tenantId,
        referral_type: referralType,
        destination_area: destination.trim(),
        transfer_reason: reason.trim() || undefined,
        referred_by: doctorId
      });
      onCreated(referral, patient);
      setPatient(null);
      setDestination("");
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la referencia.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva referencia" description="Registrar una referencia o interconsulta para un paciente.">
      <form className="space-y-4" onSubmit={submit}>
        <PatientPicker value={patient} onChange={setPatient} />
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={referralType} onChange={(e) => setReferralType(e.target.value)}>
            <option value="internal">Interconsulta interna</option>
            <option value="internal_transfer">Traslado interno</option>
            <option value="cross_tenant">Referencia externa</option>
            <option value="public">Red publica</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Especialidad / destino</Label>
          <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Nutricion, Hospital Nacional..." />
        </div>
        <div className="space-y-1.5">
          <Label>Motivo</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        {error ? (
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
