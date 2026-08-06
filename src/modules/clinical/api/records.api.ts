import { httpRequest } from "@/core/api/http-client";

export type ClinicalRecord = {
  id: string;
  patient_id: string;
  tenant_id: string;
  doctor_id: string;
  doctor_name: string;
  status: "draft" | "signed" | "amended" | string;
  soap_subjective?: string | null;
  soap_objective?: string | null;
  soap_assessment?: string | null;
  soap_plan?: string | null;
  signed_at?: string | null;
  digital_signature?: string | null;
  created_at: string;
};

export async function createClinicalRecord(payload: {
  patient_id: string;
  tenant_id: string;
  doctor_id: string;
  doctor_name: string;
  appointment_id?: string;
}): Promise<ClinicalRecord> {
  return httpRequest<ClinicalRecord>("/api/v1/clinical-records", { method: "POST", body: payload });
}

export async function getClinicalRecord(recordId: string): Promise<ClinicalRecord> {
  return httpRequest<ClinicalRecord>(`/api/v1/clinical-records/${recordId}`);
}

export async function updateClinicalRecord(
  recordId: string,
  payload: Partial<{
    soap_subjective: string;
    soap_objective: string;
    soap_assessment: string;
    soap_plan: string;
  }>
): Promise<ClinicalRecord> {
  return httpRequest<ClinicalRecord>(`/api/v1/clinical-records/${recordId}`, { method: "PATCH", body: payload });
}

export async function deleteClinicalRecord(recordId: string): Promise<void> {
  await httpRequest<void>(`/api/v1/clinical-records/${recordId}`, { method: "DELETE" });
}

export async function signClinicalRecord(
  recordId: string,
  payload: { digital_signature: string; signed_by: string; has_primary_diagnosis?: boolean }
): Promise<ClinicalRecord> {
  return httpRequest<ClinicalRecord>(`/api/v1/clinical-records/${recordId}/sign`, { method: "PATCH", body: payload });
}

export async function createCorrectionNote(recordId: string, payload: { note_text: string; created_by: string }): Promise<{ id: string }> {
  return httpRequest<{ id: string }>(`/api/v1/clinical-records/${recordId}/correction-notes`, {
    method: "POST",
    body: { clinical_record_id: recordId, ...payload }
  });
}

export type RecordDiagnosisRef = {
  id: string;
  cie10_code: string;
  cie10_description: string;
  is_primary_diagnosis: boolean;
};

export async function listRecordDiagnoses(recordId: string): Promise<RecordDiagnosisRef[]> {
  return httpRequest<RecordDiagnosisRef[]>(`/api/v1/clinical-records/${recordId}/diagnoses`);
}

export type ClinicalProblem = { id: string; problem_name: string; is_active?: boolean | null; notes?: string | null };

export async function listClinicalProblems(recordId: string): Promise<ClinicalProblem[]> {
  return httpRequest<ClinicalProblem[]>(`/api/v1/clinical-records/${recordId}/clinical-problems`);
}

export async function createClinicalProblem(
  recordId: string,
  tenantId: string,
  payload: { problem_name: string; notes?: string }
): Promise<ClinicalProblem> {
  return httpRequest<ClinicalProblem>(`/api/v1/clinical-records/${recordId}/clinical-problems`, {
    method: "POST",
    body: { clinical_record_id: recordId, tenant_id: tenantId, ...payload }
  });
}

export type PhysicalExamFinding = { id: string; system_name: string; is_normal?: boolean | null; findings?: string | null };

export async function listPhysicalExamFindings(recordId: string): Promise<PhysicalExamFinding[]> {
  return httpRequest<PhysicalExamFinding[]>(`/api/v1/clinical-records/${recordId}/physical-exam-findings`);
}

export async function createPhysicalExamFinding(
  recordId: string,
  tenantId: string,
  payload: { system_name: string; is_normal?: boolean; findings?: string }
): Promise<PhysicalExamFinding> {
  return httpRequest<PhysicalExamFinding>(`/api/v1/clinical-records/${recordId}/physical-exam-findings`, {
    method: "POST",
    body: { clinical_record_id: recordId, tenant_id: tenantId, ...payload }
  });
}

export type ReviewOfSystem = { id: string; system_name: string; is_positive?: boolean | null; comments?: string | null };

export async function listReviewOfSystems(recordId: string): Promise<ReviewOfSystem[]> {
  return httpRequest<ReviewOfSystem[]>(`/api/v1/clinical-records/${recordId}/review-of-systems`);
}

