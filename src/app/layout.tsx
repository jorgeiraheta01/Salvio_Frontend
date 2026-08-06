import type { Metadata } from "next";
import { Manrope } from "next/font/google";

import { env } from "@/core/config/env";
import { AppProviders } from "@/shared/components/providers/app-providers";
import { getTenantServer } from "@/shared/utils/tenant-server";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope"
});

export const metadata: Metadata = {
  title: env.appName,
  description: "Frontend SaaS multi-tenant para Salvio."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const tenant = getTenantServer();

  return (
    <html lang="es" className={manrope.variable}>
      <body className="font-sans">
        <AppProviders tenant={tenant}>{children}</AppProviders>
      </body>
    </html>
  );
}
