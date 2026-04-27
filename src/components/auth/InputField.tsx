import type { FieldValues, Path, UseFormRegister } from "react-hook-form";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/shared/utils/cn";

type InputFieldProps<TFieldValues extends FieldValues> = {
  autoFocus?: boolean;
  disabled?: boolean;
  error?: string;
  icon: LucideIcon;
  label: string;
  name: Path<TFieldValues>;
  placeholder: string;
  register: UseFormRegister<TFieldValues>;
  type?: "email" | "password" | "text";
};

export function InputField<TFieldValues extends FieldValues>({
  autoFocus = false,
  disabled = false,
  error,
  icon: Icon,
  label,
  name,
  placeholder,
  register,
  type = "text"
}: InputFieldProps<TFieldValues>) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span
        className={cn(
          "flex items-center gap-3 rounded-xl border bg-white px-4 py-3 transition focus-within:border-[var(--primary)] focus-within:ring-4 focus-within:ring-[color:color-mix(in_srgb,var(--primary)_18%,white)]",
          error ? "border-red-300 ring-4 ring-red-100" : "border-slate-200"
        )}
      >
        <Icon className={cn("h-4 w-4", error ? "text-red-500" : "text-slate-400")} aria-hidden="true" />
        <input
          {...register(name)}
          autoFocus={autoFocus}
          disabled={disabled}
          type={type}
          placeholder={placeholder}
          className="w-full border-none bg-transparent p-0 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </span>
      {error ? <span className="text-sm text-red-600">{error}</span> : null}
    </label>
  );
}
