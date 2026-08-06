"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";

import { LoadingSpinner } from "@/components/auth/LoadingSpinner";
import { requestPasswordReset } from "@/modules/auth/services/auth.service";
import { cn } from "@/shared/utils/cn";

type ForgotPasswordFormProps = {
  subdomain: string;
};

export function ForgotPasswordForm({ subdomain }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!subdomain) {
      setError("No pudimos identificar la clinica desde el subdominio.");
      return;
    }

    setIsSubmitting(true);
    try {
      await requestPasswordReset(subdomain, email);
      setSubmitted(true);
    } catch {
      // The backend always returns a generic success message to avoid leaking
      // whether an account exists, so a thrown error here means something else
      // went wrong (network, tenant not found) rather than "email not found".
      setError("No pudimos procesar la solicitud. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-[95%] max-w-md md:w-[70%] lg:w-full">
          <div className="rounded-[28px] bg-white p-6 shadow-2xl shadow-slate-300/40 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Salvio</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">Recuperar contrasena</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {subdomain ? `Clinica: ${subdomain}` : "Ingresa el correo asociado a tu cuenta."}
            </p>

            {submitted ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Si la cuenta existe, se envio un enlace de recuperacion. Revisa tu correo en los proximos minutos.
                </div>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary,#2563EB)] transition hover:opacity-80"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver a iniciar sesion
                </Link>
              </div>
            ) : (
              <form className="mt-6 space-y-5" onSubmit={onSubmit}>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Correo electronico</span>
                  <span className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition focus-within:border-[var(--primary,#2563EB)] focus-within:ring-4 focus-within:ring-blue-100">
                    <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    <input
                      autoFocus
                      required
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="doctor@clinica.com"
                      disabled={isSubmitting}
                      className="w-full border-none bg-transparent p-0 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </span>
                </label>

                {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary,#2563EB)] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                  )}
                >
                  {isSubmitting ? (
                    <LoadingSpinner className="gap-0 text-white [&_span]:hidden [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-white" />
                  ) : (
                    <>
                      Enviar enlace de recuperacion
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver a iniciar sesion
                </Link>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
