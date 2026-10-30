import { create } from "zustand";
import { getSocket } from "@/libs/socket/client";
import { createOrGetDM, getInbox, getMessageHistory } from "@/libs/dm/api";
import type { InboxItem, Message } from "@/types/chat";
import { useAuthStore } from "@/store/authStore";



let lastSent: { conversationId: string; content: string } | null = null;



type FailedDraft = {
  conversationId: string;
  content: string;
};

type ChatState = {
  activeConversationId: string | null;
  messages: Record<string, Message[]>;

  isLoadingHistory: boolean;
  sendError: string | null;
  failedDraft: FailedDraft | null;

  inbox: InboxItem[];
  isLoadingInbox: boolean;
  inboxError: string | null;
  inboxLoaded: boolean;

    hasMore: Record<string, boolean>;
  isLoadingOlder: boolean;
  olderError: string | null;


  loadOlderMessages: () => Promise<void>;

  clearFailedDraft: () => void;
  reset: () => void;
  openDM: (otherUserId: string) => Promise<void>;
  sendMessage: (content: string) => boolean;
  loadInbox: (options?: { silent?: boolean }) => Promise<void>;
  closeDM: () => void;
};

let openRequestId = 0;
let inboxRequestId = 0;
const HISTORY_PAGE_SIZE = 50;

export const useChatStore = create<ChatState>((set, get) => {
 

  return {
    activeConversationId: null,
    messages: {},
    isLoadingHistory: false,
    sendError: null,
    failedDraft: null,
    inbox: [],
    isLoadingInbox: false,
    inboxError: null,
    hasMore: {},
    isLoadingOlder: false,
    olderError: null,

    openDM: async (otherUserId) => {
      const requestId = ++openRequestId;
      const isStale = () => requestId !== openRequestId;

      set({
        activeConversationId: null,
        isLoadingHistory: true,
        sendError: null,
        failedDraft: null
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
        failedDraft: null
      });
    },

      sendMessage: (content) => {
    const conversationId = get().activeConversationId;
    if (!conversationId) return false;

    const socket = getSocket();

    // Socket.IO silently queues emits while disconnected. Refuse instead, so
    // the text stays in the input and the user knows it didn't go out.
    if (!socket.connected) {
      set({
        sendError: "Not connected to the server. Try again in a moment.",
      });
      return false;
    }

    lastSent = { conversationId, content };
    set({ sendError: null, failedDraft: null });
    socket.emit("message:send", { conversationId, content });
    return true;
  },

  clearFailedDraft: () => set({ failedDraft: null }),

  reset: () => {
    openRequestId++; // drop any openDM still in flight
    inboxRequestId++; // drop any inbox load still in flight
    lastSent = null;
    set({
      activeConversationId: null,
      messages: {},
      isLoadingHistory: false,
      sendError: null,
      failedDraft: null,
      inbox: [],
      isLoadingInbox: false,
      inboxError: null,
      inboxLoaded: false,
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

  loadOlderMessages: async () => {
      const state = get();
      const conversationId = state.activeConversationId;

      if (
        !conversationId ||
        state.isLoadingOlder ||
        !state.hasMore[conversationId]
      ) {
        return;
      }

      const loaded = state.messages[conversationId] ?? [];
      if (loaded.length === 0) return;

      // The oldest message we hold is the cursor for "everything before this".
      const oldest = loaded.reduce((min, m) =>
        new Date(m.createdAt).getTime() < new Date(min.createdAt).getTime()
          ? m
          : min
      );

      const ticket = openRequestId; // changes if you switch chats, close, or log out
      set({ isLoadingOlder: true, olderError: null });

      try {
        const page = await getMessageHistory(
          conversationId,
          HISTORY_PAGE_SIZE,
          oldest.id
        );
        if (ticket !== openRequestId) return;

        set((s) => {
          const existing = s.messages[conversationId] ?? [];
          const known = new Set(existing.map((m) => m.id));
          const older = page.filter((m) => !known.has(m.id));

          return {
            messages: {
              ...s.messages,
              [conversationId]: [...older, ...existing],
            },
            // A full page means there are probably more. A short page means
            // we reached the start of the conversation.
            hasMore: {
              ...s.hasMore,
              [conversationId]: page.length >= HISTORY_PAGE_SIZE,
            },
            isLoadingOlder: false,
          };
        });
      } catch (error) {
        if (ticket !== openRequestId) return;

        set({
          isLoadingOlder: false,
          olderError:
            error instanceof Error
              ? error.message
              : "Failed to load older messages",
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

getSocket().on("message:error", (payload: { message: string }) => {
  useChatStore.setState({
    sendError: payload.message,
    // Hand the rejected text back so DMWindow can put it in the input again.
    failedDraft: lastSent,
  });
});


// When the logged-in user changes (logout, or a different account logging in),
// wipe everything that belonged to the previous user.
useAuthStore.subscribe((state, prevState) => {
  if (state.user?.id === prevState.user?.id) return;

  useChatStore.getState().reset();

  // A socket opened with the old user's cookie stays that user's connection,
  // so drop it and, if someone is logged in, reconnect with their cookie.
  const socket = getSocket();
  socket.disconnect();
  if (state.user) socket.connect();
});