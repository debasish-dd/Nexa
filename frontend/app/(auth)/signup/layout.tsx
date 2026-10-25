"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) router.replace("/feed");
  }, [isAuthenticated, router]);

  return (
    <main >
      {/* one quiet brand accent — the card stays the focus */}
     

          {children}
      
    </main>
  );
}