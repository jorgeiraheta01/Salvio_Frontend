import { httpRequest } from "@/core/api/http-client";

export type BillingRecord = {
  id: string;
  patient_id: string;
  amount: string;
  currency?: string | null;
  status: string;
  payment_method?: string | null;
  invoice_number?: string | null;
  due_date?: string | null;
  created_at: string;
};

export type LabOrder = {
  id: string;
  patient_id: string;
  test_name: string;
  status: string;
  order_datetime?: string | null;
  notes?: string | null;
};

export type ImagingStudy = {
  id: string;
  patient_id: string;
  study_type: string;
  body_part?: string | null;
  status: string;
  order_datetime?: string | null;
};

export type Referral = {
  id: string;
  patient_id: string;
  referral_type: string;
  destination_area?: string | null;
  transfer_reason?: string | null;
  status: string;
};

export type Payment = {
  id: string;
  billing_id: string;
  amount: string;
  payment_method: string;
  status: string;
  reference_number?: string | null;
  created_at: string;
};

export type BillingItem = {
  description?: string | null;
  unit_price?: string | null;
  quantity?: number | null;
};

export type BillingDetail = BillingRecord & {
  items: BillingItem[];
  payments: Payment[];
};

export type LabResult = {
  id: string;
  analyte_name?: string | null;
  result_value?: string | null;
  unit?: string | null;
  reference_range?: string | null;
  is_abnormal?: boolean | null;
};

export type LabOrderDetail = LabOrder & { results: LabResult[] };

export type ImagingReport = {
  id: string;
  findings?: string | null;
  impression?: string | null;
  recommendations?: string | null;
  radiologist_name?: string | null;
};

export type ImagingStudyDetail = ImagingStudy & { reports: ImagingReport[] };

export async function listBilling(): Promise<BillingRecord[]> {
  const response = await httpRequest<{ data: BillingRecord[]; total: number; page: number; limit: number }>("/api/v1/billing?limit=100");
  return response.data;
}

export async function createBilling(payload: {
  patient_id: string;
  tenant_id: string;
  concept: string;
  amount: string;
  payment_method?: string;
  invoice_number?: string;
}): Promise<BillingRecord> {
  const { concept, amount, ...rest } = payload;
  return httpRequest<BillingRecord>("/api/v1/billing", {
    method: "POST",
    body: { ...rest, items: [{ tenant_id: payload.tenant_id, description: concept, unit_price: amount }] }
  });
}

export async function getBillingDetail(billingId: string): Promise<BillingDetail> {
  return httpRequest<BillingDetail>(`/api/v1/billing/${billingId}`);
}

export async function createPayment(
  billingId: string,
  payload: { tenant_id: string; amount: string; payment_method: string; reference_number?: string }
): Promise<Payment> {
  return httpRequest<Payment>(`/api/v1/billing/${billingId}/payments`, {
    method: "POST",
    body: { billing_id: billingId, ...payload }
  });
}

export async function listLabOrders(): Promise<LabOrder[]> {
  return httpRequest<LabOrder[]>("/api/v1/lab-orders");
}

export async function getLabOrderDetail(orderId: string): Promise<LabOrderDetail> {
  return httpRequest<LabOrderDetail>(`/api/v1/lab-orders/${orderId}`);
}

export async function createLabResult(
  orderId: string,
  payload: { tenant_id: string; analyte_name?: string; result_value?: string; unit?: string; reference_range?: string; is_abnormal?: boolean }
): Promise<LabResult> {
  return httpRequest<LabResult>(`/api/v1/lab-orders/${orderId}/results`, {
    method: "POST",
    body: { lab_order_id: orderId, ...payload }
  });
}

export async function createLabOrder(payload: {
  patient_id: string;
  tenant_id: string;
  ordered_by: string;
  test_name: string;
  notes?: string;
}): Promise<LabOrder> {
  return httpRequest<LabOrder>("/api/v1/lab-orders", { method: "POST", body: payload });
}

export async function listImagingStudies(): Promise<ImagingStudy[]> {
  return httpRequest<ImagingStudy[]>("/api/v1/imaging-studies");
}

export async function getImagingStudyDetail(studyId: string): Promise<ImagingStudyDetail> {
  return httpRequest<ImagingStudyDetail>(`/api/v1/imaging-studies/${studyId}`);
}

export async function createImagingReport(
  studyId: string,
  payload: { tenant_id: string; findings?: string; impression?: string; recommendations?: string; radiologist_name?: string }
): Promise<ImagingReport> {
  return httpRequest<ImagingReport>(`/api/v1/imaging-studies/${studyId}/reports`, {
    method: "POST",
    body: { imaging_study_id: studyId, ...payload }
  });
}

export async function createImagingStudy(payload: {
  patient_id: string;
  tenant_id: string;
  study_type: string;
  body_part?: string;
}): Promise<ImagingStudy> {
  return httpRequest<ImagingStudy>("/api/v1/imaging-studies", { method: "POST", body: payload });
}

export async function createReferral(payload: {
  patient_id: string;
  tenant_id: string;
  referral_type: string;
  destination_area?: string;
  transfer_reason?: string;
  referred_by: string;
}): Promise<Referral> {
  return httpRequest<Referral>("/api/v1/referrals", { method: "POST", body: payload });
}

export type ReferralDetail = Referral & {
  source_service?: string | null;
  referred_by_name?: string | null;
  created_at?: string;
};

export async function getReferralDetail(referralId: string): Promise<ReferralDetail> {
  return httpRequest<ReferralDetail>(`/api/v1/referrals/${referralId}`);
}

export type Interconsult = {
  id: string;
  patient_id: string;
  consulting_specialty: string;
  reason?: string | null;
  status: string;
};

export async function createInterconsult(payload: {
  patient_id: string;
  tenant_id: string;
  requesting_doctor: string;
  requesting_doctor_name: string;
  consulting_specialty: string;
  reason?: string;
}): Promise<Interconsult> {
  return httpRequest<Interconsult>("/api/v1/referrals/interconsults", { method: "POST", body: payload });
}
