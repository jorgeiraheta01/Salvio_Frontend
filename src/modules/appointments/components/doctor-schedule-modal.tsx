"use client";

import { useEffect, useState } from "react";
import { Plane, Trash2 } from "lucide-react";

import { ApiError } from "@/core/api/http-client";
import {
  createAbsence,
  deleteAbsence,
  getWeeklyHours,
  listAbsences,
  setWeeklyHours,
  type DoctorAbsence,
  type WeeklyHoursEntry
} from "@/modules/appointments/api/doctor-schedule.api";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Modal } from "@/shared/components/ui/modal";
import { Select } from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";

const DAY_LABELS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];

type DayRow = { enabled: boolean; start: string; end: string };

function emptyWeek(): DayRow[] {
  return DAY_LABELS.map(() => ({ enabled: false, start: "08:00", end: "17:00" }));
}

export function DoctorScheduleModal({
  open,
  onClose,
  doctors
}: {
  open: boolean;
  onClose: () => void;
  doctors: { id: string; full_name: string }[];
}) {
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? "");
  const [week, setWeek] = useState<DayRow[]>(emptyWeek());
  const [absences, setAbsences] = useState<DoctorAbsence[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [absenceStart, setAbsenceStart] = useState("");
  const [absenceEnd, setAbsenceEnd] = useState("");
  const [absenceReason, setAbsenceReason] = useState("");
  const [removingAbsence, setRemovingAbsence] = useState<DoctorAbsence | null>(null);

  useEffect(() => {
    if (!open) return;
    // Si el medico seleccionado ya no esta en la lista actual (ej. el
    // modal se reabre para OTRO medico especifico, como desde el Resumen),
    // hay que re-seleccionar -- no solo cuando doctorId esta vacio.
    if (!doctors.some((d) => d.id === doctorId)) {
      setDoctorId(doctors[0]?.id ?? "");
    }
  }, [open, doctors, doctorId]);

  function load(id: string) {
    setLoading(true);
    setError(null);
    Promise.all([getWeeklyHours(id), listAbsences(id)])
      .then(([hours, abs]) => {
        const next = emptyWeek();
        hours.forEach((h) => {
          next[h.day_of_week] = { enabled: true, start: h.start_time.slice(0, 5), end: h.end_time.slice(0, 5) };
        });
        setWeek(next);
        setAbsences(abs);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el horario."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (open && doctorId) load(doctorId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, doctorId]);

  async function onSaveWeek() {
    setSaving(true);
    setError(null);
    try {
      const entries: WeeklyHoursEntry[] = week
        .map((row, index) => ({ day_of_week: index, start_time: row.start, end_time: row.end, enabled: row.enabled }))
        .filter((row) => row.enabled)
        .map(({ day_of_week, start_time, end_time }) => ({ day_of_week, start_time, end_time }));
      await setWeeklyHours(doctorId, entries);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el horario.");
    } finally {
      setSaving(false);
    }
  }

  async function onAddAbsence() {
    setError(null);
    if (!absenceStart || !absenceEnd) {
      setError("Indica el rango de fechas de la ausencia.");
      return;
    }
    try {
      const created = await createAbsence(doctorId, { start_date: absenceStart, end_date: absenceEnd, reason: absenceReason.trim() || undefined });
      setAbsences((prev) => [created, ...prev]);
      setAbsenceStart("");
      setAbsenceEnd("");
      setAbsenceReason("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar la ausencia.");
    }
  }

  async function onConfirmRemoveAbsence() {
    if (!removingAbsence) return;
    await deleteAbsence(doctorId, removingAbsence.id);
    setAbsences((prev) => prev.filter((a) => a.id !== removingAbsence.id));
    setRemovingAbsence(null);
  }

  return (
    <Modal open={open} onClose={onClose} title="Horarios y ausencias" description="Fuera de este horario o durante una ausencia, el medico no aparece disponible." className="max-w-2xl">
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label>Medico</Label>
          <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name}
              </option>
            ))}
          </Select>
        </div>

        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Horario semanal</p>
              <div className="space-y-2">
                {DAY_LABELS.map((label, index) => (
                  <div key={label} className="flex flex-col gap-2 rounded-lg border border-slate-200 px-3 py-2 sm:flex-row sm:items-center sm:gap-3">
                    <label className="flex flex-shrink-0 items-center gap-2 text-sm font-medium text-slate-700 sm:w-32">
                      <input
                        type="checkbox"
                        checked={week[index].enabled}
                        onChange={(e) =>
                          setWeek((prev) => prev.map((row, i) => (i === index ? { ...row, enabled: e.target.checked } : row)))
                        }
                      />
                      {label}
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={week[index].start}
                        disabled={!week[index].enabled}
                        onChange={(e) => setWeek((prev) => prev.map((row, i) => (i === index ? { ...row, start: e.target.value } : row)))}
                      />
                      <span className="flex-shrink-0 text-xs text-slate-400">a</span>
                      <Input
                        type="time"
                        value={week[index].end}
                        disabled={!week[index].enabled}
                        onChange={(e) => setWeek((prev) => prev.map((row, i) => (i === index ? { ...row, end: e.target.value } : row)))}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Button type="button" className="mt-3" size="sm" onClick={onSaveWeek} disabled={saving}>
                {saving ? "Guardando..." : "Guardar horario"}
              </Button>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Ausencias (viajes, incapacidades)</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input type="date" value={absenceStart} onChange={(e) => setAbsenceStart(e.target.value)} />
                <Input type="date" value={absenceEnd} onChange={(e) => setAbsenceEnd(e.target.value)} />
                <Input value={absenceReason} onChange={(e) => setAbsenceReason(e.target.value)} placeholder="Motivo (opcional)" />
              </div>
              <Button type="button" className="mt-2" size="sm" variant="outline" onClick={onAddAbsence}>
                <Plane className="mr-1.5 h-3.5 w-3.5" />
                Agregar ausencia
              </Button>

              <div className="mt-3 space-y-2">
                {absences.length === 0 ? (
                  <p className="text-sm text-slate-400">Sin ausencias registradas.</p>
                ) : (
                  absences.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium text-slate-700">
                          {a.start_date} - {a.end_date}
                        </p>
                        {a.reason ? <p className="text-xs text-slate-400">{a.reason}</p> : null}
                      </div>
                      <button type="button" onClick={() => setRemovingAbsence(a)} className="text-slate-400 hover:text-red-600" aria-label="Eliminar ausencia">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <Button type="button" variant="ghost" className="w-full" onClick={onClose}>
          Cerrar
        </Button>
      </div>

      <ConfirmDialog
        open={!!removingAbsence}
        title="Eliminar ausencia"
        description="El medico volvera a aparecer disponible en ese rango de fechas."
        confirmLabel="Eliminar"
        destructive
        onCancel={() => setRemovingAbsence(null)}
        onConfirm={onConfirmRemoveAbsence}
      />
    </Modal>
  );
}
