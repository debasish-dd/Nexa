"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_NAV_HREFS, NAV_ITEMS } from "./nav";

export function MobileNav() {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => MOBILE_NAV_HREFS.includes(item.href));

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[var(--border)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
              active ? "text-[var(--accent-text)]" : "text-[var(--muted)]"
            }`}
          >
            <Icon size={22} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}