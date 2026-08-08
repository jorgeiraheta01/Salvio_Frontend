"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CalendarDays, ChevronLeft, ChevronRight, Download, Plus, Search } from "lucide-react";

import {
  deleteAppointment,
  listAppointments,
  getPatient,
  rescheduleAppointment,
  startEncounter,
  updateAppointmentStatus,
  type AppointmentItem,
  type AppointmentStatus,
  type PatientItem
} from "@/modules/clinical/api/clinical.api";
import { useCurrentUser } from "@/core/auth/current-user";
import { useAuthStore } from "@/modules/auth/store/auth.store";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { REASON_REQUIRED_STATUSES } from "@/modules/appointments/appointment-status";
import { AdmissionModal, TriageModal } from "@/modules/appointments/components/admission-triage-modals";
import { AppointmentRow } from "@/modules/appointments/components/appointment-row";
import { DoctorFilterChips, type DoctorChipOption } from "@/modules/appointments/components/doctor-filter-chips";
import { DoctorScheduleModal } from "@/modules/appointments/components/doctor-schedule-modal";
import { RescheduleDialog } from "@/modules/appointments/components/reschedule-dialog";
import { MonthlyCalendar } from "@/modules/appointments/components/monthly-calendar";
import { NewAppointmentDialog } from "@/modules/appointments/components/new-appointment-dialog";
import { OccupancyLegend, OccupancyPanel, type DoctorOccupancy } from "@/modules/appointments/components/occupancy-panel";
import { ReasonDialog } from "@/modules/appointments/components/reason-dialog";
import { specialtyForDoctor, useDoctorDirectory } from "@/modules/appointments/doctor-directory";
import { useEncounterHistoryStore } from "@/modules/clinical/store/encounterHistoryStore";
import { parseServerDateTime } from "@/shared/utils/dates";

const APPOINTMENT_MANAGER_ROLES = new Set(["clinic_admin", "doctor", "resident", "receptionist"]);
const TRIAGE_ROLES = new Set(["nurse", "doctor", "resident"]);
const ASSUMED_DAILY_CAPACITY = 8;

function toDateInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatHeadingDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  const label = date.toLocaleDateString("es-SV", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AgendaPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const currentUser = useCurrentUser();
  const { doctors } = useDoctorDirectory();
  const recordEncounter = useEncounterHistoryStore((state) => state.recordEncounter);

  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [doctorFilter, setDoctorFilter] = useState<string | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [patients, setPatients] = useState<Record<string, PatientItem>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newAppointmentOpen, setNewAppointmentOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [reasonRequest, setReasonRequest] = useState<{ appointmentId: string; status: AppointmentStatus; currentStatus: AppointmentStatus } | null>(null);
  const [admissionTarget, setAdmissionTarget] = useState<{ appointmentId: string; patientId: string } | null>(null);
  const [triageTarget, setTriageTarget] = useState<{ appointmentId: string; patientId: string } | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [calendarCursor, setCalendarCursor] = useState(() => {
    const [year, month] = selectedDate.split("-").map(Number);
    return { year, month: (month ?? 1) - 1 };
  });
  const [monthDots, setMonthDots] = useState<Set<number>>(new Set());
  const [monthLoading, setMonthLoading] = useState(false);
  const monthCache = useRef<Map<string, Set<number>>>(new Map());

  const canManage = currentUser ? APPOINTMENT_MANAGER_ROLES.has(currentUser.role) : false;
  const isClinicalStaff = currentUser ? currentUser.role === "doctor" || currentUser.role === "resident" : false;
  const canRegisterTriage = currentUser ? TRIAGE_ROLES.has(currentUser.role) : false;

  const loadAppointments = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listAppointments({ date: selectedDate });
      setAppointments(data);

      const missingIds = Array.from(new Set(data.map((item) => item.patient_id))).filter((id) => !(id in patients));
      if (missingIds.length > 0) {
        const results = await Promise.all(
          missingIds.map((id) =>
            getPatient(id)
              .then((patient) => [id, patient] as const)
              .catch(() => [id, null] as const)
          )
        );
        setPatients((prev) => {
          const next = { ...prev };
          for (const [id, patient] of results) {
            if (patient) next[id] = patient;
          }
          return next;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la agenda.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedDate]);

  useEffect(() => {
    if (!isHydrated || !token) return;
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, token, selectedDate]);

  useEffect(() => {
    const [year, month] = selectedDate.split("-").map(Number);
    setCalendarCursor({ year, month: (month ?? 1) - 1 });
  }, [selectedDate]);

  const loadMonthDots = useCallback(async () => {
    if (!token) return;
    const key = `${calendarCursor.year}-${calendarCursor.month}`;
    const cached = monthCache.current.get(key);
    if (cached) {
      setMonthDots(cached);
      return;
    }
    setMonthLoading(true);
    const daysInMonth = new Date(calendarCursor.year, calendarCursor.month + 1, 0).getDate();
    const pad = (value: number) => String(value).padStart(2, "0");
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const CONCURRENCY = 4;
    const dots = new Set<number>();
    try {
      for (let i = 0; i < days.length; i += CONCURRENCY) {
        const batch = days.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
          batch.map((day) =>
            listAppointments({ date: `${calendarCursor.year}-${pad(calendarCursor.month + 1)}-${pad(day)}` })
              .then((data) => (data.length > 0 ? day : null))
              .catch(() => null)
          )
        );
        for (const day of results) {
          if (day !== null) dots.add(day);
        }
      }
      monthCache.current.set(key, new Set(dots));
      setMonthDots(new Set(dots));
    } finally {
      setMonthLoading(false);
    }
  }, [token, calendarCursor]);

  useEffect(() => {
    if (!isHydrated || !token) return;
    loadMonthDots();
  }, [isHydrated, token, loadMonthDots]);

  function shiftDate(days: number) {
    const [year, month, day] = selectedDate.split("-").map(Number);
    const date = new Date(year, (month ?? 1) - 1, day ?? 1);
    date.setDate(date.getDate() + days);
    setSelectedDate(toDateInputValue(date));
  }

  function shiftMonth(delta: number) {
    setCalendarCursor((prev) => {
      const date = new Date(prev.year, prev.month + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  }

  const doctorFiltered = useMemo(
    () => (doctorFilter === "all" ? appointments : appointments.filter((item) => item.doctor_id === doctorFilter)),
    [appointments, doctorFilter]
  );

  const visibleAppointments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? doctorFiltered.filter((item) => {
          const patient = patients[item.patient_id];
          const haystack = `${patient?.first_name ?? ""} ${patient?.last_name ?? ""} ${patient?.dui ?? ""} ${patient?.medical_record_number ?? ""}`.toLowerCase();
          return haystack.includes(query);
        })
      : doctorFiltered;
    return [...filtered].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  }, [doctorFiltered, searchQuery, patients]);

  const doctorChipOptions: DoctorChipOption[] = useMemo(
    () =>
      doctors.map((doctor) => ({
        id: doctor.id,
        label: doctor.full_name,
        count: appointments.filter((item) => item.doctor_id === doctor.id).length
      })),
    [doctors, appointments]
  );

  const occupancyDoctors: DoctorOccupancy[] = useMemo(
    () =>
      doctorChipOptions
        .filter((doctor) => doctor.count > 0)
        .map((doctor) => ({
          id: doctor.id,
          label: doctor.label,
          count: doctor.count,
          percentage: Math.min(100, Math.round((doctor.count / ASSUMED_DAILY_CAPACITY) * 100))
        })),
    [doctorChipOptions]
  );

  async function handleTransition(appointment: AppointmentItem, status: AppointmentStatus) {
    setBusyId(appointment.id);
    try {
      const updated = await updateAppointmentStatus(appointment.id, { status, current_status: appointment.status });
      setAppointments((prev) => prev.map((item) => (item.id === appointment.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la cita.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReasonConfirm(reason: string) {
    if (!reasonRequest) return;
    const updated = await updateAppointmentStatus(reasonRequest.appointmentId, {
      status: reasonRequest.status,
      current_status: reasonRequest.currentStatus,
      reason
    });
    setAppointments((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    setReasonRequest(null);
  }

  async function handleStartConsultation(appointment: AppointmentItem) {
    setBusyId(appointment.id);
    try {
      try {
        const updated = await updateAppointmentStatus(appointment.id, { status: "in_consultation", current_status: appointment.status });
        setAppointments((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } catch {
        // La transicion de estado es best-effort; si falla, igual se inicia la consulta.
      }
      const encounter = await startEncounter({ patient_id: appointment.patient_id, appointment_id: appointment.id });
      recordEncounter(appointment.patient_id, encounter.id);
      router.push(`/clinical/encounter/${encounter.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar la consulta.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteAppointment() {
    if (!deleteTargetId) return;
    await deleteAppointment(deleteTargetId);
    setAppointments((prev) => prev.filter((item) => item.id !== deleteTargetId));
    setDeleteTargetId(null);
  }

  function handleExport() {
    const rows: string[][] = [["Hora", "Paciente", "Documento", "Medico", "Especialidad", "Tipo", "Estado"]];
    for (const appointment of visibleAppointments) {
      const patient = patients[appointment.patient_id];
      const doctor = doctors.find((item) => item.id === appointment.doctor_id);
      const scheduledDate = parseServerDateTime(appointment.scheduled_at);
      rows.push([
        scheduledDate ? scheduledDate.toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" }) : "N/D",
        patient ? `${patient.first_name} ${patient.last_name}` : appointment.patient_id,
        patient?.dui ?? patient?.medical_record_number ?? "",
        doctor?.full_name ?? appointment.doctor_id,
        doctor ? specialtyForDoctor(doctor.full_name, doctor.specialty) : "",
        appointment.appointment_type ?? "",
        appointment.status
      ]);
    }
    downloadCsv(`agenda_${selectedDate}.csv`, rows);
  }

  if (!isHydrated || !token) {
    return <div className="text-sm text-muted-foreground">Validando sesion...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Agenda</h1>
          <p className="text-sm text-slate-500">
            Gestion avanzada de citas para {doctors.length} profesional{doctors.length === 1 ? "" : "es"}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={handleExport} disabled={visibleAppointments.length === 0}>
            <Download className="mr-1.5 h-4 w-4" />
            Exportar agenda
          </Button>
          {canManage ? (
            <Button type="button" variant="outline" onClick={() => setScheduleModalOpen(true)}>
              <CalendarClock className="mr-1.5 h-4 w-4" />
              Horarios y ausencias
            </Button>
          ) : null}
          {canManage ? (
            <Button type="button" onClick={() => setNewAppointmentOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Nueva cita
            </Button>
          ) : null}
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Buscar paciente por nombre, ID o expediente..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-col gap-4 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => shiftDate(-1)} aria-label="Dia anterior">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelectedDate(toDateInputValue(new Date()))}>
                    Hoy
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => shiftDate(1)} aria-label="Dia siguiente">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <CalendarDays className="h-4 w-4 text-brand" />
                  {formatHeadingDate(selectedDate)}
                </div>
              </div>

              <DoctorFilterChips
                options={doctorChipOptions}
                selectedId={doctorFilter}
                onSelect={setDoctorFilter}
                totalCount={appointments.length}
              />
            </CardContent>
          </Card>

          {error ? (
            <Alert>
              <AlertDescription className="flex items-center justify-between gap-3">
                <span>{error}</span>
                <Button type="button" size="sm" variant="outline" onClick={loadAppointments}>
                  Reintentar
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((key) => (
                <Skeleton key={key} className="h-20 w-full" />
              ))}
            </div>
          ) : visibleAppointments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                <CalendarDays className="h-8 w-8 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {appointments.length === 0 ? "No hay citas agendadas para este dia." : "No hay citas con este filtro."}
                  </p>
                  <p className="text-sm text-muted-foreground">Prueba con otra fecha, medico o termino de busqueda.</p>
                </div>
                {canManage && appointments.length === 0 ? (
                  <Button type="button" size="sm" onClick={() => setNewAppointmentOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Agendar la primera cita
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {visibleAppointments.map((appointment) => (
                <AppointmentRow
                  key={appointment.id}
                  appointment={appointment}
                  patient={patients[appointment.patient_id]}
                  doctor={doctors.find((item) => item.id === appointment.doctor_id)}
                  canManage={canManage}
                  canRegisterTriage={canRegisterTriage}
                  busy={busyId === appointment.id}
                  isClinicalStaff={isClinicalStaff}
                  onTransition={(status) => handleTransition(appointment, status)}
                  onRequestReason={(status) => setReasonRequest({ appointmentId: appointment.id, status, currentStatus: appointment.status })}
                  onStartConsultation={() => handleStartConsultation(appointment)}
                  onRegisterAdmission={() => setAdmissionTarget({ appointmentId: appointment.id, patientId: appointment.patient_id })}
                  onRegisterTriage={() => setTriageTarget({ appointmentId: appointment.id, patientId: appointment.patient_id })}
                  onDeleteAppointment={() => setDeleteTargetId(appointment.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <MonthlyCalendar
            year={calendarCursor.year}
            month={calendarCursor.month}
            selectedDate={selectedDate}
            daysWithAppointments={monthDots}
            loading={monthLoading}
            onShiftMonth={shiftMonth}
            onSelectDay={setSelectedDate}
          />
          <OccupancyPanel doctors={occupancyDoctors} />
          <OccupancyLegend />
        </div>
      </div>

      {currentUser ? (
        <NewAppointmentDialog
          open={newAppointmentOpen}
          tenantId={currentUser.tenantId}
          defaultDoctorId={currentUser.id}
          defaultDate={selectedDate}
          onClose={() => setNewAppointmentOpen(false)}
          onCreated={() => {
            setNewAppointmentOpen(false);
            monthCache.current.delete(`${calendarCursor.year}-${calendarCursor.month}`);
            loadAppointments();
          }}
        />
      ) : null}

      <DoctorScheduleModal open={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)} doctors={doctors} />

      <ReasonDialog
        open={reasonRequest !== null && reasonRequest.status !== "rescheduled" && REASON_REQUIRED_STATUSES.includes(reasonRequest.status)}
        title={reasonRequest?.status === "no_show" ? "Marcar como no presentado" : "Cancelar cita"}
        description="Este motivo queda registrado en la bitacora de auditoria del expediente."
        confirmLabel="Confirmar"
        onCancel={() => setReasonRequest(null)}
        onConfirm={handleReasonConfirm}
      />

      <RescheduleDialog
        open={reasonRequest !== null && reasonRequest.status === "rescheduled"}
        doctors={doctors}
        defaultDoctorId={
          (reasonRequest && appointments.find((a) => a.id === reasonRequest.appointmentId)?.doctor_id) || doctors[0]?.id || ""
        }
        onCancel={() => setReasonRequest(null)}
        onConfirm={async ({ newScheduledAt, newDoctorId, reason }) => {
          if (!reasonRequest) return;
          const created = await rescheduleAppointment(reasonRequest.appointmentId, {
            new_scheduled_at: newScheduledAt,
            new_doctor_id: newDoctorId,
            reason
          });
          setAppointments((prev) => prev.map((item) => (item.id === reasonRequest.appointmentId ? { ...item, status: "rescheduled" } : item)));
          if (created.scheduled_at.slice(0, 10) === selectedDate) {
            setAppointments((prev) => [...prev, created]);
          }
          setReasonRequest(null);
        }}
      />

      {currentUser ? (
        <>
          <AdmissionModal
            target={admissionTarget}
            tenantId={currentUser.tenantId}
            onClose={() => setAdmissionTarget(null)}
            onCreated={() => setAdmissionTarget(null)}
          />
          <TriageModal
            target={triageTarget}
            tenantId={currentUser.tenantId}
            doctorId={currentUser.id}
            onClose={() => setTriageTarget(null)}
            onCreated={() => setTriageTarget(null)}
          />
        </>
      ) : null}

      <ConfirmDialog
        open={deleteTargetId !== null}
        title="Eliminar cita"
        description="Esta accion elimina la cita de forma permanente y no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteAppointment}
      />
    </div>
  );
}
