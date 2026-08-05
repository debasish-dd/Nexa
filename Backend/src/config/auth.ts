
export const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) {
    throw new Error("Missing JWT secrets");
}

export const AUTH_CONFIG = {
    ACCESS_EXPIRES: "1h",
    ACCESS_MS: 60 * 60 * 1000,

    REFRESH_EXPIRES: "7d",
    REFRESH_MS: 7 * 24 * 60 * 60 * 1000,
} as const;