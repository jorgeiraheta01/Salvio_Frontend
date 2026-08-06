"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { createPatient } from "@/modules/patients/api/patient-resources.api";
import { useCurrentUser } from "@/core/auth/current-user";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/shared/utils/cn";
import { formatDui, formatNit, formatPhone } from "@/shared/utils/format";

const STEP_LABELS = ["Datos generales", "Contacto y emergencia", "Seguro"];

type FormData = {
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  genero: string;
  dui: string;
  nit: string;
  email: string;
  telefono: string;
  direccion: string;
  contactoNombre: string;
  contactoTelefono: string;
  contactoParentesco: string;
  tieneSeguro: boolean;
  tipoSeguro: "Particular" | "Seguro privado" | "Seguro social";
  numeroAfiliacion: string;
  empleador: string;
  cargo: string;
  telefonoTrabajo: string;
};

const INITIAL: FormData = {
  nombre: "",
  apellido: "",
  fechaNacimiento: "",
  genero: "",
  dui: "",
  nit: "",
  email: "",
  telefono: "",
  direccion: "",
  contactoNombre: "",
  contactoTelefono: "",
  contactoParentesco: "",
  tieneSeguro: true,
  tipoSeguro: "Particular",
  numeroAfiliacion: "",
  empleador: "",
  cargo: "",
  telefonoTrabajo: ""
};

