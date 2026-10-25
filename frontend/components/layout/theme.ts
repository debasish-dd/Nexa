export type Theme = "light" | "dark";

const STORAGE_KEY = "nexa-theme";

// Saved choice wins; otherwise follow the device's light/dark setting.
export function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // storage blocked (private mode etc.) — fall through to the system setting
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function saveTheme(theme: Theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // storage blocked — the toggle still works for this session
  }
}