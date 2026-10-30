import { create } from "zustand";
import { getSocket } from "@/libs/socket/client";
import {
  createOrGetDM,
  getInbox,
  getMessageHistory,
  markConversationRead,
} from "@/libs/dm/api";
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


  markActiveRead: () => void;
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

// conversationId -> id of the newest message we already told the server about.
const lastMarkedRead: Record<string, string> = {};

const isTabVisible = () =>
  typeof document === "undefined" || document.visibilityState === "visible";

const isNewer = (a: Message, b: Message) =>
  new Date(a.createdAt).getTime() > new Date(b.createdAt).getTime() ||
  (a.createdAt === b.createdAt && a.id > b.id);

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
        failedDraft: null,
        isLoadingOlder: false,
        olderError: null,
      });

      try {
        const { conversationId } = await createOrGetDM(otherUserId);
        if (isStale()) return;

        const history = await getMessageHistory(
          conversationId,
          HISTORY_PAGE_SIZE
        );
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
            hasMore: {
              ...state.hasMore,
              [conversationId]: history.length >= HISTORY_PAGE_SIZE,
            },
            isLoadingHistory: false,
          };
        });

        // Must come AFTER set(): the active chat only exists once it has run.
        get().markActiveRead();
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
    
    markActiveRead: () => {
      
      const { activeConversationId, messages } = get();
      console.log("[markRead] called", activeConversationId, isTabVisible()); // 1
      if (!activeConversationId || !isTabVisible()) return;

      const loaded = messages[activeConversationId] ?? [];
      console.log("[markRead] loaded messages:", loaded.length); // 2
      if (loaded.length === 0) return;

      const newest = loaded.reduce((max, m) => (isNewer(m, max) ? m : max));

      // Already told the server about this one.
      if (lastMarkedRead[activeConversationId] === newest.id) return;
      lastMarkedRead[activeConversationId] = newest.id;
      console.log("[markRead] sending", newest.id); // 3


      // Clear the badge right away, don't wait for the server.
      set((state) => ({
        inbox: state.inbox.map((item) =>
          item.conversationId === activeConversationId && item.unreadCount > 0
            ? { ...item, unreadCount: 0 }
            : item
        ),
      }));

      markConversationRead(activeConversationId, newest.id).catch(() => {
        // Best effort: forget it, so the next open or message tries again.
        if (lastMarkedRead[activeConversationId] === newest.id) {
          delete lastMarkedRead[activeConversationId];
        }
      });
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
      for (const key of Object.keys(lastMarkedRead)) delete lastMarkedRead[key];
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

        const { activeConversationId } = get();
        set({
          // The chat you're looking at can't have unread messages.
          inbox: inbox.map((item) =>
            item.conversationId === activeConversationId && isTabVisible()
              ? { ...item, unreadCount: 0 }
              : item
          ),
          isLoadingInbox: false,
          inboxLoaded: true,
        });
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

  const currentUserId = useAuthStore.getState().user?.id;
  const isOwn = message.senderId === currentUserId;
  const isViewing =
    message.conversationId === state.activeConversationId && isTabVisible();

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
            // Someone else's message in a chat you're not looking at is unread.
            unreadCount:
              isOwn || isViewing
                ? inboxItem.unreadCount
                : inboxItem.unreadCount + 1,
          },
          ...state.inbox.filter((item) => item !== inboxItem),
        ]
      : state.inbox,
  });

  // You're looking at this chat: it's read the moment it arrives.
  if (isViewing) state.markActiveRead();

  // A conversation the inbox doesn't know yet (a brand-new chat): refetch so we
  // get the other person's name and avatar.
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

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      useChatStore.getState().markActiveRead();
    }
  });
}

// When the logged-in user changes (logout, or a different account logging in),
// wipe everything that belonged to the previous user.
useAuthStore.subscribe((state, prevState) => {
  if (state.user?.id === prevState.user?.id) return;

  useChatStore.getState().reset();

  const socket = getSocket();
  socket.disconnect();
  if (state.user) {
    socket.connect();
    useChatStore.getState().loadInbox({ silent: true });
  }
});

// Already logged in when this module loads (a page refresh).
if (useAuthStore.getState().user) {
  useChatStore.getState().loadInbox({ silent: true });
}