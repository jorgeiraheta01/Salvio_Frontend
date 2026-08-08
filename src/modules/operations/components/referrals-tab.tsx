"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { useCurrentUser } from "@/core/auth/current-user";
import { useDoctorDirectory } from "@/modules/appointments/doctor-directory";
import { NewAppointmentDialog } from "@/modules/appointments/components/new-appointment-dialog";
import { getPatient, type PatientItem } from "@/modules/clinical/api/clinical.api";
import {
  createInterconsult,
  createReferral,
  getCrossTenantHistory,
  getReferralDetail,
  importReferredPatient,
  listIncomingReferrals,
  updateCrossTenantReferralStatus,
  type CrossTenantHistory,
  type IncomingReferral,
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

const REFERRAL_STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  accepted: "En control",
  completed: "Dado de alta",
  rejected: "Rechazada"
};

const REFERRAL_TYPE_LABEL: Record<string, string> = {
  internal: "Interconsulta interna",
  internal_transfer: "Traslado interno",
  cross_tenant: "Referencia externa",
  public: "Red publica"
};

type ReferralSubTab = "enviadas" | "recibidas";

export function ReferralsTab({ initialSubTab }: { initialSubTab?: ReferralSubTab } = {}) {
  const currentUser = useCurrentUser();
  const { byId: doctorsById } = useDoctorDirectory();
  const [modalOpen, setModalOpen] = useState(false);
  const [interconsultModalOpen, setInterconsultModalOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [historyReferralId, setHistoryReferralId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<ReferralSubTab>(initialSubTab ?? "enviadas");
  const [createdThisSession, setCreatedThisSession] = useState<(Referral & { patientName: string })[]>([]);
  const doctorName = currentUser ? doctorsById.get(currentUser.id)?.full_name ?? "" : "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSubTab("enviadas")}
          className={`rounded-custom px-3 py-1.5 text-xs font-semibold ${subTab === "enviadas" ? "bg-brand text-white" : "border border-slate-200 bg-white text-slate-600"}`}
        >
          Enviadas
        </button>
        <button
          type="button"
          onClick={() => setSubTab("recibidas")}
          className={`rounded-custom px-3 py-1.5 text-xs font-semibold ${subTab === "recibidas" ? "bg-brand text-white" : "border border-slate-200 bg-white text-slate-600"}`}
        >
          Recibidas (otras clinicas)
        </button>
      </div>

      {subTab === "recibidas" ? (
        <IncomingReferralsPanel onViewHistory={(referralId) => setHistoryReferralId(referralId)} />
      ) : (
        <>
          <p className="rounded-custom border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
            El backend no expone un listado de referencias enviadas por tenant (solo crear y consultar una por id) — aqui se muestran
            unicamente las que creaste en esta sesion.
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
                        {referral.target_doctor_name
                          ? `Referido a ${referral.target_doctor_name}`
                          : REFERRAL_TYPE_LABEL[referral.referral_type] ?? referral.referral_type}
                        {referral.destination_area ? ` - ${referral.destination_area}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="primary">{REFERRAL_STATUS_LABEL[referral.status] ?? referral.status}</Badge>
                      <Button type="button" size="sm" variant="outline" onClick={() => setDetailId(referral.id)}>
                        Ver detalle
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {historyReferralId ? <CrossTenantHistoryModal referralId={historyReferralId} onClose={() => setHistoryReferralId(null)} /> : null}

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

function IncomingReferralsPanel({ onViewHistory }: { onViewHistory: (referralId: string) => void }) {
  const currentUser = useCurrentUser();
  const [items, setItems] = useState<IncomingReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState<{ referralId: string; patient: PatientItem; doctorId: string } | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setItems(await listIncomingReferrals());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar las referencias recibidas.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(referralId: string, status: "accepted" | "completed") {
    setUpdatingId(referralId);
    try {
      const updated = await updateCrossTenantReferralStatus(referralId, status);
      setItems((prev) => prev.map((item) => (item.referral_id === referralId ? { ...item, status: updated.status } : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el estado de la referencia.");
    } finally {
      setUpdatingId(null);
    }
  }

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

  useEffect(() => {
    load();
  }, []);

  if (loading) return <Skeleton className="h-24 w-full" />;
  if (error) {
    return (
      <Alert>
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button type="button" size="sm" variant="outline" onClick={load}>
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-sm text-slate-500">No hay referencias entrantes de otras clinicas.</CardContent>
      </Card>
    );
  }
  return (
    <>
    <div className="space-y-2">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">{item.patient_name}</p>
              <p className="text-xs text-slate-500">
                Desde <span className="font-medium text-slate-600">{item.source_tenant_name ?? item.source_tenant_id}</span>
                {item.referred_by_name ? ` - ${item.referred_by_name}` : ""}
                {item.referred_by_specialty ? ` (${item.referred_by_specialty})` : ""}
                {item.destination_area ? ` - ${item.destination_area}` : ""}
              </p>
              {item.patient_phone ? <p className="mt-0.5 text-xs font-medium text-slate-600">Tel: {item.patient_phone}</p> : null}
              {item.transfer_reason ? (
                <p className="mt-1 max-w-md truncate text-xs text-slate-500" title={item.transfer_reason}>
                  Motivo: {item.transfer_reason}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary">{REFERRAL_STATUS_LABEL[item.status] ?? item.status}</Badge>
              <Button type="button" size="sm" variant="outline" onClick={() => onViewHistory(item.referral_id)}>
                Ver historial completo
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={importingId === item.referral_id}
                onClick={() => handleScheduleAppointment(item)}
              >
                {importingId === item.referral_id ? "Importando..." : "Agendar cita"}
              </Button>
              {item.status === "pending" ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={updatingId === item.referral_id}
                  onClick={() => handleStatusChange(item.referral_id, "accepted")}
                >
                  Seguir en control
                </Button>
              ) : null}
              {item.status === "accepted" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={updatingId === item.referral_id}
                  onClick={() => handleStatusChange(item.referral_id, "completed")}
                >
                  Dar de alta
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
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
              // Best-effort: la cita ya se creo; si esto falla el estado solo queda desactualizado, no se pierde nada.
            })
            .finally(load);
        }}
      />
    ) : null}
    </>
  );
}

export function CrossTenantHistoryModal({ referralId, onClose }: { referralId: string; onClose: () => void }) {
  const [history, setHistory] = useState<CrossTenantHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setHistory(await getCrossTenantHistory(referralId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el historial.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referralId]);

  return (
    <Modal open onClose={onClose} title="Historial clinico completo" description="Leido en vivo desde la clinica de origen de la referencia.">
      {error ? (
        <Alert>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button type="button" size="sm" variant="outline" onClick={load}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : loading || !history ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="max-h-[70vh] space-y-4 overflow-y-auto text-sm text-slate-700">
          <div className="rounded-custom border border-slate-200 bg-slate-50 p-3">
            <p className="font-semibold text-slate-800">
              {history.patient.full_name} - {history.patient.dui ?? "sin DUI"}
            </p>
            <p className="text-xs text-slate-500">Clinica de origen: {history.source_tenant_name ?? history.source_tenant_id}</p>
            <p className="mt-1 text-xs text-slate-600">{history.referral.transfer_reason}</p>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {history.encounters.length} consulta(s) en el historial
          </p>
          {history.encounters.map((encounter) => (
            <div key={encounter.id} className="rounded-custom border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">{encounter.chief_complaint ?? "Consulta"}</p>
                <Badge variant="primary">{encounter.status}</Badge>
              </div>
              <p className="text-xs text-slate-500">
                {new Date(encounter.started_at).toLocaleString()} - {encounter.doctor_name ?? "Doctor no disponible"}
              </p>
              {encounter.notes.map((note, index) => (
                <p key={index} className="mt-2 rounded-custom bg-slate-50 p-2 text-xs text-slate-700">
                  {note.content}
                </p>
              ))}
              {encounter.diagnoses.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {encounter.diagnoses.map((dx, index) => (
                    <Badge key={index} variant="primary">
                      {dx.code} - {dx.description}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
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
  const currentUser = useCurrentUser();
  const { byId: doctorsById } = useDoctorDirectory();
  const [patient, setPatient] = useState<PatientItem | null>(null);
  const [referralType, setReferralType] = useState("internal");
  const [destination, setDestination] = useState("");
  const [reason, setReason] = useState("");
  const [targetTenantId, setTargetTenantId] = useState("");
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
    if (referralType === "cross_tenant" && !targetTenantId.trim()) {
      setError("Indica el id de la clinica destino (ej. clinica_bienestar_total).");
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
        referred_by: doctorId,
        referred_by_name: currentUser ? doctorsById.get(currentUser.id)?.full_name : undefined,
        target_tenant_id: referralType === "cross_tenant" ? targetTenantId.trim() : undefined
      });
      onCreated(referral, patient);
      setPatient(null);
      setDestination("");
      setReason("");
      setTargetTenantId("");
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
        {referralType === "cross_tenant" ? (
          <div className="space-y-1.5">
            <Label>Id de la clinica destino</Label>
            <Input value={targetTenantId} onChange={(e) => setTargetTenantId(e.target.value)} placeholder="clinica_bienestar_total" />
          </div>
        ) : null}
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
