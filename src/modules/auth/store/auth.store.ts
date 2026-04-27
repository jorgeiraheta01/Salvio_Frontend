"use client";

import { create } from "zustand";

import { isTokenExpired } from "@/core/auth/jwt";
import { clearStoredToken, getStoredToken, setStoredToken } from "@/core/auth/token-storage";
import { login as loginRequest } from "@/modules/auth/services/auth.service";

type AuthState = {
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  initialize: () => void;
  login: (email: string, password: string, tenantId: string) => Promise<void>;
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
  login: async (email, password, tenantId) => {
    const response = await loginRequest(email, password, tenantId);
    setStoredToken(response.access_token);
    set({ token: response.access_token, isAuthenticated: true, isHydrated: true });
  },
  logout: (redirect = true) => {
    clearStoredToken();
    set({ token: null, isAuthenticated: false, isHydrated: true });
    if (redirect && typeof window !== "undefined") {
      window.location.assign("/login");
    }
  }
}));
