"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { getInitialTheme, saveTheme, type Theme } from "./theme";

export function AppShell({ children }: { children: ReactNode }) {
  // Reading localStorage in the initial state is safe here: AuthProvider only
  // renders its children after mount, so this never runs during server render.
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    saveTheme(next);
  };

  return (
    <div
      data-theme={theme}
      className="app-shell min-h-screen bg-(--bg) text-(--text)"
    >
      <Sidebar />

      {/* Content is pushed right of the sidebar (rail on md, full on lg) */}
      <div className="md:pl-18 lg:pl-60">
        <TopBar theme={theme} onToggleTheme={toggleTheme} />
        {/* bottom padding on phones leaves room for the fixed bottom nav */}
        <main className="px-4 pb-24 pt-4 md:px-6 md:pb-6 md:pt-6">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}