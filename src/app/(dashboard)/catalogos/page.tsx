"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { ApiError } from "@/core/api/http-client";
import { useCurrentUser } from "@/core/auth/current-user";
import {
  createClinicalSystem,
  createLabTest,
  createMedication,
  listClinicalSystems,
  listLabTests,
  listMedications,
  updateClinicalSystem,
  updateLabTest,
  updateMedication,
  type ClinicalSystemCatalogItem,
  type LabTestCatalogItem,
  type MedicationCatalogItem
} from "@/modules/catalogs/api/catalogs.api";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Modal } from "@/shared/components/ui/modal";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/utils/cn";

type CatalogKey = "medicamentos" | "labs" | "sistemas";

function slugCode(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
}

export default function CatalogosPage() {
  const currentUser = useCurrentUser();
  const canManage = currentUser?.role === "clinic_admin";
  const [activeTab, setActiveTab] = useState<CatalogKey>("medicamentos");

  const [medications, setMedications] = useState<MedicationCatalogItem[]>([]);
  const [labTests, setLabTests] = useState<LabTestCatalogItem[]>([]);
  const [systems, setSystems] = useState<ClinicalSystemCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ nombre: "", f2: "", f3: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([listMedications(), listLabTests(), listClinicalSystems()])
      .then(([meds, labs, sys]) => {
        setMedications(meds);
        setLabTests(labs);
        setSystems(sys);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar los catalogos."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const TAB_LABELS: Record<CatalogKey, string> = {
    medicamentos: "Medicamentos",
    labs: "Pruebas de laboratorio",
    sistemas: "Sistemas clinicos"
  };
  const COL2_LABELS: Record<CatalogKey, string> = { medicamentos: "Presentacion", labs: "Categoria", sistemas: "Descripcion" };
  const COL3_LABELS: Partial<Record<CatalogKey, string>> = { medicamentos: "Via", labs: "Muestra" };

  async function onSave() {
    setFormError(null);
    if (!form.nombre.trim()) {
      setFormError("Ingresa un nombre.");
      return;
    }
    setSaving(true);
    try {
      if (activeTab === "medicamentos") {
        const created = await createMedication({ generic_name: form.nombre.trim(), pharmaceutical_form: form.f2.trim() || undefined, route: form.f3.trim() || undefined });
        setMedications((prev) => [...prev, created].sort((a, b) => a.generic_name.localeCompare(b.generic_name)));
      } else if (activeTab === "labs") {
        const created = await createLabTest({
          test_code: slugCode(form.nombre) || `LAB_${Date.now()}`,
          test_name: form.nombre.trim(),
          category: form.f2.trim() || undefined,
          sample_type: form.f3.trim() || undefined
        });
        setLabTests((prev) => [...prev, created].sort((a, b) => a.test_name.localeCompare(b.test_name)));
      } else {
        const created = await createClinicalSystem({ system_name: form.nombre.trim(), description: form.f2.trim() || undefined });
        setSystems((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
      }
      setForm({ nombre: "", f2: "", f3: "" });
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "No se pudo guardar el elemento.");
    } finally {
      setSaving(false);
    }
  }

  async function onToggleActive(key: CatalogKey, id: string, nextActive: boolean) {
    try {
      if (key === "medicamentos") {
        const updated = await updateMedication(id, { is_active: nextActive });
        setMedications((prev) => prev.map((m) => (m.id === id ? updated : m)));
      } else if (key === "labs") {
        const updated = await updateLabTest(id, { is_active: nextActive });
        setLabTests((prev) => prev.map((m) => (m.id === id ? updated : m)));
      } else {
        const updated = await updateClinicalSystem(id, { is_active: nextActive });
        setSystems((prev) => prev.map((m) => (m.id === id ? updated : m)));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar el estado.");
    }
  }

  const rows =
    activeTab === "medicamentos"
      ? medications.map((m) => ({ id: m.id, nombre: m.generic_name, f2: m.pharmaceutical_form ?? "-", f3: m.route ?? "-", is_active: m.is_active }))
      : activeTab === "labs"
        ? labTests.map((l) => ({ id: l.id, nombre: l.test_name, f2: l.category ?? "-", f3: l.sample_type ?? "-", is_active: l.is_active }))
        : systems.map((s) => ({ id: s.id, nombre: s.system_name, f2: s.description ?? "-", f3: null, is_active: s.is_active }));

  const col3Label = COL3_LABELS[activeTab];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Catalogos</h1>
        <p className="mt-1 text-sm text-slate-500">Listas maestras usadas en recetas, ordenes y notas clinicas.</p>
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
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {(Object.keys(TAB_LABELS) as CatalogKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={cn(
              "rounded-custom px-4 py-2 text-sm font-semibold transition-colors",
              activeTab === key ? "bg-brand text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      {canManage ? (
        <div className="flex justify-end">
          <Button type="button" onClick={() => setModalOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-slate-500">Este catalogo no tiene elementos todavia.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3">Nombre</th>
                  <th className="px-5 py-3">{COL2_LABELS[activeTab]}</th>
                  {col3Label ? <th className="px-5 py-3">{col3Label}</th> : null}
                  <th className="px-5 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3 font-semibold text-slate-800">{item.nombre}</td>
                    <td className="px-5 py-3 text-slate-600">{item.f2}</td>
                    {col3Label ? <td className="px-5 py-3 text-slate-600">{item.f3}</td> : null}
                    <td className="px-5 py-3">
                      {canManage ? (
                        <button type="button" onClick={() => onToggleActive(activeTab, item.id, !item.is_active)}>
                          <Badge variant={item.is_active ? "primary" : "neutral"}>{item.is_active ? "Activo" : "Inactivo"}</Badge>
                        </button>
                      ) : (
                        <Badge variant={item.is_active ? "primary" : "neutral"}>{item.is_active ? "Activo" : "Inactivo"}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Nuevo elemento - ${TAB_LABELS[activeTab]}`}
        description="Se guarda de inmediato en el catalogo de la clinica."
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input value={form.nombre} onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>{COL2_LABELS[activeTab]}</Label>
            <Input value={form.f2} onChange={(e) => setForm((prev) => ({ ...prev, f2: e.target.value }))} />
          </div>
          {col3Label ? (
            <div className="space-y-1.5">
              <Label>{col3Label}</Label>
              <Input value={form.f3} onChange={(e) => setForm((prev) => ({ ...prev, f3: e.target.value }))} />
            </div>
          ) : null}
          {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={onSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
