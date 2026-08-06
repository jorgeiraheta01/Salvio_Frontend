"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Ban, BarChart3, Building2, Database, Download, PanelLeftClose, PanelLeftOpen, Pencil, PowerOff, Plus, Receipt, Search, ShieldCheck } from "lucide-react";

import { ApiError } from "@/core/api/http-client";
import { usePlatformAdmin } from "@/core/auth/current-user";
import { CreateClinicWizard } from "@/modules/auth/components/create-clinic-wizard";
import { EditTenantModal } from "@/modules/auth/components/edit-tenant-modal";
import { ModulesModal } from "@/modules/auth/components/modules-modal";
import {
  platformAdminConfirmTotpSetup,
  platformAdminGetTotpSetup,
  platformAdminLogin,
  platformAdminVerifyTotp
} from "@/modules/auth/services/auth.service";
import {
  createPlatformCharge,
  getTenantDatabaseTables,
  getTenantsDashboard,
  getTenantsTechnicalMetrics,
  listPlatformCharges,
  listTenants,
  openPlatformChargeInvoice,
  updatePlatformChargeStatus,
  updateTenant,
  type PlatformChargesResponse,
  type TenantDashboardResponse,
  type TenantSummary,
  type TenantTableStats,
  type TenantTechnicalStats
} from "@/modules/auth/services/platform-admin.service";
import { useAuthStore } from "@/modules/auth/store/auth.store";
import { ActionMenu } from "@/shared/components/ui/action-menu";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Select } from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/utils/cn";

const inputClass =
  "w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand";

function GateShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-300/40">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Salvio</p>
            <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          </div>
        </div>
        <p className="mb-4 text-sm text-slate-500">{description}</p>
        {children}
      </div>
    </div>
  );
}

// Credenciales -> (2FA nunca confirmado: setup con QR + codigos de
// recuperacion) o (2FA ya activo: solo pide el codigo) -> access_token.
// El owner puede tumbar toda la plataforma, por eso 2FA no es opcional aca
// (a diferencia de un usuario de clinica normal).
type Phase =
  | { name: "credentials" }
  | { name: "setup"; setupToken: string; secret: string; qrBase64: string }
  | { name: "recovery_codes"; accessToken: string; codes: string[] }
  | { name: "verify"; pendingToken: string };

