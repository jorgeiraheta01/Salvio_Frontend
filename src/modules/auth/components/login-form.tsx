"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, LoaderCircle, ShieldCheck } from "lucide-react";

import { ApiError } from "@/core/api/http-client";
import { env } from "@/core/config/env";
import { useLogin } from "@/modules/auth/hooks/use-login";
import { useAuthStore } from "@/modules/auth/store/auth.store";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useTenant } from "@/shared/components/providers/tenant-provider";
import { getDefaultTenant } from "@/shared/utils/tenant";

const loginSchema = z.object({
  email: z.string().email("Ingresa un correo valido."),
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres.")
});

type LoginFormValues = z.infer<typeof loginSchema>;

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "Credenciales invalidas. Revisa tu correo y contrasena.";
    }
    if (error.status === 404) {
      return "El tenant no existe o no esta activo.";
    }
    return error.message;
  }

  return "No fue posible iniciar sesion.";
}

export function LoginForm() {
  const tenantId = useTenant();

  return (
    <Suspense fallback={<LoginFormShell tenantId={tenantId} />}>
      <LoginFormContent />
    </Suspense>
  );
}

function LoginFormContent() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const tenantId = useTenant();
  return <LoginFormShell nextPath={nextPath} tenantId={tenantId} />;
}

type LoginFormShellProps = {
  nextPath?: string | null;
  tenantId: string;
};

function LoginFormShell({ nextPath, tenantId }: LoginFormShellProps) {
  const router = useRouter();
  const mutation = useLogin();
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const hydrateAuthState = useAuthStore((state) => state.hydrateAuthState);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const errorMessage = mutation.error ? getErrorMessage(mutation.error) : null;

  useEffect(() => {
    if (isHydrated && token) {
      router.replace(nextPath || "/dashboard");
    }
  }, [token, isHydrated, nextPath, router]);

  async function onSubmit(values: LoginFormValues) {
    await mutation.mutateAsync({ ...values, tenantId });
    await hydrateAuthState();
    const nextToken = useAuthStore.getState().token;
    if (!nextToken) {
      throw new Error("Token no disponible despues de login");
    }
    router.replace(nextPath || "/dashboard");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,520px)]">
      <section className="surface-grid relative hidden overflow-hidden bg-slate-950 lg:block">
        <img
          src="https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=80"
          alt="Equipo clinico trabajando en una estacion medica"
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-slate-950/45" />
        <div className="relative flex h-full flex-col justify-between px-12 py-14 text-white">
          <div className="inline-flex w-fit items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            Acceso por tenant automatico
          </div>
          <div className="max-w-xl space-y-6">
            <p className="text-sm uppercase tracking-wide text-emerald-200">Salvio SaaS</p>
            <h1 className="text-4xl font-semibold leading-tight">
              Operacion clinica centralizada para cada sede, con sesion segura por subdominio.
            </h1>
            <p className="text-base leading-7 text-slate-200">
              Hoy entras a <span className="font-semibold text-white">{tenantId}</span>. La app toma el tenant desde el hostname y conecta
              el flujo con la API en {env.apiUrl}.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm text-slate-200">
            <div className="rounded-lg border border-white/10 bg-white/10 p-4">JWT por tenant</div>
            <div className="rounded-lg border border-white/10 bg-white/10 p-4">Sesiones protegidas</div>
            <div className="rounded-lg border border-white/10 bg-white/10 p-4">Base lista para modulos</div>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10 lg:px-10">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-3">
            <div className="inline-flex w-fit items-center rounded-md bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              Tenant: {tenantId}
            </div>
            <CardTitle>Inicia sesion</CardTitle>
            <CardDescription>Accede a tu entorno clinico con el tenant resuelto automaticamente.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@clinica.com"
                  {...form.register("email")}
                />
                {form.formState.errors.email ? (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contrasena</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="********"
                  {...form.register("password")}
                />
                {form.formState.errors.password ? (
                  <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                ) : null}
              </div>

              {errorMessage ? (
                <Alert>
                  <AlertDescription className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </AlertDescription>
                </Alert>
              ) : null}

              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>

              <p className="text-sm leading-6 text-muted-foreground">
                El tenant no se edita aqui. Se detecta desde tu subdominio o desde{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{getDefaultTenant()}</code> cuando entras directo por{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">localhost</code>.
              </p>

              <p className="text-sm leading-6 text-muted-foreground">
                Soporte de acceso y aprovisionamiento: <Link href="mailto:soporte@salvio.app" className="text-primary">soporte@salvio.app</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
