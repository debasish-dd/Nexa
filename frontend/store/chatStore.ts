import { create } from "zustand";
import { getSocket } from "@/libs/socket/client";
import { ApiRequestError } from "@/libs/http/client";
import {
  createOrGetDM,
  getGroupInbox,
  getInbox,
  getMessageHistory,
  markConversationRead,
} from "@/libs/dm/api";
import { getGroup } from "@/libs/groups/api";
import type {
  GroupDetails,
  GroupInfo,
  GroupMember,
  GroupRole,
  InboxItem,
  Message,
} from "@/types/chat";
import { useAuthStore } from "@/store/authStore";

let lastSent: { conversationId: string; content: string } | null = null;

type FailedDraft = {
  conversationId: string;
  content: string;
};

// Why the chat you had open was closed under you.
export type ClosedNotice = {
  conversationId: string;
  reason: "removed" | "left" | "deleted";
};

type ChatState = {
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  groups: Record<string, GroupDetails>;

  isLoadingHistory: boolean;
  sendError: string | null;
  failedDraft: FailedDraft | null;
  closedNotice: ClosedNotice | null;

  inbox: InboxItem[];
  isLoadingInbox: boolean;
  inboxError: string | null;
  inboxLoaded: boolean;

  hasMore: Record<string, boolean>;
  isLoadingOlder: boolean;
  olderError: string | null;

  groupInbox: InboxItem[];
  isLoadingGroupInbox: boolean;
  groupInboxError: string | null;
  groupInboxLoaded: boolean;

  markActiveRead: () => void;
  loadOlderMessages: () => Promise<void>;
  clearFailedDraft: () => void;
  clearClosedNotice: () => void;
  reset: () => void;
  openDM: (otherUserId: string) => Promise<void>;
  openGroup: (conversationId: string) => Promise<void>;
  refreshGroup: (conversationId: string) => Promise<void>;
  sendMessage: (content: string) => boolean;
  loadInbox: (options?: { silent?: boolean }) => Promise<void>;
  loadGroupInbox: (options?: { silent?: boolean }) => Promise<void>;
  // Closes whatever chat is open, DM or group.
  closeDM: () => void;
};


let openRequestId = 0;
let inboxRequestId = 0;
let groupInboxRequestId = 0;

const HISTORY_PAGE_SIZE = 50;

// conversationId -> id of the newest message we already told the server about.
const lastMarkedRead: Record<string, string> = {};

const isTabVisible = () =>
  typeof document === "undefined" || document.visibilityState === "visible";

const isNewer = (a: Message, b: Message) =>
  new Date(a.createdAt).getTime() > new Date(b.createdAt).getTime() ||
  (a.createdAt === b.createdAt && a.id > b.id);

const currentUserId = () => useAuthStore.getState().user?.id;

// Changes one conversation's inbox row and leaves the others alone.
const patchInboxItem = (
  inbox: InboxItem[],
  conversationId: string,
  patch: (item: InboxItem) => InboxItem
): InboxItem[] =>
  inbox.map((item) =>
    item.conversationId === conversationId ? patch(item) : item
  );

