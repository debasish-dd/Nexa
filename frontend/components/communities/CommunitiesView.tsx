"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { ConversationItem } from "@/components/chats/ConversationItem";
import {
  CommunitiesTabs,
  type CommunitiesTab,
} from "@/components/communities/CommunitiesTabs";
import { CreateGroupDialog } from "@/components/messages/CreateGroupDialog";

export function CommunitiesView() {
  const searchParams = useSearchParams();
  const activeTab: CommunitiesTab =
    searchParams.get("tab") === "discover" ? "discover" : "joined";

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
      <CreateGroupDialog open={creating} onClose={() => setCreating(false)} />
      <div className="flex items-center justify-between px-4 py-4">
        <h1 className="text-xl font-bold text-[var(--text)]">Communities</h1>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-[var(--accent-fg)] hover:opacity-90"
        >
          New group
        </button>
      </div>

      <CommunitiesTabs active={activeTab} />

      {activeTab === "joined" && (
        <>
          {isLoadingGroupInbox && groupInbox.length === 0 && (
            <p className="p-4 text-sm text-[var(--muted)]">
              Loading communities…
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

          {!isLoadingGroupInbox &&
            !groupInboxError &&
            groupInbox.length === 0 && (
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

          {groupInbox.map((item) => (
            <ConversationItem
              key={item.conversationId}
              item={item}
              currentUserId={currentUserId}
            />
          ))}
        </>
      )}

      {activeTab === "discover" && (
        <p className="p-8 text-center text-sm text-[var(--muted)]">
          Discover goes here (Step 3).
        </p>
      )}
    </main>
  );
}