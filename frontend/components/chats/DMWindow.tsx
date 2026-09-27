"use client";

import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import type { Message } from "@/types/chat";

const EMPTY_MESSAGES: Message[] = [];

export function DMWindow({ otherUserId }: { otherUserId: string }) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const currentUserId = useAuthStore((s) => s.user?.id);

  const openDM = useChatStore((s) => s.openDM);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const activeConversationId = useChatStore(
    (s) => s.activeConversationId
  );
  const isLoadingHistory = useChatStore(
    (s) => s.isLoadingHistory
  );
  const sendError = useChatStore((s) => s.sendError);

  const messages = useChatStore((s) => {
    const conversationId = s.activeConversationId;

    if (!conversationId) {
      return EMPTY_MESSAGES;
    }

    return s.messages[conversationId] ?? EMPTY_MESSAGES;
  });

  useEffect(() => {
    openDM(otherUserId);
  }, [otherUserId, openDM]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [activeConversationId, messages.length]);

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    const content = draft.trim();

    if (!content) {
      return;
    }

    sendMessage(content);
    setDraft("");
  };

  if (isLoadingHistory && !activeConversationId) {
    return (
      <p className="p-4 text-sm text-[#111111]/50">
        Loading conversation…
      </p>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.map((message) => {
          const isOwn = message.senderId === currentUserId;

          return (
            <div
              key={message.id}
              className={`flex ${
                isOwn ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2 text-[15px] ${
                  isOwn
                    ? "bg-[#111111] text-white"
                    : "bg-white text-[#111111] shadow-sm"
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
        <p className="px-4 pb-2 text-sm text-red-600">
          {sendError}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t-2 border-[#111111]/10 p-4"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message…"
          className="flex-1 rounded-full border-2 border-[#111111]/15 px-4 py-2 text-[15px] outline-none focus:border-[#111111]"
        />

        <button
          type="submit"
          className="rounded-full bg-[#111111] px-5 py-2 text-sm font-semibold text-white"
        >
          Send
        </button>
      </form>
    </div>
  );
}