"use client";
import { useState } from "react";
import { CreateGroupDialog } from "@/components/messages/CreateGroupDialog";
import { useEffect } from "react";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { ConversationItem } from "@/components/chats/ConversationItem";

export default function MessagesPage() {
  const groupInbox = useChatStore((s) => s.groupInbox);
  const isLoadingGroupInbox = useChatStore((s) => s.isLoadingGroupInbox);
  const groupInboxError = useChatStore((s) => s.groupInboxError);

  const loadGroupInbox = useChatStore((s) => s.loadGroupInbox);

  const currentUserId = useAuthStore((s) => s.user?.id);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadGroupInbox();
  }, [loadGroupInbox]);

  return (
    <main className="mx-auto w-full max-w-2xl">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
        <h1 className="text-xl font-bold text-[var(--text)]">Messages</h1>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-[var(--accent-fg)] hover:opacity-90"
        >
          New group
        </button>
      </div>

      {isLoadingGroupInbox && groupInbox.length === 0 && (
        <p className="p-4 text-sm text-[var(--muted)]">
          Loading conversations…
        </p>
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
          No conversations yet. Open someone&apos;s profile and tap Message.
        </p>
      )}

      {groupInbox.map((item) => (
        <ConversationItem
          key={item.conversationId}
          item={item}
          currentUserId={currentUserId}
        />
      ))}
    </main>
  );
}
