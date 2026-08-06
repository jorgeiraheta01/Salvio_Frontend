"use client";

import { useEffect, useState } from "react";
import { FileSignature } from "lucide-react";

import {
  createClinicalProblem,
  createClinicalProcedure,
  createClinicalRecord,
  createClinicalScale,
  createCorrectionNote,
  createPhysicalExamFinding,
  createRecordNote,
  createRecordPlan,
  createRecordVitalSign,
  createReviewOfSystem,
  deleteClinicalRecord,
  getClinicalRecord,
  listClinicalProblems,
  listClinicalProcedures,
  listClinicalScales,
  listPhysicalExamFindings,
  listRecordDiagnoses,
  listRecordNotes,
  listRecordPlans,
  listRecordVitalSigns,
  listReviewOfSystems,
  signClinicalRecord,
  updateClinicalRecord,
  type ClinicalProblem,
  type ClinicalProcedure,
  type ClinicalRecord,
  type ClinicalScaleResult,
  type PhysicalExamFinding,
  type RecordDiagnosisRef,
  type RecordNote,
  type RecordPlan,
  type RecordVitalSign,
  type ReviewOfSystem
} from "@/modules/clinical/api/records.api";
import { useClinicalStore } from "@/modules/clinical/store/clinicalStore";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";

type Props = {
  encounterId: string;
  patientId: string;
  tenantId: string;
  doctorId: string;
  doctorName: string;
  appointmentId?: string;
};

const STATUS_LABEL: Record<string, string> = { draft: "Borrador", signed: "Firmada", amended: "Enmendada" };

