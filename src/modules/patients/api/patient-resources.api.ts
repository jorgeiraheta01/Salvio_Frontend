import { httpRequest } from "@/core/api/http-client";
import type { PatientItem } from "@/modules/clinical/api/clinical.api";

export async function createPatient(payload: {
  tenant_id: string;
  medical_record_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  insurance_type: string;
  dui?: string;
  nit?: string;
  email?: string;
  phone?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  insurance_number?: string;
  last_employer?: string;
  last_occupation?: string;
  work_phone?: string;
}): Promise<PatientItem> {
  return httpRequest<PatientItem>("/api/v1/patients", { method: "POST", body: payload });
}

export type PatientAllergy = {
  id: string;
  allergen: string;
  reaction?: string | null;
  severity: "mild" | "moderate" | "severe";
  is_active: boolean;
  created_at: string;
};

export type PatientChronicDisease = {
  id: string;
  disease_name: string;
  cie10_code?: string | null;
  diagnosis_date?: string | null;
  is_active: boolean;
  notes?: string | null;
};

export type PatientImmunization = {
  id: string;
  vaccine_name: string;
  dose_number?: string | null;
  applied_at?: string | null;
  next_due_at?: string | null;
  status: "applied" | "pending" | "overdue";
  notes?: string | null;
};

export type PatientHospitalizationHx = {
  id: string;
  admission_date: string;
  discharge_date?: string | null;
  reason?: string | null;
  hospital?: string | null;
  notes?: string | null;
};

export type PatientSurgery = {
  id: string;
  surgery_name: string;
  surgery_date?: string | null;
  hospital?: string | null;
  notes?: string | null;
};

export type PatientFamilyHx = {
  id: string;
  relationship?: string | null;
  condition_name?: string | null;
  notes?: string | null;
  created_at: string;
};

export type PatientSocialHx = {
  id: string;
  occupation?: string | null;
  living_conditions?: string | null;
  housing_type?: string | null;
  pets?: string | null;
  notes?: string | null;
  created_at: string;
};

export type PatientPhysiologicalHx = {
  id: string;
  blood_type?: string | null;
  rh_factor?: string | null;
  smoking?: string | null;
  alcohol?: string | null;
  drugs?: string | null;
  notes?: string | null;
};

export type PatientPerinatalHx = {
  id: string;
  gestational_weeks?: number | null;
  delivery_route?: string | null;
  birth_weight?: string | null;
  birth_length?: string | null;
  apgar_1min?: number | null;
  apgar_5min?: number | null;
  notes?: string | null;
};

export type PatientDevelopmentHx = {
  id: string;
  walking_age_months?: string | null;
  first_words_age_months?: string | null;
  toilet_training_age_months?: string | null;
  notes?: string | null;
};

export type PatientGynecologicalHx = {
  id: string;
  menarche_age?: number | null;
  last_menstrual_period?: string | null;
  pregnancies?: number | null;
  deliveries?: number | null;
  abortions?: number | null;
  contraceptive_method?: string | null;
  notes?: string | null;
};

export type PatientConsent = {
  id: string;
  consent_type: string;
  consent_text: string;
  signed_at?: string | null;
  revoked_at?: string | null;
  pdf_url?: string | null;
};

export type PatientDevelopmentRecord = {
  id: string;
  milestone_id: string;
  achieved_at?: string | null;
  delay_alert?: boolean | null;
  notes?: string | null;
};

export type PatientGrowthMeasurement = {
  id: string;
  measured_at?: string | null;
  weight?: string | null;
  height?: string | null;
  head_circumference?: string | null;
  bmi?: string | null;
  notes?: string | null;
};

function childResource<TRead>(path: string) {
  return {
    list: (patientId: string) => httpRequest<TRead[]>(`/api/v1/patients/${patientId}/${path}`),
    create: (patientId: string, tenantId: string, payload: Record<string, unknown>) =>
      httpRequest<TRead>(`/api/v1/patients/${patientId}/${path}`, {
        method: "POST",
        body: { patient_id: patientId, tenant_id: tenantId, ...payload }
      })
  };
}

export const allergiesApi = childResource<PatientAllergy>("allergies");
export const chronicDiseasesApi = childResource<PatientChronicDisease>("chronic-diseases");
export const surgeriesApi = childResource<PatientSurgery>("surgeries");
export const familyHxApi = childResource<PatientFamilyHx>("family-hx");
export const socialHxApi = childResource<PatientSocialHx>("social-hx");
export const physiologicalHxApi = childResource<PatientPhysiologicalHx>("physiological-hx");
export const perinatalHxApi = childResource<PatientPerinatalHx>("perinatal-hx");
export const developmentHxApi = childResource<PatientDevelopmentHx>("development-hx");
export const gynecologicalHxApi = childResource<PatientGynecologicalHx>("gynecological-hx");
export const immunizationsApi = childResource<PatientImmunization>("immunizations");
export const hospitalizationsHxApi = childResource<PatientHospitalizationHx>("hospitalizations-hx");
export const consentsApi = childResource<PatientConsent>("consents");
export const developmentRecordsApi = childResource<PatientDevelopmentRecord>("development-records");
export const growthMeasurementsApi = childResource<PatientGrowthMeasurement>("growth-measurements");
