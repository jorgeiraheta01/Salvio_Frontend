"use client";

import { useEffect, useState } from "react";
import { Search, UserPlus, UserRound } from "lucide-react";

import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Modal } from "@/shared/components/ui/modal";
import { Select } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/shared/utils/cn";
import { APPOINTMENT_TYPES } from "@/modules/appointments/appointment-status";
import { specialtyForDoctor, useDoctorDirectory } from "@/modules/appointments/doctor-directory";
import { createAppointment, listPatients, type PatientItem } from "@/modules/clinical/api/clinical.api";
import { createPatient } from "@/modules/patients/api/patient-resources.api";
import { formatDui } from "@/shared/utils/format";

const QUICK_CREATE_GENDERS: { value: string; label: string }[] = [
  { value: "female", label: "Femenino" },
  { value: "male", label: "Masculino" },
  { value: "other", label: "Otro" }
];

type NewAppointmentDialogProps = {
  open: boolean;
  tenantId: string;
  defaultDoctorId: string;
  defaultDate: string;
  defaultPatient?: PatientItem | null;
  onClose: () => void;
  onCreated: () => void;
};

const SLOT_MINUTES = 30;

// Genera las franjas horarias del dia en incrementos de 30 minutos --
// "00:00".."23:30". El input nativo type="datetime-local" con step=1800 no
// filtra su selector visual de minutos por step en todos los navegadores
// (sigue mostrando 00-59), asi que el unico control real es no dejar elegir
// nada fuera de estos valores.
const TIME_SLOTS: string[] = Array.from({ length: (24 * 60) / SLOT_MINUTES }, (_, index) => {
  const totalMinutes = index * SLOT_MINUTES;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
});