function AddRow({
  fields,
  onAdd,
  disabled
}: {
  fields: { key: string; placeholder: string; type?: string }[];
  onAdd: (values: Record<string, string>) => Promise<void>;
  disabled?: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    const requiredKey = fields[0].key;
    if (!values[requiredKey]?.trim()) {
      setError("Completa el campo requerido.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onAdd(values);
      setValues({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  if (disabled) return null;

  return (
    <div className="space-y-2">
      <div className={`grid gap-2 ${fields.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {fields.map((field) => (
          <Input
            key={field.key}
            type={field.type ?? "text"}
            value={values[field.key] ?? ""}
            onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
            placeholder={field.placeholder}
          />
        ))}
      </div>
      {error ? (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="button" size="sm" variant="outline" onClick={submit} disabled={saving}>
        {saving ? "Guardando..." : "Agregar"}
      </Button>
    </div>
  );
}

export function StructuredRecordPanel({ encounterId, patientId, tenantId, doctorId, doctorName, appointmentId }: Props) {
  const draft = useClinicalStore((state) => state.drafts[encounterId]);
  const hydrateDraft = useClinicalStore((state) => state.hydrateDraft);
  // zustand persist rehydrates from localStorage asynchronously after mount. On a
  // fresh page load, `draft` reads as undefined for a moment even when a
  // clinicalRecordId was already persisted, which would otherwise race ahead and
  // create a duplicate clinical-records row. Wait for hydration before loading.
  const [storeHydrated, setStoreHydrated] = useState(() => useClinicalStore.persist.hasHydrated());
  const [reloadTick, setReloadTick] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (storeHydrated) return;
    const unsub = useClinicalStore.persist.onFinishHydration(() => setStoreHydrated(true));
    if (useClinicalStore.persist.hasHydrated()) setStoreHydrated(true);
    return unsub;
  }, [storeHydrated]);

  const [record, setRecord] = useState<ClinicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [recordError, setRecordError] = useState<string | null>(null);

  const [soap, setSoap] = useState({ subjective: "", objective: "", assessment: "", plan: "" });
  const [savingSoap, setSavingSoap] = useState(false);
  const [soapSaved, setSoapSaved] = useState(false);

  const [diagnosesRef, setDiagnosesRef] = useState<RecordDiagnosisRef[]>([]);
  const [recordVitals, setRecordVitals] = useState<RecordVitalSign[]>([]);
  const [problems, setProblems] = useState<ClinicalProblem[]>([]);
  const [findings, setFindings] = useState<PhysicalExamFinding[]>([]);
  const [ros, setRos] = useState<ReviewOfSystem[]>([]);
  const [plans, setPlans] = useState<RecordPlan[]>([]);
  const [procedures, setProcedures] = useState<ClinicalProcedure[]>([]);
  const [notes, setNotes] = useState<RecordNote[]>([]);
  const [scales, setScales] = useState<ClinicalScaleResult[]>([]);

  const [signature, setSignature] = useState("");
  const [signError, setSignError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);

  const [correctionText, setCorrectionText] = useState("");
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const [savingCorrection, setSavingCorrection] = useState(false);
  const [correctionSaved, setCorrectionSaved] = useState(false);

  useEffect(() => {
    if (!storeHydrated) return;
    let mounted = true;
    async function load() {
      setLoading(true);
      setRecordError(null);
      try {
        let recordId = draft?.clinicalRecordId;
        let current: ClinicalRecord;
        if (recordId) {
          current = await getClinicalRecord(recordId);
        } else {
          current = await createClinicalRecord({ patient_id: patientId, tenant_id: tenantId, doctor_id: doctorId, doctor_name: doctorName, appointment_id: appointmentId });
          recordId = current.id;
          hydrateDraft(encounterId, { clinicalRecordId: recordId });
        }
        if (!mounted) return;
        setRecord(current);
        setSoap({
          subjective: current.soap_subjective ?? "",
          objective: current.soap_objective ?? "",
          assessment: current.soap_assessment ?? "",
          plan: current.soap_plan ?? ""
        });
        const [diagData, vitalData, problemData, findingData, rosData, planData, procData, noteData, scaleData] = await Promise.all([
          listRecordDiagnoses(recordId).catch(() => []),
          listRecordVitalSigns(recordId).catch(() => []),
          listClinicalProblems(recordId).catch(() => []),
          listPhysicalExamFindings(recordId).catch(() => []),
          listReviewOfSystems(recordId).catch(() => []),
          listRecordPlans(recordId).catch(() => []),
          listClinicalProcedures(recordId).catch(() => []),
          listRecordNotes(recordId).catch(() => []),
          listClinicalScales(recordId).catch(() => [])
        ]);
        if (!mounted) return;
        setDiagnosesRef(diagData);
        setRecordVitals(vitalData);
        setProblems(problemData);
        setFindings(findingData);
        setRos(rosData);
        setPlans(planData);
        setProcedures(procData);
        setNotes(noteData);
        setScales(scaleData);
      } catch (err) {
        if (mounted) setRecordError(err instanceof Error ? err.message : "No se pudo cargar la nota clinica estructurada.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeHydrated, reloadTick]);

  async function onSaveSoap() {
    if (!record) return;
    setSavingSoap(true);
    setSoapSaved(false);
    try {
      const updated = await updateClinicalRecord(record.id, {
        soap_subjective: soap.subjective,
        soap_objective: soap.objective,
        soap_assessment: soap.assessment,
        soap_plan: soap.plan
      });
      setRecord(updated);
      setSoapSaved(true);
    } finally {
      setSavingSoap(false);
    }
  }

  async function onSign() {
    if (!record) return;
    if (signature.trim().length < 16) {
      setSignError("La firma digital debe tener al menos 16 caracteres.");
      return;
    }
    const hasPrimaryDiagnosis = diagnosesRef.some((item) => item.is_primary_diagnosis);
    if (!hasPrimaryDiagnosis) {
      setSignError("La nota necesita un diagnostico primario vinculado (ver seccion de arriba) antes de firmar.");
      return;
    }
    setSigning(true);
    setSignError(null);
    try {
      const signed = await signClinicalRecord(record.id, {
        digital_signature: signature.trim(),
        signed_by: doctorId,
        has_primary_diagnosis: hasPrimaryDiagnosis
      });
      setRecord(signed);
    } catch (err) {
      setSignError(err instanceof Error ? err.message : "No se pudo firmar la nota.");
    } finally {
      setSigning(false);
    }
  }

  async function onAddCorrection() {
    if (!record) return;
    if (correctionText.trim().length === 0) {
      setCorrectionError("Escribe la nota de correccion.");
      return;
    }
    setSavingCorrection(true);
    setCorrectionError(null);
    try {
      await createCorrectionNote(record.id, { note_text: correctionText.trim(), created_by: doctorId });
      setCorrectionText("");
      setCorrectionSaved(true);
    } catch (err) {
      setCorrectionError(err instanceof Error ? err.message : "No se pudo guardar la nota de correccion.");
    } finally {
      setSavingCorrection(false);
    }
  }

  async function onDeleteDraft() {
    if (!record) return;
    if (!window.confirm("Esto elimina el borrador de la nota SOAP y todo lo registrado en ella. No se puede deshacer. Continuar?")) {
      return;
    }
    setDeleting(true);
    try {
      await deleteClinicalRecord(record.id);
      hydrateDraft(encounterId, { clinicalRecordId: undefined });
      setRecord(null);
      setReloadTick((tick) => tick + 1);
    } catch (err) {
      setRecordError(err instanceof Error ? err.message : "No se pudo eliminar el borrador.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (recordError || !record) {
    return (
      <Alert>
        <AlertDescription>{recordError ?? "No se pudo cargar la nota clinica."}</AlertDescription>
      </Alert>
    );
  }

  const isSigned = record.status === "signed" || record.status === "amended";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Nota SOAP estructurada</CardTitle>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{STATUS_LABEL[record.status] ?? record.status}</span>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Subjetivo</Label>
            <Input value={soap.subjective} onChange={(e) => setSoap((prev) => ({ ...prev, subjective: e.target.value }))} disabled={isSigned} />
          </div>
          <div className="space-y-1.5">
            <Label>Objetivo</Label>
            <Input value={soap.objective} onChange={(e) => setSoap((prev) => ({ ...prev, objective: e.target.value }))} disabled={isSigned} />
          </div>
          <div className="space-y-1.5">
            <Label>Analisis (Assessment)</Label>
            <Input value={soap.assessment} onChange={(e) => setSoap((prev) => ({ ...prev, assessment: e.target.value }))} disabled={isSigned} />
          </div>
          <div className="space-y-1.5">
            <Label>Plan</Label>
            <Input value={soap.plan} onChange={(e) => setSoap((prev) => ({ ...prev, plan: e.target.value }))} disabled={isSigned} />
          </div>
          {!isSigned ? (
            <Button type="button" size="sm" onClick={onSaveSoap} disabled={savingSoap}>
              {savingSoap ? "Guardando..." : soapSaved ? "Guardado" : "Guardar SOAP"}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Diagnosticos vinculados al encuentro</CardTitle>
        </CardHeader>
        <CardContent>
          {diagnosesRef.length === 0 ? (
            <p className="text-sm text-slate-400">
              Sin diagnosticos vinculados todavia. Agrega uno en la pestana Diagnosticos — si esta nota ya existia cuando lo
              registraste, quedara vinculado automaticamente y aparecera aqui.
            </p>
          ) : (
            <ul className="list-inside list-disc text-sm text-slate-700">
              {diagnosesRef.map((item) => (
                <li key={item.id}>
                  {item.cie10_code} - {item.cie10_description}
                  {item.is_primary_diagnosis ? " (primario)" : ""}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Signos vitales de la nota</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recordVitals.map((item) => (
            <p key={item.id} className="text-sm text-slate-700">
              PA {item.bp_systolic ?? "-"}/{item.bp_diastolic ?? "-"} · FC {item.heart_rate ?? "-"} · FR {item.resp_rate ?? "-"} · Temp{" "}
              {item.temperature ?? "-"} · SpO2 {item.spo2 ?? "-"}
            </p>
          ))}
          <AddRow
            disabled={isSigned}
            fields={[
              { key: "bp_systolic", placeholder: "PA sistolica", type: "number" },
              { key: "bp_diastolic", placeholder: "PA diastolica", type: "number" },
              { key: "heart_rate", placeholder: "FC (lpm)", type: "number" },
              { key: "resp_rate", placeholder: "FR (rpm)", type: "number" },
              { key: "temperature", placeholder: "Temperatura (C)", type: "number" },
              { key: "spo2", placeholder: "SpO2 (%)", type: "number" }
            ]}
            onAdd={async (values) => {
              const created = await createRecordVitalSign(record.id, patientId, tenantId, {
                bp_systolic: values.bp_systolic ? Number(values.bp_systolic) : undefined,
                bp_diastolic: values.bp_diastolic ? Number(values.bp_diastolic) : undefined,
                heart_rate: values.heart_rate ? Number(values.heart_rate) : undefined,
                resp_rate: values.resp_rate ? Number(values.resp_rate) : undefined,
                temperature: values.temperature ? Number(values.temperature) : undefined,
                spo2: values.spo2 ? Number(values.spo2) : undefined
              });
              setRecordVitals((prev) => [...prev, created]);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Problemas clinicos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {problems.map((item) => (
            <p key={item.id} className="text-sm text-slate-700">
              {item.problem_name} {item.notes ? `- ${item.notes}` : ""}
            </p>
          ))}
          <AddRow
            disabled={isSigned}
            fields={[
              { key: "problem_name", placeholder: "Problema" },
              { key: "notes", placeholder: "Notas" }
            ]}
            onAdd={async (values) => {
              const created = await createClinicalProblem(record.id, tenantId, { problem_name: values.problem_name, notes: values.notes || undefined });
              setProblems((prev) => [...prev, created]);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Hallazgos de examen fisico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {findings.map((item) => (
            <p key={item.id} className="text-sm text-slate-700">
              {item.system_name} {item.findings ? `- ${item.findings}` : ""}
            </p>
          ))}
          <AddRow
            disabled={isSigned}
            fields={[
              { key: "system_name", placeholder: "Sistema (ej. cardiovascular)" },
              { key: "findings", placeholder: "Hallazgos" }
            ]}
            onAdd={async (values) => {
              const created = await createPhysicalExamFinding(record.id, tenantId, { system_name: values.system_name, findings: values.findings || undefined });
              setFindings((prev) => [...prev, created]);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Revision por sistemas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ros.map((item) => (
            <p key={item.id} className="text-sm text-slate-700">
              {item.system_name} {item.comments ? `- ${item.comments}` : ""}
            </p>
          ))}
          <AddRow
            disabled={isSigned}
            fields={[
              { key: "system_name", placeholder: "Sistema" },
              { key: "comments", placeholder: "Comentarios" }
            ]}
            onAdd={async (values) => {
              const created = await createReviewOfSystem(record.id, tenantId, { system_name: values.system_name, comments: values.comments || undefined });
              setRos((prev) => [...prev, created]);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Planes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {plans.map((item) => (
            <p key={item.id} className="text-sm text-slate-700">
              {item.plan_type ?? "Plan"} {item.description ? `- ${item.description}` : ""}
            </p>
          ))}
          <AddRow
            disabled={isSigned}
            fields={[
              { key: "plan_type", placeholder: "Tipo de plan" },
              { key: "description", placeholder: "Descripcion" }
            ]}
            onAdd={async (values) => {
              const created = await createRecordPlan(record.id, tenantId, { plan_type: values.plan_type || undefined, description: values.description || undefined });
              setPlans((prev) => [...prev, created]);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Procedimientos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {procedures.map((item) => (
            <p key={item.id} className="text-sm text-slate-700">
              {item.procedure_name} {item.notes ? `- ${item.notes}` : ""}
            </p>
          ))}
          <AddRow
            disabled={isSigned}
            fields={[
              { key: "procedure_name", placeholder: "Procedimiento" },
              { key: "notes", placeholder: "Notas" }
            ]}
            onAdd={async (values) => {
              const created = await createClinicalProcedure(record.id, patientId, tenantId, {
                procedure_name: values.procedure_name,
                notes: values.notes || undefined,
                performed_by_name: doctorName
              });
              setProcedures((prev) => [...prev, created]);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Notas de la nota clinica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {notes.map((item) => (
            <p key={item.id} className="text-sm text-slate-700">
              {item.note_type} - {item.content}
            </p>
          ))}
          <AddRow
            disabled={isSigned}
            fields={[
              { key: "note_type", placeholder: "Tipo (ej. evolucion)" },
              { key: "content", placeholder: "Contenido" }
            ]}
            onAdd={async (values) => {
              const created = await createRecordNote(record.id, patientId, tenantId, { note_type: values.note_type, content: values.content ?? "" });
              setNotes((prev) => [...prev, created]);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Escalas clinicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {scales.map((item) => (
            <p key={item.id} className="text-sm text-slate-700">
              {item.scale_name} {item.total_score != null ? `- ${item.total_score}` : ""} {item.risk_level ? `(${item.risk_level})` : ""}
            </p>
          ))}
          <AddRow
            disabled={isSigned}
            fields={[
              { key: "scale_name", placeholder: "Escala (ej. Glasgow, EVA)" },
              { key: "total_score", placeholder: "Puntaje", type: "number" },
              { key: "risk_level", placeholder: "Nivel de riesgo" }
            ]}
            onAdd={async (values) => {
              const created = await createClinicalScale(record.id, patientId, tenantId, {
                scale_name: values.scale_name,
                total_score: values.total_score ? Number(values.total_score) : undefined,
                risk_level: values.risk_level || undefined
              });
              setScales((prev) => [...prev, created]);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <FileSignature className="h-4 w-4 text-brand" />
          <CardTitle className="text-sm">Firma de la nota</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isSigned ? (
            <p className="text-sm text-emerald-700">Nota firmada el {record.signed_at ? new Date(record.signed_at).toLocaleString("es-SV") : ""}.</p>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Firma digital (minimo 16 caracteres)</Label>
                <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Frase o codigo de firma unica" />
              </div>
              {signError ? (
                <Alert>
                  <AlertDescription>{signError}</AlertDescription>
                </Alert>
              ) : null}
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={onSign} disabled={signing}>
                  {signing ? "Firmando..." : "Firmar nota"}
                </Button>
                <Button type="button" size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={onDeleteDraft} disabled={deleting}>
                  {deleting ? "Eliminando..." : "Eliminar borrador"}
                </Button>
              </div>
            </>
          )}
          {isSigned ? (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Nota de correccion</p>
              <Input value={correctionText} onChange={(e) => setCorrectionText(e.target.value)} placeholder="Correccion o enmienda a la nota firmada..." />
              {correctionError ? (
                <Alert>
                  <AlertDescription>{correctionError}</AlertDescription>
                </Alert>
              ) : null}
              <Button type="button" size="sm" variant="outline" onClick={onAddCorrection} disabled={savingCorrection}>
                {savingCorrection ? "Guardando..." : correctionSaved ? "Registrada" : "Agregar nota de correccion"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
