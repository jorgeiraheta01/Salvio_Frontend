import type { BadgeProps } from "@/shared/components/ui/badge";
import type { AppointmentStatus } from "@/modules/clinical/api/clinical.api";

type StatusMeta = {
  label: string;
  badgeVariant: NonNullable<BadgeProps["variant"]>;
  borderClass: string;
};

export const APPOINTMENT_STATUS_META: Record<AppointmentStatus, StatusMeta> = {
  scheduled: { label: "Programada", badgeVariant: "neutral", borderClass: "border-l-slate-300" },
  confirmed: { label: "Confirmada", badgeVariant: "info", borderClass: "border-l-blue-500" },
  checked_in: { label: "En sala", badgeVariant: "accent", borderClass: "border-l-amber-500" },
  in_consultation: { label: "En consulta", badgeVariant: "primary", borderClass: "border-l-brand" },
  completed: { label: "Completada", badgeVariant: "primary", borderClass: "border-l-emerald-500" },
  cancelled: { label: "Cancelada", badgeVariant: "destructive", borderClass: "border-l-red-500" },
  no_show: { label: "No se presento", badgeVariant: "destructive", borderClass: "border-l-red-400" },
  rescheduled: { label: "Reprogramada", badgeVariant: "secondary", borderClass: "border-l-indigo-500" }
};

export const APPOINTMENT_STATUS_FILTERS: Array<{ value: AppointmentStatus | "all"; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "scheduled", label: "Programadas" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "checked_in", label: "En sala" },
  { value: "in_consultation", label: "En consulta" },
  { value: "completed", label: "Completadas" },
  { value: "cancelled", label: "Canceladas" },
  { value: "no_show", label: "No se presento" },
  { value: "rescheduled", label: "Reprogramadas" }
];

export const TERMINAL_STATUSES: AppointmentStatus[] = ["completed", "cancelled", "no_show", "rescheduled"];

export const REASON_REQUIRED_STATUSES: AppointmentStatus[] = ["cancelled", "no_show", "rescheduled"];

export const APPOINTMENT_TYPES = [
  "Consulta general",
  "Primera vez",
  "Control",
  "Procedimiento",
  "Teleconsulta",
  "Urgencia"
];