export const useChatStore = create<ChatState>((set, get) => ({
  activeConversationId: null,
  messages: {},
  groups: {},
  isLoadingHistory: false,
  sendError: null,
  failedDraft: null,
  closedNotice: null,
  inbox: [],
  isLoadingInbox: false,
  inboxError: null,
  inboxLoaded: false,
  hasMore: {},
  isLoadingOlder: false,
  olderError: null,
  groupInbox: [],
  isLoadingGroupInbox: false,
  groupInboxError: null,
  groupInboxLoaded: false,

  openDM: async (otherUserId) => {
    const requestId = ++openRequestId;
    const isStale = () => requestId !== openRequestId;

    set({
      activeConversationId: null,
      isLoadingHistory: true,
      sendError: null,
      failedDraft: null,
      closedNotice: null,
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

  openGroup: async (conversationId) => {
    const requestId = ++openRequestId;
    const isStale = () => requestId !== openRequestId;

    set({
      activeConversationId: null,
      isLoadingHistory: true,
      sendError: null,
      failedDraft: null,
      closedNotice: null,
      isLoadingOlder: false,
      olderError: null,
    });

    try {
      // A group has no "other user" to look up: details and history load together.
      const [details, history] = await Promise.all([
        getGroup(conversationId),
        getMessageHistory(conversationId, HISTORY_PAGE_SIZE),
      ]);
      if (isStale()) return;

      set((state) => {
        const existingMessages = state.messages[conversationId] ?? [];
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
          groups: {
            ...state.groups,
            [conversationId]: details,
          },
          hasMore: {
            ...state.hasMore,
            [conversationId]: history.length >= HISTORY_PAGE_SIZE,
          },
          isLoadingHistory: false,
        };
      });

      get().markActiveRead();
    } catch (error) {
      if (isStale()) return;

      set({
        isLoadingHistory: false,
        sendError:
          error instanceof Error ? error.message : "Failed to open group",
      });
    }
  },

  // Reloads a group's details and members. Used after reconnecting.
  refreshGroup: async (conversationId) => {
    try {
      const details = await getGroup(conversationId);

      set((state) => ({
        groups: { ...state.groups, [conversationId]: details },
      }));
    } catch (error) {
      // 404 means the group is gone or we are no longer in it.
      if (error instanceof ApiRequestError && error.status === 404) {
        dropConversation(conversationId, "removed");
      }
    }
  },

  markActiveRead: () => {
    const { activeConversationId, messages } = get();
    if (!activeConversationId || !isTabVisible()) return;

    const loaded = messages[activeConversationId] ?? [];
    if (loaded.length === 0) return;

    const newest = loaded.reduce((max, m) => (isNewer(m, max) ? m : max));

    // Already told the server about this one.
    if (lastMarkedRead[activeConversationId] === newest.id) return;
    lastMarkedRead[activeConversationId] = newest.id;

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
    openRequestId++; // cancels any open call still in flight
    set({
      activeConversationId: null,
      isLoadingHistory: false,
      sendError: null,
      failedDraft: null,
      closedNotice: null,
      isLoadingOlder: false,
      olderError: null,
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

  clearClosedNotice: () => set({ closedNotice: null }),

  reset: () => {
    openRequestId++; // drop any open call still in flight
    inboxRequestId++; // drop any inbox load still in flight
    lastSent = null;
    for (const key of Object.keys(lastMarkedRead)) delete lastMarkedRead[key];
    set({
      activeConversationId: null,
      messages: {},
      groups: {},
      isLoadingHistory: false,
      sendError: null,
      failedDraft: null,
      closedNotice: null,
      inbox: [],
      isLoadingInbox: false,
      inboxError: null,
      inboxLoaded: false,
      hasMore: {},
      isLoadingOlder: false,
      olderError: null,
    });
  },

  loadInbox: async (options) => {
    const silent = options?.silent ?? false;
    const requestId = ++inboxRequestId;

    // A silent refresh (triggered by a live event) shouldn't flash a spinner or an error.
    if (!silent) set({ isLoadingInbox: true, inboxError: null });

    try {
      const inbox = await getInbox(30);
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

 loadGroupInbox: async (options) => {
  const silent = options?.silent ?? false;
  const requestId = ++groupInboxRequestId;

  if (!silent) {
    set({
      isLoadingGroupInbox: true,
      groupInboxError: null,
    });
  }

  try {
    const inbox = await getGroupInbox(10);

    if (requestId !== groupInboxRequestId) return;

    const { activeConversationId } = get();

    set({
      groupInbox: inbox.map((item) =>
        item.conversationId === activeConversationId && isTabVisible()
          ? { ...item, unreadCount: 0 }
          : item
      ),
      isLoadingGroupInbox: false,
      groupInboxLoaded: true,
    });
  } catch (error) {
    if (requestId !== groupInboxRequestId) return;

    set({
      isLoadingGroupInbox: false,
      ...(silent
        ? {}
        : {
            groupInboxError:
              error instanceof Error
                ? error.message
                : "Failed to load group conversations",
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
}));

// Forgets a conversation locally: the group was deleted, or we left or were removed.
const dropConversation = (
  conversationId: string,
  reason: ClosedNotice["reason"]
): void => {
  delete lastMarkedRead[conversationId];

  useChatStore.setState((state) => {
    const messages = { ...state.messages };
    delete messages[conversationId];

    const groups = { ...state.groups };
    delete groups[conversationId];

    const hasMore = { ...state.hasMore };
    delete hasMore[conversationId];

    const wasActive = state.activeConversationId === conversationId;

    return {
      messages,
      groups,
      hasMore,
      inbox: state.inbox.filter((item) => item.conversationId !== conversationId),
      activeConversationId: wasActive ? null : state.activeConversationId,
      closedNotice: wasActive
        ? { conversationId, reason }
        : state.closedNotice,
    };
  });
};

/* ---------------------------- socket listeners ---------------------------- */

const socket = getSocket();

socket.on("message:new", (message: Message) => {
  const state = useChatStore.getState();
  const existing = state.messages[message.conversationId] ?? [];

  // Prevent duplicate message insertion.
  if (existing.some((m) => m.id === message.id)) return;

  const isOwn = message.senderId === currentUserId();
  const isViewing =
    message.conversationId === state.activeConversationId && isTabVisible();

  const inboxItem = state.inbox.find(
    (item) => item.conversationId === message.conversationId
  );

  // Group previews show the sender's name. Use the member list if we have it.
  const senderName =
    state.groups[message.conversationId]?.members.find(
      (m) => m.userId === message.senderId
    )?.username ?? null;
  const needsNames = inboxItem?.type === "gc" && !isOwn && senderName === null;

  const lastMessage = {
    id: message.id,
    senderId: message.senderId,
    content: message.content,
    createdAt: message.createdAt,
    isDeleted: Boolean(message.deletedAt),
  };

  let inbox = state.inbox;

  if (inboxItem) {
    // Someone else's message in a chat you're not looking at is unread.
    const unreadCount =
      isOwn || isViewing ? inboxItem.unreadCount : inboxItem.unreadCount + 1;

    const updated: InboxItem =
      inboxItem.type === "dm"
        ? {
          ...inboxItem,
          unreadCount,
          lastMessage,
          lastActivityAt: message.createdAt,
        }
        : {
          ...inboxItem,
          unreadCount,
          lastMessage: { ...lastMessage, senderName },
          lastActivityAt: message.createdAt,
        };

    // Move it to the top.
    inbox = [updated, ...state.inbox.filter((item) => item !== inboxItem)];
  }

  useChatStore.setState({
    messages: {
      ...state.messages,
      [message.conversationId]: [...existing, message],
    },
    inbox,
  });

  // You're looking at this chat: it's read the moment it arrives.
  if (isViewing) state.markActiveRead();

  // A conversation the inbox doesn't know yet, or a group message from someone
  // whose name we don't have: refetch so the inbox gets names and avatars.
  if ((!inboxItem || needsNames) && state.inboxLoaded) {
    state.loadInbox({ silent: true });
  }
});

// Fires on every (re)connect. Anything that happened while offline never
// produced an event, so reload what's on screen.
socket.on("connect", () => {
  const state = useChatStore.getState();

  if (state.inboxLoaded) {
    state.loadInbox({ silent: true });
  }

  const active = state.activeConversationId;
  if (active && state.groups[active]) {
    state.refreshGroup(active);
  }
});

socket.on("message:error", (payload: { message: string }) => {
  useChatStore.setState({
    sendError: payload.message,
    // Hand the rejected text back so the chat window can put it in the input again.
    failedDraft: lastSent,
  });
});

socket.on("group:updated", (group: GroupInfo) => {
  useChatStore.setState((state) => {
    const current = state.groups[group.conversationId];

    return {
      groups: current
        ? {
          ...state.groups,
          [group.conversationId]: {
            ...current,
            name: group.name,
            description: group.description,
            groupProfile: group.groupProfile,
          },
        }
        : state.groups,
      inbox: patchInboxItem(state.inbox, group.conversationId, (item) =>
        item.type === "gc"
          ? {
            ...item,
            group: {
              ...item.group,
              name: group.name,
              avatarUrl: group.groupProfile,
            },
          }
          : item
      ),
    };
  });
});

socket.on(
  "group:member-added",
  (payload: { conversationId: string; member: GroupMember }) => {
    const { conversationId, member } = payload;
    const state = useChatStore.getState();

    // I was added: the group isn't in my inbox yet.
    if (member.userId === currentUserId()) {
      if (state.inboxLoaded) state.loadInbox({ silent: true });
      return;
    }

    useChatStore.setState((s) => {
      const group = s.groups[conversationId];
      const alreadyListed = group?.members.some(
        (m) => m.userId === member.userId
      );

      return {
        groups:
          group && !alreadyListed
            ? {
              ...s.groups,
              [conversationId]: {
                ...group,
                members: [...group.members, member],
              },
            }
            : s.groups,
        inbox: patchInboxItem(s.inbox, conversationId, (item) =>
          item.type === "gc"
            ? {
              ...item,
              group: {
                ...item.group,
                memberCount: item.group.memberCount + 1,
              },
            }
            : item
        ),
      };
    });
  }
);

socket.on(
  "group:member-removed",
  (payload: {
    conversationId: string;
    userId: string;
    removedBy: string;
    reason: "left" | "removed";
  }) => {
    const { conversationId, userId, reason } = payload;

    // It was me: forget the whole group.
    if (userId === currentUserId()) {
      dropConversation(conversationId, reason === "left" ? "left" : "removed");
      return;
    }

    useChatStore.setState((s) => {
      const group = s.groups[conversationId];

      return {
        groups: group
          ? {
            ...s.groups,
            [conversationId]: {
              ...group,
              members: group.members.filter((m) => m.userId !== userId),
            },
          }
          : s.groups,
        inbox: patchInboxItem(s.inbox, conversationId, (item) =>
          item.type === "gc"
            ? {
              ...item,
              group: {
                ...item.group,
                memberCount: Math.max(0, item.group.memberCount - 1),
              },
            }
            : item
        ),
      };
    });
  }
);

socket.on(
  "group:role-changed",
  (payload: { conversationId: string; member: GroupMember }) => {
    const { conversationId, member } = payload;
    const isMe = member.userId === currentUserId();

    useChatStore.setState((s) => {
      const group = s.groups[conversationId];

      return {
        groups: group
          ? {
            ...s.groups,
            [conversationId]: {
              ...group,
              myRole: isMe ? member.role : group.myRole,
              members: group.members.map((m) =>
                m.userId === member.userId ? member : m
              ),
            },
          }
          : s.groups,
        inbox: isMe
          ? patchInboxItem(s.inbox, conversationId, (item) =>
            item.type === "gc"
              ? { ...item, group: { ...item.group, myRole: member.role } }
              : item
          )
          : s.inbox,
      };
    });
  }
);

socket.on(
  "group:admin-changed",
  (payload: {
    conversationId: string;
    adminId: string;
    previousAdminId: string;
  }) => {
    const { conversationId, adminId, previousAdminId } = payload;
    const me = currentUserId();

    useChatStore.setState((s) => {
      const group = s.groups[conversationId];

      // My role changes only if I'm the new admin or the old one (now a mod).
      let myRole: GroupRole | undefined = group?.myRole;
      if (me === adminId) myRole = "admin";
      else if (me === previousAdminId) myRole = "mod";

      return {
        groups: group
          ? {
            ...s.groups,
            [conversationId]: {
              ...group,
              adminId,
              myRole: myRole ?? group.myRole,
              members: group.members.map((m) =>
                m.userId === adminId
                  ? { ...m, role: "admin" as const }
                  : m.userId === previousAdminId
                    ? { ...m, role: "mod" as const }
                    : m
              ),
            },
          }
          : s.groups,
        inbox:
          myRole !== undefined
            ? patchInboxItem(s.inbox, conversationId, (item) =>
              item.type === "gc"
                ? { ...item, group: { ...item.group, myRole } }
                : item
            )
            : s.inbox,
      };
    });
  }
);

socket.on("group:deleted", (payload: { conversationId: string }) => {
  dropConversation(payload.conversationId, "deleted");
});

socket.on("dm:deleted", (payload: { conversationId: string }) => {
  dropConversation(payload.conversationId, "deleted");
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

  socket.disconnect();
  if (state.user) {
    socket.connect();
    useChatStore.getState().loadInbox({ silent: true });
  }
});

// Already logged in when this module loads (a page refresh).
if (useAuthStore.getState().user) {
  socket.connect();
  useChatStore.getState().loadInbox({ silent: true });
}