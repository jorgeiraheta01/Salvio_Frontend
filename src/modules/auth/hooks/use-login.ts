"use client";

import { useMutation } from "@tanstack/react-query";

import { useAuthStore } from "@/modules/auth/store/auth.store";
import { useTenant } from "@/shared/components/providers/tenant-provider";

export function useLogin() {
  const login = useAuthStore((state) => state.login);
  const tenant = useTenant();

  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      await login(payload.email, payload.password, tenant);
    }
  });
}
