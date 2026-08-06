"use client";

import { useEffect, useState } from "react";

import { useCurrentUser } from "@/core/auth/current-user";
import {
  developmentHxApi,
  familyHxApi,
  gynecologicalHxApi,
  perinatalHxApi,
  physiologicalHxApi,
  socialHxApi,
  type PatientDevelopmentHx,
  type PatientGynecologicalHx,
  type PatientPerinatalHx
} from "@/modules/patients/api/patient-resources.api";
import { AddFamilyHxForm, AddPhysiologicalHxForm, AddSocialHxForm } from "@/modules/patients/components/quick-add-forms";
import { ResourceListTab } from "@/modules/patients/components/resource-list-tab";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatServerDate } from "@/shared/utils/dates";

function InfoField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm text-slate-800">{value !== null && value !== undefined && value !== "" ? value : "No registrado"}</p>
    </div>
  );
}

function useResourceList<T>(patientId: string, loader: (id: string) => Promise<T[]>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setItems(await loader(patientId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la informacion.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  return { items, loading, error, reload: load };
}

const SMOKING_LABEL: Record<string, string> = { never: "Nunca", former: "Ex fumador", current: "Fumador actual" };
const ALCOHOL_LABEL: Record<string, string> = { never: "Nunca", occasional: "Ocasional", daily: "Diario" };

export function AntecedentesPanel({ patientId }: { patientId: string }) {
  const currentUser = useCurrentUser();
  const tenantId = currentUser?.tenantId ?? "";

  return (
    <div className="space-y-4">
      <ResourceListTab
        patientId={patientId}
        emptyLabel="Sin antecedentes familiares registrados."
        addLabel="+ Agregar antecedente familiar"
        load={familyHxApi.list}
        columns={[
          { label: "Parentesco", render: (item) => <span className="font-semibold text-slate-800">{item.relationship ?? "N/D"}</span> },
          { label: "Condicion", render: (item) => item.condition_name ?? "N/D" },
          { label: "Notas", render: (item) => item.notes ?? "N/D" },
          { label: "Registrado", render: (item) => formatServerDate(item.created_at) }
        ]}
        renderAddForm={({ onCancel, onCreated }) => <AddFamilyHxForm patientId={patientId} tenantId={tenantId} onCancel={onCancel} onCreated={onCreated} />}
      />

      <ResourceListTab
        patientId={patientId}
        emptyLabel="Sin antecedentes sociales registrados."
        addLabel="+ Agregar antecedente social"
        load={socialHxApi.list}
        columns={[
          { label: "Ocupacion", render: (item) => item.occupation ?? "N/D" },
          { label: "Vivienda", render: (item) => item.housing_type ?? "N/D" },
          { label: "Condiciones", render: (item) => item.living_conditions ?? "N/D" },
          { label: "Mascotas", render: (item) => item.pets ?? "N/D" },
          { label: "Registrado", render: (item) => formatServerDate(item.created_at) }
        ]}
        renderAddForm={({ onCancel, onCreated }) => <AddSocialHxForm patientId={patientId} tenantId={tenantId} onCancel={onCancel} onCreated={onCreated} />}
      />

      <ResourceListTab
        patientId={patientId}
        emptyLabel="Sin antecedentes fisiologicos registrados."
        addLabel="+ Agregar antecedente fisiologico"
        load={physiologicalHxApi.list}
        columns={[
          { label: "Grupo sanguineo", render: (item) => item.blood_type ?? "N/D" },
          {
            label: "Tabaquismo",
            render: (item) => (
              <Badge variant={item.smoking === "current" ? "destructive" : "neutral"}>{(item.smoking && SMOKING_LABEL[item.smoking]) ?? item.smoking ?? "N/D"}</Badge>
            )
          },
          {
            label: "Alcohol",
            render: (item) => <Badge variant={item.alcohol === "daily" ? "destructive" : "neutral"}>{(item.alcohol && ALCOHOL_LABEL[item.alcohol]) ?? item.alcohol ?? "N/D"}</Badge>
          },
          { label: "Drogas", render: (item) => item.drugs ?? "N/D" }
        ]}
        renderAddForm={({ onCancel, onCreated }) => <AddPhysiologicalHxForm patientId={patientId} tenantId={tenantId} onCancel={onCancel} onCreated={onCreated} />}
      />
    </div>
  );
}

export function PediatriaPanel({ patientId }: { patientId: string }) {
  const perinatal = useResourceList<PatientPerinatalHx>(patientId, perinatalHxApi.list);
  const development = useResourceList<PatientDevelopmentHx>(patientId, developmentHxApi.list);

  if (perinatal.loading || development.loading) {
    return <Skeleton className="h-40 w-full" />;
  }
  const anyError = perinatal.error || development.error;
  if (anyError) {
    return (
      <Alert>
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>{anyError}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              perinatal.reload();
              development.reload();
            }}
          >
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const latest = perinatal.items[0];
  const latestDev = development.items[0];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-sm font-bold text-slate-900">Antecedentes perinatales</p>
          {!latest ? (
            <p className="text-sm text-slate-400">Sin registros perinatales todavia.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <InfoField label="Tipo de parto" value={latest.delivery_route} />
              <InfoField label="Semanas de gestacion" value={latest.gestational_weeks} />
              <InfoField label="Peso al nacer" value={latest.birth_weight} />
              <InfoField label="APGAR 1min / 5min" value={latest.apgar_1min != null ? `${latest.apgar_1min} / ${latest.apgar_5min ?? "-"}` : null} />
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-sm font-bold text-slate-900">Antecedentes del desarrollo</p>
          {!latestDev ? (
            <p className="text-sm text-slate-400">Sin registros de desarrollo todavia.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <InfoField label="Edad al caminar (meses)" value={latestDev.walking_age_months} />
              <InfoField label="Primeras palabras (meses)" value={latestDev.first_words_age_months} />
              <InfoField label="Control de esfinteres (meses)" value={latestDev.toilet_training_age_months} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function GinecoPanel({ patientId }: { patientId: string }) {
  const gineco = useResourceList<PatientGynecologicalHx>(patientId, gynecologicalHxApi.list);

  if (gineco.loading) {
    return <Skeleton className="h-40 w-full" />;
  }
  if (gineco.error) {
    return (
      <Alert>
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>{gineco.error}</span>
          <Button type="button" size="sm" variant="outline" onClick={gineco.reload}>
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const latest = gineco.items[0];

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <p className="text-sm font-bold text-slate-900">Antecedentes gineco-obstetricos</p>
        {!latest ? (
          <p className="text-sm text-slate-400">Sin registros todavia.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <InfoField label="Menarca" value={latest.menarche_age ? `${latest.menarche_age} anos` : null} />
            <InfoField
              label="Gestas / Partos / Abortos"
              value={latest.pregnancies != null ? `${latest.pregnancies} / ${latest.deliveries ?? 0} / ${latest.abortions ?? 0}` : null}
            />
            <InfoField label="FUM" value={latest.last_menstrual_period} />
            <InfoField label="Metodo anticonceptivo" value={latest.contraceptive_method} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
