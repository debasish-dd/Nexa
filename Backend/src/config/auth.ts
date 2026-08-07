import "dotenv/config";

const { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET } = process.env;

if (!JWT_ACCESS_SECRET) {
    throw new Error("JWT_ACCESS_SECRET environment variable is missing");
}

if (!JWT_REFRESH_SECRET) {
    throw new Error("JWT_REFRESH_SECRET environment variable is missing");
}

export const AUTH_CONFIG = {
    ACCESS_EXPIRES: "1h",
    ACCESS_MS: 60 * 60 * 1000,

    REFRESH_EXPIRES: "7d",
    REFRESH_MS: 7 * 24 * 60 * 60 * 1000,
} as const;