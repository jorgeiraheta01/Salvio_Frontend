"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

export type ResourceColumn<T> = {
  label: string;
  render: (item: T) => React.ReactNode;
};

type ResourceListTabProps<T> = {
  patientId: string;
  emptyLabel: string;
  addLabel: string;
  columns: ResourceColumn<T>[];
  load: (patientId: string) => Promise<T[]>;
  renderAddForm: (props: { onCancel: () => void; onCreated: (item: T) => void }) => React.ReactNode;
};

export function ResourceListTab<T extends { id: string }>({ patientId, emptyLabel, addLabel, columns, load, renderAddForm }: ResourceListTabProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function fetchItems() {
    setLoading(true);
    setError(null);
    try {
      setItems(await load(patientId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la informacion.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  if (loading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (error) {
    return (
      <Alert>
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button type="button" size="sm" variant="outline" onClick={fetchItems}>
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <p className="text-base font-bold text-slate-900">{addLabel.replace("+ ", "").replace("Agregar ", "")}</p>
          <Button type="button" size="sm" onClick={() => setShowForm((value) => !value)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {addLabel}
          </Button>
        </div>

        {showForm ? (
          <div className="border-b border-slate-100 p-5">
            {renderAddForm({
              onCancel: () => setShowForm(false),
              onCreated: (item) => {
                setItems((prev) => [item, ...prev]);
                setShowForm(false);
              }
            })}
          </div>
        ) : null}

        {items.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-500">{emptyLabel}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {columns.map((col) => (
                    <th key={col.label} className="px-5 py-2.5">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((item) => (
                  <tr key={item.id}>
                    {columns.map((col) => (
                      <td key={col.label} className="px-5 py-3">
                        {col.render(item)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SeverityBadge({ value }: { value: string }) {
  const variant = value === "severe" || value === "life_threatening" ? "destructive" : value === "moderate" ? "accent" : "neutral";
  const label = value === "mild" ? "Leve" : value === "moderate" ? "Moderada" : value === "severe" ? "Severa" : "Potencialmente mortal";
  return <Badge variant={variant}>{label}</Badge>;
}
