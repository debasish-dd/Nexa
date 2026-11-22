"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { ConversationItem } from "@/components/chats/ConversationItem";

export function JoinedTab() {
  const groupInbox = useChatStore((s) => s.groupInbox);
  const isLoadingGroupInbox = useChatStore((s) => s.isLoadingGroupInbox);
  const groupInboxError = useChatStore((s) => s.groupInboxError);
  const loadGroupInbox = useChatStore((s) => s.loadGroupInbox);

  const currentUserId = useAuthStore((s) => s.user?.id);
  const [query, setQuery] = useState("");

  useEffect(() => {
    loadGroupInbox();
  }, [loadGroupInbox]);

  const trimmed = query.trim().toLowerCase();
  const visible = trimmed
    ? groupInbox.filter(
        (item) =>
          item.type === "gc" && item.group.name.toLowerCase().includes(trimmed),
      )
    : groupInbox;

  return (
    <>
      {groupInbox.length > 0 && (
        <div className="border-b border-[var(--border)] px-4 py-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your communities"
            autoComplete="off"
            className="w-full rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-text)]"
          />
        </div>
      )}

      {isLoadingGroupInbox && groupInbox.length === 0 && (
        <p className="p-4 text-sm text-[var(--muted)]">Loading communities…</p>
      )}

      {groupInboxError && (
        <div className="p-4">
          <p className="text-sm text-[var(--danger)]">{groupInboxError}</p>
          <button
            onClick={() => loadGroupInbox()}
            className="mt-2 rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-[var(--accent-fg)] hover:opacity-90"
          >
            Try again
          </button>
        </div>
      )}

      {!isLoadingGroupInbox && !groupInboxError && groupInbox.length === 0 && (
        <p className="p-8 text-center text-sm text-[var(--muted)]">
          You haven&apos;t joined any communities yet.{" "}
          <Link
            href="/communities?tab=discover"
            className="font-semibold text-[var(--accent)] hover:underline"
          >
            Find some
          </Link>
        </p>
      )}

      {groupInbox.length > 0 && visible.length === 0 && (
        <p className="p-8 text-center text-sm text-[var(--muted)]">
          No communities match &ldquo;{query.trim()}&rdquo;.
        </p>
      )}

      {visible.map((item) => (
        <ConversationItem
          key={item.conversationId}
          item={item}
          currentUserId={currentUserId}
        />
      ))}
    </>
  );
}