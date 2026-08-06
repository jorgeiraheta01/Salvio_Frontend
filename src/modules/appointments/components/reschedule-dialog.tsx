"use client";

import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Modal } from "@/shared/components/ui/modal";
import { Select } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";

export function RescheduleDialog({
  open,
  doctors,
  defaultDoctorId,
  onCancel,
  onConfirm
}: {
  open: boolean;
  doctors: { id: string; full_name: string }[];
  defaultDoctorId: string;
  onCancel: () => void;
  onConfirm: (payload: { newScheduledAt: string; newDoctorId: string; reason: string }) => Promise<void>;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [doctorId, setDoctorId] = useState(defaultDoctorId);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDoctorId(defaultDoctorId);
      setDate("");
      setTime("");
      setReason("");
      setError(null);
    }
  }, [open, defaultDoctorId]);

  async function handleConfirm() {
    if (!date || !time) {
      setError("Selecciona la nueva fecha y hora.");
      return;
    }
    if (new Date(`${date}T${time}:00`).getTime() < Date.now()) {
      setError("No se puede reprogramar a una fecha u hora que ya paso.");
      return;
    }
    if (reason.trim().length < 3) {
      setError("Escribe un motivo de al menos 3 caracteres.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm({ newScheduledAt: `${date}T${time}:00`, newDoctorId: doctorId, reason: reason.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reprogramar la cita.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onCancel} title="Reprogramar cita" description="Se crea una cita nueva con la fecha y medico elegidos; la actual queda marcada como reprogramada.">
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="reschedule-date">Nueva fecha</Label>
            <Input
              id="reschedule-date"
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reschedule-time">Nueva hora</Label>
            <Input id="reschedule-time" type="time" step={1800} value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reschedule-doctor">Doctor asignado</Label>
          <Select id="reschedule-doctor" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reschedule-reason">Motivo</Label>
          <Textarea id="reschedule-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe brevemente el motivo..." />
        </div>
        {error ? (
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Guardando..." : "Reprogramar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
