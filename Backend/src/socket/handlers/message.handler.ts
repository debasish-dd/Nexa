import { Server, Socket } from "socket.io";
import * as messageService from "../../services/messaging/message.service";
import { ApiError } from "../../utils/api-error";
import {
    messageSendSchema,
    messageEditSchema,
    messageDeleteSchema,
} from "../../validations/message.validation";

export const registerMessageHandlers = (io: Server, socket: Socket) => {
    const userId = socket.data.userId as string;

    socket.on("typing:start", (conversationId: string) => {
        const room = `conversation:${conversationId}`;
        if (!socket.rooms.has(room)) return;
        socket.to(room).emit("typing:start", { conversationId, userId });
    });

    socket.on("typing:stop", (conversationId: string) => {
        const room = `conversation:${conversationId}`;
        if (!socket.rooms.has(room)) return;
        socket.to(room).emit("typing:stop", { conversationId, userId });
    });

    socket.on("message:send", async (data: { conversationId: string; content: string }) => {
        try {
            const parsed = messageSendSchema.safeParse(data);
            if (!parsed.success) {
                socket.emit("message:error", { message: "Invalid message payload" });
                return;
            }
            const { conversationId, content } = parsed.data;

            const room = `conversation:${conversationId}`;
            if (!socket.rooms.has(room)) {
                socket.emit("message:error", { message: "You are not a member of this conversation" });
                return;
            }

            const savedMessage = await messageService.sendMessage(conversationId, userId, content);
            io.to(room).emit("message:new", savedMessage);
        } catch (error) {
            console.error("Failed to send message:", error);
            socket.emit("message:error", { message: "Failed to send message" });
        }
    });

    socket.on("message:edit", async (data: { messageId: string; content: string }) => {
        try {
            const parsed = messageEditSchema.safeParse(data);
            if (!parsed.success) {
                socket.emit("message:error", { message: "Invalid message payload" });
                return;
            }
            const { messageId, content } = parsed.data;

            // Ownership check happens inside the service (throws ApiError 403 if not the sender)
            const updatedMessage = await messageService.editMessage(messageId, userId, content);

            const room = `conversation:${updatedMessage.conversationId}`;
            if (!socket.rooms.has(room)) {
                socket.emit("message:error", { message: "You are not a member of this conversation" });
                return;
            }

            io.to(room).emit("message:edited", updatedMessage);
        } catch (error) {
            if (error instanceof ApiError) {
                socket.emit("message:error", { message: error.message });
                return;
            }
            console.error("Failed to edit message:", error);
            socket.emit("message:error", { message: "Failed to edit message" });
        }
    });

    socket.on("message:delete", async (data: { messageId: string }) => {
        try {
            const parsed = messageDeleteSchema.safeParse(data);
            if (!parsed.success) {
                socket.emit("message:error", { message: "Invalid message payload" });
                return;
            }
            const { messageId } = parsed.data;

            const deletedMessage = await messageService.deleteMessage(messageId, userId);

            const room = `conversation:${deletedMessage.conversationId}`;
            if (!socket.rooms.has(room)) {
                socket.emit("message:error", { message: "You are not a member of this conversation" });
                return;
            }

            io.to(room).emit("message:deleted", {
                id: deletedMessage.id,
                conversationId: deletedMessage.conversationId,
            });
        } catch (error) {
            if (error instanceof ApiError) {
                socket.emit("message:error", { message: error.message });
                return;
            }
            console.error("Failed to delete message:", error);
            socket.emit("message:error", { message: "Failed to delete message" });
        }
    });
};