"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { listPatients, type PatientItem } from "@/modules/clinical/api/clinical.api";
import { useCurrentUser } from "@/core/auth/current-user";
import {
  createLabOrder,
  createLabResult,
  getLabOrderDetail,
  listLabOrders,
  type LabOrder,
  type LabOrderDetail
} from "@/modules/operations/api/operations.api";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Modal } from "@/shared/components/ui/modal";
import { PatientPicker } from "@/shared/components/ui/patient-picker";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatServerDate } from "@/shared/utils/dates";

const STATUS_VARIANT: Record<string, "primary" | "neutral" | "accent" | "info" | "destructive"> = {
  ordered: "neutral",
  collected: "info",
  processing: "info",
  completed: "primary",
  cancelled: "destructive"
};
const STATUS_LABEL: Record<string, string> = {
  ordered: "Ordenada",
  collected: "Muestra tomada",
  processing: "En proceso",
  completed: "Resultado listo",
  cancelled: "Cancelada"
};

export function LabTab() {
  const currentUser = useCurrentUser();
  const [items, setItems] = useState<LabOrder[]>([]);
  const [patients, setPatients] = useState<Record<string, PatientItem>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listLabOrders();
      setItems(data);
      const all = await listPatients();
      setPatients(Object.fromEntries(all.data.map((p) => [p.id, p])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar las ordenes de laboratorio.");
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
      <div className="flex justify-end">
        <Button type="button" onClick={() => setModalOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nueva orden
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
          <CardContent className="p-10 text-center text-sm text-slate-500">Todavia no hay ordenes de laboratorio.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3">Paciente</th>
                  <th className="px-5 py-3">Prueba</th>
                  <th className="px-5 py-3">Fecha</th>
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
                      <td className="px-5 py-3 text-slate-600">{item.test_name}</td>
                      <td className="px-5 py-3 text-slate-600">{formatServerDate(item.order_datetime)}</td>
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
        <NewLabOrderModal
          open={modalOpen}
          tenantId={currentUser.tenantId}
          doctorId={currentUser.id}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            load();
          }}
        />
      ) : null}

      {currentUser && detailId ? (
        <LabOrderDetailModal orderId={detailId} tenantId={currentUser.tenantId} onClose={() => setDetailId(null)} onResultRegistered={load} />
      ) : null}
    </div>
  );
}

function LabOrderDetailModal({
  orderId,
  tenantId,
  onClose,
  onResultRegistered
}: {
  orderId: string;
  tenantId: string;
  onClose: () => void;
  onResultRegistered: () => void;
}) {
  const [detail, setDetail] = useState<LabOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyte, setAnalyte] = useState("");
  const [resultValue, setResultValue] = useState("");
  const [unit, setUnit] = useState("");
  const [referenceRange, setReferenceRange] = useState("");
  const [resultError, setResultError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getLabOrderDetail(orderId);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el detalle de la orden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function submitResult(event: React.FormEvent) {
    event.preventDefault();
    if (!analyte.trim() || !resultValue.trim()) {
      setResultError("Indica el analito y el resultado.");
      return;
    }
    setSubmitting(true);
    setResultError(null);
    try {
      await createLabResult(orderId, {
        tenant_id: tenantId,
        analyte_name: analyte.trim(),
        result_value: resultValue.trim(),
        unit: unit.trim() || undefined,
        reference_range: referenceRange.trim() || undefined
      });
      setAnalyte("");
      setResultValue("");
      setUnit("");
      setReferenceRange("");
      await load();
      onResultRegistered();
    } catch (err) {
      setResultError(err instanceof Error ? err.message : "No se pudo guardar el resultado.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Detalle de orden de laboratorio" description="Resultados registrados para esta orden.">
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
          <p className="text-sm font-semibold text-slate-800">{detail.test_name}</p>
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Resultados</p>
            {detail.results.length === 0 ? (
              <p className="text-sm text-slate-400">Sin resultados registrados.</p>
            ) : (
              <ul className="space-y-1 text-sm text-slate-700">
                {detail.results.map((result) => (
                  <li key={result.id}>
                    {result.analyte_name ?? "Resultado"}: {result.result_value ?? "N/D"} {result.unit ?? ""}
                    {result.reference_range ? ` (ref: ${result.reference_range})` : ""}
                    {result.is_abnormal ? " - anormal" : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <form className="space-y-3 border-t border-slate-100 pt-4" onSubmit={submitResult}>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Registrar resultado</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input value={analyte} onChange={(e) => setAnalyte(e.target.value)} placeholder="Analito (ej. Hemoglobina)" />
              <Input value={resultValue} onChange={(e) => setResultValue(e.target.value)} placeholder="Resultado" />
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unidad" />
              <Input value={referenceRange} onChange={(e) => setReferenceRange(e.target.value)} placeholder="Rango de referencia" />
            </div>
            {resultError ? (
              <Alert>
                <AlertDescription>{resultError}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cerrar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Guardando..." : "Guardar resultado"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}

function NewLabOrderModal({
  open,
  tenantId,
  doctorId,
  onClose,
  onCreated
}: {
  open: boolean;
  tenantId: string;
  doctorId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [patient, setPatient] = useState<PatientItem | null>(null);
  const [testName, setTestName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setPatient(null);
      setTestName("");
      setNotes("");
      setError(null);
    }
  }, [open]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!patient) {
      setError("Selecciona un paciente.");
      return;
    }
    if (!testName.trim()) {
      setError("Indica la prueba solicitada.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createLabOrder({ patient_id: patient.id, tenant_id: tenantId, ordered_by: doctorId, test_name: testName.trim(), notes: notes.trim() || undefined });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la orden.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva orden de laboratorio" description="Solicitar una prueba de laboratorio para un paciente.">
      <form className="space-y-4" onSubmit={submit}>
        <PatientPicker value={patient} onChange={setPatient} />
        <div className="space-y-1.5">
          <Label>Prueba solicitada</Label>
          <Input value={testName} onChange={(e) => setTestName(e.target.value)} placeholder="Hemograma completo, perfil lipidico..." />
        </div>
        <div className="space-y-1.5">
          <Label>Notas</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
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
