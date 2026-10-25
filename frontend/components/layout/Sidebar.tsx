"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { NAV_ITEMS } from "./nav";

// Tablet (md): narrow icon-only rail. Desktop (lg+): full sidebar with labels.
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[72px] flex-col border-r border-[var(--border)] bg-[var(--surface)] px-3 py-5 md:flex lg:w-60 lg:px-4">
      <Logo
        className="mb-6 justify-center lg:justify-start lg:px-2"
        wordmarkClassName="hidden lg:inline"
      />

      <nav aria-label="Main" className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors lg:justify-start ${
                active
                  ? "bg-[var(--surface-2)] font-semibold text-[var(--text)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              }`}
            >
              <Icon
                size={22}
                className={active ? "text-[var(--accent-text)]" : ""}
              />
              <span className="hidden lg:inline">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}