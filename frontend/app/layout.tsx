"use client";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/providers/AuthProvider";
import "./globals.css";
import { useRouter } from "next/dist/client/components/navigation";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// export const metadata: Metadata = {
//   title: "NEXA",
//   description: "Connect with your campus community.",
// };

export default function RootLayout({
  children,
}: LayoutProps<"/">) {

  const router = useRouter();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  
    useEffect(() => {
      console.log("isAuthenticated:", isAuthenticated);
      if (isAuthenticated) router.replace("/feed");
    }, [isAuthenticated, router]);
  
  

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}