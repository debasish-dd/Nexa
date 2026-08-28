import { Server, Socket } from "socket.io";

export const registerMessageHandlers = (io: Server, socket: Socket) => {
    const userId = socket.data.userId as string;

    socket.on("typing:start", (conversationId: string) => {
        socket.to(`conversation:${conversationId}`).emit("typing:start", { conversationId, userId });
    });

    socket.on("typing:stop", (conversationId: string) => {
        socket.to(`conversation:${conversationId}`).emit("typing:stop", { conversationId, userId });
    });

    // Read receipts: deferred. Needs a repository/service method to
    // persist "last read message per participant" that doesn't exist
    // yet. Don't wire this event until that's built.
};