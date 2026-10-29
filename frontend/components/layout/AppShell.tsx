"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { getInitialTheme, saveTheme, type Theme } from "./theme";

export function AppShell({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const pathname = usePathname();

  const isConversationPage = /^\/messages\/[^/]+\/?$/.test(pathname);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    saveTheme(next);
  };

  return (
    <div
      data-theme={theme}
      className={`app-shell bg-(--bg) text-(--text) ${
        isConversationPage
          ? "h-dvh overflow-hidden"
          : "min-h-screen"
      }`}
    >
      <Sidebar />

      <div
        className={`md:pl-18 lg:pl-60 ${
          isConversationPage
            ? "flex h-full min-h-0 flex-col"
            : ""
        }`}
      >
        <div className={isConversationPage ? "shrink-0" : ""}>
          <TopBar theme={theme} onToggleTheme={toggleTheme} />
        </div>

        <main
          className={
            isConversationPage
              ? "min-h-0 flex-1 overflow-hidden"
              : "px-4 pb-24 pt-4 md:px-6 md:pb-6 md:pt-6"
          }
        >
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}