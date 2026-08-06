import { ApiError, httpRequest } from "@/core/api/http-client";
import { getStoredToken } from "@/core/auth/token-storage";
import { useAuthStore } from "@/modules/auth/store/auth.store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export type DoctorSeed = {
  full_name: string;
  specialty: string;
  email: string;
  password: string;
};

export type TenantProvisionPayload = {
  tenant_id: string;
  tenant_name: string;
  admin_email: string;
  admin_password: string;
  doctors: DoctorSeed[];
};

export type TenantProvisionResult = {
  tenant_id: string;
  tenant_name: string;
  admin_email: string;
  db_name: string;
  doctors_created: number;
  message: string;
};

export async function provisionTenant(payload: TenantProvisionPayload): Promise<TenantProvisionResult> {
  return httpRequest<TenantProvisionResult>("/api/v1/tenants", {
    method: "POST",
    body: payload
  });
}

export type TenantStatus = "active" | "suspended" | "archived";

export type TenantSummary = {
  tenant_id: string;
  name: string;
  country: string;
  status: TenantStatus;
  created_at: string;
  billing_contact_name?: string | null;
  billing_contact_phone?: string | null;
};

export async function listTenants(): Promise<TenantSummary[]> {
  return httpRequest<TenantSummary[]>("/api/v1/tenants");
}

export async function updateTenant(
  tenantId: string,
  payload: { name?: string; status?: TenantStatus; billing_contact_name?: string; billing_contact_phone?: string }
): Promise<TenantSummary> {
  return httpRequest<TenantSummary>(`/api/v1/tenants/${tenantId}`, {
    method: "PATCH",
    body: payload
  });
}

export type TenantModule = {
  module_key: string;
  label: string;
  enabled: boolean;
};

export async function listTenantModules(tenantId: string): Promise<TenantModule[]> {
  return httpRequest<TenantModule[]>(`/api/v1/tenants/${tenantId}/modules`);
}

export async function setTenantModule(tenantId: string, moduleKey: string, enabled: boolean): Promise<TenantModule> {
  return httpRequest<TenantModule>(`/api/v1/tenants/${tenantId}/modules/${moduleKey}`, {
    method: "PATCH",
    body: { enabled }
  });
}

export type StaffRole = "doctor" | "resident" | "nurse" | "receptionist" | "accountant";

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  doctor: "Medico",
  resident: "Residente",
  nurse: "Enfermeria",
  receptionist: "Recepcion",
  accountant: "Contabilidad"
};

export type StaffMember = {
  id: string;
  full_name: string;
  role: StaffRole;
  specialty: string;
  email: string;
  is_active: boolean;
};

export type StaffCreatePayload = {
  full_name: string;
  role: StaffRole;
  specialty: string;
  email: string;
  password: string;
};

export type StaffUpdatePayload = {
  full_name?: string;
  specialty?: string;
  email?: string;
  is_active?: boolean;
};

export type StaffPasswordResetResult = {
  id: string;
  email: string;
  new_password: string;
};

export async function listTenantStaff(tenantId: string, role?: StaffRole): Promise<StaffMember[]> {
  const query = role ? `?role=${role}` : "";
  return httpRequest<StaffMember[]>(`/api/v1/tenants/${tenantId}/staff${query}`);
}

export async function createTenantStaff(tenantId: string, payload: StaffCreatePayload): Promise<StaffMember> {
  return httpRequest<StaffMember>(`/api/v1/tenants/${tenantId}/staff`, {
    method: "POST",
    body: payload
  });
}

export async function updateTenantStaff(tenantId: string, userId: string, payload: StaffUpdatePayload): Promise<StaffMember> {
  return httpRequest<StaffMember>(`/api/v1/tenants/${tenantId}/staff/${userId}`, {
    method: "PATCH",
    body: payload
  });
}

export async function deleteTenantStaff(tenantId: string, userId: string): Promise<void> {
  await httpRequest(`/api/v1/tenants/${tenantId}/staff/${userId}`, {
    method: "DELETE"
  });
}

export async function resetTenantStaffPassword(tenantId: string, userId: string): Promise<StaffPasswordResetResult> {
  return httpRequest<StaffPasswordResetResult>(`/api/v1/tenants/${tenantId}/staff/${userId}/reset-password`, {
    method: "POST"
  });
}

export async function forceStaffLogout(tenantId: string, userId: string): Promise<void> {
  await httpRequest(`/api/v1/tenants/${tenantId}/staff/${userId}/force-logout`, {
    method: "POST"
  });
}

