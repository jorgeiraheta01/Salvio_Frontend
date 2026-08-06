"use client";

import { useState } from "react";
import { Building2, CheckCircle2, Copy, Plus, Trash2, Wand2 } from "lucide-react";

import { ApiError } from "@/core/api/http-client";
import { MEDICAL_SPECIALTIES } from "@/modules/auth/constants/specialties";
import { provisionTenant, type DoctorSeed, type TenantProvisionResult } from "@/modules/auth/services/platform-admin.service";
import { generateStrongPassword } from "@/modules/auth/utils/generate-password";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Modal } from "@/shared/components/ui/modal";
import { Select } from "@/shared/components/ui/select";

type DraftDoctor = DoctorSeed & { _key: string };

type Step = 1 | 2 | 3;

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function StepIndicator({ step }: { step: Step }) {
  const steps: { n: Step; label: string }[] = [
    { n: 1, label: "Clinica" },
    { n: 2, label: "Equipo medico" },
    { n: 3, label: "Confirmar" }
  ];
  return (
    <div className="mb-6 flex items-center gap-2">
      {steps.map((s, idx) => (
        <div key={s.n} className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              step === s.n ? "bg-brand text-white" : step > s.n ? "bg-brand/20 text-brand" : "bg-slate-100 text-slate-400"
            }`}
          >
            {step > s.n ? <CheckCircle2 className="h-4 w-4" /> : s.n}
          </div>
          <span className={`text-xs font-medium ${step === s.n ? "text-slate-900" : "text-slate-400"}`}>{s.label}</span>
          {idx < steps.length - 1 ? <div className="mx-1 h-px w-6 bg-slate-200" /> : null}
        </div>
      ))}
    </div>
  );
}

function CredentialRow({ label, email, password }: { label: string; email: string; password: string }) {
  const [copied, setCopied] = useState(false);

  function onCopy() {
    navigator.clipboard?.writeText(`${email} / ${password}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-800">{email}</p>
        <p className="font-mono text-sm text-slate-600">{password}</p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onCopy}>
        <Copy className="mr-1.5 h-3.5 w-3.5" />
        {copied ? "Copiado" : "Copiar"}
      </Button>
    </div>
  );
}

export function CreateClinicWizard({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState<Step>(1);

  const [tenantName, setTenantName] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [tenantIdTouched, setTenantIdTouched] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState(() => generateStrongPassword());

  const [doctors, setDoctors] = useState<DraftDoctor[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TenantProvisionResult | null>(null);

  function reset() {
    setStep(1);
    setTenantName("");
    setTenantId("");
    setTenantIdTouched(false);
    setAdminEmail("");
    setAdminPassword(generateStrongPassword());
    setDoctors([]);
    setError(null);
    setResult(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function onTenantNameChange(value: string) {
    setTenantName(value);
    if (!tenantIdTouched) {
      setTenantId(slugify(value));
    }
  }

  function addDoctor() {
    setDoctors((prev) => [
      ...prev,
      { _key: crypto.randomUUID(), full_name: "", specialty: MEDICAL_SPECIALTIES[0], email: "", password: generateStrongPassword() }
    ]);
  }

  function updateDoctor(key: string, patch: Partial<DraftDoctor>) {
    setDoctors((prev) => prev.map((d) => (d._key === key ? { ...d, ...patch } : d)));
  }

  function removeDoctor(key: string) {
    setDoctors((prev) => prev.filter((d) => d._key !== key));
  }

  function validateStep1(): string | null {
    if (!tenantName.trim()) return "Ingresa el nombre de la clinica.";
    if (!tenantId.trim() || !/^[a-z0-9_]+$/.test(tenantId)) return "El identificador solo puede tener minusculas, numeros y guion bajo.";
    if (!adminEmail.trim()) return "Ingresa el correo del administrador.";
    if (adminPassword.length < 8) return "La contrasena del administrador debe tener al menos 8 caracteres.";
    return null;
  }

  function validateStep2(): string | null {
    for (const doc of doctors) {
      if (!doc.full_name.trim()) return "Cada medico necesita un nombre.";
      if (!doc.email.trim()) return "Cada medico necesita un correo.";
      if (doc.password.length < 8) return "La contrasena de cada medico debe tener al menos 8 caracteres.";
    }
    const emails = [adminEmail.trim().toLowerCase(), ...doctors.map((d) => d.email.trim().toLowerCase())];
    if (new Set(emails).size !== emails.length) return "Hay correos repetidos entre el administrador y los medicos.";
    return null;
  }

  function goNext() {
    setError(null);
    if (step === 1) {
      const err = validateStep1();
      if (err) {
        setError(err);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const err = validateStep2();
      if (err) {
        setError(err);
        return;
      }
      setStep(3);
    }
  }

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const created = await provisionTenant({
        tenant_id: tenantId,
        tenant_name: tenantName.trim(),
        admin_email: adminEmail.trim(),
        admin_password: adminPassword,
        doctors: doctors.map(({ _key, ...doc }) => ({ ...doc, full_name: doc.full_name.trim(), email: doc.email.trim() }))
      });
      setResult(created);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la clinica.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <Modal open={open} onClose={handleClose} title="Clinica creada" description="Guarda estas credenciales ahora — no se podran volver a mostrar.">
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span>
              <strong>{result.tenant_name}</strong> quedo lista en el subdominio <strong>{result.tenant_id}</strong>.
            </span>
          </div>
          <CredentialRow label="Administrador" email={result.admin_email} password={adminPassword} />
          {doctors.map((doc) => (
            <CredentialRow key={doc._key} label={`Dr(a). ${doc.full_name} — ${doc.specialty}`} email={doc.email} password={doc.password} />
          ))}
          <Button type="button" className="w-full" onClick={handleClose}>
            Listo
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title="Nueva clinica" description="Da de alta una clinica y su equipo medico inicial." className="max-w-xl">
      <StepIndicator step={step} />

      {step === 1 ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre de la clinica</Label>
            <Input value={tenantName} onChange={(e) => onTenantNameChange(e.target.value)} placeholder="Clinica Dental Sonrisa" />
          </div>
          <div className="space-y-1.5">
            <Label>Identificador (subdominio)</Label>
            <Input
              value={tenantId}
              onChange={(e) => {
                setTenantIdTouched(true);
                setTenantId(slugify(e.target.value));
              }}
              placeholder="clinica_sonrisa"
            />
            <p className="text-xs text-slate-400">Sera el subdominio de acceso: {tenantId || "identificador"}.localhost</p>
          </div>
          <div className="space-y-1.5">
            <Label>Correo del administrador</Label>
            <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@clinica.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Contrasena del administrador</Label>
            <div className="flex gap-2">
              <Input value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="font-mono" />
              <Button type="button" variant="outline" onClick={() => setAdminPassword(generateStrongPassword())} title="Generar contrasena">
                <Wand2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Agrega los medicos de <strong>{tenantName}</strong>. Puedes omitir este paso y agregarlos despues.
            </p>
          </div>
          <div className="space-y-3">
            {doctors.map((doc) => (
              <div key={doc._key} className="space-y-2 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Medico</p>
                  <button type="button" onClick={() => removeDoctor(doc._key)} className="text-slate-400 hover:text-red-600" aria-label="Quitar medico">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    value={doc.full_name}
                    onChange={(e) => updateDoctor(doc._key, { full_name: e.target.value })}
                    placeholder="Nombre completo"
                  />
                  <Select value={doc.specialty} onChange={(e) => updateDoctor(doc._key, { specialty: e.target.value })}>
                    {MEDICAL_SPECIALTIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="email"
                    value={doc.email}
                    onChange={(e) => updateDoctor(doc._key, { email: e.target.value })}
                    placeholder="correo@clinica.com"
                  />
                  <div className="flex gap-2">
                    <Input
                      value={doc.password}
                      onChange={(e) => updateDoctor(doc._key, { password: e.target.value })}
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => updateDoctor(doc._key, { password: generateStrongPassword() })}
                      title="Generar contrasena"
                    >
                      <Wand2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" onClick={addDoctor} className="w-full">
            <Plus className="mr-1.5 h-4 w-4" />
            Agregar medico
          </Button>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Clinica</p>
            <p className="text-sm font-semibold text-slate-800">{tenantName}</p>
            <p className="text-sm text-slate-500">{tenantId}.localhost</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">Administrador</p>
            <p className="text-sm text-slate-700">{adminEmail}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Equipo medico ({doctors.length})</p>
            {doctors.length === 0 ? (
              <p className="text-sm text-slate-400">Sin medicos todavia — podras agregarlos despues.</p>
            ) : (
              <ul className="space-y-1">
                {doctors.map((doc) => (
                  <li key={doc._key} className="text-sm text-slate-700">
                    {doc.full_name || "(sin nombre)"} — {doc.specialty}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="mt-6 flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" onClick={() => (step === 1 ? handleClose() : setStep((step - 1) as Step))}>
          {step === 1 ? "Cancelar" : "Atras"}
        </Button>
        {step < 3 ? (
          <Button type="button" onClick={goNext}>
            Continuar
          </Button>
        ) : (
          <Button type="button" onClick={onSubmit} disabled={submitting}>
            {submitting ? "Creando..." : (
              <>
                <Building2 className="mr-1.5 h-4 w-4" />
                Crear clinica
              </>
            )}
          </Button>
        )}
      </div>
    </Modal>
  );
}
