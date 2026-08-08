"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/core/api/http-client";
import {
  ArrowLeft,
  CalendarClock,
  ChevronRight,
  MessageCircle,
  Pencil,
  Pill,
  Printer,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  UserRound,
  UserX
} from "lucide-react";

import {
  createWaMessage,
  deletePatient,
  getPatient,
  listAppointments,
  listPatientMedications,
  listWaMessages,
  startEncounter,
  type AppointmentItem,
  type PatientItem,
  type PatientMedication,
  type WaMessage
} from "@/modules/clinical/api/clinical.api";
import { specialtyForDoctor, useDoctorDirectory } from "@/modules/appointments/doctor-directory";
import { AppointmentStatusBadge } from "@/modules/appointments/components/appointment-status-badge";
import { useCurrentUser } from "@/core/auth/current-user";
import { EditPatientDialog } from "@/modules/patients/components/edit-patient-dialog";
import { AntecedentesPanel, GinecoPanel, PediatriaPanel } from "@/modules/patients/components/history-panels";
import {
  AddAllergyForm,
  AddChronicDiseaseForm,
  AddConsentForm,
  AddDevelopmentRecordForm,
  AddGrowthMeasurementForm,
  AddHospitalizationForm,
  AddImmunizationForm,
  AddSurgeryForm
} from "@/modules/patients/components/quick-add-forms";
import { ResourceListTab, SeverityBadge } from "@/modules/patients/components/resource-list-tab";
import {
  allergiesApi,
  chronicDiseasesApi,
  consentsApi,
  developmentRecordsApi,
  growthMeasurementsApi,
  hospitalizationsHxApi,
  immunizationsApi,
  surgeriesApi
} from "@/modules/patients/api/patient-resources.api";
import { DiagnosisTimeline } from "@/modules/clinical/components/diagnosis-timeline";
import { EncounterHistoryPanel } from "@/modules/clinical/components/encounter-history-panel";
import { useEncounterHistoryStore } from "@/modules/clinical/store/encounterHistoryStore";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/utils/cn";
import { formatServerDate, formatServerDateTime } from "@/shared/utils/dates";

const GENDER_LABEL: Record<string, string> = {
  male: "Masculino",
  female: "Femenino",
  other: "Otro"
};

const INSURANCE_LABEL: Record<string, string> = {
  particular: "Particular",
  ss_pensionado: "SS - Pensionado",
  ss_cotizante: "SS - Cotizante",
  ss_beneficiario: "SS - Beneficiario",
  red_publica: "Red publica",
  privado: "Privado",
  ninguno: "Sin seguro",
  otro: "Otro"
};

const HISTORY_PAGE_SIZE = 4;