export async function createReviewOfSystem(
  recordId: string,
  tenantId: string,
  payload: { system_name: string; is_positive?: boolean; comments?: string }
): Promise<ReviewOfSystem> {
  return httpRequest<ReviewOfSystem>(`/api/v1/clinical-records/${recordId}/review-of-systems`, {
    method: "POST",
    body: { clinical_record_id: recordId, tenant_id: tenantId, ...payload }
  });
}

export type RecordPlan = { id: string; plan_type?: string | null; description?: string | null; due_date?: string | null };

export async function listRecordPlans(recordId: string): Promise<RecordPlan[]> {
  return httpRequest<RecordPlan[]>(`/api/v1/clinical-records/${recordId}/plans`);
}

export async function createRecordPlan(
  recordId: string,
  tenantId: string,
  payload: { plan_type?: string; description?: string; due_date?: string }
): Promise<RecordPlan> {
  return httpRequest<RecordPlan>(`/api/v1/clinical-records/${recordId}/plans`, {
    method: "POST",
    body: { clinical_record_id: recordId, tenant_id: tenantId, ...payload }
  });
}

export type ClinicalProcedure = { id: string; procedure_name: string; performed_by_name?: string | null; notes?: string | null };

export async function listClinicalProcedures(recordId: string): Promise<ClinicalProcedure[]> {
  return httpRequest<ClinicalProcedure[]>(`/api/v1/clinical-records/${recordId}/procedures`);
}

export async function createClinicalProcedure(
  recordId: string,
  patientId: string,
  tenantId: string,
  payload: { procedure_name: string; notes?: string; performed_by_name?: string }
): Promise<ClinicalProcedure> {
  return httpRequest<ClinicalProcedure>(`/api/v1/clinical-records/${recordId}/procedures`, {
    method: "POST",
    body: { patient_id: patientId, tenant_id: tenantId, clinical_record_id: recordId, ...payload }
  });
}

export type RecordNote = { id: string; note_type: string; content: string };

export async function listRecordNotes(recordId: string): Promise<RecordNote[]> {
  return httpRequest<RecordNote[]>(`/api/v1/clinical-records/${recordId}/notes`);
}

export async function createRecordNote(
  recordId: string,
  patientId: string,
  tenantId: string,
  payload: { note_type: string; content: string }
): Promise<RecordNote> {
  return httpRequest<RecordNote>(`/api/v1/clinical-records/${recordId}/notes`, {
    method: "POST",
    body: { patient_id: patientId, tenant_id: tenantId, clinical_record_id: recordId, ...payload }
  });
}

export type RecordVitalSign = {
  id: string;
  recorded_at: string;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  heart_rate?: number | null;
  resp_rate?: number | null;
  temperature?: number | string | null;
  spo2?: number | null;
};

export async function listRecordVitalSigns(recordId: string): Promise<RecordVitalSign[]> {
  return httpRequest<RecordVitalSign[]>(`/api/v1/clinical-records/${recordId}/vital-signs`);
}

export async function createRecordVitalSign(
  recordId: string,
  patientId: string,
  tenantId: string,
  payload: { bp_systolic?: number; bp_diastolic?: number; heart_rate?: number; resp_rate?: number; temperature?: number; spo2?: number }
): Promise<RecordVitalSign> {
  return httpRequest<RecordVitalSign>(`/api/v1/clinical-records/${recordId}/vital-signs`, {
    method: "POST",
    body: { patient_id: patientId, tenant_id: tenantId, clinical_record_id: recordId, ...payload }
  });
}

export type ClinicalScaleResult = { id: string; scale_name: string; total_score?: number | null; risk_level?: string | null };

export async function listClinicalScales(recordId: string): Promise<ClinicalScaleResult[]> {
  return httpRequest<ClinicalScaleResult[]>(`/api/v1/clinical-records/${recordId}/scales`);
}

export async function createClinicalScale(
  recordId: string,
  patientId: string,
  tenantId: string,
  payload: { scale_name: string; total_score?: number; risk_level?: string }
): Promise<ClinicalScaleResult> {
  return httpRequest<ClinicalScaleResult>(`/api/v1/clinical-records/${recordId}/scales`, {
    method: "POST",
    body: { patient_id: patientId, tenant_id: tenantId, clinical_record_id: recordId, ...payload }
  });
}
