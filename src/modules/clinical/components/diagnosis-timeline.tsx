"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Send, Stethoscope } from "lucide-react";

import {
  listClinicalNotes,
  listDiagnoses,
  listEncountersByPatient,
  type ClinicalNote,
  type Diagnosis,
  type EncounterSummary
} from "@/modules/clinical/api/clinical.api";
import {
  getImportedPatientHistory,
  listReferralsByPatient,
  type OutgoingReferral
} from "@/modules/operations/api/operations.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatServerDateTime } from "@/shared/utils/dates";

const OUTGOING_REFERRAL_STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente de agendar",
  accepted: "En control",
  completed: "Dado de alta",
  rejected: "Rechazada"
};

const SEVERITY_VARIANT: Record<string, "destructive" | "accent" | "neutral"> = {
  severe: "destructive",
  moderate: "accent",
  mild: "neutral"
};

// Vista unificada de una consulta en la linea de tiempo, ya sea local (de
// este tenant) o traida en vivo de la clinica de origen de una referencia --
// el paciente ya importado no tiene consultas propias aqui todavia, pero si
// tiene historial real en otro lado, y debe verse igual de completo.
type DisplayEntry = {
  key: string;
  startedAt?: string | null;
  doctorName: string;
  chiefComplaint?: string | null;
  diagnoses: { code: string; description: string; severity?: string | null }[];
  notes: string[];
  sourceLabel?: string | null;
};

export function DiagnosisTimeline({ patientId }: { patientId: string }) {
  const [localEntries, setLocalEntries] = useState<DisplayEntry[]>([]);
  const [remoteEntries, setRemoteEntries] = useState<DisplayEntry[]>([]);
  const [remoteSourceLabel, setRemoteSourceLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [outgoingReferrals, setOutgoingReferrals] = useState<OutgoingReferral[]>([]);

  useEffect(() => {
    let mounted = true;
    listReferralsByPatient(patientId)
      .then((data) => {
        if (mounted) setOutgoingReferrals(data.filter((r) => r.referral_type === "cross_tenant"));
      })
      .catch(() => {
        if (mounted) setOutgoingReferrals([]);
      });
    return () => {
      mounted = false;
    };
  }, [patientId]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [encounters, importedHistory] = await Promise.all([
          listEncountersByPatient(patientId),
          getImportedPatientHistory(patientId)
        ]);

        const localResults = await Promise.all(
          encounters.map(async (encounter): Promise<DisplayEntry | null> => {
            try {
              const [diagnoses, notes] = await Promise.all([listDiagnoses(encounter.id), listClinicalNotes(encounter.id).catch(() => [])]);
              if (diagnoses.length === 0) return null;
              return {
                key: `local-${encounter.id}`,
                startedAt: encounter.started_at,
                doctorName: encounter.doctor.full_name,
                chiefComplaint: encounter.chief_complaint,
                diagnoses: diagnoses.map((d) => ({ code: d.code, description: d.description, severity: d.severity })),
                notes: notes.map((n) => n.content)
              };
            } catch {
              return null;
            }
          })
        );
        if (!mounted) return;
        setLocalEntries(localResults.filter((item): item is DisplayEntry => item !== null));

        if (importedHistory) {
          setRemoteSourceLabel(importedHistory.source_tenant_name ?? importedHistory.source_tenant_id);
          setRemoteEntries(
            importedHistory.encounters.map((encounter) => ({
              key: `remote-${encounter.id}`,
              startedAt: encounter.started_at,
              doctorName: encounter.doctor_name ?? "Doctor no disponible",
              chiefComplaint: encounter.chief_complaint,
              diagnoses: encounter.diagnoses.map((d) => ({ code: d.code, description: d.description, severity: d.severity })),
              notes: encounter.notes.map((n) => n.content),
              sourceLabel: importedHistory.source_tenant_name ?? importedHistory.source_tenant_id
            }))
          );
        } else {
          setRemoteEntries([]);
          setRemoteSourceLabel(null);
        }
      } catch {
        if (mounted) {
          setLocalEntries([]);
          setRemoteEntries([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [patientId]);

  const entries = [...localEntries, ...remoteEntries].sort((a, b) => {
    const dateA = a.startedAt ? new Date(a.startedAt).getTime() : 0;
    const dateB = b.startedAt ? new Date(b.startedAt).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="space-y-4">
      {outgoingReferrals.map((referral) => (
        <div key={referral.id} className="flex items-start gap-2 rounded-custom border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <Send className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">
              Referido a {referral.target_doctor_name ?? "un medico"}
              {referral.destination_area ? ` (${referral.destination_area})` : ""}
              {referral.target_tenant_name ? ` - ${referral.target_tenant_name}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-amber-700">{OUTGOING_REFERRAL_STATUS_LABEL[referral.status] ?? referral.status}</p>
          </div>
        </div>
      ))}
      {remoteSourceLabel ? (
        <div className="flex items-start gap-2 rounded-custom border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
          <Send className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-600" />
          <p>
            Paciente referido desde <span className="font-semibold">{remoteSourceLabel}</span> -- el historial de esa clinica se incluye
            abajo junto con las consultas de aqui.
          </p>
        </div>
      ) : null}
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <Stethoscope className="h-4 w-4 text-brand" />
          <CardTitle className="text-base">Linea de tiempo de diagnosticos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : entries.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">Sin diagnosticos registrados todavia.</p>
          ) : (
            <ol className="space-y-0">
              {entries.map((entry, index) => {
                const isOpen = expandedId === entry.key;
                return (
                  <li key={entry.key} className="relative flex gap-3 pb-5 last:pb-0">
                    {index < entries.length - 1 ? (
                      <span className="absolute left-[7px] top-4 h-full w-px bg-slate-200" aria-hidden="true" />
                    ) : null}
                    <span className="relative z-10 mt-1.5 h-3.5 w-3.5 flex-shrink-0 rounded-full border-2 border-brand bg-white" />
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        className="flex w-full items-start justify-between gap-2 text-left"
                        onClick={() => setExpandedId(isOpen ? null : entry.key)}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-500">
                            {entry.startedAt ? formatServerDateTime(entry.startedAt) : "Fecha N/D"} - {entry.doctorName}
                            {entry.sourceLabel ? ` - ${entry.sourceLabel}` : ""}
                          </p>
                          {entry.chiefComplaint ? <p className="mt-0.5 text-sm text-slate-700">{entry.chiefComplaint}</p> : null}
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {entry.diagnoses.map((dx, dxIndex) => (
                              <Badge key={dxIndex} variant={dx.severity ? SEVERITY_VARIANT[dx.severity] : "neutral"}>
                                {dx.code} - {dx.description}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                        ) : (
                          <ChevronDown className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                        )}
                      </button>
                      {isOpen ? (
                        <div className="mt-2 space-y-2 rounded-custom border border-slate-100 bg-slate-50 p-3 text-sm">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Nota clinica de esta consulta</p>
                          {entry.notes.length === 0 ? (
                            <p className="text-slate-400">Sin nota registrada.</p>
                          ) : (
                            entry.notes.map((note, noteIndex) => (
                              <p key={noteIndex} className="whitespace-pre-wrap text-slate-700">
                                {note}
                              </p>
                            ))
                          )}
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
