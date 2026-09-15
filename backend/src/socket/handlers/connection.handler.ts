// socket/handlers/connection.handler.ts
import { Server, Socket } from "socket.io";

// DOESN'T EXIST YET, as far as I've seen: a reverse lookup, "all
// conversation IDs this user belongs to." Everything you've shown
// me (getParticipants) goes the other direction — conversation to
// participants, not user to conversations. You need:
//   SELECT conversation_id FROM conversation_participants WHERE user_id = $1
import { getConversationIdsForUser } from "../../repositories/messaging/participant.repository";

export const registerConnectionHandlers = (io: Server, socket: Socket) => {
    const userId = socket.data.userId as string;

    void (async () => {
        try {
            const conversationIds = await getConversationIdsForUser(userId);
            for (const conversationId of conversationIds) {
                socket.join(`conversation:${conversationId}`);
            }
        } catch (error) {
            console.error("Failed to join conversation rooms:", error);
        }
    })();

    socket.on("disconnect", () => {
        // presence tracking — not built yet, deliberately deferred
    });
};