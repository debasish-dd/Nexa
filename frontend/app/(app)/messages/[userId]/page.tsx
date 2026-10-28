"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useChatStore } from "@/store/chatStore";
// ⚠️ Adjust this import to wherever your DMWindow file lives.
import { DMWindow } from "@/components/chats/DMWindow";

export default function ChatPage() {
  const { userId } = useParams<{ userId: string }>();

  // Found when you arrive from the inbox. For a brand-new chat or after a
  // page refresh, the inbox has nothing for this user, so we use fallbacks.
  const otherUser = useChatStore(
    (s) => s.inbox.find((item) => item.otherUser.id === userId)?.otherUser
  );

  const name = otherUser?.username ?? "Conversation";

  return (
    <div className="mx-auto flex h-dvh w-full max-w-2xl flex-col">
      <header className="flex items-center gap-3 border-b border-[var(--border)] px-3 py-3">
        <Link
          href="/messages"
          aria-label="Back to messages"
          className="rounded-full px-2 py-1 text-xl text-[var(--text)] hover:bg-[var(--surface-2)]"
        >
          ←
        </Link>

        {otherUser?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={otherUser.avatarUrl}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-[var(--accent-fg)]">
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        <h1 className="truncate font-semibold text-[var(--text)]">{name}</h1>
      </header>

      <div className="min-h-0 flex-1">
        {/* key resets the draft text when you move to a different chat */}
        <DMWindow key={userId} otherUserId={userId} />
      </div>
    </div>
  );
}