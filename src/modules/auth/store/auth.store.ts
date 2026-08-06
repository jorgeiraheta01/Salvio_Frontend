"use client";

import { create } from "zustand";

import { isTokenExpired } from "@/core/auth/jwt";
import {
  clearStoredRefreshToken,
  clearStoredToken,
  getStoredRefreshToken,
  getStoredToken,
  setStoredRefreshToken,
  setStoredToken
} from "@/core/auth/token-storage";
import { login as loginRequest, logout as logoutRequest, verifyTwoFA as verifyTwoFARequest, type LoginResponse } from "@/modules/auth/services/auth.service";

type AuthState = {
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  initialize: () => void;
  hydrateAuthState: () => Promise<void>;
  setToken: (token: string | null, refreshToken?: string | null) => void;
  login: (email: string, password: string, tenantId: string) => Promise<LoginResponse>;
  verifyTwoFA: (otpCode: string, tempToken: string) => Promise<void>;
  logout: (redirect?: boolean) => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  isAuthenticated: false,
  isHydrated: false,
  initialize: () => {
    if (get().isHydrated) {
      return;
    }

    const token = getStoredToken();
    if (!token || isTokenExpired(token)) {
      clearStoredToken();
      set({ token: null, isAuthenticated: false, isHydrated: true });
      return;
    }

    set({ token, isAuthenticated: true, isHydrated: true });
  },
  hydrateAuthState: async () => {
    const token = getStoredToken();
    if (!token || isTokenExpired(token)) {
      clearStoredToken();
      set({ token: null, isAuthenticated: false, isHydrated: true });
      return;
    }
    set({ token, isAuthenticated: true, isHydrated: true });
  },
  setToken: (token, refreshToken) => {
    if (!token || isTokenExpired(token)) {
      clearStoredToken();
      clearStoredRefreshToken();
      set({ token: null, isAuthenticated: false, isHydrated: true });
      return;
    }
    setStoredToken(token);
    if (refreshToken) {
      setStoredRefreshToken(refreshToken);
    }
    set({ token, isAuthenticated: true, isHydrated: true });
  },
  login: async (email, password, tenantId) => {
    const response = await loginRequest(email, password, tenantId);
    if (!response.requires_2fa) {
      get().setToken(response.access_token, response.refresh_token);
    }
    return response;
  },
  verifyTwoFA: async (otpCode, tempToken) => {
    const response = await verifyTwoFARequest(otpCode, tempToken);
    get().setToken(response.access_token, response.refresh_token);
  },
  logout: (redirect = true) => {
    // Solo se invoca el logout del backend en el cierre de sesion interactivo
    // (boton "Salir"), no cuando handleUnauthorized() fuerza logout tras un 401 —
    // en ese caso el token ya es invalido y la llamada solo fallaria de nuevo.
    const refreshToken = getStoredRefreshToken();
    if (redirect && refreshToken) {
      logoutRequest(refreshToken).catch(() => {
        // Best-effort: la sesion local se limpia igual aunque el backend falle.
      });
    }
    clearStoredToken();
    clearStoredRefreshToken();
    set({ token: null, isAuthenticated: false, isHydrated: true });
    if (redirect && typeof window !== "undefined") {
      window.location.assign("/login");
    }
  }
}));
