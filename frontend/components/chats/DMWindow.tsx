"use client";

import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";

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
    s.activeConversationId ? s.messages[s.activeConversationId] ?? [] : []
  );

  useEffect(() => {
    openDM(otherUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draft.trim()) return;
    sendMessage(draft.trim());
    setDraft("");
  };

  if (isLoadingHistory && !activeConversationId) {
    return <p className="p-4 text-sm text-[var(--muted)]">Loading conversation…</p>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="pt-8 text-center text-sm text-[var(--muted)]">
            No messages yet. Say hi.
          </p>
        )}
        {messages.map((message) => {
          const isOwn = message.senderId === currentUserId;
          return (
            <div
              key={message.id}
              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] break-words rounded-2xl px-4 py-2 text-[15px] ${
                  isOwn
                    ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                    : "bg-[var(--surface-2)] text-[var(--text)]"
                }`}
              >
                {message.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {sendError && (
        <p className="px-4 pb-2 text-sm text-[var(--danger)]">{sendError}</p>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t border-[var(--border)] p-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message…"
          className="min-w-0 flex-1 rounded-full border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-[15px] text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-text)]"
        />
        <button
          type="submit"
          className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--accent-fg)] transition-opacity hover:opacity-90"
        >
          Send
        </button>
      </form>
    </div>
  );
}