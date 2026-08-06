"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";

import { cn } from "@/shared/utils/cn";

export type ActionMenuItem = {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
  destructive?: boolean;
};

export function ActionMenu({ items, disabled }: { items: ActionMenuItem[]; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className="rounded-custom p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-50"
        aria-label="Mas acciones"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-custom border border-slate-200 bg-white py-1 shadow-panel">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50",
                  item.destructive ? "text-red-600" : "text-slate-700"
                )}
              >
                {Icon ? <Icon className="h-4 w-4" /> : null}
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
