"use client";

import { clearStoredToken, getStoredToken } from "@/core/auth/token-storage";
import { useAuthStore } from "@/modules/auth/store/auth.store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const REQUEST_TIMEOUT_MS = 5000;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean;
};

function getToken(): string | null {
  const stateToken = useAuthStore.getState().token;
  return stateToken ?? getStoredToken();
}

function handleUnauthorized() {
  clearStoredToken();
  useAuthStore.getState().logout(false);
}

export async function httpRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, headers, body, ...rest } = options;
  const token = auth ? getToken() : null;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    console.log("REQUEST ->", API_URL, body);

    const response = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal
    });

    if (response.status === 401) {
      handleUnauthorized();
      throw new ApiError("La sesion expiro. Inicia sesion de nuevo.", 401);
    }

    if (response.status === 404) {
      throw new ApiError("El tenant no existe o no esta disponible.", 404);
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const detail =
        typeof payload?.detail === "string"
          ? payload.detail
          : "No se pudo completar la solicitud.";
      throw new ApiError(detail, response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    console.error("API ERROR:", error);

    throw new ApiError("Error de conexion con backend. Verifica que este corriendo en http://127.0.0.1:8000", 0);
  } finally {
    window.clearTimeout(timeoutId);
  }
}
