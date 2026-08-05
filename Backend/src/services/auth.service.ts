import argon2 from "argon2";
import { generateAccessToken, generateRefreshToken } from "./jwt.service";

export const generateAccessAndRefreshToken = async (
    userId: number,
    role: string,
    sessionId: string
) => {
    const { accessToken, accessExpiresAt } =
        generateAccessToken(userId, role);

    const { refreshToken, refreshExpiresAt } =
        generateRefreshToken(userId, sessionId);

    const hashedRefreshToken =
        await argon2.hash(refreshToken);

    return {
        accessToken,
        accessExpiresAt,
        refreshToken,
        refreshExpiresAt,
        hashedRefreshToken,
    };
};

