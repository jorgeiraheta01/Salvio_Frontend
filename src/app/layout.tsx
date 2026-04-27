import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { env } from "@/core/config/env";
import { AppProviders } from "@/shared/components/providers/app-providers";
import { getTenantServer } from "@/shared/utils/tenant-server";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: env.appName,
  description: "Frontend SaaS multi-tenant para Salvio."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const tenant = getTenantServer();

  return (
    <html lang="es">
      <body className={inter.className}>
        <AppProviders tenant={tenant}>{children}</AppProviders>
      </body>
    </html>
  );
}
