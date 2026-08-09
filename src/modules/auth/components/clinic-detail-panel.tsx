"use client";

import { useEffect, useState } from "react";
import { Copy, KeyRound, LogOut, MonitorSmartphone, Pencil, Plus, ShieldAlert, ShieldCheck, Trash2, Wand2, X } from "lucide-react";

import { ApiError } from "@/core/api/http-client";
import { MEDICAL_SPECIALTIES } from "@/modules/auth/constants/specialties";
import {
  createTenantStaff,
  deleteTenantStaff,
  forceStaffLogout,
  forceTenantAdminLogout,
  getTenantAdmin,
  getTenantLoginActivity,
  listTenantStaff,
  resetTenantAdminPassword,
  resetTenantStaffPassword,
  updateTenant,
  updateTenantStaff,
  STAFF_ROLE_LABELS,
  type StaffMember,
  type StaffRole,
  type TenantAdminSummary,
  type TenantLoginActivityEntry,
  type TenantSummary
} from "@/modules/auth/services/platform-admin.service";
import { generateStrongPassword } from "@/modules/auth/utils/generate-password";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select } from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { emailValidationError } from "@/shared/utils/email-validation";
import { formatServerDateTime } from "@/shared/utils/dates";
import { tenantUrl } from "@/shared/utils/tenant";

const STAFF_ROLES: StaffRole[] = ["doctor", "resident", "nurse", "receptionist", "accountant"];

