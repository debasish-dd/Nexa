"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { AppShell } from "@/components/layout/AppShell";
import "./app-theme.css";

// Every page inside (app)/ gets the shell, and logged-out visitors get sent
// to /login. AuthProvider (root layout) has already finished checking the
// session by the time this renders, so isAuthenticated is trustworthy here.
export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return <AppShell>{children}</AppShell>;
}