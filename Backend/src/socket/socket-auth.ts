// socket/socket-auth.ts
import { Socket } from "socket.io";
import type { ExtendedError } from "socket.io";
import cookie from "cookie";

// FIX BEFORE USE: import your real access-token verify function —
// whatever `isUserLoggedIn` uses on the REST side. I don't have
// that file, so I'm not guessing at its name or path.
import { verifyAccessToken } from "../services/jwt.service";

export const socketAuthMiddleware = (
    socket: Socket,
    next: (err?: ExtendedError) => void,
) => {
    try {
        const rawCookies = socket.handshake.headers.cookie;
        if (!rawCookies) return next(new Error("Authentication required"));

        const parsedCookies = cookie.parse(rawCookies);
        // FIX BEFORE USE: confirm this matches your actual cookie name.
        const accessToken = parsedCookies["accessToken"];
        if (!accessToken) return next(new Error("Authentication required"));

        const payload = verifyAccessToken(accessToken);
        socket.data.userId = payload.userId;

        next();
    } catch {
        next(new Error("Authentication failed"));
    }
};