import { httpRequest } from "@/core/api/http-client";

export type EncounterSummary = {
  id: string;
  appointment_id?: string | null;
  patient_id: string;
  doctor_id: string;
  status: "active" | "completed" | "closed";
  version: number;
  patient: {
    id: string;
    full_name: string;
    age?: number | null;
    document?: string | null;
  };
  doctor: {
    id: string;
    full_name: string;
  };
  summary: {
    note_count: number;
    closed_note_count: number;
    diagnosis_count: number;
    prescription_count: number;
    vital_sign_count: number;
    order_count: number;
  };
};

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "checked_in"
  | "in_consultation"
  | "completed"
  | "cancelled"
  | "no_show"
  | "rescheduled";

export type AppointmentItem = {
  id: string;
  patient_id: string;
  doctor_id: string;
  scheduled_at: string;
  appointment_type?: string | null;
  status: AppointmentStatus;
  notes?: string | null;
};

export type PatientItem = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender?: string | null;
  medical_record_number?: string | null;
  dui?: string | null;
  nit?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  insurance_type?: string | null;
  insurance_number?: string | null;
  attention_number?: string | null;
  last_employer?: string | null;
  work_phone?: string | null;
  last_occupation?: string | null;
  last_contribution_period?: string | null;
  last_work_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type UserDirectoryEntry = {
  id: string;
  full_name: string;
  role: string;
  specialty?: string | null;
};

export type PatientMedication = {
  id: string;
  medication_name: string;
  dose?: string | null;
  frequency?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
};

export type PatientUpdatePayload = Partial<{
  email: string;
  phone: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
}>;

export type PatientsResponse = {
  data: PatientItem[];
  total: number;
  page: number;
  limit: number;
};

export type ClinicalNote = {
  id: string;
  encounter_id?: string | null;
  content: string;
  is_closed: boolean;
  version: number;
};

export type DiagnosisStatus = "active" | "resolved" | "chronic" | "recurrent";
export type DiagnosisSeverity = "mild" | "moderate" | "severe";

export type Diagnosis = {
  id: string;
  code: string;
  description: string;
  type: "presumptive" | "definitive" | "ruled_out";
  classification: "primary" | "secondary" | "background";
  status: DiagnosisStatus;
  severity?: DiagnosisSeverity | null;
  is_first_time: boolean;
  notes?: string | null;
  version: number;
};

export type Cie10CatalogItem = {
  id: string;
  code: string;
  description: string;
  category?: string | null;
  is_active: boolean;
};

export async function listAppointments(params?: {
  date?: string;
  doctorId?: string;
  patientId?: string;
  status?: AppointmentStatus;
}): Promise<AppointmentItem[]> {
  const query = new URLSearchParams();
  if (params?.date) query.set("date", params.date);
  if (params?.doctorId) query.set("doctor_id", params.doctorId);
  if (params?.patientId) query.set("patient_id", params.patientId);
  if (params?.status) query.set("status", params.status);
  const qs = query.toString();
  return httpRequest<AppointmentItem[]>(`/api/v1/appointments${qs ? `?${qs}` : ""}`);
}

export async function listUsers(role?: string): Promise<UserDirectoryEntry[]> {
  const qs = role ? `?role=${role}` : "";
  return httpRequest<UserDirectoryEntry[]>(`/api/v1/users${qs}`);
}

export async function createAppointment(payload: {
  patient_id: string;
  tenant_id: string;
  doctor_id: string;
  scheduled_at: string;
  appointment_type?: string;
  notes?: string;
}): Promise<AppointmentItem> {
  return httpRequest<AppointmentItem>("/api/v1/appointments", {
    method: "POST",
    body: payload
  });
}

export async function updateAppointmentStatus(
  appointmentId: string,
  payload: { status: AppointmentStatus; current_status?: AppointmentStatus; reason?: string }
): Promise<AppointmentItem> {
  return httpRequest<AppointmentItem>(`/api/v1/appointments/${appointmentId}/status`, {
    method: "PATCH",
    body: payload
  });
}

export async function deleteAppointment(appointmentId: string): Promise<void> {
  await httpRequest<void>(`/api/v1/appointments/${appointmentId}`, { method: "DELETE" });
}

export async function rescheduleAppointment(
  appointmentId: string,
  payload: { new_scheduled_at: string; new_doctor_id?: string; reason: string }
): Promise<AppointmentItem> {
  return httpRequest<AppointmentItem>(`/api/v1/appointments/${appointmentId}/reschedule`, {
    method: "POST",
    body: payload
  });
}

export type Admission = {
  id: string;
  admission_datetime: string;
  discharge_datetime?: string | null;
  service?: string | null;
  bed_number?: string | null;
  status: string;
};

