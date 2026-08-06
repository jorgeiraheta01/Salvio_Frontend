import { AuthGuard } from "@/modules/auth/components/auth-guard";
import { DashboardShell } from "@/shared/components/layout/dashboard-shell";

export default function DashboardGroupLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
