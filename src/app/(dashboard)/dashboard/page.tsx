import { Activity, CalendarClock, ShieldCheck, Users } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";

const stats = [
  { title: "Pacientes activos", value: "1,248", icon: Users, detail: "Ultimos 30 dias" },
  { title: "Citas hoy", value: "86", icon: CalendarClock, detail: "18 pendientes de confirmar" },
  { title: "Alertas clinicas", value: "12", icon: ShieldCheck, detail: "4 de alta prioridad" },
  { title: "Flujos operativos", value: "97%", icon: Activity, detail: "Disponibilidad del tenant" }
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div>
                  <CardDescription>{item.title}</CardDescription>
                  <CardTitle className="mt-3 text-3xl">{item.value}</CardTitle>
                </div>
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Listo para crecer por modulos</CardTitle>
            <CardDescription>La capa base ya separa autenticacion, peticiones, estado global y layout protegido.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm font-medium">Auth multi-tenant</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">El frontend detecta el subdominio y envia el tenant al backend sin exponer un selector manual.</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm font-medium">Cliente centralizado</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Cada request agrega el JWT y fuerza logout cuando recibe 401 o sesion vencida.</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm font-medium">Estado desacoplado</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Zustand conserva solo el token y el estado de sesion para mantener la superficie sensible bien corta.</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm font-medium">Capa de modulos</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Las futuras areas clinicas pueden entrar en `src/modules` con servicios y hooks propios, sin fetches directos en UI.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Siguiente expansion</CardTitle>
            <CardDescription>Base recomendada para continuar el producto sin rehacer auth ni tenancy.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>Agenda clinica con query keys por modulo.</p>
            <p>Pacientes y expediente con guards por rol.</p>
            <p>Catalogos cacheados por tenant.</p>
            <p>Notificaciones y renovacion de sesion.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