export async function createAdmission(
  appointmentId: string,
  payload: { patient_id: string; tenant_id: string; admission_datetime: string; service?: string; bed_number?: string }
): Promise<Admission> {
  return httpRequest<Admission>(`/api/v1/appointments/${appointmentId}/admissions`, {
    method: "POST",
    body: payload
  });
}

export type Triage = {
  id: string;
  priority: string;
  received_at: string;
  chief_complaint?: string | null;
};

export async function createTriage(
  appointmentId: string,
  payload: {
    patient_id: string;
    tenant_id: string;
    received_at: string;
    priority: string;
    chief_complaint?: string;
    systolic_bp?: number;
    diastolic_bp?: number;
    heart_rate?: number;
    resp_rate?: number;
    temperature?: number;
    spo2?: number;
    created_by?: string;
  }
): Promise<Triage> {
  return httpRequest<Triage>(`/api/v1/appointments/${appointmentId}/triage`, {
    method: "POST",
    body: { appointment_id: appointmentId, ...payload }
  });
}

export async function listPatients(query?: string): Promise<PatientsResponse> {
  const params = new URLSearchParams({ page: "1", limit: "50" });
  if (query) params.set("q", query);
  return httpRequest<PatientsResponse>(`/api/v1/patients?${params.toString()}`);
}

export async function getPatient(patientId: string): Promise<PatientItem> {
  return httpRequest<PatientItem>(`/api/v1/patients/${patientId}`);
}

export async function updatePatient(patientId: string, payload: PatientUpdatePayload): Promise<PatientItem> {
  return httpRequest<PatientItem>(`/api/v1/patients/${patientId}`, {
    method: "PATCH",
    body: payload
  });
}

export async function deletePatient(patientId: string): Promise<void> {
  await httpRequest<void>(`/api/v1/patients/${patientId}`, { method: "DELETE" });
}

export async function listPatientMedications(patientId: string): Promise<PatientMedication[]> {
  return httpRequest<PatientMedication[]>(`/api/v1/patients/${patientId}/medications`);
}

export async function createPatientMedication(
  patientId: string,
  payload: {
    tenant_id: string;
    medication_name: string;
    dose?: string;
    frequency?: string;
    prescribed_by?: string;
    prescribed_by_name?: string;
  }
): Promise<PatientMedication> {
  return httpRequest<PatientMedication>(`/api/v1/patients/${patientId}/medications`, {
    method: "POST",
    body: { patient_id: patientId, ...payload }
  });
}

export type WaMessage = {
  id: string;
  created_at: string;
  message_type?: string | null;
  template_name?: string | null;
  status: string;
  sent_at?: string | null;
};

export async function listWaMessages(patientId: string): Promise<WaMessage[]> {
  return httpRequest<WaMessage[]>(`/api/v1/wa-messages?patient_id=${patientId}`);
}

export async function createWaMessage(payload: {
  patient_id: string;
  tenant_id: string;
  message_type?: string;
  template_name?: string;
}): Promise<WaMessage> {
  return httpRequest<WaMessage>("/api/v1/wa-messages", { method: "POST", body: payload });
}

export async function startEncounter(payload: { patient_id: string; appointment_id?: string }): Promise<EncounterSummary> {
  return httpRequest<EncounterSummary>("/api/v1/encounters/start", {
    method: "POST",
    body: payload
  });
}

export async function getEncounter(encounterId: string): Promise<EncounterSummary> {
  return httpRequest<EncounterSummary>(`/api/v1/encounters/${encounterId}`);
}

export async function listEncountersByPatient(patientId: string): Promise<EncounterSummary[]> {
  return httpRequest<EncounterSummary[]>(`/api/v1/encounters?patient_id=${patientId}`);
}

export async function listClinicalNotes(encounterId: string): Promise<ClinicalNote[]> {
  return httpRequest<ClinicalNote[]>(`/api/v1/clinical-notes?encounter_id=${encounterId}`);
}

export async function createClinicalNote(payload: { encounter_id: string; content: string; note_type?: "progress" | "other" }): Promise<ClinicalNote> {
  return httpRequest<ClinicalNote>("/api/v1/clinical-notes", {
    method: "POST",
    body: payload
  });
}

export async function updateClinicalNote(noteId: string, payload: { content: string; version: number }): Promise<ClinicalNote> {
  return httpRequest<ClinicalNote>(`/api/v1/clinical-notes/${noteId}`, {
    method: "PATCH",
    body: payload
  });
}

export async function closeClinicalNote(noteId: string, version: number): Promise<ClinicalNote> {
  return httpRequest<ClinicalNote>(`/api/v1/clinical-notes/${noteId}/close`, {
    method: "POST",
    body: { version }
  });
}

export async function listDiagnoses(encounterId: string): Promise<Diagnosis[]> {
  return httpRequest<Diagnosis[]>(`/api/v1/diagnoses?encounter_id=${encounterId}`);
}

