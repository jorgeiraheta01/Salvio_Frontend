import { headers } from "next/headers";

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

function extractSubdomain(hostHeader: string): string {
  const hostname = hostHeader.split(":")[0]?.toLowerCase() ?? "";

  if (!hostname) {
    return "";
  }

  if (hostname.endsWith(".localhost")) {
    return hostname.split(".")[0] ?? "";
  }

  const labels = hostname.split(".").filter(Boolean);

  if (labels.length >= 3) {
    return labels[0] ?? "";
  }

  return "";
}

export default function ForgotPasswordPage() {
  const host = headers().get("host") ?? "";
  const subdomain = extractSubdomain(host);

  return <ForgotPasswordForm subdomain={subdomain} />;
}
