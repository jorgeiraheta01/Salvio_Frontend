import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function ClinicaBloqueadaPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center shadow-2xl shadow-slate-300/40">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
          <ShieldAlert className="h-7 w-7 text-red-600" />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-slate-900">Ups, esta clinica no esta disponible</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          El acceso de tu clinica esta suspendido por el momento. Debes comunicarte con el Proveedor de servicios de la
          aplicacion para mas detalle.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95"
        >
          Volver al inicio de sesion
        </Link>
      </div>
    </div>
  );
}
