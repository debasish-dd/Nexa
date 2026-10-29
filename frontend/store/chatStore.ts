import { create } from "zustand";
import { getSocket } from "@/libs/socket/client";
import { createOrGetDM, getInbox, getMessageHistory } from "@/libs/dm/api";
import type { InboxItem, Message } from "@/types/chat";




type ChatState = {
  activeConversationId: string | null;
  messages: Record<string, Message[]>;

  isLoadingHistory: boolean;
  sendError: string | null;

  inbox: InboxItem[];
  isLoadingInbox: boolean;
  inboxError: string | null;

  openDM: (otherUserId: string) => Promise<void>;
  sendMessage: (content: string) => void;
  inboxLoaded: boolean;
  loadInbox: (options?: { silent?: boolean }) => Promise<void>;
  closeDM: () => void;
};

let openRequestId = 0;
let inboxRequestId = 0;

export const useChatStore = create<ChatState>((set, get) => {
  // Outside the state object, but inside the store initializer.
  // Persists across calls to openDM().
  let openDMRequestId = 0;

  return {
    activeConversationId: null,
    messages: {},
    isLoadingHistory: false,
    sendError: null,
    inbox: [],
    isLoadingInbox: false,
    inboxError: null,

    openDM: async (otherUserId) => {
      const requestId = ++openRequestId;
      const isStale = () => requestId !== openRequestId;

      set({
        activeConversationId: null,
        isLoadingHistory: true,
        sendError: null,
      });

      try {
        const { conversationId } = await createOrGetDM(otherUserId);
        if (isStale()) return;

        const history = await getMessageHistory(conversationId);
        if (isStale()) return;

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
        // A stale call must not touch loading or error state: a newer call owns them.
        if (isStale()) return;

        set({
          isLoadingHistory: false,
          sendError:
            error instanceof Error
              ? error.message
              : "Failed to open conversation",
        });
      }
    },

    closeDM: () => {
      openRequestId++; // cancels any openDM still in flight
      set({
        activeConversationId: null,
        isLoadingHistory: false,
        sendError: null,
      });
    },

    sendMessage: (content) => {
      const conversationId = get().activeConversationId;
      const socket = getSocket();



      if (!conversationId) {
        console.error("No active conversation");
        return;
      }

      if (!socket.connected) {
        console.error("Socket is disconnected");
        return;
      }

      set({ sendError: null });

      socket.emit("message:send", {
        conversationId,
        content,
      });
    },

      inboxLoaded: false,

  loadInbox: async (options) => {
    const silent = options?.silent ?? false;
    const requestId = ++inboxRequestId;

    // A silent refresh (triggered by a live event) shouldn't flash a spinner or an error.
    if (!silent) set({ isLoadingInbox: true, inboxError: null });

    try {
      const inbox = await getInbox();
      if (requestId !== inboxRequestId) return;

      set({ inbox, isLoadingInbox: false, inboxLoaded: true });
    } catch (error) {
      if (requestId !== inboxRequestId) return;

      set({
        isLoadingInbox: false,
        ...(silent
          ? {}
          : {
              inboxError:
                error instanceof Error
                  ? error.message
                  : "Failed to load conversations",
            }),
      });
    }
  },

  };


});

getSocket().on("message:new", (message: Message) => {
  const state = useChatStore.getState();
  const existing = state.messages[message.conversationId] ?? [];

  // Prevent duplicate message insertion.
  if (existing.some((m) => m.id === message.id)) return;

  const inboxItem = state.inbox.find(
    (item) => item.conversationId === message.conversationId
  );

  useChatStore.setState({
    messages: {
      ...state.messages,
      [message.conversationId]: [...existing, message],
    },
    // Known conversation: update its preview and move it to the top.
    // Unknown one: leave the list alone, it's refetched below.
    inbox: inboxItem
      ? [
          {
            ...inboxItem,
            lastMessage: {
              id: message.id,
              senderId: message.senderId,
              content: message.content,
              createdAt: message.createdAt,
              isDeleted: Boolean(message.deletedAt),
            },
          },
          ...state.inbox.filter((item) => item !== inboxItem),
        ]
      : state.inbox,
  });

  // A conversation the inbox doesn't know yet (a brand-new chat): refetch so we
  // get the other person's name and avatar. Skipped if the inbox was never
  // opened, because opening it loads everything anyway.
  if (!inboxItem && state.inboxLoaded) {
    state.loadInbox({ silent: true });
  }
});

// Fires on every (re)connect. Messages that arrived while offline never
// produced an event, so reload the inbox to catch up.
getSocket().on("connect", () => {
  const state = useChatStore.getState();
  if (state.inboxLoaded) {
    state.loadInbox({ silent: true });
  }
});

getSocket().on(
  "message:error",
  (payload: { message: string }) => {
    useChatStore.setState({
      sendError: payload.message,
    });
  },
);