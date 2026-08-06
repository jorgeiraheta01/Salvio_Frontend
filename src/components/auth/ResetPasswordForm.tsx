"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, KeyRound, LockKeyhole } from "lucide-react";

import { LoadingSpinner } from "@/components/auth/LoadingSpinner";
import { confirmPasswordReset } from "@/modules/auth/services/auth.service";
import { cn } from "@/shared/utils/cn";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resetToken, setResetToken] = useState(searchParams.get("token") ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("La contrasena debe tener al menos 8 caracteres.");
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmPasswordReset(resetToken.trim(), newPassword);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setError("El enlace es invalido o ya expiro. Solicita uno nuevo.");
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
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">Definir nueva contrasena</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Pega el codigo de recuperacion que recibiste y elige una contrasena nueva.
            </p>

            {success ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Contrasena actualizada. Redirigiendo al inicio de sesion...
              </div>
            ) : (
              <form className="mt-6 space-y-5" onSubmit={onSubmit}>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Codigo de recuperacion</span>
                  <span className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition focus-within:border-[var(--primary,#2563EB)] focus-within:ring-4 focus-within:ring-blue-100">
                    <KeyRound className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    <input
                      required
                      type="text"
                      value={resetToken}
                      onChange={(event) => setResetToken(event.target.value)}
                      placeholder="Pega aqui el codigo recibido"
                      disabled={isSubmitting}
                      className="w-full border-none bg-transparent p-0 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </span>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Nueva contrasena</span>
                  <span className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition focus-within:border-[var(--primary,#2563EB)] focus-within:ring-4 focus-within:ring-blue-100">
                    <LockKeyhole className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    <input
                      required
                      autoFocus
                      type="password"
                      minLength={8}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Minimo 8 caracteres"
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
                      Actualizar contrasena
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
