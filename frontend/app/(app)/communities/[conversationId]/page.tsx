"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useChatStore } from "@/store/chatStore";
import { ChatWindow } from "@/components/chats/ChatWindow";
import { GroupInboxItem } from "@/types/chat";

export default function GroupChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();

  // The details load together with the chat. Until then, use what the inbox knows.
  const details = useChatStore((s) => s.groups[conversationId]);
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
  const memberCount = details?.members.length ?? inboxGroup?.memberCount;

  return (
    <div className="mx-auto flex h-dvh w-full max-w-2xl flex-col">
      <header className="flex items-center gap-3 border-b border-[var(--border)] px-3 py-3">
        <Link href="/communities"
          aria-label="Back to communities"
          className="rounded-full px-2 py-1 text-xl text-[var(--text)] hover:bg-[var(--surface-2)]"
        >
          ←
        </Link>

        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-[var(--accent-fg)]">
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold text-[var(--text)]">{name}</h1>
          {memberCount !== undefined && (
            <p className="text-xs text-[var(--muted)]">
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </p>
          )}
        </div>

        {/* Step 6 puts the members panel button here. */}
      </header>

      <div className="min-h-0 flex-1">
        {/* key resets the draft text when you move to a different group */}
        <ChatWindow key={conversationId} kind="group" id={conversationId} />
      </div>
    </div>
  );
}