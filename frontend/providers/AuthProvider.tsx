"use client";

import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "@/store/authStore";

export function AuthProvider({ children }: { children: ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isInitializing = useAuthStore((s) => s.isInitializing);

  useEffect(() => {
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F1EA]">
        <span className="text-sm text-[#111111]/50">Loading…</span>
      </div>
    );
  }

  return <>{children}</>;
}