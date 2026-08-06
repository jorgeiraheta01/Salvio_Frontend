"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Stethoscope } from "lucide-react";

import {
  listClinicalNotes,
  listDiagnoses,
  listEncountersByPatient,
  listPrescriptions,
  type AppointmentItem,
  type ClinicalNote,
  type Diagnosis,
  type EncounterSummary,
  type Prescription
} from "@/modules/clinical/api/clinical.api";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatServerDateTime } from "@/shared/utils/dates";

type EncounterRecord = {
  encounter: EncounterSummary;
  notes: ClinicalNote[];
  diagnoses: Diagnosis[];
  prescriptions: Prescription[];
};

const STATUS_LABEL: Record<EncounterSummary["status"], string> = {
  active: "Activo",
  completed: "Completado",
  closed: "Cerrado"
};

export function EncounterHistoryPanel({ patientId, appointments }: { patientId: string; appointments: AppointmentItem[] }) {
  const [records, setRecords] = useState<EncounterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const encounters = await listEncountersByPatient(patientId);
        const results = await Promise.all(
          encounters.map(async (encounter): Promise<EncounterRecord | null> => {
            try {
              const [notes, diagnoses, prescriptions] = await Promise.all([
                listClinicalNotes(encounter.id),
                listDiagnoses(encounter.id),
                listPrescriptions(encounter.id).catch(() => [])
              ]);
              return { encounter, notes, diagnoses, prescriptions };
            } catch {
              return null;
            }
          })
        );
        if (!mounted) return;
        // "Nuevo encuentro" crea el encounter en el servidor apenas se hace
        // clic, antes de que exista contenido clinico -- si el usuario
        // navega fuera sin completar la consulta, queda un encounter
        // "active" huerfano (sin cita, sin notas/diagnosticos/recetas).
        // Se filtra del historial en vez de borrarlo (no es data real que
        // el usuario haya cargado, pero tampoco se toca la base sin que lo
        // pida explicitamente).
        const withContent = results.filter((item): item is EncounterRecord => {
          if (item === null) return false;
          const isEmptyDraft =
            item.encounter.status === "active" &&
            !item.encounter.appointment_id &&
            item.notes.length === 0 &&
            item.diagnoses.length === 0 &&
            item.prescriptions.length === 0;
          return !isEmptyDraft;
        });
        setRecords(withContent);
      } catch {
        if (mounted) setRecords([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [patientId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-1 p-8 text-center">
          <p className="text-sm text-slate-500">Sin consultas registradas para este paciente todavia.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {records.map(({ encounter, notes, diagnoses, prescriptions }) => {
        const appointment = appointments.find((item) => item.id === encounter.appointment_id);
        const isOpen = expandedId === encounter.id;
        return (
          <Card key={encounter.id}>
            <CardContent className="p-4">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => setExpandedId(isOpen ? null : encounter.id)}
              >
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-brand" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {appointment ? formatServerDateTime(appointment.scheduled_at) : "Fecha N/D"}
                    </p>
                    <p className="text-xs text-slate-500">{encounter.doctor.full_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={encounter.status === "closed" ? "neutral" : "primary"}>{STATUS_LABEL[encounter.status]}</Badge>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
              </button>
              {isOpen ? (
                <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 text-sm">
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Nota clinica</p>
                    {notes.length === 0 ? (
                      <p className="text-slate-400">Sin nota registrada.</p>
                    ) : (
                      notes.map((note) => (
                        <p key={note.id} className="whitespace-pre-wrap text-slate-700">
                          {note.content}
                        </p>
                      ))
                    )}
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Diagnosticos</p>
                    {diagnoses.length === 0 ? (
                      <p className="text-slate-400">Sin diagnosticos registrados.</p>
                    ) : (
                      <ul className="list-inside list-disc space-y-0.5 text-slate-700">
                        {diagnoses.map((item) => (
                          <li key={item.id}>
                            {item.code} - {item.description}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Prescripciones</p>
                    {prescriptions.length === 0 ? (
                      <p className="text-slate-400">Sin prescripciones registradas.</p>
                    ) : (
                      <ul className="list-inside list-disc space-y-0.5 text-slate-700">
                        {prescriptions.flatMap((prescription) =>
                          prescription.items.map((item, index) => (
                            <li key={`${prescription.id}-${index}`}>
                              {item.medication_name}
                              {item.dose ? ` - ${item.dose}` : ""}
                              {item.frequency ? ` - ${item.frequency}` : ""}
                            </li>
                          ))
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
