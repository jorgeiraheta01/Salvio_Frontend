import { AuthGuard } from "@/modules/auth/components/auth-guard";

export default function DashboardGroupLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AuthGuard>{children}</AuthGuard>;
}
