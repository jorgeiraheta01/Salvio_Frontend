import { Info } from "lucide-react";

import { Card, CardContent } from "@/shared/components/ui/card";

export function OrdersTab() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <Info className="h-6 w-6" />
        </div>
        <div className="max-w-md space-y-2">
          <p className="text-sm font-semibold text-slate-800">Ordenes clinicas todavia no se pueden listar aqui.</p>
          <p className="text-sm text-slate-500">
            El backend (<code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">GET /api/v1/orders</code>) solo permite consultar ordenes
            de un encuentro clinico especifico (<code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">encounter_id</code>), no un
            listado por tenant o paciente. Para ver o crear ordenes clinicas, hacelo desde la pantalla de Encuentro del paciente.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
