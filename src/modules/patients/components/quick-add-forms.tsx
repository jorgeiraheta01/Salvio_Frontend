"use client";

import { useState } from "react";

import {
  allergiesApi,
  chronicDiseasesApi,
  consentsApi,
  developmentRecordsApi,
  familyHxApi,
  growthMeasurementsApi,
  hospitalizationsHxApi,
  immunizationsApi,
  physiologicalHxApi,
  socialHxApi,
  surgeriesApi,
  type PatientAllergy,
  type PatientChronicDisease,
  type PatientConsent,
  type PatientDevelopmentRecord,
  type PatientFamilyHx,
  type PatientGrowthMeasurement,
  type PatientHospitalizationHx,
  type PatientImmunization,
  type PatientPhysiologicalHx,
  type PatientSocialHx,
  type PatientSurgery
} from "@/modules/patients/api/patient-resources.api";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select } from "@/shared/components/ui/select";

type FormProps<T> = {
  patientId: string;
  tenantId: string;
  onCancel: () => void;
  onCreated: (item: T) => void;
};

export function AddAllergyForm({ patientId, tenantId, onCancel, onCreated }: FormProps<PatientAllergy>) {
  const [allergen, setAllergen] = useState("");
  const [reaction, setReaction] = useState("");
  const [severity, setSeverity] = useState("moderate");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!allergen.trim()) {
      setError("Indica el alergeno.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await allergiesApi.create(patientId, tenantId, { allergen: allergen.trim(), reaction: reaction.trim() || undefined, severity });
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar la alergia.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Alergeno</Label>
          <Input value={allergen} onChange={(e) => setAllergen(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Reaccion</Label>
          <Input value={reaction} onChange={(e) => setReaction(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Severidad</Label>
          <Select value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="mild">Leve</option>
            <option value="moderate">Moderada</option>
            <option value="severe">Severa</option>
            <option value="life_threatening">Potencialmente mortal</option>
          </Select>
        </div>
      </div>
      {error ? (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={submit} disabled={submitting}>
          {submitting ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

export function AddChronicDiseaseForm({ patientId, tenantId, onCancel, onCreated }: FormProps<PatientChronicDisease>) {
  const [diseaseName, setDiseaseName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!diseaseName.trim()) {
      setError("Indica el nombre de la enfermedad.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await chronicDiseasesApi.create(patientId, tenantId, { disease_name: diseaseName.trim(), notes: notes.trim() || undefined });
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar la enfermedad.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Enfermedad</Label>
          <Input value={diseaseName} onChange={(e) => setDiseaseName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Notas</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      {error ? (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={submit} disabled={submitting}>
          {submitting ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

export function AddSurgeryForm({ patientId, tenantId, onCancel, onCreated }: FormProps<PatientSurgery>) {
  const [surgeryName, setSurgeryName] = useState("");
  const [hospital, setHospital] = useState("");
  const [surgeryDate, setSurgeryDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!surgeryName.trim()) {
      setError("Indica el procedimiento.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await surgeriesApi.create(patientId, tenantId, {
        surgery_name: surgeryName.trim(),
        hospital: hospital.trim() || undefined,
        surgery_date: surgeryDate || undefined
      });
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar la cirugia.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Procedimiento</Label>
          <Input value={surgeryName} onChange={(e) => setSurgeryName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Fecha</Label>
          <Input type="date" value={surgeryDate} onChange={(e) => setSurgeryDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Hospital</Label>
          <Input value={hospital} onChange={(e) => setHospital(e.target.value)} />
        </div>
      </div>
      {error ? (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={submit} disabled={submitting}>
          {submitting ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

export function AddImmunizationForm({ patientId, tenantId, onCancel, onCreated }: FormProps<PatientImmunization>) {
  const [vaccineName, setVaccineName] = useState("");
  const [doseNumber, setDoseNumber] = useState("");
  const [appliedAt, setAppliedAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!vaccineName.trim()) {
      setError("Indica la vacuna.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await immunizationsApi.create(patientId, tenantId, {
        vaccine_name: vaccineName.trim(),
        dose_number: doseNumber.trim() || undefined,
        applied_at: appliedAt || undefined
      });
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar la vacuna.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Vacuna</Label>
          <Input value={vaccineName} onChange={(e) => setVaccineName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Dosis</Label>
          <Input value={doseNumber} onChange={(e) => setDoseNumber(e.target.value)} placeholder="1ra, 2da, refuerzo..." />
        </div>
        <div className="space-y-1.5">
          <Label>Fecha de aplicacion</Label>
          <Input type="date" value={appliedAt} onChange={(e) => setAppliedAt(e.target.value)} />
        </div>
      </div>
      {error ? (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={submit} disabled={submitting}>
          {submitting ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

export function AddHospitalizationForm({ patientId, tenantId, onCancel, onCreated }: FormProps<PatientHospitalizationHx>) {
  const [admissionDate, setAdmissionDate] = useState("");
  const [dischargeDate, setDischargeDate] = useState("");
  const [reason, setReason] = useState("");
  const [hospital, setHospital] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!admissionDate) {
      setError("Indica la fecha de ingreso.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await hospitalizationsHxApi.create(patientId, tenantId, {
        admission_date: admissionDate,
        discharge_date: dischargeDate || undefined,
        reason: reason.trim() || undefined,
        hospital: hospital.trim() || undefined
      });
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar la hospitalizacion.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Fecha de ingreso</Label>
          <Input type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Fecha de alta</Label>
          <Input type="date" value={dischargeDate} onChange={(e) => setDischargeDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Motivo</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Hospital</Label>
          <Input value={hospital} onChange={(e) => setHospital(e.target.value)} />
        </div>
      </div>
      {error ? (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={submit} disabled={submitting}>
          {submitting ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

export function AddConsentForm({ patientId, tenantId, onCancel, onCreated }: FormProps<PatientConsent>) {
  const [consentType, setConsentType] = useState("");
  const [consentText, setConsentText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!consentType.trim() || !consentText.trim()) {
      setError("Indica el tipo de consentimiento y su texto.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await consentsApi.create(patientId, tenantId, { consent_type: consentType.trim(), consent_text: consentText.trim() });
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el consentimiento.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Tipo de consentimiento</Label>
          <Input value={consentType} onChange={(e) => setConsentType(e.target.value)} placeholder="Procedimiento, tratamiento, uso de datos..." />
        </div>
        <div className="space-y-1.5">
          <Label>Texto del consentimiento</Label>
          <Input value={consentText} onChange={(e) => setConsentText(e.target.value)} placeholder="Descripcion de lo que autoriza el paciente" />
        </div>
      </div>
      {error ? (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={submit} disabled={submitting}>
          {submitting ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

export function AddGrowthMeasurementForm({ patientId, tenantId, onCancel, onCreated }: FormProps<PatientGrowthMeasurement>) {
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [headCircumference, setHeadCircumference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!weight.trim() && !height.trim() && !headCircumference.trim()) {
      setError("Ingresa al menos una medida.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await growthMeasurementsApi.create(patientId, tenantId, {
        weight: weight.trim() || undefined,
        height: height.trim() || undefined,
        head_circumference: headCircumference.trim() || undefined
      });
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la medicion.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Peso (kg)</Label>
          <Input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0.0" />
        </div>
        <div className="space-y-1.5">
          <Label>Talla (cm)</Label>
          <Input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="0.0" />
        </div>
        <div className="space-y-1.5">
          <Label>Perimetro cefalico (cm)</Label>
          <Input value={headCircumference} onChange={(e) => setHeadCircumference(e.target.value)} placeholder="0.0" />
        </div>
      </div>
      {error ? (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={submit} disabled={submitting}>
          {submitting ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

export function AddFamilyHxForm({ patientId, tenantId, onCancel, onCreated }: FormProps<PatientFamilyHx>) {
  const [relationship, setRelationship] = useState("");
  const [conditionName, setConditionName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!relationship.trim() || !conditionName.trim()) {
      setError("Indica el parentesco y la condicion.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await familyHxApi.create(patientId, tenantId, {
        relationship: relationship.trim(),
        condition_name: conditionName.trim(),
        notes: notes.trim() || undefined
      });
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar el antecedente familiar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Parentesco</Label>
          <Input value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="Madre, padre, hermano..." />
        </div>
        <div className="space-y-1.5">
          <Label>Condicion</Label>
          <Input value={conditionName} onChange={(e) => setConditionName(e.target.value)} placeholder="Diabetes, hipertension..." />
        </div>
        <div className="space-y-1.5">
          <Label>Notas</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      {error ? (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={submit} disabled={submitting}>
          {submitting ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

export function AddSocialHxForm({ patientId, tenantId, onCancel, onCreated }: FormProps<PatientSocialHx>) {
  const [occupation, setOccupation] = useState("");
  const [housingType, setHousingType] = useState("");
  const [livingConditions, setLivingConditions] = useState("");
  const [pets, setPets] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!occupation.trim() && !housingType.trim() && !livingConditions.trim()) {
      setError("Ingresa al menos un dato social.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await socialHxApi.create(patientId, tenantId, {
        occupation: occupation.trim() || undefined,
        housing_type: housingType.trim() || undefined,
        living_conditions: livingConditions.trim() || undefined,
        pets: pets.trim() || undefined
      });
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar el antecedente social.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Ocupacion</Label>
          <Input value={occupation} onChange={(e) => setOccupation(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Tipo de vivienda</Label>
          <Input value={housingType} onChange={(e) => setHousingType(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Condiciones de vida</Label>
          <Input value={livingConditions} onChange={(e) => setLivingConditions(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Mascotas</Label>
          <Input value={pets} onChange={(e) => setPets(e.target.value)} />
        </div>
      </div>
      {error ? (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={submit} disabled={submitting}>
          {submitting ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

export function AddPhysiologicalHxForm({ patientId, tenantId, onCancel, onCreated }: FormProps<PatientPhysiologicalHx>) {
  const [bloodType, setBloodType] = useState("");
  const [smoking, setSmoking] = useState("never");
  const [alcohol, setAlcohol] = useState("never");
  const [drugs, setDrugs] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const created = await physiologicalHxApi.create(patientId, tenantId, {
        blood_type: bloodType.trim() || undefined,
        smoking,
        alcohol,
        drugs: drugs.trim() || undefined,
        notes: notes.trim() || undefined
      });
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar el antecedente fisiologico.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Grupo sanguineo</Label>
          <Input value={bloodType} onChange={(e) => setBloodType(e.target.value)} placeholder="O+, A-, ..." />
        </div>
        <div className="space-y-1.5">
          <Label>Tabaquismo</Label>
          <Select value={smoking} onChange={(e) => setSmoking(e.target.value)}>
            <option value="never">Nunca</option>
            <option value="former">Ex fumador</option>
            <option value="current">Fumador actual</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Alcohol</Label>
          <Select value={alcohol} onChange={(e) => setAlcohol(e.target.value)}>
            <option value="never">Nunca</option>
            <option value="occasional">Ocasional</option>
            <option value="daily">Diario</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Drogas</Label>
          <Input value={drugs} onChange={(e) => setDrugs(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Notas</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {error ? (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={submit} disabled={submitting}>
          {submitting ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

export function AddDevelopmentRecordForm({ patientId, tenantId, onCancel, onCreated }: FormProps<PatientDevelopmentRecord>) {
  const [milestoneId, setMilestoneId] = useState("");
  const [achievedAt, setAchievedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!milestoneId.trim()) {
      setError("Indica el ID del hito de desarrollo.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await developmentRecordsApi.create(patientId, tenantId, {
        milestone_id: milestoneId.trim(),
        achieved_at: achievedAt || undefined,
        notes: notes.trim() || undefined
      });
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el hito.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        El backend no expone un catalogo de hitos de desarrollo — indica el ID (UUID) del hito ya definido en el sistema.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>ID del hito</Label>
          <Input value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)} placeholder="UUID del hito" />
        </div>
        <div className="space-y-1.5">
          <Label>Fecha alcanzado</Label>
          <Input type="date" value={achievedAt} onChange={(e) => setAchievedAt(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Notas</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      {error ? (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={submit} disabled={submitting}>
          {submitting ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
