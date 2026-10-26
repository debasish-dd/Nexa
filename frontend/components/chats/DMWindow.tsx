"use client";

import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import type { Message } from "@/types/chat";

const EMPTY_MESSAGES: Message[] = [];

function formatMessageTime(createdAt: string | Date): string {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function DMWindow({ otherUserId }: { otherUserId: string }) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const currentUserId = useAuthStore((s) => s.user?.id);

  const openDM = useChatStore((s) => s.openDM);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const isLoadingHistory = useChatStore((s) => s.isLoadingHistory);
  const sendError = useChatStore((s) => s.sendError);

  const messages = useChatStore((s) =>
    s.activeConversationId
      ? (s.messages[s.activeConversationId] ?? EMPTY_MESSAGES)
      : EMPTY_MESSAGES,
  );

  useEffect(() => {
    void openDM(otherUserId);
  }, [otherUserId, openDM]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [activeConversationId, messages.length]);

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    const content = draft.trim();

    if (!content || !activeConversationId || isLoadingHistory) {
      return;
    }

    sendMessage(content);
    setDraft("");
  };

  if (!activeConversationId) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          {isLoadingHistory ? (
            <>
              <div className="size-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white" />

              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Loading conversation…
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-red-600 dark:text-red-400">
                {sendError ?? "Could not open conversation."}
              </p>

              <button
                type="button"
                onClick={() => void openDM(otherUserId)}
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Try again
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Messages */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
        {messages.length === 0 && (
          <div className="flex justify-center pt-12">
            <p className="rounded-full bg-zinc-100 px-4 py-2 text-center text-sm text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              No messages yet. Say hi.
            </p>
          </div>
        )}

        {messages.map((message) => {
          const isOwn = message.senderId === currentUserId;

          return (
            <div
              key={message.id}
              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex max-w-[85%] flex-col sm:max-w-[75%] ${
                  isOwn ? "items-end" : "items-start"
                }`}
              >
                {/* Message bubble */}
                <div
                  className={`wrap-break-word whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-sm ${
                    isOwn
                      ? "rounded-br-md bg-lime-400 text-zinc-950"
                      : "rounded-bl-md bg-zinc-100 text-zinc-900 dark:bg-zinc-600 dark:text-zinc-100"
                  }`}
                >
                  {message.content}
                </div>

                {/* Timestamp */}
                <time
                  dateTime={message.createdAt}
                  className="mt-1 px-1 text-[11px] leading-4 text-zinc-500 dark:text-zinc-400"
                >
                  {formatMessageTime(message.createdAt)}
                </time>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {sendError && (
        <p
          role="alert"
          className="px-4 pb-2 text-sm text-red-600 dark:text-red-400"
        >
          {sendError}
        </p>
      )}

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 items-end gap-2 border-t border-zinc-200 bg-transparent p-3 dark:border-zinc-800 sm:p-4"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={isLoadingHistory ? "Loading conversation…" : "Message…"}
          autoComplete="off"
          disabled={!activeConversationId || isLoadingHistory}
          className="min-w-0 flex-1 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[15px] text-[var(--text)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--accent-text)] disabled:cursor-not-allowed disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={!activeConversationId || isLoadingHistory || !draft.trim()}
          className="shrink-0 rounded-2xl bg-lime-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-lime-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-lime-600 dark:text-lime-100 dark:hover:bg-lime-700"
        >
          Send
        </button>
      </form>
    </div>
  );
}
