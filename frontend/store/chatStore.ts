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
export const useChatStore = create<ChatState>((set, get) => {
  // Outside the state object, but inside the store initializer.
  // Persists across calls to openDM().
  let openDMRequestId = 0;

  return {
    activeConversationId: null,
    messages: {},
    isLoadingHistory: false,
    sendError: null,

    openDM: async (otherUserId) => {
      // Each new request invalidates all older requests.

      const requestId = ++openDMRequestId;

      

      set({
        activeConversationId: null,
        isLoadingHistory: true,
        sendError: null,
      });

      try {
        const { conversationId } = await createOrGetDM(otherUserId);

        

        if (requestId !== openDMRequestId) {
          
          return;
        }

        // Join the room and wait for the server to confirm membership.
        const socket = getSocket();

        await new Promise<void>((resolve, reject) => {
          socket.timeout(5000).emit(
            "conversation:join",
            { conversationId },
            (
              error: Error | null,
              response?: {
                ok: boolean;
                message?: string;
              },
            ) => {
              if (error) {
                reject(
                  new Error("Timed out joining conversation"),
                );
                return;
              }

              if (!response?.ok) {
                reject(
                  new Error(
                    response?.message ??
                    "Could not join conversation",
                  ),
                );
                return;
              }

              resolve();
            },
          );
        });

        if (requestId !== openDMRequestId) return;

        const history = await getMessageHistory(conversationId);

        

        if (requestId !== openDMRequestId) {
          
          return;
        }

        set((state) => {
          const existingMessages =
            state.messages[conversationId] ?? [];

          // Merge history and realtime messages without duplicates.
          const mergedMessages = new Map<string, Message>();

          for (const message of history) {
            mergedMessages.set(message.id, message);
          }

          for (const message of existingMessages) {
            mergedMessages.set(message.id, message);
          }

          const orderedMessages = [...mergedMessages.values()].sort(
            (a, b) =>
              new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime(),
          );

          return {
            activeConversationId: conversationId,
            messages: {
              ...state.messages,
              [conversationId]: orderedMessages,
            },
            isLoadingHistory: false,
            sendError: null,
          };
        });
      } catch (error) {
        console.error("[openDM] Failed", error);

        if (requestId !== openDMRequestId) return;

        set({
          activeConversationId: null,
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

  };


});

getSocket().on("message:new", (message: Message) => {
  

  useChatStore.setState((state) => {
    const existing = state.messages[message.conversationId] ?? [];

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
  },
);