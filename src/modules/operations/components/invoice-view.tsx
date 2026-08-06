import type { PatientItem } from "@/modules/clinical/api/clinical.api";
import type { BillingDetail } from "@/modules/operations/api/operations.api";
import type { TenantSelf } from "@/core/api/tenant.api";
import { formatServerDate } from "@/shared/utils/dates";

const STATUS_LABEL: Record<string, string> = { paid: "Pagada", pending: "Pendiente", void: "Anulada", refunded: "Reembolsada" };

function money(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  return n.toFixed(2);
}

export function InvoiceView({
  detail,
  patient,
  tenant
}: {
  detail: BillingDetail;
  patient: PatientItem | null;
  tenant: TenantSelf | null;
}) {
  const subtotal = detail.items.reduce((sum, item) => sum + Number(item.unit_price ?? 0) * (item.quantity ?? 1), 0);
  const paidTotal = detail.payments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
  const amountDue = Math.max(0, Number(detail.amount) - paidTotal);
  const patientName = patient ? `${patient.first_name} ${patient.last_name}` : detail.patient_id.slice(0, 8);

  return (
    <div className="mx-auto max-w-2xl overflow-hidden rounded-custom border border-slate-200 bg-white text-slate-900">
      <div className="flex items-center justify-between bg-slate-800 px-6 py-6 text-white">
        <p className="text-2xl font-extrabold tracking-tight">FACTURA</p>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Monto adeudado (USD)</p>
          <p className="text-2xl font-extrabold">${money(amountDue)}</p>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Facturar a</p>
            <p className="mt-1 text-base font-bold text-slate-900">{patientName}</p>
            {patient?.phone ? <p className="text-sm text-slate-500">{patient.phone}</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <span className="text-slate-400">Numero de factura:</span>
            <span className="text-right font-semibold text-slate-800">{detail.invoice_number ?? detail.id.slice(0, 8)}</span>
            <span className="text-slate-400">Fecha de factura:</span>
            <span className="text-right font-semibold text-slate-800">{formatServerDate(detail.created_at)}</span>
            {detail.due_date ? (
              <>
                <span className="text-slate-400">Fecha de pago:</span>
                <span className="text-right font-semibold text-slate-800">{formatServerDate(detail.due_date)}</span>
              </>
            ) : null}
            <span className="text-slate-400">Estado:</span>
            <span className="text-right font-semibold text-slate-800">{STATUS_LABEL[detail.status] ?? detail.status}</span>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-slate-200 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
              <th className="py-2">Concepto</th>
              <th className="py-2 text-center">Cantidad</th>
              <th className="py-2 text-right">Precio</th>
              <th className="py-2 text-right">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {detail.items.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-center text-slate-400">
                  Sin conceptos registrados.
                </td>
              </tr>
            ) : (
              detail.items.map((item, index) => (
                <tr key={index}>
                  <td className="py-2 font-medium text-slate-800">{item.description ?? "Concepto"}</td>
                  <td className="py-2 text-center text-slate-600">{item.quantity ?? 1}</td>
                  <td className="py-2 text-right text-slate-600">${money(item.unit_price)}</td>
                  <td className="py-2 text-right font-semibold text-slate-800">${money(Number(item.unit_price ?? 0) * (item.quantity ?? 1))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="ml-auto max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-semibold text-slate-800">${money(subtotal)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-1.5 font-bold text-slate-900">
            <span>Total</span>
            <span>${money(detail.amount)}</span>
          </div>
          {detail.payments.map((payment) => (
            <div key={payment.id} className="flex justify-between text-slate-500">
              <span>
                Pago el {formatServerDate(payment.created_at)} ({payment.payment_method})
              </span>
              <span>${money(payment.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-extrabold text-slate-900">
            <span>Monto adeudado</span>
            <span>${money(amountDue)}</span>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 text-sm">
          <p className="font-bold text-slate-900">{tenant?.name ?? "Clinica"}</p>
          {tenant?.country ? <p className="text-slate-500">{tenant.country === "SV" ? "El Salvador" : tenant.country}</p> : null}
        </div>
      </div>
    </div>
  );
}
