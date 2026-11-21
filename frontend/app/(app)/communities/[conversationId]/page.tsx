
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useChatStore } from "@/store/chatStore";
import { ChatWindow } from "@/components/chats/ChatWindow";
import { GroupInboxItem } from "@/types/chat";

export default function GroupChatPage() {
  const { conversationId } = useParams<{
    conversationId: string;
  }>();

  const details = useChatStore(
    (s) => s.groups[conversationId]
  );

  const inboxGroup = useChatStore((s) =>
    s.groupInbox.find(
      (item): item is GroupInboxItem =>
        item.type === "gc" &&
        item.conversationId === conversationId
    )?.group
  );

  const name = details?.name ?? inboxGroup?.name ?? "Group";

  const avatarUrl = details
    ? details.groupProfile
    : (inboxGroup?.avatarUrl ?? null);

  const memberCount =
    details?.members.length ?? inboxGroup?.memberCount;

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col overflow-hidden bg-[var(--surface)] text-[var(--text)] md:border-x md:border-[var(--border)]">

      {/* Group header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-[var(--text)] sm:px-4">

        <Link
          href="/communities"
          aria-label="Back to communities"
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-xl text-[var(--text)] transition-colors hover:bg-[var(--surface-2)]"
        >
          <span aria-hidden="true">←</span>
        </Link>

        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="size-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-[var(--accent-fg)]">
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold text-[var(--text)] sm:text-base">
            {name}
          </h1>

          {memberCount !== undefined && (
            <p className="text-xs text-[var(--muted)]">
              {memberCount}{" "}
              {memberCount === 1 ? "member" : "members"}
            </p>
          )}
        </div>
      </header>

      {/* Chat area */}
      <main className="min-h-0 flex-1 overflow-hidden">
        <ChatWindow
          key={conversationId}
          kind="group"
          id={conversationId}
        />
      </main>
    </div>
  );
}
