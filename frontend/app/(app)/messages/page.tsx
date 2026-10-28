"use client";

import { useEffect } from "react";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { ConversationItem } from "@/components/chats/ConversationItem";

export default function MessagesPage() {
  const inbox = useChatStore((s) => s.inbox);
  const isLoadingInbox = useChatStore((s) => s.isLoadingInbox);
  const inboxError = useChatStore((s) => s.inboxError);
  const loadInbox = useChatStore((s) => s.loadInbox);
  const currentUserId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  return (
    <main className="mx-auto w-full max-w-2xl">
      <h1 className="border-b border-[var(--border)] px-4 py-4 text-xl font-bold text-[var(--text)]">
        Messages
      </h1>

      {isLoadingInbox && inbox.length === 0 && (
        <p className="p-4 text-sm text-[var(--muted)]">Loading conversations…</p>
      )}

      {inboxError && (
        <div className="p-4">
          <p className="text-sm text-[var(--danger)]">{inboxError}</p>
          <button
            onClick={() => loadInbox()}
            className="mt-2 rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-[var(--accent-fg)] hover:opacity-90"
          >
            Try again
          </button>
        </div>
      )}

      {!isLoadingInbox && !inboxError && inbox.length === 0 && (
        <p className="p-8 text-center text-sm text-[var(--muted)]">
          No conversations yet. Open someone&apos;s profile and tap Message.
        </p>
      )}

      {inbox.map((item) => (
        <ConversationItem
          key={item.conversationId}
          item={item}
          currentUserId={currentUserId}
        />
      ))}
    </main>
  );
}