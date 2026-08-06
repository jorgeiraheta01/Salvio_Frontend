import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/shared/utils/cn";

const badgeVariants = cva("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", {
  variants: {
    variant: {
      neutral: "bg-slate-100 text-slate-600",
      primary: "bg-brand/10 text-brand",
      primarySolid: "bg-brand text-white",
      accent: "bg-amber-100 text-amber-800",
      secondary: "bg-indigo-100 text-indigo-700",
      destructive: "bg-red-100 text-red-700",
      info: "bg-blue-100 text-blue-700"
    }
  },
  defaultVariants: {
    variant: "neutral"
  }
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
