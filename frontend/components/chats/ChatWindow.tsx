"use client";

import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type SubmitEvent,
} from "react";
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
  senderName,
}: {
  message: Message;
  isOwn: boolean;
  startsGroup: boolean;
  senderName?: string | undefined;
}) {
  const isDeleted = Boolean(message.deletedAt);

  const bubbleStyle = isDeleted
    ? "border border-dashed border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
    : isOwn
      ? "bg-[var(--accent)] text-[var(--accent-fg)]"
      : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]";

  return (
    <div
      className={`flex w-full flex-col ${
        isOwn ? "items-end" : "items-start"
      } ${startsGroup ? "mt-3" : "mt-1"}`}
    >
      {/* In groups, other people's messages show who wrote them. */}
      {senderName && !isOwn && startsGroup && (
        <p className="mb-0.5 px-1 text-xs font-medium text-[var(--muted)]">
          {senderName}
        </p>
      )}

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

// kind "dm": id is the other user's id. kind "group": id is the conversation id.
export function ChatWindow({
  kind,
  id,
}: {
  kind: "dm" | "group";
  id: string;
}) {
  const [draft, setDraft] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const restoreScrollHeight = useRef<number | null>(null);

  const currentUserId = useAuthStore((s) => s.user?.id);

  const failedDraft = useChatStore((s) => s.failedDraft);
  const clearFailedDraft = useChatStore((s) => s.clearFailedDraft);
  const closedNotice = useChatStore((s) => s.closedNotice);
  const clearClosedNotice = useChatStore((s) => s.clearClosedNotice);

  const openDM = useChatStore((s) => s.openDM);
  const openGroup = useChatStore((s) => s.openGroup);
  const closeDM = useChatStore((s) => s.closeDM);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const isLoadingHistory = useChatStore((s) => s.isLoadingHistory);
  const sendError = useChatStore((s) => s.sendError);
  const loadOlderMessages = useChatStore((s) => s.loadOlderMessages);
  const isLoadingOlder = useChatStore((s) => s.isLoadingOlder);
  const olderError = useChatStore((s) => s.olderError);
  const hasMore = useChatStore((s) =>
    s.activeConversationId
      ? (s.hasMore[s.activeConversationId] ?? false)
      : false,
  );
  const messages = useChatStore((s) =>
    s.activeConversationId
      ? (s.messages[s.activeConversationId] ?? NO_MESSAGES)
      : NO_MESSAGES,
  );
  const members = useChatStore((s) =>
    s.activeConversationId
      ? s.groups[s.activeConversationId]?.members
      : undefined,
  );

  // userId -> name, for the labels above other people's messages in a group.
  const nameById = useMemo(
    () => new Map((members ?? []).map((m) => [m.userId, m.username] as const)),
    [members],
  );

  const openChat = () => (kind === "group" ? openGroup(id) : openDM(id));

  useEffect(() => {
    setDraft("");
    if (kind === "group") openGroup(id);
    else openDM(id);
    return () => closeDM();
  }, [kind, id, openDM, openGroup, closeDM]);

  const requestOlder = () => {
    const el = scrollRef.current;
    if (!el) return;
    // Remember how tall the list is now, so we can keep the user's place
    // after the older messages are inserted above.
    restoreScrollHeight.current = el.scrollHeight;
    loadOlderMessages();
  };

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || isLoadingOlder) return;

    if (restoreScrollHeight.current !== null) {
      // Older messages were just added above: shift down by their height so the
      // same message stays under the user's eyes.
      el.scrollTop += el.scrollHeight - restoreScrollHeight.current;
      restoreScrollHeight.current = null;
    }

    // If the messages don't fill the screen, no scroll event can ever fire.
    // Keep loading until they do, or there's nothing left.
    if (hasMore && !olderError && el.scrollHeight <= el.clientHeight) {
      requestOlder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, isLoadingOlder]);

  useEffect(() => {
    if (failedDraft && failedDraft.conversationId === activeConversationId) {
      // Don't overwrite something the user has already started typing.
      setDraft((current) => current || failedDraft.content);
      clearFailedDraft();
    }
  }, [failedDraft, activeConversationId, clearFailedDraft]);

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

    if (el.scrollTop < 80 && hasMore && !isLoadingOlder && !olderError) {
      requestOlder();
    }
  };

  const submitDraft = () => {
    const text = draft.trim();

    if (!text || !activeConversationId || isLoadingHistory) {
      return;
    }

    stickToBottom.current = true;

    // Only clear the input if the message actually went out.
    if (sendMessage(text)) {
      setDraft("");
    }
  };

  // The chat was closed under us: we were removed, we left, or it was deleted.
  if (closedNotice) {
    const text =
      closedNotice.reason === "removed"
        ? "You were removed from this group."
        : closedNotice.reason === "left"
          ? "You left this group."
          : "This conversation was deleted.";

    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-[var(--surface)] p-6 text-center text-[var(--text)]">
        <p className="text-sm">{text}</p>
        <Link
          href="/messages"
          onClick={clearClosedNotice}
          className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--accent-fg)] hover:opacity-90"
        >
          Back to messages
        </Link>
      </div>
    );
  }

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
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-[var(--surface)] p-6">
        <p
          role="alert"
          className="max-w-sm text-center text-sm text-[var(--danger)]"
        >
          {sendError}
        </p>

        <button
          type="button"
          onClick={openChat}
          className="min-h-11 rounded-xl bg-lime-400 px-5 py-2.5 text-sm font-semibold text-[#172000] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-500"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[var(--surface)] text-[var(--text)]">
      {/* Floating loading / error pill */}
      {(isLoadingOlder || olderError) && (
        <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center">
          {isLoadingOlder ? (
            <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--muted)] shadow">
              Loading older messages…
            </span>
          ) : (
            <button
              type="button"
              onClick={requestOlder}
              className="pointer-events-auto rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--danger)] shadow"
            >
              Could not load older messages · Retry
            </button>
          )}
        </div>
      )}

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
              <p className="text-sm font-medium text-[var(--text)]">
                No messages yet
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {kind === "group"
                  ? "Say hello to the group."
                  : "Start the conversation with a message."}
              </p>
            </div>
          ) : (
            rows.map((row) =>
              row.kind === "day" ? (
                <div
                  key={row.key}
                  className="my-4 flex items-center justify-center"
                >
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-[11px] font-medium text-[var(--muted)]">
                    {row.label}
                  </span>
                </div>
              ) : (
                <MessageBubble
                  key={row.key}
                  message={row.message}
                  isOwn={row.message.senderId === currentUserId}
                  startsGroup={row.startsGroup}
                  senderName={
                    kind === "group"
                      ? (nameById.get(row.message.senderId) ?? "Former member")
                      : undefined
                  }
                />
              ),
            )
          )}
        </div>
      </div>

      {sendError && (
        <p
          role="alert"
          className="shrink-0 px-4 pb-2 text-sm text-[var(--danger)]"
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
        className="relative z-10 flex shrink-0 items-end gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-3 sm:px-4 sm:pt-4"
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
          className="max-h-32 min-h-12 min-w-0 flex-1 resize-none overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-base leading-5 text-[var(--text)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--accent-text)] disabled:cursor-not-allowed disabled:opacity-50 sm:text-[15px]"
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