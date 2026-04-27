import * as React from "react";

import { cn } from "@/shared/utils/cn";

const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn("relative w-full rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground", className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("text-sm leading-6", className)} {...props} />
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertDescription };
