"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { BillingTab } from "@/modules/operations/components/billing-tab";
import { ImagingTab } from "@/modules/operations/components/imaging-tab";
import { LabTab } from "@/modules/operations/components/lab-tab";
import { OrdersTab } from "@/modules/operations/components/orders-tab";
import { ReferralsTab } from "@/modules/operations/components/referrals-tab";
import { cn } from "@/shared/utils/cn";

type OperationTab = "facturacion" | "laboratorio" | "imagenologia" | "ordenes" | "referencias";

const TABS: Array<{ key: OperationTab; label: string }> = [
  { key: "facturacion", label: "Facturacion" },
  { key: "laboratorio", label: "Laboratorio" },
  { key: "imagenologia", label: "Imagenologia" },
  { key: "ordenes", label: "Ordenes clinicas" },
  { key: "referencias", label: "Referencias" }
];

export default function OperacionPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "referencias" ? "referencias" : "facturacion";
  const [activeTab, setActiveTab] = useState<OperationTab>(initialTab);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Operacion</h1>
        <p className="mt-1 text-sm text-slate-500">Facturacion, ordenes y referencias del expediente clinico.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "rounded-custom px-4 py-2 text-sm font-semibold transition-colors",
              activeTab === tab.key ? "bg-brand text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "facturacion" ? <BillingTab /> : null}
      {activeTab === "laboratorio" ? <LabTab /> : null}
      {activeTab === "imagenologia" ? <ImagingTab /> : null}
      {activeTab === "ordenes" ? <OrdersTab /> : null}
      {activeTab === "referencias" ? (
        <ReferralsTab initialSubTab={searchParams.get("sub") === "recibidas" ? "recibidas" : undefined} />
      ) : null}
    </div>
  );
}
