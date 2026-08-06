"use client";

import { useState } from "react";

import { createAdmission, createTriage } from "@/modules/clinical/api/clinical.api";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Modal } from "@/shared/components/ui/modal";
import { Select } from "@/shared/components/ui/select";

type ModalTarget = { appointmentId: string; patientId: string } | null;

function nowLocalInputValue(): string {
  const date = new Date();
  date.setSeconds(0, 0);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AdmissionModal({ target, tenantId, onClose, onCreated }: { target: ModalTarget; tenantId: string; onClose: () => void; onCreated: () => void }) {
  const [admissionDatetime, setAdmissionDatetime] = useState(nowLocalInputValue);
  const [service, setService] = useState("");
  const [bedNumber, setBedNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!target) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!target) return;
    if (!admissionDatetime) {
      setError("Indica la fecha y hora de ingreso.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createAdmission(target.appointmentId, {
        patient_id: target.patientId,
        tenant_id: tenantId,
        admission_datetime: new Date(admissionDatetime).toISOString(),
        service: service.trim() || undefined,
        bed_number: bedNumber.trim() || undefined
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el ingreso.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Registrar ingreso hospitalario" description="Crear una admision vinculada a esta cita.">
      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-1.5">
          <Label>Fecha y hora de ingreso</Label>
          <Input type="datetime-local" value={admissionDatetime} onChange={(e) => setAdmissionDatetime(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Servicio</Label>
            <Input value={service} onChange={(e) => setService(e.target.value)} placeholder="Medicina interna, pediatria..." />
          </div>
          <div className="space-y-1.5">
            <Label>Numero de cama</Label>
            <Input value={bedNumber} onChange={(e) => setBedNumber(e.target.value)} placeholder="204-A" />
          </div>
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
            {submitting ? "Guardando..." : "Registrar ingreso"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const PRIORITY_LABEL: Record<string, string> = { low: "Baja", moderate: "Moderada", high: "Alta", critical: "Critica" };

export function TriageModal({ target, tenantId, doctorId, onClose, onCreated }: { target: ModalTarget; tenantId: string; doctorId: string; onClose: () => void; onCreated: () => void }) {
  const [priority, setPriority] = useState("moderate");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!target) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!target) return;
    setSubmitting(true);
    setError(null);
    try {
      await createTriage(target.appointmentId, {
        patient_id: target.patientId,
        tenant_id: tenantId,
        received_at: new Date().toISOString(),
        priority,
        chief_complaint: chiefComplaint.trim() || undefined,
        systolic_bp: systolic.trim() ? Number(systolic.trim()) : undefined,
        diastolic_bp: diastolic.trim() ? Number(diastolic.trim()) : undefined,
        heart_rate: heartRate.trim() ? Number(heartRate.trim()) : undefined,
        created_by: doctorId
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el triage.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Registrar triage" description="Clasificacion inicial de prioridad para esta cita.">
      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-1.5">
          <Label>Prioridad</Label>
          <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
            {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Motivo de consulta</Label>
          <Input value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} placeholder="Motivo referido por el paciente" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>PA sistolica</Label>
            <Input value={systolic} onChange={(e) => setSystolic(e.target.value)} placeholder="120" />
          </div>
          <div className="space-y-1.5">
            <Label>PA diastolica</Label>
            <Input value={diastolic} onChange={(e) => setDiastolic(e.target.value)} placeholder="80" />
          </div>
          <div className="space-y-1.5">
            <Label>FC (lpm)</Label>
            <Input value={heartRate} onChange={(e) => setHeartRate(e.target.value)} placeholder="76" />
          </div>
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
            {submitting ? "Guardando..." : "Registrar triage"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
