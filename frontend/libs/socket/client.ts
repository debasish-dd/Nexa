import { io, type Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL;

let socket: Socket | null = null;

// Singleton — one connection per browser tab, reused across every component
// that needs it, instead of each component opening its own socket.
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true, // sends the httpOnly cookie, same as fetch's credentials: 'include'
    });
  }
  return socket;
}