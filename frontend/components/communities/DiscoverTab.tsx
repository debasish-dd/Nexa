"use client";

import { useEffect, useRef } from "react";
import { useDiscoverGroups } from "@/hooks/useDiscoverGroups";
import { CommunityCard } from "@/components/communities/CommunityCard";

export function DiscoverTab() {
  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDiscoverGroups();

  // An invisible div at the bottom of the list. When it scrolls
  // into view, we load the next page.
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" }, // start loading a bit before the bottom
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const groups = data?.pages.flatMap((page) => page.groups) ?? [];

  if (isPending) {
    return <p className="p-4 text-sm text-[var(--muted)]">Loading communities…</p>;
  }

  if (isError) {
    return (
      <div className="p-4">
        <p className="text-sm text-[var(--danger)]">
          {error instanceof Error ? error.message : "Could not load communities"}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-2 rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-[var(--accent-fg)] hover:opacity-90"
        >
          Try again
        </button>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-[var(--muted)]">
        No communities to discover yet.
      </p>
    );
  }

  return (
    <>
      {groups.map((group) => (
        <CommunityCard key={group.conversationId} group={group} />
      ))}

      {isFetchingNextPage && (
        <p className="p-4 text-center text-sm text-[var(--muted)]">
          Loading more…
        </p>
      )}

      {hasNextPage && <div ref={sentinelRef} className="h-1" />}
    </>
  );
}