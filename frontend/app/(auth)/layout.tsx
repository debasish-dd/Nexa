"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F3F1EA] px-4 py-12">
      {/* one quiet brand accent — the card stays the focus */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#D7FF3F]/40 blur-3xl" />

      <div className="relative w-full max-w-105">
        <div className="mb-8 text-center">
          <span className="text-lg font-extrabold tracking-tight text-[#111111]">
            NEXA
          </span>
        </div>

        <div className="rounded-3xl border-2 border-[#111111] bg-white p-8 shadow-[6px_6px_0_0_#111111]">
          {children}
        </div>
      </div>
    </main>
  );
}