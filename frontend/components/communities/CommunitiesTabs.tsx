import Link from "next/link";

export type CommunitiesTab = "joined" | "discover";

const TABS: { id: CommunitiesTab; label: string; href: string }[] = [
  { id: "joined", label: "Joined", href: "/communities" },
  { id: "discover", label: "Discover", href: "/communities?tab=discover" },
];

export function CommunitiesTabs({ active }: { active: CommunitiesTab }) {
  return (
    <nav className="flex border-b border-[var(--border)]">
      {TABS.map((tab) => {
        const isActive = tab.id === active;

        return (
          <Link
            key={tab.id}
            href={tab.href}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={`relative flex-1 py-3 text-center text-sm font-semibold transition-colors hover:bg-[var(--surface-2)] ${
              isActive ? "text-[var(--text)]" : "text-[var(--muted)]"
            }`}
          >
            {tab.label}
            {isActive && (
              <span className="absolute inset-x-0 bottom-0 mx-auto h-0.5 w-12 rounded-full bg-[var(--accent)]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}