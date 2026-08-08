"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/modules/auth/store/auth.store";
import { listIncomingReferrals } from "@/modules/operations/api/operations.api";
import { useTenant } from "@/shared/components/providers/tenant-provider";

export function AppHeader() {
  const logout = useAuthStore((state) => state.logout);
  const tenantId = useTenant();
  const router = useRouter();
  const [pendingReferralCount, setPendingReferralCount] = useState(0);

  useEffect(() => {
    listIncomingReferrals()
      .then((data) => setPendingReferralCount(data.filter((item) => item.status === "pending").length))
      .catch(() => setPendingReferralCount(0));
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8" data-purpose="header">
      <div className="flex items-center space-x-2">
        <div className="rounded bg-slate-100 p-1.5">
          <svg className="h-4 w-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase leading-none text-slate-400">Operacion clinica</p>
          <p className="text-sm font-bold text-slate-800">{tenantId}</p>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={() => router.push("/operacion?tab=referencias&sub=recibidas")}
          className="relative flex items-center rounded-custom border border-slate-200 px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-50"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          Alertas
          {pendingReferralCount > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {pendingReferralCount > 9 ? "9+" : pendingReferralCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => logout()}
          className="flex items-center rounded-custom border border-slate-200 px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-50"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          Salir
        </button>
      </div>
    </header>
  );
}
