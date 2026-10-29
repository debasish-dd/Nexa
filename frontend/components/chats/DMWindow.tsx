"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import type { Message } from "@/types/chat";

const NO_MESSAGES: Message[] = [];

type Row =
  | { kind: "day"; key: string; label: string }
  | { kind: "message"; key: string; message: Message; startsGroup: boolean };

const isSameDay = (a: string, b: string) =>
  new Date(a).toDateString() === new Date(b).toDateString();

const dayLabel = (iso: string) => {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
};

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

function MessageBubble({
  message,
  isOwn,
  startsGroup,
}: {
  message: Message;
  isOwn: boolean;
  startsGroup: boolean;
}) {
  const isDeleted = Boolean(message.deletedAt);

  const bubbleStyle = isDeleted
    ? "border border-dashed border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
    : isOwn
      ? "bg-[var(--accent)] text-[var(--accent-fg)]"
      : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]";

  return (
    <div
      className={`flex w-full ${
        isOwn ? "justify-end" : "justify-start"
      } ${startsGroup ? "mt-3" : "mt-1"}`}
    >
      <div
        className={`max-w-[88%] break-words rounded-2xl px-3.5 py-2.5 text-sm leading-5 shadow-sm sm:max-w-[75%] ${
          isOwn ? "rounded-br-md" : "rounded-bl-md"
        } ${bubbleStyle}`}
      >
        {isDeleted ? (
          <span className="italic">This message was deleted</span>
        ) : (
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {message.content}
          </p>
        )}

        <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] leading-4 opacity-70">
          {message.editedAt && !isDeleted && <span>edited</span>}
          <time dateTime={message.createdAt}>
            {timeLabel(message.createdAt)}
          </time>
        </div>
      </div>
    </div>
  );
}

export function DMWindow({ otherUserId }: { otherUserId: string }) {
  const [draft, setDraft] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);

  const currentUserId = useAuthStore((s) => s.user?.id);

  const openDM = useChatStore((s) => s.openDM);
  const closeDM = useChatStore((s) => s.closeDM);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const isLoadingHistory = useChatStore((s) => s.isLoadingHistory);
  const sendError = useChatStore((s) => s.sendError);

  const messages = useChatStore((s) =>
    s.activeConversationId
      ? (s.messages[s.activeConversationId] ?? NO_MESSAGES)
      : NO_MESSAGES,
  );

  useEffect(() => {
  setDraft("");
  openDM(otherUserId);
  return () => closeDM();
}, [openDM, closeDM, otherUserId]);

  // Sort messages and prepare day separators and sender groups.
  const rows = useMemo<Row[]>(() => {
    const sorted = [...messages].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
        a.id.localeCompare(b.id),
    );

    const result: Row[] = [];
    let prev: Message | null = null;

    for (const message of sorted) {
      const newDay = !prev || !isSameDay(prev.createdAt, message.createdAt);

      if (newDay) {
        result.push({
          kind: "day",
          key: `day-${message.id}`,
          label: dayLabel(message.createdAt),
        });
      }

      result.push({
        kind: "message",
        key: message.id,
        message,
        startsGroup: newDay || prev?.senderId !== message.senderId,
      });

      prev = message;
    }

    return result;
  }, [messages]);

  // Start at the bottom when the conversation changes.
  useEffect(() => {
    stickToBottom.current = true;
  }, [activeConversationId]);

  // Keep the newest message visible only if the user was near the bottom.
  useEffect(() => {
    const el = scrollRef.current;

    if (el && stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, activeConversationId]);

  // Grow the composer for multiline text, up to a reasonable maximum.
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;

    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [draft]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    stickToBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const submitDraft = () => {
    const text = draft.trim();

    if (!text || !activeConversationId || isLoadingHistory) {
      return;
    }

    stickToBottom.current = true;
    sendMessage(text);
    setDraft("");
  };

  if (isLoadingHistory && !activeConversationId) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-[var(--surface)] text-[var(--text)]">
        <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
          <span
            className="size-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent-text)]"
            aria-hidden="true"
          />
          Loading conversation…
        </div>
      </div>
    );
  }

  if (!activeConversationId && sendError) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-white p-6 dark:bg-gray-950">
        <p
          role="alert"
          className="max-w-sm text-center text-sm text-red-600 dark:text-red-400"
        >
          {sendError}
        </p>

        <button
          type="button"
          onClick={() => openDM(otherUserId)}
          className="min-h-11 rounded-xl bg-lime-400 px-5 py-2.5 text-sm font-semibold text-[#172000] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-500"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[var(--surface)] text-[var(--text)]">
      {/* Only this region scrolls. */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="log"
        aria-label="Conversation messages"
        aria-relevant="additions"
        className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-3 py-4 sm:px-4 sm:py-5"
      >
        <div className="flex min-h-full flex-col justify-end">
          {rows.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center px-4 py-8 text-center">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                No messages yet
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Start the conversation with a message.
              </p>
            </div>
          ) : (
            rows.map((row) =>
              row.kind === "day" ? (
                <div
                  key={row.key}
                  className="my-4 flex items-center justify-center"
                >
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-medium text-zinc-100 dark:border-zinc-800 dark:bg-zinc-700 dark:text-zinc-400">
                    {row.label}
                  </span>
                </div>
              ) : (
                <MessageBubble
                  key={row.key}
                  message={row.message}
                  isOwn={row.message.senderId === currentUserId}
                  startsGroup={row.startsGroup}
                />
              ),
            )
          )}
        </div>
      </div>

      {sendError && (
        <p
          role="alert"
          className="shrink-0 px-4 pb-2 text-sm text-red-600 dark:text-red-400"
        >
          {sendError}
        </p>
      )}

      {/* Stays at the bottom of the constrained chat container. */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitDraft();
        }}
        className="relative z-10 flex shrink-0 items-end gap-2 border-t border-zinc-200 bg-white/50 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-gray-800 dark:bg-gray-900/50 sm:gap-3 sm:px-4 sm:pt-4"
      >
        <textarea
          ref={composerRef}
          rows={1}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={isLoadingHistory ? "Loading conversation…" : "Message…"}
          aria-label="Message"
          autoComplete="off"
          disabled={!activeConversationId || isLoadingHistory}
          className="max-h-32 min-h-12 min-w-0 flex-1 resize-none overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[15px] leading-5 text-[var(--text)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--accent-text)] disabled:cursor-not-allowed disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={!draft.trim() || !activeConversationId || isLoadingHistory}
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-2xl bg-lime-400 px-4 text-sm font-semibold text-[#172000] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-500 disabled:cursor-not-allowed disabled:opacity-40 sm:px-5"
        >
          Send
        </button>
      </form>
    </div>
  );
}
