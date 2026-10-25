
import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { socketAuthMiddleware } from "./socket-auth";
import { registerConnectionHandlers } from "./handlers/connection.handler";
import { registerMessageHandlers } from "./handlers/message.handler";

let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HTTPServer): SocketIOServer => {
    io = new SocketIOServer(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
            credentials: true,
            methods: ["GET", "POST"],
        },
    });

    io.use(socketAuthMiddleware);

    io.on("connection", (socket) => {
        registerConnectionHandlers(io as SocketIOServer, socket);
        registerMessageHandlers(io as SocketIOServer, socket);
    });

    return io;
};

// Lets REST controllers broadcast after successful database operations.
export const getIO = (): SocketIOServer => {
    if (!io) {
        throw new Error("Socket.io not initialized — call initSocket() first");
    }

    return io;
};
