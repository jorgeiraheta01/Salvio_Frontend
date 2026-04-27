"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/modules/auth/store/auth.store";

export default function HomePage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    router.replace(token ? "/dashboard" : "/login");
  }, [token, isHydrated, router]);

  return null;
}
