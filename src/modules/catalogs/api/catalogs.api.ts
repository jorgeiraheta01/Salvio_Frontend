import { httpRequest } from "@/core/api/http-client";

export type MedicationCatalogItem = {
  id: string;
  medication_code?: string | null;
  generic_name: string;
  brand_name?: string | null;
  concentration?: string | null;
  pharmaceutical_form?: string | null;
  route?: string | null;
  is_controlled: boolean;
  is_active: boolean;
};

export type LabTestCatalogItem = {
  id: string;
  test_code: string;
  test_name: string;
  category?: string | null;
  unit?: string | null;
  ref_range?: string | null;
  sample_type?: string | null;
  is_active: boolean;
};

export type ClinicalSystemCatalogItem = {
  id: string;
  system_name: string;
  applies_to: string[];
  sort_order: number;
  description?: string | null;
  is_active: boolean;
};

export async function listMedications(): Promise<MedicationCatalogItem[]> {
  return httpRequest<MedicationCatalogItem[]>("/api/v1/catalogs/medications");
}

export async function createMedication(payload: {
  generic_name: string;
  pharmaceutical_form?: string;
  route?: string;
}): Promise<MedicationCatalogItem> {
  return httpRequest<MedicationCatalogItem>("/api/v1/catalogs/medications", { method: "POST", body: payload });
}

export async function updateMedication(id: string, payload: Partial<{ is_active: boolean }>): Promise<MedicationCatalogItem> {
  return httpRequest<MedicationCatalogItem>(`/api/v1/catalogs/medications/${id}`, { method: "PATCH", body: payload });
}

export async function listLabTests(): Promise<LabTestCatalogItem[]> {
  return httpRequest<LabTestCatalogItem[]>("/api/v1/catalogs/lab-tests");
}

export async function createLabTest(payload: { test_code: string; test_name: string; category?: string; sample_type?: string }): Promise<LabTestCatalogItem> {
  return httpRequest<LabTestCatalogItem>("/api/v1/catalogs/lab-tests", { method: "POST", body: payload });
}

export async function updateLabTest(id: string, payload: Partial<{ is_active: boolean }>): Promise<LabTestCatalogItem> {
  return httpRequest<LabTestCatalogItem>(`/api/v1/catalogs/lab-tests/${id}`, { method: "PATCH", body: payload });
}

export async function listClinicalSystems(): Promise<ClinicalSystemCatalogItem[]> {
  return httpRequest<ClinicalSystemCatalogItem[]>("/api/v1/catalogs/clinical-systems");
}

export async function createClinicalSystem(payload: { system_name: string; description?: string }): Promise<ClinicalSystemCatalogItem> {
  return httpRequest<ClinicalSystemCatalogItem>("/api/v1/catalogs/clinical-systems", { method: "POST", body: payload });
}

export async function updateClinicalSystem(id: string, payload: Partial<{ is_active: boolean }>): Promise<ClinicalSystemCatalogItem> {
  return httpRequest<ClinicalSystemCatalogItem>(`/api/v1/catalogs/clinical-systems/${id}`, { method: "PATCH", body: payload });
}
