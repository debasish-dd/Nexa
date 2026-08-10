import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/api-error';
import { AUTH_CONFIG } from '../config/auth';


type AccessTokenResponse = {
    accessToken: string;
    accessExpiresAt: Date;
};

type RefreshTokenResponse = {
    refreshToken: string;
    refreshExpiresAt: Date;
};

 interface AccessTokenPayload {
  userId: string;
  role: string;
  
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  
}
export const generateAccessToken = (
    userId: string,
    role: string
): AccessTokenResponse => {
    const token = jwt.sign(
        { userId, role },
        process.env.JWT_ACCESS_SECRET as string,
        { expiresIn: AUTH_CONFIG.ACCESS_EXPIRES }
    );

    return {
        accessToken: token,
        accessExpiresAt: new Date(Date.now() + AUTH_CONFIG.ACCESS_MS),
    };
};
export const verifyAccessToken = (
    token: string
): AccessTokenPayload => {
    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET as string
        );

        if (
            typeof decoded !== "object" ||
            decoded === null ||
            !("userId" in decoded) ||
            !("role" in decoded)
        ) {
            throw new ApiError(401, "Invalid access token");
        }

        return {
            userId: decoded.userId as string,
            role: decoded.role as string,
        };
    } catch {
        throw new ApiError(401, "Invalid or expired access token");
    }
};

export const generateRefreshToken = (
    userId: string,
    sessionId: string
): RefreshTokenResponse => {
    const payload: RefreshTokenPayload = {
        userId,
        sessionId,
    };

    const token = jwt.sign(
        payload,
        process.env.JWT_REFRESH_SECRET as string,
        {
            expiresIn: AUTH_CONFIG.REFRESH_EXPIRES,
        }
    );

    return {
        refreshToken: token,
        refreshExpiresAt: new Date(Date.now() + AUTH_CONFIG.REFRESH_MS),
    };
};
export const verifyRefreshToken = (
    token: string
): RefreshTokenPayload => {
    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_REFRESH_SECRET as string
        );
       
        if (
            typeof decoded !== "object" ||
            decoded === null ||
            !("userId" in decoded) ||
            !("sessionId" in decoded)
        ) {
            throw new ApiError(401, "Invalid refresh token");
        }

        return {
            userId: decoded.userId as string,
            sessionId: decoded.sessionId as string,
        };
    } catch {
        throw new ApiError(401, "Invalid or expired refresh token");
    }
};

