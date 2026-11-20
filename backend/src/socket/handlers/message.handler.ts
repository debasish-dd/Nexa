import { Server, Socket } from "socket.io";
import * as messageService from "../../services/messaging/message.service";
import { ApiError } from "../../utils/api-error";
import {
    messageSendSchema,
    messageEditSchema,
    messageDeleteSchema,
} from "../../validations/message.validation";
import { isParticipant } from "../../repositories/messaging/participant.repository";
import { conversationRoom } from "../rooms";

// ApiError messages are written for the user, so they pass through as they are.
// Anything else is unexpected: log it, and show a generic message.
const reportError = (
    socket: Socket,
    error: unknown,
    fallback: string,
): void => {
    if (error instanceof ApiError) {
        socket.emit("message:error", { message: error.message });
        return;
    }

    console.error(fallback, error);
    socket.emit("message:error", { message: fallback });
};

export const registerMessageHandlers = (io: Server, socket: Socket) => {
    const userId = socket.data.userId as string;

    socket.on("typing:start", (conversationId: string) => {
        const room = conversationRoom(conversationId);
        if (!socket.rooms.has(room)) return;
        socket.to(room).emit("typing:start", { conversationId, userId });
    });

    socket.on("typing:stop", (conversationId: string) => {
        const room = conversationRoom(conversationId);
        if (!socket.rooms.has(room)) return;
        socket.to(room).emit("typing:stop", { conversationId, userId });
    });

    socket.on(
        "conversation:join",
        async (
            data: { conversationId: string },
            ack?: (result: { ok: boolean; message?: string }) => void,
        ) => {
            try {
                const { conversationId } = data;

                if (
                    typeof conversationId !== "string" ||
                    !conversationId.trim()
                ) {
                    ack?.({ ok: false, message: "Invalid conversation ID" });
                    return;
                }

                // Verify membership before allowing the socket into the room.
                const member = await isParticipant(conversationId, userId);

                if (!member) {
                    ack?.({
                        ok: false,
                        message: "You are not a member of this conversation",
                    });
                    return;
                }

                await socket.join(conversationRoom(conversationId));

                ack?.({ ok: true });
            } catch (error) {
                console.error("Failed to join conversation:", error);

                ack?.({ ok: false, message: "Failed to join conversation" });
            }
        },
    );

    socket.on(
        "message:send",
        async (data: { conversationId: string; content: string }) => {
            try {
                const parsed = messageSendSchema.safeParse(data);
                if (!parsed.success) {
                    socket.emit("message:error", {
                        message: "Invalid message payload",
                    });
                    return;
                }
                const { conversationId, content } = parsed.data;

                // The service checks membership in the database: the real authority.
                const savedMessage = await messageService.sendMessage(
                    conversationId,
                    userId,
                    content,
                );

                // The database just confirmed this user belongs here, so make sure
                // this connection is in the room, in case it hadn't been joined yet.
                const room = conversationRoom(conversationId);
                await socket.join(room);

                io.to(room).emit("message:new", savedMessage);
            } catch (error) {
                reportError(socket, error, "Failed to send message");
            }
        },
    );

    socket.on(
        "message:edit",
        async (data: { messageId: string; content: string }) => {
            try {
                const parsed = messageEditSchema.safeParse(data);
                if (!parsed.success) {
                    socket.emit("message:error", {
                        message: "Invalid message payload",
                    });
                    return;
                }
                const { messageId, content } = parsed.data;

                // The service checks that you wrote it AND are still in the conversation.
                const updatedMessage = await messageService.editMessage(
                    messageId,
                    userId,
                    content,
                );

                const room = conversationRoom(updatedMessage.conversationId);
                await socket.join(room);

                io.to(room).emit("message:edited", updatedMessage);
            } catch (error) {
                reportError(socket, error, "Failed to edit message");
            }
        },
    );

    socket.on("message:delete", async (data: { messageId: string }) => {
        try {
            const parsed = messageDeleteSchema.safeParse(data);
            if (!parsed.success) {
                socket.emit("message:error", {
                    message: "Invalid message payload",
                });
                return;
            }
            const { messageId } = parsed.data;

            const deletedMessage = await messageService.deleteMessage(
                messageId,
                userId,
            );

            const room = conversationRoom(deletedMessage.conversationId);
            await socket.join(room);

            io.to(room).emit("message:deleted", {
                id: deletedMessage.id,
                conversationId: deletedMessage.conversationId,
            });
        } catch (error) {
            reportError(socket, error, "Failed to delete message");
        }
    });
};