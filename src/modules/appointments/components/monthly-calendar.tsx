"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Card, CardContent } from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";

const WEEKDAY_LABELS = ["LU", "MA", "MI", "JU", "VI", "SA", "DO"];
const MONTH_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
];

type MonthlyCalendarProps = {
  year: number;
  month: number;
  selectedDate: string;
  daysWithAppointments: Set<number>;
  loading: boolean;
  onShiftMonth: (delta: number) => void;
  onSelectDay: (dateStr: string) => void;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function MonthlyCalendar({ year, month, selectedDate, daysWithAppointments, loading, onShiftMonth, onSelectDay }: MonthlyCalendarProps) {
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7; // lunes=0

  const cells: Array<number | null> = [...Array(leadingBlanks).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedDay = Number(selectedDate.split("-")[2]);
  const selectedMonthMatches = selectedDate.startsWith(`${year}-${pad(month + 1)}`);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Vista mensual</h3>
          <div className="flex items-center gap-1 text-sm font-medium text-slate-600">
            <button type="button" onClick={() => onShiftMonth(-1)} className="rounded-custom p-1 hover:bg-slate-100" aria-label="Mes anterior">
              <ChevronLeft className="h-4 w-4" />
            </button>
            {MONTH_LABELS[month]} {year}
            <button type="button" onClick={() => onShiftMonth(1)} className="rounded-custom p-1 hover:bg-slate-100" aria-label="Mes siguiente">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] font-bold text-slate-400">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        <div className={cn("grid grid-cols-7 gap-y-1 text-center text-sm", loading && "opacity-50")}>
          {cells.map((day, index) => {
            if (day === null) {
              return <span key={`blank-${index}`} />;
            }
            const isSelected = selectedMonthMatches && day === selectedDay;
            const hasAppointments = daysWithAppointments.has(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => onSelectDay(`${year}-${pad(month + 1)}-${pad(day)}`)}
                className={cn(
                  "mx-auto flex h-8 w-8 flex-col items-center justify-center rounded-full text-xs font-medium transition-colors",
                  isSelected ? "bg-brand font-bold text-white" : "text-slate-700 hover:bg-slate-100"
                )}
              >
                {day}
                {hasAppointments && !isSelected ? <span className="-mt-1 h-1 w-1 rounded-full bg-brand" /> : null}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
