import { CalendarClock, CalendarX2, CheckCircle2, Clock3, RotateCcw, ShieldAlert, Stethoscope, UserCheck } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import type { AppointmentStatus } from "@/modules/clinical/api/clinical.api";
import { APPOINTMENT_STATUS_META } from "@/modules/appointments/appointment-status";

const STATUS_ICONS: Record<AppointmentStatus, React.ComponentType<{ className?: string }>> = {
  scheduled: CalendarClock,
  confirmed: CheckCircle2,
  checked_in: UserCheck,
  in_consultation: Stethoscope,
  completed: CheckCircle2,
  cancelled: CalendarX2,
  no_show: ShieldAlert,
  rescheduled: RotateCcw
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const meta = APPOINTMENT_STATUS_META[status];
  const Icon = STATUS_ICONS[status] ?? Clock3;

  return (
    <Badge variant={meta.badgeVariant}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </Badge>
  );
}
