import { io, type Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL;

let socket: Socket | null = null;

// Singleton: one connection per browser tab.
// autoConnect is off on purpose. The store connects only when someone is
// logged in. Otherwise logged-out pages would try, fail and retry forever,
// and the server would open a connection while rendering pages.
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true, // sends the httpOnly cookie
      autoConnect: false,
    });
  }
  return socket;
}