function calculateAge(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  return Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

export function NewPatientScreen() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPatientId, setCreatedPatientId] = useState<string | null>(null);

  const age = useMemo(() => calculateAge(data.fechaNacimiento), [data.fechaNacimiento]);
  const isAdult = age === null ? true : age >= 18;
  const isSenior = age !== null && age >= 65;
  const isSocial = data.tieneSeguro && data.tipoSeguro === "Seguro social";

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function validateStep(current: number): string | null {
    if (current === 1) {
      if (!data.nombre.trim() || !data.apellido.trim() || !data.fechaNacimiento || !data.genero) {
        return "Completa nombre, apellido, fecha de nacimiento y genero.";
      }
      if (isAdult && !/^\d{8}-\d$/.test(data.dui.trim())) {
        return "El DUI es obligatorio para pacientes adultos y debe tener el formato 00000000-0.";
      }
    }
    if (current === 2 && isSenior) {
      if (!data.contactoNombre.trim() || !data.contactoTelefono.trim() || !data.contactoParentesco.trim()) {
        return "El contacto de emergencia es obligatorio para pacientes de 65 anos o mas.";
      }
    }
    return null;
  }

  function goNext() {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep((s) => Math.min(3, s + 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleSubmit() {
    if (isSocial && !data.numeroAfiliacion.trim()) {
      setError("El numero de afiliacion es obligatorio para seguro social.");
      return;
    }
    if (!currentUser) return;

    const insuranceTypeMap: Record<FormData["tipoSeguro"], string> = {
      Particular: "particular",
      "Seguro privado": "privado",
      "Seguro social": "ss_cotizante"
    };

    setSubmitting(true);
    setError(null);
    try {
      const patient = await createPatient({
        tenant_id: currentUser.tenantId,
        medical_record_number: "auto",
        first_name: data.nombre.trim(),
        last_name: data.apellido.trim(),
        date_of_birth: data.fechaNacimiento,
        gender: data.genero.toLowerCase() === "masculino" ? "male" : data.genero.toLowerCase() === "femenino" ? "female" : "other",
        insurance_type: data.tieneSeguro ? insuranceTypeMap[data.tipoSeguro] : "ninguno",
        dui: data.dui.trim() || undefined,
        nit: data.nit.trim() || undefined,
        email: data.email.trim() || undefined,
        phone: data.telefono.trim() || undefined,
        address: data.direccion.trim() || undefined,
        emergency_contact_name: data.contactoNombre.trim() || undefined,
        emergency_contact_phone: data.contactoTelefono.trim() || undefined,
        emergency_contact_relationship: data.contactoParentesco.trim() || undefined,
        insurance_number: isSocial ? data.numeroAfiliacion.trim() : undefined,
        last_employer: data.empleador.trim() || undefined,
        last_occupation: data.cargo.trim() || undefined,
        work_phone: data.telefonoTrabajo.trim() || undefined
      });
      setCreatedPatientId(patient.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el paciente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (createdPatientId) {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-brand">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="mt-2 text-xl font-extrabold text-slate-900">Paciente registrado</h2>
            <p className="text-sm text-slate-500">
              {data.nombre} {data.apellido} fue agregado al expediente clinico.
            </p>
            <Button className="mt-4" onClick={() => router.push(`/patients/${createdPatientId}`)}>
              Ver perfil del paciente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <button type="button" onClick={() => router.push("/patients")} className="text-sm font-semibold text-brand hover:underline">
          &larr; Volver a pacientes
        </button>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Registrar paciente nuevo</h1>
        <p className="mt-1 text-sm text-slate-500">Crear expediente clinico y datos administrativos del paciente.</p>
      </div>

      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex items-center">
          {STEP_LABELS.map((label, index) => {
            const num = index + 1;
            const done = num < step;
            const active = num === step;
            return (
              <div key={label} className="flex flex-1 items-center">
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold",
                      done ? "border-brand bg-brand text-white" : active ? "border-brand bg-brand-light text-brand" : "border-slate-200 bg-white text-slate-400"
                    )}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : num}
                  </div>
                  <p className={cn("whitespace-nowrap text-sm", active ? "font-bold text-slate-900" : "font-medium text-slate-400")}>{label}</p>
                </div>
                {num < 3 ? <div className={cn("mx-3 h-0.5 flex-1", done ? "bg-brand" : "bg-slate-200")} /> : null}
              </div>
            );
          })}
        </div>

        <Card>
          <CardContent className="space-y-4 p-6">
            {step === 1 ? (
              <>
                <p className="text-base font-bold text-slate-900">Datos generales</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Nombre *</Label>
                    <Input value={data.nombre} onChange={(e) => setField("nombre", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Apellido *</Label>
                    <Input value={data.apellido} onChange={(e) => setField("apellido", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fecha de nacimiento *</Label>
                    <Input type="date" value={data.fechaNacimiento} onChange={(e) => setField("fechaNacimiento", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Genero *</Label>
                    <Select value={data.genero} onChange={(e) => setField("genero", e.target.value)}>
                      <option value="">Seleccionar...</option>
                      <option value="Femenino">Femenino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Otro">Otro</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className={!isAdult ? "text-slate-400" : undefined}>{isAdult ? "DUI *" : "DUI (no aplica - menor de edad)"}</Label>
                    <Input value={data.dui} onChange={(e) => setField("dui", formatDui(e.target.value))} placeholder="00000000-0" maxLength={10} inputMode="numeric" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>NIT</Label>
                    <Input
                      value={data.nit}
                      onChange={(e) => setField("nit", formatNit(e.target.value))}
                      placeholder="0000-000000-000-0"
                      maxLength={17}
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Correo electronico</Label>
                    <Input value={data.email} onChange={(e) => setField("email", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Telefono</Label>
                    <Input value={data.telefono} onChange={(e) => setField("telefono", formatPhone(e.target.value))} placeholder="0000-0000" maxLength={9} inputMode="numeric" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Direccion</Label>
                  <Textarea value={data.direccion} onChange={(e) => setField("direccion", e.target.value)} />
                </div>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <p className="text-base font-bold text-slate-900">Contacto de emergencia</p>
                {isSenior ? (
                  <p className="rounded-custom border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                    Obligatorio: el paciente tiene 65 anos o mas.
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">Opcional para este paciente.</p>
                )}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Nombre completo{isSenior ? " *" : ""}</Label>
                    <Input value={data.contactoNombre} onChange={(e) => setField("contactoNombre", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Telefono{isSenior ? " *" : ""}</Label>
                    <Input
                      value={data.contactoTelefono}
                      onChange={(e) => setField("contactoTelefono", formatPhone(e.target.value))}
                      placeholder="0000-0000"
                      maxLength={9}
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Parentesco{isSenior ? " *" : ""}</Label>
                    <Input value={data.contactoParentesco} onChange={(e) => setField("contactoParentesco", e.target.value)} />
                  </div>
                </div>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <p className="text-base font-bold text-slate-900">Seguro y datos laborales</p>
                <div className="space-y-1.5">
                  <Label>Tiene seguro? *</Label>
                  <div className="inline-flex overflow-hidden rounded-custom border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setField("tieneSeguro", true)}
                      className={cn(
                        "px-4 py-2 text-sm font-semibold transition-colors",
                        data.tieneSeguro ? "bg-brand text-white" : "bg-white text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      Si
                    </button>
                    <button
                      type="button"
                      onClick={() => setField("tieneSeguro", false)}
                      className={cn(
                        "border-l border-slate-200 px-4 py-2 text-sm font-semibold transition-colors",
                        !data.tieneSeguro ? "bg-brand text-white" : "bg-white text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      No
                    </button>
                  </div>
                  {!data.tieneSeguro ? (
                    <p className="text-xs text-slate-400">
                      Se registrara como paciente sin seguro (particular/ninguno). Este punto se refinara mas adelante con el manejo de polizas.
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className={!data.tieneSeguro ? "text-slate-400" : undefined}>Tipo de seguro *</Label>
                    <Select
                      value={data.tipoSeguro}
                      disabled={!data.tieneSeguro}
                      onChange={(e) => setField("tipoSeguro", e.target.value as FormData["tipoSeguro"])}
                    >
                      <option value="Particular">Particular</option>
                      <option value="Seguro privado">Seguro privado</option>
                      <option value="Seguro social">Seguro social</option>
                    </Select>
                  </div>
                  {isSocial ? (
                    <div className="space-y-1.5">
                      <Label className="font-bold text-red-700">Numero de afiliacion *</Label>
                      <Input
                        className="border-red-300"
                        value={data.numeroAfiliacion}
                        onChange={(e) => setField("numeroAfiliacion", e.target.value)}
                      />
                    </div>
                  ) : null}
                </div>
                <p className="pt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Datos laborales (opcional){!data.tieneSeguro ? " — solo aplica si tiene seguro" : ""}
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className={!data.tieneSeguro ? "text-slate-400" : undefined}>Empleador</Label>
                    <Input value={data.empleador} disabled={!data.tieneSeguro} onChange={(e) => setField("empleador", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={!data.tieneSeguro ? "text-slate-400" : undefined}>Cargo</Label>
                    <Input value={data.cargo} disabled={!data.tieneSeguro} onChange={(e) => setField("cargo", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={!data.tieneSeguro ? "text-slate-400" : undefined}>Telefono del trabajo</Label>
                    <Input
                      value={data.telefonoTrabajo}
                      disabled={!data.tieneSeguro}
                      onChange={(e) => setField("telefonoTrabajo", formatPhone(e.target.value))}
                      placeholder="0000-0000"
                      maxLength={9}
                      inputMode="numeric"
                    />
                  </div>
                </div>
              </>
            ) : null}

            {error ? (
              <Alert>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex justify-between border-t border-slate-100 pt-4">
              <Button type="button" variant="outline" onClick={goBack} disabled={step === 1}>
                Atras
              </Button>
              {step === 3 ? (
                <Button type="button" disabled={submitting} onClick={handleSubmit}>
                  {submitting ? "Guardando..." : "Guardar paciente"}
                </Button>
              ) : (
                <Button type="button" onClick={goNext}>
                  Continuar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