function formatTimeSlotLabel(slot: string): string {
  const [hours, minutes] = slot.split(":").map(Number);
  const period = hours < 12 ? "a. m." : "p. m.";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(hour12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
}

function todayLocalDateValue(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Primera franja de 30 min que ya no quedo en el pasado para la fecha dada.
function nextAvailableTimeSlot(dateStr: string): string {
  if (dateStr !== todayLocalDateValue()) {
    return TIME_SLOTS[0];
  }
  const now = new Date();
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const nextSlotMinutes = Math.ceil(minutesNow / SLOT_MINUTES) * SLOT_MINUTES;
  const slot = TIME_SLOTS.find((candidate) => {
    const [hours, minutes] = candidate.split(":").map(Number);
    return hours * 60 + minutes >= nextSlotMinutes;
  });
  return slot ?? TIME_SLOTS[TIME_SLOTS.length - 1];
}

function combineDateAndTime(dateStr: string, timeStr: string): string {
  return `${dateStr}T${timeStr}`;
}

export function NewAppointmentDialog({
  open,
  tenantId,
  defaultDoctorId,
  defaultDate,
  defaultPatient,
  onClose,
  onCreated
}: NewAppointmentDialogProps) {
  const { doctors } = useDoctorDirectory();
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<PatientItem[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientItem | null>(null);
  const [searching, setSearching] = useState(false);
  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState(TIME_SLOTS[0]);
  const scheduledAt = dateValue ? combineDateAndTime(dateValue, timeValue) : "";
  const [appointmentType, setAppointmentType] = useState(APPOINTMENT_TYPES[0]);
  const [doctorId, setDoctorId] = useState(defaultDoctorId);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [qcFirstName, setQcFirstName] = useState("");
  const [qcLastName, setQcLastName] = useState("");
  const [qcDob, setQcDob] = useState("");
  const [qcGender, setQcGender] = useState("female");
  const [qcDui, setQcDui] = useState("");
  const [qcCreating, setQcCreating] = useState(false);
  const [qcError, setQcError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setPatientQuery("");
    setPatientResults([]);
    setSelectedPatient(defaultPatient ?? null);
    setDateValue(defaultDate);
    setTimeValue(nextAvailableTimeSlot(defaultDate));
    setAppointmentType(APPOINTMENT_TYPES[0]);
    const matchesKnownDoctor = doctors.some((doctor) => doctor.id === defaultDoctorId);
    setDoctorId(matchesKnownDoctor || doctors.length === 0 ? defaultDoctorId : doctors[0].id);
    setNotes("");
    setError(null);
    setQuickCreateOpen(false);
    setQcFirstName("");
    setQcLastName("");
    setQcDob("");
    setQcGender("female");
    setQcDui("");
    setQcError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultDate, defaultDoctorId, defaultPatient, doctors]);

  function openQuickCreate() {
    const parts = patientQuery.trim().split(/\s+/);
    setQcFirstName(parts[0] ?? "");
    setQcLastName(parts.slice(1).join(" "));
    setQcError(null);
    setQuickCreateOpen(true);
  }

  function isAdult(dob: string): boolean {
    if (!dob) return false;
    const birth = new Date(dob);
    const age = (Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return age >= 18;
  }

  async function handleQuickCreate() {
    if (!qcFirstName.trim() || !qcLastName.trim() || !qcDob) {
      setQcError("Indica nombre, apellido y fecha de nacimiento.");
      return;
    }
    if (isAdult(qcDob) && !/^\d{8}-\d$/.test(qcDui.trim())) {
      setQcError("El DUI es obligatorio para pacientes adultos y debe tener el formato 00000000-0.");
      return;
    }
    setQcCreating(true);
    setQcError(null);
    try {
      const created = await createPatient({
        tenant_id: tenantId,
        medical_record_number: "auto",
        first_name: qcFirstName.trim(),
        last_name: qcLastName.trim(),
        date_of_birth: qcDob,
        gender: qcGender,
        insurance_type: "particular",
        dui: qcDui.trim() || undefined
      });
      setSelectedPatient(created);
      setQuickCreateOpen(false);
      setPatientQuery("");
      setPatientResults([]);
    } catch (err) {
      setQcError(err instanceof Error ? err.message : "No se pudo crear el paciente.");
    } finally {
      setQcCreating(false);
    }
  }

  useEffect(() => {
    if (!open || patientQuery.trim().length < 2 || selectedPatient) {
      setPatientResults([]);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(() => {
      listPatients(patientQuery.trim())
        .then((response) => setPatientResults(response.data))
        .catch(() => setPatientResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [open, patientQuery, selectedPatient]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedPatient) {
      setError("Selecciona un paciente de la lista.");
      return;
    }
    if (!scheduledAt) {
      setError("Selecciona fecha y hora de la cita.");
      return;
    }
    if (new Date(scheduledAt).getTime() < Date.now()) {
      setError("No se puede agendar una cita en una fecha u hora que ya paso.");
      return;
    }
    if (!doctorId.trim()) {
      setError("Indica el doctor asignado.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createAppointment({
        patient_id: selectedPatient.id,
        tenant_id: tenantId,
        doctor_id: doctorId.trim(),
        scheduled_at: new Date(scheduledAt).toISOString(),
        appointment_type: appointmentType,
        notes: notes.trim() || undefined
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agendar la cita.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva cita" description="Agenda una cita clinica para un paciente del tenant activo.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="patient-search">Paciente</Label>
          {selectedPatient ? (
            <div className="flex items-center justify-between rounded-md border bg-slate-50 px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-primary" />
                <span className="font-medium">
                  {selectedPatient.first_name} {selectedPatient.last_name}
                </span>
                <span className="text-muted-foreground">{selectedPatient.dui ?? selectedPatient.medical_record_number ?? ""}</span>
              </div>
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => {
                  setSelectedPatient(null);
                  setPatientQuery("");
                }}
              >
                Cambiar
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="patient-search"
                className="pl-9"
                placeholder="Buscar por nombre, DUI o expediente..."
                value={patientQuery}
                onChange={(event) => setPatientQuery(event.target.value)}
                autoComplete="off"
              />
              {patientQuery.trim().length >= 2 && !quickCreateOpen ? (
                <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-white shadow-panel">
                  {searching ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">Buscando...</p>
                  ) : (
                    <>
                      {patientResults.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-muted-foreground">Sin resultados.</p>
                      ) : (
                        patientResults.map((patient) => (
                          <button
                            key={patient.id}
                            type="button"
                            className={cn("flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted")}
                            onClick={() => {
                              setSelectedPatient(patient);
                              setPatientResults([]);
                            }}
                          >
                            <span className="font-medium">
                              {patient.first_name} {patient.last_name}
                            </span>
                            <span className="text-xs text-muted-foreground">{patient.dui ?? patient.medical_record_number ?? "Sin documento"}</span>
                          </button>
                        ))
                      )}
                      <button
                        type="button"
                        onClick={openQuickCreate}
                        className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-left text-sm font-medium text-primary hover:bg-muted"
                      >
                        <UserPlus className="h-4 w-4" />
                        Crear paciente nuevo{patientQuery.trim() ? ` "${patientQuery.trim()}"` : ""}
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {quickCreateOpen ? (
          <div className="space-y-3 rounded-md border border-dashed border-primary/40 bg-primary/5 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Paciente nuevo</p>
              <button type="button" className="text-xs font-medium text-muted-foreground hover:underline" onClick={() => setQuickCreateOpen(false)}>
                Cancelar
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="qc-first-name">Nombre</Label>
                <Input id="qc-first-name" value={qcFirstName} onChange={(e) => setQcFirstName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qc-last-name">Apellido</Label>
                <Input id="qc-last-name" value={qcLastName} onChange={(e) => setQcLastName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qc-dob">Fecha de nacimiento</Label>
                <Input id="qc-dob" type="date" value={qcDob} onChange={(e) => setQcDob(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qc-gender">Genero</Label>
                <Select id="qc-gender" value={qcGender} onChange={(e) => setQcGender(e.target.value)}>
                  {QUICK_CREATE_GENDERS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="qc-dui">DUI {isAdult(qcDob) ? "" : "(opcional para menores de edad)"}</Label>
                <Input
                  id="qc-dui"
                  placeholder="00000000-0"
                  value={qcDui}
                  onChange={(e) => setQcDui(formatDui(e.target.value))}
                  maxLength={10}
                  inputMode="numeric"
                />
              </div>
            </div>
            {qcError ? <p className="text-sm text-destructive">{qcError}</p> : null}
            <Button type="button" size="sm" onClick={handleQuickCreate} disabled={qcCreating}>
              {qcCreating ? "Creando..." : "Crear y seleccionar"}
            </Button>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="scheduled-date">Fecha</Label>
            <Input
              id="scheduled-date"
              type="date"
              value={dateValue}
              min={todayLocalDateValue()}
              onChange={(event) => {
                const nextDate = event.target.value;
                setDateValue(nextDate);
                setTimeValue((current) => {
                  const nextAvailable = nextAvailableTimeSlot(nextDate);
                  const currentMinutes = current.split(":").map(Number);
                  const nextAvailableMinutes = nextAvailable.split(":").map(Number);
                  const currentTotal = currentMinutes[0] * 60 + currentMinutes[1];
                  const nextAvailableTotal = nextAvailableMinutes[0] * 60 + nextAvailableMinutes[1];
                  return currentTotal >= nextAvailableTotal ? current : nextAvailable;
                });
              }}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="scheduled-time">Hora</Label>
            <Select id="scheduled-time" value={timeValue} onChange={(event) => setTimeValue(event.target.value)} required>
              {TIME_SLOTS.filter((slot) => {
                if (dateValue !== todayLocalDateValue()) return true;
                const [hours, minutes] = slot.split(":").map(Number);
                const now = new Date();
                return hours * 60 + minutes >= now.getHours() * 60 + now.getMinutes();
              }).map((slot) => (
                <option key={slot} value={slot}>
                  {formatTimeSlotLabel(slot)}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">Franjas de 30 minutos.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="appointment-type">Tipo de cita</Label>
            <Select id="appointment-type" value={appointmentType} onChange={(event) => setAppointmentType(event.target.value)}>
              {APPOINTMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doctor-id">Doctor asignado</Label>
            {doctors.length > 0 ? (
              <Select id="doctor-id" value={doctorId} onChange={(event) => setDoctorId(event.target.value)} required>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.full_name} - {specialtyForDoctor(doctor.full_name, doctor.specialty)}
                  </option>
                ))}
              </Select>
            ) : (
              <Input id="doctor-id" value={doctorId} onChange={(event) => setDoctorId(event.target.value)} required />
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Notas (opcional)</Label>
          <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Motivo de consulta, indicaciones previas..." />
        </div>

        {error ? (
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Agendando..." : "Agendar cita"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
