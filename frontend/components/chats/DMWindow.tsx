"use client";

import { useEffect, useMemo, useRef, useState, type SubmitEvent } from "react";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import type { Message } from "@/types/chat";

// A constant, so the selector below never returns a brand-new [] on every call.
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
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

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
    ? "border border-dashed border-[var(--border)] text-[var(--muted)]"
    : isOwn
      ? "bg-[var(--accent)] text-[var(--accent-fg)]"
      : "bg-[var(--surface-2)] text-[var(--text)]";

  return (
    <div
      className={`flex ${isOwn ? "justify-end" : "justify-start"} ${
        startsGroup ? "mt-3" : "mt-0.5"
      }`}
    >
      <div
        className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-[15px] ${bubbleStyle}`}
      >
        {isDeleted ? (
          <span className="italic">This message was deleted</span>
        ) : (
          <p className="whitespace-pre-wrap wrap-break-word">{message.content}</p>
        )}
        <div className="mt-0.5 flex justify-end gap-1 text-[11px] opacity-70">
          {message.editedAt && !isDeleted && <span>edited</span>}
          <span>{timeLabel(message.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

export function DMWindow({ otherUserId }: { otherUserId: string }) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const currentUserId = useAuthStore((s) => s.user?.id);
  const openDM = useChatStore((s) => s.openDM);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const isLoadingHistory = useChatStore((s) => s.isLoadingHistory);
  const sendError = useChatStore((s) => s.sendError);
  const messages = useChatStore((s) =>
    s.activeConversationId
      ? (s.messages[s.activeConversationId] ?? NO_MESSAGES)
      : NO_MESSAGES
  );

  useEffect(() => {
    openDM(otherUserId);
  }, [openDM, otherUserId]);

  // Oldest to newest no matter what order the backend returns, with a day
  // separator whenever the date changes and grouping for consecutive senders.
  const rows = useMemo<Row[]>(() => {
    const sorted = [...messages].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
        a.id.localeCompare(b.id)
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

  // New chat opened: start pinned to the bottom.
  useEffect(() => {
    stickToBottom.current = true;
  }, [activeConversationId]);

  // Only auto-scroll if the user is already near the bottom (or just sent
  // something), so reading old messages isn't interrupted.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeConversationId) return;

    stickToBottom.current = true;
    sendMessage(text);
    setDraft("");
  };

  if (isLoadingHistory && !activeConversationId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-[var(--muted)]">Loading conversation…</p>
      </div>
    );
  }

  // Opening the chat failed: show the error and a retry, not a fake-working form.
  if (!activeConversationId && sendError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <p className="text-center text-sm text-[var(--danger)]">{sendError}</p>
        <button
          onClick={() => openDM(otherUserId)}
          className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--accent-fg)] hover:opacity-90"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
      >
        {rows.length === 0 && (
          <p className="pt-8 text-center text-sm text-[var(--muted)]">
            No messages yet. Say hi.
          </p>
        )}

        {rows.map((row) =>
          row.kind === "day" ? (
            <div
              key={row.key}
              className="my-3 text-center text-xs text-[var(--muted)]"
            >
              {row.label}
            </div>
          ) : (
            <MessageBubble
              key={row.key}
              message={row.message}
              isOwn={row.message.senderId === currentUserId}
              startsGroup={row.startsGroup}
            />
          )
        )}
      </div>

      {sendError && (
        <p className="shrink-0 px-4 pb-2 text-sm text-[var(--danger)]">
          {sendError}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 gap-2 border-t border-[var(--border)] px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={isLoadingHistory ? "Loading conversation…" : "Message…"}
          aria-label="Message"
          autoComplete="off"
          disabled={!activeConversationId || isLoadingHistory}
          className="min-w-0 flex-1 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[15px] text-[var(--text)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--accent-text)] disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!draft.trim() || !activeConversationId}
          className="rounded-2xl bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--accent-fg)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}