import { AppHeader } from "@/shared/components/layout/app-header";
import { AppSidebar } from "@/shared/components/layout/app-sidebar";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="grid min-h-screen bg-slate-100 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div className="hidden lg:block">
        <AppSidebar />
      </div>
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
