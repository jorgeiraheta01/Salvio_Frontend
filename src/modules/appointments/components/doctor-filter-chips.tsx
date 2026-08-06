"use client";

import { cn } from "@/shared/utils/cn";

export type DoctorChipOption = {
  id: string;
  label: string;
  count: number;
};

type DoctorFilterChipsProps = {
  options: DoctorChipOption[];
  selectedId: string | "all";
  onSelect: (id: string | "all") => void;
  totalCount: number;
};

export function DoctorFilterChips({ options, selectedId, onSelect, totalCount }: DoctorFilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onSelect("all")}
        className={cn(
          "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
          selectedId === "all" ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        )}
      >
        Todos los medicos
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-xs font-bold",
            selectedId === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
          )}
        >
          {totalCount}
        </span>
      </button>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onSelect(option.id)}
          className={cn(
            "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
            selectedId === option.id ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          )}
        >
          {option.label}
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-xs font-bold",
              selectedId === option.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
            )}
          >
            {option.count}
          </span>
        </button>
      ))}
    </div>
  );
}
