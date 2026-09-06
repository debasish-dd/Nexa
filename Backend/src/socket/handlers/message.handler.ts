import { Server, Socket } from "socket.io";
import * as messageService from "../../services/messaging/message.service";
import { messageSendSchema } from "../../validations/message.validation";

export const registerMessageHandlers = (
    io: Server,
    socket: Socket,
) => {
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
};