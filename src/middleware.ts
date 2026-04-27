import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { TENANT_HEADER, resolveTenantFromHost } from "@/shared/utils/tenant";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host");
  const tenant = resolveTenantFromHost(hostname);
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set(TENANT_HEADER, tenant);

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"]
};
