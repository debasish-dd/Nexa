import { create } from "zustand";
import { getSocket } from "@/libs/socket/client";
import { createOrGetDM, getMessageHistory } from "@/libs/dm/api";
import type { Message } from "@/types/chat";

type ChatState = {
  activeConversationId: string | null;
  messages: Record<string, Message[]>;

  isLoadingHistory: boolean;
  sendError: string | null;

  openDM: (otherUserId: string) => Promise<void>;
  sendMessage: (content: string) => void;
};

export const useChatStore = create<ChatState>((set, get) => ({
  activeConversationId: null,
  messages: {},
  isLoadingHistory: false,
  sendError: null,

  openDM: async (otherUserId) => {
    // Immediately invalidate the previous conversation.
    set({
      activeConversationId: null,
      isLoadingHistory: true,
      sendError: null,
    });

    try {
      const { conversationId } = await createOrGetDM(otherUserId);

      const history = await getMessageHistory(conversationId);

      // Before applying the result, check whether this request
      // is still relevant. This version uses a request sequence below.
      set((state) => {
        const existingMessages = state.messages[conversationId] ?? [];

        // Merge history + any realtime messages that arrived while
        // history was loading.
        const merged = [...history];

        for (const message of existingMessages) {
          if (!merged.some((m) => m.id === message.id)) {
            merged.push(message);
          }
        }

        return {
          activeConversationId: conversationId,
          messages: {
            ...state.messages,
            [conversationId]: merged,
          },
          isLoadingHistory: false,
        };
      });
    } catch (error) {
      set({
        isLoadingHistory: false,
        sendError:
          error instanceof Error
            ? error.message
            : "Failed to open conversation",
      });
    }
  },

  sendMessage: (content) => {
    const conversationId = get().activeConversationId;

    if (!conversationId) return;

    set({ sendError: null });

    getSocket().emit("message:send", {
      conversationId,
      content,
    });
  },
}));

getSocket().on("message:new", (message: Message) => {
  useChatStore.setState((state) => {
    const existing = state.messages[message.conversationId] ?? [];

    // Prevent duplicate message insertion.
    if (existing.some((m) => m.id === message.id)) {
      return state;
    }

    return {
      messages: {
        ...state.messages,
        [message.conversationId]: [...existing, message],
      },
    };
  });
});

getSocket().on(
  "message:error",
  (payload: { message: string }) => {
    useChatStore.setState({
      sendError: payload.message,
    });
  }
);