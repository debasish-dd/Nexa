
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useChatStore } from "@/store/chatStore";
import { getUserById } from "@/libs/users/api";
import type { PublicUserProfile } from "@/types/user";
import { DMWindow } from "@/components/chats/DMWindow";

export default function ChatPage() {
  const { userId } = useParams<{ userId: string }>();

  const [fetchedUser, setFetchedUser] =
    useState<PublicUserProfile | null>(null);

  const inboxUser = useChatStore((s) =>
    s.inbox.find((item) => item.otherUser.id === userId)?.otherUser
  );

  useEffect(() => {
    let cancelled = false;

    if (!inboxUser) {
      getUserById(userId)
        .then((user) => {
          if (!cancelled) setFetchedUser(user);
        })
        .catch(() => {
          if (!cancelled) setFetchedUser(null);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [userId, inboxUser]);

  const fetched = fetchedUser?.id === userId ? fetchedUser : null;

  const name =
    inboxUser?.username ??
    fetched?.displayName ??
    fetched?.username ??
    "Conversation";

  const avatarUrl =
    inboxUser?.avatarUrl ?? fetched?.avatarUrl ?? null;

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col overflow-hidden bg-[var(--surface)] text-[var(--text)] md:border-x md:border-[var(--border)]">
      <header className="flex shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-[var(--text)] sm:px-4">
        <Link
          href="/messages"
          aria-label="Back to messages"
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-xl text-[var(--text)] transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-text)]"
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

          <p className="text-xs text-[var(--muted)]">
            Direct message
          </p>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">
        <DMWindow key={userId} otherUserId={userId} />
      </main>
    </div>
  );
}
