"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { listPatients, type PatientItem } from "@/modules/clinical/api/clinical.api";
import { useCurrentUser } from "@/core/auth/current-user";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";

type StatusFilter = "Todos" | "Activo" | "Inactivo";

function calculateAge(dateOfBirth: string): number | null {
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function initialsFor(patient: PatientItem): string {
  return `${patient.first_name.charAt(0)}${patient.last_name.charAt(0)}`.toUpperCase();
}

const GENDER_LABEL: Record<string, string> = { male: "Masculino", female: "Femenino", other: "Otro" };

export default function PatientsPage() {
  const currentUser = useCurrentUser();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Todos");
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(q?: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await listPatients(q);
      setPatients(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la lista de pacientes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => load(query.trim() || undefined), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Backend's GET /patients only returns non-deleted rows (deleted_at IS NULL),
  // so every result here is "Activo". Selecting "Inactivo" always yields an empty
  // list — a real filter needs a `include_deleted` query param on the backend.
  const filteredPatients = useMemo(() => {
    if (statusFilter === "Inactivo") return [];
    return patients;
  }, [patients, statusFilter]);

  const totalLabel = loading
    ? "Cargando pacientes..."
    : `${patients.length} paciente${patients.length === 1 ? "" : "s"} en ${currentUser?.tenantId ?? "esta clinica"}.`;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Pacientes</h1>
          <p className="mt-1 text-sm text-slate-500">{totalLabel}</p>
        </div>
        <Button type="button" asChild>
          <Link href="/patients/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Registrar paciente
          </Link>
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre, expediente o DUI..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="w-48">
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
            <option value="Todos">Todos los estados</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </Select>
        </div>
      </div>

      {error ? (
        <Alert>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button type="button" size="sm" variant="outline" onClick={() => load(query.trim() || undefined)}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            {[1, 2, 3, 4].map((key) => (
              <Skeleton key={key} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : filteredPatients.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            {statusFilter === "Inactivo" ? (
              <p className="text-sm text-slate-500">
                El backend no expone pacientes inactivos por API — no hay nada que mostrar con este filtro.
              </p>
            ) : query ? (
              <p className="text-sm text-slate-500">Ningun paciente coincide con &quot;{query}&quot;.</p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">Todavia no hay pacientes registrados en esta clinica.</p>
                <Button type="button" asChild>
                  <Link href="/patients/new">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Registrar paciente
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPatients.map((patient) => {
            const age = calculateAge(patient.date_of_birth);
            const genderLabel = patient.gender ? (GENDER_LABEL[patient.gender] ?? patient.gender) : "N/D";
            return (
              <Link
                key={patient.id}
                href={`/patients/${patient.id}`}
                className="flex items-center gap-3 rounded-custom border border-slate-100 bg-white p-4 shadow-panel transition-shadow hover:shadow-md"
              >
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-custom bg-brand text-sm font-bold text-white">
                  {initialsFor(patient) || "??"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800">
                    {patient.first_name} {patient.last_name}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {patient.medical_record_number ?? "Sin expediente"} · {age !== null ? `${age} anos` : "Edad N/D"} · {genderLabel}
                  </p>
                </div>
                <Badge variant="primary">Activo</Badge>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
