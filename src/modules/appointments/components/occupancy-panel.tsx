import { Card, CardContent } from "@/shared/components/ui/card";

const BAR_COLORS = ["bg-brand", "bg-amber-500", "bg-blue-500", "bg-indigo-500"];

export type DoctorOccupancy = {
  id: string;
  label: string;
  count: number;
  percentage: number;
};

export function OccupancyPanel({ doctors }: { doctors: DoctorOccupancy[] }) {
  const average = doctors.length > 0 ? Math.round(doctors.reduce((sum, item) => sum + item.percentage, 0) / doctors.length) : 0;
  const availableSlots = doctors.filter((item) => item.percentage < 70).length;

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <h3 className="text-sm font-bold text-slate-900">Ocupacion del dia</h3>

        {doctors.length === 0 ? (
          <p className="text-sm text-slate-500">Sin citas agendadas para este dia.</p>
        ) : (
          <div className="space-y-4">
            {doctors.map((doctor, index) => (
              <div key={doctor.id}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{doctor.label}</span>
                  <span className="font-bold text-slate-900">{doctor.percentage}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${BAR_COLORS[index % BAR_COLORS.length]}`}
                    style={{ width: `${doctor.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {doctors.length > 0 ? (
          <div className="rounded-custom bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            La ocupacion promedio actual es del <strong>{average}%</strong>. Hay {availableSlots} medico{availableSlots === 1 ? "" : "s"} con
            disponibilidad para citas de urgencia.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function OccupancyLegend() {
  return (
    <Card>
      <CardContent className="space-y-2 p-5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Indicadores de cupo</p>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="h-2 w-2 rounded-full bg-brand" />
          Alta disponibilidad
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Cupo limitado
        </div>
      </CardContent>
    </Card>
  );
}
