"use client";

import { useEffect, useState } from "react";
import { Download, Plus } from "lucide-react";

import { listPatients, type PatientItem } from "@/modules/clinical/api/clinical.api";
import {
  createBilling,
  createPayment,
  getBillingDetail,
  listBilling,
  type BillingDetail,
  type BillingRecord
} from "@/modules/operations/api/operations.api";
import { InvoiceView } from "@/modules/operations/components/invoice-view";
import { getMyTenant, type TenantSelf } from "@/core/api/tenant.api";
import { useCurrentUser } from "@/core/auth/current-user";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Modal } from "@/shared/components/ui/modal";
import { PatientPicker } from "@/shared/components/ui/patient-picker";
import { Select } from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatServerDate } from "@/shared/utils/dates";

const PAYMENT_METHODS = ["Efectivo", "Tarjeta", "Transferencia bancaria", "Cheque", "Seguro medico"];

const STATUS_VARIANT: Record<string, "primary" | "neutral" | "destructive" | "accent"> = {
  paid: "primary",
  pending: "neutral",
  void: "destructive",
  refunded: "accent"
};
const STATUS_LABEL: Record<string, string> = { paid: "Pagada", pending: "Pendiente", void: "Anulada", refunded: "Reembolsada" };

export function BillingTab() {
  const currentUser = useCurrentUser();
  const [items, setItems] = useState<BillingRecord[]>([]);
  const [patients, setPatients] = useState<Record<string, PatientItem>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [tenant, setTenant] = useState<TenantSelf | null>(null);
  const [printDetail, setPrintDetail] = useState<BillingDetail | null>(null);

  useEffect(() => {
    getMyTenant()
      .then(setTenant)
      .catch(() => setTenant(null));
  }, []);

  useEffect(() => {
    if (!printDetail) return;
    const timer = window.setTimeout(() => window.print(), 150);
    return () => window.clearTimeout(timer);
  }, [printDetail]);

  function handleDownloadPdf(detail: BillingDetail) {
    setPrintDetail(detail);
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listBilling();
      setItems(data);
      const missing = Array.from(new Set(data.map((item) => item.patient_id))).filter((id) => !(id in patients));
      if (missing.length > 0) {
        const results = await Promise.all(missing.map((id) => listPatients().then((r) => r.data.find((p) => p.id === id) ?? null)));
        setPatients((prev) => {
          const next = { ...prev };
          missing.forEach((id, index) => {
            const found = results[index];
            if (found) next[id] = found;
          });
          return next;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la facturacion.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="print:hidden space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setModalOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nueva factura
        </Button>
      </div>

      {error ? (
        <Alert>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button type="button" size="sm" variant="outline" onClick={load}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : loading ? (
        <Skeleton className="h-32 w-full" />
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-slate-500">Todavia no hay facturas registradas.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3">Paciente</th>
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-5 py-3">Monto</th>
                  <th className="px-5 py-3">Metodo</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((item) => {
                  const patient = patients[item.patient_id];
                  return (
                    <tr key={item.id}>
                      <td className="px-5 py-3 font-semibold text-slate-800">
                        {patient ? `${patient.first_name} ${patient.last_name}` : item.patient_id.slice(0, 8)}
                      </td>
                      <td className="px-5 py-3 text-slate-600">{formatServerDate(item.created_at)}</td>
                      <td className="px-5 py-3 text-slate-600">${item.amount}</td>
                      <td className="px-5 py-3 text-slate-600">{item.payment_method ?? "N/D"}</td>
                      <td className="px-5 py-3">
                        <Badge variant={STATUS_VARIANT[item.status] ?? "neutral"}>{STATUS_LABEL[item.status] ?? item.status}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button type="button" size="sm" variant="outline" onClick={() => setDetailId(item.id)}>
                          Ver detalle
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {currentUser ? (
        <NewBillingModal
          open={modalOpen}
          tenantId={currentUser.tenantId}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            load();
          }}
        />
      ) : null}

      {currentUser && detailId ? (
        <BillingDetailModal
          billingId={detailId}
          tenantId={currentUser.tenantId}
          onClose={() => setDetailId(null)}
          onPaymentRegistered={load}
          onDownloadPdf={handleDownloadPdf}
        />
      ) : null}
      </div>

      {printDetail ? (
        <div className="hidden print:block">
          <InvoiceView detail={printDetail} patient={patients[printDetail.patient_id] ?? null} tenant={tenant} />
        </div>
      ) : null}
    </div>
  );
}

function BillingDetailModal({
  billingId,
  tenantId,
  onClose,
  onPaymentRegistered,
  onDownloadPdf
}: {
  billingId: string;
  tenantId: string;
  onClose: () => void;
  onPaymentRegistered: () => void;
  onDownloadPdf: (detail: BillingDetail) => void;
}) {
  const [detail, setDetail] = useState<BillingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getBillingDetail(billingId);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el detalle de la factura.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billingId]);

  async function submitPayment(event: React.FormEvent) {
    event.preventDefault();
    if (!amount.trim() || !method.trim()) {
      setPaymentError("Indica monto y metodo de pago.");
      return;
    }
    setSubmitting(true);
    setPaymentError(null);
    try {
      await createPayment(billingId, { tenant_id: tenantId, amount: amount.trim(), payment_method: method.trim() });
      setAmount("");
      setMethod(PAYMENT_METHODS[0]);
      await load();
      onPaymentRegistered();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "No se pudo registrar el pago.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Detalle de factura" description="Conceptos facturados y pagos registrados.">
      {error ? (
        <Alert>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button type="button" size="sm" variant="outline" onClick={load}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : loading || !detail ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button type="button" size="sm" variant="outline" onClick={() => onDownloadPdf(detail)}>
              <Download className="mr-1.5 h-4 w-4" />
              Descargar PDF
            </Button>
          </div>
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Conceptos</p>
            {detail.items.length === 0 ? (
              <p className="text-sm text-slate-400">Sin conceptos registrados.</p>
            ) : (
              <ul className="space-y-1 text-sm text-slate-700">
                {detail.items.map((item, index) => (
                  <li key={index}>
                    {item.description ?? "Concepto"} - ${item.unit_price ?? "0.00"}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Pagos registrados</p>
            {detail.payments.length === 0 ? (
              <p className="text-sm text-slate-400">Sin pagos registrados.</p>
            ) : (
              <ul className="space-y-1 text-sm text-slate-700">
                {detail.payments.map((payment) => (
                  <li key={payment.id}>
                    ${payment.amount} - {payment.payment_method} - {formatServerDate(payment.created_at)}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <form className="space-y-3 border-t border-slate-100 pt-4" onSubmit={submitPayment}>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Registrar pago</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Monto</Label>
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Metodo</Label>
                <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            {paymentError ? (
              <Alert>
                <AlertDescription>{paymentError}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cerrar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Guardando..." : "Registrar pago"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}

function NewBillingModal({ open, tenantId, onClose, onCreated }: { open: boolean; tenantId: string; onClose: () => void; onCreated: () => void }) {
  const [patient, setPatient] = useState<PatientItem | null>(null);
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setPatient(null);
      setConcept("");
      setAmount("");
      setMethod("");
      setError(null);
    }
  }, [open]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!patient) {
      setError("Selecciona un paciente.");
      return;
    }
    if (!concept.trim()) {
      setError("Indica el concepto.");
      return;
    }
    if (!amount.trim()) {
      setError("Indica el monto.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createBilling({
        patient_id: patient.id,
        tenant_id: tenantId,
        concept: concept.trim(),
        amount: amount.trim(),
        payment_method: method.trim() || undefined
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la factura.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva factura" description="Registrar factura para un paciente.">
      <form className="space-y-4" onSubmit={submit}>
        <PatientPicker value={patient} onChange={setPatient} />
        <div className="space-y-1.5">
          <Label>Concepto</Label>
          <Input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Consulta general, procedimiento..." />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Monto (USD)</Label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <Label>Metodo de pago</Label>
            <Input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Tarjeta, efectivo, seguro..." />
          </div>
        </div>
        {error ? (
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
