type JwtPayload = {
  exp?: number;
  tenant_id?: string;
  role?: string;
  sub?: string;
};

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  if (typeof window === "undefined") {
    return Buffer.from(normalized + padding, "base64").toString("utf-8");
  }
  return window.atob(normalized + padding);
}

export function parseJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) {
      return null;
    }
    return JSON.parse(decodeBase64Url(parts[1])) as JwtPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = parseJwt(token);
  if (!payload?.exp) {
    return true;
  }
  return payload.exp * 1000 <= Date.now();
}