function calculateAge(dateOfBirth: string): number | null {
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  return Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

const formatDate = formatServerDate;
const formatDateTime = formatServerDateTime;

function medicationBadge(medication: PatientMedication): { label: string; variant: "primary" | "accent" | "neutral" } {
  if (!medication.is_active) {
    return { label: "Finalizado", variant: "neutral" };
  }
  if (medication.end_date) {
    const daysLeft = Math.ceil((new Date(medication.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 30) {
      return { label: "Por vencer", variant: "accent" };
    }
  }
  return { label: "Vigente", variant: "primary" };
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm text-slate-800">{value && value.trim() ? value : "No registrado"}</p>
    </div>
  );
}

type ProfileTab =
  | "resumen"
  | "consultas"
  | "alergias"
  | "cronicas"
  | "cirugias"
  | "inmunizaciones"
  | "hospitalizaciones"
  | "consentimientos"
  | "antecedentes"
  | "pediatria"
  | "crecimiento"
  | "desarrollo"
  | "gineco";

export function PatientProfileScreen({ patientId }: { patientId: string }) {
  const router = useRouter();
  const { byId: doctorsById } = useDoctorDirectory();
  const currentUser = useCurrentUser();
  const recordEncounter = useEncounterHistoryStore((state) => state.recordEncounter);

  const [patient, setPatient] = useState<PatientItem | null>(null);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [medications, setMedications] = useState<PatientMedication[]>([]);
  const [waMessages, setWaMessages] = useState<WaMessage[]>([]);
  const [loggingWaMessage, setLoggingWaMessage] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingEncounter, setStartingEncounter] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("resumen");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [patientData, appointmentData, medicationData, waMessageData] = await Promise.all([
        getPatient(patientId),
        listAppointments({ patientId }),
        listPatientMedications(patientId).catch(() => []),
        listWaMessages(patientId).catch(() => [])
      ]);
      setPatient(patientData);
      setAppointments(appointmentData);
      setMedications(medicationData);
      setWaMessages(waMessageData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el perfil del paciente.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function onNewEncounter() {
    setStartingEncounter(true);
    try {
      const encounter = await startEncounter({ patient_id: patientId });
      recordEncounter(patientId, encounter.id);
      router.push(`/clinical/encounter/${encounter.id}`);
    } finally {
      setStartingEncounter(false);
    }
  }

  async function onDeactivate() {
    await deletePatient(patientId);
    router.push("/patients");
  }

  async function onLogWaMessage() {
    if (!currentUser) return;
    setLoggingWaMessage(true);
    setWaError(null);
    try {
      const created = await createWaMessage({
        patient_id: patientId,
        tenant_id: currentUser.tenantId,
        message_type: "recordatorio_manual",
        template_name: "Contacto manual"
      });
      setWaMessages((prev) => [created, ...prev]);
    } catch (err) {
      const isMissingConsent = err instanceof ApiError && err.status === 403 && /consent/i.test(err.message);
      setWaError(
        isMissingConsent
          ? "Este paciente no ha dado consentimiento para WhatsApp. Registralo en la pestana Consentimientos primero."
          : err instanceof Error
            ? err.message
            : "No se pudo registrar el contacto."
      );
    } finally {
      setLoggingWaMessage(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => router.push("/patients")}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a pacientes
        </button>
        <Alert>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error ?? "No se encontro el paciente."}</span>
            <Button type="button" size="sm" variant="outline" onClick={load}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const age = calculateAge(patient.date_of_birth);
  const initials = `${patient.first_name.charAt(0)}${patient.last_name.charAt(0)}`.toUpperCase();
  const sortedAppointments = [...appointments].sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
  const visibleAppointments = historyExpanded ? sortedAppointments : sortedAppointments.slice(0, HISTORY_PAGE_SIZE);
  const activeMedications = medications.filter((medication) => medication.is_active);
  const isPediatric = age !== null && age < 18;
  const isGineco = patient.gender === "female" && age !== null && age >= 10;

  const tabs: Array<{ key: ProfileTab; label: string }> = [
    { key: "resumen", label: "Resumen" },
    { key: "consultas", label: "Consultas" },
    { key: "alergias", label: "Alergias" },
    { key: "cronicas", label: "Cronicas" },
    { key: "cirugias", label: "Cirugias" },
    { key: "inmunizaciones", label: "Inmunizaciones" },
    { key: "hospitalizaciones", label: "Hospitalizaciones" },
    { key: "consentimientos", label: "Consentimientos" },
    { key: "antecedentes", label: "Antecedentes" },
    ...(isPediatric ? [{ key: "pediatria" as ProfileTab, label: "Pediatria" }] : []),
    ...(isPediatric ? [{ key: "crecimiento" as ProfileTab, label: "Crecimiento" }] : []),
    ...(isPediatric ? [{ key: "desarrollo" as ProfileTab, label: "Desarrollo" }] : []),
    ...(isGineco ? [{ key: "gineco" as ProfileTab, label: "Gineco-obstetricia" }] : [])
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-custom bg-brand text-xl font-bold text-white">
            {initials || <UserRound className="h-7 w-7" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900">
                {patient.first_name} {patient.last_name}
              </h1>
              {patient.is_referred ? <Badge variant="accent">Referido de otra clinica</Badge> : null}
            </div>
            <p className="text-sm text-slate-500">
              {age !== null ? `${age} anos` : "Edad N/D"} - {patient.medical_record_number ?? "N/D"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1.5 h-4 w-4" />
            Editar
          </Button>
          <Button type="button" disabled={startingEncounter} onClick={onNewEncounter}>
            <Stethoscope className="mr-1.5 h-4 w-4" />
            {startingEncounter ? "Creando..." : "Nuevo encuentro"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "rounded-custom px-4 py-2 text-sm font-semibold transition-colors",
              activeTab === tab.key ? "bg-brand text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "resumen" ? (
      <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <UserRound className="h-4 w-4 text-brand" />
              <CardTitle className="text-sm font-bold uppercase tracking-wide text-slate-500">Informacion del paciente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Nacimiento" value={patient.date_of_birth} />
                <InfoRow label="Genero" value={patient.gender ? GENDER_LABEL[patient.gender] ?? patient.gender : null} />
                <InfoRow label="DUI" value={patient.dui} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Seguro</p>
                  <Badge variant="neutral" className="mt-1">
                    {patient.insurance_type ? INSURANCE_LABEL[patient.insurance_type] ?? patient.insurance_type : "N/D"}
                  </Badge>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Contacto de emergencia
                </p>
                {patient.emergency_contact_name ? (
                  <div className="space-y-1 text-sm text-slate-700">
                    <p className="font-medium">{patient.emergency_contact_name}</p>
                    <p className="text-slate-500">
                      {patient.emergency_contact_relationship ?? "Sin parentesco"} - {patient.emergency_contact_phone ?? "Sin telefono"}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm italic text-slate-400">No registrado</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <Pill className="h-4 w-4 text-brand" />
              <CardTitle className="text-sm font-bold uppercase tracking-wide text-slate-500">Medicamentos de control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {medications.length === 0 ? (
                <p className="text-sm text-slate-400">Sin medicamentos registrados.</p>
              ) : (
                medications.map((medication) => {
                  const badge = medicationBadge(medication);
                  return (
                    <div key={medication.id} className="flex items-center justify-between rounded-custom border border-slate-100 px-3 py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{medication.medication_name}</p>
                        <p className="text-xs text-slate-500">
                          {medication.dose ?? "Dosis N/D"} - {medication.frequency ?? "Frecuencia N/D"}
                        </p>
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-brand" />
                <CardTitle className="text-sm font-bold uppercase tracking-wide text-slate-500">Mensajes WhatsApp</CardTitle>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={onLogWaMessage} disabled={loggingWaMessage}>
                {loggingWaMessage ? "Registrando..." : "Registrar contacto"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {waError ? (
                <Alert>
                  <AlertDescription>{waError}</AlertDescription>
                </Alert>
              ) : null}
              {waMessages.length === 0 ? (
                <p className="text-sm text-slate-400">Sin mensajes registrados.</p>
              ) : (
                waMessages.map((message) => (
                  <div key={message.id} className="flex items-center justify-between rounded-custom border border-slate-100 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{message.template_name ?? message.message_type ?? "Mensaje"}</p>
                      <p className="text-xs text-slate-500">{formatDate(message.created_at)}</p>
                    </div>
                    <Badge variant="neutral">{message.status}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-none bg-[#0b3b34] text-white">
            <CardContent className="space-y-2 p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-teal-200">
                <Sparkles className="h-4 w-4" />
                Vision general
              </div>
              <p className="text-sm leading-6 text-teal-50">
                Expediente actualizado el {formatDate(patient.updated_at ?? patient.date_of_birth)}.{" "}
                {activeMedications.length > 0
                  ? `${activeMedications.length} medicamento${activeMedications.length === 1 ? "" : "s"} de control vigente${activeMedications.length === 1 ? "" : "s"}.`
                  : "Sin medicamentos de control activos."}{" "}
                {appointments.length} cita{appointments.length === 1 ? "" : "s"} registrada{appointments.length === 1 ? "" : "s"} en total.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-brand" />
              <CardTitle className="text-base">Historial de citas y consultas</CardTitle>
            </div>
            {sortedAppointments.length > HISTORY_PAGE_SIZE ? (
              <button
                type="button"
                onClick={() => setHistoryExpanded((value) => !value)}
                className="flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
              >
                {historyExpanded ? "Ver menos" : "Ver todo"}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </CardHeader>
          <CardContent>
            {sortedAppointments.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CalendarClock className="h-7 w-7 text-slate-300" />
                <p className="text-sm text-slate-500">Este paciente todavia no tiene citas ni consultas registradas.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {visibleAppointments.map((appointment) => {
                  const doctor = doctorsById.get(appointment.doctor_id);
                  return (
                    <div
                      key={appointment.id}
                      className="flex flex-col gap-2 rounded-custom border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 flex-col items-center justify-center rounded-custom bg-teal-50 text-brand">
                          <CalendarClock className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800">{formatDateTime(appointment.scheduled_at)}</p>
                          <p className="truncate text-xs text-slate-500">
                            {doctor ? specialtyForDoctor(doctor.full_name, doctor.specialty) : "N/D"} ·{" "}
                            {doctor?.full_name ?? `Doctor ${appointment.doctor_id.slice(0, 8)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <span className="text-xs text-slate-500">{appointment.appointment_type ?? "Consulta general"}</span>
                        <AppointmentStatusBadge status={appointment.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <DiagnosisTimeline patientId={patientId} />
        </div>
      </div>
      ) : null}

      {activeTab === "consultas" ? <EncounterHistoryPanel patientId={patientId} appointments={appointments} /> : null}

      {activeTab === "alergias" ? (
        <ResourceListTab
          patientId={patientId}
          emptyLabel="Sin alergias registradas."
          addLabel="+ Agregar alergia"
          load={allergiesApi.list}
          columns={[
            { label: "Alergeno", render: (item) => <span className="font-semibold text-slate-800">{item.allergen}</span> },
            { label: "Reaccion", render: (item) => item.reaction ?? "N/D" },
            { label: "Severidad", render: (item) => <SeverityBadge value={item.severity} /> },
            { label: "Registrado", render: (item) => formatDate(item.created_at) }
          ]}
          renderAddForm={({ onCancel, onCreated }) => (
            <AddAllergyForm patientId={patientId} tenantId={currentUser?.tenantId ?? ""} onCancel={onCancel} onCreated={onCreated} />
          )}
        />
      ) : null}

      {activeTab === "cronicas" ? (
        <ResourceListTab
          patientId={patientId}
          emptyLabel="Sin enfermedades cronicas registradas."
          addLabel="+ Agregar enfermedad"
          load={chronicDiseasesApi.list}
          columns={[
            { label: "Enfermedad", render: (item) => <span className="font-semibold text-slate-800">{item.disease_name}</span> },
            { label: "Estado", render: (item) => <Badge variant={item.is_active ? "primary" : "neutral"}>{item.is_active ? "Activa" : "Resuelta"}</Badge> },
            { label: "Notas", render: (item) => item.notes ?? "N/D" }
          ]}
          renderAddForm={({ onCancel, onCreated }) => (
            <AddChronicDiseaseForm patientId={patientId} tenantId={currentUser?.tenantId ?? ""} onCancel={onCancel} onCreated={onCreated} />
          )}
        />
      ) : null}

      {activeTab === "cirugias" ? (
        <ResourceListTab
          patientId={patientId}
          emptyLabel="Sin cirugias registradas."
          addLabel="+ Agregar cirugia"
          load={surgeriesApi.list}
          columns={[
            { label: "Procedimiento", render: (item) => <span className="font-semibold text-slate-800">{item.surgery_name}</span> },
            { label: "Fecha", render: (item) => (item.surgery_date ? formatDate(item.surgery_date) : "N/D") },
            { label: "Hospital", render: (item) => item.hospital ?? "N/D" }
          ]}
          renderAddForm={({ onCancel, onCreated }) => (
            <AddSurgeryForm patientId={patientId} tenantId={currentUser?.tenantId ?? ""} onCancel={onCancel} onCreated={onCreated} />
          )}
        />
      ) : null}

      {activeTab === "inmunizaciones" ? (
        <ResourceListTab
          patientId={patientId}
          emptyLabel="Sin vacunas registradas."
          addLabel="+ Agregar vacuna"
          load={immunizationsApi.list}
          columns={[
            { label: "Vacuna", render: (item) => <span className="font-semibold text-slate-800">{item.vaccine_name}</span> },
            { label: "Dosis", render: (item) => item.dose_number ?? "N/D" },
            { label: "Fecha", render: (item) => (item.applied_at ? formatDate(item.applied_at) : "N/D") }
          ]}
          renderAddForm={({ onCancel, onCreated }) => (
            <AddImmunizationForm patientId={patientId} tenantId={currentUser?.tenantId ?? ""} onCancel={onCancel} onCreated={onCreated} />
          )}
        />
      ) : null}

      {activeTab === "hospitalizaciones" ? (
        <ResourceListTab
          patientId={patientId}
          emptyLabel="Sin hospitalizaciones registradas."
          addLabel="+ Agregar hospitalizacion"
          load={hospitalizationsHxApi.list}
          columns={[
            { label: "Ingreso", render: (item) => formatDate(item.admission_date) },
            { label: "Alta", render: (item) => (item.discharge_date ? formatDate(item.discharge_date) : "N/D") },
            { label: "Motivo", render: (item) => item.reason ?? "N/D" },
            { label: "Hospital", render: (item) => item.hospital ?? "N/D" }
          ]}
          renderAddForm={({ onCancel, onCreated }) => (
            <AddHospitalizationForm patientId={patientId} tenantId={currentUser?.tenantId ?? ""} onCancel={onCancel} onCreated={onCreated} />
          )}
        />
      ) : null}

      {activeTab === "consentimientos" ? (
        <ResourceListTab
          patientId={patientId}
          emptyLabel="Sin consentimientos registrados."
          addLabel="+ Agregar consentimiento"
          load={consentsApi.list}
          columns={[
            { label: "Tipo", render: (item) => <span className="font-semibold text-slate-800">{item.consent_type}</span> },
            { label: "Texto", render: (item) => item.consent_text },
            { label: "Firmado", render: (item) => (item.signed_at ? formatDate(item.signed_at) : "N/D") }
          ]}
          renderAddForm={({ onCancel, onCreated }) => (
            <AddConsentForm patientId={patientId} tenantId={currentUser?.tenantId ?? ""} onCancel={onCancel} onCreated={onCreated} />
          )}
        />
      ) : null}

      {activeTab === "crecimiento" && isPediatric ? (
        <ResourceListTab
          patientId={patientId}
          emptyLabel="Sin mediciones registradas."
          addLabel="+ Agregar medicion"
          load={growthMeasurementsApi.list}
          columns={[
            { label: "Fecha", render: (item) => (item.measured_at ? formatDate(item.measured_at) : "N/D") },
            { label: "Peso (kg)", render: (item) => item.weight ?? "N/D" },
            { label: "Talla (cm)", render: (item) => item.height ?? "N/D" },
            { label: "Perimetro cefalico (cm)", render: (item) => item.head_circumference ?? "N/D" }
          ]}
          renderAddForm={({ onCancel, onCreated }) => (
            <AddGrowthMeasurementForm patientId={patientId} tenantId={currentUser?.tenantId ?? ""} onCancel={onCancel} onCreated={onCreated} />
          )}
        />
      ) : null}

      {activeTab === "desarrollo" && isPediatric ? (
        <ResourceListTab
          patientId={patientId}
          emptyLabel="Sin hitos de desarrollo registrados."
          addLabel="+ Agregar hito"
          load={developmentRecordsApi.list}
          columns={[
            { label: "Hito (ID)", render: (item) => item.milestone_id },
            { label: "Alcanzado", render: (item) => (item.achieved_at ? formatDate(item.achieved_at) : "N/D") },
            { label: "Alerta de retraso", render: (item) => (item.delay_alert ? "Si" : "No") }
          ]}
          renderAddForm={({ onCancel, onCreated }) => (
            <AddDevelopmentRecordForm patientId={patientId} tenantId={currentUser?.tenantId ?? ""} onCancel={onCancel} onCreated={onCreated} />
          )}
        />
      ) : null}

      {activeTab === "antecedentes" ? <AntecedentesPanel patientId={patientId} /> : null}
      {activeTab === "pediatria" && isPediatric ? <PediatriaPanel patientId={patientId} /> : null}
      {activeTab === "gineco" && isGineco ? <GinecoPanel patientId={patientId} /> : null}

      <Card>
        <CardContent className="flex flex-col items-center justify-between gap-3 p-4 sm:flex-row">
          <Button type="button" variant="ghost" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" />
            Imprimir expediente
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-red-600 hover:bg-red-50"
            onClick={() => setDeactivateOpen(true)}
          >
            <UserX className="mr-1.5 h-4 w-4" />
            Inactivar paciente
          </Button>
        </CardContent>
      </Card>

      <EditPatientDialog
        open={editOpen}
        patient={patient}
        onClose={() => setEditOpen(false)}
        onSaved={(updated) => {
          setPatient(updated);
          setEditOpen(false);
        }}
      />

      <ConfirmDialog
        open={deactivateOpen}
        title="Inactivar paciente"
        description={`Esta accion desactiva el expediente de ${patient.first_name} ${patient.last_name}. No se elimina el historial clinico, pero dejara de aparecer en el directorio de pacientes activos.`}
        confirmLabel="Inactivar paciente"
        destructive
        onCancel={() => setDeactivateOpen(false)}
        onConfirm={onDeactivate}
      />
    </div>
  );
}
