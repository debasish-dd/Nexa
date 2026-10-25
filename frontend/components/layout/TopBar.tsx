"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Search, X } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import type { Theme } from "./theme";
import { UserFinder } from "../chats/UserFinder";

export function TopBar({
  theme,
  onToggleTheme,
}: {
  theme: Theme;
  onToggleTheme: () => void;
}) {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]">
      {/* Main navbar */}
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4 md:h-16 md:gap-3 md:px-6">
        {/* Mobile logo */}
        <div className="shrink-0 md:hidden">
          <Logo />
        </div>

        {/* Desktop search */}
        <div className="hidden min-w-0 max-w-md flex-1 md:block">
          <UserFinder />
        </div>

        {/* Navbar actions */}
        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          {/* Mobile search toggle */}
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen((open) => !open)}
            aria-label={isMobileSearchOpen ? "Close search" : "Open search"}
            aria-expanded={isMobileSearchOpen}
            className="grid size-9 place-items-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)] md:hidden"
          >
            {isMobileSearchOpen ? <X size={19} /> : <Search size={19} />}
          </button>

          <ThemeToggle
            theme={theme}
            onToggle={onToggleTheme}
          />

          <Link
            href="/notifications"
            aria-label="Notifications"
            title="Notifications"
            className="grid size-9 place-items-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          >
            <Bell size={18} />
          </Link>

          <UserMenu />
        </div>
      </div>

      {/* Mobile search panel */}
      {isMobileSearchOpen && (
        <div className="absolute inset-x-0 top-full z-50 border-b border-[var(--border)] bg-[var(--bg)] px-3 py-3 shadow-lg md:hidden sm:px-4">
          <UserFinder />
        </div>
      )}
    </header>
  );
}