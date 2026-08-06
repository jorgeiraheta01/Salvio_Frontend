"use client";

import { clearStoredToken, getStoredRefreshToken, getStoredToken } from "@/core/auth/token-storage";
import { useAuthStore } from "@/modules/auth/store/auth.store";
import { TENANT_HEADER, resolveTenantFromHost } from "@/shared/utils/tenant";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const REQUEST_TIMEOUT_MS = 5000;

let refreshPromise: Promise<string | null> | null = null;

/**
 * Renueva el access token usando el refresh token guardado. Deduplicado con
 * refreshPromise para que varias peticiones 401 en paralelo no disparen
 * multiples refresh simultaneos contra el backend.
 */
function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    return Promise.resolve(null);
  }
  refreshPromise = fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken })
  })
    .then(async (response) => {
      if (!response.ok) return null;
      const data = (await response.json()) as { access_token: string };
      useAuthStore.getState().setToken(data.access_token);
      return data.access_token;
    })
    .catch(() => null)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

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

function getTenantHeaderValue(): string {
  if (typeof window === "undefined") {
    return resolveTenantFromHost(null);
  }
  return resolveTenantFromHost(window.location.hostname);
}

/** Traduce nombres de campo tecnicos del backend a una etiqueta legible en el mensaje de error. */
const FIELD_LABELS: Record<string, string> = {
  dui: "DUI",
  nit: "NIT",
  email: "Correo electronico",
  phone: "Telefono",
  medical_record_number: "Numero de expediente",
  first_name: "Nombre",
  last_name: "Apellido",
  date_of_birth: "Fecha de nacimiento",
  insurance_number: "Numero de afiliacion",
  emergency_contact_name: "Contacto de emergencia",
  emergency_contact_phone: "Telefono de emergencia",
  emergency_contact_relationship: "Parentesco del contacto",
  password: "Contrasena",
  new_password: "Contrasena nueva"
};

/**
 * El backend a veces devuelve `detail` como string (errores de negocio) y a veces
 * como array de objetos FastAPI ({type, loc, msg, ...}) para errores de validacion
 * (incluye validadores custom, ej. "requires one primary diagnosis"). Sin esto,
 * cualquier 422 de ese segundo tipo caia al mensaje generico y ocultaba la razon real.
 * Ademas antepone el nombre del campo (via `loc`) cuando lo reconocemos, para que un
 * mensaje tecnico como "String should have at least 10 characters" diga a que campo
 * corresponde en vez de quedar suelto sin contexto.
 */
function extractErrorDetail(detail: unknown): string | null {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (!item || typeof item !== "object" || !("msg" in item)) return null;
        const msg = String((item as { msg: unknown }).msg);
        const loc = "loc" in item ? (item as { loc: unknown }).loc : null;
        const fieldKey = Array.isArray(loc) ? String(loc[loc.length - 1]) : null;
        const label = fieldKey ? FIELD_LABELS[fieldKey] : null;
        return label ? `${label}: ${msg}` : msg;
      })
      .filter((msg): msg is string => Boolean(msg));
    if (messages.length > 0) return messages.join(" ");
  }
  return null;
}

function handleUnauthorized() {
  clearStoredToken();
  useAuthStore.getState().logout(false);
}

/**
 * Un 403 puede significar tres cosas distintas, y cada una amerita una
 * reaccion distinta -- no todo 403 debe sacar a la persona de la app:
 *  - la clinica entera quedo bloqueada: hay que cerrar sesion y mandarla a
 *    "clinica bloqueada", igual que ya hace el login.
 *  - un modulo especifico fue desactivado a mitad de sesion: la sesion
 *    sigue siendo valida (el resto de la clinica funciona), asi que solo
 *    se refresca la vista actual para que ModuleGateBoundary la reconozca
 *    y muestre su propia pantalla de "este modulo no esta disponible" en
 *    vez de dejar el error crudo del backend incrustado en la pagina.
 *  - un 403 normal de permisos por rol (ej. una recepcionista pegandole a
 *    un endpoint solo de doctor): ese sigue siendo un error de la
 *    pantalla actual, no amerita sacar a nadie de nada.
 * Se distinguen por el texto de `detail` que el backend ya usa de forma
 * consistente (get_current_user / require_module).
 */
function isClinicDeactivatedDetail(detail: string | null): boolean {
  return Boolean(detail && /clinic has been deactivated/i.test(detail));
}

function isModuleDisabledDetail(detail: string | null): boolean {
  return Boolean(detail && /is disabled for this clinic/i.test(detail));
}

export async function httpRequest<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const { auth = true, headers, body, ...rest } = options;
  const token = auth ? getToken() : null;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        [TENANT_HEADER]: getTenantHeaderValue(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal
    });

    if (response.status === 401) {
      if (auth && !isRetry) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          window.clearTimeout(timeoutId);
          return httpRequest<T>(path, options, true);
        }
      }
      handleUnauthorized();
      throw new ApiError("La sesion expiro. Inicia sesion de nuevo.", 401);
    }

    if (response.status === 404) {
      throw new ApiError("El tenant no existe o no esta disponible.", 404);
    }

    if (response.status === 403 && auth) {
      const payload = await response.json().catch(() => null);
      const detail = extractErrorDetail(payload?.detail);
      if (isClinicDeactivatedDetail(detail)) {
        handleUnauthorized();
        if (typeof window !== "undefined") {
          window.location.href = "/clinica-bloqueada";
        }
        throw new ApiError(detail ?? "Esta clinica no esta disponible.", 403);
      }
      if (isModuleDisabledDetail(detail) && typeof window !== "undefined") {
        window.location.reload();
        throw new ApiError(detail ?? "Este modulo no esta disponible.", 403);
      }
      throw new ApiError(detail ?? "No tienes permiso para realizar esta accion.", 403);
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const detail = extractErrorDetail(payload?.detail) ?? "No se pudo completar la solicitud.";
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

    throw new ApiError("Error de conexion con backend. Verifica que este corriendo en http://127.0.0.1:8000", 0);
  } finally {
    window.clearTimeout(timeoutId);
  }
}
