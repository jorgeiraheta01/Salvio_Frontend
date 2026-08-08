"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarPlus, CheckCircle2, Pencil, Plus, Send, Trash2 } from "lucide-react";

import {
  closeClinicalNote,
  closeEncounter,
  createAppointment,
  createClinicalNote,
  createDiagnosis,
  createOrder,
  createPatientMedication,
  createPrescription,
  createVitalSign,
  deleteDiagnosis,
  overrideAllergy,
  searchCie10,
  updateClinicalNote,
  updateDiagnosis,
  getEncounter,
  listClinicalNotes,
  listDiagnoses,
  listOrders,
  listPrescriptions,
  listVitalSigns,
  type AllergyAlert,
  type Cie10CatalogItem,
  type ClinicalOrder,
  type Diagnosis,
  type DiagnosisSeverity,
  type DiagnosisStatus,
  type EncounterSummary,
  type Prescription,
  type VitalSign
} from "@/modules/clinical/api/clinical.api";
import { StructuredRecordPanel } from "@/modules/clinical/components/structured-record-panel";
import { useClinicalStore } from "@/modules/clinical/store/clinicalStore";
import { useCurrentUser } from "@/core/auth/current-user";
import { APPOINTMENT_TYPES } from "@/modules/appointments/appointment-status";
import { cn } from "@/shared/utils/cn";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { DiagnosisTimeline } from "@/modules/clinical/components/diagnosis-timeline";
import { ReferPatientModal } from "@/modules/clinical/components/refer-patient-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Modal } from "@/shared/components/ui/modal";
import { Select } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";

const tabs = ["Contexto", "Historia", "Diagnosticos", "Complementos", "Nota SOAP", "Resumen"] as const;

type TabKey = (typeof tabs)[number];

const DIAGNOSIS_TYPE_LABEL: Record<Diagnosis["type"], string> = {
  presumptive: "Presuntivo",
  definitive: "Definitivo",
  ruled_out: "Descartado"
};

const DIAGNOSIS_CLASSIFICATION_LABEL: Record<Diagnosis["classification"], string> = {
  primary: "Primario",
  secondary: "Secundario",
  background: "Antecedente"
};

const DIAGNOSIS_STATUS_LABEL: Record<DiagnosisStatus, string> = {
  active: "Activo",
  resolved: "Resuelto",
  chronic: "Cronico",
  recurrent: "Recurrente"
};

const DIAGNOSIS_STATUS_STYLE: Record<DiagnosisStatus, string> = {
  active: "bg-amber-50 text-amber-700",
  resolved: "bg-emerald-50 text-emerald-700",
  chronic: "bg-sky-50 text-sky-700",
  recurrent: "bg-purple-50 text-purple-700"
};

const DIAGNOSIS_SEVERITY_LABEL: Record<DiagnosisSeverity, string> = {
  mild: "Leve",
  moderate: "Moderada",
  severe: "Severa"
};

const DIAGNOSIS_SEVERITY_STYLE: Record<DiagnosisSeverity, string> = {
  mild: "bg-slate-100 text-slate-600",
  moderate: "bg-orange-50 text-orange-700",
  severe: "bg-red-50 text-red-700"
};

const ENCOUNTER_STATUS_LABEL: Record<EncounterSummary["status"], string> = {
  active: "Activo",
  completed: "Completado",
  closed: "Cerrado"
};

function nextDefaultClassification(diagnoses: Diagnosis[]): Diagnosis["classification"] {
  return diagnoses.some((item) => item.classification === "primary") ? "secondary" : "primary";
}

function defaultFollowUpDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 8);
  date.setSeconds(0, 0);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EncounterScreen({ encounterId }: { encounterId: string }) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const [activeTab, setActiveTab] = useState<TabKey>("Contexto");
  const [encounter, setEncounter] = useState<EncounterSummary | null>(null);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [referModalOpen, setReferModalOpen] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [diagQuickText, setDiagQuickText] = useState("");
  const [diagQuickNotes, setDiagQuickNotes] = useState("");
  const [quickDiagnosisError, setQuickDiagnosisError] = useState<string | null>(null);
  const [diagShowCie10Search, setDiagShowCie10Search] = useState(false);
  const [diagCie10Query, setDiagCie10Query] = useState("");
  const [diagCie10Results, setDiagCie10Results] = useState<Cie10CatalogItem[]>([]);
  const [diagSearching, setDiagSearching] = useState(false);
  const [diagModalOpen, setDiagModalOpen] = useState(false);
  const [diagModalMode, setDiagModalMode] = useState<"create" | "edit">("create");
  const [diagModalCode, setDiagModalCode] = useState<{ code: string; description: string } | null>(null);
  const [diagIsFreeText, setDiagIsFreeText] = useState(false);
  const [diagEditingId, setDiagEditingId] = useState<string | null>(null);
  const [diagDetailForm, setDiagDetailForm] = useState({
    type: "definitive" as Diagnosis["type"],
    classification: "primary" as Diagnosis["classification"],
    status: "active" as DiagnosisStatus,
    severity: "" as DiagnosisSeverity | "",
    notes: ""
  });
  const [diagDeleteTarget, setDiagDeleteTarget] = useState<Diagnosis | null>(null);
  const diagSearchInputRef = useRef<HTMLInputElement>(null);
  const [diagnosisError, setDiagnosisError] = useState<string | null>(null);
  const [savingDiagnosis, setSavingDiagnosis] = useState(false);
  const [prescriptionForm, setPrescriptionForm] = useState({
    medication_name: "",
    dose: "",
    frequency: "",
    route: ""
  });
  const [prescriptionError, setPrescriptionError] = useState<string | null>(null);
  const [savingPrescription, setSavingPrescription] = useState(false);
  const [pendingAllergyAlerts, setPendingAllergyAlerts] = useState<AllergyAlert[]>([]);
  const [pendingPrescriptionId, setPendingPrescriptionId] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [submittingOverride, setSubmittingOverride] = useState(false);

  const [vitalSigns, setVitalSigns] = useState<VitalSign[]>([]);
  const [vitalSignForm, setVitalSignForm] = useState({
    bp_systolic: "",
    bp_diastolic: "",
    heart_rate: "",
    resp_rate: "",
    temperature: "",
    spo2: "",
    weight: "",
    height: ""
  });
  const [vitalSignError, setVitalSignError] = useState<string | null>(null);
  const [savingVitalSign, setSavingVitalSign] = useState(false);

  const [orders, setOrders] = useState<ClinicalOrder[]>([]);
  const [orderForm, setOrderForm] = useState({ order_type: "", description: "" });
  const [orderError, setOrderError] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const [followUpDate, setFollowUpDate] = useState(defaultFollowUpDate);
  const [followUpType, setFollowUpType] = useState<string>("Control");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false);
  const [followUpError, setFollowUpError] = useState<string | null>(null);
  const [followUpCreated, setFollowUpCreated] = useState(false);

  const draft = useClinicalStore((state) => state.drafts[encounterId]);
  const hydrateDraft = useClinicalStore((state) => state.hydrateDraft);
  const setHistory = useClinicalStore((state) => state.setHistory);
  const setSaveState = useClinicalStore((state) => state.setSaveState);

  const saveStateText = useMemo(() => {
    const current = draft?.saveState ?? "idle";
    if (current === "saving") return "Guardando...";
    if (current === "saved") return "Guardado";
    if (current === "error") return draft?.saveMessage ?? "Error al guardar";
    return "Sin cambios";
  }, [draft?.saveState, draft?.saveMessage]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const [encounterData, notesData, diagnosesData, prescriptionsData, vitalSignsData, ordersData] = await Promise.all([
          getEncounter(encounterId),
          listClinicalNotes(encounterId),
          listDiagnoses(encounterId),
          listPrescriptions(encounterId).catch(() => []),
          listVitalSigns(encounterId).catch(() => []),
          listOrders(encounterId).catch(() => [])
        ]);
        if (!mounted) return;
        setEncounter(encounterData);
        setDiagnoses(diagnosesData);
        setPrescriptions(prescriptionsData);
        setVitalSigns(vitalSignsData);
        setOrders(ordersData);
        const openNote = notesData.find((note) => !note.is_closed) ?? notesData[0];
        hydrateDraft(encounterId, {
          history: openNote?.content ?? "",
          noteId: openNote?.id,
          noteVersion: openNote?.version,
          noteClosed: Boolean(openNote?.is_closed),
          saveState: "idle"
        });
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [encounterId, hydrateDraft]);

  useEffect(() => {
    if (!draft) return;
    if ((draft.history ?? "").trim().length === 0) return;

    const timeoutId = window.setTimeout(async () => {
      try {
        setSaveState(encounterId, "saving");
        if (draft.noteId && draft.noteVersion && !draft.noteClosed) {
          const updated = await createOrUpdateNote("update");
          hydrateDraft(encounterId, {
            noteId: updated.id,
            noteVersion: updated.version,
            noteClosed: updated.is_closed,
            saveState: "saved"
          });
          return;
        }
        const created = await createOrUpdateNote("create");
        hydrateDraft(encounterId, {
          noteId: created.id,
          noteVersion: created.version,
          noteClosed: created.is_closed,
          saveState: "saved"
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo guardar automaticamente.";
        setSaveState(encounterId, "error", message);
      }
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [draft?.history]);

  async function createOrUpdateNote(mode: "create" | "update") {
    if (!draft || !draft.history.trim()) {
      throw new Error("Sin contenido para guardar.");
    }
    if (mode === "update" && draft.noteId && draft.noteVersion) {
      return updateClinicalNote(draft.noteId, {
        content: draft.history,
        version: draft.noteVersion
      });
    }
    return createClinicalNote({
      encounter_id: encounterId,
      content: draft.history,
      note_type: "progress"
    });
  }

  useEffect(() => {
    if (activeTab !== "Diagnosticos") return;
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setDiagShowCie10Search(true);
        window.setTimeout(() => diagSearchInputRef.current?.focus(), 0);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeTab]);

  useEffect(() => {
    const query = diagCie10Query.trim();
    if (query.length < 2) {
      setDiagCie10Results([]);
      setDiagSearching(false);
      return;
    }
    setDiagSearching(true);
    const timeoutId = window.setTimeout(async () => {
      try {
        const results = await searchCie10(query);
        setDiagCie10Results(results);
      } catch {
        setDiagCie10Results([]);
      } finally {
        setDiagSearching(false);
      }
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [diagCie10Query]);

  function openCreateDiagnosisModal(item: Cie10CatalogItem) {
    setDiagModalMode("create");
    setDiagModalCode({ code: item.code, description: item.description });
    setDiagIsFreeText(false);
    setDiagEditingId(null);
    setDiagDetailForm({
      type: "definitive",
      classification: nextDefaultClassification(diagnoses),
      status: "active",
      severity: "",
      notes: ""
    });
    setDiagnosisError(null);
    setDiagModalOpen(true);
    setDiagCie10Query("");
    setDiagCie10Results([]);
  }

  function openEditDiagnosisModal(item: Diagnosis) {
    setDiagModalMode("edit");
    setDiagModalCode({ code: item.code, description: item.description });
    setDiagIsFreeText(item.code === "LIBRE");
    setDiagEditingId(item.id);
    setDiagDetailForm({
      type: item.type,
      classification: item.classification,
      status: item.status,
      severity: item.severity ?? "",
      notes: item.notes ?? ""
    });
    setDiagnosisError(null);
    setDiagModalOpen(true);
  }

  function closeDiagnosisModal() {
    setDiagModalOpen(false);
    setDiagModalCode(null);
    setDiagIsFreeText(false);
    setDiagEditingId(null);
  }

  async function onSaveQuickDiagnosis() {
    const text = diagQuickText.trim();
    if (!text) return;
    setSavingDiagnosis(true);
    setQuickDiagnosisError(null);
    try {
      const created = await createDiagnosis({
        encounter_id: encounterId,
        clinical_record_id: draft?.clinicalRecordId,
        code: "LIBRE",
        description: text,
        type: "definitive",
        classification: nextDefaultClassification(diagnoses),
        status: "active",
        severity: null,
        is_first_time: true,
        notes: diagQuickNotes.trim() || null
      });
      setDiagnoses((prev) => [...prev, created]);
      setDiagQuickText("");
      setDiagQuickNotes("");
    } catch (error) {
      setQuickDiagnosisError(error instanceof Error ? error.message : "No se pudo guardar el diagnostico.");
    } finally {
      setSavingDiagnosis(false);
    }
  }

  async function onSaveDiagnosisModal() {
    if (!diagModalCode) return;
    setSavingDiagnosis(true);
    setDiagnosisError(null);
    try {
      if (diagModalMode === "create") {
        const created = await createDiagnosis({
          encounter_id: encounterId,
          clinical_record_id: draft?.clinicalRecordId,
          code: diagModalCode.code,
          description: diagModalCode.description,
          type: diagDetailForm.type,
          classification: diagDetailForm.classification,
          status: diagDetailForm.status,
          severity: diagDetailForm.severity || null,
          is_first_time: true,
          notes: diagDetailForm.notes.trim() || null
        });
        setDiagnoses((prev) => [...prev, created]);
      } else if (diagEditingId) {
        const updated = await updateDiagnosis(diagEditingId, {
          type: diagDetailForm.type,
          classification: diagDetailForm.classification,
          status: diagDetailForm.status,
          severity: diagDetailForm.severity || null,
          notes: diagDetailForm.notes.trim() || null
        });
        setDiagnoses((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
      }
      closeDiagnosisModal();
    } catch (error) {
      setDiagnosisError(error instanceof Error ? error.message : "No se pudo guardar el diagnostico.");
    } finally {
      setSavingDiagnosis(false);
    }
  }

  async function onDeleteDiagnosis() {
    if (!diagDeleteTarget) return;
    await deleteDiagnosis(diagDeleteTarget.id);
    setDiagnoses((prev) => prev.filter((entry) => entry.id !== diagDeleteTarget.id));
    setDiagDeleteTarget(null);
  }

  async function onCreatePrescription() {
    if (!prescriptionForm.medication_name || !prescriptionForm.dose || !prescriptionForm.frequency || !prescriptionForm.route) {
      setPrescriptionError("Completa medicamento, dosis, frecuencia y via.");
      return;
    }
    setSavingPrescription(true);
    setPrescriptionError(null);
    try {
      const result = await createPrescription({
        encounter_id: encounterId,
        medications: [prescriptionForm]
      });
      if (result.allergy_alerts.length > 0 && result.id) {
        setPendingAllergyAlerts(result.allergy_alerts);
        setPendingPrescriptionId(result.id);
      }
      if (encounter && currentUser) {
        await createPatientMedication(encounter.patient.id, {
          tenant_id: currentUser.tenantId,
          medication_name: prescriptionForm.medication_name,
          dose: prescriptionForm.dose,
          frequency: prescriptionForm.frequency,
          prescribed_by: currentUser.id,
          prescribed_by_name: encounter.doctor.full_name
        }).catch(() => {
          // El registro de medicamentos del perfil es un espejo best-effort de la
          // prescripcion; si falla no debe bloquear el flujo de consulta.
        });
      }
      const [refreshedEncounter, refreshedPrescriptions] = await Promise.all([
        getEncounter(encounterId),
        listPrescriptions(encounterId).catch(() => prescriptions)
      ]);
      setEncounter(refreshedEncounter);
      setPrescriptions(refreshedPrescriptions);
      setPrescriptionForm({ medication_name: "", dose: "", frequency: "", route: "" });
    } catch (error) {
      setPrescriptionError(error instanceof Error ? error.message : "No se pudo guardar la prescripcion.");
    } finally {
      setSavingPrescription(false);
    }
  }

  async function onOverrideAllergy() {
    if (!pendingPrescriptionId || !currentUser) return;
    if (overrideReason.trim().length < 10) {
      setOverrideError("La justificacion debe tener al menos 10 caracteres.");
      return;
    }
    setSubmittingOverride(true);
    setOverrideError(null);
    try {
      await overrideAllergy(pendingPrescriptionId, {
        medication: pendingAllergyAlerts[0]?.medication ?? "",
        override_reason: overrideReason.trim(),
        overridden_by: currentUser.id
      });
      setPendingAllergyAlerts([]);
      setPendingPrescriptionId(null);
      setOverrideReason("");
    } catch (error) {
      setOverrideError(error instanceof Error ? error.message : "No se pudo registrar la justificacion.");
    } finally {
      setSubmittingOverride(false);
    }
  }

  async function onAddVitalSign() {
    if (!encounter || !currentUser) return;
    if (Object.values(vitalSignForm).every((value) => !value.trim())) {
      setVitalSignError("Ingresa al menos un signo vital.");
      return;
    }
    const toNumber = (value: string) => (value.trim() ? Number(value.trim()) : undefined);
    const payload = {
      patient_id: encounter.patient.id,
      tenant_id: currentUser.tenantId,
      encounter_id: encounterId,
      recorded_by: currentUser.id,
      bp_systolic: toNumber(vitalSignForm.bp_systolic),
      bp_diastolic: toNumber(vitalSignForm.bp_diastolic),
      heart_rate: toNumber(vitalSignForm.heart_rate),
      resp_rate: toNumber(vitalSignForm.resp_rate),
      temperature: toNumber(vitalSignForm.temperature),
      spo2: toNumber(vitalSignForm.spo2),
      weight: toNumber(vitalSignForm.weight),
      height: toNumber(vitalSignForm.height)
    };
    setSavingVitalSign(true);
    setVitalSignError(null);
    try {
      const created = await createVitalSign(payload);
      setVitalSigns((prev) => [...prev, created]);
      setVitalSignForm({ bp_systolic: "", bp_diastolic: "", heart_rate: "", resp_rate: "", temperature: "", spo2: "", weight: "", height: "" });
    } catch (error) {
      setVitalSignError(error instanceof Error ? error.message : "No se pudo guardar los signos vitales.");
    } finally {
      setSavingVitalSign(false);
    }
  }

  async function onCreateOrder() {
    if (!orderForm.order_type.trim() || !orderForm.description.trim()) {
      setOrderError("Indica tipo y descripcion de la orden.");
      return;
    }
    setSavingOrder(true);
    setOrderError(null);
    try {
      const created = await createOrder({
        encounter_id: encounterId,
        order_type: orderForm.order_type.trim(),
        description: orderForm.description.trim()
      });
      setOrders((prev) => [...prev, created]);
      setOrderForm({ order_type: "", description: "" });
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : "No se pudo guardar la orden.");
    } finally {
      setSavingOrder(false);
    }
  }

  async function onCloseEncounter() {
    if (!encounter) return;
    setIsClosing(true);
    setCloseError(null);
    try {
      const noteId = draft?.noteId;
      const noteVersion = draft?.noteVersion;
      if (noteId && noteVersion && !draft?.noteClosed) {
        const closed = await closeClinicalNote(noteId, noteVersion);
        hydrateDraft(encounterId, { noteClosed: true, noteVersion: closed.version, saveState: "saved" });
      }
      const closedEncounter = await closeEncounter(encounterId, encounter.version);
      setEncounter(closedEncounter);
    } catch (error) {
      setCloseError(error instanceof Error ? error.message : "No se pudo cerrar la consulta.");
    } finally {
      setIsClosing(false);
    }
  }

  async function onCreateFollowUp() {
    if (!encounter || !currentUser) return;
    if (!followUpDate) {
      setFollowUpError("Selecciona fecha y hora del control.");
      return;
    }
    setFollowUpSubmitting(true);
    setFollowUpError(null);
    try {
      await createAppointment({
        patient_id: encounter.patient.id,
        tenant_id: currentUser.tenantId,
        doctor_id: encounter.doctor.id,
        scheduled_at: new Date(followUpDate).toISOString(),
        appointment_type: followUpType,
        notes: followUpNotes.trim() || undefined
      });
      setFollowUpCreated(true);
    } catch (error) {
      setFollowUpError(error instanceof Error ? error.message : "No se pudo agendar la cita de control.");
    } finally {
      setFollowUpSubmitting(false);
    }
  }

  if (isLoading || !encounter) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => router.push("/agenda")}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a la agenda
        </button>
        <p className="text-sm text-slate-500">Cargando encuentro clinico...</p>
      </div>
    );
  }

  const isClosed = encounter.status === "closed";

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => router.push("/agenda")}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a la agenda
      </button>

      <Card>
        <CardHeader>
          <CardTitle>Encuentro clinico</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <p><strong>Paciente:</strong> {encounter.patient.full_name}</p>
          <p><strong>Edad:</strong> {encounter.patient.age ?? "N/D"}</p>
          <p><strong>Documento:</strong> {encounter.patient.document ?? "N/D"}</p>
          <p><strong>Medico:</strong> {encounter.doctor.full_name}</p>
        </CardContent>
      </Card>

      {isClosed ? (
        <Card className="border-brand/30 bg-brand/5">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <CheckCircle2 className="h-4 w-4 text-brand" />
              Consulta cerrada
            </div>
            {followUpCreated ? (
              <Alert>
                <AlertDescription>Cita de control agendada correctamente.</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                <p className="flex items-center gap-1.5 text-sm text-slate-600">
                  <CalendarPlus className="h-4 w-4" />
                  Agendar cita de control para {encounter.patient.full_name}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Fecha y hora</Label>
                    <Input type="datetime-local" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo de cita</Label>
                    <Select value={followUpType} onChange={(e) => setFollowUpType(e.target.value)}>
                      {APPOINTMENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Notas (opcional)</Label>
                  <Input value={followUpNotes} onChange={(e) => setFollowUpNotes(e.target.value)} placeholder="Motivo del control..." />
                </div>
                {followUpError ? (
                  <Alert>
                    <AlertDescription>{followUpError}</AlertDescription>
                  </Alert>
                ) : null}
                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setReferModalOpen(true)}>
                    <Send className="mr-1.5 h-4 w-4" />
                    Referir con especialista
                  </Button>
                  <Button type="button" variant="outline" onClick={() => router.push("/agenda")}>
                    Omitir
                  </Button>
                  <Button type="button" onClick={onCreateFollowUp} disabled={followUpSubmitting}>
                    {followUpSubmitting ? "Agendando..." : "Agendar control"}
                  </Button>
                </div>
              </div>
            )}
            {followUpCreated ? (
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setReferModalOpen(true)}>
                  <Send className="mr-1.5 h-4 w-4" />
                  Referir con especialista
                </Button>
                <Button type="button" onClick={() => router.push("/agenda")}>
                  Ir a la agenda
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button key={tab} type="button" variant={activeTab === tab ? "default" : "outline"} size="sm" onClick={() => setActiveTab(tab)}>
            {tab}
          </Button>
        ))}
      </div>

      {activeTab === "Contexto" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Consultas previas de {encounter.patient.full_name} -- para dar contexto antes de documentar esta consulta, sin salir de esta pantalla.
          </p>
          <DiagnosisTimeline patientId={encounter.patient.id} />
        </div>
      )}

      {activeTab === "Historia" && (
        <Card>
          <CardHeader>
            <CardTitle>Historia clinica</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="min-h-[220px] w-full rounded-custom border border-slate-200 p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={draft?.history ?? ""}
              onChange={(event) => setHistory(encounterId, event.target.value)}
              placeholder="Documenta la evolucion clinica de la consulta..."
              disabled={isClosed}
            />
            <p className="mt-2 text-xs text-muted-foreground">{saveStateText}</p>
          </CardContent>
        </Card>
      )}

      {activeTab === "Diagnosticos" && (
        <Card>
          <CardHeader>
            <CardTitle>Diagnosticos del encuentro ({diagnoses.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isClosed ? (
              <div className="space-y-2">
                <Textarea
                  value={diagQuickText}
                  onChange={(e) => setDiagQuickText(e.target.value)}
                  placeholder="Escribe el diagnostico y presiona Guardar (ej. Alergia alimentaria por mariscos, urticaria aguda)..."
                  rows={3}
                />
                <Input
                  value={diagQuickNotes}
                  onChange={(e) => setDiagQuickNotes(e.target.value)}
                  placeholder="Observaciones (opcional)"
                />
                <div className="flex items-center justify-between gap-2">
                  <Button type="button" size="sm" onClick={onSaveQuickDiagnosis} disabled={!diagQuickText.trim() || savingDiagnosis}>
                    {savingDiagnosis ? "Guardando..." : "Guardar diagnostico"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setDiagShowCie10Search((prev) => !prev)}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {diagShowCie10Search ? "Ocultar busqueda CIE-10" : "Buscar codigo CIE-10 (opcional)"}
                  </button>
                </div>
                {quickDiagnosisError ? (
                  <Alert>
                    <AlertDescription>{quickDiagnosisError}</AlertDescription>
                  </Alert>
                ) : null}
              </div>
            ) : null}

            {!isClosed && diagShowCie10Search ? (
              <div className="relative">
                <Input
                  ref={diagSearchInputRef}
                  value={diagCie10Query}
                  onChange={(e) => setDiagCie10Query(e.target.value)}
                  placeholder="Buscar por codigo o descripcion CIE-10... (Ctrl+K)"
                />
                {diagCie10Query.trim().length >= 2 ? (
                  <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-custom border border-slate-200 bg-white shadow-lg">
                    {diagSearching ? (
                      <p className="p-3 text-sm text-slate-400">Buscando...</p>
                    ) : diagCie10Results.length === 0 ? (
                      <p className="p-3 text-sm text-slate-400">Sin resultados para &quot;{diagCie10Query}&quot;.</p>
                    ) : (
                      diagCie10Results.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => openCreateDiagnosisModal(item)}
                          className="flex w-full flex-col items-start gap-0.5 border-b border-slate-100 p-2.5 text-left text-sm last:border-b-0 hover:bg-slate-50"
                        >
                          <span className="font-medium text-foreground">
                            {item.code} - {item.description}
                          </span>
                          {item.category ? <span className="text-xs text-muted-foreground">{item.category}</span> : null}
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
            {diagnoses.length === 0 ? (
              <p className="text-sm text-slate-400">Sin diagnosticos registrados.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {diagnoses.map((item) => (
                  <div key={item.id} className="rounded-custom border border-slate-200 p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground">
                          {item.code} - {item.description}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {DIAGNOSIS_TYPE_LABEL[item.type]} / {DIAGNOSIS_CLASSIFICATION_LABEL[item.classification]}
                        </p>
                      </div>
                      {!isClosed ? (
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => openEditDiagnosisModal(item)}
                            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label="Editar diagnostico"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDiagDeleteTarget(item)}
                            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                            aria-label="Eliminar diagnostico"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", DIAGNOSIS_STATUS_STYLE[item.status])}>
                        {DIAGNOSIS_STATUS_LABEL[item.status]}
                      </span>
                      {item.severity ? (
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", DIAGNOSIS_SEVERITY_STYLE[item.severity])}>
                          {DIAGNOSIS_SEVERITY_LABEL[item.severity]}
                        </span>
                      ) : null}
                    </div>
                    {item.notes ? <p className="mt-2 text-xs text-muted-foreground">{item.notes}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "Complementos" && (
        <Card>
          <CardHeader>
            <CardTitle>Signos vitales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!isClosed ? (
              <>
                <div className="grid gap-2 sm:grid-cols-4">
                  <Input value={vitalSignForm.bp_systolic} onChange={(e) => setVitalSignForm((prev) => ({ ...prev, bp_systolic: e.target.value }))} placeholder="PA sistolica" />
                  <Input value={vitalSignForm.bp_diastolic} onChange={(e) => setVitalSignForm((prev) => ({ ...prev, bp_diastolic: e.target.value }))} placeholder="PA diastolica" />
                  <Input value={vitalSignForm.heart_rate} onChange={(e) => setVitalSignForm((prev) => ({ ...prev, heart_rate: e.target.value }))} placeholder="FC (lpm)" />
                  <Input value={vitalSignForm.resp_rate} onChange={(e) => setVitalSignForm((prev) => ({ ...prev, resp_rate: e.target.value }))} placeholder="FR (rpm)" />
                  <Input value={vitalSignForm.temperature} onChange={(e) => setVitalSignForm((prev) => ({ ...prev, temperature: e.target.value }))} placeholder="Temp (C)" />
                  <Input value={vitalSignForm.spo2} onChange={(e) => setVitalSignForm((prev) => ({ ...prev, spo2: e.target.value }))} placeholder="SpO2 (%)" />
                  <Input value={vitalSignForm.weight} onChange={(e) => setVitalSignForm((prev) => ({ ...prev, weight: e.target.value }))} placeholder="Peso (kg)" />
                  <Input value={vitalSignForm.height} onChange={(e) => setVitalSignForm((prev) => ({ ...prev, height: e.target.value }))} placeholder="Talla (cm)" />
                </div>
                {vitalSignError ? (
                  <Alert>
                    <AlertDescription>{vitalSignError}</AlertDescription>
                  </Alert>
                ) : null}
                <Button type="button" size="sm" onClick={onAddVitalSign} disabled={savingVitalSign}>
                  {savingVitalSign ? "Guardando..." : "Guardar signos vitales"}
                </Button>
              </>
            ) : null}
            <div className="space-y-2">
              {vitalSigns.length === 0 ? (
                <p className="text-sm text-slate-400">Sin signos vitales registrados.</p>
              ) : (
                vitalSigns.map((item) => (
                  <div key={item.id} className="rounded-custom border border-slate-200 p-2 text-sm text-slate-700">
                    {[
                      item.bp_systolic && item.bp_diastolic ? `PA ${item.bp_systolic}/${item.bp_diastolic} mmHg` : null,
                      item.heart_rate ? `FC ${item.heart_rate} lpm` : null,
                      item.resp_rate ? `FR ${item.resp_rate} rpm` : null,
                      item.temperature ? `Temp ${item.temperature} C` : null,
                      item.spo2 ? `SpO2 ${item.spo2}%` : null,
                      item.weight ? `Peso ${item.weight} kg` : null,
                      item.height ? `Talla ${item.height} cm` : null
                    ]
                      .filter(Boolean)
                      .join(" - ")}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "Complementos" && (
        <Card>
          <CardHeader>
            <CardTitle>Prescripcion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingAllergyAlerts.length > 0 ? (
              <div className="space-y-3 rounded-custom border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-semibold text-red-800">Alerta de alergia conocida</p>
                <ul className="list-inside list-disc text-sm text-red-700">
                  {pendingAllergyAlerts.map((alert, index) => (
                    <li key={index}>
                      {alert.medication} - alergia a {alert.allergen} ({alert.severity}
                      {alert.reaction ? `, ${alert.reaction}` : ""})
                    </li>
                  ))}
                </ul>
                <div className="space-y-1.5">
                  <Label>Justificacion para continuar (minimo 10 caracteres)</Label>
                  <Input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Motivo clinico para mantener esta prescripcion..." />
                </div>
                {overrideError ? (
                  <Alert>
                    <AlertDescription>{overrideError}</AlertDescription>
                  </Alert>
                ) : null}
                <Button type="button" size="sm" variant="outline" onClick={onOverrideAllergy} disabled={submittingOverride}>
                  {submittingOverride ? "Guardando..." : "Confirmar y justificar"}
                </Button>
              </div>
            ) : null}
            {!isClosed ? (
              <>
                <div className="grid gap-2 md:grid-cols-2">
                  <Input value={prescriptionForm.medication_name} onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, medication_name: e.target.value }))} placeholder="Medicamento" />
                  <Input value={prescriptionForm.dose} onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, dose: e.target.value }))} placeholder="Dosis" />
                  <Input value={prescriptionForm.frequency} onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, frequency: e.target.value }))} placeholder="Frecuencia" />
                  <Input value={prescriptionForm.route} onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, route: e.target.value }))} placeholder="Via" />
                </div>
                {prescriptionError ? (
                  <Alert>
                    <AlertDescription>{prescriptionError}</AlertDescription>
                  </Alert>
                ) : null}
                <Button type="button" size="sm" onClick={onCreatePrescription} disabled={savingPrescription}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  {savingPrescription ? "Guardando..." : "Agregar medicamento"}
                </Button>
                <p className="text-xs text-slate-400">Puedes agregar varios medicamentos: llena el formulario y presiona &quot;Agregar medicamento&quot; por cada uno.</p>
              </>
            ) : null}
            <div className="space-y-2">
              {prescriptions.length === 0 ? (
                <p className="text-sm text-slate-400">Sin prescripciones registradas.</p>
              ) : (
                prescriptions.map((prescription) => (
                  <div key={prescription.id} className="space-y-1 rounded-custom border border-slate-200 p-2 text-sm">
                    {prescription.items.map((item, index) => (
                      <p key={index} className="font-medium">
                        {item.medication_name}
                        {item.dose ? ` - ${item.dose}` : ""}
                        {item.frequency ? ` - ${item.frequency}` : ""}
                        {item.route ? ` (${item.route})` : ""}
                      </p>
                    ))}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "Complementos" && (
        <Card>
          <CardHeader>
            <CardTitle>Ordenes clinicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!isClosed ? (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    value={orderForm.order_type}
                    onChange={(e) => setOrderForm((prev) => ({ ...prev, order_type: e.target.value }))}
                    placeholder="Tipo (ej. interconsulta, dieta, reposo)"
                  />
                  <Input
                    value={orderForm.description}
                    onChange={(e) => setOrderForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Descripcion"
                  />
                </div>
                {orderError ? (
                  <Alert>
                    <AlertDescription>{orderError}</AlertDescription>
                  </Alert>
                ) : null}
                <Button type="button" size="sm" onClick={onCreateOrder} disabled={savingOrder}>
                  {savingOrder ? "Guardando..." : "Guardar orden"}
                </Button>
              </>
            ) : null}
            <div className="space-y-2">
              {orders.length === 0 ? (
                <p className="text-sm text-slate-400">Sin ordenes clinicas registradas.</p>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="rounded-custom border border-slate-200 p-2 text-sm">
                    <p className="font-medium">
                      {order.order_type} - {order.description}
                    </p>
                    <p className="text-xs text-muted-foreground">{order.status}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "Nota SOAP" && currentUser ? (
        <StructuredRecordPanel
          encounterId={encounterId}
          patientId={encounter.patient.id}
          tenantId={currentUser.tenantId}
          doctorId={currentUser.id}
          doctorName={encounter.doctor.full_name}
          appointmentId={encounter.appointment_id ?? undefined}
        />
      ) : null}

      {activeTab === "Resumen" && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen del encuentro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              <strong>Estado:</strong> {ENCOUNTER_STATUS_LABEL[encounter.status] ?? encounter.status}
            </p>
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Diagnosticos ({diagnoses.length})</p>
              {diagnoses.length === 0 ? (
                <p className="text-slate-400">Sin diagnosticos registrados.</p>
              ) : (
                <ul className="list-inside list-disc space-y-0.5">
                  {diagnoses.map((item) => (
                    <li key={item.id}>
                      {item.code} - {item.description} ({DIAGNOSIS_CLASSIFICATION_LABEL[item.classification]})
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Prescripciones ({prescriptions.length})</p>
              {prescriptions.length === 0 ? (
                <p className="text-slate-400">Sin prescripciones registradas.</p>
              ) : (
                <ul className="list-inside list-disc space-y-0.5">
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
            <p className="text-slate-500">Notas clinicas: {encounter.summary.note_count}</p>
            <p className="text-slate-500">Signos vitales registrados: {vitalSigns.length}</p>
          </CardContent>
        </Card>
      )}

      {closeError ? (
        <Alert>
          <AlertDescription>{closeError}</AlertDescription>
        </Alert>
      ) : null}

      {!isClosed ? (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setReferModalOpen(true)}>
            <Send className="mr-1.5 h-4 w-4" />
            Referir a medico
          </Button>
          <Button type="button" onClick={onCloseEncounter} disabled={isClosing}>
            {isClosing ? "Terminando..." : "Terminar consulta"}
          </Button>
        </div>
      ) : null}

      <Modal
        open={diagModalOpen}
        onClose={closeDiagnosisModal}
        title={diagModalMode === "create" ? "Agregar diagnostico" : "Editar diagnostico"}
        description={!diagIsFreeText && diagModalCode ? `${diagModalCode.code} - ${diagModalCode.description}` : undefined}
      >
        <div className="space-y-3">
          {diagIsFreeText ? (
            <div className="space-y-1.5">
              <Label>Diagnostico</Label>
              <Textarea
                value={diagModalCode?.description ?? ""}
                onChange={(e) => setDiagModalCode((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                placeholder="Escribe el diagnostico completo: principal, asociados, impresion diagnostica..."
                rows={6}
              />
            </div>
          ) : null}
          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                value={diagDetailForm.type}
                onChange={(e) => setDiagDetailForm((prev) => ({ ...prev, type: e.target.value as Diagnosis["type"] }))}
              >
                {(Object.keys(DIAGNOSIS_TYPE_LABEL) as Diagnosis["type"][]).map((type) => (
                  <option key={type} value={type}>
                    {DIAGNOSIS_TYPE_LABEL[type]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Clasificacion</Label>
              <Select
                value={diagDetailForm.classification}
                onChange={(e) => setDiagDetailForm((prev) => ({ ...prev, classification: e.target.value as Diagnosis["classification"] }))}
              >
                {(Object.keys(DIAGNOSIS_CLASSIFICATION_LABEL) as Diagnosis["classification"][]).map((classification) => (
                  <option key={classification} value={classification}>
                    {DIAGNOSIS_CLASSIFICATION_LABEL[classification]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select
                value={diagDetailForm.status}
                onChange={(e) => setDiagDetailForm((prev) => ({ ...prev, status: e.target.value as DiagnosisStatus }))}
              >
                {(Object.keys(DIAGNOSIS_STATUS_LABEL) as DiagnosisStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {DIAGNOSIS_STATUS_LABEL[status]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Severidad</Label>
              <Select
                value={diagDetailForm.severity}
                onChange={(e) => setDiagDetailForm((prev) => ({ ...prev, severity: e.target.value as DiagnosisSeverity | "" }))}
              >
                <option value="">Sin especificar</option>
                {(Object.keys(DIAGNOSIS_SEVERITY_LABEL) as DiagnosisSeverity[]).map((severity) => (
                  <option key={severity} value={severity}>
                    {DIAGNOSIS_SEVERITY_LABEL[severity]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Observaciones</Label>
            <Input
              value={diagDetailForm.notes}
              onChange={(e) => setDiagDetailForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Notas clinicas opcionales"
            />
          </div>
          {diagnosisError ? (
            <Alert>
              <AlertDescription>{diagnosisError}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeDiagnosisModal} disabled={savingDiagnosis}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={onSaveDiagnosisModal}
              disabled={savingDiagnosis || (diagIsFreeText && !diagModalCode?.description.trim())}
            >
              {savingDiagnosis ? "Guardando..." : diagModalMode === "create" ? "Agregar diagnostico" : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(diagDeleteTarget)}
        title="Eliminar diagnostico"
        description={diagDeleteTarget ? `Se eliminara "${diagDeleteTarget.code} - ${diagDeleteTarget.description}" del encuentro.` : ""}
        confirmLabel="Eliminar"
        destructive
        onCancel={() => setDiagDeleteTarget(null)}
        onConfirm={onDeleteDiagnosis}
      />

      <ReferPatientModal
        open={referModalOpen}
        patientId={encounter.patient.id}
        patientLabel={encounter.patient.full_name}
        onClose={() => setReferModalOpen(false)}
        onReferred={() => setReferModalOpen(false)}
      />
    </div>
  );
}