function OwnerLoginGate() {
  const setToken = useAuthStore((state) => state.setToken);
  const [phase, setPhase] = useState<Phase>({ name: "credentials" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [codesCopied, setCodesCopied] = useState(false);

  async function onSubmitCredentials(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Ingresa tu correo y contrasena de propietario.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await platformAdminLogin(email.trim(), password);
      if (result.status === "setup_required") {
        const { secret, qr_base64 } = await platformAdminGetTotpSetup(result.setup_token);
        setPhase({ name: "setup", setupToken: result.setup_token, secret, qrBase64: qr_base64 });
      } else {
        setPhase({ name: "verify", pendingToken: result.pending_token });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesion.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onConfirmSetup(event: React.FormEvent) {
    event.preventDefault();
    if (phase.name !== "setup") return;
    setError(null);
    if (!code.trim()) {
      setError("Ingresa el codigo de 6 digitos de tu app de autenticacion.");
      return;
    }
    setSubmitting(true);
    try {
      const { access_token, recovery_codes } = await platformAdminConfirmTotpSetup(phase.setupToken, code.trim());
      setPhase({ name: "recovery_codes", accessToken: access_token, codes: recovery_codes });
      setCode("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Codigo invalido. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onVerify(event: React.FormEvent) {
    event.preventDefault();
    if (phase.name !== "verify") return;
    setError(null);
    if (!code.trim()) {
      setError("Ingresa el codigo de tu app de autenticacion o un codigo de recuperacion.");
      return;
    }
    setSubmitting(true);
    try {
      const { access_token } = await platformAdminVerifyTotp(phase.pendingToken, code.trim());
      setToken(access_token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Codigo invalido. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  function onFinishRecoveryCodes() {
    if (phase.name !== "recovery_codes") return;
    setToken(phase.accessToken);
  }

  function onCopyCodes() {
    if (phase.name !== "recovery_codes") return;
    navigator.clipboard?.writeText(phase.codes.join("\n")).then(() => {
      setCodesCopied(true);
      setTimeout(() => setCodesCopied(false), 1500);
    });
  }

  if (phase.name === "setup") {
    return (
      <GateShell
        title="Activa la verificacion en dos pasos"
        description="Es obligatoria para esta cuenta: tiene acceso a toda la plataforma. Escanea el codigo con Google Authenticator, Authy u otra app TOTP."
      >
        <form className="space-y-4" onSubmit={onConfirmSetup}>
          <div className="flex justify-center">
            <img
              src={`data:image/png;base64,${phase.qrBase64}`}
              alt="Codigo QR para configurar la verificacion en dos pasos"
              className="h-44 w-44 rounded-xl border border-slate-200 p-2"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Codigo manual (si no puedes escanear)</label>
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center font-mono text-sm tracking-wider text-slate-700">
              {phase.secret}
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Codigo de 6 digitos</label>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className={`${inputClass} text-center font-mono text-lg tracking-[0.3em]`}
              placeholder="000000"
            />
          </div>
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Confirmando..." : "Confirmar y activar"}
          </button>
        </form>
      </GateShell>
    );
  }

  if (phase.name === "recovery_codes") {
    return (
      <GateShell
        title="Guarda tus codigos de recuperacion"
        description="Cada uno sirve una sola vez para entrar si pierdes acceso a tu app de autenticacion. No se volveran a mostrar."
      >
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-700">
          {phase.codes.map((c) => (
            <span key={c} className="text-center">
              {c}
            </span>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          <Button type="button" variant="outline" className="w-full" onClick={onCopyCodes}>
            {codesCopied ? "Copiado" : "Copiar codigos"}
          </Button>
          <button
            type="button"
            onClick={onFinishRecoveryCodes}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95"
          >
            Ya los guarde, entrar
          </button>
        </div>
      </GateShell>
    );
  }

  if (phase.name === "verify") {
    return (
      <GateShell title="Verificacion en dos pasos" description="Ingresa el codigo de tu app de autenticacion, o un codigo de recuperacion si perdiste el dispositivo.">
        <form className="space-y-4" onSubmit={onVerify}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Codigo</label>
            <input
              type="text"
              autoFocus
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className={`${inputClass} text-center font-mono text-lg tracking-[0.3em]`}
              placeholder="000000"
            />
          </div>
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Verificando..." : "Entrar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPhase({ name: "credentials" });
              setCode("");
              setError(null);
            }}
            className="block w-full text-center text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Volver
          </button>
        </form>
      </GateShell>
    );
  }

  return (
    <GateShell
      title="Acceso de propietario"
      description="Esta cuenta es del dueno de la plataforma, no de una clinica. Se usa unicamente para administrar las clinicas dadas de alta."
    >
      <form className="space-y-4" onSubmit={onSubmitCredentials}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Correo</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            placeholder="owner@salvio.dev"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Contrasena</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
            placeholder="Contrasena"
          />
        </div>
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "Ingresando..." : "Entrar"}
        </button>
        <Link href="/login" className="block text-center text-sm font-medium text-slate-500 hover:text-slate-700">
          Soy usuario de una clinica
        </Link>
      </form>
    </GateShell>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-SV", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

type OwnerSection = "clinicas" | "metricas" | "basedatos" | "facturacion";

const OWNER_NAV_ITEMS: { key: OwnerSection; label: string; icon: typeof Building2 }[] = [
  { key: "clinicas", label: "Clinicas", icon: Building2 },
  { key: "metricas", label: "Metricas por clinica", icon: BarChart3 },
  { key: "basedatos", label: "Base de datos", icon: Database },
  { key: "facturacion", label: "Facturacion", icon: Receipt }
];

function OwnerSidebar({
  section,
  onSelect,
  collapsed,
  onToggle
}: {
  section: OwnerSection;
  onSelect: (section: OwnerSection) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside className="flex h-full w-full flex-col justify-between overflow-hidden border-r border-slate-200 bg-white">
      <div>
        <div className={`flex items-center gap-3 px-4 py-4 lg:px-6 lg:py-6 ${collapsed ? "justify-center px-2 lg:px-2" : ""}`}>
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          {collapsed ? null : (
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Salvio</p>
              <p className="truncate text-sm font-bold text-slate-900">Propietario</p>
            </div>
          )}
        </div>
        <nav className="space-y-1 px-3 pb-3 lg:px-4 lg:pb-6">
          {OWNER_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = section === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelect(item.key)}
                title={collapsed ? item.label : undefined}
                className={`flex w-full items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  collapsed ? "justify-center px-0" : ""
                } ${active ? "bg-brand/10 text-brand" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {collapsed ? null : item.label}
              </button>
            );
          })}
        </nav>
      </div>
      <div className={`p-3 lg:p-4 ${collapsed ? "px-2" : ""}`}>
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? "Expandir menu" : "Colapsar menu"}
          className={`flex w-full items-center rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 ${
            collapsed ? "justify-center px-0" : "justify-center gap-2 px-4"
          }`}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {collapsed ? null : "Colapsar"}
        </button>
      </div>
    </aside>
  );
}

function ClinicasSection({
  tenants,
  loading,
  error,
  onRetry,
  onCreate,
  onEdit,
  onToggleBlock,
  onManageModules
}: {
  tenants: TenantSummary[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onCreate: () => void;
  onEdit: (tenant: TenantSummary) => void;
  onToggleBlock: (tenant: TenantSummary) => void;
  onManageModules: (tenant: TenantSummary) => void;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  const filteredTenants = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return tenants;
    return tenants.filter(
      (tenant) => tenant.name.toLowerCase().includes(normalized) || tenant.tenant_id.toLowerCase().includes(normalized)
    );
  }, [tenants, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const pageCount = Math.max(1, Math.ceil(filteredTenants.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageTenants = filteredTenants.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Clinicas</h1>
          <p className="mt-1 text-sm text-slate-500">
            {loading ? "Cargando clinicas..." : `${tenants.length} clinica${tenants.length === 1 ? "" : "s"} dada${tenants.length === 1 ? "" : "s"} de alta.`}
          </p>
        </div>
        <Button type="button" onClick={onCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nueva clinica
        </Button>
      </div>

      {!loading && tenants.length > 0 ? (
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar clinica por nombre o identificador..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((k) => (
            <Skeleton key={k} className="h-20 w-full" />
          ))}
        </div>
      ) : tenants.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <Building2 className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm font-medium text-slate-600">Todavia no has creado ninguna clinica.</p>
          <Button type="button" className="mt-4" onClick={onCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            Crear la primera clinica
          </Button>
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <Search className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm font-medium text-slate-600">Ninguna clinica coincide con &quot;{query}&quot;.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pageTenants.map((tenant) => {
              const isBlocked = tenant.status === "suspended";
              return (
                <div key={tenant.tenant_id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{tenant.name}</p>
                      <p className="truncate text-xs text-slate-400">{tenant.tenant_id}.localhost</p>
                    </div>
                    <Badge variant={tenant.status === "active" ? "primary" : "destructive"}>
                      {tenant.status === "active" ? "Activa" : tenant.status === "archived" ? "Archivada" : "Bloqueada"}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400">Creada el {formatDate(tenant.created_at)}</p>
                  <div className="mt-auto flex items-center gap-1.5 border-t border-slate-100 pt-3">
                    <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => onEdit(tenant)}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <ActionMenu
                      items={[
                        {
                          label: isBlocked ? "Desbloquear" : "Bloquear",
                          icon: Ban,
                          destructive: !isBlocked,
                          onSelect: () => onToggleBlock(tenant)
                        },
                        { label: "Inactivar modulos", icon: PowerOff, onSelect: () => onManageModules(tenant) }
                      ]}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {pageCount > 1 ? (
            <div className="mt-6 flex items-center justify-between gap-4">
              <p className="text-xs text-slate-400">
                Pagina {currentPage} de {pageCount} · {filteredTenants.length} clinica{filteredTenants.length === 1 ? "" : "s"}
              </p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)}>
                  Anterior
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={currentPage >= pageCount} onClick={() => setPage((p) => p + 1)}>
                  Siguiente
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("es-SV", { style: "currency", currency: "USD" });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "Sin actividad";
  try {
    return new Date(iso).toLocaleString("es-SV", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

type MetricsSortKey = "name" | "patients_count" | "staff_count" | "encounters_count" | "billing_pending" | "last_activity_at";

const METRICS_SORT_LABEL: Record<MetricsSortKey, string> = {
  name: "Clinica",
  patients_count: "Pacientes",
  staff_count: "Staff activo",
  encounters_count: "Encuentros",
  billing_pending: "Facturacion pendiente",
  last_activity_at: "Ultima actividad"
};

const STALE_ACTIVITY_DAYS = 30;

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
}

function OperacionTable({ data }: { data: TenantDashboardResponse }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<MetricsSortKey>("last_activity_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const PAGE_SIZE = 10;

  const needsAttention = useMemo(
    () =>
      [...data.tenants]
        .map((t) => ({ tenant: t, staleDays: daysSince(t.last_activity_at) }))
        .filter((entry) => entry.staleDays === null || entry.staleDays >= STALE_ACTIVITY_DAYS)
        .sort((a, b) => (b.staleDays ?? Infinity) - (a.staleDays ?? Infinity))
        .slice(0, 6),
    [data.tenants]
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return data.tenants;
    return data.tenants.filter((t) => t.name.toLowerCase().includes(normalized) || t.tenant_id.toLowerCase().includes(normalized));
  }, [data.tenants, query]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
      if (sortKey === "last_activity_at") {
        const av = a.last_activity_at ? new Date(a.last_activity_at).getTime() : -Infinity;
        const bv = b.last_activity_at ? new Date(b.last_activity_at).getTime() : -Infinity;
        return (av - bv) * dir;
      }
      return (a[sortKey] - b[sortKey]) * dir;
    });
  }, [filtered, sortKey, sortDir]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function toggleSort(key: MetricsSortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "last_activity_at" ? "asc" : "desc");
    }
  }

  function SortableHeader({ sortableKey, label, align = "right" }: { sortableKey: MetricsSortKey; label: string; align?: "left" | "right" }) {
    const active = sortKey === sortableKey;
    return (
      <th className={cn("px-4 py-3", align === "right" ? "text-right" : "text-left")}>
        <button
          type="button"
          onClick={() => toggleSort(sortableKey)}
          className={cn("inline-flex items-center gap-1 hover:text-slate-700", active ? "text-brand" : "")}
        >
          {label}
          {active ? <span className="text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span> : null}
        </button>
      </th>
    );
  }

  return (
    <div className="space-y-4">
      {needsAttention.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
            Necesitan atencion · {STALE_ACTIVITY_DAYS}+ dias sin actividad
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {needsAttention.map(({ tenant, staleDays }) => (
              <button
                type="button"
                key={tenant.tenant_id}
                onClick={() => setQuery(tenant.name)}
                className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
              >
                {tenant.name} · {staleDays === null ? "sin actividad registrada" : `${staleDays} dias`}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar clinica por nombre o identificador..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <Search className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm font-medium text-slate-600">Ninguna clinica coincide con &quot;{query}&quot;.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-400">
                <tr>
                  <SortableHeader sortableKey="name" label="Clinica" align="left" />
                  <SortableHeader sortableKey="patients_count" label="Pacientes" />
                  <SortableHeader sortableKey="staff_count" label="Staff activo" />
                  <th className="px-4 py-3 text-right">Citas (compl./cancel.)</th>
                  <SortableHeader sortableKey="encounters_count" label="Encuentros" />
                  <th className="px-4 py-3 text-right">Modulos activos</th>
                  <SortableHeader sortableKey="billing_pending" label="Facturacion pendiente" />
                  <SortableHeader sortableKey="last_activity_at" label="Ultima actividad" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageItems.map((t) => (
                  <tr key={t.tenant_id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{t.name}</p>
                      <p className="text-xs text-slate-400">{t.tenant_id}.localhost</p>
                    </td>
                    <td className="px-4 py-3 text-right">{t.patients_count}</td>
                    <td className="px-4 py-3 text-right">{t.staff_count}</td>
                    <td className="px-4 py-3 text-right">
                      {t.appointments_completed}/{t.appointments_cancelled}
                    </td>
                    <td className="px-4 py-3 text-right">{t.encounters_count}</td>
                    <td className="px-4 py-3 text-right">
                      {t.modules_active}/{t.modules_total}
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(t.billing_pending)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(t.last_activity_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pageCount > 1 ? (
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-slate-400">
                Pagina {currentPage} de {pageCount} · {sorted.length} clinica{sorted.length === 1 ? "" : "s"} · ordenado por {METRICS_SORT_LABEL[sortKey]}
              </p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)}>
                  Anterior
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={currentPage >= pageCount} onClick={() => setPage((p) => p + 1)}>
                  Siguiente
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function MetricasSection() {
  const [data, setData] = useState<TenantDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    getTenantsDashboard()
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las metricas."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Metricas por clinica</h1>
        <p className="mt-1 text-sm text-slate-500">Que hacen las clinicas: pacientes, citas, recetas, laboratorio y facturacion.</p>
      </div>

      {error ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <Button type="button" size="sm" variant="outline" onClick={load}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((k) => (
            <Skeleton key={k} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.tenants.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <BarChart3 className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm font-medium text-slate-600">Todavia no hay datos que mostrar.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Clinicas" value={String(data.tenants.length)} />
            <StatTile label="Pacientes totales" value={data.totals.patients.toLocaleString("es-SV")} />
            <StatTile label="Facturacion pendiente" value={formatCurrency(data.totals.billing_pending)} />
            <StatTile label="Facturacion pagada" value={formatCurrency(data.totals.billing_paid)} />
          </div>
          <OperacionTable data={data} />
        </div>
      )}
    </div>
  );
}

function HorizontalBarChart({ items, valueFormat }: { items: { label: string; value: number; sub?: string }[]; valueFormat: (v: number) => string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="w-28 flex-shrink-0 truncate text-right text-xs font-medium text-slate-600" title={item.label}>
            {item.label}
          </div>
          <div className="relative h-6 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand transition-[width]"
              style={{ width: `${Math.max((item.value / max) * 100, item.value > 0 ? 2 : 0)}%` }}
              title={`${item.label}: ${valueFormat(item.value)}`}
            />
          </div>
          <div className="w-20 flex-shrink-0 text-xs font-semibold text-slate-700">{valueFormat(item.value)}</div>
        </div>
      ))}
    </div>
  );
}

function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-slate-900">{value}</p>
      {detail ? <p className="mt-0.5 text-xs text-slate-400">{detail}</p> : null}
    </div>
  );
}

function BaseDeDatosOverview({ tenants, stats, onSelect }: { tenants: TenantSummary[]; stats: TenantTechnicalStats[]; onSelect: (id: string) => void }) {
  const tenantNames = useMemo(() => {
    const map: Record<string, string> = {};
    tenants.forEach((t) => {
      map[t.tenant_id] = t.name;
    });
    return map;
  }, [tenants]);

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const CHART_TOP_N = 10;

  const sorted = useMemo(() => [...stats].sort((a, b) => b.size_mb - a.size_mb), [stats]);
  const totalSize = stats.reduce((sum, s) => sum + s.size_mb, 0);
  const totalTables = stats.reduce((sum, s) => sum + s.table_count, 0);
  const biggest = sorted[0];
  const average = stats.length > 0 ? totalSize / stats.length : 0;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return sorted;
    return sorted.filter((s) => (tenantNames[s.tenant_id] ?? s.tenant_id).toLowerCase().includes(normalized) || s.tenant_id.toLowerCase().includes(normalized));
  }, [sorted, tenantNames, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Tamano total" value={`${totalSize.toFixed(1)} MB`} detail={`${stats.length} clinicas`} />
        <StatTile label="Mayor consumo" value={biggest ? `${biggest.size_mb.toFixed(1)} MB` : "—"} detail={biggest ? (tenantNames[biggest.tenant_id] ?? biggest.tenant_id) : undefined} />
        <StatTile label="Promedio por clinica" value={`${average.toFixed(1)} MB`} />
        <StatTile label="Tablas totales" value={String(totalTables)} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-bold text-slate-900">
          Mayor consumo {stats.length > CHART_TOP_N ? `(top ${CHART_TOP_N} de ${stats.length})` : "por clinica"}
        </p>
        <HorizontalBarChart
          items={sorted.slice(0, CHART_TOP_N).map((s) => ({ label: tenantNames[s.tenant_id] ?? s.tenant_id, value: s.size_mb }))}
          valueFormat={(v) => `${v.toFixed(1)} MB`}
        />
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar clinica por nombre o identificador..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <Search className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm font-medium text-slate-600">Ninguna clinica coincide con &quot;{query}&quot;.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Clinica</th>
                  <th className="px-4 py-3 text-right">Tablas</th>
                  <th className="px-4 py-3 text-right">Filas (aprox.)</th>
                  <th className="px-4 py-3 text-right">Tamano</th>
                  <th className="px-4 py-3">Ultima escritura</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageItems.map((s) => (
                  <tr key={s.tenant_id} className="cursor-pointer hover:bg-slate-50" onClick={() => onSelect(s.tenant_id)}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{tenantNames[s.tenant_id] ?? s.tenant_id}</p>
                      <p className="text-xs text-slate-400">salvio_{s.tenant_id}</p>
                    </td>
                    <td className="px-4 py-3 text-right">{s.table_count}</td>
                    <td className="px-4 py-3 text-right">{s.approx_rows.toLocaleString("es-SV")}</td>
                    <td className="px-4 py-3 text-right">{s.size_mb.toFixed(2)} MB</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(s.last_updated)}</td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-brand">Ver detalle →</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pageCount > 1 ? (
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-slate-400">
                Pagina {currentPage} de {pageCount} · {filtered.length} clinica{filtered.length === 1 ? "" : "s"}
              </p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)}>
                  Anterior
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={currentPage >= pageCount} onClick={() => setPage((p) => p + 1)}>
                  Siguiente
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function BaseDeDatosDetail({ tenantId, tenantName, onBack }: { tenantId: string; tenantName: string; onBack: () => void }) {
  const [tables, setTables] = useState<TenantTableStats[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getTenantDatabaseTables(tenantId)
      .then(setTables)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las tablas."))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const totalSizeMb = tables?.reduce((sum, t) => sum + t.size_mb, 0) ?? 0;
  const totalRows = tables?.reduce((sum, t) => sum + t.approx_rows, 0) ?? 0;
  const topTables = useMemo(() => (tables ?? []).slice(0, 10), [tables]);

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm font-semibold text-brand hover:underline">
        ← Volver a todas las clinicas
      </button>
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">{tenantName}</h2>
        <p className="text-sm text-slate-500">salvio_{tenantId} — detalle por tabla, insumo para paquetes de facturacion.</p>
      </div>

      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
        </div>
      ) : null}

      {loading || !tables ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((k) => (
            <Skeleton key={k} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile label="Tamano total" value={`${totalSizeMb.toFixed(2)} MB`} />
            <StatTile label="Filas totales (aprox.)" value={totalRows.toLocaleString("es-SV")} />
            <StatTile label="Tablas" value={String(tables.length)} />
          </div>

          {topTables.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="mb-3 text-sm font-bold text-slate-900">Top 10 tablas por tamano</p>
              <HorizontalBarChart items={topTables.map((t) => ({ label: t.table_name, value: t.size_mb }))} valueFormat={(v) => `${v.toFixed(3)} MB`} />
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Tabla</th>
                  <th className="px-4 py-3 text-right">Filas (aprox.)</th>
                  <th className="px-4 py-3 text-right">Tamano</th>
                  <th className="px-4 py-3">Ultima escritura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tables.map((t) => (
                  <tr key={t.table_name}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{t.table_name}</td>
                    <td className="px-4 py-3 text-right">{t.approx_rows.toLocaleString("es-SV")}</td>
                    <td className="px-4 py-3 text-right">{t.size_mb.toFixed(3)} MB</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(t.last_updated)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50 text-sm font-bold text-slate-800">
                <tr>
                  <td className="px-4 py-3">Totales ({tables.length} tablas)</td>
                  <td className="px-4 py-3 text-right">{totalRows.toLocaleString("es-SV")}</td>
                  <td className="px-4 py-3 text-right">{totalSizeMb.toFixed(2)} MB</td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function BaseDeDatosSection({ tenants }: { tenants: TenantSummary[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stats, setStats] = useState<TenantTechnicalStats[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    getTenantsTechnicalMetrics()
      .then(setStats)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las estadisticas."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const selectedTenant = tenants.find((t) => t.tenant_id === selectedId);

  return (
    <div className="mx-auto max-w-5xl">
      {!selectedId ? (
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">Base de datos</h1>
          <p className="mt-1 text-sm text-slate-500">Vista general de todas las clinicas — clic en una para ver su detalle por tabla.</p>
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <Button type="button" size="sm" variant="outline" onClick={load}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {loading || !stats ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((k) => (
            <Skeleton key={k} className="h-14 w-full" />
          ))}
        </div>
      ) : selectedId && selectedTenant ? (
        <BaseDeDatosDetail tenantId={selectedId} tenantName={selectedTenant.name} onBack={() => setSelectedId(null)} />
      ) : (
        <BaseDeDatosOverview tenants={tenants} stats={stats} onSelect={setSelectedId} />
      )}
    </div>
  );
}

const CHARGE_STATUS_LABEL: Record<string, string> = { pending: "Pendiente", paid: "Pagado", void: "Anulado" };

function FacturacionSection({ tenants }: { tenants: TenantSummary[] }) {
  const [filterTenantId, setFilterTenantId] = useState<string>("");
  const [data, setData] = useState<PlatformChargesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formTenantId, setFormTenantId] = useState(tenants[0]?.tenant_id ?? "");
  const [periodLabel, setPeriodLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    listPlatformCharges(filterTenantId || undefined)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar los cobros."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTenantId]);

  function tenantName(tenantId: string): string {
    return tenants.find((t) => t.tenant_id === tenantId)?.name ?? tenantId;
  }

  async function onCreateCharge() {
    setFormError(null);
    if (!formTenantId || !periodLabel.trim() || !amount.trim()) {
      setFormError("Indica clinica, periodo y monto.");
      return;
    }
    setSaving(true);
    try {
      await createPlatformCharge({
        tenant_id: formTenantId,
        period_label: periodLabel.trim(),
        amount: amount.trim(),
        due_date: dueDate || undefined,
        notes: notes.trim() || undefined
      });
      setPeriodLabel("");
      setAmount("");
      setDueDate("");
      setNotes("");
      setFormOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "No se pudo crear el cobro.");
    } finally {
      setSaving(false);
    }
  }

  async function onMarkPaid(chargeId: string) {
    try {
      await updatePlatformChargeStatus(chargeId, "paid");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar el cobro.");
    }
  }

  async function onViewInvoice(chargeId: string) {
    try {
      await openPlatformChargeInvoice(chargeId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo generar la factura.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Facturacion</h1>
          <p className="mt-1 text-sm text-slate-500">Cobros del dueno de la plataforma a cada clinica por el uso del servicio.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={filterTenantId} onChange={(e) => setFilterTenantId(e.target.value)}>
            <option value="">Todas las clinicas</option>
            {tenants.map((t) => (
              <option key={t.tenant_id} value={t.tenant_id}>
                {t.name}
              </option>
            ))}
          </Select>
          <Button type="button" onClick={() => setFormOpen((v) => !v)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo cobro
          </Button>
        </div>
      </div>

      {formOpen ? (
        <div className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500">Clinica</label>
              <Select value={formTenantId} onChange={(e) => setFormTenantId(e.target.value)}>
                {tenants.map((t) => (
                  <option key={t.tenant_id} value={t.tenant_id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500">Periodo</label>
              <input
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                placeholder="2026-08"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500">Monto (USD)</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500">Fecha limite (opcional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas (opcional)"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
          {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={onCreateCharge} disabled={saving}>
              {saving ? "Guardando..." : "Crear cobro"}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <Button type="button" size="sm" variant="outline" onClick={load}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((k) => (
            <Skeleton key={k} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.charges.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <Receipt className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm font-medium text-slate-600">Todavia no hay cobros registrados.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pendiente</p>
              <p className="mt-1 text-xl font-extrabold text-slate-900">{formatCurrency(Number(data.totals.pending))}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pagado</p>
              <p className="mt-1 text-xl font-extrabold text-slate-900">{formatCurrency(Number(data.totals.paid))}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Anulado</p>
              <p className="mt-1 text-xl font-extrabold text-slate-900">{formatCurrency(Number(data.totals.void))}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Clinica</th>
                  <th className="px-4 py-3">Periodo</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Notas</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.charges.map((charge) => (
                  <tr key={charge.id}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{tenantName(charge.tenant_id)}</td>
                    <td className="px-4 py-3 text-slate-600">{charge.period_label}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(Number(charge.amount))}</td>
                    <td className="px-4 py-3">
                      <Badge variant={charge.status === "paid" ? "primary" : charge.status === "void" ? "neutral" : "destructive"}>
                        {CHARGE_STATUS_LABEL[charge.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{charge.notes ?? "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => onViewInvoice(charge.id)}>
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          Factura
                        </Button>
                        {charge.status === "pending" ? (
                          <Button type="button" size="sm" variant="outline" onClick={() => onMarkPaid(charge.id)}>
                            Marcar pagado
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const OWNER_SIDEBAR_STORAGE_KEY = "salvio_owner_sidebar_collapsed";

function OwnerDashboard() {
  const logout = useAuthStore((state) => state.logout);
  const [section, setSection] = useState<OwnerSection>("clinicas");
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantSummary | null>(null);
  const [blockTarget, setBlockTarget] = useState<TenantSummary | null>(null);
  const [modulesTarget, setModulesTarget] = useState<TenantSummary | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(OWNER_SIDEBAR_STORAGE_KEY);
    if (stored !== null) {
      setSidebarCollapsed(stored === "1");
    } else if (window.innerWidth < 1024) {
      setSidebarCollapsed(true);
    }
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(OWNER_SIDEBAR_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listTenants();
      setTenants(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar la lista de clinicas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function onTenantUpdated(updated: TenantSummary) {
    setTenants((prev) => prev.map((t) => (t.tenant_id === updated.tenant_id ? updated : t)));
    setEditingTenant(updated);
  }

  async function onConfirmToggleBlock() {
    if (!blockTarget) return;
    const nextStatus = blockTarget.status === "suspended" ? "active" : "suspended";
    const updated = await updateTenant(blockTarget.tenant_id, { status: nextStatus });
    setTenants((prev) => prev.map((t) => (t.tenant_id === updated.tenant_id ? updated : t)));
    setBlockTarget(null);
  }

  return (
    <div
      className="grid min-h-screen bg-slate-100 transition-[grid-template-columns] duration-200"
      style={{ gridTemplateColumns: `${sidebarCollapsed ? "76px" : "240px"} minmax(0,1fr)` }}
    >
      <OwnerSidebar section={section} onSelect={setSection} collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      <div className="min-w-0 px-4 py-6 lg:px-6 lg:py-10">
        <div className="mx-auto mb-6 flex max-w-6xl items-center justify-end">
          <Button type="button" variant="outline" onClick={() => logout(true)}>
            Salir
          </Button>
        </div>

        {section === "clinicas" ? (
          <ClinicasSection
            tenants={tenants}
            loading={loading}
            error={error}
            onRetry={load}
            onCreate={() => setWizardOpen(true)}
            onEdit={setEditingTenant}
            onToggleBlock={setBlockTarget}
            onManageModules={setModulesTarget}
          />
        ) : null}

        {section === "metricas" ? <MetricasSection /> : null}

        {section === "basedatos" ? <BaseDeDatosSection tenants={tenants} /> : null}

        {section === "facturacion" ? <FacturacionSection tenants={tenants} /> : null}
      </div>

      <CreateClinicWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={() => {
          setWizardOpen(false);
          load();
        }}
      />
      <EditTenantModal tenant={editingTenant} onClose={() => setEditingTenant(null)} onUpdated={onTenantUpdated} />
      <ModulesModal tenant={modulesTarget} onClose={() => setModulesTarget(null)} />
      <ConfirmDialog
        open={!!blockTarget}
        title={blockTarget?.status === "suspended" ? "Desbloquear clinica" : "Bloquear clinica"}
        description={
          blockTarget?.status === "suspended"
            ? `${blockTarget?.name} volvera a poder iniciar sesion con normalidad.`
            : `Nadie de ${blockTarget?.name} podra iniciar sesion hasta que la desbloquees. Usa esto cuando el cliente no ha pagado.`
        }
        confirmLabel={blockTarget?.status === "suspended" ? "Desbloquear" : "Bloquear"}
        destructive={blockTarget?.status !== "suspended"}
        onCancel={() => setBlockTarget(null)}
        onConfirm={onConfirmToggleBlock}
      />
    </div>
  );
}

export default function OnboardingPage() {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const platformAdmin = usePlatformAdmin();

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <p className="text-sm text-slate-500">Validando sesion...</p>
      </div>
    );
  }

  if (!platformAdmin) {
    return <OwnerLoginGate />;
  }

  return <OwnerDashboard />;
}
