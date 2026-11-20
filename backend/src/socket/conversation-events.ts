// ⚠️ Change "./index" to the file that exports getIO (the one with initSocket).
import { getIO } from "./index";
import { conversationRoom, userRoom } from "./rooms";

const safely = (label: string, action: () => void): void => {
    try {
        action();
    } catch (error) {
        console.error(`socket: ${label} failed`, error);
    }
};

// Puts all of a user's open connections into a conversation's room.
export const joinConversationRoom = (
    userId: string,
    conversationId: string,
): void => {
    safely("joinConversationRoom", () => {
        getIO().in(userRoom(userId)).socketsJoin(conversationRoom(conversationId));
    });
};

// Takes all of a user's open connections out of a conversation's room.
export const leaveConversationRoom = (
    userId: string,
    conversationId: string,
): void => {
    safely("leaveConversationRoom", () => {
        getIO().in(userRoom(userId)).socketsLeave(conversationRoom(conversationId));
    });
};

// Empties a room completely, for when a conversation has been deleted.
export const closeConversationRoom = (conversationId: string): void => {
    safely("closeConversationRoom", () => {
        const room = conversationRoom(conversationId);
        getIO().in(room).socketsLeave(room);
    });
};

export const emitToConversation = (
    conversationId: string,
    event: string,
    payload: unknown,
): void => {
    safely("emitToConversation", () => {
        getIO().to(conversationRoom(conversationId)).emit(event, payload);
    });
};