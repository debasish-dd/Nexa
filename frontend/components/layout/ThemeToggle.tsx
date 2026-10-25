"use client";

import { Moon, Sun } from "lucide-react";
import type { Theme } from "./theme";

export function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: Theme;
  onToggle: () => void;
}) {
  const isDark = theme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
      className="grid h-9 w-9 place-items-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}