"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, CalendarClock, Clock3, PowerOff, Stethoscope, UserRound, Users } from "lucide-react";

import {
  getPatient,
  listAppointments,
  listPatients,
  startEncounter,
  updateAppointmentStatus,
  type AppointmentItem,
  type PatientItem
} from "@/modules/clinical/api/clinical.api";
import { useCurrentUser } from "@/core/auth/current-user";
import { specialtyForDoctor, useDoctorDirectory } from "@/modules/appointments/doctor-directory";
import { AppointmentStatusBadge } from "@/modules/appointments/components/appointment-status-badge";
import { DoctorScheduleModal } from "@/modules/appointments/components/doctor-schedule-modal";
import { listOwnTenantModules } from "@/modules/tenant/api/tenant.api";
import { useEncounterHistoryStore } from "@/modules/clinical/store/encounterHistoryStore";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/utils/cn";
import { parseServerDateTime } from "@/shared/utils/dates";

const APPOINTMENT_MANAGER_ROLES = new Set(["clinic_admin", "doctor", "resident", "receptionist"]);
const CLINICIAN_ROLES = new Set(["doctor", "resident"]);

function todayIso(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function formatTime(iso: string): string {
  const parsed = parseServerDateTime(iso);
  if (!parsed) return iso;
  return parsed.toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" });
}

function calculateAge(dateOfBirth: string): number | null {
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

const CAN_START_STATUSES = new Set(["scheduled", "confirmed", "checked_in"]);

export default function DashboardPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const recordEncounter = useEncounterHistoryStore((state) => state.recordEncounter);
  const { doctors, loading: loadingDoctors } = useDoctorDirectory();
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [patients, setPatients] = useState<Record<string, PatientItem>>({});
  const [patientsTotal, setPatientsTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasDisabledModule, setHasDisabledModule] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<{ id: string; full_name: string } | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const canManage = currentUser ? APPOINTMENT_MANAGER_ROLES.has(currentUser.role) : false;

  async function handleStartConsultation(appointment: AppointmentItem) {
    setStartingId(appointment.id);
    setStartError(null);
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
      setStartError(err instanceof Error ? err.message : "No se pudo iniciar la consulta.");
    } finally {
      setStartingId(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    listOwnTenantModules()
      .then((modules) => {
        if (!cancelled) setHasDisabledModule(modules.some((m) => !m.enabled));
      })
      .catch(() => {
        // Silencioso: si esta consulta falla no debe tumbar el resto del dashboard.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [todayAppointments, patientsResponse] = await Promise.all([
          listAppointments({ date: todayIso() }),
          listPatients()
        ]);
        if (cancelled) return;
        setAppointments(todayAppointments);
        setPatientsTotal(patientsResponse.total);

        const ids = Array.from(new Set(todayAppointments.map((a) => a.patient_id)));
        const results = await Promise.all(
          ids.map((id) =>
            getPatient(id)
              .then((p) => [id, p] as const)
              .catch(() => [id, null] as const)
          )
        );
        if (cancelled) return;
        const map: Record<string, PatientItem> = {};
        for (const [id, p] of results) {
          if (p) map[id] = p;
        }
        setPatients(map);
      } catch {
        if (!cancelled) {
          setAppointments([]);
          setPatientsTotal(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const byDoctor = useMemo(() => {
    const map = new Map<string, AppointmentItem[]>();
    for (const appt of appointments) {
      const list = map.get(appt.doctor_id) ?? [];
      list.push(appt);
      map.set(appt.doctor_id, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    }
    return map;
  }, [appointments]);

  const pendingCount = appointments.filter((a) => a.status === "scheduled").length;
  const doctorsWithAgendaToday = byDoctor.size;

  // La "proxima" cita es la mas cercana en el tiempo que todavia no paso y
  // sigue vigente (no cancelada/no-show/completada) -- no simplemente la
  // primera del array, que puede llegar en cualquier orden si hay varios
  // medicos con citas a distintas horas.
  const nextAppointment = useMemo(() => {
    const now = new Date();
    return appointments
      .filter((a) => !["cancelled", "no_show", "completed", "rescheduled"].includes(a.status))
      .map((a) => ({ appt: a, when: parseServerDateTime(a.scheduled_at) }))
      .filter((entry): entry is { appt: AppointmentItem; when: Date } => entry.when !== null && entry.when >= now)
      .sort((a, b) => a.when.getTime() - b.when.getTime())[0]?.appt;
  }, [appointments]);

  const stats = [
    { title: "Pacientes activos", value: patientsTotal === null ? "—" : String(patientsTotal), icon: Users, detail: "Total registrados" },
    { title: "Citas hoy", value: String(appointments.length), icon: CalendarClock, detail: `${pendingCount} pendientes de confirmar` },
    { title: "Medicos con agenda hoy", value: String(doctorsWithAgendaToday), icon: UserRound, detail: `de ${doctors.length} en la clinica` },
    { title: "Proxima cita", value: nextAppointment ? formatTime(nextAppointment.scheduled_at) : "—", icon: Clock3, detail: "Hoy" }
  ];

  // Un medico/residente quiere ver primero SU agenda del dia en orden de
  // hora, no las estadisticas agregadas de toda la clinica (cuantos
  // pacientes activos tiene la clinica o cuantos medicos con agenda no le
  // dice nada util a el) -- esas quedan solo para quien administra
  // (recepcion/admin). "Proxima cita" si se queda, es el unico numero
  // agregado que un medico si quiere ver de un vistazo.
  const isClinician = currentUser ? CLINICIAN_ROLES.has(currentUser.role) : false;
  const visibleStats = isClinician ? stats.filter((s) => s.title === "Proxima cita") : stats;
  const myAppointments = useMemo(() => {
    if (!currentUser) return [];
    return [...appointments]
      .filter((a) => a.doctor_id === currentUser.id && a.status !== "cancelled" && a.status !== "no_show")
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  }, [appointments, currentUser]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Resumen</h1>
        <p className="mt-1 text-sm text-slate-500">Vista general de la operacion clinica de hoy.</p>
      </div>

      {isClinician ? (
        <div className="overflow-hidden rounded-custom border border-slate-100 bg-white shadow-panel">
          <div className="bg-gradient-to-r from-brand to-teal-600 px-6 py-5 text-white">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              <h2 className="text-lg font-bold">Mis consultas de hoy</h2>
            </div>
            <p className="mt-1 text-sm text-teal-50">
              {myAppointments.length === 0
                ? "Tu agenda esta libre por ahora."
                : `${myAppointments.length} cita${myAppointments.length === 1 ? "" : "s"}, en orden de hora.`}
            </p>
          </div>

          <div className="p-6">
            {startError ? (
              <p className="mb-3 rounded-custom border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{startError}</p>
            ) : null}

            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : myAppointments.length === 0 ? (
              <p className="text-sm text-slate-400">No tienes citas agendadas hoy.</p>
            ) : (
              <ul className="space-y-2.5">
                {myAppointments.map((appt) => {
                  const patient = patients[appt.patient_id];
                  const canStart = CAN_START_STATUSES.has(appt.status);
                  const canResume = appt.status === "in_consultation";
                  const nameLabel = patient ? `${patient.first_name} ${patient.last_name}` : appt.patient_id;
                  return (
                    <li
                      key={appt.id}
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-3 rounded-xl border-l-4 bg-slate-50/60 p-3.5",
                        canStart ? "border-brand" : "border-slate-200"
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3.5">
                        <span className="w-[4.5rem] flex-shrink-0 text-base font-extrabold tabular-nums text-slate-900">{formatTime(appt.scheduled_at)}</span>
                        <div className="min-w-0">
                          {canResume ? (
                            <button
                              type="button"
                              onClick={() => handleStartConsultation(appt)}
                              disabled={startingId === appt.id}
                              className="truncate text-sm font-semibold text-brand underline-offset-2 hover:underline disabled:opacity-60"
                            >
                              {nameLabel}
                              {patient ? (
                                <span className="ml-1.5 font-normal text-slate-400">
                                  · {calculateAge(patient.date_of_birth) ?? "—"} anos
                                </span>
                              ) : null}
                            </button>
                          ) : (
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {nameLabel}
                              {patient ? (
                                <span className="ml-1.5 font-normal text-slate-400">
                                  · {calculateAge(patient.date_of_birth) ?? "—"} anos
                                </span>
                              ) : null}
                            </p>
                          )}
                          <div className="mt-1">
                            <AppointmentStatusBadge status={appt.status} />
                          </div>
                        </div>
                      </div>
                      {canStart ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleStartConsultation(appt)}
                          disabled={startingId === appt.id}
                        >
                          {startingId === appt.id ? (
                            "Iniciando..."
                          ) : (
                            <>
                              Iniciar consulta
                              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                            </>
                          )}
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      <div className={cn("grid grid-cols-1 gap-6", isClinician ? "sm:max-w-xs" : "md:grid-cols-2 lg:grid-cols-4")} data-purpose="stats-grid">
        {visibleStats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-custom border border-slate-100 bg-white p-6 shadow-panel">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{item.title}</p>
                  <h3 className="mt-2 text-3xl font-extrabold text-slate-900">{item.value}</h3>
                  <p className="mt-1 text-xs text-slate-400">{item.detail}</p>
                </div>
                <div className="rounded-lg bg-teal-50 p-2">
                  <Icon className="h-6 w-6 text-brand" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasDisabledModule ? (
        <p className="flex items-start gap-2 rounded-custom border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          Tu clinica esta pronto a quedarse sin servicios. Te recomendamos a la brevedad comunicarte con el proveedor de
          servicios de la clinica.
        </p>
      ) : null}

      <div className="rounded-custom border border-slate-100 bg-white p-6 shadow-panel">
        <h2 className="text-lg font-bold text-slate-900">Citas de hoy por medico</h2>
        <p className="mt-1 text-sm text-slate-500">Quien atiende, a que hora y a que paciente.</p>

        {loading || loadingDoctors ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : doctors.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">Sin medicos registrados todavia.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {doctors.map((doctor) => {
              const doctorAppointments = byDoctor.get(doctor.id) ?? [];
              return (
                <div key={doctor.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{doctor.full_name}</p>
                      <p className="text-xs text-slate-400">{specialtyForDoctor(doctor.full_name, doctor.specialty)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {doctorAppointments.length} cita{doctorAppointments.length === 1 ? "" : "s"}
                      </span>
                      {canManage ? (
                        <Button type="button" variant="outline" size="sm" onClick={() => setScheduleTarget(doctor)}>
                          <PowerOff className="mr-1.5 h-3.5 w-3.5" />
                          Marcar no disponible
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {doctorAppointments.length > 0 ? (
                    <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                      {doctorAppointments.map((appt) => {
                        const patient = patients[appt.patient_id];
                        return (
                          <li key={appt.id} className="flex items-center justify-between text-sm">
                            <span className="text-slate-700">{patient ? `${patient.first_name} ${patient.last_name}` : appt.patient_id}</span>
                            <span className="text-slate-400">{formatTime(appt.scheduled_at)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-400">Sin citas agendadas hoy.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DoctorScheduleModal open={!!scheduleTarget} onClose={() => setScheduleTarget(null)} doctors={scheduleTarget ? [scheduleTarget] : []} />
    </div>
  );
}