export async function searchCie10(query: string): Promise<Cie10CatalogItem[]> {
  return httpRequest<Cie10CatalogItem[]>(`/api/v1/catalogs/cie10?q=${encodeURIComponent(query)}`);
}

export async function createDiagnosis(payload: {
  encounter_id: string;
  clinical_record_id?: string;
  code: string;
  description: string;
  type: "presumptive" | "definitive" | "ruled_out";
  classification: "primary" | "secondary" | "background";
  status?: DiagnosisStatus;
  severity?: DiagnosisSeverity | null;
  is_first_time: boolean;
  notes?: string | null;
}): Promise<Diagnosis> {
  return httpRequest<Diagnosis>("/api/v1/diagnoses", {
    method: "POST",
    body: payload
  });
}

export async function updateDiagnosis(
  diagnosisId: string,
  payload: Partial<{
    type: "presumptive" | "definitive" | "ruled_out";
    classification: "primary" | "secondary" | "background";
    status: DiagnosisStatus;
    severity: DiagnosisSeverity | null;
    notes: string | null;
  }>
): Promise<Diagnosis> {
  return httpRequest<Diagnosis>(`/api/v1/diagnoses/${diagnosisId}`, {
    method: "PATCH",
    body: payload
  });
}

export async function deleteDiagnosis(diagnosisId: string): Promise<void> {
  await httpRequest<void>(`/api/v1/diagnoses/${diagnosisId}`, { method: "DELETE" });
}

export type PrescriptionItem = {
  medication_name: string;
  dose?: string | null;
  frequency?: string | null;
  route?: string | null;
};

export type Prescription = {
  id: string;
  created_at: string;
  status: string;
  items: PrescriptionItem[];
};

export type AllergyAlert = {
  medication: string;
  allergen: string;
  severity: string;
  reaction?: string | null;
};

export type PrescriptionCreateResult = {
  id: string | null;
  status: string;
  allergy_alerts: AllergyAlert[];
};

export async function createPrescription(payload: {
  encounter_id: string;
  medications: Array<{ medication_name: string; dose: string; frequency: string; route: string }>;
}): Promise<PrescriptionCreateResult> {
  return httpRequest<PrescriptionCreateResult>("/api/v1/prescriptions", {
    method: "POST",
    body: payload
  });
}

export async function overrideAllergy(
  prescriptionId: string,
  payload: { medication: string; override_reason: string; overridden_by: string }
): Promise<{ id: string; override_recorded: boolean }> {
  return httpRequest<{ id: string; override_recorded: boolean }>(`/api/v1/prescriptions/${prescriptionId}/override-allergy`, {
    method: "POST",
    body: payload
  });
}

export async function listPrescriptions(encounterId: string): Promise<Prescription[]> {
  return httpRequest<Prescription[]>(`/api/v1/prescriptions?encounter_id=${encounterId}`);
}

export type VitalSign = {
  id: string;
  created_at: string;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  heart_rate?: number | null;
  resp_rate?: number | null;
  temperature?: number | string | null;
  spo2?: number | null;
  weight?: number | string | null;
  height?: number | string | null;
};

export async function listVitalSigns(encounterId: string): Promise<VitalSign[]> {
  return httpRequest<VitalSign[]>(`/api/v1/vital-signs?encounter_id=${encounterId}`);
}

export async function createVitalSign(payload: {
  patient_id: string;
  tenant_id: string;
  encounter_id: string;
  recorded_by?: string;
  bp_systolic?: number;
  bp_diastolic?: number;
  heart_rate?: number;
  resp_rate?: number;
  temperature?: number;
  spo2?: number;
  weight?: number;
  height?: number;
}): Promise<VitalSign> {
  return httpRequest<VitalSign>("/api/v1/vital-signs", {
    method: "POST",
    body: payload
  });
}

export type ClinicalOrder = {
  id: string;
  order_type: string;
  description: string;
  status: string;
  scheduled_for?: string | null;
  notes?: string | null;
};

export async function listOrders(encounterId: string): Promise<ClinicalOrder[]> {
  return httpRequest<ClinicalOrder[]>(`/api/v1/orders?encounter_id=${encounterId}`);
}

export async function createOrder(payload: {
  encounter_id: string;
  order_type: string;
  description: string;
  scheduled_for?: string;
  notes?: string;
}): Promise<ClinicalOrder> {
  return httpRequest<ClinicalOrder>("/api/v1/orders", {
    method: "POST",
    body: payload
  });
}

export async function closeEncounter(encounterId: string, version: number): Promise<EncounterSummary> {
  return httpRequest<EncounterSummary>(`/api/v1/encounters/${encounterId}/close`, {
    method: "POST",
    body: { version }
  });
}