function useCopy() {
  const [copied, setCopied] = useState(false);
  function copy(text: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return { copied, copy };
}

export function ClinicUrlRow({ tenantId }: { tenantId: string }) {
  const { copied, copy } = useCopy();
  const url = tenantUrl(tenantId);

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-brand/30 bg-brand/5 px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-brand">URL de acceso de la clinica</p>
        <p className="truncate text-sm font-semibold text-slate-800">{url}</p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => copy(url)}>
        <Copy className="mr-1.5 h-3.5 w-3.5" />
        {copied ? "Copiado" : "Copiar"}
      </Button>
    </div>
  );
}

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
  const { copied, copy } = useCopy();

  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [loggedOutOk, setLoggedOutOk] = useState(false);

  function shareText(password?: string) {
    const lines = [
      `Acceso a ${STAFF_ROLE_LABELS[member.role]} en Salvio`,
      `URL: ${tenantUrl(tenantId)}`,
      `Correo: ${member.email}`
    ];
    if (password) lines.push(`Contrasena: ${password}`);
    return lines.join("\n");
  }

  async function onSave() {
    const emailError = emailValidationError(email);
    if (emailError) {
      setError(emailError);
      return;
    }
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
        {member.role === "doctor" || member.role === "resident" ? (
          <Select value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
            {MEDICAL_SPECIALTIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        ) : null}
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
            onClick={() => copy(shareText())}
            className="p-1 text-slate-400 hover:text-brand"
            aria-label={`Copiar datos de acceso de ${member.full_name}`}
            title="Copiar URL y correo para compartir"
          >
            <Copy className="h-4 w-4" />
          </button>
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
      {copied ? <p className="mt-1 text-xs text-emerald-700">Datos copiados — listos para pegar y enviar.</p> : null}
      {resetResult ? (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <span>
            Contrasena nueva: <span className="font-mono">{resetResult}</span>
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => copy(shareText(resetResult))} className="font-semibold underline" title="Copiar URL, correo y contrasena">
              Copiar todo
            </button>
            <button type="button" onClick={() => setResetResult(null)} aria-label="Cerrar">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
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
  const { copied, copy } = useCopy();

  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [loggedOutOk, setLoggedOutOk] = useState(false);

  function shareText(password?: string) {
    const lines = ["Acceso de Administrador en Salvio", `URL: ${tenantUrl(tenantId)}`, `Correo: ${admin?.email ?? ""}`];
    if (password) lines.push(`Contrasena: ${password}`);
    return lines.join("\n");
  }

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
                  onClick={() => copy(shareText())}
                  className="p-1 text-slate-400 hover:text-brand"
                  aria-label={`Copiar datos de acceso de ${admin.full_name}`}
                  title="Copiar URL y correo para compartir"
                >
                  <Copy className="h-4 w-4" />
                </button>
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
            {copied ? <p className="mt-1 text-xs text-emerald-700">Datos copiados — listos para pegar y enviar.</p> : null}
            {resetResult ? (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                <span>
                  Contrasena nueva: <span className="font-mono">{resetResult}</span>
                </span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => copy(shareText(resetResult))} className="font-semibold underline" title="Copiar URL, correo y contrasena">
                    Copiar todo
                  </button>
                  <button type="button" onClick={() => setResetResult(null)} aria-label="Cerrar">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
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
    const emailError = emailValidationError(email);
    if (emailError) {
      setFormError(emailError);
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

  const { copied: teamCopied, copy: copyTeam } = useCopy();

  function copyWholeTeam() {
    const doctors = staff.filter((m) => m.role === "doctor" || m.role === "resident");
    const admin = staff.filter((m) => m.role !== "doctor" && m.role !== "resident");
    const lines = [`Equipo en Salvio`, `URL: ${tenantUrl(tenantId)}`, ""];
    if (doctors.length > 0) {
      lines.push("Medicos:");
      doctors.forEach((m) => lines.push(`- ${m.full_name} (${m.email})`));
      lines.push("");
    }
    if (admin.length > 0) {
      lines.push("Administrativo:");
      admin.forEach((m) => lines.push(`- ${m.full_name} (${m.email})`));
    }
    copyTeam(lines.join("\n").trim());
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Equipo (medicos y administrativo)</p>
        <div className="flex items-center gap-2">
          {staff.length > 0 ? (
            <Button type="button" variant="outline" size="sm" onClick={copyWholeTeam} title="Copiar URL + nombres y correos de todo el equipo">
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              {teamCopied ? "Copiado" : "Copiar equipo"}
            </Button>
          ) : null}
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
      </div>
      {staff.length > 0 ? (
        <p className="mt-1 text-[11px] text-slate-400">
          &quot;Copiar equipo&quot; incluye nombres y correos, no contrasenas ya asignadas (esas solo se conocen al crear o resetear a cada persona).
        </p>
      ) : null}

      {formOpen ? (
        <div className="mt-3 space-y-2 rounded-lg border border-slate-200 p-3">
          {created ? (
            <div className="space-y-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <p>
                <strong>{created.full_name}</strong> ({STAFF_ROLE_LABELS[created.role]}) creado. Correo: {created.email} — Contrasena:{" "}
                <span className="font-mono">{password}</span>
              </p>
              <p className="truncate text-xs text-emerald-700">{tenantUrl(tenantId)}</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    navigator.clipboard?.writeText(
                      `Acceso a ${STAFF_ROLE_LABELS[created.role]} en Salvio\nURL: ${tenantUrl(tenantId)}\nCorreo: ${created.email}\nContrasena: ${password}`
                    )
                  }
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copiar todo
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setFormOpen(false)}>
                  Listo
                </Button>
              </div>
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

      <div className="mt-3 space-y-4">
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((k) => (
              <Skeleton key={k} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : staff.length === 0 ? (
          <p className="text-sm text-slate-400">Sin equipo todavia.</p>
        ) : (
          <>
            {(() => {
              const doctors = staff.filter((m) => m.role === "doctor" || m.role === "resident");
              const admin = staff.filter((m) => m.role !== "doctor" && m.role !== "resident");
              return (
                <>
                  {doctors.length > 0 ? (
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Medicos</p>
                      <div className="space-y-2">
                        {doctors.map((member) => (
                          <StaffRow key={member.id} tenantId={tenantId} member={member} onUpdated={onMemberUpdated} onRemove={setRemoving} />
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {admin.length > 0 ? (
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Administrativo</p>
                      <div className="space-y-2">
                        {admin.map((member) => (
                          <StaffRow key={member.id} tenantId={tenantId} member={member} onUpdated={onMemberUpdated} onRemove={setRemoving} />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              );
            })()}
          </>
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

const LOGIN_ACTIVITY_DAYS = 30;

function LoginActivitySection({ tenantId }: { tenantId: string }) {
  const [entries, setEntries] = useState<TenantLoginActivityEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getTenantLoginActivity(tenantId, LOGIN_ACTIVITY_DAYS)
      .then(setEntries)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar los accesos."))
      .finally(() => setLoading(false));
  }, [tenantId]);

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Accesos recientes (ultimos {LOGIN_ACTIVITY_DAYS} dias)</p>
        {entries && entries.length > 0 ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
            {entries.length} IP{entries.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : error ? (
        <p className="mt-2 text-sm text-red-700">{error}</p>
      ) : !entries || entries.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">Sin inicios de sesion registrados todavia en este periodo.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {entries.map((entry) => (
            <div key={entry.ip_address} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
              <div className="flex items-start gap-2 min-w-0">
                <MonitorSmartphone className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-slate-800">{entry.ip_address}</p>
                  <p className="truncate text-xs text-slate-500">{entry.users.length > 0 ? entry.users.join(", ") : "Usuario desconocido"}</p>
                </div>
              </div>
              <div className="flex-shrink-0 text-right text-xs text-slate-400">
                <p>{entry.login_count} inicio{entry.login_count === 1 ? "" : "s"}</p>
                <p>{formatServerDateTime(entry.last_seen)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Panel completo de una clinica: pensado para vivir en una pagina propia
 * (no en un modal) -- arranca en modo solo-lectura y el lapiz arriba a la
 * derecha del bloque de info basica habilita la edicion (nombre, representante
 * de facturacion, estado). Admin y Equipo son secciones de gestion aparte,
 * siempre con sus propias acciones (no dependen de este toggle).
 */
export function ClinicDetailPanel({ tenant, onUpdated }: { tenant: TenantSummary; onUpdated: (updated: TenantSummary) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tenant.name);
  const [billingContactName, setBillingContactName] = useState(tenant.billing_contact_name ?? "");
  const [billingContactPhone, setBillingContactPhone] = useState(tenant.billing_contact_phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [savingBillingContact, setSavingBillingContact] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  useEffect(() => {
    setName(tenant.name);
    setBillingContactName(tenant.billing_contact_name ?? "");
    setBillingContactPhone(tenant.billing_contact_phone ?? "");
    setError(null);
  }, [tenant]);

  async function onSaveName() {
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
    <div className="space-y-4">
      <ClinicUrlRow tenantId={tenant.tenant_id} />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Informacion de la clinica</p>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className={editing ? "p-1 text-brand" : "p-1 text-slate-400 hover:text-brand"}
            aria-label={editing ? "Salir de edicion" : "Editar informacion de la clinica"}
            title={editing ? "Salir de edicion" : "Editar"}
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>

        {editing ? (
          <div className="mt-3 space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre de la clinica</Label>
              <div className="flex gap-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
                <Button type="button" variant="outline" onClick={onSaveName} disabled={savingName || name.trim() === tenant.name}>
                  {savingName ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>

            <div>
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

            <div>
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

            {error ? <p className="text-sm text-red-700">{error}</p> : null}
          </div>
        ) : (
          <div className="mt-3 space-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-400">Nombre</p>
              <p className="font-semibold text-slate-800">{tenant.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Representante de facturacion</p>
              <p className="text-slate-700">
                {tenant.billing_contact_name ? `${tenant.billing_contact_name}${tenant.billing_contact_phone ? ` · ${tenant.billing_contact_phone}` : ""}` : "Sin asignar"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Estado</p>
              <p className={isActive ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>{isActive ? "Activa" : "Bloqueada"}</p>
            </div>
          </div>
        )}
      </div>

      <AdminSection tenantId={tenant.tenant_id} />
      </div>

      <StaffSection tenantId={tenant.tenant_id} />

      <LoginActivitySection tenantId={tenant.tenant_id} />
    </div>
  );
}
