"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { listPatients, type PatientItem } from "@/modules/clinical/api/clinical.api";
import { useCurrentUser } from "@/core/auth/current-user";
import {
  createImagingReport,
  createImagingStudy,
  getImagingStudyDetail,
  listImagingStudies,
  type ImagingStudy,
  type ImagingStudyDetail
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
  performed: "info",
  reviewed: "primary",
  cancelled: "destructive"
};
const STATUS_LABEL: Record<string, string> = { ordered: "Ordenado", performed: "Realizado", reviewed: "Informe listo", cancelled: "Cancelado" };

export function ImagingTab() {
  const currentUser = useCurrentUser();
  const [items, setItems] = useState<ImagingStudy[]>([]);
  const [patients, setPatients] = useState<Record<string, PatientItem>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listImagingStudies();
      setItems(data);
      const all = await listPatients();
      setPatients(Object.fromEntries(all.data.map((p) => [p.id, p])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar los estudios de imagenologia.");
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
          Nuevo estudio
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
          <CardContent className="p-10 text-center text-sm text-slate-500">Todavia no hay estudios de imagenologia.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3">Paciente</th>
                  <th className="px-5 py-3">Estudio</th>
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
                      <td className="px-5 py-3 text-slate-600">
                        {item.study_type}
                        {item.body_part ? ` - ${item.body_part}` : ""}
                      </td>
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
        <NewImagingModal
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
        <ImagingStudyDetailModal studyId={detailId} tenantId={currentUser.tenantId} onClose={() => setDetailId(null)} onReportRegistered={load} />
      ) : null}
    </div>
  );
}

function ImagingStudyDetailModal({
  studyId,
  tenantId,
  onClose,
  onReportRegistered
}: {
  studyId: string;
  tenantId: string;
  onClose: () => void;
  onReportRegistered: () => void;
}) {
  const [detail, setDetail] = useState<ImagingStudyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getImagingStudyDetail(studyId);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el detalle del estudio.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyId]);

  async function submitReport(event: React.FormEvent) {
    event.preventDefault();
    if (!findings.trim() && !impression.trim()) {
      setReportError("Indica hallazgos o impresion diagnostica.");
      return;
    }
    setSubmitting(true);
    setReportError(null);
    try {
      await createImagingReport(studyId, { tenant_id: tenantId, findings: findings.trim() || undefined, impression: impression.trim() || undefined });
      setFindings("");
      setImpression("");
      await load();
      onReportRegistered();
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "No se pudo guardar el informe.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Detalle de estudio" description="Informes registrados para este estudio.">
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
          <p className="text-sm font-semibold text-slate-800">
            {detail.study_type}
            {detail.body_part ? ` - ${detail.body_part}` : ""}
          </p>
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Informes</p>
            {detail.reports.length === 0 ? (
              <p className="text-sm text-slate-400">Sin informes registrados.</p>
            ) : (
              <div className="space-y-2 text-sm text-slate-700">
                {detail.reports.map((report) => (
                  <div key={report.id} className="rounded-custom border border-slate-200 p-2">
                    {report.findings ? <p><strong>Hallazgos:</strong> {report.findings}</p> : null}
                    {report.impression ? <p><strong>Impresion:</strong> {report.impression}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
          <form className="space-y-3 border-t border-slate-100 pt-4" onSubmit={submitReport}>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Registrar informe</p>
            <div className="space-y-1.5">
              <Label>Hallazgos</Label>
              <Input value={findings} onChange={(e) => setFindings(e.target.value)} placeholder="Descripcion de hallazgos radiologicos" />
            </div>
            <div className="space-y-1.5">
              <Label>Impresion diagnostica</Label>
              <Input value={impression} onChange={(e) => setImpression(e.target.value)} placeholder="Conclusion diagnostica" />
            </div>
            {reportError ? (
              <Alert>
                <AlertDescription>{reportError}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cerrar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Guardando..." : "Guardar informe"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}

function NewImagingModal({ open, tenantId, onClose, onCreated }: { open: boolean; tenantId: string; onClose: () => void; onCreated: () => void }) {
  const [patient, setPatient] = useState<PatientItem | null>(null);
  const [studyType, setStudyType] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setPatient(null);
      setStudyType("");
      setBodyPart("");
      setError(null);
    }
  }, [open]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!patient) {
      setError("Selecciona un paciente.");
      return;
    }
    if (!studyType.trim()) {
      setError("Indica el tipo de estudio.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createImagingStudy({ patient_id: patient.id, tenant_id: tenantId, study_type: studyType.trim(), body_part: bodyPart.trim() || undefined });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el estudio.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo estudio de imagenologia" description="Solicitar un estudio para un paciente.">
      <form className="space-y-4" onSubmit={submit}>
        <PatientPicker value={patient} onChange={setPatient} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Tipo de estudio</Label>
            <Input value={studyType} onChange={(e) => setStudyType(e.target.value)} placeholder="Radiografia, ultrasonido..." />
          </div>
          <div className="space-y-1.5">
            <Label>Region / area</Label>
            <Input value={bodyPart} onChange={(e) => setBodyPart(e.target.value)} placeholder="Torax, abdomen..." />
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
