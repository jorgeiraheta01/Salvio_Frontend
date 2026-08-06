"use client";

import { useEffect, useState } from "react";
import { Search, UserRound } from "lucide-react";

import { listPatients, type PatientItem } from "@/modules/clinical/api/clinical.api";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

type PatientPickerProps = {
  value: PatientItem | null;
  onChange: (patient: PatientItem | null) => void;
};

export function PatientPicker({ value, onChange }: PatientPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientItem[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2 || value) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(() => {
      listPatients(query.trim())
        .then((response) => setResults(response.data))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, value]);

  return (
    <div className="space-y-1.5">
      <Label>Paciente</Label>
      {value ? (
        <div className="flex items-center justify-between rounded-custom border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-brand" />
            <span className="font-medium">
              {value.first_name} {value.last_name}
            </span>
          </div>
          <button type="button" className="text-xs font-medium text-brand hover:underline" onClick={() => onChange(null)}>
            Cambiar
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" placeholder="Buscar paciente..." value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
          {query.trim().length >= 2 ? (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-custom border border-slate-200 bg-white shadow-panel">
              {searching ? (
                <p className="px-3 py-2 text-sm text-slate-400">Buscando...</p>
              ) : results.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-400">Sin resultados.</p>
              ) : (
                results.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => {
                      onChange(patient);
                      setQuery("");
                    }}
                  >
                    <span className="font-medium">
                      {patient.first_name} {patient.last_name}
                    </span>
                    <span className="text-xs text-slate-400">{patient.dui ?? patient.medical_record_number ?? "Sin documento"}</span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