export type TenantAdminSummary = {
  id: string;
  full_name: string;
  role: "clinic_admin";
  specialty: string;
  email: string;
  is_active: boolean;
};

export async function getTenantAdmin(tenantId: string): Promise<TenantAdminSummary> {
  return httpRequest<TenantAdminSummary>(`/api/v1/tenants/${tenantId}/admin`);
}

export async function resetTenantAdminPassword(tenantId: string): Promise<StaffPasswordResetResult> {
  return httpRequest<StaffPasswordResetResult>(`/api/v1/tenants/${tenantId}/admin/reset-password`, {
    method: "POST"
  });
}

export async function forceTenantAdminLogout(tenantId: string): Promise<void> {
  await httpRequest(`/api/v1/tenants/${tenantId}/admin/force-logout`, {
    method: "POST"
  });
}

export async function forceTenantLogout(tenantId: string): Promise<void> {
  await httpRequest(`/api/v1/tenants/${tenantId}/force-logout`, {
    method: "POST"
  });
}

export type TenantDashboardEntry = {
  tenant_id: string;
  name: string;
  status: TenantStatus;
  patients_count: number;
  appointments_count: number;
  encounters_count: number;
  billing_pending: number;
  billing_paid: number;
  staff_count: number;
  last_activity_at: string | null;
  prescriptions_count: number;
  lab_orders_count: number;
  appointments_completed: number;
  appointments_cancelled: number;
  modules_active: number;
  modules_total: number;
};

export type TenantDashboardTotals = {
  patients: number;
  appointments: number;
  encounters: number;
  billing_pending: number;
  billing_paid: number;
  staff: number;
  prescriptions: number;
  lab_orders: number;
  appointments_completed: number;
  appointments_cancelled: number;
};

export type TenantDashboardResponse = {
  tenants: TenantDashboardEntry[];
  totals: TenantDashboardTotals;
};

export async function getTenantsDashboard(): Promise<TenantDashboardResponse> {
  return httpRequest<TenantDashboardResponse>("/api/v1/tenants/dashboard");
}

export type TenantTechnicalStats = {
  tenant_id: string;
  table_count: number;
  size_mb: number;
  approx_rows: number;
  last_updated: string | null;
};

export async function getTenantsTechnicalMetrics(): Promise<TenantTechnicalStats[]> {
  return httpRequest<TenantTechnicalStats[]>("/api/v1/tenants/technical-metrics");
}

export type TenantTableStats = {
  table_name: string;
  approx_rows: number;
  size_mb: number;
  last_updated: string | null;
};

export async function getTenantDatabaseTables(tenantId: string): Promise<TenantTableStats[]> {
  return httpRequest<TenantTableStats[]>(`/api/v1/tenants/${tenantId}/database-tables`);
}

export type ChargeStatus = "pending" | "paid" | "void";

export type PlatformCharge = {
  id: string;
  invoice_number: number;
  tenant_id: string;
  period_label: string;
  amount: string;
  currency: string;
  status: ChargeStatus;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
};

export type PlatformChargesResponse = {
  charges: PlatformCharge[];
  totals: { pending: string; paid: string; void: string };
};

export async function listPlatformCharges(tenantId?: string): Promise<PlatformChargesResponse> {
  const qs = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : "";
  return httpRequest<PlatformChargesResponse>(`/api/v1/platform-admin/billing${qs}`);
}

export async function createPlatformCharge(payload: {
  tenant_id: string;
  period_label: string;
  amount: string;
  due_date?: string;
  notes?: string;
}): Promise<PlatformCharge> {
  return httpRequest<PlatformCharge>("/api/v1/platform-admin/billing", { method: "POST", body: payload });
}

export async function updatePlatformChargeStatus(chargeId: string, status: ChargeStatus): Promise<PlatformCharge> {
  return httpRequest<PlatformCharge>(`/api/v1/platform-admin/billing/${chargeId}`, { method: "PATCH", body: { status } });
}

/**
 * El PDF requiere el Authorization header (no se puede pegar un <a href>
 * plano a un endpoint autenticado), asi que se trae como blob y se abre en
 * una pestana nueva -- el backend ya manda Content-Disposition: inline,
 * el navegador lo renderiza directo en su visor de PDF.
 */
export async function openPlatformChargeInvoice(chargeId: string): Promise<void> {
  const token = useAuthStore.getState().token ?? getStoredToken();
  const response = await fetch(`${API_URL}/api/v1/platform-admin/billing/${chargeId}/invoice.pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) {
    throw new ApiError("No se pudo generar la factura.", response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
