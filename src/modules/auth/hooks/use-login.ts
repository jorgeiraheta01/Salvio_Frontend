"use client";

import { useMutation } from "@tanstack/react-query";

import { useAuthStore } from "@/modules/auth/store/auth.store";

export function useLogin() {
  const login = useAuthStore((state) => state.login);

  return useMutation({
    mutationFn: async (payload: { email: string; password: string; tenantId: string }) => {
      return login(payload.email, payload.password, payload.tenantId);
    }
  });
}
