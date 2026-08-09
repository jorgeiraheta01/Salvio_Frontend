"use client";

import { useEffect, useState } from "react";
import { KeyRound, LogOut, Pencil, Plus, ShieldAlert, ShieldCheck, Trash2, Wand2, X } from "lucide-react";

import { ApiError } from "@/core/api/http-client";
import { MEDICAL_SPECIALTIES } from "@/modules/auth/constants/specialties";
import {
  createTenantStaff,
  deleteTenantStaff,
  forceStaffLogout,
  forceTenantAdminLogout,
  getTenantAdmin,
  listTenantStaff,
  resetTenantAdminPassword,
  resetTenantStaffPassword,
  updateTenant,
  updateTenantStaff,
  STAFF_ROLE_LABELS,
  type StaffMember,
  type StaffRole,
  type TenantAdminSummary,
  type TenantSummary
} from "@/modules/auth/services/platform-admin.service";
import { generateStrongPassword } from "@/modules/auth/utils/generate-password";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Modal } from "@/shared/components/ui/modal";
import { Select } from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";

const STAFF_ROLES: StaffRole[] = ["doctor", "resident", "nurse", "receptionist", "accountant"];

function StaffRow({
  tenantId,
  member,
  onUpdated,
  onRemove
}: {
  tenantId: string;
  member: StaffMember;
  onUpdated: (updated: StaffMember) => void;
  onRemove: (member: StaffMember) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(member.full_name);
  const [specialty, setSpecialty] = useState(member.specialty);
  const [email, setEmail] = useState(member.email);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [loggedOutOk, setLoggedOutOk] = useState(false);

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateTenantStaff(tenantId, member.id, { full_name: fullName.trim(), specialty: specialty.trim(), email: email.trim() });
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el cambio.");
    } finally {
      setSaving(false);
    }
  }

  async function onResetPassword() {
    setResetting(true);
    setError(null);
    try {
      const result = await resetTenantStaffPassword(tenantId, member.id);
      setResetResult(result.new_password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo restablecer la contrasena.");
    } finally {
      setResetting(false);
    }
  }

  async function onConfirmLogout() {
    setLoggingOut(true);
    setError(null);
    try {
      await forceStaffLogout(tenantId, member.id);
      setConfirmingLogout(false);
      setLoggedOutOk(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cerrar la sesion.");
    } finally {
      setLoggingOut(false);
    }
  }

  if (editing) {
    return (
      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nombre completo" />
        <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Especialidad / area (opcional)" />
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@clinica.com" />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={onSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-slate-800">{member.full_name}</p>
            <span className="flex-shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {STAFF_ROLE_LABELS[member.role]}
            </span>
            {!member.is_active ? (
              <span className="flex-shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-600">
                Inactivo
              </span>
            ) : null}
          </div>
          <p className="truncate text-xs text-slate-400">
            {member.specialty ? `${member.specialty} · ` : ""}
            {member.email}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setConfirmingLogout(true)}
            disabled={loggingOut}
            className="p-1 text-slate-400 hover:text-red-600"
            aria-label={`Cerrar sesion de ${member.full_name}`}
            title="Cerrar sesion"
          >
            <LogOut className="h-4 w-4" />
          </button>
          <button type="button" onClick={onResetPassword} disabled={resetting} className="p-1 text-slate-400 hover:text-brand" aria-label={`Restablecer contrasena de ${member.full_name}`} title="Restablecer contrasena">
            <KeyRound className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setEditing(true)} className="p-1 text-slate-400 hover:text-slate-700" aria-label={`Editar a ${member.full_name}`} title="Editar">
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onRemove(member)} className="p-1 text-slate-400 hover:text-red-600" aria-label={`Eliminar a ${member.full_name}`} title="Eliminar">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {resetResult ? (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <span>
            Contrasena nueva: <span className="font-mono">{resetResult}</span>
          </span>
          <button type="button" onClick={() => setResetResult(null)} aria-label="Cerrar">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
      {loggedOutOk ? (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <span>Sesion cerrada. Debera iniciar sesion de nuevo.</span>
          <button type="button" onClick={() => setLoggedOutOk(false)} aria-label="Cerrar">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
      <ConfirmDialog
        open={confirmingLogout}
        title="Cerrar sesion"
        description={`${member.full_name} perdera su sesion activa de inmediato y tendra que iniciar sesion de nuevo.`}
        confirmLabel="Cerrar sesion"
        destructive
        onCancel={() => setConfirmingLogout(false)}
        onConfirm={onConfirmLogout}
      />
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}

function AdminSection({ tenantId }: { tenantId: string }) {
  const [admin, setAdmin] = useState<TenantAdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [loggedOutOk, setLoggedOutOk] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getTenantAdmin(tenantId)
      .then(setAdmin)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la cuenta administradora."))
      .finally(() => setLoading(false));
  }, [tenantId]);

  async function onResetPassword() {
    setResetting(true);
    setError(null);
    try {
      const result = await resetTenantAdminPassword(tenantId);
      setResetResult(result.new_password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo restablecer la contrasena.");
    } finally {
      setResetting(false);
    }
  }

  async function onConfirmLogout() {
    setLoggingOut(true);
    setError(null);
    try {
      await forceTenantAdminLogout(tenantId);
      setConfirmingLogout(false);
      setLoggedOutOk(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cerrar la sesion.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Administrador de la clinica</p>
      <div className="mt-3">
        {loading ? (
          <Skeleton className="h-12 w-full" />
        ) : error && !admin ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : admin ? (
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{admin.full_name}</p>
                <p className="truncate text-xs text-slate-400">{admin.email}</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setConfirmingLogout(true)}
                  disabled={loggingOut}
                  className="p-1 text-slate-400 hover:text-red-600"
                  aria-label={`Cerrar sesion de ${admin.full_name}`}
                  title="Cerrar sesion"
                >
                  <LogOut className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onResetPassword}
                  disabled={resetting}
                  className="p-1 text-slate-400 hover:text-brand"
                  aria-label={`Restablecer contrasena de ${admin.full_name}`}
                  title="Restablecer contrasena"
                >
                  <KeyRound className="h-4 w-4" />
                </button>
              </div>
            </div>
            {resetResult ? (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                <span>
                  Contrasena nueva: <span className="font-mono">{resetResult}</span>
                </span>
                <button type="button" onClick={() => setResetResult(null)} aria-label="Cerrar">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
            {loggedOutOk ? (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                <span>Sesion cerrada. Debera iniciar sesion de nuevo.</span>
                <button type="button" onClick={() => setLoggedOutOk(false)} aria-label="Cerrar">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
            {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
          </div>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirmingLogout}
        title="Cerrar sesion del administrador"
        description={`${admin?.full_name ?? "El administrador"} perdera su sesion activa de inmediato y tendra que iniciar sesion de nuevo.`}
        confirmLabel="Cerrar sesion"
        destructive
        onCancel={() => setConfirmingLogout(false)}
        onConfirm={onConfirmLogout}
      />
    </div>
  );
}

function StaffSection({ tenantId }: { tenantId: string }) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<StaffMember | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<StaffRole>("doctor");
  const [specialty, setSpecialty] = useState(MEDICAL_SPECIALTIES[0]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(() => generateStrongPassword());
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<StaffMember | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    listTenantStaff(tenantId)
      .then(setStaff)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el equipo."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  function resetForm() {
    setFullName("");
    setRole("doctor");
    setSpecialty(MEDICAL_SPECIALTIES[0]);
    setEmail("");
    setPassword(generateStrongPassword());
    setFormError(null);
    setCreated(null);
  }

  async function onCreateStaff() {
    setFormError(null);
    if (!fullName.trim() || !email.trim()) {
      setFormError("Ingresa nombre y correo.");
      return;
    }
    if (password.length < 8) {
      setFormError("La contrasena debe tener al menos 8 caracteres.");
      return;
    }
    setCreating(true);
    try {
      const member = await createTenantStaff(tenantId, {
        full_name: fullName.trim(),
        role,
        specialty: role === "doctor" || role === "resident" ? specialty : "",
        email: email.trim(),
        password
      });
      setStaff((prev) => [...prev, member].sort((a, b) => a.full_name.localeCompare(b.full_name)));
      setCreated(member);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "No se pudo crear el registro.");
    } finally {
      setCreating(false);
    }
  }

  async function onConfirmRemove() {
    if (!removing) return;
    await deleteTenantStaff(tenantId, removing.id);
    setStaff((prev) => prev.filter((m) => m.id !== removing.id));
    setRemoving(null);
  }

  function onMemberUpdated(updated: StaffMember) {
    setStaff((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Equipo (medicos y administrativo)</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            resetForm();
            setFormOpen((v) => !v);
          }}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Agregar
        </Button>
      </div>

      {formOpen ? (
        <div className="mt-3 space-y-2 rounded-lg border border-slate-200 p-3">
          {created ? (
            <div className="space-y-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <p>
                <strong>{created.full_name}</strong> ({STAFF_ROLE_LABELS[created.role]}) creado. Correo: {created.email} — Contrasena:{" "}
                <span className="font-mono">{password}</span>
              </p>
              <Button type="button" size="sm" variant="outline" onClick={() => setFormOpen(false)}>
                Listo
              </Button>
            </div>
          ) : (
            <>
              <Select value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {STAFF_ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nombre completo" />
              {role === "doctor" || role === "resident" ? (
                <Select value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
                  {MEDICAL_SPECIALTIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              ) : null}
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@clinica.com" />
              <div className="flex gap-2">
                <Input value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono" />
                <Button type="button" variant="outline" size="sm" onClick={() => setPassword(generateStrongPassword())} title="Generar contrasena">
                  <Wand2 className="h-4 w-4" />
                </Button>
              </div>
              {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
              <Button type="button" className="w-full" onClick={onCreateStaff} disabled={creating}>
                {creating ? "Creando..." : "Crear"}
              </Button>
            </>
          )}
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        {loading ? (
          [1, 2].map((k) => <Skeleton key={k} className="h-12 w-full" />)
        ) : error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : staff.length === 0 ? (
          <p className="text-sm text-slate-400">Sin equipo todavia.</p>
        ) : (
          staff.map((member) => <StaffRow key={member.id} tenantId={tenantId} member={member} onUpdated={onMemberUpdated} onRemove={setRemoving} />)
        )}
      </div>

      <ConfirmDialog
        open={!!removing}
        title="Eliminar miembro del equipo"
        description={`${removing?.full_name} perdera acceso a la clinica de inmediato.`}
        confirmLabel="Eliminar"
        destructive
        onCancel={() => setRemoving(null)}
        onConfirm={onConfirmRemove}
      />
    </div>
  );
}

export function EditTenantModal({
  tenant,
  onClose,
  onUpdated
}: {
  tenant: TenantSummary | null;
  onClose: () => void;
  onUpdated: (updated: TenantSummary) => void;
}) {
  const [name, setName] = useState("");
  const [billingContactName, setBillingContactName] = useState("");
  const [billingContactPhone, setBillingContactPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [savingBillingContact, setSavingBillingContact] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  useEffect(() => {
    setName(tenant?.name ?? "");
    setBillingContactName(tenant?.billing_contact_name ?? "");
    setBillingContactPhone(tenant?.billing_contact_phone ?? "");
    setError(null);
  }, [tenant]);

  if (!tenant) return null;

  async function onSaveName() {
    if (!tenant) return;
    if (!name.trim()) {
      setError("El nombre no puede quedar vacio.");
      return;
    }
    setSavingName(true);
    setError(null);
    try {
      const updated = await updateTenant(tenant.tenant_id, { name: name.trim() });
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar el nombre.");
    } finally {
      setSavingName(false);
    }
  }

  async function onSaveBillingContact() {
    if (!tenant) return;
    setSavingBillingContact(true);
    setError(null);
    try {
      const updated = await updateTenant(tenant.tenant_id, {
        billing_contact_name: billingContactName.trim(),
        billing_contact_phone: billingContactPhone.trim()
      });
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar el representante.");
    } finally {
      setSavingBillingContact(false);
    }
  }

  const billingContactUnchanged =
    billingContactName.trim() === (tenant.billing_contact_name ?? "") && billingContactPhone.trim() === (tenant.billing_contact_phone ?? "");

  const isActive = tenant.status === "active";

  async function onToggleStatus() {
    if (!tenant) return;
    setTogglingStatus(true);
    setError(null);
    try {
      const updated = await updateTenant(tenant.tenant_id, { status: isActive ? "suspended" : "active" });
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar el estado.");
    } finally {
      setTogglingStatus(false);
    }
  }

  return (
    <Modal open={!!tenant} onClose={onClose} title="Editar clinica" description={tenant.tenant_id}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Nombre de la clinica</Label>
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <Button type="button" variant="outline" onClick={onSaveName} disabled={savingName || name.trim() === tenant.name}>
              {savingName ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Representante de facturacion</p>
          <p className="mt-1 text-xs text-slate-500">A nombre de quien se emite la factura de esta clinica.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Input placeholder="Nombre del representante" value={billingContactName} onChange={(e) => setBillingContactName(e.target.value)} />
            <Input placeholder="Telefono" value={billingContactPhone} onChange={(e) => setBillingContactPhone(e.target.value)} />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={onSaveBillingContact}
            disabled={savingBillingContact || billingContactUnchanged}
          >
            {savingBillingContact ? "Guardando..." : "Guardar representante"}
          </Button>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Estado</p>
          <p className="mt-1 text-sm text-slate-600">
            {isActive
              ? "La clinica esta activa: sus usuarios pueden iniciar sesion con normalidad."
              : "La clinica esta bloqueada: nadie de esa clinica puede iniciar sesion."}
          </p>
          <Button
            type="button"
            variant={isActive ? "outline" : "default"}
            className={isActive ? "mt-3 border-red-200 text-red-700 hover:bg-red-50" : "mt-3"}
            onClick={onToggleStatus}
            disabled={togglingStatus}
          >
            {isActive ? <ShieldAlert className="mr-1.5 h-4 w-4" /> : <ShieldCheck className="mr-1.5 h-4 w-4" />}
            {togglingStatus ? "Actualizando..." : isActive ? "Bloquear clinica" : "Activar clinica"}
          </Button>
        </div>

        <AdminSection tenantId={tenant.tenant_id} />

        <StaffSection tenantId={tenant.tenant_id} />

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <Button type="button" variant="ghost" className="w-full" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}
