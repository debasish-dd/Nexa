import { Server, Socket } from "socket.io";
import { getConversationIdsForUser } from "../../repositories/messaging/participant.repository";
import { conversationRoom, userRoom } from "../rooms";

export const registerConnectionHandlers = (io: Server, socket: Socket) => {
    const userId = socket.data.userId as string;

    // Joined immediately, before any async work. From this moment the
    // connection can be reached through the user's personal room.
    socket.join(userRoom(userId));

    void (async () => {
        try {
            const conversationIds = await getConversationIdsForUser(userId);

            await socket.join(conversationIds.map(conversationRoom));
        } catch (error) {
            console.error("Failed to join conversation rooms:", error);
        }
    })();

    socket.on("disconnect", () => {
        // presence tracking — not built yet, deliberately deferred
    });
};