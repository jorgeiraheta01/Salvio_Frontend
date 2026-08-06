"use client";

import Link from "next/link";
import { BedDouble, CalendarX2, CheckCircle2, LogIn, RotateCcw, ShieldAlert, Stethoscope, Trash2 } from "lucide-react";

import { Card, CardContent } from "@/shared/components/ui/card";
import { ActionMenu, type ActionMenuItem } from "@/shared/components/ui/action-menu";
import type { AppointmentItem, AppointmentStatus, PatientItem, UserDirectoryEntry } from "@/modules/clinical/api/clinical.api";
import { AppointmentStatusBadge } from "@/modules/appointments/components/appointment-status-badge";
import { APPOINTMENT_STATUS_META, TERMINAL_STATUSES } from "@/modules/appointments/appointment-status";
import { specialtyForDoctor } from "@/modules/appointments/doctor-directory";
import { parseServerDateTime } from "@/shared/utils/dates";

type AppointmentRowProps = {
  appointment: AppointmentItem;
  patient: PatientItem | null | undefined;
  doctor: UserDirectoryEntry | null | undefined;
  canManage: boolean;
  canRegisterTriage: boolean;
  busy: boolean;
  onTransition: (status: AppointmentStatus) => void;
  onRequestReason: (status: "cancelled" | "no_show" | "rescheduled") => void;
  onStartConsultation: () => void;
  onRegisterAdmission: () => void;
  onRegisterTriage: () => void;
  onDeleteAppointment: () => void;
};

function formatTime(iso: string): { time: string; period: string } {
  const date = parseServerDateTime(iso);
  if (!date) return { time: "--:--", period: "" };
  const parts = date.toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit", hour12: true }).split(" ");
  return { time: parts[0], period: (parts[1] ?? "").toUpperCase() };
}

export function AppointmentRow({
  appointment,
  patient,
  doctor,
  canManage,
  canRegisterTriage,
  busy,
  onTransition,
  onRequestReason,
  onStartConsultation,
  onRegisterAdmission,
  onRegisterTriage,
  onDeleteAppointment
}: AppointmentRowProps) {
  const isTerminal = TERMINAL_STATUSES.includes(appointment.status);
  const patientLabel = patient ? `${patient.first_name} ${patient.last_name}` : `Paciente ${appointment.patient_id.slice(0, 8)}`;
  const doctorLabel = doctor ? `${doctor.full_name} - ${specialtyForDoctor(doctor.full_name, doctor.specialty)}` : `Doctor ${appointment.doctor_id.slice(0, 8)}`;
  const { time, period } = formatTime(appointment.scheduled_at);
  const borderClass = APPOINTMENT_STATUS_META[appointment.status].borderClass;

  const actions: ActionMenuItem[] = [];
  if (canManage && !isTerminal) {
    if (appointment.status === "scheduled") {
      actions.push({ label: "Confirmar", icon: CheckCircle2, onSelect: () => onTransition("confirmed") });
    }
    if (appointment.status === "confirmed") {
      actions.push({ label: "Registrar llegada", icon: LogIn, onSelect: () => onTransition("checked_in") });
    }
    if (appointment.status === "checked_in") {
      actions.push({ label: "Iniciar consulta", icon: Stethoscope, onSelect: onStartConsultation });
    }
    if (appointment.status !== "checked_in") {
      actions.push({ label: "Reprogramar", icon: RotateCcw, onSelect: () => onRequestReason("rescheduled") });
    }
    actions.push({ label: "No se presento", icon: ShieldAlert, onSelect: () => onRequestReason("no_show") });
    actions.push({ label: "Cancelar", icon: CalendarX2, onSelect: () => onRequestReason("cancelled"), destructive: true });
  }
  if (canManage) {
    actions.push({ label: "Registrar ingreso hospitalario", icon: BedDouble, onSelect: onRegisterAdmission });
    if (canRegisterTriage) {
      actions.push({ label: "Registrar triage", icon: ShieldAlert, onSelect: onRegisterTriage });
    }
    actions.push({ label: "Eliminar cita", icon: Trash2, onSelect: onDeleteAppointment, destructive: true });
  }

  return (
    <Card className={`border-l-4 ${borderClass}`}>
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-6">
          <div className="w-14 flex-shrink-0 text-center">
            <p className="text-base font-bold text-slate-800">{time}</p>
            <p className="text-xs font-medium text-slate-400">{period}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Paciente</p>
            <Link href={`/patients/${appointment.patient_id}`} className="text-sm font-semibold text-slate-900 hover:text-brand">
              {patientLabel}
            </Link>
          </div>
          <div className="hidden sm:block">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Medico / Especialidad</p>
            <p className="text-sm text-slate-600">{doctorLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <AppointmentStatusBadge status={appointment.status} />
          {appointment.status === "checked_in" && canManage ? (
            <button
              type="button"
              disabled={busy}
              onClick={onStartConsultation}
              className="hidden rounded-custom bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand/90 disabled:opacity-50 sm:inline-flex"
            >
              Iniciar consulta
            </button>
          ) : null}
          <ActionMenu items={actions} disabled={busy} />
        </div>
      </CardContent>
    </Card>
  );
}
