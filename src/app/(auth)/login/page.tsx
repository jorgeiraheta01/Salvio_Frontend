import { headers } from "next/headers";

import { LoginForm } from "@/components/auth/LoginForm";

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

export default function LoginPage() {
  const host = headers().get("host") ?? "";
  const subdomain = extractSubdomain(host);

  return <LoginForm subdomain={subdomain} />;
}
