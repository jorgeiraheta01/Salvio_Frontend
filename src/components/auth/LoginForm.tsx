"use client";

import type { CSSProperties } from "react";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";

import { InputField } from "@/components/auth/InputField";
import { LoadingSpinner } from "@/components/auth/LoadingSpinner";
import { useTenantInfo } from "@/hooks/useTenantInfo";
import { type LoginFormValues, loginSchema } from "@/lib/validations/login";
import { useLogin } from "@/modules/auth/hooks/use-login";
import { useAuthStore } from "@/modules/auth/store/auth.store";
import { cn } from "@/shared/utils/cn";

type LoginFormProps = {
  subdomain: string;
};

type LoginResponse = {
  redirectTo: string;
  success: boolean;
};

const DEFAULT_PRIMARY = "#2563EB";
const MEDICAL_IMAGE =
  "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80";

export function LoginForm({ subdomain }: LoginFormProps) {
  const router = useRouter();
  const { error: tenantError, isLoading: isLoadingTenant, refetch, tenantData } = useTenantInfo(subdomain);
  const mutation = useLogin();
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const [showSessionHint, setShowSessionHint] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const primaryColor = tenantData?.primaryColor || DEFAULT_PRIMARY;
  const isCheckingSession = !isHydrated;
  const isInitializing = isLoadingTenant || isCheckingSession;

  const themeStyle = useMemo<CSSProperties & Record<"--primary", string>>(
    () => ({
      "--primary": primaryColor
    }),
    [primaryColor]
  );
  const clinicName = useMemo(() => tenantData?.nombreClinica || "Cargando clinica...", [tenantData?.nombreClinica]);
  const clinicInitial = useMemo(() => clinicName.slice(0, 1).toUpperCase() || "S", [clinicName]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });
  const canSubmit = !isCheckingSession && !mutation.isPending;

  useEffect(() => {
    const hintId = window.setTimeout(() => setShowSessionHint(true), 1500);

    if (isHydrated && token) {
      router.replace("/dashboard");
    }

    return () => {
      window.clearTimeout(hintId);
    };
  }, [isHydrated, router, token]);

  async function onSubmit(values: LoginFormValues) {
    setSubmitError(null);

    try {
      await mutation.mutateAsync(values);
      router.replace("/dashboard");
    } catch {
      setSubmitError("Correo o contrasena incorrectos");
    }
  }

  return (
    <div style={themeStyle} className="min-h-screen bg-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden lg:block">
          <Image src={MEDICAL_IMAGE} alt="Profesionales de salud colaborando en una estacion clinica" fill priority className="object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(10,37,101,0.86),rgba(37,99,235,0.72))]" />
          <div className="surface-grid absolute inset-0 opacity-20" />
          <div className="relative flex h-full flex-col justify-between px-12 py-14 text-white xl:px-16">
            <div>
              <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-100">
                Salvio
              </span>
            </div>
            <div className="max-w-xl">
              <p className="text-sm uppercase tracking-[0.28em] text-blue-100/90">Acceso clinico seguro</p>
              <h1 className="mt-6 text-5xl font-semibold leading-tight">Accede a tu clinica</h1>
              <p className="mt-5 max-w-lg text-lg leading-8 text-blue-50/90">Gestion rapida, segura y sin complicaciones.</p>
            </div>
            <div className="grid max-w-xl grid-cols-3 gap-3 text-sm text-blue-50/90">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">Sesiones protegidas</div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">Operacion multi-sede</div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">Flujo listo para produccion</div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-[95%] max-w-xl md:w-[70%] lg:w-full">
            <div className="rounded-[28px] bg-white p-6 shadow-2xl shadow-slate-300/40 sm:p-8 lg:p-10">
              <div className="mb-8 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Salvio</p>
                  <div className="mt-3">
                    {isLoadingTenant ? (
                      <div className="h-9 w-56 animate-pulse rounded-xl bg-slate-200" />
                    ) : (
                      <h2 className="truncate text-3xl font-semibold text-slate-950">{clinicName}</h2>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Iniciar sesion</p>
                </div>
                {tenantData?.logo ? (
                  <img src={tenantData.logo} alt={clinicName} className="h-14 w-14 rounded-2xl border border-slate-200 object-cover" />
                ) : isLoadingTenant ? (
                  <div className="h-14 w-14 animate-pulse rounded-2xl bg-slate-200" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:color-mix(in_srgb,var(--primary)_12%,white)] text-lg font-semibold text-[var(--primary)]">
                    {clinicInitial}
                  </div>
                )}
              </div>

              <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
                <InputField<LoginFormValues>
                  autoFocus
                  disabled={!canSubmit}
                  error={form.formState.errors.email?.message}
                  icon={Mail}
                  label="Correo electronico"
                  name="email"
                  placeholder="doctor@clinica.com"
                  register={form.register}
                  type="email"
                />

                <InputField<LoginFormValues>
                  disabled={!canSubmit}
                  error={form.formState.errors.password?.message}
                  icon={LockKeyhole}
                  label="Contrasena"
                  name="password"
                  placeholder="Ingresa tu contrasena"
                  register={form.register}
                  type="password"
                />

                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-500">{subdomain || "sin-subdominio"}</span>
                  <Link
                    href="/forgot-password"
                    className="font-medium text-[var(--primary)] transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
                  >
                    Olvidaste tu contrasena?
                  </Link>
                </div>

                {showSessionHint && isCheckingSession ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Validando tu sesion actual. Puedes revisar el formulario mientras terminamos.
                  </div>
                ) : null}

                {tenantError ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <p>{tenantError}</p>
                    <button
                      type="button"
                      onClick={() => void refetch()}
                      className="mt-3 font-semibold text-[var(--primary)] transition hover:opacity-80"
                    >
                      Reintentar
                    </button>
                  </div>
                ) : null}

                {submitError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>
                ) : null}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={cn(
                    "inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition focus:outline-none focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--primary)_20%,white)]",
                    "bg-[var(--primary)] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                  )}
                >
                  {mutation.isPending ? (
                    <>
                      <LoadingSpinner className="gap-0 text-white [&_span]:hidden [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-white" />
                      Entrando...
                    </>
                  ) : isInitializing ? (
                    <>
                      <LoadingSpinner className="gap-0 text-white [&_span]:hidden [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-white" />
                      Preparando acceso...
                    </>
                  ) : (
                    <>
                      Entrar al sistema
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
